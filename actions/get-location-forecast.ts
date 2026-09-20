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

/**
 * Batched multi-day forecast: a single server-action call returns one
 * ForecastResult per requested date, so the client no longer fires N staggered
 * requests. Each date runs the exact same `fetchForecast` pipeline the
 * single-day action uses (so per-day output is unchanged), and the per-day
 * forecasts are resolved concurrently instead of waiting out an artificial
 * stagger. The single-day `getLocationForecast` remains untouched for existing
 * callers.
 */
export async function getLocationForecastRange(
  location: LocationData,
  dates: Date[],
): Promise<ForecastResult[]> {
  return Promise.all(dates.map((date) => fetchForecast(location, { date })));
}
