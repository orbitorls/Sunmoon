# Documentation Index

## Start here
- **Architecture** → `docs/architecture.md`
  The module map as it exists today: folders, responsibilities, dependency
  rules, and the storage tiers.

## Active guides
- **Tidal Constituents** → `docs/TIDAL_CONSTITUENTS.md`
  Frequency table, Doodson numbers, Thai regional notes.
- **LINE webhook** → `docs/LINE_WEBHOOK_GUIDE.md`, `docs/LOCAL_LINE_TESTING.md`
- **Calibration ADR** → `docs/adr/0001-offline-first-calibration-for-accuracy.md`
  Accepted: harmonic synthesis core, pre-computed per-station offsets.

## Operational references
- **Forecast Facade** → `lib/domain/forecast-facade.ts`
- **Prediction API** → `app/api/predict-tide/route.ts`, `app/api/hydro-tide/route.ts`
- **Tile packaging / cache** → `lib/tile-packaging.ts`, `lib/tile-storage.ts`, `lib/indexed-db.ts`
- **Shared storage helpers** → `lib/storage/core.ts`
- **Performance harness** → `scripts/perf/bench-tide.ts` (baseline JSON under `reports/perf/`)

## Historical / superseded
- **Offline-first blueprint** → `docs/offline-first-architecture.md`
  An aspirational WASM + signed-tile-manifest design that was never built; the
  `lib/offline-first/` module it describes no longer exists. Kept for context.
- **WASM build guide** → `docs/WASM_SETUP.md` (not required for the current JS engine)
- **Refactor plans** → `docs/superpowers/plans/`
  Written before the consolidation waves; their file paths are historical and do
  not all match the current tree. `docs/architecture.md` is the current source of truth.

## Notes
- `docs/mega-spec-assessment.md` tracks coverage against the original MEGA
  offline-first requirements; most MUST items remain unimplemented by design.
