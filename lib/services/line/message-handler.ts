import { compactClient } from '@/lib/compression/compact-client'
import type { LocationData } from '@/lib/domain/types'

import { formatForecastMessage } from './message-builder'
import { sendLineMessage } from './reply'

// In-memory cache for user's last selected location
// In production, this should be stored in a database
const userLocationCache = new Map<string, LocationData>()

// Thai locations mapping
const LOCATION_MAP: Record<string, LocationData> = {
  // Southern Thailand - Main Fishing Areas
  'ภูเก็ต': { lat: 8.627, lon: 98.398, name: 'ภูเก็ต' },
  'ระยอง': { lat: 6.8495, lon: 101.9674, name: 'ระยอง' },
  'หาดใหญ่': { lat: 7.1973, lon: 100.4734, name: 'หาดใหญ่' },
  'สตูล': { lat: 6.6288, lon: 100.0742, name: 'สตูล' },
  'ชุมพร': { lat: 8.6682, lon: 99.1807, name: 'ชุมพร' },
  'กระบี่': { lat: 8.627, lon: 98.814, name: 'กระบี่' },
  'สงขลา': { lat: 7.1906, lon: 100.6087, name: 'สงขลา' },
  'พังงา': { lat: 8.4304, lon: 98.5298, name: 'พังงา' },
  'ตรัง': { lat: 7.5589, lon: 99.6259, name: 'ตรัง' },

  // Eastern Thailand
  'ชลบุรี': { lat: 13.361, lon: 100.984, name: 'ชลบุรี' },
  'ระนอง': { lat: 9.969, lon: 98.629, name: 'ระนอง' },
  'บันฉุง': { lat: 11.933, lon: 100.073, name: 'บันฉุง' },
  'กำแพงแสน': { lat: 13.202, lon: 99.981, name: 'กำแพงแสน' },
  'เพชรบุรี': { lat: 12.831, lon: 99.787, name: 'เพชรบุรี' },
  'ประจวบคีรีขันธ์': { lat: 11.811, lon: 99.807, name: 'ประจวบคีรีขันธ์' },

  // Alternative names
  'เกาะสมุย': { lat: 8.6391, lon: 100.3348, name: 'เกาะสมุย' },
  'ภูมิพล': { lat: 17.3, lon: 104.6, name: 'ภูมิพล' },
  'ทะเบียน': { lat: 14.8, lon: 104.1, name: 'ทะเบียน' },

  // Common spelling variations
  'ชลบุรีศรีราชา': { lat: 13.361, lon: 100.984, name: 'ชลบุรี' },
  'ระยองมาบแจ': { lat: 6.8495, lon: 101.9674, name: 'ระยอง' },
}

export interface LineEvent {
  type: string
  message?: {
    type: string
    text?: string
    latitude?: number
    longitude?: number
    title?: string
  }
  replyToken: string
  source?: {
    userId?: string
  }
}

/**
 * Get user ID from event
 */
function getUserId(event: LineEvent): string | null {
  return event.source?.userId || null
}

/**
 * Main message handler
 */
export async function handleLineMessage(event: LineEvent): Promise<void> {
  try {
    if (!event.message) {
      console.log('⚠️ No message in event')
      return
    }

    const userId = getUserId(event)

    if (event.message.type === 'text') {
      console.log('📝 Processing text message')
      await handleTextMessage(event, userId)
    } else if (event.message.type === 'location') {
      console.log('📍 Processing location message')
      await handleLocationMessage(event, userId)
    } else {
      console.log(`⚠️ Unsupported message type: ${event.message.type}`)
    }
  } catch (error) {
    console.error('❌ Error handling LINE message:', error)
    try {
      await sendLineMessage(event.replyToken, [
        {
          type: 'text',
          text: '⚠️ ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
        }
      ])
    } catch (sendError) {
      console.error('❌ Failed to send error message:', sendError)
    }
  }
}

/**
 * Handle text messages with location extraction
 */
async function handleTextMessage(event: LineEvent, userId: string | null): Promise<void> {
  const text = event.message?.text || ''
  let location = parseLocationFromText(text)

  // If no location found and we have a Rich Menu button click, use last location
  if (!location && userId && userLocationCache.has(userId)) {
    console.log('💾 Using cached location from Rich Menu')
    location = userLocationCache.get(userId) || null
  }

  if (!location) {
    await sendLineMessage(event.replyToken, [
      {
        type: 'text',
        text: '🌊 โปรดแจ้งสถานที่\n\n' +
              '━━━━━━━━━━━━━━━━━━\n' +
              '📍 จังหวัดที่รองรับ:\n\n' +
              '🔵 ภาคใต้:\n' +
              'ภูเก็ต • ระยอง • หาดใหญ่\n' +
              'สตูล • ชุมพร • กระบี่\n' +
              'สงขลา • พังงา • ตรัง\n\n' +
              '🔵 ภาคตะวันออก:\n' +
              'ชลบุรี • ระนอง • บันฉุง\n' +
              'กำแพงแสน • เพชรบุรี • ประจวบฯ\n\n' +
              '🔵 เกาะและอื่นๆ:\n' +
              'เกาะสมุย • ชลบุรีศรีราชา\n\n' +
              '━━━━━━━━━━━━━━━━━━\n' +
              '💡 ลองใหม่: ทำนายน้ำ ชลบุรี\n' +
              '📍 หรือแชร์ตำแหน่ง GPS'
      }
    ])
    return
  }

  // Save location to cache
  if (userId) {
    userLocationCache.set(userId, location)
    console.log(`💾 Saved location for user: ${location.name}`)
  }

  // Fetch compact forecast
  const forecastResult = await compactClient.fetchCompactForecast(
    location.lat,
    location.lon
  )

  if (forecastResult.error) {
    console.warn(`⚠️ Forecast error: ${forecastResult.error}`)
  }

  const message = formatForecastMessage(forecastResult.data, location)
  await sendLineMessage(event.replyToken, [message])
}

/**
 * Handle location messages with GPS coordinates
 */
async function handleLocationMessage(event: LineEvent, userId: string | null): Promise<void> {
  const msg = event.message
  if (!msg?.latitude || !msg?.longitude) return

  const location: LocationData = {
    lat: msg.latitude,
    lon: msg.longitude,
    name: msg.title || `📍 ${msg.latitude.toFixed(2)}°N ${msg.longitude.toFixed(2)}°E`
  }

  // Save location to cache
  if (userId) {
    userLocationCache.set(userId, location)
    console.log(`💾 Saved GPS location for user: ${location.name}`)
  }

  // Fetch compact forecast
  const forecastResult = await compactClient.fetchCompactForecast(
    location.lat,
    location.lon
  )

  if (forecastResult.error) {
    console.warn(`⚠️ Forecast error: ${forecastResult.error}`)
  }

  const message = formatForecastMessage(forecastResult.data, location)
  await sendLineMessage(event.replyToken, [message])
}

/**
 * Parse location from Thai text
 */
function parseLocationFromText(text: string): LocationData | null {
  const cleanText = text.toLowerCase().trim()

  // Try exact match first
  for (const [name, location] of Object.entries(LOCATION_MAP)) {
    if (cleanText.includes(name.toLowerCase())) {
      return location
    }
  }

  // Try pattern: "ทำนายน้ำ ..." or "สภาอากาศ ..."
  const parts = text.split(/\s+/)
  if (parts.length >= 2) {
    const place = parts[parts.length - 1]
    const location = LOCATION_MAP[place]
    if (location) return location
  }

  return null
}