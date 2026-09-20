/**
 * Storage layer — shared core.
 *
 * Sunmoon has three storage tiers with deliberately different backends:
 *
 *   - offline-storage : localStorage-backed request cache (tide/weather/location)
 *   - indexed-db      : IndexedDB-backed tile payload blobs (gzip, LRU by access count)
 *   - tile-storage    : IndexedDB tile metadata + raw payload buffers (age + quota eviction)
 *
 * They are NOT merged into a single store: they hold different record shapes,
 * live in different IndexedDB databases (`SunmoonTileDB` vs `SunmoonTileCache`),
 * and persist different compression formats (`gzip` vs zlib `deflate`).
 * Unifying the compression helpers would make already-persisted payloads
 * unreadable, so only the format-agnostic helpers below are shared.
 */

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

/**
 * Format a byte count as a human-readable string (1024-based).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${SIZE_UNITS[i]}`;
}

/**
 * Percentage of bytes saved by compression (0–100).
 */
export function compressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return ((original - compressed) / original) * 100;
}

type BinaryLike = Uint8Array | ArrayBuffer | SharedArrayBuffer;

/**
 * Lowercase hex SHA-256 of a binary payload.
 */
export async function sha256Hex(data: BinaryLike): Promise<string> {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  const hash = await crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
