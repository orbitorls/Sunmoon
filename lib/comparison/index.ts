/**
 * Tide comparison — public facade.
 *
 * This module was split into focused sub-modules (types / sources / metrics /
 * report). It re-exports the original public surface verbatim so existing
 * callers are unaffected:
 *
 *   - lib/tide-comparison-types.ts   — shared types, thresholds, source labels
 *   - lib/tide-comparison-sources.ts — validation fixtures + per-provider snapshot fetchers
 *   - lib/tide-comparison-metrics.ts — event matching, accuracy metrics, calibration suggestions
 *   - lib/tide-comparison-report.ts  — report orchestration, markdown rendering, artifact writing
 */

export type {
  ComparisonSourceId,
  ComparisonSourceCategory,
  DatumConfidence,
  ComparisonEventType,
  ComparisonLocation,
  ComparisonEvent,
  ComparisonSourceSnapshot,
  ValidationEventSource,
  ValidationFixtureRecord,
  MatchedComparisonEvent,
  ComparisonMetrics,
  SourceComparisonResult,
  CalibrationSuggestion,
  LocationComparisonReport,
  TideComparisonReport,
  RunComparisonOptions,
} from './types'

export {
  DEFAULT_MATCH_WINDOW_MINUTES,
  DEFAULT_TIMING_MAE_THRESHOLD_MINUTES,
  DEFAULT_LEVEL_MAE_THRESHOLD_METERS,
  DEFAULT_TIMING_RMSE_THRESHOLD_MINUTES,
  DEFAULT_LEVEL_RMSE_THRESHOLD_METERS,
} from './types'

export {
  deriveExtremesFromSeries,
  fetchInternalComparisonSnapshot,
  fetchWorldTidesComparisonSnapshot,
  fetchStormglassComparisonSnapshot,
  fetchWebsiteComparisonSnapshot,
  fetchValidationFixtureSnapshot,
} from './sources'

export {
  eventDeltaMinutes,
  compareSnapshots,
  getMostRecentStationMeasuredAccuracy,
  buildCalibrationRecommendation,
  buildCalibrationSuggestion,
  type StationMeasuredAccuracy,
} from './metrics'

export {
  runTideComparisonReport,
  renderComparisonMarkdown,
  writeComparisonArtifacts,
} from './report'

export type { TimingAccuracyBand } from './timing-accuracy-band'
export { getTimingAccuracyBand, timingAccuracyBandLabel } from './timing-accuracy-band'