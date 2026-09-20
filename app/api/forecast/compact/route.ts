/**
 * GET /api/forecast/compact
 * 
 * Compact forecast API for low-bandwidth scenarios
 * Returns binary compressed data instead of JSON
 * 
 * Usage:
 * GET /api/forecast/compact?lat=8.6270&lon=98.3985&format=compact
 */

import { NextRequest, NextResponse } from 'next/server'
import type { LocationData } from '@/lib/domain/types'
import { fetchForecast } from '@/lib/services/forecast'
import { 
  compressForecast, 
  decompressForecast,
  estimateCompressionStats 
} from '@/lib/compression/compact-protocol'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse parameters
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lon = parseFloat(searchParams.get('lon') || '0')
    const format = searchParams.get('format') || 'compact' // 'compact' or 'json'
    const debug = searchParams.get('debug') === 'true'
    
    // Validate coordinates
    if (!lat || !lon || lat < 1 || lat > 20 || lon < 97 || lon > 106) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Expected Thailand: 1-20°N, 97-106°E' },
        { status: 400 }
      )
    }
    
    // Create location object
    const location: LocationData = {
      lat,
      lon,
      name: `${lat.toFixed(2)},${lon.toFixed(2)}`,
    }
    
    // Fetch forecast data
    const forecast = await fetchForecast(location, {
      date: new Date(),
    })
    
    // Check for errors
    if (forecast.error) {
      return NextResponse.json(
        { error: forecast.error },
        { status: 500 }
      )
    }
    
    // Return format based on request
    if (format === 'compact') {
      // Compress to binary format
      const compressed = compressForecast(
        location,
        forecast.tideData,
        forecast.weatherData
      )
      
      // If debug mode, return with stats
      if (debug) {
        const stats = estimateCompressionStats(forecast, compressed)
        return NextResponse.json({
          message: 'Debug mode: returning compressed data with statistics',
          stats,
          data: Array.from(compressed), // Show as array for debugging
          decoded: decompressForecast(compressed, location),
        })
      }
      
      // Return binary response
      return new NextResponse(Buffer.from(compressed), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'identity',
          'X-Compression-Ratio': calculateRatio(forecast, compressed).toString(),
          'X-Original-Size': JSON.stringify(forecast).length.toString(),
          'X-Compressed-Size': compressed.byteLength.toString(),
          'Cache-Control': 'public, max-age=300', // 5 minutes
        },
      })
    }
    
    // Standard JSON response
    return NextResponse.json(forecast, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    })
    
  } catch (error) {
    console.error('Compact forecast error:', error)
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    )
  }
}

/**
 * Calculate compression ratio as percentage
 */
function calculateRatio(original: Record<string, unknown>, compressed: Uint8Array): string {
  const originalSize = JSON.stringify(original).length
  const ratio = ((1 - compressed.byteLength / originalSize) * 100).toFixed(1)
  return ratio
}

/**
 * Health check
 */
export async function HEAD() {
  return NextResponse.json({ status: 'ok' })
}
