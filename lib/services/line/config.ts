import type { LocationData } from "@/lib/tide-service"

const FALLBACK_LOCATION: LocationData = {
  lat: 13.7563,
  lon: 100.5018,
  name: "กรุงเทพมหานคร",
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function getDefaultLineLocation(): LocationData {
  const lat = parseNumber(process.env.LINE_DEFAULT_LAT)
  const lon = parseNumber(process.env.LINE_DEFAULT_LON)
  const name = process.env.LINE_DEFAULT_LOCATION_NAME?.trim()

  if (lat === null || lon === null) {
    return FALLBACK_LOCATION
  }

  return {
    lat,
    lon,
    
    name: name && name.length > 0 ? name : FALLBACK_LOCATION.name,
  }
}

export function getLineDispatchToken(): string | null {
  return process.env.LINE_DISPATCH_TOKEN?.trim() || null
}
