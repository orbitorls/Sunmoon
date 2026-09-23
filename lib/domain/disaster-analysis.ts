/**
 * Disaster Analysis Service — public facade.
 *
 * This module was split into focused sub-modules (types / classify / format).
 * It re-exports the original public surface verbatim so existing callers are
 * unaffected:
 *
 *   - lib/disaster-analysis-types.ts — shared types + threshold table
 *   - lib/disaster-classify.ts       — risk classification + analyzeDisasterRisk
 *   - lib/disaster-format.ts         — Thai headline/label/color formatters
 */

export type {
  DisasterType,
  RiskLevel,
  DisasterInfo,
  RiskFactor,
  DisasterAnalysis,
  RiskTimeSlot,
  FloodPrediction,
  AdvanceWarning,
  HistoricalContext,
  HistoricalEvent,
} from './disaster-analysis-types'

export { analyzeDisasterRisk } from './disaster-classify'

export {
  formatDisasterHeadline,
  getRiskLevelText,
  getRiskLevelColor,
  getWarningLevelText,
  getWarningLevelColor,
  getFloodTypeText,
} from '@/lib/presentation/disaster-formatter'