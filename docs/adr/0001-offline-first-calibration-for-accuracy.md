# ADR 0001: Offline-First Calibration Offsets for Accuracy

## Status
Accepted

## Context
The tide comparison reports show mean absolute timing errors of 8–137 minutes for the four pilot stations, with most failures caused by phase shifts in the harmonic synthesis. Level metrics are suppressed because datum alignment is uncertain.

The system is constrained to remain offline-first: predictions must work without a network connection after the initial data pack is downloaded. This rules out real-time external re-calibration at request time.

The repository already contains fitted harmonic constants and validation fixtures produced by earlier calibration work.

## Decision
Apply pre-computed, per-station calibration offsets (time and level) from the fitted constants inside the forecast facade. Keep harmonic synthesis as the core computation. Do not replace it. Prioritise the four pilot stations and a 24–72 hour horizon, then expand to the remaining 34 stations as fitted constants become available.

## Consequences

- Keeps the offline-first constraint intact.
- Improves timing and level accuracy where fitted constants exist.
- Adds a dependency on `data/station-harmonic-constants.fitted.json` being current.
- Requires the forecast facade to select the closest or exact station offset deterministically.
- Reversing the decision means removing the offset application step; the harmonic synthesis still works without it, but with lower accuracy.
- Post-implementation coverage (2026-08-15): 1 of 38 stations within 30 minutes, 0 of 4 pilot stations within 15 minutes.
