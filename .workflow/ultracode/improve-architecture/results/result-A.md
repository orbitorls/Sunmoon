# Result A — lib/ core tide-engine duplication map

Captured from subagent 9889dc5d output (subagent profile could not write files).

## Per-file classification

| File | Exports (key) | Importers | Classification | Superseded-by |
|------|---------------|-----------|----------------|---------------|
| `lib/harmonic-engine.ts` | predictTideLevel, findTideExtremes, generateGraphData | 7 (tide-prediction-api, slope-alerts, confidence-bands, hydro-service, 3 scripts) | **duplicate** | `lib/harmonic-tide-core.ts` |
| `lib/harmonic-fit.ts` | fitConstituents, densifySamples, choleskySolve | 2 (scripts/fit-harmonic-constituents, tests/harmonic-fit) | **canonical** | — |
| `lib/harmonic-prediction.ts` | predictWaterLevel, TIDAL_CONSTITUENTS, getLocationConstituents, calculateNodalCorrection | 12 (tide-service, domain/tide-prediction, tile-packaging, sunmoon-system, offline-first/index, app/api/tiles, scripts) | **duplicate** | harmonic-tide-core (core), constituents (data), ephemerides (ephemerides) |
| `lib/harmonic-tide-core.ts` | predictTideLevel, CONSTITUENTS_DATABASE, calculateNodalCorrections, computeConstituentBasis, findHighLowTides, createPredictionSeries | 11 (station-harmonic-model, harmonic-fit, tide-service, domain/tide-prediction, tide-calculation-service, tests, scripts) | **canonical** | — |
| `lib/station-harmonic-model.ts` | getStationHarmonicPrediction, getStationHarmonicDayPrediction, getNearestConfiguredStationId | 11 (tide-comparison, tide-service, domain/tide-prediction, app/api/predict-tide, app/api/hydro-tide, tests) | **canonical** | — |
| `lib/wasm-tide-core.ts` | WasmTideEngine, wasmTideEngine | 0 | **dead** | — (WASM file not found) |
| `lib/constituents.ts` | TIDAL_CONSTITUENTS, getConstituent, getRegionalAmplitude | 1 (harmonic-engine only) | **duplicate** | harmonic-tide-core:CONSTITUENTS_DATABASE |
| `lib/ephemerides.ts` | calculateAstronomicalArguments, getDeltaTSeconds, getLeapSecondOffset | 9 (harmonic-engine, harmonic-tide-core, harmonic-prediction, tile-packaging, tests) | **canonical** | — |
| `lib/tide-calculation-service.ts` | predictTideWithCalibration, generate24HourPredictions | 0 | **dead** | — |
| `lib/tide-service.ts` | getTideData, types (LocationData, TideData, ApiStatus, SourceTier), re-exports getForecast/calculateLunarPhase | 58 | **canonical** (broad service layer) | — |
| `lib/tide-prediction-api.ts` | tidePredictionAPI, TidePredictionAPI | 1 (api-handlers — itself dead per packet B) | **duplicate** | domain/forecast-facade:getForecast |
| `lib/tide-calibration-apply.ts` | applyCalibrationSuggestions | 8 (calibration-panel, community-observations, scripts, tests) | **canonical** | — |
| `lib/calibration-system.ts` | CalibrationManager, calibrationManager | 1 (calibration-panel — dead per packet C) | **canonical-ish** (becomes dead after component deletion) | — |
| `lib/regional-calibration.ts` | REGIONAL_CALIBRATIONS, applyRegionalCorrection | 1 (tide-calculation-service — dead) | **dead** | — |
| `lib/tide-comparison.ts` | compareSnapshots, buildCalibrationSuggestion, ComparisonMetrics, renderComparisonMarkdown | 13 (tide-service, tide-calibration-apply, community-observations, domain/tide-prediction, calibration-panel, scripts, tests) | **canonical** | — |
| `lib/water-level-comparison.ts` | compareWaterLevel, getFloodWarningLevel, findNearestReferencePoint | 2 (water-level-graph-v2, enhanced-location-selector) | **canonical** | — |
| `lib/timing-accuracy-band.ts` | getTimingAccuracyBand, timingAccuracyBandLabel | 4 (tide-comparison re-export, forecast-trust-strip, tests) | **canonical** | — |
| `lib/confidence-bands.ts` | confidenceBandCalculator, ConfidenceBand | 1 (confidence-bands-panel — dead per packet C) | **canonical-ish** (becomes dead after component deletion) | — |
| `lib/slope-alerts.ts` | tideSlopeAnalyzer, TideAlert | 0 | **dead** | — |
| `lib/domain/tide-prediction.ts` | predictTideEvents, TideEvent | 4 (tide-service, domain/forecast-facade, tests) | **canonical** | — |
| `lib/domain/forecast-facade.ts` | getForecast, LocationData, TideData | 3 (tide-service re-export, tests) | **canonical — THE FACADE** | — |

## Canonical survivors per cluster
1. **Harmonic engines**: `harmonic-tide-core.ts` (correct continuous Doodson argument; harmonic-prediction.ts has a tau-wrapping discontinuity bug at lines 696-702).
2. **Constituent data**: `harmonic-tide-core.ts:CONSTITUENTS_DATABASE`.
3. **Prediction API layer**: `domain/forecast-facade.ts:getForecast` (per CONTEXT.md Forecast Facade).
4. **Calibration**: `tide-calibration-apply.ts` + `tide-comparison.ts` (active pipeline). `calibration-system.ts` is a parallel impl only used by the dead calibration-panel.

## Dead modules (Priority 1 deletions)
- `lib/wasm-tide-core.ts` (0 importers; WASM binary missing)
- `lib/tide-calculation-service.ts` (0 importers)
- `lib/regional-calibration.ts` (only importer is dead tide-calculation-service)
- `lib/slope-alerts.ts` (0 importers)

## Consolidation sequence (Priority 2-4)
1. Migrate `slope-alerts.ts` + `confidence-bands.ts` from `harmonic-engine:predictTideLevel` → `harmonic-tide-core:predictTideLevel`; migrate 3 scripts; then delete `harmonic-engine.ts`.
2. Fix or deprecate `harmonic-prediction.ts:predictWaterLevel` (discontinuity bug); migrate `sunmoon-system.ts` if live; consolidate TIDAL_CONSTITUENTS; then delete `constituents.ts`.
3. Migrate `api-handlers.ts` → `forecast-facade:getForecast` (but api-handlers itself is dead per packet B — so just delete both).
4. Resolve `calibration-system.ts` after deleting dead `calibration-panel.tsx`.

## Canonical public surface per CONTEXT.md
`lib/domain/forecast-facade.ts:getForecast` — single entry. Behind it: domain/tide-prediction → station-harmonic-model → harmonic-tide-core + ephemerides.

## Risks
- harmonic-engine imported by slope-alerts/confidence-bands (UI features) — migrate before delete.
- 3 scripts pin harmonic-engine directly.
- harmonic-prediction has a live discontinuity bug; sunmoon-system may call it.
- calibration-system vs tide-calibration-apply relationship needs confirmation.
