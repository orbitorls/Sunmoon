# Result C — components/ dedup clusters

Captured from subagent 4f2cded7 output (subagent profile could not write files).

## Cluster 1: Location selectors
| Component | Importers | Classification |
|-----------|-----------|----------------|
| `location-selector.tsx` | 0 | **dead** |
| `enhanced-location-selector.tsx` | 1: app/page.tsx:1 | **canonical** |
| `enhanced-location-selector.tsx.bak` | 0 | **delete** |
| `map-selector.tsx` | 1: enhanced-location-selector:56 | **duplicate** (used by canonical; has "use my location" button) |
| `map-selector-clean.tsx` | 0 | **dead** (lacks geolocation) |

Canonical: `enhanced-location-selector.tsx`. Delete: location-selector, .bak, map-selector-clean. Keep map-selector (used by canonical) or inline.

## Cluster 2: Tide/water-level graphs
| Component | Importers | Classification |
|-----------|-----------|----------------|
| `water-level-graph.tsx` | 0 | **dead** |
| `water-level-graph-v2.tsx` | 2: enhanced-location-selector:57, forecast-today-panel:21 | **canonical** |
| `tide-graph-advanced.tsx` | 0 | **dead** |
| `tide-animation-new.tsx` | 1: location-selector:54 (dead) | **dead** (has zoom/pan + smooth paths — port if needed) |
| `tide-status-hero.tsx` | 2: enhanced-location-selector:104, forecast-today-panel:20 | **keep** (status display, not a graph) |

Canonical: `water-level-graph-v2.tsx`. Delete: water-level-graph, tide-graph-advanced, tide-animation-new.

## Cluster 3: Loading/error states
| Component | Importers | Classification |
|-----------|-----------|----------------|
| `loading-state.tsx` | 0 | **dead** |
| `LoadingSkeletons.tsx` | 1: enhanced-location-selector:70 | **canonical** |
| `loading-error-handling.tsx` | 0 | **dead** (Context pattern) |
| `error-state.tsx` | 0 | **dead** |
| `enhanced-error-state.tsx` | 0 | **dead** |
| `error-boundary.tsx` | 0 | **dead** (consider adding to app/layout.tsx for app-level errors) |

Canonical: `LoadingSkeletons.tsx`. Delete the other 5.

## Cluster 4: Status dashboards
| Component | Importers | Classification |
|-----------|-----------|----------------|
| `system-dashboard.tsx` | 0 | **dead** |
| `system-status-dashboard.tsx` | 0 | **dead** |
| `api-status-dashboard.tsx` | 1: enhanced-location-selector:58 | **canonical** |

Canonical: `api-status-dashboard.tsx`. Delete the other 2.

## Cluster 5: Offline UI
| Component | Importers | Classification |
|-----------|-----------|----------------|
| `offline-indicator.tsx` | 0 | **dead** |
| `offline-ui.tsx` | 0 | **dead** (duplicates tile-management-panel) |

Both dead. Note: `tile-management-panel.tsx` is used by `app/tiles/page.tsx:1` — keep that.

## Cluster 6: Disaster panels (discovered)
- `disaster-alert.tsx` — 2 importers (canonical, full analysis)
- `RealTimeDisasterPanel.tsx` — 1 importer (HistoricalEventsPanel) — keep (different purpose: real-time polling)

## Cluster 7: Dead dashboard/panel components (discovered)
All 0 importers: `calibration-panel`, `controls-panel`, `confidence-bands-panel`, `confidence-indicator`, `field-testing-dashboard`, `network-optimization-stats`, `communication-hub`, `time-range-predictions`. **Delete all 8.**

## Dead component deletion list (24 files)
1. components/location-selector.tsx
2. components/enhanced-location-selector.tsx.bak
3. components/map-selector-clean.tsx
4. components/water-level-graph.tsx
5. components/tide-graph-advanced.tsx
6. components/tide-animation-new.tsx
7. components/loading-state.tsx
8. components/loading-error-handling.tsx
9. components/error-state.tsx
10. components/enhanced-error-state.tsx
11. components/error-boundary.tsx
12. components/system-dashboard.tsx
13. components/system-status-dashboard.tsx
14. components/offline-indicator.tsx
15. components/offline-ui.tsx
16. components/calibration-panel.tsx
17. components/controls-panel.tsx
18. components/confidence-bands-panel.tsx
19. components/confidence-indicator.tsx
20. components/field-testing-dashboard.tsx
21. components/network-optimization-stats.tsx
22. components/communication-hub.tsx
23. components/time-range-predictions.tsx
24. (map-selector.tsx — keep or inline; not a deletion candidate yet)

## Risks
- No dynamic imports found (all static ES6).
- Dead components import soon-to-be-dead lib modules (calibration-system, confidence-bands, network-optimization, data-compression, sunmoon-system, retry-logic) — delete components FIRST, then those lib modules become dead.
- tide-animation-new has zoom/pan + smooth path interpolation not in v2 — port if desired before deletion.
- error-boundary could be useful at app/layout.tsx level — consider repurposing before deletion.

## Recommended parent action
P0: Delete 23 dead components + 1 .bak (24 files). P1: Decide map-selector inline-vs-keep. P2: Consider error-boundary at app root. P3: Port zoom/pan from tide-animation-new if needed. P4: Cross-reference lib modules freed by these deletions.
