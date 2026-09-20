/**
 * 🐟 Compact Protocol - ระบบบีบอัดข้อมูลสำหรับชาวประมงกลางทะเล
 * 
 * วัตถุประสงค์:
 * - ลดขนาดข้อมูลจาก ~2KB เหลือ ~200 bytes (90% compression)
 * - ใช้สัญญาณ 4G/LTE อ่อนได้
 * - รองรับการส่งข้อมูลแบบ Batch
 */

import type { TideData, WeatherData, LocationData } from "@/lib/domain/types"

/**
 * Compact Frame Format
 * 
 * Header (1 byte): [Version(3 bits) | Type(3 bits) | Flags(2 bits)]
 * 
 * Types:
 * - 0x0: Tide data only
 * - 0x1: Weather only
 * - 0x2: Tide + Weather
 * - 0x3: Alert (Tsunami/Storm)
 * - 0x4: Status ping
 * - 0x5: Batch data
 */

export interface CompactFrame {
  // Header info
  type: 'tide' | 'weather' | 'combined' | 'alert' | 'ping' | 'batch'
  timestamp: number // Unix timestamp in seconds (2 bytes)
  
  // Location (optional, if changed)
  loc?: {
    lat: number // float16 (1 byte)
    lon: number // float16 (1 byte)
  }
  
  // Tide data
  tide?: {
    h: number      // Current height (1 byte: 0-300cm encoded)
    trend: number  // 0=stable, 1=rising, 2=falling (1 bit)
    ht?: number    // High tide height (1 byte, optional)
    ht_time?: number // Hours until high tide (1 byte, optional)
  }
  
  // Weather data
  weather?: {
    t: number      // Temperature -10..50°C → 0..60 (1 byte)
    w: number      // Wind speed 0-20 m/s (1 byte)
    c: number      // Cloud coverage 0-100% (1 byte)
    wd: number     // Wind direction 0-359° (1 byte)
  }
  
  // Signal strength
  signal?: number // 0-5 bars
  
  // Battery level
  battery?: number // 0-100%
}

/**
 * Float16 Encoding (1 byte, 0-359°)
 * Compress longitude/latitude to 1 byte with 0.5° precision
 */
export function encodeFloat16(value: number, min: number, max: number): number {
  const normalized = (value - min) / (max - min)
  return Math.max(0, Math.min(255, Math.round(normalized * 255)))
}

export function decodeFloat16(encoded: number, min: number, max: number): number {
  const normalized = encoded / 255
  return min + normalized * (max - min)
}

/**
 * Encode Tide Height (0-300cm)
 */
export function encodeTideHeight(cm: number): number {
  return Math.max(0, Math.min(255, Math.round((cm + 50) / 1.4)))
}

export function decodeTideHeight(encoded: number): number {
  return encoded * 1.4 - 50
}

/**
 * Main Compression Function
 */
export function compressForecast(
  location: LocationData,
  tideData: TideData | null,
  weatherData: WeatherData | null,
  lastLocation?: LocationData,
): Uint8Array {
  const buffer: number[] = []
  
  // 1. Determine type and create header
  let typeCode = 0x4 // default: ping
  if (tideData && weatherData) typeCode = 0x2
  else if (tideData) typeCode = 0x0
  else if (weatherData) typeCode = 0x1

  let flags = 0
  const headerIndex = buffer.length
  buffer.push(0) // placeholder until flags known
  
  // 2. Timestamp (2 bytes, little-endian)
  const ts = Math.floor(Date.now() / 1000)
  buffer.push(ts & 0xFF, (ts >> 8) & 0xFF)
  
  // 3. Location (only if changed)
  const locChanged = !lastLocation || 
    Math.abs(location.lat - lastLocation.lat) > 0.01 ||
    Math.abs(location.lon - lastLocation.lon) > 0.01
  
  if (locChanged) {
    flags |= 0x1
    buffer.push(encodeFloat16(location.lat, 1, 20))    // Thailand latitude
    buffer.push(encodeFloat16(location.lon, 97, 106))  // Thailand longitude
  }
  
  // 4. Tide data
  if (tideData) {
    const height = tideData.currentWaterLevel ?? 0
    buffer.push(encodeTideHeight(height))
    
    // Trend (1 bit) - based on waterLevelStatus
    let trend = 0
    if (tideData.waterLevelStatus === 'น้ำขึ้น') trend = 1
    else if (tideData.waterLevelStatus === 'น้ำลง') trend = 2
    buffer.push(trend)
    
    // High tide info (optional)
    if (tideData.highTideTime) {
      flags |= 0x2
      // Parse HH:MM format
      const htHeight = encodeTideHeight(2.0) // default high tide height
      const parts = tideData.highTideTime.split(':')
      const hours = parseInt(parts[0]) || 0
      const htTime = Math.min(255, Math.max(0, hours))
      buffer.push(htHeight)
      buffer.push(htTime)
    }
  }
  
  // 5. Weather data
  if (weatherData) {
    const temp = Math.round(weatherData.main?.temp ?? 25) + 10 // shift to 0-60
    const wind = Math.round(weatherData.wind?.speed ?? 0)
    const humidity = Math.round(weatherData.main?.humidity ?? 50)
    const windDir = Math.round(weatherData.wind?.deg ?? 0)
    
    buffer.push(Math.max(0, Math.min(255, temp)))
    buffer.push(Math.max(0, Math.min(255, wind)))
    buffer.push(Math.max(0, Math.min(255, humidity)))
    buffer.push(Math.max(0, Math.min(255, windDir)))
  }

  // Finalize header with version + type + flags
  const header = (0 << 6) | (typeCode << 3) | (flags & 0x3)
  buffer[headerIndex] = header

  return new Uint8Array(buffer)
}

/**
 * Main Decompression Function
 */
export function decompressForecast(data: Uint8Array, lastLocation?: LocationData): CompactFrame {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let offset = 0
  const readByte = () => {
    if (offset >= data.length) return 0
    return view.getUint8(offset++)
  }
  
  // 1. Parse header
  const header = readByte()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const version = (header >> 6) & 0x3
  const typeCode = (header >> 3) & 0x7
  const flags = header & 0x3
  
  const typeMap = ['tide', 'weather', 'combined', 'alert', 'ping', 'batch'] as const
  const type = typeMap[typeCode] ?? 'ping'
  
  // 2. Parse timestamp (little-endian)
  const tsLow = readByte()
  const tsHigh = readByte()
  const tsRaw = tsLow | (tsHigh << 8)
  const nowSeconds = Math.floor(Date.now() / 1000)
  const base = nowSeconds & ~0xffff
  const candidates = [
    base | tsRaw,
    (base | tsRaw) - 0x10000,
    (base | tsRaw) + 0x10000,
  ]
  let timestampSeconds = candidates[0]
  for (const candidate of candidates) {
    if (Math.abs(candidate - nowSeconds) < Math.abs(timestampSeconds - nowSeconds)) {
      timestampSeconds = candidate
    }
  }
  const timestamp = timestampSeconds
  
  // 3. Location
  let loc: { lat: number; lon: number } | undefined
  const hasLocation = (flags & 0x1) !== 0
  const hasHighTide = (flags & 0x2) !== 0
  if (hasLocation && data.length - offset >= 2) {
    const latEnc = readByte()
    const lonEnc = readByte()
    loc = {
      lat: decodeFloat16(latEnc, 1, 20),
      lon: decodeFloat16(lonEnc, 97, 106),
    }
  } else if (lastLocation) {
    loc = { lat: lastLocation.lat, lon: lastLocation.lon }
  }
  
  // 4. Tide data
  let tide: CompactFrame['tide'] | undefined
  if (typeCode === 0x0 || typeCode === 0x2) {
    const heightEnc = readByte()
    const h = decodeTideHeight(heightEnc)
    const trend = readByte()
    
    tide = { h, trend }
    
    // High tide info
    if (hasHighTide && data.length - offset >= 2) {
      const htHeight = decodeTideHeight(readByte())
      const htTime = readByte()
      tide.ht = htHeight
      tide.ht_time = htTime
    }
  }
  
  // 5. Weather data
  let weather: CompactFrame['weather'] | undefined
  if (typeCode === 0x1 || typeCode === 0x2) {
    const t = readByte() - 10
    const w = readByte()
    const c = readByte()
    const wd = readByte()
    
    weather = { t, w, c, wd }
  }
  
  return {
    type,
    timestamp,
    loc,
    tide,
    weather,
  }
}

/**
 * Batch Compression - ส่งข้อมูลหลายจุดพร้อมกัน
 */
export function compressBatch(frames: Uint8Array[]): Uint8Array {
  const batches = [0x05 << 3] // Type: batch
  
  // Add count (1 byte)
  batches.push(Math.min(255, frames.length))
  
  // Add all frames
  for (const frame of frames) {
    batches.push(...Array.from(frame))
  }
  
  return new Uint8Array(batches)
}

/**
 * Signal Strength Optimization
 * ขึ้นอยู่กับสัญญาณ ปรับขนาดข้อมูล
 */
export function selectCompressionLevel(signalStrength: number): 'minimal' | 'compact' | 'full' {
  // 0-2 bars: minimal data only
  // 2-4 bars: compact format
  // 4-5 bars: full data
  
  if (signalStrength <= 2) return 'minimal'
  if (signalStrength <= 4) return 'compact'
  return 'full'
}

/**
 * ขนาดข้อมูลประมาณ:
 * - Original: ~2000 bytes
 * - Compressed: ~40-80 bytes (98% compression)
 * 
 * เวลาส่ง LTE ที่ 1 Mbps:
 * - Original: 16 ms
 * - Compressed: 0.3 ms
 */
export function estimateCompressionStats(original: Record<string, unknown>, compressed: Uint8Array): {
  originalSize: number
  compressedSize: number
  ratio: number
  estimatedTimeMs: number
} {
  const originalSize = JSON.stringify(original).length
  const compressedSize = compressed.byteLength
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
  
  // Assume 1 Mbps connection
  const estimatedTimeMs = (compressedSize * 8) / 1_000_000 * 1000
  
  return {
    originalSize,
    compressedSize,
    ratio: parseFloat(ratio),
    estimatedTimeMs,
  }
}
