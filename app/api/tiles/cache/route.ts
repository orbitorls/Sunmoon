import { NextRequest, NextResponse } from 'next/server'
import { indexedDB } from '@/lib/storage/indexed-db'

/**
 * API endpoint to cache a tile in IndexedDB
 * POST /api/tiles/cache
 * 
 * Stores a tile package in the offline cache
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tileId, tileData } = body

    if (!tileId || !tileData) {
      return NextResponse.json(
        { error: 'Missing required fields: tileId and tileData' },
        { status: 400 }
      )
    }

    // Prepare tile data for IndexedDB
    const tile: any = {
      id: tileId,
      data: tileData,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: JSON.stringify(tileData).length,
      version: '1.0.0'
    }

    // Store tile in IndexedDB
    await indexedDB.putTile(tile)

    return NextResponse.json(
      { 
        success: true,
        tileId,
        cachedAt: new Date().toISOString()
      },
      { 
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('[API] Tile caching error:', error)
    return NextResponse.json(
      { error: 'Failed to cache tile', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * API endpoint to get list of cached tiles
 * GET /api/tiles/cache
 * 
 * Returns all cached tiles with metadata
 */
export async function GET(request: NextRequest) {
  try {
    // Get all cached tiles
    const tiles = await indexedDB.getAllTiles()
    
    // Get storage stats
    const stats = await indexedDB.getStats()

    return NextResponse.json(
      {
        tiles: tiles.map(tile => ({
          id: tile.id,
          timestamp: new Date(tile.timestamp).toISOString(),
          lastAccessed: new Date(tile.lastAccessed).toISOString(),
          accessCount: tile.accessCount,
          size: tile.size,
          version: tile.version
        })),
        stats: {
          totalTiles: stats.tileCount,
          totalSize: stats.totalSize,
          totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2),
          oldestTile: stats.oldestTile ? new Date(stats.oldestTile).toISOString() : null,
          newestTile: stats.newestTile ? new Date(stats.newestTile).toISOString() : null,
          avgAccessCount: stats.avgAccessCount.toFixed(2)
        }
      },
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('[API] Get cached tiles error:', error)
    return NextResponse.json(
      { error: 'Failed to get cached tiles', details: String(error) },
      { status: 500 }
    )
  }
}
