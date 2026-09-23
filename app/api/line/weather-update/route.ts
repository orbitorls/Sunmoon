import { NextRequest, NextResponse } from "next/server"

import type { LocationData } from "@/lib/domain/types"
import {
  getDefaultLineLocation,
  getLineDispatchToken,
  dispatchWeatherUpdate,
} from "@/lib/services/line"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const token = getLineDispatchToken()
  if (token) {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const { broadcast = false, userIds, location } = (payload as {
    broadcast?: boolean
    userIds?: string[]
    location?: Partial<LocationData>
  }) ?? {}

  const normalizedLocation = normalizeLocation(location) ?? getDefaultLineLocation()

  try {
    const result = await dispatchWeatherUpdate({
      broadcast,
      userIds,
      location: normalizedLocation,
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error("Failed to dispatch LINE weather update", error)
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 })
  }
}

function normalizeLocation(input?: Partial<LocationData>): LocationData | null {
  if (!input) return null
  const lat = Number.parseFloat(String(input.lat))
  const lon = Number.parseFloat(String(input.lon))

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null
  }

  return {
    lat,
    lon,
    name: typeof input.name === "string" && input.name.trim().length > 0 ? input.name : getDefaultLineLocation().name,
  }
}
