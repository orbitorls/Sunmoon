# Documentation Index

## Start here
- **Project overview & setup** → [`README.md`](../README.md) at the repo root
- **Architecture** → `docs/architecture.md`
  The module map as it exists today: folders, responsibilities, dependency rules,
  and the storage tiers. This is the source of truth when anything disagrees.

## Active guides
- **Tidal Constituents** → `docs/TIDAL_CONSTITUENTS.md`
  Frequency table, Doodson numbers, Thai regional notes.
- **LINE webhook** → `docs/LINE_WEBHOOK_GUIDE.md`, `docs/LOCAL_LINE_TESTING.md`
- **Offline tiles** → `docs/workflows/offline-tiles.md`
- **Calibration ADR** → `docs/adr/0001-offline-first-calibration-for-accuracy.md`
  Accepted: harmonic synthesis core, pre-computed per-station offsets.

## Operational references
- **Forecast Facade** → `lib/domain/forecast-facade.ts`
- **Prediction API** → `app/api/predict-tide/route.ts`, `app/api/hydro-tide/route.ts`
- **Tile packaging / cache** → `lib/storage/tile-packaging.ts`, `lib/storage/tile-storage.ts`, `lib/storage/indexed-db.ts`
- **Shared storage helpers** → `lib/storage/core.ts`
- **Performance harness** → `scripts/perf/bench-tide.ts` (committed baselines under `reports/perf/`, see `reports/README.md`)

## Historical / superseded
Everything below moved to `docs/archive/` — kept for context, not current:
- `docs/archive/superpowers/plans/`, `docs/archive/superpowers/specs/` — pre-consolidation
  refactor plans whose file paths are historical
- `docs/archive/offline-first-architecture.md`, `docs/archive/WASM_SETUP.md` — a WASM
  design that was never built
- `docs/archive/mega-spec-assessment.md` — coverage against the original MEGA requirements

See `docs/archive/README.md`.
