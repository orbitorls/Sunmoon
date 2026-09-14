"use client";

import { useState, useEffect, useCallback } from "react";
import {
  findNearestPier,
  type NearestPier,
} from "@/lib/distance-utils";
import { getElevation } from "@/lib/elevation-service";
import { compareWaterLevel, type WaterLevelComparison } from "@/lib/water-level-comparison";
import type { LocationData, TideData } from "@/lib/tide-service";

export type LocationContext = {
  nearestPier: NearestPier | null;
  userElevation: number | undefined;
  waterLevelComparison: WaterLevelComparison | null;
};

export function useLocationContext(
  location: LocationData,
  tideData: TideData,
  isHydrated: boolean,
): LocationContext {
  const [nearestPier, setNearestPier] = useState<NearestPier | null>(null);
  const [userElevation, setUserElevation] = useState<number | undefined>(undefined);
  const [waterLevelComparison, setWaterLevelComparison] = useState<WaterLevelComparison | null>(null);

  const updateNearestPier = useCallback(() => {
    const pier = findNearestPier(location.lat, location.lon);
    if (pier) {
      setNearestPier(pier);
    }
  }, [location.lat, location.lon]);

  // Update nearest pier and fetch elevation when location changes
  useEffect(() => {
    if (!isHydrated) return;
    updateNearestPier();

    getElevation(location.lat, location.lon).then((data) => {
      setUserElevation(data ? data.elevation : undefined);
    });
  }, [location.lat, location.lon, isHydrated, updateNearestPier]);

  // Update water level comparison when tide data or location changes
  useEffect(() => {
    if (!isHydrated || !tideData || tideData.currentWaterLevel <= 0) return;
    const comparison = compareWaterLevel(
      location.lat,
      location.lon,
      tideData.currentWaterLevel,
      userElevation,
    );
    setWaterLevelComparison(comparison);
  }, [location.lat, location.lon, tideData.currentWaterLevel, userElevation, isHydrated]);

  return { nearestPier, userElevation, waterLevelComparison };
}
