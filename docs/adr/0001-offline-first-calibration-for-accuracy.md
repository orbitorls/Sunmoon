# ADR 0001: Offline-First Calibration Offsets for Accuracy

## Status
Accepted

## Context
The tide comparison reports show mean absolute timing errors of 8–137 minutes for the four pilot stations, with most failures caused by phase shifts in the harmonic synthesis. Level metrics are suppressed because datum alignment is uncertain.

The system is constrained to remain offline-first: predictions must work without a network connection after the initial data pack is downloaded. This rules out real-time external re-calibration at request time.

The repository already contains fitted harmonic constants and validation fixtures produced by earlier calibration work. This work was later enhanced by fitting the four pilot stations directly against the Royal Thai Navy 2026 hourly tide tables, then calibrating a constant time/level offset against the same tables.

## Decision
Apply pre-computed, per-station calibration offsets (time and level) from the fitted constants inside the forecast facade. Keep harmonic synthesis as the core computation. Do not replace it. Prioritise the four pilot stations and a 24–72 hour horizon, then expand to the remaining 34 stations as fitted constants become available.

Fitted constants are produced by:
1. Extracting 24 hourly heights per day from the official Thai Navy PDFs.
2. Densifying hourly heights to 15-minute samples via cubic Hermite interpolation, and injecting official high/low extremes (quadratic-refined times from the same tables) with elevated least-squares weight so sub-hour phase enters the design matrix.
3. Least-squares fitting amplitude/phase for the major tidal constituents plus shallow-water compounds (M4, MS4, MN4, M6) with `lib/harmonic-fit.ts`, retaining small shallow-water amplitudes (≥3 mm) for upper-Gulf stations (`hydro-1`, `hydro-19`).
4. Calibrating `timeOffsetMinutes` / `levelOffsetMeters` and optionally refining major/shallow constituent phases against the same official high/low fixtures (offline scripts only — never at request time).

For sample windows >= 200 days, the close K1/P1 and S2/K2 pairs are fit directly instead of being inferred from fixed equilibrium ratios. Extreme detection uses a 5-minute scan step.

## Consequences

- Keeps the offline-first constraint intact.
- Improves timing and level accuracy where fitted constants exist.
- Adds a dependency on `data/station-harmonic-constants.calibrated.json` being current.
- Requires the forecast facade to select the closest or exact station offset deterministically.
- Reversing the decision means removing the offset application step; the harmonic synthesis still works without it, but with lower accuracy.
- Wave A (2026-07-31) densify + extreme-weighted fit + gated phase refine: regression MAE across full 2026 pilot fixtures is approximately hydro-1 35.6 min, hydro-19 29.5 min, hydro-21 37.3 min, hydro-36 31.6 min (regression gate tightened 40 → 38). Sample comparison days (e.g. 2026-08-15) remain within ~30 minutes for all pilots.
- Wave B coverage (2026-07-31): TICON-4 nearest-gauge imports expanded configured stations from 4 pilots to 19 where a published gauge is ≤150 km (`--expand --skip-navy`); no synthetic validation fixtures were invented for non-pilot stations.
- Remaining gap to ±15 min / ±0.10 m is primarily irreducible with a single annual harmonic set against Navy tables that include complex double-high structure (upper Gulf) and non-tidal residual; next levers are seasonal/nodal multi-set fits and more official sub-hourly series if published — not online refit.
