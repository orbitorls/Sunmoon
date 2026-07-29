import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import validationFixtures from '../data/tide-validation-events.json'
import {
  getNearestConfiguredStationId,
  getStationHarmonicDiagnostics,
  getStationHarmonicPrediction,
} from './station-harmonic-model'
import {
  formatThailandClock,
  formatThailandTimestamp,
  getThailandDayBoundsFromIsoDate,
  roundToDigits,
} from './thailand-time'
import { WorldTidesClient } from './worldtides-client'

export type ComparisonSourceId = 'internal' | 'validation_fixture' | 'worldtides' | 'stormglass' | 'website'
export type ComparisonSourceCategory = 'internal' | 'validation' | 'api' | 'website'
export type DatumConfidence = 'known' | 'assumed' | 'unknown'
export type ComparisonEventType = 'high' | 'low'

export interface ComparisonLocation {
  id: string
  name: string
  lat: number
  lon: number
  stationId?: string
  region?: string
  zone?: string
  notes?: string
}

export interface ComparisonEvent {
  type: ComparisonEventType
  timestamp: string
  clockTime: string
  level: number | null
  confidence: number | null
}

export interface ComparisonSourceSnapshot {
  sourceId: ComparisonSourceId
  category: ComparisonSourceCategory
  sourceLabel: string
  location: ComparisonLocation
  date: string
  available: boolean
  unavailableReason?: string
  datum: string | null
  datumConfidence: DatumConfidence
  supportsHeightComparison: boolean
  events: ComparisonEvent[]
  rawEventCount: number
  metadata: Record<string, string | number | boolean | null>
}

export type ValidationEventSource =
  | 'official_prediction'
  | 'app_prediction'
  | 'field_measurement'
  | 'manual_reference'
  | 'community_observation'

export interface ValidationFixtureRecord {
  locationId: string
  stationId?: string
  date: string
  datum?: string
  source: ValidationEventSource
  events: Array<{
    type: ComparisonEventType
    time: string
    level?: number
  }>
}

export interface MatchedComparisonEvent {
  baseline: ComparisonEvent
  candidate: ComparisonEvent
  timingDeltaMinutes: number
  absoluteTimingDeltaMinutes: number
  levelDeltaMeters: number | null
  absoluteLevelDeltaMeters: number | null
}

export interface ComparisonMetrics {
  baselineEventCount: number
  candidateEventCount: number
  matchedEventCount: number
  eventCoverage: number
  meanAbsoluteTimingErrorMinutes: number | null
  meanTimingBiasMinutes: number | null
  maxAbsoluteTimingErrorMinutes: number | null
  rmseTimingMinutes: number | null
  meanAbsoluteLevelErrorMeters: number | null
  meanLevelBiasMeters: number | null
  maxAbsoluteLevelErrorMeters: number | null
  rmseLevelMeters: number | null
  supportsHeightComparison: boolean
  accuracyPass: boolean | null
  thresholdTimingMaeMinutes: number
  thresholdLevelMaeMeters: number
  coverageStatus: 'unavailable' | 'no_matches' | 'partial' | 'complete'
  warnings: string[]
}

export interface SourceComparisonResult {
  source: ComparisonSourceSnapshot
  metrics: ComparisonMetrics
  calibrationSuggestion: CalibrationSuggestion | null
  matches: MatchedComparisonEvent[]
  unmatchedBaselineEvents: ComparisonEvent[]
  unmatchedCandidateEvents: ComparisonEvent[]
}

export interface CalibrationSuggestion {
  stationId: string
  locationId: string
  sourceId: ComparisonSourceId
  matchedEventCount: number
  timeOffsetMinutesDelta: number | null
  levelOffsetMetersDelta: number | null
  note: string
}

export interface LocationComparisonReport {
  location: ComparisonLocation
  baseline: ComparisonSourceSnapshot
  comparisons: SourceComparisonResult[]
}

export interface TideComparisonReport {
  generatedAt: string
  date: string
  locations: LocationComparisonReport[]
  sourcesRequested: ComparisonSourceId[]
  summary: {
    totalLocations: number
    availableComparisons: number
    unavailableComparisons: number
    passedComparisons: number
    failedComparisons: number
    uncheckedComparisons: number
    stationConstantsCoverage: {
      configuredStations: number
      totalStations: number
      missingStations: number
      invalidStations: number
    }
  }
}

export interface RunComparisonOptions {
  date: string
  locations: ComparisonLocation[]
  sources: ComparisonSourceId[]
  maxMatchDeltaMinutes?: number
}

export const DEFAULT_MATCH_WINDOW_MINUTES = 180
export const DEFAULT_TIMING_MAE_THRESHOLD_MINUTES = 30
export const DEFAULT_LEVEL_MAE_THRESHOLD_METERS = 0.2
// RMSE is always >= MAE and penalizes a handful of outliers more heavily, so
// its threshold is deliberately looser than the MAE one -- it exists to catch
// a couple of badly-mismatched events hiding behind an otherwise-OK average,
// not to re-litigate the MAE bound at a stricter value.
export const DEFAULT_TIMING_RMSE_THRESHOLD_MINUTES = 45
export const DEFAULT_LEVEL_RMSE_THRESHOLD_METERS = 0.3
const VALIDATION_EVENT_SOURCES: ValidationEventSource[] = [
  'official_prediction',
  'app_prediction',
  'field_measurement',
  'manual_reference',
  'community_observation',
]

function getSourceLabel(source: ComparisonSourceId): string {
  switch (source) {
    case 'internal':
      return 'Station Harmonic Forecast'
    case 'validation_fixture':
      return 'Validation Fixture'
    case 'worldtides':
      return 'WorldTides'
    case 'stormglass':
      return 'Stormglass'
    case 'website':
      return 'Public Tide Website'
  }
}

function clockMinutes(clockTime: string): number {
  const [hours, minutes] = clockTime.split(':').map(Number)
  return hours * 60 + minutes
}

export function eventDeltaMinutes(baselineEvent: ComparisonEvent, candidateEvent: ComparisonEvent): number {
  const baselineTimestamp = Date.parse(baselineEvent.timestamp)
  const candidateTimestamp = Date.parse(candidateEvent.timestamp)

  if (Number.isFinite(baselineTimestamp) && Number.isFinite(candidateTimestamp)) {
    return (candidateTimestamp - baselineTimestamp) / (60 * 1000)
  }

  return clockMinutes(candidateEvent.clockTime) - clockMinutes(baselineEvent.clockTime)
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function max(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  return Math.max(...values)
}

function rootMeanSquare(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const meanSquare = values.reduce((sum, value) => sum + value * value, 0) / values.length
  return Math.sqrt(meanSquare)
}

function round(value: number | null, digits = 3): number | null {
  if (value === null) {
    return null
  }

  return roundToDigits(value, digits)
}

function getCoverageStatus(
  baselineEventCount: number,
  matchedEventCount: number,
  candidateAvailable: boolean,
): ComparisonMetrics['coverageStatus'] {
  if (!candidateAvailable) {
    return 'unavailable'
  }

  if (matchedEventCount === 0) {
    return 'no_matches'
  }

  return matchedEventCount >= baselineEventCount ? 'complete' : 'partial'
}

function getAccuracyPass(metrics: {
  matchedEventCount: number
  meanAbsoluteTimingErrorMinutes: number | null
  rmseTimingMinutes: number | null
  meanAbsoluteLevelErrorMeters: number | null
  rmseLevelMeters: number | null
  supportsHeightComparison: boolean
}): boolean | null {
  if (metrics.matchedEventCount === 0 || metrics.meanAbsoluteTimingErrorMinutes === null) {
    return null
  }

  if (metrics.meanAbsoluteTimingErrorMinutes > DEFAULT_TIMING_MAE_THRESHOLD_MINUTES) {
    return false
  }

  if (metrics.rmseTimingMinutes !== null && metrics.rmseTimingMinutes > DEFAULT_TIMING_RMSE_THRESHOLD_MINUTES) {
    return false
  }

  if (
    metrics.supportsHeightComparison &&
    metrics.meanAbsoluteLevelErrorMeters !== null &&
    metrics.meanAbsoluteLevelErrorMeters > DEFAULT_LEVEL_MAE_THRESHOLD_METERS
  ) {
    return false
  }

  if (
    metrics.supportsHeightComparison &&
    metrics.rmseLevelMeters !== null &&
    metrics.rmseLevelMeters > DEFAULT_LEVEL_RMSE_THRESHOLD_METERS
  ) {
    return false
  }

  return true
}

function toValidationRecord(value: unknown): ValidationFixtureRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Partial<ValidationFixtureRecord>
  const source = record.source
  if (
    typeof record.locationId !== 'string' ||
    typeof record.date !== 'string' ||
    typeof source !== 'string' ||
    !VALIDATION_EVENT_SOURCES.includes(source as ValidationEventSource) ||
    !Array.isArray(record.events)
  ) {
    return null
  }

  const events = record.events.filter(
    (event): event is ValidationFixtureRecord['events'][number] =>
      event !== null &&
      typeof event === 'object' &&
      (event.type === 'high' || event.type === 'low') &&
      typeof event.time === 'string' &&
      /^\d{2}:\d{2}$/.test(event.time),
  )

  if (events.length === 0) {
    return null
  }

  return {
    locationId: record.locationId,
    stationId: typeof record.stationId === 'string' ? record.stationId : undefined,
    date: record.date,
    datum: typeof record.datum === 'string' ? record.datum : undefined,
    source: source as ValidationEventSource,
    events,
  }
}

function getValidationFixtureRecords(): ValidationFixtureRecord[] {
  if (!Array.isArray(validationFixtures)) {
    return []
  }

  return (validationFixtures as unknown[])
    .map(toValidationRecord)
    .filter((record): record is ValidationFixtureRecord => record !== null)
}

export function buildCalibrationRecommendation(metrics: ComparisonMetrics): string {
  if (metrics.matchedEventCount === 0 || metrics.meanTimingBiasMinutes === null) {
    return 'insufficient_matches'
  }

  const recommendations: string[] = []
  if (Math.abs(metrics.meanTimingBiasMinutes) >= 10) {
    recommendations.push(`phase_shift_minutes=${roundToDigits(metrics.meanTimingBiasMinutes, 1)}`)
  }

  if (metrics.meanAbsoluteLevelErrorMeters !== null && metrics.meanAbsoluteLevelErrorMeters >= 0.1) {
    recommendations.push(`review_level_offset_mae_m=${roundToDigits(metrics.meanAbsoluteLevelErrorMeters, 3)}`)
  }

  return recommendations.length > 0 ? recommendations.join('; ') : 'no_change'
}

export function buildCalibrationSuggestion(
  location: ComparisonLocation,
  baseline: ComparisonSourceSnapshot,
  comparison: Pick<SourceComparisonResult, 'source' | 'metrics'>,
): CalibrationSuggestion | null {
  if (
    comparison.source.sourceId !== 'validation_fixture' ||
    comparison.metrics.matchedEventCount === 0 ||
    comparison.metrics.meanTimingBiasMinutes === null
  ) {
    return null
  }

  const stationId = typeof baseline.metadata.stationId === 'string' ? baseline.metadata.stationId : location.stationId
  if (!stationId) {
    return null
  }

  const timeDelta = roundToDigits(comparison.metrics.meanTimingBiasMinutes, 1)
  const levelDelta =
    comparison.metrics.supportsHeightComparison && comparison.metrics.meanLevelBiasMeters !== null
      ? roundToDigits(comparison.metrics.meanLevelBiasMeters, 3)
      : null

  return {
    stationId,
    locationId: location.id,
    sourceId: comparison.source.sourceId,
    matchedEventCount: comparison.metrics.matchedEventCount,
    timeOffsetMinutesDelta: timeDelta,
    levelOffsetMetersDelta: levelDelta,
    note:
      levelDelta === null
        ? 'Apply time offset only; level offset unavailable because datum/height comparison is unsupported.'
        : 'Apply these deltas to station harmonic constants only after source data is verified.',
  }
}

/**
 * Derive high/low events from a level series using a prominence (zigzag)
 * filter rather than a delta-vs-immediate-neighbor gate.
 *
 * A fixed delta-vs-immediate-neighbor threshold is unreliable at 30-min
 * sampling: a real extremum's neighboring deltas shrink toward zero as the
 * curve flattens near the peak/trough — exactly where a "significant change"
 * gate rejects the very point it's meant to detect. But a plain
 * sign-change-of-slope test with no gate at all is too sensitive: shallow-
 * water overtide constituents (M4/MS4/MN4) add small compound wobbles on top
 * of the main tide, which register as spurious extra highs/lows every few
 * hours. `minSwingMeters` requires a candidate extreme to give up at least
 * that much level before the opposite extreme is confirmed (classic
 * zigzag/prominence filter), so minor wobbles get absorbed into the
 * dominant swing instead of reported as their own events.
 */
export function deriveExtremesFromSeries(
  series: Array<{ time: Date; level: number }>,
  minSwingMeters = 0.05,
): ComparisonEvent[] {
  const events: ComparisonEvent[] = []
  if (series.length < 3) {
    return events
  }

  let direction: 'up' | 'down' | null = null
  let candidateIndex = 0

  const pushEvent = (type: ComparisonEventType, index: number) => {
    const point = series[index]
    events.push({
      type,
      timestamp: formatThailandTimestamp(point.time),
      clockTime: formatThailandClock(point.time),
      level: Number(point.level.toFixed(3)),
      confidence: 68,
    })
  }

  for (let index = 1; index < series.length; index++) {
    const candidateLevel = series[candidateIndex].level
    const current = series[index].level

    if (direction === null) {
      if (current > candidateLevel) {
        direction = 'up'
        candidateIndex = index
      } else if (current < candidateLevel) {
        direction = 'down'
        candidateIndex = index
      }
      continue
    }

    if (direction === 'up') {
      if (current >= candidateLevel) {
        candidateIndex = index
      } else if (candidateLevel - current >= minSwingMeters) {
        pushEvent('high', candidateIndex)
        direction = 'down'
        candidateIndex = index
      }
    } else {
      if (current <= candidateLevel) {
        candidateIndex = index
      } else if (current - candidateLevel >= minSwingMeters) {
        pushEvent('low', candidateIndex)
        direction = 'up'
        candidateIndex = index
      }
    }
  }

  return events
}

export async function fetchInternalComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBoundsFromIsoDate(dateInput)
  const intervalMinutes = 30
  const paddedStart = new Date(start.getTime() - intervalMinutes * 60 * 1000)
  const paddedEnd = new Date(end.getTime() + intervalMinutes * 60 * 1000)
  const prediction = getStationHarmonicPrediction(location, paddedStart, paddedEnd, intervalMinutes)
  if (!prediction || prediction.series.length === 0) {
    return {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: getSourceLabel('internal'),
      location,
      date,
      available: false,
      unavailableReason: 'Station harmonic prediction is unavailable for this location/date',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {
        engine: 'station-harmonic-v1',
        intervalMinutes,
        stationId: null,
        constituents: 0,
      },
    }
  }

  const series = prediction?.series ?? []
  const events = deriveExtremesFromSeries(series).filter((event) => event.timestamp.startsWith(date))

  return {
    sourceId: 'internal',
    category: 'internal',
    sourceLabel: getSourceLabel('internal'),
    location,
    date,
    available: true,
    datum: 'MSL',
    datumConfidence: 'known',
    supportsHeightComparison: true,
    events,
    rawEventCount: series.length,
    metadata: {
      engine: 'station-harmonic-v1',
      intervalMinutes,
      stationId: prediction?.stationId ?? null,
      constituents: prediction?.constituentsCount ?? 0,
      dominantConstituentQuarterPeriodMinutes: prediction?.dominantConstituentQuarterPeriodMinutes ?? null,
    },
  }
}

export async function fetchWorldTidesComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
  apiKey = process.env.WORLDTIDES_API_KEY || process.env.NEXT_PUBLIC_WORLDTIDES_API_KEY || '',
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBoundsFromIsoDate(dateInput)

  if (!apiKey) {
    return {
      sourceId: 'worldtides',
      category: 'api',
      sourceLabel: 'WorldTides',
      location,
      date,
      available: false,
      unavailableReason: 'WORLDTIDES_API_KEY is not configured',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    }
  }

  // WorldTidesClient defaults to datum=MSL on every request (see
  // worldtides-client.ts), matching the internal model's reference, so the
  // datum here is pinned rather than provider-defined and height comparison
  // is safe to enable.
  const datum = 'MSL'
  const client = new WorldTidesClient(apiKey, datum)
  const extremes = await client.getExtremesForCoordinates(location.lat, location.lon, start, end)
  const events: ComparisonEvent[] = [...extremes.highs, ...extremes.lows]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((event): ComparisonEvent => ({
      type: event.type === 'high' ? 'high' : 'low',
      timestamp: formatThailandTimestamp(new Date(event.timestamp)),
      clockTime: formatThailandClock(new Date(event.timestamp)),
      level: Number(event.height.toFixed(3)),
      confidence: event.confidence ?? 95,
    }))

  return {
    sourceId: 'worldtides',
    category: 'api',
    sourceLabel: 'WorldTides',
    location,
    date,
    available: events.length > 0,
    unavailableReason: events.length > 0 ? undefined : 'WorldTides returned no extremes for the requested window',
    datum,
    datumConfidence: 'known',
    supportsHeightComparison: true,
    events,
    rawEventCount: events.length,
    metadata: {
      provider: 'worldtides',
      requestMode: 'coordinate-extremes',
      datum,
    },
  }
}

type StormglassPayload = {
  data?: Array<{
    height: number
    time: string
    type?: string
  }>
}

export async function fetchStormglassComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
  apiKey = process.env.STORMGLASS_API_KEY || '',
): Promise<ComparisonSourceSnapshot> {
  const { date, start, end } = getThailandDayBoundsFromIsoDate(dateInput)

  if (!apiKey) {
    return {
      sourceId: 'stormglass',
      category: 'api',
      sourceLabel: 'Stormglass',
      location,
      date,
      available: false,
      unavailableReason: 'STORMGLASS_API_KEY is not configured',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    }
  }

  const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${location.lat}&lng=${location.lon}&start=${start.toISOString()}&end=${end.toISOString()}`
  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
    },
  })

  if (!response.ok) {
    return {
      sourceId: 'stormglass',
      category: 'api',
      sourceLabel: 'Stormglass',
      location,
      date,
      available: false,
      unavailableReason: `Stormglass request failed with HTTP ${response.status}`,
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {
        status: response.status,
      },
    }
  }

  const payload = (await response.json()) as StormglassPayload
  const events = (payload.data ?? [])
    .filter((event) => Number.isFinite(event.height) && typeof event.time === 'string')
    .map((event) => {
      const eventDate = new Date(event.time)
      return {
        type: event.type?.toLowerCase() === 'high' ? 'high' : 'low',
        timestamp: formatThailandTimestamp(eventDate),
        clockTime: formatThailandClock(eventDate),
        level: Number(event.height.toFixed(3)),
        confidence: 90,
      } as ComparisonEvent
    })

  return {
    sourceId: 'stormglass',
    category: 'api',
    sourceLabel: 'Stormglass',
    location,
    date,
    available: events.length > 0,
    unavailableReason: events.length > 0 ? undefined : 'Stormglass returned no extremes for the requested window',
    datum: 'provider-specific',
    datumConfidence: 'unknown',
    supportsHeightComparison: false,
    events,
    rawEventCount: events.length,
    metadata: {
      provider: 'stormglass',
      requestMode: 'extremes',
    },
  }
}

export async function fetchWebsiteComparisonSnapshot(
  location: ComparisonLocation,
  dateInput: string,
): Promise<ComparisonSourceSnapshot> {
  return {
    sourceId: 'website',
    category: 'website',
    sourceLabel: 'Public Tide Website',
    location,
    date: dateInput,
    available: false,
    unavailableReason: 'No stable public website adapter has been configured yet',
    datum: null,
    datumConfidence: 'unknown',
    supportsHeightComparison: false,
    events: [],
    rawEventCount: 0,
    metadata: {},
  }
}

export async function fetchValidationFixtureSnapshot(
  location: ComparisonLocation,
  dateInput: string,
): Promise<ComparisonSourceSnapshot> {
  const records = getValidationFixtureRecords().filter(
    (record) =>
      record.date === dateInput &&
      (record.locationId === location.id || (location.stationId !== undefined && record.stationId === location.stationId)),
  )

  if (records.length === 0) {
    return {
      sourceId: 'validation_fixture',
      category: 'validation',
      sourceLabel: 'Validation Fixture',
      location,
      date: dateInput,
      available: false,
      unavailableReason: 'No validation fixture events for this location/date',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {
        validationEventCount: 0,
      },
    }
  }

  const datum = records.find((record) => record.datum)?.datum ?? null
  const events: ComparisonEvent[] = records.flatMap((record) =>
    record.events.map((event): ComparisonEvent => {
      const hasLevel = typeof event.level === 'number' && Number.isFinite(event.level)
      return {
        type: event.type,
        timestamp: `${record.date}T${event.time}:00+07:00`,
        clockTime: event.time,
        level: hasLevel ? Number(event.level?.toFixed(3)) : null,
        confidence: record.source === 'field_measurement' ? 100 : 95,
      }
    }),
  )

  return {
    sourceId: 'validation_fixture',
    category: 'validation',
    sourceLabel: 'Validation Fixture',
    location,
    date: dateInput,
    available: events.length > 0,
    unavailableReason: events.length > 0 ? undefined : 'No validation fixture events for this location/date',
    datum,
    datumConfidence: datum === null ? 'unknown' : 'known',
    supportsHeightComparison: datum !== null && events.every((event) => event.level !== null),
    events,
    rawEventCount: events.length,
    metadata: {
      validationEventCount: events.length,
    },
  }
}

function getPlausibleMatchWindowMinutes(
  baseline: ComparisonSourceSnapshot,
  maxMatchDeltaMinutes: number,
): number {
  const quarterPeriodMinutes = baseline.metadata.dominantConstituentQuarterPeriodMinutes
  // Cap the requested window at a quarter of the dominant constituent's
  // period: matching an event any further out than that risks pairing a
  // high/low with the wrong tidal cycle (the previous or next one) instead
  // of flagging it unmatched, which would silently launder a wrong-cycle
  // pairing into the timing-bias average.
  if (typeof quarterPeriodMinutes !== 'number' || !Number.isFinite(quarterPeriodMinutes)) {
    return maxMatchDeltaMinutes
  }

  return Math.min(maxMatchDeltaMinutes, quarterPeriodMinutes)
}

export function compareSnapshots(
  baseline: ComparisonSourceSnapshot,
  candidate: ComparisonSourceSnapshot,
  maxMatchDeltaMinutes = DEFAULT_MATCH_WINDOW_MINUTES,
): SourceComparisonResult {
  const matches: MatchedComparisonEvent[] = []
  const unmatchedBaselineEvents: ComparisonEvent[] = []
  const remainingCandidateEvents = [...candidate.events]
  const warnings: string[] = []
  const effectiveMatchWindowMinutes = getPlausibleMatchWindowMinutes(baseline, maxMatchDeltaMinutes)

  for (const baselineEvent of baseline.events) {
    let bestIndex = -1
    let bestDelta = Number.POSITIVE_INFINITY

    for (let index = 0; index < remainingCandidateEvents.length; index++) {
      const candidateEvent = remainingCandidateEvents[index]
      if (candidateEvent.type !== baselineEvent.type) {
        continue
      }

      const delta = eventDeltaMinutes(baselineEvent, candidateEvent)
      const absoluteDelta = Math.abs(delta)
      if (absoluteDelta <= effectiveMatchWindowMinutes && absoluteDelta < bestDelta) {
        bestIndex = index
        bestDelta = absoluteDelta
      }
    }

    if (bestIndex === -1) {
      unmatchedBaselineEvents.push(baselineEvent)
      continue
    }

    const matchedCandidate = remainingCandidateEvents.splice(bestIndex, 1)[0]
    const timingDeltaMinutes = eventDeltaMinutes(baselineEvent, matchedCandidate)
    const levelDeltaMeters =
      baseline.supportsHeightComparison &&
      candidate.supportsHeightComparison &&
      baselineEvent.level !== null &&
      matchedCandidate.level !== null
        ? matchedCandidate.level - baselineEvent.level
        : null

    matches.push({
      baseline: baselineEvent,
      candidate: matchedCandidate,
      timingDeltaMinutes,
      absoluteTimingDeltaMinutes: Math.abs(timingDeltaMinutes),
      levelDeltaMeters: levelDeltaMeters === null ? null : Number(levelDeltaMeters.toFixed(3)),
      absoluteLevelDeltaMeters: levelDeltaMeters === null ? null : Number(Math.abs(levelDeltaMeters).toFixed(3)),
    })
  }

  if (!candidate.available && candidate.unavailableReason) {
    warnings.push(candidate.unavailableReason)
  }

  if (effectiveMatchWindowMinutes < maxMatchDeltaMinutes) {
    warnings.push(
      `Match window tightened to ${roundToDigits(effectiveMatchWindowMinutes, 1)} min (quarter of dominant constituent period) to avoid wrong-cycle matches`,
    )
  }

  if (!(baseline.supportsHeightComparison && candidate.supportsHeightComparison)) {
    warnings.push('Height metrics are suppressed because datum alignment is unknown or unsupported')
  }

  const timingErrors = matches.map((match) => match.absoluteTimingDeltaMinutes)
  const timingBiases = matches.map((match) => match.timingDeltaMinutes)
  const levelErrors = matches
    .map((match) => match.absoluteLevelDeltaMeters)
    .filter((value): value is number => value !== null)
  const levelBiases = matches
    .map((match) => match.levelDeltaMeters)
    .filter((value): value is number => value !== null)

  const supportsHeightComparison = baseline.supportsHeightComparison && candidate.supportsHeightComparison
  const metricsBase = {
    baselineEventCount: baseline.events.length,
    candidateEventCount: candidate.events.length,
    matchedEventCount: matches.length,
    eventCoverage: baseline.events.length === 0 ? 0 : Number((matches.length / baseline.events.length).toFixed(3)),
    meanAbsoluteTimingErrorMinutes: round(average(timingErrors), 2),
    meanTimingBiasMinutes: round(average(timingBiases), 2),
    maxAbsoluteTimingErrorMinutes: round(max(timingErrors), 2),
    rmseTimingMinutes: round(rootMeanSquare(timingErrors), 2),
    meanAbsoluteLevelErrorMeters: round(average(levelErrors), 3),
    meanLevelBiasMeters: round(average(levelBiases), 3),
    maxAbsoluteLevelErrorMeters: round(max(levelErrors), 3),
    rmseLevelMeters: round(rootMeanSquare(levelErrors), 3),
    supportsHeightComparison,
  }

  return {
    source: candidate,
    calibrationSuggestion: null,
    matches,
    unmatchedBaselineEvents,
    unmatchedCandidateEvents: remainingCandidateEvents,
    metrics: {
      ...metricsBase,
      accuracyPass: getAccuracyPass(metricsBase),
      thresholdTimingMaeMinutes: DEFAULT_TIMING_MAE_THRESHOLD_MINUTES,
      thresholdLevelMaeMeters: DEFAULT_LEVEL_MAE_THRESHOLD_METERS,
      coverageStatus: getCoverageStatus(baseline.events.length, matches.length, candidate.available),
      warnings,
    },
  }
}

export interface StationMeasuredAccuracy {
  stationId: string
  date: string
  matchedEventCount: number
  meanAbsoluteTimingErrorMinutes: number
  rmseTimingMinutes: number
  meanAbsoluteLevelErrorMeters: number | null
  rmseLevelMeters: number | null
}

/**
 * The most recent validation-fixture comparison available for the station
 * nearest to `location`, i.e. how far off the internal harmonic baseline
 * actually measured against a real reference the last time we had one. This
 * is the only "measured" accuracy this repo has data for -- it is used as a
 * proxy for provider confidence (see lib/tide-service.ts) rather than
 * fabricating a per-provider ground truth we don't have.
 */
export async function getMostRecentStationMeasuredAccuracy(
  location: { lat: number; lon: number },
): Promise<StationMeasuredAccuracy | null> {
  const stationId = getNearestConfiguredStationId(location)
  if (!stationId) {
    return null
  }

  const mostRecentDate = getValidationFixtureRecords()
    .filter((record) => record.stationId === stationId)
    .map((record) => record.date)
    .sort()
    .pop()
  if (!mostRecentDate) {
    return null
  }

  const comparisonLocation: ComparisonLocation = {
    id: stationId,
    name: stationId,
    lat: location.lat,
    lon: location.lon,
    stationId,
  }

  const baseline = await fetchInternalComparisonSnapshot(comparisonLocation, mostRecentDate)
  const candidate = await fetchValidationFixtureSnapshot(comparisonLocation, mostRecentDate)
  if (!baseline.available || !candidate.available) {
    return null
  }

  const { metrics } = compareSnapshots(baseline, candidate)
  if (
    metrics.matchedEventCount === 0 ||
    metrics.meanAbsoluteTimingErrorMinutes === null ||
    metrics.rmseTimingMinutes === null
  ) {
    return null
  }

  return {
    stationId,
    date: mostRecentDate,
    matchedEventCount: metrics.matchedEventCount,
    meanAbsoluteTimingErrorMinutes: metrics.meanAbsoluteTimingErrorMinutes,
    rmseTimingMinutes: metrics.rmseTimingMinutes,
    meanAbsoluteLevelErrorMeters: metrics.meanAbsoluteLevelErrorMeters,
    rmseLevelMeters: metrics.rmseLevelMeters,
  }
}

async function fetchSnapshotForSource(
  location: ComparisonLocation,
  date: string,
  source: ComparisonSourceId,
): Promise<ComparisonSourceSnapshot> {
  switch (source) {
    case 'internal':
      return fetchInternalComparisonSnapshot(location, date)
    case 'validation_fixture':
      return fetchValidationFixtureSnapshot(location, date)
    case 'worldtides':
      return fetchWorldTidesComparisonSnapshot(location, date)
    case 'stormglass':
      return fetchStormglassComparisonSnapshot(location, date)
    case 'website':
      return fetchWebsiteComparisonSnapshot(location, date)
  }
}

function buildUnavailableComparison(
  location: ComparisonLocation,
  date: string,
  source: ComparisonSourceId,
  reason: string,
): SourceComparisonResult {
  return compareSnapshots(
    {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: getSourceLabel('internal'),
      location,
      date,
      available: false,
      unavailableReason: reason,
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    },
    {
      sourceId: source,
      category: source === 'validation_fixture' ? 'validation' : source === 'website' ? 'website' : 'api',
      sourceLabel: getSourceLabel(source),
      location,
      date,
      available: false,
      unavailableReason: reason,
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: {},
    },
  )
}

export async function runTideComparisonReport(
  options: RunComparisonOptions,
): Promise<TideComparisonReport> {
  const locations: LocationComparisonReport[] = []
  let availableComparisons = 0
  let unavailableComparisons = 0
  let passedComparisons = 0
  let failedComparisons = 0
  let uncheckedComparisons = 0

  for (const location of options.locations) {
    const baseline = await fetchInternalComparisonSnapshot(location, options.date)
    const comparisons: SourceComparisonResult[] = []

    for (const sourceId of options.sources) {
      if (sourceId === 'internal') {
        continue
      }

      if (!baseline.available) {
        unavailableComparisons += 1
        uncheckedComparisons += 1
        comparisons.push(
          buildUnavailableComparison(
            location,
            options.date,
            sourceId,
            baseline.unavailableReason ?? 'Internal baseline is unavailable',
          ),
        )
        continue
      }

      const snapshot = await fetchSnapshotForSource(location, options.date, sourceId)
      const comparison = compareSnapshots(
        baseline,
        snapshot,
        options.maxMatchDeltaMinutes ?? DEFAULT_MATCH_WINDOW_MINUTES,
      )
      comparison.source.metadata.calibrationRecommendation = buildCalibrationRecommendation(comparison.metrics)
      comparison.calibrationSuggestion = buildCalibrationSuggestion(location, baseline, comparison)

      if (snapshot.available) {
        availableComparisons += 1
      } else {
        unavailableComparisons += 1
      }

      if (comparison.metrics.accuracyPass === true) {
        passedComparisons += 1
      } else if (comparison.metrics.accuracyPass === false) {
        failedComparisons += 1
      } else {
        uncheckedComparisons += 1
      }

      comparisons.push(comparison)
    }

    locations.push({
      location,
      baseline,
      comparisons,
    })
  }

  const stationDiagnostics = getStationHarmonicDiagnostics()

  return {
    generatedAt: new Date().toISOString(),
    date: options.date,
    locations,
    sourcesRequested: options.sources,
    summary: {
      totalLocations: options.locations.length,
      availableComparisons,
      unavailableComparisons,
      passedComparisons,
      failedComparisons,
      uncheckedComparisons,
      stationConstantsCoverage: {
        configuredStations: stationDiagnostics.configuredStations,
        totalStations: stationDiagnostics.totalStations,
        missingStations: stationDiagnostics.missingStationIds.length,
        invalidStations: stationDiagnostics.invalidStationIds.length,
      },
    },
  }
}

export function renderComparisonMarkdown(report: TideComparisonReport): string {
  const lines: string[] = []

  lines.push(`# Tide Comparison Report`)
  lines.push('')
  lines.push(`- Date: ${report.date}`)
  lines.push(`- Generated: ${report.generatedAt}`)
  lines.push(`- Locations: ${report.summary.totalLocations}`)
  lines.push(`- Available comparisons: ${report.summary.availableComparisons}`)
  lines.push(`- Unavailable comparisons: ${report.summary.unavailableComparisons}`)
  lines.push(`- Passed comparisons: ${report.summary.passedComparisons}`)
  lines.push(`- Failed comparisons: ${report.summary.failedComparisons}`)
  lines.push(`- Unchecked comparisons: ${report.summary.uncheckedComparisons}`)
  lines.push(
    `- Station constants coverage: ${report.summary.stationConstantsCoverage.configuredStations}/${report.summary.stationConstantsCoverage.totalStations}`,
  )
  lines.push('')

  for (const locationReport of report.locations) {
    lines.push(`## ${locationReport.location.name}`)
    lines.push('')
    lines.push(`- Coordinates: ${locationReport.location.lat}, ${locationReport.location.lon}`)
    if (locationReport.location.zone) {
      lines.push(`- Zone: ${locationReport.location.zone}`)
    }
    lines.push(`- Baseline events: ${locationReport.baseline.events.length}`)
    lines.push('')
    lines.push('| Source | Available | Pass | Coverage | Mean abs timing error (min) | Mean abs level error (m) | Notes |')
    lines.push('|---|---:|---:|---:|---:|---:|---|')

    for (const comparison of locationReport.comparisons) {
      const calibrationRecommendation = comparison.source.metadata.calibrationRecommendation
      const notes = [
        comparison.metrics.warnings.join('; '),
        typeof calibrationRecommendation === 'string' ? `calibration: ${calibrationRecommendation}` : '',
        comparison.calibrationSuggestion
          ? `suggested constants delta: timeOffsetMinutes ${comparison.calibrationSuggestion.timeOffsetMinutesDelta}, levelOffsetMeters ${comparison.calibrationSuggestion.levelOffsetMetersDelta ?? '-'}`
          : '',
      ].filter(Boolean)
      const passLabel =
        comparison.metrics.accuracyPass === null ? '-' : comparison.metrics.accuracyPass ? 'yes' : 'no'
      lines.push(
        `| ${comparison.source.sourceLabel} | ${comparison.source.available ? 'yes' : 'no'} | ${passLabel} | ${comparison.metrics.coverageStatus} (${comparison.metrics.eventCoverage}) | ${comparison.metrics.meanAbsoluteTimingErrorMinutes ?? '-'} | ${comparison.metrics.meanAbsoluteLevelErrorMeters ?? '-'} | ${notes.join('; ') || '-'} |`,
      )
    }

    lines.push('')
  }

  return lines.join('\n')
}

export async function writeComparisonArtifacts(
  outputDirectory: string,
  report: TideComparisonReport,
): Promise<{ jsonPath: string; markdownPath: string }> {
  await mkdir(outputDirectory, { recursive: true })

  const safeDate = report.date.replace(/[^0-9-]/g, '')
  const jsonPath = path.join(outputDirectory, `tide-comparison-${safeDate}.json`)
  const markdownPath = path.join(outputDirectory, `tide-comparison-${safeDate}.md`)

  await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8')
  await writeFile(markdownPath, renderComparisonMarkdown(report), 'utf8')

  return {
    jsonPath,
    markdownPath,
  }
}
