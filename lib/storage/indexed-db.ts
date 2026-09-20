/**
 * IndexedDB Wrapper for Offline Tile Storage
 * Manages tile data, compression, and LRU eviction
 */

declare global {
  interface CompressionStream {
    readonly readable: ReadableStream<Uint8Array>
    readonly writable: WritableStream<Uint8Array>
  }

  interface CompressionStreamConstructor {
    new (format: 'gzip' | 'deflate' | 'deflate-raw'): CompressionStream
  }

  interface DecompressionStream {
    readonly readable: ReadableStream<Uint8Array>
    readonly writable: WritableStream<Uint8Array>
  }

  interface DecompressionStreamConstructor {
    new (format: 'gzip' | 'deflate' | 'deflate-raw'): DecompressionStream
  }

  const CompressionStream: CompressionStreamConstructor
  const DecompressionStream: DecompressionStreamConstructor
}

const DB_NAME = 'SunmoonTileDB'
const DB_VERSION = 1
const TILE_STORE = 'tiles'
const MAX_TILES = 100 // Maximum number of tiles to store
const MAX_STORAGE_MB = 50 // Maximum storage in MB

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface TileData<TPayload = Uint8Array> {
  id: string // Unique tile identifier (lat-lon-zoom)
  data: TPayload // Tile data (compressed)
  timestamp: number // When tile was cached
  accessCount: number // Number of times accessed
  lastAccessed: number // Last access timestamp
  size: number // Size in bytes
  version: string // Tile data version
  checksum?: string // Data integrity check
}

export interface StorageStats {
  tileCount: number
  totalSize: number
  oldestTile: number | null
  newestTile: number | null
  avgAccessCount: number
}

class IndexedDBManager {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  /**
   * Initialize database
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'))
        return
      }

      console.log('[IndexedDB] Opening database...')
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        console.log('[IndexedDB] Database opened successfully')
        this.db = request.result
        resolve(this.db!)
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        console.log('[IndexedDB] Upgrading database...')
        const db = (event.target as IDBOpenDBRequest).result

        // Create tile store
        if (!db.objectStoreNames.contains(TILE_STORE)) {
          const store = db.createObjectStore(TILE_STORE, { keyPath: 'id' })
          
          // Create indexes
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
          store.createIndex('accessCount', 'accessCount', { unique: false })
          store.createIndex('size', 'size', { unique: false })
          
          console.log('[IndexedDB] Tile store created with indexes')
        }
      }
    })

    return this.initPromise
  }

  /**
   * Store tile data
   */
  async putTile(tileData: TileData): Promise<void> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE], 'readwrite')
      const store = transaction.objectStore(TILE_STORE)
      
      const request = store.put(tileData)
      
      request.onsuccess = async () => {
        console.log('[IndexedDB] Tile stored:', tileData.id)
        
        // Check storage limits and evict if needed
        await this.evictIfNeeded()
        
        resolve()
      }
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to store tile:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get tile data
   */
  async getTile(id: string): Promise<TileData | null> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE], 'readwrite')
      const store = transaction.objectStore(TILE_STORE)
      
      const request = store.get(id)
      
      request.onsuccess = () => {
        const tile = request.result as TileData | undefined
        
        if (tile) {
          console.log('[IndexedDB] Tile retrieved:', id)
          
          // Update access statistics
          tile.accessCount++
          tile.lastAccessed = Date.now()
          store.put(tile)
          
          resolve(tile)
        } else {
          console.log('[IndexedDB] Tile not found:', id)
          resolve(null)
        }
      }
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to get tile:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete tile
   */
  async deleteTile(id: string): Promise<void> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE], 'readwrite')
      const store = transaction.objectStore(TILE_STORE)
      
      const request = store.delete(id)
      
      request.onsuccess = () => {
        console.log('[IndexedDB] Tile deleted:', id)
        resolve()
      }
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to delete tile:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all tiles
   */
  async getAllTiles(): Promise<TileData[]> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE], 'readonly')
      const store = transaction.objectStore(TILE_STORE)
      
      const request = store.getAll()
      
      request.onsuccess = () => {
        resolve(request.result as TileData[])
      }
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to get all tiles:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    const tiles = await this.getAllTiles()
    
    if (tiles.length === 0) {
      return {
        tileCount: 0,
        totalSize: 0,
        oldestTile: null,
        newestTile: null,
        avgAccessCount: 0
      }
    }
    
    const totalSize = tiles.reduce((sum, tile) => sum + tile.size, 0)
    const totalAccessCount = tiles.reduce((sum, tile) => sum + tile.accessCount, 0)
    const timestamps = tiles.map(tile => tile.timestamp)
    
    return {
      tileCount: tiles.length,
      totalSize,
      oldestTile: Math.min(...timestamps),
      newestTile: Math.max(...timestamps),
      avgAccessCount: totalAccessCount / tiles.length
    }
  }

  /**
   * Clear all tiles
   */
  async clearAll(): Promise<void> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE], 'readwrite')
      const store = transaction.objectStore(TILE_STORE)
      
      const request = store.clear()
      
      request.onsuccess = () => {
        console.log('[IndexedDB] All tiles cleared')
        resolve()
      }
      
      request.onerror = () => {
        console.error('[IndexedDB] Failed to clear tiles:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Evict least recently used tiles if storage limits exceeded
   */
  private async evictIfNeeded(): Promise<void> {
    const stats = await this.getStats()
    const sizeMB = stats.totalSize / (1024 * 1024)
    
    console.log(`[IndexedDB] Storage check: ${stats.tileCount} tiles, ${sizeMB.toFixed(2)} MB`)
    
    // Check if eviction needed
    if (stats.tileCount <= MAX_TILES && sizeMB <= MAX_STORAGE_MB) {
      return
    }
    
    console.log('[IndexedDB] Storage limits exceeded, evicting tiles...')
    
    const tiles = await this.getAllTiles()
    
    // Sort by LRU (least recently accessed first)
    tiles.sort((a, b) => {
      // First priority: access count (lower = evict first)
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount
      }
      // Second priority: last accessed time (older = evict first)
      return a.lastAccessed - b.lastAccessed
    })
    
    // Calculate how many to evict
    const tilesToEvict = Math.max(
      stats.tileCount - MAX_TILES,
      Math.ceil((sizeMB - MAX_STORAGE_MB) / (sizeMB / stats.tileCount)) 
    )
    
    console.log(`[IndexedDB] Evicting ${tilesToEvict} tiles`)
    
    // Evict tiles
    for (let i = 0; i < tilesToEvict && i < tiles.length; i++) {
      await this.deleteTile(tiles[i].id)
    }
    
    const newStats = await this.getStats()
    console.log(`[IndexedDB] After eviction: ${newStats.tileCount} tiles, ${(newStats.totalSize / (1024 * 1024)).toFixed(2)} MB`)
  }

  /**
   * Compress data before storing
   */
  async compressData<TData extends JsonValue>(data: TData): Promise<Uint8Array> {
    const json = JSON.stringify(data)
    const encoder = new TextEncoder()
    const input = encoder.encode(json)
    
    // Use CompressionStream if available
    if ('CompressionStream' in window) {
      const stream = new Blob([input]).stream()
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
      const compressedBlob = await new Response(compressedStream).blob()
      return new Uint8Array(await compressedBlob.arrayBuffer())
    }
    
    // Fallback: return uncompressed
    return input
  }

  /**
   * Decompress data after retrieving
   */
  async decompressData<TData extends JsonValue>(compressed: Uint8Array): Promise<TData> {
    // Use DecompressionStream if available
    if ('DecompressionStream' in window) {
      try {
        // Convert Uint8Array to ArrayBuffer
        const buffer = compressed.buffer.slice(
          compressed.byteOffset, 
          compressed.byteOffset + compressed.byteLength
        ) as ArrayBuffer
        const blob = new Blob([buffer])
        const stream = blob.stream()
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
        const decompressedBlob = await new Response(decompressedStream).blob()
        const text = await decompressedBlob.text()
        const parsed = JSON.parse(text) as JsonValue
        return parsed as TData
      } catch (error) {
        console.error('[IndexedDB] Decompression failed, trying as uncompressed:', error)
      }
    }
    
    // Fallback: treat as uncompressed
    const decoder = new TextDecoder()
    const text = decoder.decode(compressed)
    const parsed = JSON.parse(text) as JsonValue
    return parsed as TData
  }
}

// Singleton instance and exports
export { IndexedDBManager }
export const indexedDB = new IndexedDBManager()
export const TileStorage = IndexedDBManager

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  indexedDB.init().catch(error => {
    console.error('[IndexedDB] Auto-initialization failed:', error)
  })
}
