/**
 * Community tide observation reporting ("รายงานน้ำจริง").
 * POST accepts one report; GET returns accumulated calibration evidence for a station.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import hydroStations from '@/data/hydro-stations.json'
import { accumulateCalibrationSuggestion, buildCommunityCalibrationReview, store } from '@/lib/services/community-observations'
import { calculateDistance } from '@/lib/domain/geo'

const MAX_STATION_DISTANCE_KM = 5
const MAX_FUTURE_MS = 60 * 60 * 1000 // 1 hour
const MAX_PAST_MS = 24 * 60 * 60 * 1000 // 24 hours

const bodySchema = z.object({
  stationId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  type: z.enum(['high', 'low']),
  levelMeters: z.number().min(-10).max(10).optional(),
  observedAt: z.string().datetime({ offset: true }),
})

export async function POST(request: NextRequest) {
  // No account system exists yet -- accept a client-generated anonymous
  // device id instead of inventing an auth system for this.
  const userId = request.headers.get('x-device-id')
  if (!userId) {
    return NextResponse.json({ error: 'Missing x-device-id header' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', issues: parsed.error.issues }, { status: 400 })
  }

  const { stationId, lat, lon, type, levelMeters, observedAt } = parsed.data

  const station = (hydroStations as Array<{ id: string; lat: number; lon: number }>).find(
    (item) => item.id === stationId,
  )
  if (!station) {
    return NextResponse.json({ error: 'Unknown stationId' }, { status: 400 })
  }

  if (calculateDistance(lat, lon, station.lat, station.lon) > MAX_STATION_DISTANCE_KM) {
    return NextResponse.json({ error: 'Reported location is too far from the station' }, { status: 400 })
  }

  const observedAtMs = Date.parse(observedAt)
  const now = Date.now()
  if (!Number.isFinite(observedAtMs) || observedAtMs > now + MAX_FUTURE_MS || observedAtMs < now - MAX_PAST_MS) {
    return NextResponse.json({ error: 'observedAt must be within the last 24 hours and not in the future' }, { status: 400 })
  }

  await store({ stationId, lat, lon, type, levelMeters, observedAt, userId })

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const stationId = request.nextUrl.searchParams.get('stationId')
  if (!stationId) {
    return NextResponse.json({ error: 'Missing stationId query param' }, { status: 400 })
  }

  const report = await accumulateCalibrationSuggestion(stationId)
  const review = await buildCommunityCalibrationReview(stationId)
  return NextResponse.json({ report, review })
}
