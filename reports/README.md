# reports/

Output directory for tide validation and performance evidence.

## Tracked (committed, kept as evidence)

- `perf/bench-tide-baseline.json`, `perf/bench-tide-after-ephemeris-hoist.json` — performance
  baselines referenced by `docs/architecture.md`. Regenerate with `pnpm exec tsx scripts/perf/bench-tide.ts`.

## Not tracked (gitignored, regenerate as needed)

- `tide-comparison-<date>.{json,md}` — output of `pnpm compare:tides`. These are per-run analysis
  artifacts, not source; `.gitignore` ignores `/reports/tide-comparison-*`. The files already on
  disk are kept locally but are no longer committed.

## Convention

A report belongs in git only if a document references it as a baseline to compare against.
Everything that is the output of a single run stays local.
