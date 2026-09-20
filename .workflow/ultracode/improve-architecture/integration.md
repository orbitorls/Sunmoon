# Integration — Improve Codebase Architecture

## Packet completeness
- A (lib tide-engine): complete, evidence-based. ✓
- B (lib services + taxonomy): re-run in parent (subagent returned empty); complete via direct grep. ✓
- C (components): complete, evidence-based. ✓
- D (hygiene + tests + config): complete, evidence-based. ✓

## Consistency reconciliation
- A's canonical-survivor picks (harmonic-tide-core, forecast-facade, tide-calibration-apply, tide-comparison) are consistent with B's taxonomy proposal (tide/ bucket, domain/ facade, services/ for IO).
- A flagged `calibration-system.ts` and `confidence-bands.ts` as "canonical-ish" (only used by dead components). C confirmed those components (calibration-panel, confidence-bands-panel) are dead. **Reconciled**: these lib modules become dead AFTER component deletion — sequence component deletion first.
- B flagged `retry-logic`, `network-optimization`, `sunmoon-system` as dead-after-component-deletion. C confirmed their component consumers are dead. **Reconciled**: same sequencing.
- B discovered the two-LINE-webhook duplication; A/C did not overlap. No conflict.

## Spot-check verification (per plan)
- Dead claim `lib/wasm-tide-core.ts`, `lib/tide-calculation-service.ts`, `lib/slope-alerts.ts`: grep confirms zero importers (only a comment reference in harmonic-engine.ts:12). ✓
- Canonical claim `lib/tide-service.ts`: 33 importers confirmed. ✓
- Dead component claim (loading-state, error-state, enhanced-error-state, error-boundary, system-dashboard, offline-indicator, calibration-panel, controls-panel): zero `@/components/...` importers confirmed. ✓

## No-edits check
Read-only profile for subagents; parent session made only grep/read/write-to-workflow-dir. No source file modified. ✓

## Cross-packet dependency sequencing (critical)
The deletions have a dependency order. Deleting in the wrong order leaves dangling imports.

1. **Hygiene** (independent) — safe first.
2. **Dead components** (independent of lib) — safe second; frees lib modules.
3. **Lib modules freed by component deletion** — re-verify zero importers after step 2, then delete.
4. **Harmonic engine consolidation** — migrate importers first, then delete duplicates.
5. **Folder reorganization** — mechanical moves with import rewrites; do last, after the graph is clean.

## Open questions for user (before execution phase)
1. Two LINE webhooks (`app/api/webhook/line/` vs `app/api/line/webhook/`) — which is canonical? This affects line-service vs lib/line/* consolidation.
2. `harmonic-prediction.ts:predictWaterLevel` has a discontinuity bug (tau wrapping, lines 696-702) and may be called by `sunmoon-system.ts`. Fix or deprecate?
3. `error-boundary.tsx` is dead but could be useful at app root — repurpose or delete?
4. `tide-animation-new.tsx` has zoom/pan + smooth paths not in v2 — port features before deletion?
5. `lib/services/forecast.ts` vs `lib/domain/forecast-facade.ts` — confirm they are intentionally different layers (IO vs domain); rename forecast.ts for clarity?
