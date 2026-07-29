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
2. Least-squares fitting amplitude/phase for the major tidal constituents with `lib/harmonic-fit.ts`.
3. Calibrating `timeOffsetMinutes` and `levelOffsetMeters` against the same official table by matching predicted high/low events.

For sample windows >= 200 days, the close K1/P1 and S2/K2 pairs are now fit directly instead of being inferred from fixed equilibrium ratios. This improves residual and timing accuracy for the one-year tables.

## Consequences

- Keeps the offline-first constraint intact.
- Improves timing and level accuracy where fitted constants exist.
- Adds a dependency on `data/station-harmonic-constants.calibrated.json` being current.
- Requires the forecast facade to select the closest or exact station offset deterministically.
- Reversing the decision means removing the offset application step; the harmonic synthesis still works without it, but with lower accuracy.
- Post-implementation coverage (2026-08-15, benchmarks): 4 of 4 pilot stations within 30 minutes, all within 15 minutes on the sampled validation day.
- Regression MAE across 2026 pilot fixtures: hydro-1 37.5 min, hydro-19 30.1 min, hydro-21 38.4 min, hydro-36 34.1 min (below the 40 min test threshold). Level error for the sample date is below 0.3 m for all four pilots.
- Remaining gap to ±15 min / ±0.10 m is primarily the 30–60 minute quantisation/phase residual from fitting to hourly rather than sub-hourly samples and from missing higher-order shallow-water constituents not resolvable in the one-year table.
