/**
 * IndexedDB Storage Layer for Sunmoon PWA
 * Manages tile data storage with LRU eviction and quota management
 */

import { sha256Hex } from './storage/core'

const DB_NAME = 'SunmoonTileCache'
const DB_VERSION = 1
const TILES_STORE = 'tiles'
const METADATA_STORE = 'metadata'
const MAX_STORAGE_MB = 100
const MAX_TILE_AGE_DAYS = 30

export interface TileData {
  tileId: string
  bbox: [number, number, number, number]
  centroid: [number, number]
  model: string
  datum: string
  constituents: ConstituentData[]
  minorRules?: MinorRuleData[]
  localCalibration?: CalibrationData
  version: string
  checksum: string
  compressedSize: number
  originalSize: number
  downloadedAt: number
  lastAccessedAt: number
  accessCount: number
}

export interface ConstituentData {
  name: string
  amplitude: number
  phase: number
  speedDegHr?: number
}

export interface MinorRuleData {
  targetConstituent: string
  sourceConstituents: string[]
  amplitudeFactors: number[]
  phaseOffsets: number[]
}

export interface CalibrationData {
  heightOffset?: number // meters
  phaseOffset?: number // degrees
  validFrom?: number // timestamp
  validTo?: number // timestamp
  rmse?: number
  mae?: number
}

export interface StorageMetadata {
  totalSize: number
  tileCount: number
  lastCleanup: number
  quota: number
  usage: number
}

interface TileRecord {
  tileId: string
  metadata: TileData
  payload: ArrayBuffer
}

type ArrayBufferLikeInput = Uint8Array | ArrayBuffer | SharedArrayBuffer

function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer {
  return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer
}

function cloneSharedArrayBuffer(buffer: SharedArrayBuffer): ArrayBuffer {
  const view = new Uint8Array(buffer)
  const copy = new Uint8Array(view.length)
  copy.set(view)
  return copy.buffer
}

function toArrayBuffer(input: ArrayBufferLikeInput): ArrayBuffer {
  if (input instanceof Uint8Array) {
    const copy = new Uint8Array(input.byteLength)
    copy.set(input)
    return copy.buffer
  }

  if (isSharedArrayBuffer(input)) {
    return cloneSharedArrayBuffer(input)
  }

  if (input instanceof ArrayBuffer) {
    return input
  }

  throw new TypeError('Unsupported buffer type')
}

class TileStorageManager {
  private db: IDBDatabase | null = null
  private initialized = false

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.initialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.initialized = true
        console.log('[IndexedDB] Initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create tiles store
        if (!db.objectStoreNames.contains(TILES_STORE)) {
          const tileStore = db.createObjectStore(TILES_STORE, { keyPath: 'tileId' })
          tileStore.createIndex('metadata.lastAccessedAt', 'metadata.lastAccessedAt', { unique: false })
          tileStore.createIndex('metadata.downloadedAt', 'metadata.downloadedAt', { unique: false })
          tileStore.createIndex('metadata.model', 'metadata.model', { unique: false })
          console.log('[IndexedDB] Created tiles store')
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' })
          console.log('[IndexedDB] Created metadata store')
        }
      }
    })
  }

  /**
   * Save a tile to storage
   */
  async saveTilePackage(tile: TileData, payload: ArrayBufferLikeInput): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    // Update access metadata
    tile.downloadedAt = Date.now()
    tile.lastAccessedAt = Date.now()
    tile.accessCount = 0

    // Check storage quota before saving
    await this.checkQuotaAndCleanup(tile.compressedSize)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TILES_STORE], 'readwrite')
      const store = transaction.objectStore(TILES_STORE)
      
      // Fix ArrayBuffer handling - ensure only ArrayBuffer, not SharedArrayBuffer
      const buffer = toArrayBuffer(payload)
      
      const record: TileRecord = {
        tileId: tile.tileId,
        metadata: tile,
        payload: buffer,
      }
      const request = store.put(record)

      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved tile ${tile.tileId}`)
        this.updateMetadata()
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a tile from storage
   */
  async getTile(tileId: string): Promise<TileData | null> {
    const record = await this.getTilePackage(tileId)
    return record?.metadata ?? null
  }

  async savePackage(pkg: { tile: TileData; payload: ArrayBufferLikeInput }): Promise<void> {
    return this.saveTilePackage(pkg.tile, pkg.payload)
  }

  async saveBase64Tile(tile: TileData, payloadBase64: string): Promise<void> {
    const payload = decodeBase64(payloadBase64)
    await this.saveTilePackage(tile, payload)
  }

  async getTilePackage(tileId: string): Promise<{ metadata: TileData; payload: Uint8Array } | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TILES_STORE], 'readwrite')
      const store = transaction.objectStore(TILES_STORE)
      const request = store.get(tileId)

      request.onsuccess = () => {
        const record = request.result as TileRecord | undefined

        if (record) {
          const tile = { ...record.metadata }
          // Update access metadata
          tile.lastAccessedAt = Date.now()
          tile.accessCount = (tile.accessCount || 0) + 1
          store.put({ ...record, metadata: tile })

          console.log(`[IndexedDB] Retrieved tile ${tileId}`)
          resolve({
            metadata: tile,
            payload: new Uint8Array(record.payload),
          })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getTilePayload(tileId: string): Promise<Uint8Array | null> {
    const record = await this.getTilePackage(tileId)
    return record ? record.payload : null
  }

  /**
   * Delete a tile from storage
   */
  async deleteTile(tileId: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TILES_STORE], 'readwrite')
      const store = transaction.objectStore(TILES_STORE)
      const request = store.delete(tileId)

      request.onsuccess = () => {
        console.log(`[IndexedDB] Deleted tile ${tileId}`)
        this.updateMetadata()
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all tiles
   */
  async getAllTiles(): Promise<TileData[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TILES_STORE], 'readonly')
      const store = transaction.objectStore(TILES_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const records = request.result as TileRecord[]
        resolve(records.map((record) => record.metadata))
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Check quota and perform LRU cleanup if needed
   */
  private async checkQuotaAndCleanup(newTileSize: number): Promise<void> {
    const metadata = await this.getMetadata()
    const maxBytes = MAX_STORAGE_MB * 1024 * 1024

    // Check if we need to free up space
    if (metadata.totalSize + newTileSize > maxBytes) {
      console.log('[IndexedDB] Storage quota exceeded, performing LRU cleanup...')
      await this.performLRUCleanup(newTileSize)
    }
  }

  /**
   * Perform LRU (Least Recently Used) cleanup
   */
  private async performLRUCleanup(requiredSpace: number): Promise<void> {
    const tiles = await this.getAllTiles()
    
    // Sort by last accessed time (oldest first)
    tiles.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)

    let freedSpace = 0
    const tilesToDelete: string[] = []

    for (const tile of tiles) {
      // Also check if tile is expired
      const age = Date.now() - tile.downloadedAt
      const maxAge = MAX_TILE_AGE_DAYS * 24 * 60 * 60 * 1000

      if (age > maxAge || freedSpace < requiredSpace) {
        tilesToDelete.push(tile.tileId)
        freedSpace += tile.compressedSize

        if (freedSpace >= requiredSpace && age <= maxAge) {
          break // Stop if we've freed enough space
        }
      }
    }

    // Delete selected tiles
    for (const tileId of tilesToDelete) {
      await this.deleteTile(tileId)
      console.log(`[IndexedDB] Cleaned up tile ${tileId}`)
    }

    console.log(`[IndexedDB] Freed ${freedSpace} bytes`)
  }

  /**
   * Get storage metadata
   */
  async getMetadata(): Promise<StorageMetadata> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly')
      const store = transaction.objectStore(METADATA_STORE)
      const request = store.get('storage')

      request.onsuccess = () => {
        const metadata = request.result?.value as StorageMetadata | undefined
        resolve(metadata || {
          totalSize: 0,
          tileCount: 0,
          lastCleanup: Date.now(),
          quota: 0,
          usage: 0
        })
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update storage metadata
   */
  private async updateMetadata(): Promise<void> {
    if (!this.db) return

    const tiles = await this.getAllTiles()
    const totalSize = tiles.reduce((sum, tile) => sum + tile.compressedSize, 0)

    // Get quota from Storage API if available
    let quota = 0
    let usage = 0

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      quota = estimate.quota || 0
      usage = estimate.usage || 0
    }

    const metadata: StorageMetadata = {
      totalSize,
      tileCount: tiles.length,
      lastCleanup: Date.now(),
      quota,
      usage
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readwrite')
      const store = transaction.objectStore(METADATA_STORE)
      const request = store.put({ key: 'storage', value: metadata })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all tiles
   */
  async clearAllTiles(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TILES_STORE], 'readwrite')
      const store = transaction.objectStore(TILES_STORE)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[IndexedDB] Cleared all tiles')
        this.updateMetadata()
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get storage estimate
   */
  async getStorageEstimate(): Promise<{ quota: number; usage: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0)
      }
    }

    return { quota: 0, usage: 0, available: 0 }
  }

  /**
   * Validate tile checksum
   */
  async validateTileChecksum(tileId: string): Promise<boolean> {
    const record = await this.getTilePackage(tileId)
    if (!record) return false
    const checksum = await sha256Hex(record.payload)
    return checksum === record.metadata.checksum
  }

  async clearAll(): Promise<void> {
    return this.clearAllTiles()
  }
}

// Export singleton instance
export const tileStorage = new TileStorageManager()

function decodeBase64(base64: string): Uint8Array {
  const globalWithBuffer = globalThis as { Buffer?: { from(input: string, encoding: string): { length: number; [index: number]: number } } }
  const nodeBuffer = globalWithBuffer.Buffer
  if (nodeBuffer?.from) {
    const buf = nodeBuffer.from(base64, 'base64')
    return Uint8Array.from({ length: buf.length }, (_, index) => buf[index])
  }

  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
