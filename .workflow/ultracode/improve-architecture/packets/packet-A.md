# Packet A — lib/ core tide-engine duplication map

You are working in the same repo as other agents. **Read-only. Do not edit any file.**

Repo root: `D:\Sunmoon`

## Task
Map the duplication in the core tide-engine layer of `lib/`. Determine, for
each module, whether it is canonical, duplicate, or dead — with import evidence.

## Files in scope (own these; do not touch other agents' files)
- `lib/harmonic-engine.ts`
- `lib/harmonic-fit.ts`
- `lib/harmonic-prediction.ts`
- `lib/harmonic-tide-core.ts`
- `lib/station-harmonic-model.ts`
- `lib/wasm-tide-core.ts`
- `lib/constituents.ts`
- `lib/ephemerides.ts`
- `lib/tide-calculation-service.ts`
- `lib/tide-service.ts`
- `lib/tide-prediction-api.ts`
- `lib/tide-calibration-apply.ts`
- `lib/calibration-system.ts`
- `lib/regional-calibration.ts`
- `lib/tide-comparison.ts`
- `lib/water-level-comparison.ts`
- `lib/timing-accuracy-band.ts`
- `lib/confidence-bands.ts`
- `lib/slope-alerts.ts`
- `lib/domain/tide-prediction.ts` (the apparent successor — compare against it)
- `lib/domain/forecast-facade.ts` (the declared public surface in CONTEXT.md)

## Do
- For each file: list its named exports and a one-line purpose.
- For each file: search the whole repo for importers (exclude self and
  `.bak`). Report importer count and the top import sites (path + line).
- Classify each file as one of: **canonical** (live, the intended survivor),
  **duplicate** (live but redundant with a canonical one — name which),
  **dead** (zero non-self importers and not an entry point), **unresolved**
  (cannot determine — explain why).
- Compare the flat `lib/harmonic-*` / `lib/tide-*` modules against
  `lib/domain/tide-prediction.ts` and `lib/domain/forecast-facade.ts`: which
  flat modules are already superseded by the domain folder?
- Identify the single canonical public surface for tide prediction per
  CONTEXT.md's "Forecast Facade" and list which modules should sit behind it.

## Do not
- Edit, move, rename, or delete any file.
- Run destructive commands.
- Duplicate packet B/C/D work (data services, components, hygiene, config).

## Expected output (write to `D:\Sunmoon\.workflow\ultracode\improve-architecture\results\result-A.md`)
- Per-file table: file | exports | purpose | importer count | top import sites | classification | superseded-by
- A "canonical survivor" recommendation per duplication cluster.
- Risks (e.g. runtime-only imports, dynamic imports, tests that pin behavior).
- Recommended parent action (what to merge/delete/keep, in priority order).
- Cite file paths + line numbers for every claim.
