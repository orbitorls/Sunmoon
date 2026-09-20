import type { CalibrationSuggestion, TideComparisonReport } from './comparison'

export type StationHarmonicConstantForCalibration = {
  stationId: string
  levelOffsetMeters: number
  timeOffsetMinutes?: number
  sourceCitation?: string
}

export type AppliedStationCalibration = {
  stationId: string
  matchedEventCount: number
  timeOffsetMinutesDelta: number
  levelOffsetMetersDelta: number | null
}

export type CalibrationApplyResult<T extends StationHarmonicConstantForCalibration> = {
  constants: T[]
  applied: AppliedStationCalibration[]
  skippedSuggestions: number
  insufficientSampleStations: string[]
}

// A lunar month (~29.53 days) spans a full spring-neap cycle. A handful of
// matched events (3-5, as earlier calibration runs used) can look
// systematically offset by pure luck of which point in that cycle they
// caught, producing a scalar timeOffsetMinutes "correction" that is really
// just noise. Even a diurnal-dominant station produces at least one high and
// one low per day, so requiring that many matched pairs is the loosest bound
// that still guarantees the report spans a full lunar month.
const LUNAR_MONTH_DAYS = 29.53
const MIN_HIGH_LOW_PAIRS_PER_DAY = 2
export const MIN_MATCHED_EVENTS_FOR_CALIBRATION = Math.ceil(LUNAR_MONTH_DAYS * MIN_HIGH_LOW_PAIRS_PER_DAY)

type AggregatedSuggestion = {
  matchedEventCount: number
  weightedTimeDelta: number
  weightedLevelDelta: number
  levelWeight: number
}

function collectSuggestions(report: TideComparisonReport): CalibrationSuggestion[] {
  return report.locations.flatMap((location) =>
    location.comparisons
      .map((comparison) => comparison.calibrationSuggestion)
      .filter((suggestion): suggestion is CalibrationSuggestion => suggestion !== null),
  )
}

export function applyCalibrationSuggestions<T extends StationHarmonicConstantForCalibration>(
  constants: T[],
  report: TideComparisonReport,
): CalibrationApplyResult<T> {
  const constantsByStation = new Map(constants.map((constant) => [constant.stationId, constant]))
  const aggregated = new Map<string, AggregatedSuggestion>()
  let skippedSuggestions = 0

  for (const suggestion of collectSuggestions(report)) {
    if (
      !constantsByStation.has(suggestion.stationId) ||
      suggestion.matchedEventCount <= 0 ||
      suggestion.timeOffsetMinutesDelta === null
    ) {
      skippedSuggestions += 1
      continue
    }

    const prior = aggregated.get(suggestion.stationId) ?? {
      matchedEventCount: 0,
      weightedTimeDelta: 0,
      weightedLevelDelta: 0,
      levelWeight: 0,
    }
    prior.matchedEventCount += suggestion.matchedEventCount
    prior.weightedTimeDelta += suggestion.timeOffsetMinutesDelta * suggestion.matchedEventCount
    if (suggestion.levelOffsetMetersDelta !== null) {
      prior.weightedLevelDelta += suggestion.levelOffsetMetersDelta * suggestion.matchedEventCount
      prior.levelWeight += suggestion.matchedEventCount
    }
    aggregated.set(suggestion.stationId, prior)
  }

  const applied: AppliedStationCalibration[] = []
  const insufficientSampleStations: string[] = []
  const updatedConstants = constants.map((constant) => {
    const suggestion = aggregated.get(constant.stationId)
    if (!suggestion) {
      return constant
    }

    if (suggestion.matchedEventCount < MIN_MATCHED_EVENTS_FOR_CALIBRATION) {
      insufficientSampleStations.push(constant.stationId)
      return constant
    }

    const timeDelta = Number((suggestion.weightedTimeDelta / suggestion.matchedEventCount).toFixed(1))
    const levelDelta =
      suggestion.levelWeight > 0 ? Number((suggestion.weightedLevelDelta / suggestion.levelWeight).toFixed(3)) : null

    applied.push({
      stationId: constant.stationId,
      matchedEventCount: suggestion.matchedEventCount,
      timeOffsetMinutesDelta: timeDelta,
      levelOffsetMetersDelta: levelDelta,
    })

    return {
      ...constant,
      timeOffsetMinutes: Number(((constant.timeOffsetMinutes ?? 0) + timeDelta).toFixed(1)),
      levelOffsetMeters:
        levelDelta === null ? constant.levelOffsetMeters : Number((constant.levelOffsetMeters + levelDelta).toFixed(3)),
      sourceCitation: `${constant.sourceCitation ?? ''} Calibration pending review from ${suggestion.matchedEventCount} matched validation events.`.trim(),
    }
  })

  return {
    constants: updatedConstants,
    applied,
    skippedSuggestions,
    insufficientSampleStations,
  }
}
