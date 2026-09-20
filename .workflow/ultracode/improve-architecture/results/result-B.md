# Result B — lib/ data services + organizational overlap + taxonomy

Re-run in parent session (subagent returned empty). Evidence from grep across repo.

## External/legacy data-service classification

| File | Purpose | Importers | Classification |
|------|---------|-----------|----------------|
| `lib/hydro-service.ts` | Hydro station tide data fetcher | 0 source; only `tests/forecast-degraded-regression.test.ts:1,11` (mocked) | **dead-ish** — test-only, mocked. No production importer. |
| `lib/thaiwater-service.ts` | ThaiWater real-time water levels | 1: `components/RiskAreaMap.tsx:36` | **canonical** (live) |
| `lib/worldtides-client.ts` | WorldTides external API client | 2: `lib/tide-comparison.ts:16`, `tests/worldtrides-client.test.ts:1`, `tests/tide-comparison.test.ts:18` | **canonical** (used by comparison validation) |
| `lib/historical-data-service.ts` | Historical disaster events | 3: `components/disaster-alert.tsx:51`, `components/RiskAreaMap.tsx:34`, `components/HistoricalEventsPanel.tsx:40` | **canonical** (live) |
| `lib/disaster-analysis.ts` | Disaster risk analysis | 7: line/weather-dispatch, line/message-builder, forecast-today-panel, disaster-alert, enhanced-location-selector, MultiDayForecast, SafetyTips | **canonical** (heavily used) |
| `lib/disaster-data-service.ts` | Live disaster event fetcher | 2: `components/RealTimeDisasterPanel.tsx:9`, `app/api/live-disasters/route.ts:4` | **canonical** (live) |
| `lib/elevation-service.ts` | Ground elevation lookup | 1: `components/enhanced-location-selector.tsx:102` | **canonical** (live) |
| `lib/community-observations.ts` | Crowd-sourced observations + calibration | 2: `app/api/observations/route.ts:9`, (imports redis-cache) | **canonical** (live) |
| `lib/stormglass-example.ts` | Stormglass API example | 0 | **dead** |
| `lib/fes2022-generator.ts` | FES2022 tide model generator | 0 | **dead** |

## Migration state: services vs domain vs line vs offline-first

### `lib/services/forecast.ts` vs `lib/domain/forecast-facade.ts` — NOT duplicates
- `lib/services/forecast.ts:fetchForecast` (line 17): **async server-side fetcher**. Calls OpenWeather API directly, returns `ForecastResult`. Imported by `app/api/forecast/compact/route.ts:13`, `actions/get-location-forecast.ts:4`, `lib/line/weather-dispatch.ts:2`, `lib/line/message-builder.ts:1`.
- `lib/domain/forecast-facade.ts:getForecast`: **sync domain composition**. Integrates `domain/tide-prediction`, `domain/lunar-phase`, `domain/weather-blend`, `domain/datum-converter`. Re-exported by `lib/tide-service.ts:111`.
- **Verdict**: different layers. `services/forecast.ts` = network/IO layer; `domain/forecast-facade.ts` = pure domain composition. Both live. The naming is confusing — recommend renaming `services/forecast.ts` → `services/openweather-fetcher.ts` or documenting the split.

### `lib/services/line-service.ts` vs `lib/line/*` — orchestrator over primitives
- `lib/services/line-service.ts` imports `lib/compression/compact-client:13` and is imported by `app/api/webhook/line/route.ts:3`.
- `lib/line/*` (client, config, message-builder, signature, subscriber-store, types, weather-dispatch) are the primitives, imported directly by `app/api/line/webhook/route.ts` and `app/api/line/weather-update/route.ts`.
- **DUPLICATION FOUND**: two LINE webhook endpoints exist:
  - `app/api/webhook/line/route.ts` → uses `lib/services/line-service` (handleLineMessage, sendWelcomeMessage)
  - `app/api/line/webhook/route.ts` → uses `lib/line/*` primitives directly (dispatchWeatherUpdate, reply, verifyLineSignature, addSubscriber, removeSubscriber)
  - These are parallel implementations of the same webhook. **Needs reconciliation** — pick one path, delete the other.

### `lib/offline-first/*` vs flat offline/tile modules
- `lib/offline-first/*` (index, manifest, storage, tiles, types, worker-client, compute/fallback, compute/wasm-bridge) — the new structured offline layer.
- Flat modules still live and are imported:
  - `lib/tile-storage.ts` → imported by `tile-management-panel.tsx`, `offline-first/storage.ts`, `offline-ui.tsx`
  - `lib/tile-packaging.ts` → imported by `tile-management-panel.tsx`, `offline-first/storage.ts`, `offline-first/index.ts`, `app/api/tiles/[lat]/[lon]/route.ts`
  - `lib/indexed-db.ts` → imported by `app/api/tiles/cached/[id]/route.ts`, `app/api/tiles/cache/route.ts`, `offline-ui.tsx`
  - `lib/sw-registration.ts` → imported by `hooks/use-service-worker.ts`, `components/service-worker-registration.tsx`
  - `lib/data-compression.ts` → imported by `hooks/use-optimized-data.ts`, `components/communication-hub.tsx` (both dead per packet C)
  - `lib/offline-manager.ts` → **0 importers** → DEAD (superseded by offline-first/)
- **Verdict**: offline-first/ depends on the flat tile-storage/tile-packaging/indexed-db. These are the implementation; offline-first/ is the orchestration. Not duplicates — layered. `offline-manager.ts` is the dead predecessor.

## Dead flat infra/utility files (0 importers via any path)

| File | Evidence | Classification |
|------|----------|----------------|
| `lib/offline-manager.ts` | 0 importers | **dead** (superseded by offline-first/) |
| `lib/pwa-manifest.ts` | 0 importers | **dead** |
| `lib/security-manager.ts` | 0 importers | **dead** |
| `lib/query-cache.ts` | 0 importers | **dead** |
| `lib/center-gateway.ts` | 0 importers; `app/api/center-gateway/route.ts` is self-contained (does not import it) | **dead** |
| `lib/api-handlers.ts` | 0 importers; no API route imports it | **dead** (also imports the duplicate tide-prediction-api) |
| `lib/field-validation.ts` | 0 importers | **dead** |
| `lib/accessibility.ts` | 0 importers | **dead** |
| `lib/responsive.ts` | 0 importers (only self-reference) | **dead** |
| `lib/device-optimizer.ts` | 0 importers | **dead** |
| `lib/stormglass-example.ts` | 0 importers | **dead** |
| `lib/fes2022-generator.ts` | 0 importers | **dead** |
| `lib/hydro-service.ts` | 0 production importers; only test mock | **dead-ish** (test-pinned) |

## Live flat utility files (keep, bucket into infra)

| File | Importers | Bucket |
|------|-----------|--------|
| `lib/utils.ts` (cn helper) | ~50+ (all shadcn ui + components) | ui |
| `lib/thailand-time.ts` | domain/*, services/forecast, tide-service | domain/time |
| `lib/controls.ts` | water-level-graph-v2, tide-status-hero, enhanced-location-selector, controls-panel, offline-ui, water-level-graph, tide-animation-new | ui/controls |
| `lib/distance-utils.ts` | forecast-today-panel, enhanced-location-selector | domain/geo |
| `lib/redis-cache.ts` | community-observations (relative import) | infra/cache |
| `lib/performance-profiler.ts` | hooks/use-performance-monitoring | infra/observability |
| `lib/retry-logic.ts` | enhanced-error-state (dead component) | infra (dead after component deletion) |
| `lib/network-optimization.ts` | network-optimization-stats (dead component) | infra (dead after component deletion) |
| `lib/sunmoon-system.ts` | system-dashboard (dead component) | infra (dead after component deletion) |

## Proposed target taxonomy for lib/

```
lib/
├── domain/              # pure domain logic (no IO) — the Forecast Facade lives here
│   ├── forecast-facade.ts        (FACADE — narrow public surface)
│   ├── tide-prediction.ts
│   ├── lunar-phase.ts
│   ├── weather-blend.ts
│   ├── datum-converter.ts
│   ├── tide-comparison.ts        (validation/accuracy — move from flat)
│   ├── tide-calibration-apply.ts (move from flat)
│   ├── water-level-comparison.ts (move from flat)
│   ├── timing-accuracy-band.ts   (move from flat)
│   ├── thailand-time.ts          (move from flat)
│   └── distance-utils.ts         (move from flat)
├── tide/                # harmonic synthesis engine internals (behind facade)
│   ├── harmonic-tide-core.ts     (canonical engine)
│   ├── harmonic-fit.ts           (offline fitting)
│   ├── station-harmonic-model.ts (station constants)
│   ├── constituents.ts           (ONLY if kept; else delete — duplicate)
│   └── ephemerides.ts
├── services/            # IO / network layer
│   ├── forecast.ts               (openweather fetcher — rename for clarity)
│   ├── line-service.ts           (LINE orchestrator)
│   ├── thaiwater-service.ts
│   ├── worldtides-client.ts
│   ├── historical-data-service.ts
│   ├── disaster-data-service.ts
│   ├── disaster-analysis.ts
│   ├── elevation-service.ts
│   └── community-observations.ts
├── offline-first/       # offline orchestration (keep as-is)
├── compression/         # compact protocol (keep as-is)
├── line/                # LINE primitives (keep as-is)
├── infra/               # cross-cutting infra
│   ├── cache/
│   │   ├── redis-cache.ts
│   │   └── query-cache.ts        (delete — dead)
│   ├── storage/
│   │   ├── tile-storage.ts
│   │   ├── tile-packaging.ts
│   │   ├── tile-manager.ts
│   │   ├── tile-compression.ts
│   │   └── indexed-db.ts
│   ├── observability/
│   │   └── performance-profiler.ts
│   ├── security/
│   │   └── security-manager.ts   (delete — dead)
│   └── pwa/
│       ├── sw-registration.ts
│       ├── pwa-manifest.ts       (delete — dead)
│       └── offline-manager.ts    (delete — dead)
└── ui/                  # UI utilities (cn, controls, responsive)
    ├── utils.ts
    └── controls.ts
```

### Facade vs internal classification
- **Facade (public surface)**: `domain/forecast-facade.ts:getForecast` — the single entry per CONTEXT.md.
- **Internal (behind facade)**: everything in `tide/`, `domain/tide-prediction.ts`, `domain/lunar-phase.ts`, `domain/weather-blend.ts`, `domain/datum-converter.ts`.
- **Service layer (IO)**: `services/*` — may be called directly by API routes/actions, not via the facade.
- **Infra**: `infra/*` — called by services and components directly.

## Risks
1. **Two LINE webhooks** — must reconcile before any line-service/line consolidation.
2. **`services/forecast.ts` vs `domain/forecast-facade.ts`** — easy to mistake as duplicates; they are not. Renaming recommended.
3. **Dead infra files imported by dead components** — `retry-logic`, `network-optimization`, `sunmoon-system` become dead only AFTER packet C's component deletions. Sequence: delete components first, then re-verify these.
4. **`hydro-service.ts`** — test-mocked but no production importer. Deleting requires updating the test mock.
5. **Moving files** requires updating all `@/lib/...` import paths; tsconfig/webpack/jest all map `@/` to root, so moves are safe as long as imports are updated.

## Recommended parent action
1. Delete the 12 dead flat files (after confirming no dynamic imports — none found).
2. Reconcile the two LINE webhook routes (pick one, delete the other + its lib path).
3. Rename `services/forecast.ts` → `services/openweather-fetcher.ts` for clarity.
4. Move flat domain/tide/infra files into the proposed taxonomy (mechanical move + import rewrite).
5. After component deletions (packet C), re-audit `retry-logic`, `network-optimization`, `sunmoon-system` for deletion.
