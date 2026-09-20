"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getLocationForecast } from "@/actions/get-location-forecast";
import type { LocationData, TideData, WeatherData } from "@/lib/domain/types";
import { loadTideDataCache, saveTideDataCache, loadWeatherDataCache, saveWeatherDataCache, initializeOfflineStorage } from "@/lib/offline-storage";

const defaultTideData: TideData = {
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

const defaultWeatherData: WeatherData = {
  main: { temp: 0, feels_like: 0, humidity: 0, pressure: 0 },
  weather: [{ description: "ไม่ทราบ", icon: "01d" }],
  wind: { speed: 0, deg: 0 },
  name: "ไม่ทราบ",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTideData = (value: unknown): value is TideData => {
  if (!isRecord(value)) return false;
  return (
    typeof value.tideStatus === "string" &&
    typeof value.apiStatus === "string" &&
    typeof value.apiStatusMessage === "string" &&
    typeof value.currentWaterLevel === "number"
  );
};

const isWeatherData = (value: unknown): value is WeatherData => {
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

export type ForecastDataResult = {
  tideData: TideData;
  weatherData: WeatherData;
  loading: boolean;
  refresh: () => void;
};

export function useForecastData(
  location: LocationData,
  date: Date | undefined,
  isHydrated: boolean,
): ForecastDataResult {
  const [tideData, setTideData] = useState<TideData>(defaultTideData);
  const [weatherData, setWeatherData] = useState<WeatherData>(defaultWeatherData);
  const [loading, setLoading] = useState(true);

  const fetchForecastData = useCallback(async () => {
    if (!isHydrated || !location) return;

    setLoading(true);
    let cachedTideData: TideData | null = null;
    let cachedWeatherData: WeatherData | null = null;

    try {
      const tideCacheRaw = loadTideDataCache(location.lat, location.lon, date);
      if (isTideData(tideCacheRaw)) {
        cachedTideData = tideCacheRaw;
      }

      const weatherCacheRaw = loadWeatherDataCache(location.lat, location.lon);
      if (isWeatherData(weatherCacheRaw)) {
        cachedWeatherData = weatherCacheRaw;
      }

      if (cachedTideData && cachedWeatherData) {
        console.log("Loading data from cache...");
        setTideData({
          ...cachedTideData,
          isFromCache: true,
          apiStatusMessage: "ข้อมูลจากแคช (ออฟไลน์)",
        });
        setWeatherData(cachedWeatherData);
      }

      const result = await getLocationForecast(location, date || new Date());

      if (result?.tideData && result?.weatherData) {
        saveTideDataCache(location.lat, location.lon, date || new Date(), result.tideData);
        saveWeatherDataCache(location.lat, location.lon, result.weatherData);

        setTideData({ ...result.tideData, isFromCache: false });
        setWeatherData(result.weatherData);
      } else {
        const fallbackMessage = result?.error || "ไม่พบข้อมูล";

        if (cachedTideData) {
          setTideData({
            ...cachedTideData,
            isFromCache: true,
            apiStatusMessage: "ข้อมูลจากแคช (API ล้มเหลว)",
          });
        } else {
          setTideData({
            ...defaultTideData,
            apiStatus: "error",
            apiStatusMessage: fallbackMessage,
            lastUpdated: new Date().toISOString(),
          });
        }
        setWeatherData(defaultWeatherData);
      }
    } catch (error) {
      console.error("Error fetching forecast:", error);

      if (!cachedTideData) {
        const tideCacheRaw = loadTideDataCache(location.lat, location.lon, date);
        if (isTideData(tideCacheRaw)) {
          cachedTideData = tideCacheRaw;
        }
      }

      if (!cachedWeatherData) {
        const weatherCacheRaw = loadWeatherDataCache(location.lat, location.lon);
        if (isWeatherData(weatherCacheRaw)) {
          cachedWeatherData = weatherCacheRaw;
        }
      }

      if (cachedTideData && cachedWeatherData) {
        console.log("Network error - using cached data");
        setTideData({
          ...cachedTideData,
          isFromCache: true,
          apiStatusMessage: "ข้อมูลจากแคช (เครือข่ายอื่น)",
        });
        setWeatherData(cachedWeatherData);
      } else {
        const fallbackMessage =
          error instanceof Error && error.message
            ? error.message
            : "ไม่สามารถโหลดข้อมูลได้";
        setTideData({
          ...defaultTideData,
          apiStatus: "error",
          apiStatusMessage: fallbackMessage,
          lastUpdated: new Date().toISOString(),
        });
        setWeatherData(defaultWeatherData);
      }
    } finally {
      setLoading(false);
    }
  }, [location, date, isHydrated]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  // Auto-refresh when location coordinates change (debounced)
  useEffect(() => {
    if (!isHydrated) return;
    const timeoutId = setTimeout(() => {
      fetchForecastData();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [location.lat, location.lon, isHydrated, fetchForecastData]);

  // Auto-refresh based on tide cycle
  useEffect(() => {
    if (!isHydrated || !tideData.tideStatus) return;
    const refreshInterval =
      tideData.tideStatus === "น้ำเป็น" ? 15 * 60 * 1000 : 30 * 60 * 1000;
    const intervalId = setInterval(() => {
      fetchForecastData();
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [tideData.tideStatus, fetchForecastData, isHydrated]);

  return { tideData, weatherData, loading, refresh: fetchForecastData };
}

export { initializeOfflineStorage };
