# Offline-First Tide Architecture Blueprint

> **Status: historical / never implemented.** This is an aspirational design from
> 2025-10-11. The `lib/offline-first/` module it describes was never built and has
> been deleted, and the WASM compute core does not exist. Paths below are stale.
> See `docs/architecture.md` for the system as built.

Date: 2025-10-11

Objective: Define the modules, data contracts, and runtime flow required to implement the MEGA prompt within the current Next.js codebase while keeping the existing UI components (`EnhancedLocationSelector`, `WaterLevelGraph`, etc.) as the primary presentation layer.

## 1. Runtime Layers
1. **Presentation (existing):** React components render tide/weather data and manage user interaction.
2. **Domain Controller (new):** `hooks/use-optimized-data` will call orchestration helpers in `lib/offline-first/` to load tiles, run predictions, and expose formatted series to the UI.
3. **Computation Core (new):** WASM module written in Rust/C++ handles harmonic synthesis; JS fallback resides in `lib/offline-first/fallback`.
4. **Persistence (new):** IndexedDB storage for tile packs, manifests, calibration offsets, and telemetry queue.
5. **Service Worker (new):** Precache core shell, runtime-cache tile bundles, verify signatures, and manage delta updates.

## 2. Module Map
```
lib/
  offline-first/
    index.ts            // Facade for hooks and components
    manifest.ts         // Schema + validation for signed manifests
    tiles.ts            // Tile pack loader, checksum verifier
    storage.ts          // IndexedDB interactions (LRU, chunking)
    worker-client.ts    // Message channel between SW and app
    compute/
      wasm-bridge.ts    // WASM init & typed bindings
      wasm-types.d.ts   // Generated interfaces
      fallback.ts       // Pure TS backup engine
    updates.ts          // Delta patch application (bsdiff/rollsum)
    datums.ts           // Datum conversion helpers with uncertainty metadata
    telemetry.ts        // Privacy-preserving metrics queue
```

## 3. Data Contracts

### 3.1 Manifest (signed JSON)
```ts
export interface TileManifest {
  version: string;
  issuedAt: string;              // ISO timestamp UTC
  validUntil?: string;
  ephemerides: {
    id: "DE430";
    deltaTSource: string;
    leapSecondsVersion: string;
  };
  tiles: TileMeta[];
  signature: string;             // Base64 detached signature
}

export interface TileMeta {
  tileId: string;
  model: "FES2022" | "TPXO9" | string;
  datum: "MSL" | "MLLW" | "LAT";
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  centroid: { lat: number; lon: number };
  tzHint: string;                 // IANA TZ name
  updatedAt: string;              // ISO timestamp
  version: string;                // Tile-level semantic version
  checksum: string;               // Hex SHA-256 of compressed payload
  sizeCompressed: number;         // Bytes (post compression)
  deltaAvailable?: boolean;
}
```

### 3.2 Tile Payload (compress with Brotli/Zstd)
```ts
export interface TilePayload {
  tileId: string;
  constituents: Constituent[];
  minorRules?: MinorRule[];
  localCalibration?: LocalCalibration[];
  datumTransforms?: DatumTransform[];
  stats?: ModelStats;
}

export interface Constituent {
  code: string;                   // e.g., "M2"
  amplitudeM: number;             // meters (float16 stored, float32 in JS)
  phaseDeg: number;               // degrees (float16 stored, float32 in JS)
  speedDegHr: number;             // angular speed
}

export interface MinorRule {
  target: string;                 // e.g., "MS4"
  formula: "inference" | "ratio";
  coefficients: number[];         // per reference constituent
  references: string[];
  phaseOffsetDeg: number;
}

export interface LocalCalibration {
  locationId: string;             // Station or custom id
  heightOffsetM?: number;
  phaseOffsetDeg?: number;
  validFrom?: string;
  validTo?: string;
  source: string;                 // licensing reference
}

export interface DatumTransform {
  from: "MSL" | "MLLW" | "LAT" | string;
  to: "MSL" | "MLLW" | "LAT" | string;
  offsetM: number;
  uncertaintyM: number;
}

export interface ModelStats {
  rmseHigh: number;
  rmseLow: number;
  maeHigh: number;
  maeLow: number;
  skillScore: number;
  sampleSpanDays: number;
}
```

### 3.3 Prediction Options
```ts
export interface PredictionOptions {
  stepMinutes: number;            // ≤ 10
  startTimeUtc: string;
  endTimeUtc: string;
  datum: "MSL" | "MLLW" | "LAT";
  unit: "m" | "ft";
  includeConfidence: boolean;
  includeSlope: boolean;
  featureFlags?: Record<string, boolean>;
}
```

## 4. IndexedDB Layout
Database name: `seapalo-offline`

Object stores:
1. `tiles` – key: `tileId@version`, value: compressed ArrayBuffer chunks
2. `tileChunks` – key: `${tileId}@${chunkIndex}`, value: ArrayBuffer
3. `manifests` – key: `version`
4. `calibration` – key: `locationId`
5. `telemetry` – key: auto-increment, value: queued metric payloads

Each store records `updatedAt` metadata to support LRU eviction. `storage.ts` will expose helper methods:
```ts
async function storeTile(tile: TilePayload, rawChunks: Uint8Array[]): Promise<void>;
async function getTile(tileId: string): Promise<TilePayload | null>;
async function evictTile(tileId: string): Promise<void>;
async function listTiles(): Promise<TileMeta[]>;
```

## 5. Service Worker Responsibilities
- Precache core shell (`app/page.tsx`, global CSS, fonts).
- Runtime cache tile requests (`/tiles/{id}.bin`) with integrity checks.
- Manage background sync tasks:
  - Fetch latest manifest.
  - Verify signature using embedded public key (WebCrypto).
  - Download new/patch tile archives, stream to IndexedDB via `postMessage` + `ReadableStream`.
- Detect failure and trigger rollback (retain previous `tileId@version` until verification passes).
- Surface connectivity and update status to UI via `MessageChannel`.

## 6. Computation Flow
1. UI calls `useOptimizedData` → `offline-first/index.ts`.
2. Determine `tileId` by location (`tiles.ts` handles spatial lookup or nearest neighbor).
3. Ensure tile is cached; if not, request service worker to download (online) or return equilibrium fallback (offline).
4. Load WASM module once per session using `wasm-bridge.ts`.
5. Prepare astronomical arguments buffer (`computeAstronomy`), cache results in memory keyed by day block.
6. Run `predictLevel` returning:
   - time series (ArrayBuffer) for 48–72h
   - derived slope array
   - confidence band (upper/lower)
   - metadata (flags for missing constituents)
7. Post-process in JS for presentation (unit conversion, timezone shift, rounding policy).
8. Persist summary (last updated timestamp, offline badge) to `storage.ts`.

## 7. Update & Security Workflow
1. Manifest downloaded → `manifest.ts` validates schema.
2. Signature verified using Ed25519 RSA-PSS (determine at implementation).
3. For each tile diff:
   - If `deltaAvailable`, fetch `.patch` and apply via WASM/JS `updates.ts`.
   - Validate checksum.
   - Store new version only after checksum passes.
4. Keep previous version until new tile confirmed.
5. Record telemetry metric (`updatesApplied`) without location details.

## 8. Integration Touchpoints
- `EnhancedLocationSelector`:
  - Replace direct API call with hook that requests offline-first prediction.
  - UI retains existing layout; new controls (datum, unit, offline badge) added later but must follow current styling.
- `NetworkOptimizationStats`:
  - Consume telemetry metrics for compression savings and cache sizes.
- `CommunicationHub` / warnings:
  - Display `Not for Navigation` copy sourced from central constants file.

## 9. Incremental Delivery Strategy
1. Implement storage + service worker scaffolding with fake tiles for smoke testing.
2. Build TypeScript harmonic prototype using manifest schema to validate data flow.
3. Port prototype to WASM for performance and bundle size compliance.
4. Wire UI to new orchestration layer, ensuring offline badge and confidence bands appear once data is ready.

## 10. Open Questions
- Licensing constraints for distributing harmonic constituents (need legal review).
- Choice of signature algorithm and key storage (embedded public key vs. remote fetch on first install).
- Packaging pipeline location (likely new `tools/tiles/` workspace).
- Browser support matrix for 16-bit floats (consider `@petamoriken/float16` polyfill if needed).
