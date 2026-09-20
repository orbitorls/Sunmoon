# Final Report — Tide Prediction Accuracy Improvement

## Outcome
Improved true tide-prediction timing accuracy and fixed a broken accuracy measurement. Level accuracy already met target.

## What was actually wrong (the big discovery)
The regression test reported ~35 min MAE and gated at ≤38. This was almost entirely a **measurement artifact**: day-bounded matching forced midnight events to pair with the opposite half-day's same-type extreme, producing fake ~719-min "errors." True MAE was 10–22 min all along. The test was hiding both how good the predictions were AND any future regressions.

## True baseline (measured correctly)
| Station | True clean MAE | ±15? | Level MAE |
|---|---|---|---|
| hydro-36 (Phuket) | 10.1 min | ✅ | 0.03 m ✅ |
| hydro-19 (Ko Si Chang) | 13.9 min | ✅ | 0.07 m ✅ |
| hydro-1 (Bangkok) | 17.9 min | close | 0.08 m ✅ |
| hydro-21 (Koh Samui) | 21.9 min → **20.0 min** | improved | 0.05 m ✅ |

## Changes made
1. **tests/lib/tide-accuracy-regression.test.ts** — fixed matching: cross-day window (−12h..+36h) + miss capping at dominant quarter-period + separate miss-rate gate (<2%). Gate moved from ≤38 (artifact) to ≤22 (true). Now measures honestly.
2. **scripts/fit-harmonic-constituents.ts** — added hydro-21 to GULF_SHALLOW_STATIONS (was excluded, leaving it with only 14 constituents and no shallow-water overtides).
3. **data/station-harmonic-constants.calibrated.json** — hydro-21 re-fitted with shallow-water retention (14→16 constituents, M4/MS4 added) + timeOffset −4 min. 21.9→20.0 min clean MAE, 0 structural misses (was 5).
4. **data/station-harmonic-constants.json** — base file updated with hydro-21's fitted constants (via fit --write).
5. **scripts/diagnose-tide-accuracy.ts** (new) — permanent signed-error diagnostic: per-station MAE/bias/std, miss capping, monthly trend, worst-fixtures.
6. **scripts/experiment-hydro-21-fit.ts**, **scripts/experiment-hydro-1-sweep.ts** (new) — evidence experiments (read-only methodology).

## Verification run
- `tests/lib/tide-accuracy-regression.test.ts`: **PASS 4/4** (with new correct matching + ≤22 gate).
- forecast-degraded-regression, tide-comparison, tide-calibration-apply, harmonic-fit, harmonic-tide-core, calibrate-pilots, tide-validation-events, all lib/domain tests: **PASS**.
- Diagnostic re-run confirms hydro-21 21.9→20.0 min, 0 misses; other stations unchanged.

## Skipped / not changed
- **hydro-1**: timeOffset sweep showed current 2 min is already optimal (17.9 min); no timeOffset gets it under ±15. The residual is genuine constituent-phase scatter, not a fixable bias. No change.
- **hydro-19, hydro-36**: already pass ±15; no change.

## Pre-existing failures (NOT caused by this work)
- `tests/forecast-provenance-regression.test.ts`: broken at HEAD (9/9 fail, `generatePredictionTimeSeries is not a function`); with WIP, 1 fail (expects configuredStations=4 but calibrated.json legitimately has 19 from TICON-4). Stale expectation in user's WIP — out of scope.
- `tests/services/line-service.test.ts`: suite-level failure in weather error handling; all 38 assertions pass. LINE/weather code, untouched by this work.

## Remaining risk / honest limits
- hydro-21 lows still at 24.6 min (highs now 15.7, pass ±15). The low-tide residual in the Gulf's mixed regime is the hardest remaining gap.
- Fixtures are `official_prediction` (Thai Navy predictions, not observations). We're approximating another prediction method, so a ~15–20 min residual is partly irreducible method-difference. Getting all 4 stations under ±15 against these fixtures may require observed-water-level fixtures, not just better constituents.
- The fit script's `--write` updated the base constants file; both base and calibrated are now consistent for hydro-21.
- No commit/push done (per policy).

## Path to ±15 for all pilots (future work, not done)
1. Source observed water-level fixtures (not official predictions) for a truer accuracy measure.
2. For hydro-21 lows: investigate adding more diurnal satellites or a per-regime correction.
3. For hydro-1 (17.9): re-fit with a longer multi-year window if data becomes available (current fit is 1 year).
