# Sunmoon Architecture

Current, as-built module map. Where this disagrees with anything under
`docs/archive/`, this document wins — the archived plans predate the
consolidation waves.

## Principles

- **One owner per concept.** One prediction engine, one constituent catalog, one
  LINE message-text module, one geo helper, one storage-helper module.
- **Thin boundaries.** `app/` routes and `components/` render; `lib/` decides.
  Routes and components should hold as little logic as possible.
- **Data flows one way.** Lower layers never import upward.
- **Deterministic core.** The tide model is a pure function of
  (constituents, timestamp, longitude). Anything environment-dependent lives at
  the edges (providers, cache, UI).

## Directory map

```
app/                     Next.js App Router: pages + API route handlers (thin)
actions/                 Server actions (forecast fetch, LINE broadcast)
components/              React components (kebab-case files); components/ui = shadcn primitives
hooks/                   React hooks (state/effects only)
lib/
  harmonic/              Tide model: synthesis, fitting, station selection, ephemerides
  domain/                Business logic and domain types (incl. time + tide events)
  comparison/            Accuracy validation, calibration, timing bands
  presentation/          Thai formatting of domain results
  services/              External I/O (weather, tides, disasters, elevation) + LINE
  storage/               Storage seam: shared helpers + tier modules + barrel
  compression/           Binary wire protocols
  infra/                 Cross-cutting infra (Redis cache, service-worker registration)
  ui/                    Client-side UI control singletons (controls.ts)
data/                    Fitted constants, stations, fixtures, benchmarks
scripts/                 Offline pipelines (fit, calibrate, compare) + perf harness
tests/                   Jest suites (see tests/README.md)
docs/                    This document, ADRs, guides
```

### `lib/harmonic/` — the tide model

| File | Responsibility |
|---|---|
| `core.ts` | The single prediction engine: astronomical arguments, nodal corrections, equilibrium arguments, `predictTideLevel`, `createPredictionSeries`, `findHighLowTides` |
| `constituent-catalog.ts` | `TIDAL_CONSTITUENTS` metadata + `getLocationConstituents` per-region selection |
| `fit.ts` | Offline least-squares fitting of constituents to observations |
| `station-model.ts` | Per-station prediction from calibrated constants (nearest-station selection, offsets) |
| `index.ts` | Public barrel |

There is exactly one `predictTideLevel`. Older duplicates (`engine.ts`,
`constituents.ts`, `confidence-bands.ts`) were dead and have been removed.

### `lib/domain/` — business logic

| File | Responsibility |
|---|---|
| `forecast-facade.ts` | **The Forecast Facade** — `getTideData`: provider/harmonic tier selection, calibration offsets, unit/datum conversion, graph series, provenance |
| `types.ts` | Shared domain types (`LocationData`, `TideData`, `WeatherData`, `TideEvent`, …) |
| `tide-prediction.ts` | Tide event derivation when the station model is unavailable |
| `weather-blend.ts` | Weather retrieval + deterministic fallback |
| `lunar-phase.ts` | Thai lunar phase |
| `geo.ts` | Haversine distance + pier/port reference data |
| `disaster-analysis.ts` | Disaster-risk façade (re-exports analysis + formatters) |
| `disaster-analysis-types.ts` | Risk types + thresholds |
| `disaster-classify.ts` | Risk classification (`analyzeDisasterRisk`) |

### `lib/comparison/` — accuracy validation

`types.ts` (no runtime deps) → `sources.ts` (provider snapshots + validation
fixtures) → `metrics.ts` (event matching, MAE, calibration suggestions) →
`report.ts` (orchestration, markdown, artifacts), with `index.ts` as the public
barrel. The dependency direction is strictly left-to-right and acyclic.

### `lib/presentation/`

Thai-language formatting of domain results, separated so analysis modules stay
language-agnostic. Today: `disaster-formatter.ts`.

### `lib/services/`

External I/O. `forecast.ts` (OpenWeather), `disaster-data-service.ts` (live
disaster feed), `worldtides-client.ts`, `thaiwater-service.ts`,
`elevation-service.ts`, `historical-data-service.ts`, `community-observations.ts`.

#### `lib/services/line/` — LINE Messaging

`client.ts` is the only module that performs LINE HTTP calls. `message-builder.ts`
is the only module that contains LINE message text. `message-handler.ts`
(webhook reply) and `weather-dispatch.ts` (broadcast push) are orchestration over
those two, and `reply.ts` is a thin wrapper over `client.reply`. `line-service.ts`
is the public surface that routes and server actions import.

### `lib/storage/` — the storage seam

Three tiers with deliberately different backends, plus shared helpers:

| Module | Backend | Format |
|---|---|---|
| `offline-storage.ts` | localStorage | JSON request cache |
| `indexed-db.ts` | IndexedDB (`SunmoonTileDB`) | gzip blobs, LRU by access count |
| `tile-storage.ts` | IndexedDB (`SunmoonTileCache`) | raw payloads + metadata, age/quota eviction |
| `core.ts` | — | `formatBytes`, `sha256Hex`, `compressionRatio` |

`core.ts` documents why the compression helpers are **not** unified: the tiers
persist different formats (`gzip` vs zlib `deflate`), so merging them would make
already-persisted payloads unreadable.

### `lib/` root

Only `utils.ts` remains at the root — it is the target of the shadcn
`@/lib/utils` alias and must stay there. Every other module is filed into a
bucket above.

## Dependency rules

```
app/ , components/ , hooks/ , actions/
        │
        ▼
lib/domain  lib/comparison  lib/presentation  lib/services  lib/storage  lib/infra
        │
        ▼
lib/harmonic  (pure math, depends only on lib/harmonic/ephemerides)
```

- `lib/harmonic/**` must not import from `components/`, `app/`, or any I/O module.
- `lib/presentation/**` may import domain *types*, never perform I/O.
- `lib/comparison/types.ts` must keep zero runtime dependencies.
- Routes and components must not import provider clients directly; go through
  the facade or a `lib/services` module.

## The forecast pipeline

1. `getStationHarmonicPrediction` (station-model) → calibrated harmonic series +
   5-minute extremum scan, when a configured station is within 150 km.
2. Otherwise `forecast-facade` walks provider tiers (WorldTides / Stormglass /
   ThaiWater) with an HTTP cache, sanity-checking against the harmonic baseline.
3. Otherwise the canonical harmonic fallback (`lib/domain/tide-prediction.ts`).
4. Every result carries provenance: `sourceTier`, `modelVersion`, `stationId`,
   `qualityScore`, `degraded` — so callers never have to guess.

## Performance

- The ephemeris is evaluated **once per timestamp**, not once per constituent
  (`predictTideLevel` hoists `calculateAstronomicalArguments` and reuses it).
- `scripts/perf/bench-tide.ts` measures the hot paths and writes JSON; a
  committed baseline lives in `reports/perf/`. Compare before/after with:
  ```
  pnpm tsx scripts/perf/bench-tide.ts --label=after --out=reports/perf/bench-tide-after.json
  ```
- Cache headers are configured in `next.config.mjs`. Next.js applies every
  matching rule in array order and **the last match wins**, so rules must be
  ordered general → specific; `tests/next-config-headers.test.ts` guards this.
- Heavy client libraries (`pigeon-maps`, `recharts`) are isolated behind
  `next/dynamic(..., { ssr: false })` in `*.client.tsx` files.

## Conventions

- `lib/` modules and component files: kebab-case. Component *exports* stay
  PascalCase. `components/ui/` is generated shadcn and keeps kebab-case.
- Dynamic-import-only components get a `.client.tsx` suffix.
- No backwards-compatibility shims: old paths are deleted, not re-exported.
- Server-only modules are used through routes/actions, never imported by
  components.

## Verification

```
pnpm typecheck   # tsc --noEmit
pnpm lint        # next lint
pnpm test        # jest
pnpm build       # next build  (requires Node < 22 — see below)
```

The tide model is additionally guarded by regression suites:
`tests/harmonic-tide-core.test.ts` (Doodson/Schurell arguments and nodal
factors) and `tests/lib/tide-accuracy-regression.test.ts` (pilot-station MAE
≤ 22 min, structural miss-rate < 2%).

**Known environment constraint:** `next build` and `next dev` fail on Node 24
with `TypeError: Cannot read properties of undefined (reading 'length')` inside
webpack's WASM hasher (and `EvalError: Code generation from strings disallowed`
for edge routes in dev). `package.json` pins the supported range to
`>=18.18 <22`; CI runs Node 20.
