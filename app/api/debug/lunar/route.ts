import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { calculateLunarPhase } from '@/lib/domain/lunar-phase'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date') || undefined
    const date = dateParam ? new Date(dateParam) : new Date()

    const result = await calculateLunarPhase(date)
    return NextResponse.json({ date: date.toISOString(), ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
