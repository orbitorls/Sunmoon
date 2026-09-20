# Final Report — Improve Codebase Architecture (Audit & Plan)

**Engagement**: read-only audit + plan. No code was changed.
**Mode**: delegated (4 parallel read-only explorer agents; packet B re-run in parent after empty return).
**Artifacts**: `.workflow/ultracode/improve-architecture/` (plan, orchestration, state, packets, results, integration).

---

## Executive summary

The Sunmoon codebase has a clear domain model (CONTEXT.md) and a partial folder migration already in flight (`lib/domain/`, `lib/services/`, `lib/offline-first/`, `lib/compression/`, `lib/line/`), but ~60 flat `lib/*.ts` files remain alongside them with heavy duplication, and `components/` has accumulated many dead variants. The audit found **~50 dead/duplicate files** safe to remove in a sequenced pass, plus a clean target taxonomy to finish the migration.

No changes were made. This is the plan for you to approve before execution.

---

## Findings by area

### A. lib/ tide-engine duplication
- **Canonical engine**: `lib/harmonic-tide-core.ts` (correct continuous Doodson argument).
- **Duplicates**: `lib/harmonic-engine.ts` (7 importers, all migratable), `lib/harmonic-prediction.ts` (12 importers; has a tau-wrapping discontinuity bug at lines 696-702), `lib/constituents.ts` (1 importer, the duplicate engine), `lib/tide-prediction-api.ts` (1 importer: `api-handlers.ts`, itself dead).
- **Dead (0 importers)**: `lib/wasm-tide-core.ts`, `lib/tide-calculation-service.ts`, `lib/regional-calibration.ts`, `lib/slope-alerts.ts`.
- **Canonical facade**: `lib/domain/forecast-facade.ts:getForecast` — the single public surface per CONTEXT.md. Behind it: `domain/tide-prediction` → `station-harmonic-model` → `harmonic-tide-core` + `ephemerides`.
- **Canonical calibration**: `tide-calibration-apply.ts` + `tide-comparison.ts`. `calibration-system.ts` is a parallel impl only used by the dead `calibration-panel.tsx`.

### B. lib/ data services + organizational overlap
- **Live data services**: `thaiwater-service`, `worldtides-client`, `historical-data-service`, `disaster-analysis`, `disaster-data-service`, `elevation-service`, `community-observations`.
- **Dead data services**: `stormglass-example.ts`, `fes2022-generator.ts`. `hydro-service.ts` is test-mocked only (no production importer).
- **`services/forecast.ts` vs `domain/forecast-facade.ts` are NOT duplicates**: forecast.ts is an async OpenWeather fetcher (IO layer); forecast-facade is sync domain composition. Both live. Rename forecast.ts for clarity.
- **`services/line-service.ts` vs `lib/line/*`**: orchestrator over primitives — fine. BUT two LINE webhook routes exist (`app/api/webhook/line/` vs `app/api/line/webhook/`) — parallel implementations of the same webhook; reconcile.
- **Dead flat infra (0 importers)**: `offline-manager`, `pwa-manifest`, `security-manager`, `query-cache`, `center-gateway`, `api-handlers`, `field-validation`, `accessibility`, `responsive`, `device-optimizer`.
- **Dead-after-component-deletion**: `retry-logic`, `network-optimization`, `sunmoon-system` (only used by dead components).
- **Target taxonomy proposed**: `lib/{domain, tide, services, offline-first, compression, line, infra/{cache,storage,observability,security,pwa}, ui}` — see result-B.md for full file-to-bucket mapping.

### C. components/ dedup
- **24 dead component files** (23 components + 1 .bak) with zero importers, across 7 clusters: location selectors, tide graphs, loading/error states, status dashboards, offline UI, disaster panels (partial), and a discovered cluster of 8 dead dashboard/panel components.
- **Canonical survivors**: `enhanced-location-selector`, `water-level-graph-v2`, `LoadingSkeletons`, `api-status-dashboard`, `disaster-alert` + `RealTimeDisasterPanel` (different purposes).
- All imports are static ES6 (no dynamic imports) — deletion is mechanically safe.

### D. hygiene + tests + config
- **12 hygiene targets**: 2 zero-byte files, 2 `.bak` files, 7 stray root test scripts, 1 gitignore (`lint-report.txt`).
- **Test coverage**: 33% of lib modules have tests (23/70); 47 untested. Legacy JS tests (`*-test.js`) in tests/ are NOT run by Jest (testRegex mismatch).
- **Config constraints for moves**: `@/*` → repo root (tsconfig/webpack/jest all agree); Jest roots=`tests/`; shadcn aliases fixed (`@/components`, `@/lib/utils`); Tailwind scans `pages/components/app/src`; `/api/tiles/` route path must remain.
- **Missing .gitignore entries**: `*.bak`, `lint-report.txt`, `test-*.{js,mjs,ps1,sh}`.

---

## Sequenced execution plan (safest-first, with approval gates)

### Wave 1 — Hygiene (low risk, no approval gate needed beyond "go")
1. Delete 2 zero-byte files: `STATUS_REPORT.md`, `test-location-parsing.js`.
2. Delete 2 `.bak` files: `components/enhanced-location-selector.tsx.bak`, `lib/services/line-service.ts.bak`.
3. Delete 7 stray root test scripts: `smoke-test.js`, `test-api.ps1`, `test-api.sh`, `test-compact-simple.mjs`, `test-current-vs-forecast.js`, `test-harmonic-verification.js`, `test-endpoint.ps1`.
4. Add `.gitignore` entries: `*.bak`, `lint-report.txt`, `test-*.js`, `test-*.mjs`, `test-*.ps1`, `test-*.sh`.
5. Delete `lint-report.txt` (regenerable).
- **Verify**: `npm run lint` still works; `npm test` still works.

### Wave 2 — Dead components (low risk)
6. Delete 23 dead components + confirm `map-selector-clean.tsx` dead → delete (24 files). See result-C.md for the exact list.
- **Verify**: `npm run build` + `npm test` pass. No `@/components/...` import breaks (verified zero importers).

### Wave 3 — Dead lib modules (low risk after Wave 2)
7. Delete zero-importer lib modules: `wasm-tide-core`, `tide-calculation-service`, `regional-calibration`, `slope-alerts`, `stormglass-example`, `fes2022-generator`, `offline-manager`, `pwa-manifest`, `security-manager`, `query-cache`, `center-gateway`, `api-handlers`, `field-validation`, `accessibility`, `responsive`, `device-optimizer`.
8. Re-verify and delete modules freed by Wave 2: `calibration-system`, `confidence-bands`, `retry-logic`, `network-optimization`, `sunmoon-system` (re-grep first).
9. Delete `tide-prediction-api.ts` (only importer `api-handlers` deleted in step 7).
10. Handle `hydro-service.ts`: update the test mock in `tests/forecast-degraded-regression.test.ts` then delete (or keep if you want a real hydro fetcher — currently unused in production).
- **Verify**: `npm run build` + `npm test` + typecheck.

### Wave 4 — Harmonic engine consolidation (medium risk, needs migration)
11. Migrate `lib/confidence-bands.ts` and `lib/slope-alerts.ts` (already deleted in step 7? re-check) from `harmonic-engine:predictTideLevel` → `harmonic-tide-core:predictTideLevel`. (If slope-alerts was deleted, only confidence-bands remains.)
12. Migrate 3 scripts (`test-tide-accuracy.ts`, `test-regional-calibration.ts`, `detailed-bangkok-test.ts`) from `harmonic-engine` → `harmonic-tide-core`.
13. Delete `lib/harmonic-engine.ts` + `lib/constituents.ts`.
14. **Decision needed**: fix or deprecate `harmonic-prediction.ts:predictWaterLevel` (discontinuity bug). Migrate `sunmoon-system.ts` if live. Consolidate `TIDAL_CONSTITUENTS` into `harmonic-tide-core:CONSTITUENTS_DATABASE`. Then delete `harmonic-prediction.ts` (12 importers to migrate first).
- **APPROVAL GATE**: this changes the prediction path. Run `npm test` + tide-accuracy regression tests + compare-external-tides script.

### Wave 5 — LINE webhook reconciliation (medium risk, needs decision)
15. **Decision needed**: pick `app/api/webhook/line/` (uses `services/line-service`) OR `app/api/line/webhook/` (uses `lib/line/*` directly). Delete the other + its exclusive lib path.
- **APPROVAL GATE**: touches a live webhook endpoint.

### Wave 6 — Folder reorganization (mechanical, high churn but low logic risk)
16. Move flat lib files into the target taxonomy (result-B.md): `domain/` (tide-comparison, tide-calibration-apply, water-level-comparison, timing-accuracy-band, thailand-time, distance-utils), `tide/` (harmonic-tide-core, harmonic-fit, station-harmonic-model, ephemerides), `services/` (existing + thaiwater, worldtrides, historical, disaster-*, elevation, community-observations), `infra/{cache,storage,observability,security,pwa}`, `ui/` (utils, controls).
17. Rewrite all `@/lib/...` import paths to match new locations.
18. Rename `services/forecast.ts` → `services/openweather-fetcher.ts` (clarify it's not the facade).
- **Verify**: `npm run build` + `npm test` + typecheck. Update `components.json` if `lib/utils` moves (shadcn alias).

### Wave 7 — Documentation
19. Update `CONTEXT.md` to explicitly name `lib/domain/forecast-facade.ts:getForecast` as the Forecast Facade and document the canonical prediction path.
20. Document the `tide/` engine internals as "behind the facade".

---

## Approval gates (require explicit user OK before executing)
- **Wave 4** (harmonic consolidation): changes the prediction path.
- **Wave 5** (LINE webhook): touches a live endpoint.
- **Wave 6** (folder reorg): high-churn import rewrite across the repo.
- Any deletion beyond the "0 importers, verified" lists.

## Open questions (need your input before execution)
1. Which LINE webhook is canonical: `app/api/webhook/line/` or `app/api/line/webhook/`?
2. `harmonic-prediction.ts:predictWaterLevel` discontinuity bug — fix or deprecate?
3. `error-boundary.tsx` — repurpose at app root, or delete with the other dead components?
4. `tide-animation-new.tsx` zoom/pan + smooth paths — port to v2 before deletion, or drop?
5. `hydro-service.ts` — keep as a real fetcher (currently production-unused) or delete with the test mock?
6. `services/forecast.ts` rename to `openweather-fetcher.ts` — OK?

## Skipped checks
None. All four packets returned evidence; spot-checks (3 dead + 3 canonical claims) passed.

## Remaining risk
- Waves 1-3 are low risk (verified dead code). Waves 4-6 carry real risk and are gated.
- Test coverage is only 33% — the accuracy regression tests (`tests/lib/tide-accuracy-regression.test.ts`, `tests/forecast-degraded-regression.test.ts`) are the key safety net for Wave 4; run them.
- No CI is configured (no `.github/workflows`) — verification relies on local `npm test` + `npm run build`.
