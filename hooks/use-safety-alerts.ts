"use client";

import { useEffect, useRef } from "react";
import type { TideData, WeatherData } from "@/lib/tide-service";

/**
 * Monitors weather and tide data for dangerous conditions and logs warnings.
 * Uses a ref-based debounce to avoid alerting more than once per 5 minutes.
 */
export function useSafetyAlerts(
  tideData: TideData,
  weatherData: WeatherData,
  isHydrated: boolean,
): void {
  const alertShown = useRef(false);

  // High wind speed alert
  useEffect(() => {
    if (!isHydrated || !weatherData?.wind?.speed) return;
    const windSpeed = weatherData.wind.speed;
    if (windSpeed > 10 && !alertShown.current) {
      alertShown.current = true;
      console.warn(`ตรวจพบความเร็วลมสูง ${windSpeed} m/s อาจมีพายุกำลังเข้ามา`);
      setTimeout(() => {
        alertShown.current = false;
      }, 300000);
    }
  }, [weatherData?.wind?.speed, isHydrated]);

  // Dangerously high water level alert
  useEffect(() => {
    if (!isHydrated || !tideData?.currentWaterLevel) return;
    const waterLevel = tideData.currentWaterLevel;
    if (waterLevel > 2.5 && !alertShown.current) {
      alertShown.current = true;
      console.warn(`ตรวจพบระดับน้ำสูงผิดปกติ ${waterLevel.toFixed(2)} ม. อาจเกิดน้ำท่วม`);
      setTimeout(() => {
        alertShown.current = false;
      }, 300000);
    }
  }, [tideData?.currentWaterLevel, isHydrated]);
}
