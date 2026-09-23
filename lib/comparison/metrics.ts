/**
 * Accuracy metrics, event matching, and calibration suggestions for tide
 * comparison.
 *
 * Split out of lib/tide-comparison.ts (god module). Contains the pure
 * comparison/matching math (compareSnapshots), the measured-accuracy lookup
 * used by the forecast facade, and the calibration recommendation builders.
 */

import { getNearestConfiguredStationId } from '@/lib/harmonic'
import { roundToDigits } from '@/lib/domain/thailand-time'
import {
  DEFAULT_LEVEL_MAE_THRESHOLD_METERS,
  DEFAULT_LEVEL_RMSE_THRESHOLD_METERS,
  DEFAULT_MATCH_WINDOW_MINUTES,
  DEFAULT_TIMING_MAE_THRESHOLD_MINUTES,
  DEFAULT_TIMING_RMSE_THRESHOLD_MINUTES,
  type CalibrationSuggestion,
  type ComparisonEvent,
  type ComparisonLocation,
  type ComparisonMetrics,
  type ComparisonSourceSnapshot,
  type MatchedComparisonEvent,
  type SourceComparisonResult,
} from './types'
import {
  fetchInternalComparisonSnapshot,
  fetchValidationFixtureSnapshot,
  getValidationFixtureRecords,
} from './sources'

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
 * proxy for provider confidence (see lib/domain/forecast-facade.ts) rather than
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