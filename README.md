# Sunmoon

Offline-first tide and weather forecasting for Thai coastal waters, with a LINE
integration for push updates.

It predicts water levels from harmonic synthesis of tidal constituents, blends in
weather and lunar phase, and serves the result through a Next.js app that keeps working
without a network connection once the initial tile/data pack is downloaded.

## Prerequisites

- **Node.js** `>=18.18 <22` (declared in `engines`; CI uses 20)
- **pnpm** `11.8.0` (`packageManager` field — `corepack enable` will honour it)

## Getting started

```bash
pnpm install --frozen-lockfile
cp .env.example .env      # fill in whichever providers you actually use
pnpm dev                  # http://localhost:3000
```

Nothing in `.env` is required to boot: missing provider keys degrade to the offline path
and missing Redis falls back to in-memory caching.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `eslint .` |
| `pnpm test` / `pnpm test:watch` | Jest suite (see `tests/README.md`) |
| `pnpm fit:tides` | Least-squares fit of harmonic constants from validation fixtures |
| `pnpm compare:tides` | Compare predictions against external sources → `reports/` |
| `pnpm calibrate:tides` | Apply calibration offsets to the fitted constants |

A change is "done" when `typecheck`, `lint`, `test` and `build` are all green — that is
exactly what CI runs (`.github/workflows/ci.yml`).

## Environment variables

See `.env.example` for the annotated list. Two rules:

- Provider keys (`OPENWEATHER_API_KEY`, `WORLDTIDES_API_KEY`, `STORMGLASS_API_KEY`) are
  server-side only.
- `NEXT_PUBLIC_*` values are embedded in the browser bundle — never put a secret there.
  The two `NEXT_PUBLIC_*` API keys exist for the client-side offline path.

`.env` is gitignored. Never commit it.

## Project layout

```
app/                      Next.js App Router: pages and API routes
actions/                  Server actions
components/
  ui/                     shadcn/ui atoms
  shared/                 Cross-feature chrome (theme, cards, settings)
  features/               Grouped by domain: location, forecast, weather,
                          disaster, status, tiles
lib/
  domain/                 Forecast facade, tide events, disaster analysis, time
  harmonic/               Harmonic synthesis: constituents, ephemerides, fitting
  comparison/             Validation against external tide sources
  services/               LINE integration, weather/tide providers
  storage/                IndexedDB, tile packaging
  compression/            Compact wire protocol
  infra/                  Redis cache, service-worker registration
  presentation/           Formatting for the UI layer
data/                     Station constants, fixtures, benchmarks
scripts/                  Offline fitting/calibration/benchmark pipelines
tests/                    Jest suites mirroring the source tree
docs/                     Guides; historical material under docs/archive/
reports/                  Evidence: committed perf baselines, local run output
```

## Documentation

- `docs/architecture.md` — the module map and dependency rules (source of truth)
- `docs/README.md` — index of guides and operational references
- `docs/LINE_WEBHOOK_GUIDE.md`, `docs/LOCAL_LINE_TESTING.md` — LINE integration
- `docs/TIDAL_CONSTITUENTS.md` — the tide model
- `docs/adr/` — accepted decisions
- `CONTEXT.md` — domain glossary

## License

Not specified.
