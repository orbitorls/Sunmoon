/**
 * Shared types, thresholds, and label helpers for tide comparison.
 *
 * Split out of lib/tide-comparison.ts (god module). This module has no
 * runtime dependencies so it can be imported by every tide-comparison
 * sub-module without creating cycles.
 */

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
export const VALIDATION_EVENT_SOURCES: ValidationEventSource[] = [
  'official_prediction',
  'app_prediction',
  'field_measurement',
  'manual_reference',
  'community_observation',
]

export function getSourceLabel(source: ComparisonSourceId): string {
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