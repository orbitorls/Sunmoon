import { Buffer } from 'node:buffer'
import { NextRequest, NextResponse } from 'next/server'
import { createTilePackage } from '@/lib/tile-packaging'
import { getLocationConstituents } from '@/lib/harmonic-prediction'

/**
 * API endpoint for tile data
 * GET /api/tiles/[lat]/[lon]
 * 
 * Returns compressed tile package with tidal constituents for location
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lat: string; lon: string }> }
) {
  try {
    const { lat: latParam, lon: lonParam } = await context.params
    const lat = parseFloat(latParam)
    const lon = parseFloat(lonParam)

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Validate Thailand coordinates (with some buffer)
    if (lat < 5 || lat > 21 || lon < 97 || lon > 106) {
      return NextResponse.json(
        { error: 'Coordinates outside Thailand region' },
        { status: 400 }
      )
    }

    // Generate tile ID
    const tileId = `tile_${lat.toFixed(4)}_${lon.toFixed(4)}`
    
    // Bounding box: ~0.5ยฐ square around point
    const bbox: [number, number, number, number] = [
      lon - 0.25,
      lat - 0.25,
      lon + 0.25,
      lat + 0.25
    ]
    
    // Centroid
    const centroid: [number, number] = [lon, lat]
    
    // Get constituents for this location
    const location = { lat, lon: lon, name: `Location ${lat},${lon}` }
    const constituents = getLocationConstituents(location)
    
    // Convert to ConstituentData format
    const constituentData = constituents.map(c => ({
      name: c.name,
      amplitude: c.amplitude,
      phase: c.phase,
      speedDegHr: c.speed
    }))
    
    // Create tile package with compression
    const pkg = await createTilePackage(
      tileId,
      bbox,
      centroid,
      constituentData,
      {
        model: 'Harmonic37',
        datum: 'MSL',
        version: '1.0.0'
      }
    )

    // Encode payload as base64 for transport
    const payloadBase64 = Buffer.from(pkg.payload).toString('base64')

    // Add cache headers (30 days)
    return NextResponse.json(
      {
        tile: pkg.tile,
        payload: payloadBase64,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=2592000',
          'Content-Type': 'application/json',
          'X-Tile-Size': pkg.tile.compressedSize.toString(),
          'X-Original-Size': pkg.tile.originalSize.toString(),
        }
      },
    )
  } catch (error) {
    console.error('[API] Tile generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tile', details: String(error) },
      { status: 500 }
    )
  }
}
