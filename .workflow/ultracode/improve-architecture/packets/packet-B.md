# Packet B — lib/ data services + organizational overlap + taxonomy

You are working in the same repo as other agents. **Read-only. Do not edit any file.**

Repo root: `D:\Sunmoon`

## Task
(1) Map the external/legacy data-service modules in `lib/`.
(2) Reconcile the partial folder migration: `lib/services/*` vs `lib/domain/*`
vs `lib/offline-first/*` vs `lib/compression/*` vs `lib/line/*` vs the flat
`lib/*.ts` files. (3) Propose a target folder taxonomy for all of `lib/`.

## Files in scope
External/legacy data services (flat):
- `lib/hydro-service.ts`
- `lib/thaiwater-service.ts`
- `lib/worldtides-client.ts`
- `lib/historical-data-service.ts`
- `lib/disaster-analysis.ts`
- `lib/disaster-data-service.ts`
- `lib/elevation-service.ts`
- `lib/community-observations.ts`
- `lib/stormglass-example.ts`
- `lib/fes2022-generator.ts`

Organizational folders (compare against flat files):
- `lib/services/forecast.ts`, `lib/services/line-service.ts`
- `lib/domain/forecast-facade.ts`, `lib/domain/tide-prediction.ts`,
  `lib/domain/lunar-phase.ts`, `lib/domain/datum-converter.ts`,
  `lib/domain/weather-blend.ts`
- `lib/offline-first/*` (all files)
- `lib/compression/compact-client.ts`, `lib/compression/compact-protocol.ts`
- `lib/line/*` (all files)

The remaining flat utility/infra `lib/*.ts` files (for taxonomy only — do not
deep-audit each; just bucket them): accessibility, api-handlers,
center-gateway, controls, data-compression, device-optimizer, distance-utils,
field-validation, indexed-db, network-optimization, offline-manager,
offline-storage, performance-profiler, pwa-manifest, query-cache, redis-cache,
responsive, retry-logic, security-manager, sunmoon-system, sw-registration,
thailand-time, tile-compression, tile-manager, tile-packaging, tile-storage,
utils.

## Do
- For each external data-service file: exports, one-line purpose, importer
  count + top import sites, classification (canonical/duplicate/dead/unresolved).
- Determine the migration state: is `lib/services/forecast.ts` the same surface
  as `lib/domain/forecast-facade.ts`? Which is live? Is `lib/services/line-service.ts`
  superseded by `lib/line/*`?
- Map `lib/offline-first/*` vs the flat `lib/offline-manager.ts`,
  `lib/offline-storage.ts`, `lib/indexed-db.ts`, `lib/sw-registration.ts`,
  `lib/tile-*.ts`, `lib/data-compression.ts`, `lib/tile-compression.ts`.
- Propose a target taxonomy for ALL of `lib/`, e.g.:
  `lib/domain/`, `lib/services/`, `lib/infra/` (cache/network/storage/security),
  `lib/data/` (external sources + fixtures), `lib/offline-first/`,
  `lib/compression/`, `lib/line/`, `lib/ui/` (responsive/accessibility/device).
  Assign every current flat file to a target bucket.
- Flag any file that is a "facade candidate" (narrow public surface) vs
  "internal" (behind the facade).

## Do not
- Edit, move, rename, or delete any file.
- Deep-audit the harmonic/tide-engine modules (packet A owns those).
- Audit components (packet C) or hygiene/config (packet D).

## Expected output (write to `D:\Sunmoon\.workflow\ultracode\improve-architecture\results\result-B.md`)
- External data-service table: file | exports | purpose | importers | classification.
- Migration-state findings: services vs domain vs line vs offline-first.
- Proposed target taxonomy: bucket → list of current files that belong there.
- Facade vs internal classification.
- Risks + recommended parent action.
- Cite paths + line numbers.
