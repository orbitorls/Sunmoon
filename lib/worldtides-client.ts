/**
 * WorldTides API Integration
 * 
 * Handles real-time tide predictions from WorldTides service
 * Provides global coverage with high accuracy
 */

export interface WorldTidesStation {
  id: string
  name: string
  lat: number
  lon: number
  country: string
  type: 'reference' | 'secondary' | 'harmonic'
}

export interface WorldTidesPrediction {
  timestamp: number
  height: number
  type?: 'high' | 'low'
  confidence?: number
}

export interface WorldTidesExtremes {
  highs: WorldTidesPrediction[]
  lows: WorldTidesPrediction[]
}

type WorldTidesExtremesApiResponse = {
  // WorldTides v3 extremes carry the Unix timestamp in `dt` (seconds), plus a
  // human-readable `date` string. There is no `timestamp` field.
  extremes?: Array<{ dt: number; date?: string; height: number; type: string }>
}

type WorldTidesStationApiResponse = {
  stations?: Array<{ id: string; name: string; lat: number; lon: number }>
}

type WorldTidesHeightsApiResponse = {
  // Same `dt`-not-`timestamp` shape as extremes (verified against the live
  // v3 API: {"dt":..,"date":"...","height":..}).
  heights?: Array<{ dt: number; date?: string; height: number }>
}

/**
 * WorldTides API client
 * Docs: https://www.worldtides.info/api
 */
export class WorldTidesClient {
  private apiKey: string
  // WorldTides v3 returns heights against whatever vertical reference the
  // request pins via `datum` (e.g. MSL or CD) -- without it the reference is
  // provider-defined and not safe to compare against our MSL-referenced
  // internal model. Every request goes through buildUrl, so pinning it there
  // covers every call site in one place.
  private datum: string
  private baseUrl = 'https://www.worldtides.info/api/v3'
  private requestCount = 0
  private lastRequest = 0
  private requestDelay = 100 // ms between requests (rate limiting)

  constructor(apiKey: string, datum = 'MSL') {
    this.apiKey = apiKey
    this.datum = datum
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0
  }

  private buildUrl(path: string, params: Record<string, string | number | boolean>): string {
    const searchParams = new URLSearchParams()
    searchParams.set('datum', this.datum)

    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value))
    }

    if (this.isConfigured()) {
      searchParams.set('key', this.apiKey)
    }

    // WorldTides v3's coordinate-based query form (path === '') is the base
    // endpoint itself, e.g. `.../v3?extremes&lat=...` — a trailing slash
    // (`.../v3/?...`) 404s. Sub-resources like `stationlist` do take a slash.
    const suffix = path ? `/${path}` : ''
    return `${this.baseUrl}${suffix}?${searchParams.toString()}`
  }

  /**
   * Find nearest tide station to coordinates
   */
  async findNearestStation(lat: number, lon: number): Promise<WorldTidesStation | null> {
    try {
      if (!this.isConfigured()) {
        return null
      }

      await this.rateLimitCheck()

      const response = await fetch(this.buildUrl('stationlist', {
        lat,
        lon,
        type: 'current',
      }))

      if (!response.ok) {
        console.warn('WorldTides station list failed:', response.statusText)
        return null
      }

      const data = await response.json() as WorldTidesStationApiResponse

      if (data.stations && data.stations.length > 0) {
        return {
          id: data.stations[0].id,
          name: data.stations[0].name,
          lat: data.stations[0].lat,
          lon: data.stations[0].lon,
          country: 'TH',
          type: 'reference',
        }
      }

      return null
    } catch (error) {
      console.error('WorldTides station lookup failed:', error)
      return null
    }
  }

  /**
   * Get tide predictions for a station
   */
  async getPredictions(
    stationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorldTidesPrediction[]> {
    try {
      if (!this.isConfigured()) {
        return []
      }

      await this.rateLimitCheck()

      const start = Math.floor(startDate.getTime() / 1000)
      const end = Math.floor(endDate.getTime() / 1000)

      const response = await fetch(this.buildUrl('tide', {
        station: stationId,
        begin: start,
        end,
        step: 600,
      }))

      if (!response.ok) {
        console.warn('WorldTides prediction failed:', response.statusText)
        return []
      }

      const data = await response.json() as WorldTidesHeightsApiResponse

      if (!data.heights) return []

      return data.heights.map(h => ({
        timestamp: h.dt * 1000, // Convert to ms
        height: h.height,
        confidence: 95,
      }))
    } catch (error) {
      console.error('WorldTides predictions fetch failed:', error)
      return []
    }
  }

  /**
   * Find high and low tides
   */
  async getExtremes(
    stationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorldTidesExtremes> {
    try {
      if (!this.isConfigured()) {
        return { highs: [], lows: [] }
      }

      await this.rateLimitCheck()

      const start = Math.floor(startDate.getTime() / 1000)
      const end = Math.floor(endDate.getTime() / 1000)

      const response = await fetch(this.buildUrl('tide', {
        station: stationId,
        begin: start,
        end,
        extremes: true,
      }))

      if (!response.ok) {
        console.warn('WorldTides extremes failed:', response.statusText)
        return { highs: [], lows: [] }
      }

      const data = await response.json() as WorldTidesExtremesApiResponse

      if (!data.extremes) return { highs: [], lows: [] }

      const highs: WorldTidesPrediction[] = []
      const lows: WorldTidesPrediction[] = []

      for (const extreme of data.extremes) {
        const pred: WorldTidesPrediction = {
          timestamp: extreme.dt * 1000,
          height: extreme.height,
          type: extreme.type === 'High' ? 'high' : 'low',
          confidence: 95,
        }

        if (extreme.type === 'High') {
          highs.push(pred)
        } else {
          lows.push(pred)
        }
      }

      return { highs, lows }
    } catch (error) {
      console.error('WorldTides extremes fetch failed:', error)
      return { highs: [], lows: [] }
    }
  }

  async getExtremesForCoordinates(
    lat: number,
    lon: number,
    startDate: Date,
    endDate: Date
  ): Promise<WorldTidesExtremes> {
    try {
      if (!this.isConfigured()) {
        return { highs: [], lows: [] }
      }

      await this.rateLimitCheck()

      const start = Math.floor(startDate.getTime() / 1000)
      const length = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000))

      const response = await fetch(this.buildUrl('', {
        extremes: true,
        lat,
        lon,
        start,
        length,
      }))

      if (!response.ok) {
        console.warn('WorldTides coordinate extremes failed:', response.statusText)
        return { highs: [], lows: [] }
      }

      const data = await response.json() as WorldTidesExtremesApiResponse

      if (!data.extremes) {
        return { highs: [], lows: [] }
      }

      const highs: WorldTidesPrediction[] = []
      const lows: WorldTidesPrediction[] = []

      for (const extreme of data.extremes) {
        const prediction: WorldTidesPrediction = {
          timestamp: extreme.dt * 1000,
          height: extreme.height,
          type: extreme.type === 'High' ? 'high' : 'low',
          confidence: 95,
        }

        if (prediction.type === 'high') {
          highs.push(prediction)
        } else {
          lows.push(prediction)
        }
      }

      return { highs, lows }
    } catch (error) {
      console.error('WorldTides coordinate extremes fetch failed:', error)
      return { highs: [], lows: [] }
    }
  }

  /**
   * Get a continuous water-level series for raw coordinates (not a
   * WorldTides station id). Used to fit constituent amplitude/phase against
   * a real reference curve -- verified against the live v3 API to return up
   * to 60 days in a single call at 30-min steps (no chunking needed at that
   * scale; a much longer request may need chunking, which is out of scope
   * here since 60 days already resolves everything except the K1/P1 and
   * K2/S2 pairs, which are inferred rather than fit directly).
   */
  async getHeightsForCoordinates(
    lat: number,
    lon: number,
    startDate: Date,
    endDate: Date,
    stepSeconds = 1800,
  ): Promise<WorldTidesPrediction[]> {
    try {
      if (!this.isConfigured()) {
        return []
      }

      await this.rateLimitCheck()

      const start = Math.floor(startDate.getTime() / 1000)
      const length = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000))

      const response = await fetch(this.buildUrl('', {
        heights: true,
        lat,
        lon,
        start,
        length,
        step: stepSeconds,
      }))

      if (!response.ok) {
        console.warn('WorldTides coordinate heights failed:', response.statusText)
        return []
      }

      const data = await response.json() as WorldTidesHeightsApiResponse

      if (!data.heights) {
        return []
      }

      return data.heights.map((h) => ({
        timestamp: h.dt * 1000,
        height: h.height,
        confidence: 95,
      }))
    } catch (error) {
      console.error('WorldTides coordinate heights fetch failed:', error)
      return []
    }
  }

  /**
   * Rate limiting helper
   */
  private async rateLimitCheck(): Promise<void> {
    this.requestCount++
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequest

    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest))
    }

    this.lastRequest = Date.now()
  }

  /**
   * Get API statistics
   */
  getStats(): {
    requestCount: number
    lastRequest: Date
  } {
    return {
      requestCount: this.requestCount,
      lastRequest: new Date(this.lastRequest),
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.requestCount = 0
    this.lastRequest = 0
  }
}

// Singleton instance
const apiKey = process.env.WORLDTIDES_API_KEY || process.env.NEXT_PUBLIC_WORLDTIDES_API_KEY || ''
export const worldTidesClient = new WorldTidesClient(apiKey)

export default worldTidesClient
