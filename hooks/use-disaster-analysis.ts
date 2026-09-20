"use client";

import { useState, useEffect } from "react";
import { analyzeDisasterRisk, type DisasterAnalysis } from "@/lib/domain/disaster-analysis";
import type { TideData, WeatherData, LocationData } from "@/lib/domain/types";

export function useDisasterAnalysis(
  tideData: TideData,
  weatherData: WeatherData,
  date: Date | undefined,
  locationName: string,
  isHydrated: boolean,
): DisasterAnalysis | null {
  const [analysis, setAnalysis] = useState<DisasterAnalysis | null>(null);

  useEffect(() => {
    if (!isHydrated || !tideData || !weatherData || tideData.apiStatus === "error") {
      return;
    }
    try {
      const result = analyzeDisasterRisk(
        tideData,
        weatherData,
        date || new Date(),
        locationName,
      );
      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing disaster risk:", error);
      setAnalysis(null);
    }
  }, [tideData, weatherData, date, locationName, isHydrated]);

  return analysis;
}
