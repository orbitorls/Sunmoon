# Unify the Offline Storage Seam Implementation Plan — 2026-07-29

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate scattered IndexedDB logic into one deep `lib/storage/core.ts` seam with thin `tile-adapter.ts` and `offline-adapter.ts` wrappers.

**Architecture:** `lib/storage/core.ts` owns the generic IndexedDB lifecycle, record CRUD, compression, chunking, and LRU eviction; `lib/storage/tile-adapter.ts` and `lib/storage/offline-adapter.ts` translate domain records into the generic format. `lib/tile-storage.ts` and `lib/indexed-db.ts` become compatibility shims.

**Tech Stack:** TypeScript, Next.js, IndexedDB, `pako`, `CompressionStream`, ts-jest.

---

### Task 1: Storage Core

**Files:**
- Create: `lib/storage/core.ts`
- Modify: `lib/tile-storage.ts:99-440` (future delegation)
- Test: `tests/lib/storage/core.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/storage/core.test.ts
import { StorageCore } from '@/lib/storage/core';

describe('StorageCore', () => {
  it('stores and retrieves a record with metadata', async () => {
    const storage = new StorageCore('SunmoonCore', 'records');
    const record = { key: 'test-1', metadata: { name: 'foo' }, payload: new Uint8Array([1, 2, 3]) };
    await storage.putRecord(record.key, record.metadata, record.payload);
    const loaded = await storage.getRecord<{ name: string }>(record.key);
    expect(loaded).not.toBeNull();
    expect(loaded?.metadata).toEqual({ name: 'foo' });
    expect(Array.from(loaded!.payload)).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/storage/core.test.ts -t "stores and retrieves a record with metadata"`
Expected: FAIL with `Cannot find module '@lib/storage/core'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/storage/core.ts
const DB_NAME = 'SunmoonStorage';
const DB_VERSION = 1;
const DEFAULT_STORE = 'records';
const MAX_RECORDS = 100;
const MAX_STORAGE_MB = 100;

export interface StoredRecord<TMetadata = unknown> {
  key: string;
  metadata: TMetadata;
  payload: Uint8Array;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  size: number;
}

export class StorageCore {
  private db: IDBDatabase | null = null;
  private storeName: string;
  private memory = new Map<string, StoredRecord>();

  constructor(private dbName = DB_NAME, storeName = DEFAULT_STORE) {
    this.storeName = storeName;
  }

  async init(): Promise<void> {
    if (this.db || this.memory.size > 0) return;
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async putRecord<TMetadata>(key: string, metadata: TMetadata, payload: Uint8Array): Promise<void> {
    await this.init();
    const now = Date.now();
    const record: StoredRecord<TMetadata> = {
      key,
      metadata,
      payload,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      size: payload.byteLength,
    };

    if (this.db) {
      await this.evictIfNeeded(payload.byteLength);
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    this.memory.set(key, record as StoredRecord);
  }

  async getRecord<TMetadata>(key: string): Promise<StoredRecord<TMetadata> | null> {
    await this.init();
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => {
          const record = request.result as StoredRecord<TMetadata> | undefined;
          if (record) {
            record.lastAccessedAt = Date.now();
            record.accessCount++;
            store.put(record);
          }
          resolve(record ?? null);
        };
        request.onerror = () => reject(request.error);
      });
    }
    return (this.memory.get(key) as StoredRecord<TMetadata> | undefined) ?? null;
  }

  async deleteRecord(key: string): Promise<void> {
    await this.init();
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const request = transaction.objectStore(this.storeName).delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    this.memory.delete(key);
  }

  async getAllRecords<TMetadata>(): Promise<StoredRecord<TMetadata>[]> {
    await this.init();
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const request = transaction.objectStore(this.storeName).getAll();
        request.onsuccess = () => resolve(request.result as StoredRecord<TMetadata>[]);
        request.onerror = () => reject(request.error);
      });
    }
    return Array.from(this.memory.values()) as StoredRecord<TMetadata>[];
  }

  private async evictIfNeeded(newBytes: number): Promise<void> {
    const records = await this.getAllRecords();
    const total = records.reduce((sum, r) => sum + r.size, 0) + newBytes;
    const maxBytes = MAX_STORAGE_MB * 1024 * 1024;
    if (records.length < MAX_RECORDS && total <= maxBytes) return;

    const sorted = records.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
    let freed = 0;
    for (const record of sorted) {
      if (records.length - freed <= MAX_RECORDS * 0.9 && total - freed <= maxBytes * 0.9) break;
      await this.deleteRecord(record.key);
      freed += record.size;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/storage/core.test.ts -t "stores and retrieves a record with metadata"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/storage/core.ts tests/lib/storage/core.test.ts
git commit -m "2026-07-29: add unified IndexedDB storage core"
```

---

### Task 2: Chunking and Compression

**Files:**
- Create: `lib/storage/compress.ts`
- Modify: `lib/storage/core.ts` (import compress helpers)
- Test: `tests/lib/storage/compress.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/storage/compress.test.ts
import { compress, decompress, chunk, unchunk } from '@/lib/storage/compress';

describe('compress', () => {
  it('round-trips a payload through chunking and compression', async () => {
    const original = new Uint8Array(new Array(1024).fill(0).map((_, i) => i % 256));
    const chunks = chunk(original, 256);
    const compressed = await Promise.all(chunks.map((c) => compress(c)));
    const restored = unchunk(await Promise.all(compressed.map((c) => decompress(c))));
    expect(restored).toEqual(original);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/storage/compress.test.ts -t "round-trips a payload through chunking and compression"`
Expected: FAIL with `Cannot find module '@lib/storage/compress'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/storage/compress.ts
import pako from 'pako';

const CHUNK_SIZE = 256 * 1024; // 256KB

export function chunk(buffer: Uint8Array, size = CHUNK_SIZE): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < buffer.byteLength; offset += size) {
    chunks.push(buffer.subarray(offset, offset + size));
  }
  return chunks;
}

export function unchunk(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    output.set(c, offset);
    offset += c.byteLength;
  }
  return output;
}

export async function compress(input: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(input).catch(() => {});
    writer.close().catch(() => {});
    const reader = cs.readable.getReader();
    const parts: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
    return unchunk(parts);
  }
  return pako.gzip(input);
}

export async function decompress(input: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(input).catch(() => {});
    writer.close().catch(() => {});
    const reader = ds.readable.getReader();
    const parts: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
    return unchunk(parts);
  }
  return pako.ungzip(input);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/storage/compress.test.ts -t "round-trips a payload through chunking and compression"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/storage/compress.ts tests/lib/storage/compress.test.ts
git commit -m "2026-07-29: add storage chunking and compression helpers"
```

---

### Task 3: Tile Storage Adapter

**Files:**
- Create: `lib/storage/tile-adapter.ts`
- Modify: `lib/tile-storage.ts:99-440`
- Test: `tests/lib/storage/tile-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/storage/tile-adapter.test.ts
import { TileStorageAdapter } from '@/lib/storage/tile-adapter';
import type { TileData } from '@/lib/tile-storage';

describe('TileStorageAdapter', () => {
  it('stores and loads a tile package', async () => {
    const adapter = new TileStorageAdapter();
    const tile: TileData = {
      tileId: 'phuket-1',
      bbox: [98.0, 8.0, 99.0, 9.0],
      centroid: [98.5, 8.5],
      model: 'harmonic',
      datum: 'MSL',
      constituents: [],
      version: '1',
      checksum: 'abc',
      compressedSize: 0,
      originalSize: 0,
      downloadedAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };
    const payload = new Uint8Array([1, 2, 3]);
    await adapter.savePackage({ tile, payload });
    const loaded = await adapter.loadPackage('phuket-1');
    expect(loaded).not.toBeNull();
    expect(loaded?.tile.tileId).toBe('phuket-1');
    expect(Array.from(loaded!.payload)).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/storage/tile-adapter.test.ts -t "stores and loads a tile package"`
Expected: FAIL with `Cannot find module '@lib/storage/tile-adapter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/storage/tile-adapter.ts
import { StorageCore } from './core';
import { compress, decompress } from './compress';
import type { TileData } from '@/lib/tile-storage';

export interface TilePackage {
  tile: TileData;
  payload: Uint8Array;
}

const STORE = 'tiles';

export class TileStorageAdapter {
  private core = new StorageCore('SunmoonTileCache', STORE);

  async savePackage(pkg: TilePackage): Promise<void> {
    const compressed = await compress(pkg.payload);
    await this.core.putRecord(pkg.tile.tileId, pkg.tile, compressed);
  }

  async loadPackage(tileId: string): Promise<TilePackage | null> {
    const record = await this.core.getRecord<TileData>(tileId);
    if (!record) return null;
    const payload = await decompress(record.payload);
    return { tile: record.metadata, payload };
  }

  async deletePackage(tileId: string): Promise<void> {
    await this.core.deleteRecord(tileId);
  }

  async getAllTiles(): Promise<TileData[]> {
    const records = await this.core.getAllRecords<TileData>();
    return records.map((r) => r.metadata);
  }
}

export const tileStorage = new TileStorageAdapter();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/storage/tile-adapter.test.ts -t "stores and loads a tile package"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/storage/tile-adapter.ts tests/lib/storage/tile-adapter.test.ts
git commit -m "2026-07-29: add tile storage adapter on top of storage core"
```

---

### Task 4: Offline-First Storage Adapter

**Files:**
- Create: `lib/storage/offline-adapter.ts`
- Modify: `lib/indexed-db.ts:62-278` and `lib/offline-first/storage.ts:60-84`
- Test: `tests/lib/storage/offline-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/storage/offline-adapter.test.ts
import { OfflineStorageAdapter } from '@/lib/storage/offline-adapter';

describe('OfflineStorageAdapter', () => {
  it('stores and retrieves a tile payload', async () => {
    const adapter = new OfflineStorageAdapter();
    const tile = {
      id: 'tile-1',
      data: new Uint8Array([4, 5, 6]),
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: 3,
      version: '1',
    };
    await adapter.putTile(tile);
    const loaded = await adapter.getTile('tile-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('tile-1');
    expect(Array.from(loaded!.data)).toEqual([4, 5, 6]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/storage/offline-adapter.test.ts -t "stores and retrieves a tile payload"`
Expected: FAIL with `Cannot find module '@lib/storage/offline-adapter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/storage/offline-adapter.ts
import { StorageCore } from './core';
import { compress, decompress } from './compress';

export interface OfflineTileRecord {
  id: string;
  data: Uint8Array;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  version: string;
  checksum?: string;
}

const STORE = 'offline-tiles';

export class OfflineStorageAdapter {
  private core = new StorageCore('SunmoonTileDB', STORE);

  async putTile(tile: OfflineTileRecord): Promise<void> {
    const compressed = await compress(tile.data);
    await this.core.putRecord(tile.id, { ...tile, data: undefined }, compressed);
  }

  async getTile(id: string): Promise<OfflineTileRecord | null> {
    const record = await this.core.getRecord<OfflineTileRecord>(id);
    if (!record) return null;
    const data = await decompress(record.payload);
    return { ...record.metadata, data };
  }

  async deleteTile(id: string): Promise<void> {
    await this.core.deleteRecord(id);
  }

  async getAllTiles(): Promise<OfflineTileRecord[]> {
    const records = await this.core.getAllRecords<OfflineTileRecord>();
    return records.map((r) => ({ ...r.metadata, data: r.payload }));
  }
}

export const offlineStorage = new OfflineStorageAdapter();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/storage/offline-adapter.test.ts -t "stores and retrieves a tile payload"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/storage/offline-adapter.ts tests/lib/storage/offline-adapter.test.ts
git commit -m "2026-07-29: add offline-first storage adapter"
```

---

### Task 5: Refactor Existing Storage Modules to Delegate

**Files:**
- Modify: `lib/tile-storage.ts:99-440`
- Modify: `lib/indexed-db.ts:62-278`
- Modify: `lib/offline-first/storage.ts:60-84`
- Test: `tests/lib/storage/seam-integration.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/storage/seam-integration.test.ts
import { tileStorage } from '@/lib/tile-storage';
import { offlineStorage } from '@/lib/indexed-db';

describe('storage seam integration', () => {
  it('tile-storage singleton is an instance of TileStorageAdapter', () => {
    expect(tileStorage).toBeDefined();
    expect(typeof (tileStorage as any).savePackage).toBe('function');
    expect(typeof (tileStorage as any).loadPackage).toBe('function');
  });

  it('indexed-db singleton is an instance of OfflineStorageAdapter', () => {
    expect(offlineStorage).toBeDefined();
    expect(typeof (offlineStorage as any).putTile).toBe('function');
    expect(typeof (offlineStorage as any).getTile).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/storage/seam-integration.test.ts -t "tile-storage singleton is an instance of TileStorageAdapter"`
Expected: FAIL with `Cannot find module '@/lib/storage/tile-adapter'` from `lib/tile-storage.ts`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/tile-storage.ts (top re-export)
export { TileStorageAdapter, tileStorage, type TilePackage } from '@/lib/storage/tile-adapter';
export type { TileData } from '@/lib/tile-storage';
```

```typescript
// lib/indexed-db.ts (top re-export)
export { OfflineStorageAdapter, offlineStorage } from '@/lib/storage/offline-adapter';
export type { JsonValue } from '@/lib/indexed-db';
```

```typescript
// lib/offline-first/storage.ts
import { tileStorage } from '@/lib/tile-storage';
import { offlineStorage } from '@/lib/indexed-db';
import type { TilePackage } from '@/lib/tile-packaging';
import type { TileMeta } from './types';

export async function storeTilePackage(pkg: TilePackage): Promise<void> {
  await tileStorage.savePackage(pkg);
}

export async function storeBase64Tile(tile: { tileId: string; [k: string]: unknown }, payloadBase64: string): Promise<void> {
  const payload = Buffer.from(payloadBase64, 'base64');
  await tileStorage.savePackage({ tile: tile as any, payload: new Uint8Array(payload) });
}

export async function loadTilePackage(tileId: string): Promise<TilePackage | null> {
  return tileStorage.loadPackage(tileId);
}

export async function listCachedTiles(): Promise<TileMeta[]> {
  const tiles = await tileStorage.getAllTiles();
  return tiles.map((tile) => ({
    tileId: tile.tileId,
    model: tile.model,
    datum: tile.datum,
    bbox: tile.bbox,
    centroid: { lat: tile.centroid[1], lon: tile.centroid[0] },
    tzHint: 'UTC',
    updatedAt: new Date(tile.downloadedAt).toISOString(),
    version: tile.version,
    checksum: tile.checksum,
    sizeCompressed: tile.compressedSize,
  }));
}

export async function removeCachedTile(tileId: string): Promise<void> {
  await tileStorage.deletePackage(tileId);
}

export async function storeManifestMetadata(version: string, issuedAt: string): Promise<void> {
  await offlineStorage.putTile({
    id: `manifest-${version}`,
    data: new TextEncoder().encode(JSON.stringify({ version, issuedAt })),
    timestamp: Date.now(),
    accessCount: 0,
    lastAccessed: Date.now(),
    size: 0,
    version,
  });
}

export async function getLatestManifest(): Promise<{ version: string; issuedAt: string } | null> {
  const records = await offlineStorage.getAllTiles();
  const manifests = records
    .filter((r) => r.id.startsWith('manifest-'))
    .sort((a, b) => b.timestamp - a.timestamp);
  if (manifests.length === 0) return null;
  const text = new TextDecoder().decode(manifests[0].data);
  return JSON.parse(text);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/storage/seam-integration.test.ts -t "tile-storage singleton is an instance of TileStorageAdapter"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tile-storage.ts lib/indexed-db.ts lib/offline-first/storage.ts tests/lib/storage/seam-integration.test.ts
git commit -m "2026-07-29: refactor existing storage modules to delegate to unified core"
```
