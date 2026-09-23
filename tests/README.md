# Test Suite

All tests run under Jest with `ts-jest`. Configuration lives in the `jest` block of
`package.json`; `roots` is `tests/`, so every suite must live under this directory to be
picked up (`testRegex: tests/.*\.test\.[jt]sx?$`).

## Commands

| Command | What it does |
| --- | --- |
| `pnpm test` | Run every suite |
| `pnpm test:watch` | Re-run on change |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `eslint .` |
| `pnpm build` | `next build` |

A change is only "done" when `typecheck`, `lint`, `test` and `build` are all green —
that is exactly what CI runs (`.github/workflows/ci.yml`).

## Layout

`tests/` mirrors the path of the source it covers, so a suite's home is predictable:

| Source | Test |
| --- | --- |
| `lib/harmonic/*` | `tests/lib/harmonic/*.test.ts` |
| `lib/services/line/*` | `tests/lib/services/line/*.test.ts` |
| `components/features/forecast/*` | `tests/components/features/forecast/*.test.tsx` |
| `next.config.mjs` | `tests/config/next-config-headers.test.ts` |
| `data/*.json` | `tests/data/*.test.ts` |

Suites with no single source file (cross-cutting regression suites) sit in the folder of
their dominant subject. Import via the `@/` alias, never `../`.

## Environments

- **Default** is `node` — used by every non-UI suite.
- **Component/UI tests** opt into jsdom per file:

  ```ts
  /** @jest-environment jsdom */
  ```

- `jest.env.ts` (a `setupFiles` entry) forces `NODE_ENV=test`. The ambient shell may set
  `NODE_ENV=production`, which would otherwise resolve React's production build and make
  `@testing-library/react` fail with "act(...) is not supported in production builds".
- `jest.setup.ts` (`setupFilesAfterEnv`) registers the `@testing-library/jest-dom` matchers.

## Suites

### Harmonic model and tide accuracy
- `lib/harmonic/harmonic-tide-core.test.ts` — Doodson arguments, declared-vs-computed
  speeds, Schureman nodal factors, "no constituent silently falls through to f=1, u=0".
- `lib/harmonic/ephemerides.test.ts` — delta-T and Julian-day handling.
- `lib/harmonic/harmonic-fit.test.ts` — least-squares recovery of amplitude/phase/offset.
- `lib/harmonic/harmonic-integration.test.ts` — real constituent database → prediction
  series → extremes → packaged/signed tile.
- `lib/harmonic/tide-accuracy-regression.test.ts` — pilot-station MAE ≤ 22 min,
  structural miss-rate < 2%.

### Forecast contract
- `lib/domain/forecast-provenance-regression.test.ts` — `/api/predict-tide` output shape,
  station provenance, quality score, and harmonic constant coverage.
- `lib/domain/forecast-degraded-regression.test.ts` — degraded fallback provenance, never
  calls `Math.random`.
- `lib/domain/tide-prediction.test.ts`, `lib/domain/lunar-phase.test.ts`,
  `lib/domain/weather-blend.test.ts` — domain modules.

### Comparison and calibration
- `lib/comparison/tide-comparison.test.ts`, `lib/comparison/tide-calibration-apply.test.ts`,
  `lib/comparison/calibrate-pilots.test.ts`, `lib/comparison/timing-accuracy-band.test.ts`.
- `lib/services/community-observations.test.ts` — community observation accumulation.
- `data/tide-validation-events.test.ts` — fixture integrity.

### Tiles and storage
- `lib/storage/tile-packaging.test.ts` — compression round-trip, checksum/integrity,
  manifest signing, delta patches.

### Services and domain
- `lib/services/line-service.test.ts`, `lib/services/worldtides-client.test.ts`,
  `lib/domain/thailand-time.test.ts`, `lib/domain/disaster-analysis.test.ts`, and the
  `lib/services/line/*` suites.

### Components
- `components/features/forecast/forecast-trust-strip.test.tsx` — first jsdom suite; the
  pattern to copy for further UI tests.

## Notes

- Suites that call time-dependent or network-dependent code must control the environment
  themselves: clear the relevant `process.env` keys and stub `global.fetch` (see
  `lib/domain/forecast-provenance-regression.test.ts` and `lib/domain/weather-blend.test.ts`).
  Do not rely on ambient API keys — a live key turns a deterministic test into a network test.
- Suites that mock a module by path must use the same specifier style as the code
  (`jest.mock("@/lib/services/line/client")`) — a relative mock path breaks when the suite moves.
- Suites that read a repo file must resolve it from the repo root
  (`join(process.cwd(), "next.config.mjs")`), not from `__dirname`.
