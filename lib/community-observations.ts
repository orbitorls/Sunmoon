/**
 * Community-reported tide observations ("รายงานน้ำจริง").
 *
 * Users can report a high/low tide they actually witnessed at a station. A
 * single report is worthless for calibration (see
 * MIN_MATCHED_EVENTS_FOR_CALIBRATION in tide-calibration-apply.ts), so these
 * accumulate per-station across many dates until there's enough evidence to
 * even show a reviewer a calibration suggestion. Nothing here writes to
 * station-harmonic-constants.json -- that stays a reviewed, offline action
 * via scripts/apply-tide-calibration.ts.
 */
import hydroStations from '../data/hydro-stations.json'
import { redisCache } from './redis-cache'
import { MIN_MATCHED_EVENTS_FOR_CALIBRATION } from './tide-calibration-apply'
import {
  buildCalibrationSuggestion,
  compareSnapshots,
  fetchInternalComparisonSnapshot,
  type ComparisonEvent,
  type ComparisonLocation,
  type ComparisonSourceSnapshot,
  type LocationComparisonReport,
  type TideComparisonReport,
  type ValidationFixtureRecord,
} from './comparison'

export interface CommunityObservation {
  stationId: string
  lat: number
  lon: number
  observedAt: string // ISO timestamp, Thailand local wall-clock with +07:00 offset
  type: 'high' | 'low'
  levelMeters?: number
  userId: string
}

export interface CommunityCalibrationReview {
  stationId: string
  matchedEventCount: number
  timingMatchedEventCount: number
  levelMatchedEventCount: number
  timingReady: boolean
  levelReady: boolean
  suggestedTimeOffsetMinutes: number | null
  suggestedLevelOffsetMeters: number | null
  /** Always false for community path — constants stay offline/manual. */
  autoWriteAllowed: false
  note: string
}

type HydroStation = { id: string; name: string; nameTh?: string; lat: number; lon: number }

const CACHE_PREFIX = 'community-obs'
// ponytail: redis-cache falls back to an in-memory Map when REDIS_HOST isn't
// configured, so on local/dev these observations don't survive a server
// restart. Fine for now -- set REDIS_HOST in production so accumulation
// actually persists across deploys.
const STORE_TTL_SECONDS = 60 * 60 * 24 * 365

export async function list(stationId: string): Promise<CommunityObservation[]> {
  const stored = await redisCache.get(stationId, { prefix: CACHE_PREFIX })
  return Array.isArray(stored) ? (stored as CommunityObservation[]) : []
}

export async function store(observation: CommunityObservation): Promise<void> {
  const existing = await list(observation.stationId)
  const updated = [...existing, observation]
  await redisCache.set(observation.stationId, updated, { prefix: CACHE_PREFIX, ttl: STORE_TTL_SECONDS })
}

/** Group raw observations by the date they were reported on. */
export function toValidationFixtureRecords(
  stationId: string,
  observations: CommunityObservation[],
): ValidationFixtureRecord[] {
  const byDate = new Map<string, ValidationFixtureRecord['events']>()

  for (const observation of observations) {
    const date = observation.observedAt.slice(0, 10)
    const time = observation.observedAt.slice(11, 16)
    const events = byDate.get(date) ?? []
    events.push({ type: observation.type, time, level: observation.levelMeters })
    byDate.set(date, events)
  }

  return Array.from(byDate.entries()).map(([date, events]) => ({
    locationId: stationId,
    stationId,
    date,
    source: 'community_observation' as const,
    events,
  }))
}

// Timing always feeds suggestions; height comparison is enabled only when the
// observation carried a finite level. Even then reviewers must apply offline —
// nothing here auto-writes constants (ADR 0001).
function buildCommunitySnapshot(
  location: ComparisonLocation,
  record: ValidationFixtureRecord,
): ComparisonSourceSnapshot {
  const events: ComparisonEvent[] = record.events.map((event) => {
    const hasLevel = typeof event.level === 'number' && Number.isFinite(event.level)
    return {
      type: event.type,
      timestamp: `${record.date}T${event.time}:00+07:00`,
      clockTime: event.time,
      level: hasLevel ? Number(event.level!.toFixed(3)) : null,
      confidence: 80,
    }
  })

  const levelCount = events.filter((event) => event.level !== null).length

  return {
    sourceId: 'validation_fixture',
    category: 'validation',
    sourceLabel: 'Community Observation',
    location,
    date: record.date,
    available: events.length > 0,
    datum: null,
    datumConfidence: 'unknown',
    supportsHeightComparison: levelCount > 0,
    events,
    rawEventCount: events.length,
    metadata: {
      validationEventCount: events.length,
      source: 'community_observation',
      levelEventCount: levelCount,
    },
  }
}

/**
 * Build one multi-date TideComparisonReport out of every stored observation
 * for a station: one ComparisonLocation per distinct date.
 */
export async function accumulateCalibrationSuggestion(stationId: string): Promise<TideComparisonReport> {
  const station = (hydroStations as HydroStation[]).find((item) => item.id === stationId)
  const observations = station ? await list(stationId) : []
  const records = toValidationFixtureRecords(stationId, observations)

  const locations: LocationComparisonReport[] = []
  if (station) {
    const location: ComparisonLocation = {
      id: stationId,
      name: station.nameTh || station.name,
      lat: station.lat,
      lon: station.lon,
      stationId,
    }

    for (const record of records) {
      const baseline = await fetchInternalComparisonSnapshot(location, record.date)
      if (!baseline.available) {
        continue
      }

      const candidate = buildCommunitySnapshot(location, record)
      const comparison = compareSnapshots(baseline, candidate)
      comparison.calibrationSuggestion = buildCalibrationSuggestion(location, baseline, comparison)

      locations.push({ location, baseline, comparisons: [comparison] })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    date: records.length > 0 ? records[records.length - 1].date : '',
    locations,
    sourcesRequested: ['validation_fixture'],
    summary: {
      totalLocations: locations.length,
      availableComparisons: locations.length,
      unavailableComparisons: records.length - locations.length,
      passedComparisons: 0,
      failedComparisons: 0,
      uncheckedComparisons: 0,
      stationConstantsCoverage: {
        configuredStations: 0,
        totalStations: 0,
        missingStations: 0,
        invalidStations: 0,
      },
    },
  }
}

/**
 * Reviewer-facing summary that separates timing vs level readiness.
 * Does not mutate constants — Wave C / ADR offline-first.
 */
export async function buildCommunityCalibrationReview(
  stationId: string,
): Promise<CommunityCalibrationReview> {
  const report = await accumulateCalibrationSuggestion(stationId)
  let timingMatched = 0
  let levelMatched = 0
  let weightedTime = 0
  let weightedLevel = 0
  let levelWeight = 0

  for (const location of report.locations) {
    for (const comparison of location.comparisons) {
      const suggestion = comparison.calibrationSuggestion
      if (!suggestion || suggestion.matchedEventCount <= 0) continue
      timingMatched += suggestion.matchedEventCount
      weightedTime += (suggestion.timeOffsetMinutesDelta ?? 0) * suggestion.matchedEventCount
      if (suggestion.levelOffsetMetersDelta !== null) {
        levelMatched += suggestion.matchedEventCount
        weightedLevel += suggestion.levelOffsetMetersDelta * suggestion.matchedEventCount
        levelWeight += suggestion.matchedEventCount
      }
    }
  }

  const timingReady = timingMatched >= MIN_MATCHED_EVENTS_FOR_CALIBRATION
  const levelReady = levelMatched >= MIN_MATCHED_EVENTS_FOR_CALIBRATION && levelWeight > 0

  return {
    stationId,
    matchedEventCount: timingMatched,
    timingMatchedEventCount: timingMatched,
    levelMatchedEventCount: levelMatched,
    timingReady,
    levelReady,
    suggestedTimeOffsetMinutes: timingReady
      ? Number((weightedTime / timingMatched).toFixed(1))
      : null,
    suggestedLevelOffsetMeters: levelReady
      ? Number((weightedLevel / levelWeight).toFixed(3))
      : null,
    autoWriteAllowed: false,
    note: levelReady
      ? 'Timing and level suggestions ready for offline review; datum for community levels is unverified — do not auto-write constants.'
      : timingReady
        ? 'Timing suggestion ready for offline review; level evidence below lunar-month gate or missing.'
        : `Need ≥${MIN_MATCHED_EVENTS_FOR_CALIBRATION} matched events (~1 lunar month) before suggesting offsets.`,
  }
}
