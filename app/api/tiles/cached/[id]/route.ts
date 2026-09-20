import { NextRequest, NextResponse } from 'next/server'
import { indexedDB } from '@/lib/storage/indexed-db'

/**
 * API endpoint to get a specific cached tile
 * GET /api/tiles/cached/[id]
 * 
 * Returns tile data from IndexedDB cache
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tileId } = await params

    if (!tileId) {
      return NextResponse.json(
        { error: 'Missing tile ID' },
        { status: 400 }
      )
    }

    // Get tile from IndexedDB
    const tile = await indexedDB.getTile(tileId)

    if (!tile) {
      return NextResponse.json(
        { error: 'Tile not found in cache', tileId },
        { status: 404 }
      )
    }

    // Update access statistics
    await indexedDB.getTile(tileId)

    return NextResponse.json(
      {
        tileId,
        tileData: tile.data,
        metadata: {
          cachedAt: new Date(tile.timestamp).toISOString(),
          lastAccessed: new Date(tile.lastAccessed).toISOString(),
          accessCount: tile.accessCount,
          size: tile.size,
          version: tile.version
        }
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('[API] Get cached tile error:', error)
    return NextResponse.json(
      { error: 'Failed to get cached tile', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * API endpoint to delete a specific cached tile
 * DELETE /api/tiles/cached/[id]
 * 
 * Removes tile from IndexedDB cache
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tileId } = await params

    if (!tileId) {
      return NextResponse.json(
        { error: 'Missing tile ID' },
        { status: 400 }
      )
    }

    // Delete tile from IndexedDB
    await indexedDB.deleteTile(tileId)

    return NextResponse.json(
      {
        success: true,
        tileId,
        deletedAt: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('[API] Delete cached tile error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tile', details: String(error) },
      { status: 500 }
    )
  }
}
