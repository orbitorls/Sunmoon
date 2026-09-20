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
| `pnpm lint` | `next lint` |
| `pnpm build` | `next build` |

A change is only "done" when `typecheck`, `lint`, `test` and `build` are all green.

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
- `harmonic-tide-core.test.ts` — Doodson arguments, declared-vs-computed speeds, Schureman
  nodal factors, "no constituent silently falls through to f=1, u=0".
- `ephemerides.test.ts` — delta-T and Julian-day handling.
- `harmonic-fit.test.ts` — least-squares recovery of amplitude/phase/offset.
- `harmonic-integration.test.ts` — real constituent database → prediction series → extremes →
  packaged/signed tile.
- `lib/tide-accuracy-regression.test.ts` — pilot-station MAE ≤ 22 min, structural miss-rate < 2%.

### Forecast contract
- `forecast-provenance-regression.test.ts` — `/api/predict-tide` output shape, station
  provenance, quality score, and harmonic constant coverage.
- `forecast-degraded-regression.test.ts` — degraded fallback provenance, never calls `Math.random`.
- `lib/domain/tide-prediction.test.ts`, `lib/domain/lunar-phase.test.ts`,
  `lib/domain/weather-blend.test.ts` — domain modules.

### Comparison and calibration
- `tide-comparison.test.ts`, `tide-calibration-apply.test.ts`, `community-observations.test.ts`,
  `lib/timing-accuracy-band.test.ts`, `tide-validation-events.test.ts`,
  `scripts/calibrate-pilots.test.ts`.

### Tiles and storage
- `tile-packaging.test.ts` — compression round-trip, checksum/integrity, manifest signing,
  delta patches.

### Services
- `services/line-service.test.ts`, `worldtides-client.test.ts`, `thailand-time.test.ts`,
  `disaster-analysis.test.ts`.

### Components
- `components/forecast-trust-strip.test.tsx` — first jsdom suite; the pattern to copy for
  further UI tests (see the W4 wave in the architecture plan).

## Notes

- Suites that call time-dependent or network-dependent code must control the environment
  themselves: clear the relevant `process.env` keys and stub `global.fetch` (see
  `forecast-provenance-regression.test.ts` and `lib/domain/weather-blend.test.ts`). Do not
  rely on ambient API keys — a live key turns a deterministic test into a network test.
- `lib/harmonic/constituents.ts` logs to the console on import; that noise is scheduled for
  removal in the infra-cleanup wave.
