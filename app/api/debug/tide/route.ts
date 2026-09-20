import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTideData } from '@/lib/domain/forecast-facade'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const lat = Number(url.searchParams.get('lat') || '9.5')
    const lon = Number(url.searchParams.get('lon') || '99.5')
    const dateParam = url.searchParams.get('date') || undefined
    const date = dateParam ? new Date(dateParam) : new Date()
    const time = { hour: Number(url.searchParams.get('hour') || String(date.getHours())), minute: Number(url.searchParams.get('minute') || String(date.getMinutes())) }

    const tide = await getTideData({ lat, lon, name: 'debug' }, date, time)
    return NextResponse.json(tide)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
