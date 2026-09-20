"use server";

import type { LocationData } from "@/lib/domain/types";
import { fetchForecast, type ForecastResult } from "@/lib/services/forecast";

export type { ForecastResult };

export async function getLocationForecast(
  location: LocationData,
  date: Date = new Date(),
): Promise<ForecastResult> {
  return fetchForecast(location, { date });
}
