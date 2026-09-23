# MEGA Spec Coverage Snapshot

Date: 2025-10-11

This document captures the current alignment between the repository and the offline-first tide forecast specification. Use it to scope implementation work while preserving the existing UI baseline.

## 0) System Role & Objectives
- Status: ❌ Not implemented
- Notes: Tide computation still depends on remote APIs inside `lib/tide-service.ts`; no offline tile workflow or WASM compute core.

## 1) Core Objectives
| Requirement | Status | Notes / References |
|-------------|--------|--------------------|
| Harmonic + astronomical + nodal corrections with shallow constituents | ❌ | Placeholder harmonic synthesis in `lib/tide-service.ts` uses simplified logic and seeded examples; lacks astronomical arguments and nodal factors. |
| Offline-first PWA (Service Worker + IndexedDB) | ❌ | No service worker registration or IndexedDB tile cache present in `app` directory. |
| Low-bandwidth tile updates | ❌ | Data still fetched per request; no packaging pipeline in `scripts/`. |
| Field-usable UI | ⚠️ | `components/enhanced-location-selector.tsx` delivers rich UI but requires audit against accessibility and outdoor contrast needs. |
| On-device privacy | ⚠️ | Computations happen client-side but API fetches expose location; telemetry policy not defined. |

## 2) Feature Scope
- Location selection: ✅ `EnhancedLocationSelector` covers map search, popular locations, and GPS helpers.
- 48–72 hour chart & High/Low list: ⚠️ Chart placeholder via `components/tide-animation.tsx`; needs precise 10 min step series and event extraction.
- Slope & flow alerts: ❌ No derivative computations in `lib/tide-service.ts`.
- Datum/unit/timezone controls: ❌ Controls missing in UI and data model (see `TideData` type).
- Offline badge / tile management: ❌ Components absent.
- Confidence band: ❌ Graph data lacks error envelopes.
- Thai/English switch & formatting policy: ⚠️ Hard-coded Thai copy; no i18n framework for English fallback.

## 3) Data Sources & Licensing
- Status: ❌ No licensing matrix or attribution view. `FREE_APIS.md` documents API options but not licensing obligations.

## 4) Constituent Set
- Status: ❌ `lib/tide-service.ts` seeds limited synthetic constituents; manifest absent.

## 5) Time & Ephemerides
- Status: ⚠️ `calculateLunarPhase` handles Thai lunar calendar via precomputed JSON or astronomy-engine, but full astronomical argument pipeline and ΔT handling are missing.

## 6) Datums
- Status: ❌ No datum conversion tables or UI toggles.

## 7) Tile Packaging
- Status: ❌ No tile schema, manifest, or compression routines. `scripts/` folder focuses on lunar data, not tidal tiles.

## 8) Computation Core
- Status: ❌ No WASM module; all computations run in TypeScript with mocks. Performance targets unmet by default.

## 9) Calibration & QA
- Status: ❌ Calibration offsets and QA metrics not present. No RMSE/MAE reporting utilities.

## 10) Connectivity Modes
- Status: ❌ No install-size audit, offline fallbacks, or equilibrium tide mode.

## 11) UX/UI & Accessibility
- Status: ⚠️ UI includes many components (e.g., `components/network-optimization-stats.tsx`), but WCAG compliance, hi-contrast mode, and ARIA summaries need work.

## 12) Display & Rounding Policy
- Status: ⚠️ Formatting scattered across components; no centralized rounding helper or timezone conversion policy.

## 13) PWA Architecture & Storage
- Status: ❌ Service worker, IndexedDB wrappers, and eviction policies absent.

## 14) Security
- Status: ❌ No manifest signing or checksum verification.

## 15) Delta Updates
- Status: ❌ Update pipeline not started.

## 16) Privacy-Preserving Telemetry
- Status: ❌ Telemetry queue and consent UX not defined.

## 17) Feature Flags
- Status: ❌ No feature flag harness.

## 18) Testing & Acceptance
- Status: ⚠️ Some scripts (`scripts/test-lunar-integration.js`) cover lunar logic, but there are no unit tests for astronomical arguments or tide synthesis. No golden/property/field tests.

## 19) Copy Guide
- Status: ⚠️ Core warning text exists in parts of the UI but not standardized; offline/empty tile messaging missing.

## 20) Deliverables Checklist
- PWA bundle: ❌
- WASM core + docs: ❌
- Tile build scripts + docs: ❌
- Calibration/explorer guides: ❌
- License/privacy docs: ❌
- QA/Test reports: ❌

## 21) MUST/SHOULD Checklist Snapshot
- MUST items satisfied: 0 / 9
- SHOULD items satisfied: 0 / 4

## Immediate Recommendations
1. Define target architecture document covering WASM core, tile manifest, and offline caching boundaries.
2. Introduce service worker + IndexedDB scaffolding while keeping existing UI components intact.
3. Incrementally replace mocked tide calculations with modular harmonic engine (start with TypeScript prototype, then migrate to WASM).
