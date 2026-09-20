# Result — Tide Prediction Accuracy Audit & Improvement Evidence

## Baseline (TRUE, with correct cross-day matching + miss capping)

| Station | True clean MAE | ±15 target? | Constituents | Level MAE |
|---|---|---|---|---|
| hydro-36 (Phuket) | 10.1 min | ✅ | 17 | 0.03 m ✅ |
| hydro-19 (Ko Si Chang) | 13.9 min | ✅ | 24 | 0.07 m ✅ |
| hydro-1 (Bangkok) | 17.9 min | close | 28 | 0.08 m ✅ |
| hydro-21 (Koh Samui) | 21.9 min | ❌ worst | 14 | 0.05 m ✅ |

- Overall clean MAE ~15 min. Only 5 structural misses (0.1%), all hydro-21.
- Monthly MAE stable 13–17 min (no seasonal drift).
- **Level target ±0.10 m MET everywhere** (0.03–0.09 m).

## The measurement bug (critical discovery)

`tests/lib/tide-accuracy-regression.test.ts` gates at MAE ≤ 38 min and reports ~35 min. This was almost entirely a **measurement artifact**: day-bounded matching (`[00:00, 23:59]`) without cross-day windowing forces midnight events to match the opposite half-day's same-type extreme, producing ~719-min "errors." The true MAE is 10–22 min. The test was measuring wrong, hiding both how good the predictions are AND any future regressions.

## Root cause of hydro-21 (worst station)

`scripts/fit-harmonic-constituents.ts:29` defines `GULF_SHALLOW_STATIONS = {hydro-1, hydro-19}`, excluding hydro-21 (Koh Samui, Gulf of Thailand — mixed/shallow-water-influenced tides). So hydro-21 gets only 14 constituents, missing all shallow-water overtides (M4/MS4/MN4/M6) and minor satellites.

## Empirical re-fit experiment (read-only, scripts/experiment-hydro-21-fit.ts)

Reproduces production exactly (21.9 min, 4 misses) then tests fixes:
- **A) no shallow (current)**: 21.9 min, 4 misses
- **B) WITH shallow retention**: 20.2 min, **0 misses** (M4/MS4 added; 14→16 const)
- **C) B + timeOffset −4 min**: 20.0 min, 0 misses

Shallow retention improves hydro-21 by 1.7 min AND eliminates all 4 worst-case structural misses. Modest but real. hydro-21 still above ±15 — the residual is partly method-difference (fixtures are official predictions, not observations).

## Recommended improvements (evidence-backed)

1. **Fix the regression test matching** (cross-day window + miss cap at dominant quarter-period). Reveals true accuracy; lets gate move from ≤38 to a real threshold. LOW risk (test only).
2. **Add hydro-21 to GULF_SHALLOW_STATIONS + re-fit hydro-21** → 21.9→20.2 min, eliminates 4 misses. MEDIUM risk (production data: calibrated.json).
3. **Apply timeOffset −4 min to hydro-21** → 20.0 min. MEDIUM risk (production data).
4. **Sweep timeOffset for hydro-1** (already has shallow) — may push 17.9 → ≤15, making 3/4 stations pass. To test.
5. **Honesty note**: getting ALL 4 stations under ±15 against official-prediction fixtures may not be achievable with a pure harmonic model — residual is partly method-difference. Consider adding observed (not predicted) fixtures for a truer accuracy measure.

## Open question for user
Changing `data/station-harmonic-constants.calibrated.json` is a production data change → requires approval gate.
