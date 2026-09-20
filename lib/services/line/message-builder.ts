import type { ForecastResult } from "@/lib/services/forecast"
import type { LocationData } from "@/lib/domain/types"
import type { DisasterAnalysis } from "@/lib/domain/disaster-analysis"
import { getRiskLevelText } from "@/lib/domain/disaster-analysis"
import type { LineMessage } from "./types"

const LINE_MAX_TEXT_LENGTH = 5000

export function buildWeatherMessages(
  location: LocationData,
  forecast: ForecastResult,
  options: { generatedAt?: Date } = {},
): LineMessage[] {
  const generatedAt = options.generatedAt ?? new Date()
  const header = `🌤️ อัปเดตสภาพอากาศ & ระดับน้ำ – ${location.name}`
  const timestamp = generatedAt.toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  })

  const lines: string[] = [header, `⏱ เวลาอัปเดต: ${timestamp}`]

  if (forecast.weatherData) {
    const weather = forecast.weatherData
    const description = weather.weather?.[0]?.description ?? "ไม่ทราบ"
    const windSpeed = weather.wind?.speed ?? 0
    lines.push(
      "",
      "🌡️ สภาพอากาศ",
      `• อุณหภูมิ ${weather.main?.temp?.toFixed?.(1) ?? "-"}°C (รู้สึก ${weather.main?.feels_like?.toFixed?.(1) ?? "-"}°C)`,
      `• ความชื้น ${weather.main?.humidity ?? "-"}% | ความกดอากาศ ${weather.main?.pressure ?? "-"} hPa`,
      `• ลม ${windSpeed.toFixed(1)} m/s – ${description}`,
    )
  } else {
    lines.push("", "🌡️ สภาพอากาศ", "• ข้อมูลยังไม่พร้อม")
  }

  if (forecast.tideData) {
    const tide = forecast.tideData
    const events = Array.isArray(tide.tideEvents) ? tide.tideEvents : []
    const nextHigh = events.find((event) => event.type === "high")
    const nextLow = events.find((event) => event.type === "low")

    lines.push(
      "",
      "🌊 ระดับน้ำ",
      `• ระดับล่าสุด ${Number.isFinite(tide.currentWaterLevel) ? tide.currentWaterLevel.toFixed(2) : "-"} เมตร (${tide.waterLevelStatus ?? "ไม่ทราบ"})`,
      `• สถานะน้ำ: ${tide.tideStatus ?? "-"} | ค่ำที่ ${tide.lunarPhaseKham ?? "-"}`,
      nextHigh ? `• น้ำขึ้นถัดไป ${nextHigh.time} (${nextHigh.level.toFixed(2)} ม.)` : "• น้ำขึ้นถัดไป: ไม่พบ",
      nextLow ? `• น้ำลงถัดไป ${nextLow.time} (${nextLow.level.toFixed(2)} ม.)` : "• น้ำลงถัดไป: ไม่พบ",
    )
  } else {
    lines.push("", "🌊 ระดับน้ำ", "• ข้อมูลยังไม่พร้อม")
  }

  if (forecast.error) {
    lines.push("", `⚠️ หมายเหตุ: ${forecast.error}`)
  }

  const text = clampText(lines.join("\n"))
  const messages: LineMessage[] = [{ type: "text", text }]

  const tip = "💡 ระบบจะส่งอัปเดตทุก 2 ชั่วโมง หรือสั่งทันทีได้ที่แดชบอร์ด Sunmoon"
  messages.push({ type: "text", text: tip })

  return messages
}

/**
 * Build a disaster-alert LINE message using the analysis's own specific
 * headline (time + level + wind) plus the top advance warning, if any.
 * Only formats data analyzeDisasterRisk already computed.
 */
export function buildDisasterAlertMessages(
  location: LocationData,
  analysis: DisasterAnalysis,
): LineMessage[] {
  const lines: string[] = [
    `🚨 แจ้งเตือนภัยชายฝั่ง – ${location.name}`,
    `ระดับความเสี่ยง: ${getRiskLevelText(analysis.riskLevel)} (${analysis.overallRating}/100)`,
  ]

  if (analysis.headline) {
    lines.push("", analysis.headline)
  }

  const topWarning = analysis.advanceWarnings[0]
  if (topWarning) {
    lines.push("", `⏱ ${topWarning.message}`)
    if (topWarning.actionRequired.length > 0) {
      lines.push(...topWarning.actionRequired.map((action) => `• ${action}`))
    }
  }

  return [{ type: "text", text: clampText(lines.join("\n")) }]
}

/**
 * The welcome text sent on a follow event. Owned here so reply.ts and the
 * webhook stay thin; the exact bytes are pinned by tests.
 */
export function buildWelcomeMessage(): LineMessage {
  return {
    type: "text",
    text: '👋 สวัสดี! ยินดีต้อนรับ 🌊 SEAPALO\n\n' +
          '━━━━━━━━━━━━━━━━━━\n' +
          '⚡ การใช้งาน:\n' +
          '📝 ทำนายน้ำ [จังหวัด]\n' +
          '   เช่น: ทำนายน้ำ ชลบุรี\n\n' +
          '📍 แชร์ GPS\n' +
          '   ระบบจะหาพื้นที่ให้อัตโนมัติ\n\n' +
          '🔗 ดูข้อมูลเต็มได้บนเว็บ\n' +
          '━━━━━━━━━━━━━━━━━━\n\n' +
          '🎯 ระดับน้ำ • อุณหภูมิ • ลมและความชื้น\n' +
          '💡 สำหรับชาวประมง ณ ทะเล',
  }
}

/**
 * The "please share a location" prompt, sent when a text command names no
 * known province.
 */
export function buildUnsupportedLocationMessage(): LineMessage {
  return {
    type: "text",
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
          '📍 หรือแชร์ตำแหน่ง GPS',
  }
}

/** The generic failure reply, sent when handling a message throws. */
export function buildErrorMessage(): LineMessage {
  return {
    type: "text",
    text: "⚠️ ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
  }
}

function clampText(text: string): string {
  if (text.length <= LINE_MAX_TEXT_LENGTH) {
    return text
  }
  return `${text.slice(0, LINE_MAX_TEXT_LENGTH - 1)}…`
}

// Weather emoji mapping helper
function getWeatherEmoji(condition: string | undefined): string {
  if (!condition) return '🌡️'

  const emojiMap: Record<string, string> = {
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '🌨️',
    'Clear': '☀️',
    'Clouds': '☁️',
    'Mist': '🌫️',
    'Fog': '🌫️'
  }

  return emojiMap[condition] || '🌡️'
}

// Format weather data for display
function formatWeatherData(weatherData: Record<string, unknown>) {
  if (!weatherData?.main || typeof weatherData.main !== 'object') {
    return {
      temp: 'ไม่ทราบ',
      feelsLike: '',
      wind: 'ไม่ทราบ',
      windGust: null,
      humidity: 'ไม่ทราบ',
      description: 'ไม่มีข้อมูล',
      emoji: '🌡️'
    }
  }

  const main = weatherData.main as Record<string, number>
  const wind = (weatherData.wind || {}) as Record<string, number>

  return {
    temp: typeof main.temp === 'number' ? Math.round(main.temp).toString() : 'ไม่ทราบ',
    feelsLike: typeof main.feels_like === 'number' ? ` (รู้สึก ${Math.round(main.feels_like)}°C)` : '',
    wind: typeof wind.speed === 'number' ? (wind.speed * 10 / 10).toString() : 'ไม่ทราบ',
    windGust: typeof wind.gust === 'number' ? (wind.gust * 10 / 10).toString() : null,
    humidity: typeof main.humidity === 'number' ? main.humidity.toString() : 'ไม่ทราบ',
    description: Array.isArray(weatherData.weather) ? (weatherData.weather as Array<{main?: string}>)[0]?.main || 'ปกติ' : 'ปกติ',
    emoji: getWeatherEmoji((weatherData.weather as Array<{main?: string}>)?.[0]?.main)
  }
}

// Validate weather data exists and is complete
function validateWeatherData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false

  const weather = data as Record<string, unknown>
  // Check if we have at least the main temperature data
  return !!(weather.main &&
          typeof weather.main === 'object' &&
          'temp' in (weather.main as object))
}

// Handle weather API errors gracefully
export function handleWeatherError(error: unknown): Record<string, unknown> {
  console.error('⚠️ Weather data unavailable:', error)
  return {
    main: { temp: null, feels_like: null, humidity: null },
    weather: [{ main: 'ไม่สามารถดึงข้อมูลได้' }],
    wind: { speed: null, gust: null }
  }
}

/**
 * Format forecast as LINE message (Brief Summary Mode)
 * Shows only essential info for quick mobile viewing
 * Users tap link to see detailed data on web
 */
export function formatForecastMessage(
  forecast: any,
  location: LocationData
): Record<string, unknown> {
  // Handle CompactFrame format (compact protocol)
  const isCompactFrame = forecast.type && forecast.tide !== undefined

  // Extract tide data
  let tideStatus: string = 'ไม่ทราบ'
  let currentHeight: number | null = null
  let pierDistance: number | null = null
  let nearestPierName: string | null = null
  let nextHighTide: { time: string; level: number } | null = null
  let nextLowTide: { time: string; level: number } | null = null

  if (isCompactFrame && forecast.tide) {
    // From CompactFrame
    const tideHeight = forecast.tide.h
    currentHeight = tideHeight
    tideStatus = forecast.tide.trend === 1 ? 'น้ำขึ้น' : forecast.tide.trend === 2 ? 'น้ำลง' : 'เสถียร'
    if (forecast.tide.ht_time !== undefined && forecast.tide.ht !== undefined) {
      nextHighTide = {
        time: new Date(Date.now() + forecast.tide.ht_time * 3600000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        level: forecast.tide.ht
      }
    }
  } else {
    // From traditional TideData format
    const tideDataLoc = (forecast.tideData as Record<string, unknown>) || {}
    tideStatus = (tideDataLoc.waterLevelStatus as string) || 'ไม่ทราบ'
    currentHeight = tideDataLoc.currentWaterLevel !== undefined
      ? (tideDataLoc.currentWaterLevel as number)
      : null
    pierDistance = tideDataLoc.pierDistance !== undefined
      ? (tideDataLoc.pierDistance as number)
      : null
    nearestPierName = (tideDataLoc.nearestPierName as string) || null

    // Extract next tide events
    const tideEvents = tideDataLoc.tideEvents as Array<{ time: string; type: string; level: number }> | undefined
    if (Array.isArray(tideEvents)) {
      for (const event of tideEvents) {
        if (event.type === 'high' && !nextHighTide) {
          nextHighTide = event
        }
        if (event.type === 'low' && !nextLowTide) {
          nextLowTide = event
        }
      }
    }
  }

  // Extract weather data
  let weatherData: Record<string, unknown> | undefined
  if (isCompactFrame && forecast.weather) {
    // Convert CompactFrame weather to standard format
    weatherData = {
      main: {
        temp: (forecast.weather.t || 0) + 10,
        feels_like: (forecast.weather.t || 0) + 10,
        humidity: forecast.weather.c || 0
      },
      weather: [{ main: 'Cloud' }],
      wind: {
        speed: (forecast.weather.w || 0) * 0.5,
        gust: (forecast.weather.w || 0) * 0.6
      }
    }
  } else {
    weatherData = (forecast.weatherData || {}) as Record<string, unknown> | undefined
  }

  if (!validateWeatherData(weatherData)) {
    console.warn('⚠️ Invalid weather data, using fallback')
    const fallbackWeather = handleWeatherError(new Error('Invalid weather format'))
    // Merge into a new safe object (do not mutate possibly-null source)
    weatherData = Object.assign({}, weatherData || {}, fallbackWeather)
  }

  const weather = formatWeatherData(weatherData || {})

  // Format display values
  const tideEmoji = tideStatus === 'น้ำขึ้น' ? '🔺' : '🔻'
  const tideLabel = tideStatus === 'น้ำขึ้น' ? 'น้ำขึ้น' : 'น้ำลง'
  const tempDisplay = weather.temp
  const feelsLikeDisplay = weather.feelsLike
  const windDisplay = weather.wind
  const windGustDisplay = weather.windGust
  const humidityDisplay = weather.humidity

  // Get weather emoji and condition text
  const weatherEmoji = weather.emoji
  const weatherText = weather.description

  // Build current water level info
  const heightInfo = typeof currentHeight === 'number' ? ` (${(currentHeight as number).toFixed(2)}ม.)` : ''

  // Build pier distance info
  const pierInfo = typeof pierDistance === 'number'
    ? `📍 ท่าเรือ: ${pierDistance < 1000 ? `${pierDistance}ม.` : `${(pierDistance / 1000).toFixed(1)}กม.`}${nearestPierName ? ` (${nearestPierName})` : ''}`
    : ''

  // Build next tide forecast
  const tideForecast = []
  if (nextHighTide) {
    tideForecast.push(`⬆️ น้ำขึ้นสูง: ${nextHighTide.time} (${nextHighTide.level.toFixed(2)}ม.)`)
  }
  if (nextLowTide) {
    tideForecast.push(`⬇️ น้ำลงต่ำ: ${nextLowTide.time} (${nextLowTide.level.toFixed(2)}ม.)`)
  }
  const tideForecastText = tideForecast.length > 0 ? tideForecast.join('\n') : ''

  // Build feels like info
  const feelsLikeText = feelsLikeDisplay ? ` (รู้สึก ${feelsLikeDisplay}°C)` : ''

  // Build web link with coordinates
  const webUrl = `https://${process.env.VERCEL_URL || 'yourdomain.com'}/forecast?lat=${location.lat}&lon=${location.lon}&mode=full`

  // Build comprehensive message
  let messageText = `🌊 ${location.name}\n` +
                   `━━━━━━━━━━━━━━━━━━\n`

  // Current status section
  messageText += `${tideEmoji} ${tideLabel}${heightInfo}\n`

  // Weather section
  messageText += `${weatherEmoji} ${weatherText} | ${tempDisplay}°C${feelsLikeDisplay}\n` +
                 `💨 ${windDisplay}m/s${windGustDisplay ? ` (ต่อ ${windGustDisplay})` : ''} | 💧 ${humidityDisplay}%\n`

  messageText += `━━━━━━━━━━━━━━━━━━\n`

  // Pier distance if available
  if (pierInfo) {
    messageText += `${pierInfo}\n\n`
  }

  // Tide forecast if available
  if (tideForecastText) {
    messageText += `📅 พยากรณ์:\n${tideForecastText}\n\n`
  }

  // Web link and instructions
  messageText += `💡 ส่ง: ทำนายน้ำ [จังหวัด]\n` +
                 `📍 หรือแชร์ GPS`

  return {
    type: 'text',
    text: messageText
  }
}