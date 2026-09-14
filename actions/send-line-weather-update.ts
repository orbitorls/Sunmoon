"use server"

import type { LocationData } from "@/lib/tide-service"
import { dispatchWeatherUpdate, type WeatherDispatchResult } from "@/lib/services/line/weather-dispatch"

export type SendLineWeatherUpdateInput = {
  location?: LocationData
  userIds?: string[]
  broadcast?: boolean
}

export async function sendLineWeatherUpdate(input: SendLineWeatherUpdateInput = {}): Promise<WeatherDispatchResult> {
  return dispatchWeatherUpdate({
    location: input.location,
    userIds: input.userIds,
    broadcast: input.broadcast,
  })
}
