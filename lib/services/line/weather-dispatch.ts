import type { LocationData } from "@/lib/tide-service"
import { fetchForecast } from "@/lib/services/forecast"
import { analyzeDisasterRisk } from "@/lib/disaster-analysis"
import { broadcast, multicast, push } from "./client"
import { getDefaultLineLocation } from "./config"
import { buildWeatherMessages, buildDisasterAlertMessages } from "./message-builder"
import { addSubscriber, listSubscribers } from "./subscriber-store"
import type { LineMessage } from "./types"

// ระดับความเสี่ยงที่จะถือว่า "มีนัยสำคัญพอจะดัน LINE alert" ใช้ threshold เดียวกับ
// analyzeDisasterRisk (riskLevel high/high = adjustedRisk >= 50) ไม่สร้าง threshold ใหม่
const DISASTER_PUSH_RISK_LEVELS = new Set(["high", "critical"])

const MULTICAST_LIMIT = 500

export type WeatherDispatchOptions = {
  location?: LocationData
  userIds?: string[]
  broadcast?: boolean
  includeSeeded?: boolean
}

export type WeatherDispatchResult = {
  location: LocationData
  targetCount: number
  broadcast: boolean
  messages: LineMessage[]
}

export async function dispatchWeatherUpdate(options: WeatherDispatchOptions = {}): Promise<WeatherDispatchResult> {
  const location = options.location ?? getDefaultLineLocation()
  const forecast = await fetchForecast(location)
  const messages = buildWeatherMessages(location, forecast)

  if (forecast.tideData && forecast.weatherData) {
    const analysis = analyzeDisasterRisk(forecast.tideData, forecast.weatherData, new Date(), location.name)
    if (DISASTER_PUSH_RISK_LEVELS.has(analysis.riskLevel)) {
      messages.push(...buildDisasterAlertMessages(location, analysis))
    }
  }

  if (options.broadcast) {
    await broadcast(messages)
    return {
      location,
      targetCount: 0,
      broadcast: true,
      messages,
    }
  }

  let recipients: string[] = []
  if (options.userIds && options.userIds.length > 0) {
    recipients = options.userIds
  } else {
    const subscribers = await listSubscribers()
    recipients = subscribers.map((subscriber) => subscriber.userId)
  }

  // Remove duplicates and falsy values
  const uniqueRecipients = Array.from(new Set(recipients.filter(Boolean)))

  if (uniqueRecipients.length === 0) {
    return {
      location,
      targetCount: 0,
      broadcast: false,
      messages,
    }
  }

  for (const group of chunkArray(uniqueRecipients, MULTICAST_LIMIT)) {
    if (group.length === 1) {
      await push(group[0]!, messages)
    } else {
      await multicast(group, messages)
    }
  }

  return {
    location,
    targetCount: uniqueRecipients.length,
    broadcast: false,
    messages,
  }
}

export async function ensureSubscriber(userId: string): Promise<void> {
  if (!userId) return
  await addSubscriber({ userId })
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}
