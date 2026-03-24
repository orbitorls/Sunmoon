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
  extremes?: Array<{ timestamp: number; height: number; type: string }>
}

type WorldTidesStationApiResponse = {
  stations?: Array<{ id: string; name: string; lat: number; lon: number }>
}

type WorldTidesHeightsApiResponse = {
  heights?: Array<{ timestamp: number; height: number }>
}

/**
 * WorldTides API client
 * Docs: https://www.worldtides.info/api
 */
export class WorldTidesClient {
  private apiKey: string
  private baseUrl = 'https://www.worldtides.info/api/v3'
  private requestCount = 0
  private lastRequest = 0
  private requestDelay = 100 // ms between requests (rate limiting)

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0
  }

  private buildUrl(path: string, params: Record<string, string | number | boolean>): string {
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value))
    }

    if (this.isConfigured()) {
      searchParams.set('key', this.apiKey)
    }

    return `${this.baseUrl}/${path}?${searchParams.toString()}`
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
        timestamp: h.timestamp * 1000, // Convert to ms
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
          timestamp: extreme.timestamp * 1000,
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
          timestamp: extreme.timestamp * 1000,
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
