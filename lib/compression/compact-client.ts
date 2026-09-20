/**
 * 🐟 Compact Forecast Client
 * 
 * ใช้สำหรับอุปกรณ์ลูกเรือบนเรือประมง
 * - ดาวน์โหลดข้อมูลแบบบีบอัด
 * - บันทึก Offline
 * - ส่งข้อมูลแบบ Batch
 */

import { decompressForecast, type CompactFrame } from '@/lib/compression/compact-protocol'
import type { LocationData } from '@/lib/domain/types'

function normalizeBaseUrl(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/+$/, '')
  }

  return `https://${trimmed.replace(/\/+$/, '')}`
}

function resolveRuntimeBaseUrl(explicitBase: string): string {
  const normalizedExplicit = normalizeBaseUrl(explicitBase)
  if (normalizedExplicit) return normalizedExplicit

  const candidates = [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_API_URL,
    process.env.VERCEL_URL,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate)
    if (normalized) return normalized
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }

  // Final fallback for local dev / testing environments
  return 'http://127.0.0.1:3000'
}

export class CompactForecastClient {
  private baseUrl: string
  private lastLocation?: { lat: number; lon: number; name?: string }
  private cache: Map<string, CompactFrame> = new Map()
  
  constructor(baseUrl: string = '') {
    this.baseUrl = normalizeBaseUrl(baseUrl)
  }

  private getBaseUrl(): string {
    this.baseUrl = resolveRuntimeBaseUrl(this.baseUrl)
    return this.baseUrl
  }
  
  /**
   * ดาวน์โหลดข้อมูลแบบบีบอัด
   */
  async fetchCompactForecast(
    lat: number,
    lon: number,
    options?: {
      debug?: boolean
      timeout?: number
    }
  ): Promise<{
    data: CompactFrame
    stats?: {
      originalSize: number
      compressedSize: number
      ratio: number
      estimatedTimeMs: number
    }
    error?: string
  }> {
    try {
      const baseUrl = this.getBaseUrl()
      const url = new URL('/api/forecast/compact', `${baseUrl}/`)
      url.searchParams.set('lat', lat.toString())
      url.searchParams.set('lon', lon.toString())
      url.searchParams.set('format', 'compact')
      
      if (options?.debug) {
        url.searchParams.set('debug', 'true')
      }
      
      const controller = new AbortController()
      const timeout = options?.timeout || 10000
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/octet-stream',
        },
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const error = await response.json()
        return { 
          data: { type: 'ping', timestamp: Date.now() },
          error: error.error 
        }
      }
      
      // Debug mode: return JSON
      if (options?.debug) {
        const data = await response.json()
        return {
          data: data.decoded,
          stats: data.stats,
        }
      }
      
      // Decompress binary data
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const data = decompressForecast(uint8Array, this.lastLocation as LocationData | undefined)
      
      // Cache location
      if (data.loc) {
        this.lastLocation = { ...data.loc, name: 'Unknown' }
      }
      
      // Cache data
      const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`
      this.cache.set(cacheKey, data)
      
      // Extract stats from response headers
      const originalSize = parseInt(response.headers.get('X-Original-Size') || '0')
      const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0')
      const ratio = parseFloat(response.headers.get('X-Compression-Ratio') || '0')
      
      return {
        data,
        stats: {
          originalSize,
          compressedSize,
          ratio,
          estimatedTimeMs: (compressedSize * 8) / 1_000_000 * 1000,
        },
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: { type: 'ping', timestamp: Date.now() },
        error: `Failed to fetch compact forecast: ${errorMsg}`,
      }
    }
  }
  
  /**
   * บันทึกข้อมูล Offline เพื่อการใช้ต่อมา
   */
  async saveForOffline(lat: number, lon: number): Promise<void> {
    const result = await this.fetchCompactForecast(lat, lon)
    
    if (!result.error && 'localStorage' in globalThis) {
      const cacheKey = `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}`
      const stored = {
        data: result.data,
        timestamp: Date.now(),
        stats: result.stats,
      }
      localStorage.setItem(cacheKey, JSON.stringify(stored))
    }
  }
  
  /**
   * อ่านข้อมูล Offline
   */
  getOfflineData(lat: number, lon: number): CompactFrame | null {
    const cacheKey = `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}`
    
    if ('localStorage' in globalThis) {
      const stored = localStorage.getItem(cacheKey)
      if (stored) {
        try {
          const { data } = JSON.parse(stored)
          return data
        } catch {
          return null
        }
      }
    }
    
    return null
  }
  
  /**
   * ตรวจสอบข้อมูลว่า outdated หรือไม่
   */
  isDataStale(timestamp: number, maxAgeSec: number = 1800): boolean {
    const ageSeconds = (Date.now() / 1000) - timestamp
    return ageSeconds > maxAgeSec
  }
  
  /**
   * ส่งข้อมูล Batch - useful สำหรับ offline upload
   */
  async uploadBatchData(frames: CompactFrame[]): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = this.getBaseUrl()
      const response = await fetch(`${baseUrl}/api/forecast/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frames }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error }
      }
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }
  
  /**
   * ดาวน์โหลดเส้นทาง (multiple points)
   */
  async fetchRoute(points: Array<{ lat: number; lon: number }>): Promise<{
    data: CompactFrame[]
    stats: { totalSize: number; averageRatio: number }
    error?: string
  }> {
    try {
      const results = await Promise.all(
        points.map(p => this.fetchCompactForecast(p.lat, p.lon))
      )
      
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        return {
          data: [],
          stats: { totalSize: 0, averageRatio: 0 },
          error: `Failed to fetch ${errors.length} points`,
        }
      }
      
      const data = results.map(r => r.data)
      const totalSize = results.reduce((sum, r) => sum + (r.stats?.compressedSize || 0), 0)
      const averageRatio = 
        results.reduce((sum, r) => sum + (r.stats?.ratio || 0), 0) / results.length
      
      return {
        data,
        stats: { totalSize, averageRatio },
      }
    } catch (error) {
      return {
        data: [],
        stats: { totalSize: 0, averageRatio: 0 },
        error: error instanceof Error ? error.message : 'Route fetch failed',
      }
    }
  }
  
  /**
   * Format ข้อมูลสำหรับแสดง UI
   */
  formatForDisplay(frame: CompactFrame): {
    waterHeight: string
    trend: string
    temperature: string
    windSpeed: string
    timestamp: string
    status: string
  } {
    return {
      waterHeight: frame.tide ? `${frame.tide.h.toFixed(1)} m` : 'N/A',
      trend: frame.tide 
        ? (frame.tide.trend === 1 ? '📈 ขึ้น' : frame.tide.trend === 2 ? '📉 ลง' : '➡️ เท่า')
        : 'N/A',
      temperature: frame.weather ? `${frame.weather.t}°C` : 'N/A',
      windSpeed: frame.weather ? `${frame.weather.w} m/s` : 'N/A',
      timestamp: new Date(frame.timestamp * 1000).toLocaleString('th-TH'),
      status: this.isDataStale(frame.timestamp) ? '⚠️ Stale' : '✅ Fresh',
    }
  }
}

/**
 * Singleton instance
 */
export const compactClient = new CompactForecastClient(
  process.env.NEXT_PUBLIC_API_URL || ''
)
