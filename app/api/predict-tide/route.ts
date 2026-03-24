/**
 * Real-time Tide Prediction API
 * Uses the canonical harmonic forecast series for Thai coastal predictions
 */

import { NextRequest, NextResponse } from 'next/server'
import { generatePredictionTimeSeries, getLocationConstituents } from '@/lib/harmonic-prediction'
import type { LocationData } from '@/lib/harmonic-prediction'

export const runtime = 'edge' // Use edge runtime for faster response

interface PredictionRequest {
  lat: number
  lon: number
  startDate?: string // ISO date string
  hours?: number // Number of hours to predict (default 72)
  interval?: number // Minutes between predictions (default 30)
}

interface TidePrediction {
  time: string // ISO timestamp
  waterLevel: number // meters
  type?: 'high' | 'low' | 'normal'
}

export async function POST(request: NextRequest) {
  try {
    const body: PredictionRequest = await request.json()
    
    // Validate input
    if (!body.lat || !body.lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 }
      )
    }

    if (body.lat < -90 || body.lat > 90 || body.lon < -180 || body.lon > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    const location: LocationData = {
      lat: body.lat,
      lon: body.lon,
      name: `Location ${body.lat.toFixed(4)}, ${body.lon.toFixed(4)}`
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const hours = Math.min(body.hours || 72, 168) // Max 1 week
    const interval = Math.max(body.interval || 30, 5) // Min 5 minutes

    const constituents = getLocationConstituents(location)
    const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000)
    const series = generatePredictionTimeSeries(startDate, endDate, location, interval)
    const predictions: TidePrediction[] = series.map((point) => ({
      time: point.time.toISOString(),
      waterLevel: Number(point.level.toFixed(3)),
    }))

    // Find high/low tides
    for (let i = 1; i < predictions.length - 1; i++) {
      const prev = predictions[i - 1].waterLevel
      const curr = predictions[i].waterLevel
      const next = predictions[i + 1].waterLevel

      if (curr > prev && curr > next && (curr - prev > 0.05 || curr - next > 0.05)) {
        predictions[i].type = 'high'
      } else if (curr < prev && curr < next && (prev - curr > 0.05 || next - curr > 0.05)) {
        predictions[i].type = 'low'
      }
    }

    // Calculate statistics
    const levels = predictions.map(p => p.waterLevel)
    const maxLevel = Math.max(...levels)
    const minLevel = Math.min(...levels)
    const meanLevel = levels.reduce((a, b) => a + b, 0) / levels.length
    const range = maxLevel - minLevel

    // Find extremes
    const highTides = predictions.filter(p => p.type === 'high')
    const lowTides = predictions.filter(p => p.type === 'low')

    return NextResponse.json({
      location: {
        lat: location.lat,
        lon: location.lon,
        region: getRegionName(location.lat, location.lon)
      },
      prediction: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        interval: interval,
        count: predictions.length
      },
      statistics: {
        maxLevel: Number(maxLevel.toFixed(3)),
        minLevel: Number(minLevel.toFixed(3)),
        meanLevel: Number(meanLevel.toFixed(3)),
        range: Number(range.toFixed(3)),
        highTides: highTides.length,
        lowTides: lowTides.length
      },
      data: predictions,
      highTides: highTides.map(p => ({
        time: p.time,
        level: p.waterLevel
      })),
      lowTides: lowTides.map(p => ({
        time: p.time,
        level: p.waterLevel
      })),
      metadata: {
        engine: 'Canonical Harmonic Forecast',
        constituents: constituents.length,
        datum: 'MSL (Mean Sea Level)',
        version: 'canonical-harmonic-v1',
        sourceTier: 'harmonic',
        confidenceMethod: 'none',
        qualityScore: 68
      }
    })

  } catch (error) {
    console.error('Tide prediction error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate tide prediction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = Number(searchParams.get('lat'))
  const lon = Number(searchParams.get('lon'))
  const startDate = searchParams.get('start')
  const hours = Number(searchParams.get('hours')) || 72
  const interval = Number(searchParams.get('interval')) || 30

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lon' },
      { status: 400 }
    )
  }

  // Convert GET to POST body
  const body: PredictionRequest = {
    lat,
    lon,
    startDate: startDate || undefined,
    hours,
    interval
  }

  // Reuse POST logic
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' }
  }))
}

/**
 * Get region name for Thai coastal areas
 */
function getRegionName(lat: number, lon: number): string {
  const isGulfOfThailand = lon > 99 && lat < 15 && lat > 5
  const isAndamanSea = lon < 99 && lat < 15 && lat > 5
  const isUpperGulf = isGulfOfThailand && lat > 12

  if (isUpperGulf) return 'Upper Gulf of Thailand (อ่าวไทยตอนบน)'
  if (isGulfOfThailand) return 'Gulf of Thailand (อ่าวไทย)'
  if (isAndamanSea) return 'Andaman Sea (ทะเลอันดามัน)'
  return 'Unknown region'
}
