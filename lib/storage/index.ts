/**
 * Storage layer — thin barrel.
 *
 * Covers three distinct storage tiers plus the format-agnostic helpers they share:
 *   - offline-storage : localStorage-backed request cache (tide/weather/location)
 *   - indexed-db      : IndexedDB-backed tile payload store (compressed blobs)
 *   - tile-storage    : tile metadata + constituent persistence on top of IndexedDB
 *   - core            : shared helpers (byte formatting, SHA-256, compression ratio)
 *
 * The three stores are intentionally NOT merged — they serve different layers and
 * persist different compression formats (see ./core.ts). Callers may keep
 * importing the individual modules; this barrel is a convenience for consumers
 * that want one import surface.
 */

export * from "./core";
export * from "./offline-storage";
export * from "./tile-storage";
// indexed-db exports a `TileData` type that collides with tile-storage's;
// tile-storage's wins here and indexed-db's remains at "@/lib/storage/indexed-db".
export type { JsonValue, StorageStats } from "./indexed-db";
export { IndexedDBManager, indexedDB, TileStorage } from "./indexed-db";
