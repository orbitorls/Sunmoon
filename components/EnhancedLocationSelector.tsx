"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { LocationData } from "@/lib/domain/types";
import MapSelector from "./MapSelector";
import { StatRow } from "./enhanced-location/StatRow";
import { LocationPanel } from "./enhanced-location/LocationPanel";
import { DatePanel } from "./enhanced-location/DatePanel";
import { ForecastTabs } from "./enhanced-location/ForecastTabs";

import { useForecastData } from "@/hooks/use-forecast-data";
import { initializeOfflineStorage } from "@/lib/offline-storage";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useDisasterAnalysis } from "@/hooks/use-disaster-analysis";
import { useLocationContext } from "@/hooks/use-location-context";
import { useSafetyAlerts } from "@/hooks/use-safety-alerts";

export default function EnhancedLocationSelector() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData>({
    lat: 13.7563,
    lon: 100.5018,
    name: "กรุงเทพมหานคร",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("forecast");

  // Forecast data (tide + weather + cache + auto-refresh)
  const { tideData: currentTideData, weatherData: currentWeatherData, loading, refresh: fetchForecastData } =
    useForecastData(selectedLocation, selectedDate, isHydrated);

  // Geolocation (GPS + IP fallback)
  const { getLocation: getCurrentLocation, gettingLocation } = useGeolocation(
    isHydrated,
    (location) => {
      setSelectedLocation(location);
      if (typeof window !== "undefined") {
        localStorage.setItem("lastLocation", JSON.stringify(location));
      }
    },
  );

  // Disaster risk analysis
  const disasterAnalysis = useDisasterAnalysis(
    currentTideData,
    currentWeatherData,
    selectedDate,
    selectedLocation.name,
    isHydrated,
  );

  // Nearest pier, elevation, water level comparison
  const { nearestPier: nearestPierInfo } = useLocationContext(
    selectedLocation,
    currentTideData,
    isHydrated,
  );

  // Safety alerts (wind speed, water level)
  useSafetyAlerts(currentTideData, currentWeatherData, isHydrated);

  const persistLocation = useCallback((location: LocationData) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastLocation", JSON.stringify(location));
    }
  }, []);

  const handleLocationSelect = useCallback(
    (location: LocationData) => {
      setSelectedLocation(location);
      persistLocation(location);
    },
    [persistLocation],
  );

  const handleFavoriteSelect = useCallback(
    (location: LocationData) => {
      setSelectedLocation(location);
      persistLocation(location);
    },
    [persistLocation],
  );

  const handleRiskAreaSelect = useCallback((lat: number, lon: number) => {
    setSelectedLocation({
      lat,
      lon,
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    });
  }, []);

  const handleMapSelect = useCallback(
    (newLocation: LocationData) => {
      setSelectedLocation(newLocation);
      persistLocation(newLocation);
      setIsMapDialogOpen(false);
    },
    [persistLocation],
  );

  // Initialize on hydration
  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== "undefined") {
      initializeOfflineStorage();
      const savedLocation = localStorage.getItem("lastLocation");
      if (savedLocation) {
        try {
          setSelectedLocation(JSON.parse(savedLocation));
        } catch (error) {
          console.error("Error parsing saved location:", error);
        }
      }
    }
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
          <span>กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" aria-label="ตัวเลือกตำแหน่งและเวลา" role="region">
      <div className="bg-gradient-to-b from-blue-50/50 to-white p-4 md:p-6 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="max-w-7xl mx-auto">
          <StatRow tideData={currentTideData} weatherData={currentWeatherData} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <LocationPanel
              selectedLocation={selectedLocation}
              onOpenMap={() => setIsMapDialogOpen(true)}
              onLocate={getCurrentLocation}
              gettingLocation={gettingLocation}
              onRefresh={fetchForecastData}
              loading={loading}
            />
            <DatePanel
              loading={loading}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />
          </div>
        </div>
      </div>

      <ForecastTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        loading={loading}
        selectedLocation={selectedLocation}
        currentTideData={currentTideData}
        currentWeatherData={currentWeatherData}
        nearestPierInfo={nearestPierInfo}
        disasterAnalysis={disasterAnalysis}
        onSelectPreset={handleLocationSelect}
        onRefresh={fetchForecastData}
        onRiskAreaSelect={handleRiskAreaSelect}
        onFavoriteSelect={handleFavoriteSelect}
      />

      <MapSelector
        isOpen={isMapDialogOpen}
        currentLocation={selectedLocation}
        onSelectLocationAction={handleMapSelect}
        onCloseAction={() => setIsMapDialogOpen(false)}
      />
    </div>
  );
}
