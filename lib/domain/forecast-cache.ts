/**
 * Forecast cache seam.
 *
 * `useForecastData` used to inline cache read/write, the data-shape guards
 * (`isTideData` / `isWeatherData`) and the refresh policy (location debounce +
 * tide-cycle interval). None of that needs React, so it lives here and the
 * hook keeps only its state / effect wiring.
 */

import type { TideData, WeatherData } from "./types";
import {
  loadTideDataCache,
  loadWeatherDataCache,
  saveTideDataCache,
  saveWeatherDataCache,
} from "@/lib/storage/offline-storage";

export const defaultTideData: TideData = {
  isWaxingMoon: true,
  lunarPhaseKham: 0,
  tideStatus: "น้ำตาย",
  highTideTime: "N/A",
  lowTideTime: "N/A",
  isSeaLevelHighToday: false,
  currentWaterLevel: 0,
  waterLevelStatus: "ไม่ทราบ",
  waterLevelReference: "ไม่ทราบแหล่งอ้างอิง",
  seaLevelRiseReference: "ไม่ทราบแหล่งอ้างอิง",
  pierDistance: 0,
  pierReference: "ไม่ทราบแหล่งอ้างอิง",
  tideEvents: [],
  timeRangePredictions: [],
  graphData: [],
  apiStatus: "error",
  apiStatusMessage: "ไม่มีข้อมูล",
  lastUpdated: new Date().toISOString(),
};

export const defaultWeatherData: WeatherData = {
  main: { temp: 0, feels_like: 0, humidity: 0, pressure: 0 },
  weather: [{ description: "ไม่ทราบ", icon: "01d" }],
  wind: { speed: 0, deg: 0 },
  name: "ไม่ทราบ",
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isTideData = (value: unknown): value is TideData => {
  if (!isRecord(value)) return false;
  return (
    typeof value.tideStatus === "string" &&
    typeof value.apiStatus === "string" &&
    typeof value.apiStatusMessage === "string" &&
    typeof value.currentWaterLevel === "number"
  );
};

export const isWeatherData = (value: unknown): value is WeatherData => {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.main) &&
    typeof value.main.temp === "number" &&
    Array.isArray(value.weather) &&
    value.weather.length > 0 &&
    isRecord(value.weather[0]) &&
    typeof value.weather[0].description === "string" &&
    isRecord(value.wind) &&
    typeof value.wind.speed === "number"
  );
};

export type ForecastCacheSnapshot = {
  tideData: TideData | null;
  weatherData: WeatherData | null;
};

/** Read and validate the cached tide/weather pair for a location + date. */
export function readForecastCache(
  lat: number,
  lon: number,
  date: Date | undefined,
): ForecastCacheSnapshot {
  return {
    tideData: readTideCache(lat, lon, date),
    weatherData: readWeatherCache(lat, lon),
  };
}

/** Read + validate cached tide data (null when absent or malformed). */
export function readTideCache(
  lat: number,
  lon: number,
  date: Date | undefined,
): TideData | null {
  const raw = loadTideDataCache(lat, lon, date);
  return isTideData(raw) ? raw : null;
}

/** Read + validate cached weather data (null when absent or malformed). */
export function readWeatherCache(lat: number, lon: number): WeatherData | null {
  const raw = loadWeatherDataCache(lat, lon);
  return isWeatherData(raw) ? raw : null;
}

/** Persist a fresh tide/weather pair for a location + date. */
export function writeForecastCache(
  lat: number,
  lon: number,
  date: Date | undefined,
  tideData: TideData,
  weatherData: WeatherData,
): void {
  saveTideDataCache(lat, lon, date, tideData);
  saveWeatherDataCache(lat, lon, weatherData);
}

/** Error-shaped tide payload used when neither cache nor network yielded data. */
export function buildErrorTideData(message: string): TideData {
  return {
    ...defaultTideData,
    apiStatus: "error",
    apiStatusMessage: message,
    lastUpdated: new Date().toISOString(),
  };
}

/** Debounce applied before refetching when the coordinates change. */
export const LOCATION_REFRESH_DEBOUNCE_MS = 500;

/** Auto-refresh policy: spring tides ("น้ำเป็น") refresh twice as often. */
export function getRefreshIntervalMs(
  tideStatus: TideData["tideStatus"] | string | undefined,
): number {
  return tideStatus === "น้ำเป็น" ? 15 * 60 * 1000 : 30 * 60 * 1000;
}
