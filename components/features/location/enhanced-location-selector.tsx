"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  CalendarIcon,
  Map,
} from "lucide-react";
import type { LocationData } from "@/lib/domain/types";
import { BANGKOK_DEFAULT } from "@/lib/domain/locations";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import MapSelector from "@/components/features/location/map-selector";
import { TabsContent } from "@/components/ui/tabs";
import HistoricalEventsPanel from "@/components/features/disaster/historical-events-panel";
import FavoriteLocations from "@/components/features/location/favorite-locations";
import SettingsPanel from "@/components/shared/settings-panel";
import SafetyTips from "@/components/features/disaster/safety-tips";
import ForecastTodayPanel from "@/components/features/forecast/forecast-today-panel";
import { TideStatusHero } from "@/components/features/forecast/tide-status-hero";
import { useHeaderTelemetry, useSwitchTab } from "@/components/shared/app-shell";

// Heavy below-the-fold tab panels are code-split so the default "forecast"
// tab (LCP) stays lean. RiskAreaMap pulls pigeon-maps (browser-only), so it
// loads client-side only; the already-split *.client.tsx inner chunks
// (map-selector, water-level-graph, risk-area-map) stay ssr:false per
// docs/architecture.md#Performance. MultiDayForecast / ApiStatusDashboard are
// light enough to prerender, so they keep SSR and stream in on demand.
function TabPanelFallback({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[240px] items-center justify-center rounded-2xl border border-blue-100 bg-white/70 text-sm text-slate-500"
      role="status"
      aria-label={label}
    >
      <span className="animate-pulse motion-reduce:animate-none">{label}…</span>
    </div>
  );
}

const MultiDayForecast = dynamic(
  () => import("@/components/features/forecast/multi-day-forecast"),
  { loading: () => <TabPanelFallback label="กำลังโหลดพยากรณ์ 7 วัน" /> },
);

const RiskAreaMap = dynamic(
  () => import("@/components/features/disaster/risk-area-map"),
  {
    ssr: false,
    loading: () => <TabPanelFallback label="กำลังโหลดแผนที่เสี่ยง" />,
  },
);

const ApiStatusDashboard = dynamic(
  () => import("@/components/features/status/api-status-dashboard"),
  { loading: () => <TabPanelFallback label="กำลังโหลดสถานะระบบ" /> },
);

import { useForecastData } from "@/hooks/use-forecast-data";
import { initializeOfflineStorage } from "@/lib/storage/offline-storage";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useDisasterAnalysis } from "@/hooks/use-disaster-analysis";
import { useLocationContext } from "@/hooks/use-location-context";
import { useSafetyAlerts } from "@/hooks/use-safety-alerts";

export default function EnhancedLocationSelector() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData>(BANGKOK_DEFAULT);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const switchTab = useSwitchTab();

  // Forecast data (tide + weather + cache + auto-refresh)
  const { tideData: currentTideData, weatherData: currentWeatherData, loading, refresh: fetchForecastData } =
    useForecastData(selectedLocation, selectedDate, isHydrated);

  // Geolocation (GPS + IP fallback)
  const { getLocation: getCurrentLocation, gettingLocation, geoError } = useGeolocation(
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

  // The header renders from the layout shell, so it reads this instead of props.
  useHeaderTelemetry({
    locationName: selectedLocation.name,
    lat: selectedLocation.lat,
    lon: selectedLocation.lon,
    updatedLabel: currentTideData.lastUpdated
      ? new Date(currentTideData.lastUpdated).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }) + " น."
      : undefined,
    online: currentTideData.apiStatus === "success" || currentWeatherData?.main != null,
    surgeLabel:
      currentTideData.currentWaterLevel > 0
        ? `+${currentTideData.currentWaterLevel.toFixed(2)}m`
        : undefined,
  });

  const handleLocationSelect = useCallback((location: LocationData) => {
    setSelectedLocation(location);
    if (typeof window !== "undefined") {
      localStorage.setItem("lastLocation", JSON.stringify(location));
    }
  }, []);

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

  let nextEvent:
    | {
        type: "high" | "low";
        time: string;
        level: number;
      }
    | undefined;

  if (currentTideData.tideEvents && currentTideData.tideEvents.length > 0) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const upcomingEvent = currentTideData.tideEvents.find((event) => {
      const [hours, minutes] = event.time.split(":").map(Number);
      return hours * 60 + minutes > currentMinutes;
    });

    if (upcomingEvent) {
      nextEvent = {
        type: upcomingEvent.type,
        time: upcomingEvent.time,
        level: upcomingEvent.level,
      };
    }
  }

  return (
    <div className="w-full">
      <div className="sr-only">
        <div id="forecast-tab-description">
          แสดงข้อมูลพยากรณ์น้ำขึ้นน้ำลง สภาพอากาศ และกราฟแสดงระดับน้ำทั้งวัน
        </div>
        <div id="multiday-tab-description">
          แสดงพยากรณ์น้ำขึ้นน้ำลงล่วงหน้า 7 วัน พร้อมระดับความเสี่ยง
        </div>
        <div id="status-tab-description">
          แสดงสถานะการเชื่อมต่อ API และแหล่งข้อมูล
        </div>
        <div id="riskmap-tab-description">
          แสดงแผนที่พื้นที่เสี่ยงและเหตุการณ์ย้อนหลังที่เกี่ยวข้อง
        </div>
      </div>
      <div className="px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <TabsContent
          value="forecast"
          className="space-y-6"
          aria-describedby="forecast-tab-description"
        >
          <TideStatusHero
            status={currentTideData.waterLevelStatus}
            currentLevel={currentTideData.currentWaterLevel}
            nextEvent={nextEvent}
            isDatumConvertedToMsl={currentTideData.isDatumConvertedToMsl}
            stationId={currentTideData.stationId}
            location={{ lat: selectedLocation.lat, lon: selectedLocation.lon }}
            locationName={selectedLocation.name}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-blue-100 p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-800">ตำแหน่ง</h3>
                </div>
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-slate-600 font-medium mb-1">ตำแหน่งที่เลือก</p>
                  <p className="text-sm font-semibold tabular-nums text-slate-900 truncate">
                    {selectedLocation.name || `${selectedLocation.lat.toFixed(4)}°, ${selectedLocation.lon.toFixed(4)}°`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsMapDialogOpen(true)}
                    className="h-12 cursor-pointer border-blue-200 hover:bg-blue-50 text-slate-700 font-medium transition-colors duration-200 focus-enhanced"
                  >
                    <Map className="w-4 h-4 mr-2 text-blue-500" />
                    แผนที่
                  </Button>
                  <Button
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="h-12 cursor-pointer border-blue-200 hover:bg-blue-50 text-slate-700 font-medium transition-colors duration-200 focus-enhanced"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Navigation className="w-4 h-4 mr-2 text-blue-500" />
                    )}
                    ปัจจุบัน
                  </Button>
                </div>
                {geoError && (
                  <p role="alert" className="mt-2 text-xs font-medium text-amber-700">
                    {geoError}
                  </p>
                )}
                <Button
                  onClick={fetchForecastData}
                  disabled={loading}
                  className="w-full h-12 mt-4 cursor-pointer bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200/50 transition-colors duration-200 focus-enhanced"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2 motion-reduce:animate-none" />
                  ) : (
                    <RefreshCw className="h-5 w-5 mr-2" />
                  )}
                  {loading ? "กำลังโหลด..." : "อัปเดตข้อมูล"}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-blue-100 p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-800">เลือกวันที่</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium tabular-nums">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse motion-reduce:animate-none"></div>
                      วันนี้: {format(new Date(), "d MMM", { locale: th })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-4 xl:flex-row xl:items-start xl:gap-12">
                  <div className="relative">
                    {loading && (
                      <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500 motion-reduce:animate-none" />
                          <span className="text-sm text-slate-600">กำลังโหลดข้อมูล...</span>
                        </div>
                      </div>
                    )}
                    <Calendar
                      mode="single"
                      selected={selectedDate || new Date()}
                      onSelect={(date) => setSelectedDate(date)}
                      locale={th}
                      className="rounded-xl border border-slate-100"
                      modifiers={{
                        selected: selectedDate || new Date(),
                        today: new Date()
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 xl:flex-col xl:items-start xl:gap-3 xl:pt-2">
                    <span className="text-sm text-slate-600">วันที่เลือก:</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold text-sm tabular-nums flex items-center gap-2">
                      {loading && <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" />}
                      {selectedDate ? format(selectedDate, "PPPP", { locale: th }) : format(new Date(), "PPPP", { locale: th }) + " (วันนี้)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ForecastTodayPanel
            loading={loading}
            selectedLocation={selectedLocation}
            currentTideData={currentTideData}
            currentWeatherData={currentWeatherData}
            nearestPierInfo={nearestPierInfo}
            disasterAnalysis={disasterAnalysis}
            onSelectPreset={handleLocationSelect}
            onOpenRiskMap={() => switchTab("riskmap")}
            onOpenMultiday={() => switchTab("multiday")}
          />
        </TabsContent>
      </div>

        <TabsContent
          value="multiday"
          className="space-y-6 px-4 sm:px-6 lg:px-8"
          aria-describedby="multiday-tab-description"
        >
          <MultiDayForecast currentLocation={selectedLocation} />
        </TabsContent>

        <TabsContent
          value="riskmap"
          className="space-y-6"
          aria-describedby="riskmap-tab-description"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskAreaMap
              currentLocation={selectedLocation}
              currentTideLevel={currentTideData.currentWaterLevel}
              nextHighTime={currentTideData.highTideTime || "--:--"}
              nextHighLevel={currentTideData.tideEvents?.find((e) => e.type === "high")?.level ?? currentTideData.currentWaterLevel}
              windSpeed={currentWeatherData.wind?.speed}
              onLocationSelect={(lat, lon) => {
                setSelectedLocation({
                  lat,
                  lon,
                  name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
                });
              }}
            />
            <HistoricalEventsPanel currentLocation={selectedLocation} />
          </div>
        </TabsContent>

        <TabsContent
          value="status"
          className="space-y-6"
          aria-describedby="status-tab-description"
        >
          <h2 className="font-display text-xl font-bold text-slate-900">การจัดการไทล์และสถานะระบบ <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold text-slate-500">TELEMETRY v2.8</span></h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ApiStatusDashboard
                tideApiStatus={currentTideData.apiStatus}
                weatherApiStatus={currentWeatherData?.main ? "success" : "offline"}
                lastUpdated={currentTideData.lastUpdated}
                onRefresh={fetchForecastData}
              />

              <SettingsPanel />
            </div>
            <div className="space-y-6">
              <FavoriteLocations
                currentLocation={selectedLocation}
                onSelectLocation={(loc) => {
                  setSelectedLocation(loc);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("lastLocation", JSON.stringify(loc));
                  }
                }}
              />

              <SafetyTips currentRiskLevel={disasterAnalysis?.riskLevel || "low"} />
            </div>
          </div>
        </TabsContent>

      <MapSelector
        isOpen={isMapDialogOpen}
        currentLocation={selectedLocation}
        onSelectLocationAction={(newLocation: LocationData) => {
          setSelectedLocation(newLocation);
          if (typeof window !== "undefined") {
            localStorage.setItem("lastLocation", JSON.stringify(newLocation));
          }
          setIsMapDialogOpen(false);
        }}
        onCloseAction={() => setIsMapDialogOpen(false)}
      />
    </div>
  );
}