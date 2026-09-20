# Packet C — components/ dedup clusters

You are working in the same repo as other agents. **Read-only. Do not edit any file.**

Repo root: `D:\Sunmoon`

## Task
Map the overlapping component clusters in `components/` (excluding the
shadcn `components/ui/*` primitives, which are out of scope). For each cluster,
identify the canonical survivor, duplicates, and dead components, with import
evidence.

## Clusters in scope
1. Location selectors: `location-selector.tsx`, `enhanced-location-selector.tsx`,
   `enhanced-location-selector.tsx.bak`, `map-selector.tsx`,
   `map-selector-clean.tsx`.
2. Tide/water-level graphs: `water-level-graph.tsx`, `water-level-graph-v2.tsx`,
   `tide-graph-advanced.tsx`, `tide-animation-new.tsx`, `tide-status-hero.tsx`.
3. Loading/error states: `loading-state.tsx`, `LoadingSkeletons.tsx`,
   `loading-error-handling.tsx`, `error-state.tsx`, `enhanced-error-state.tsx`,
   `error-boundary.tsx`.
4. Status dashboards: `system-dashboard.tsx`, `system-status-dashboard.tsx`,
   `api-status-dashboard.tsx`.
5. Offline UI: `offline-indicator.tsx`, `offline-ui.tsx`.
6. Any other component-level duplication you discover (flag it).

## Do
- For each component: list its default/named exports and a one-line purpose.
- For each component: search the repo for importers (exclude self and `.bak`).
  Report importer count + top import sites (path + line). Check `app/page.tsx`,
  `app/layout.tsx`, `app/offline/page.tsx`, `app/tiles/page.tsx`, and any
  component-to-component imports.
- Classify each as **canonical** / **duplicate** / **dead** / **unresolved**.
- For each cluster, name the single canonical survivor and the merge/delete
  candidates. Note any unique feature present only in a duplicate that must be
  preserved before deletion (merge note).
- Flag `.bak` files explicitly as delete candidates (no import analysis needed,
  but confirm they are not referenced).
- Note components that import soon-to-be-consolidated `lib/` modules (cross-
  reference is fine to mention, but packet A/B own the lib analysis).

## Do not
- Edit, move, rename, or delete any file.
- Audit `components/ui/*` shadcn primitives.
- Audit lib/ or hygiene/config.

## Expected output (write to `D:\Sunmoon\.workflow\ultracode\improve-architecture\results\result-C.md`)
- Per-cluster table: component | exports | purpose | importers | classification | merge-note.
- Canonical survivor per cluster.
- Dead-component deletion list (with `.bak` files).
- Risks (e.g. dynamic component imports, runtime-only usage, CSS dependencies).
- Recommended parent action, priority-ordered.
- Cite paths + line numbers.
