"use server"

import type { LocationData } from "@/lib/domain/types"
import { dispatchWeatherUpdate, type WeatherDispatchResult } from "@/lib/services/line-service"

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
