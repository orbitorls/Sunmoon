"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Waves,
  Thermometer,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  CalendarIcon,
  Map,
  Calendar as CalendarDays,
  Activity,
} from "lucide-react";
import type { LocationData } from "@/lib/domain/types";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import MapSelector from "./map-selector";
import ApiStatusDashboard from "./api-status-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RiskAreaMap from "./risk-area-map";
import HistoricalEventsPanel from "./historical-events-panel";
import MultiDayForecast from "./multi-day-forecast";
import FavoriteLocations from "./favorite-locations";
import SettingsPanel from "./settings-panel";
import SafetyTips from "./safety-tips";
import ThemeToggle from "./theme-toggle";
import ForecastTodayPanel from "./forecast-today-panel";

import { useForecastData } from "@/hooks/use-forecast-data";
import { initializeOfflineStorage } from "@/lib/storage/offline-storage";
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

  return (
    <div className="w-full" aria-label="ตัวเลือกตำแหน่งและเวลา" role="region">
      <div className="bg-gradient-to-b from-blue-50/50 to-white p-4 md:p-6 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-2xl bg-white/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm ring-1 ring-blue-100/70 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">ระดับน้ำตอนนี้</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                  {currentTideData.currentWaterLevel.toFixed(2)}
                </span>
                <span className="pb-1 text-sm font-bold text-slate-600 dark:text-slate-400">ม.</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {currentTideData.waterLevelStatus}
              </div>
            </div>

            <div className="rounded-2xl bg-white/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm ring-1 ring-blue-100/70 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">น้ำขึ้นสูงสุด</div>
              <div className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                {currentTideData.highTideTime || "-"}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">เวลาที่ควรระวังน้ำหนุน</div>
            </div>

            <div className="rounded-2xl bg-white/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm ring-1 ring-blue-100/70 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">น้ำลงต่ำสุด</div>
              <div className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                {currentTideData.lowTideTime || "-"}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ช่วงเห็นแนวชายฝั่งชัดขึ้น</div>
            </div>

            <div className="rounded-2xl bg-white/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm ring-1 ring-blue-100/70 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400">อุณหภูมิ</div>
              <div className="mt-2 flex items-center gap-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                <Thermometer className="h-5 w-5 text-orange-500" />
                {Math.round(currentWeatherData.main?.temp ?? 0)}°
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                รู้สึกเหมือน {Math.round(currentWeatherData.main?.feels_like ?? 0)}°C
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 p-4 sm:p-5 text-white shadow-lg shadow-blue-200/50 transition-shadow duration-200 hover:shadow-xl motion-reduce:transition-none dark:shadow-blue-950/30">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">สรุปวันนี้</div>
              <div className="mt-2 text-2xl font-black">
                {currentTideData.tideStatus}
              </div>
              <div className="mt-1 text-sm text-white/90">
                {currentTideData.apiStatus === "success" ? "มีข้อมูลพร้อมดูต่อ" : "ใช้ข้อมูลสำรองหรือออฟไลน์"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white/85 backdrop-blur-sm dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ตำแหน่ง</h3>
                </div>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-slate-900/50 rounded-xl border border-blue-100 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">ตำแหน่งที่เลือก</p>
                  <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 truncate">
                    {selectedLocation.name || `${selectedLocation.lat.toFixed(4)}°, ${selectedLocation.lon.toFixed(4)}°`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsMapDialogOpen(true)}
                    className="h-12 cursor-pointer border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-200 focus-enhanced"
                  >
                    <Map className="w-4 h-4 mr-2 text-blue-500" />
                    แผนที่
                  </Button>
                  <Button
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="h-12 cursor-pointer border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-200 focus-enhanced"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Navigation className="w-4 h-4 mr-2 text-blue-500" />
                    )}
                    ปัจจุบัน
                  </Button>
                </div>
                <Button
                  onClick={fetchForecastData}
                  disabled={loading}
                  className="w-full h-12 mt-4 cursor-pointer bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200/50 transition-colors duration-200 focus-enhanced dark:shadow-blue-900/20"
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
              <div className="bg-white/85 backdrop-blur-sm dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">เลือกวันที่</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium tabular-nums">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse motion-reduce:animate-none"></div>
                      วันนี้: {format(new Date(), "d MMM", { locale: th })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center relative">
                  {loading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-xl flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 motion-reduce:animate-none" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">กำลังโหลดข้อมูล...</span>
                      </div>
                    </div>
                  )}
                  <Calendar
                    mode="single"
                    selected={selectedDate || new Date()}
                    onSelect={(date) => setSelectedDate(date)}
                    locale={th}
                    className="rounded-xl border border-slate-100 dark:border-slate-700"
                    modifiers={{
                      selected: selectedDate || new Date(),
                      today: new Date()
                    }}
                    modifiersStyles={{
                      selected: {
                        backgroundColor: 'rgb(16 185 129)',
                        color: 'white',
                        fontWeight: 'bold'
                      },
                      today: {
                        border: '2px solid rgb(59 130 246)',
                        borderRadius: '8px'
                      }
                    }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">วันที่เลือก:</span>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold text-sm tabular-nums flex items-center gap-2">
                    {loading && <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" />}
                    {selectedDate ? format(selectedDate, "PPPP", { locale: th }) : format(new Date(), "PPPP", { locale: th }) + " (วันนี้)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mt-8"
        aria-label="แผงควบคุมพยากรณ์และสถานะระบบ"
      >
        <TabsList
          className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 h-auto bg-blue-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-blue-100 dark:border-slate-700"
          role="tablist"
          aria-label="เลือกประเภทข้อมูล"
        >
          <TabsTrigger
            value="forecast"
            className="flex items-center gap-2 py-3 cursor-pointer"
            aria-describedby="forecast-tab-description"
          >
            <Waves className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">พยากรณ์</span>วันนี้
          </TabsTrigger>
          <TabsTrigger
            value="multiday"
            className="flex items-center gap-2 py-3 cursor-pointer"
            aria-describedby="multiday-tab-description"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">พยากรณ์</span>7 วัน
          </TabsTrigger>
          <TabsTrigger
            value="status"
            className="flex items-center gap-2 py-3 cursor-pointer"
            aria-describedby="status-tab-description"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">สถานะ</span>ระบบ
          </TabsTrigger>
          <TabsTrigger
            value="riskmap"
            className="flex items-center gap-2 py-3 cursor-pointer"
            aria-describedby="riskmap-tab-description"
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">แผนที่</span>เสี่ยง
          </TabsTrigger>
        </TabsList>
        <div id="forecast-tab-description" className="sr-only">
          แสดงข้อมูลพยากรณ์น้ำขึ้นน้ำลง สภาพอากาศ และกราฟแสดงระดับน้ำทั้งวัน
        </div>
        <div id="multiday-tab-description" className="sr-only">
          แสดงพยากรณ์น้ำขึ้นน้ำลงล่วงหน้า 7 วัน พร้อมระดับความเสี่ยง
        </div>
        <div id="status-tab-description" className="sr-only">
          แสดงสถานะการเชื่อมต่อ API และแหล่งข้อมูล
        </div>
        <div id="riskmap-tab-description" className="sr-only">
          แสดงแผนที่พื้นที่เสี่ยงและเหตุการณ์ย้อนหลังที่เกี่ยวข้อง
        </div>

        <TabsContent
          value="forecast"
          className="space-y-6"
          role="tabpanel"
          aria-labelledby="forecast-tab"
          tabIndex={0}
        >
          <ForecastTodayPanel
            loading={loading}
            selectedLocation={selectedLocation}
            currentTideData={currentTideData}
            currentWeatherData={currentWeatherData}
            nearestPierInfo={nearestPierInfo}
            disasterAnalysis={disasterAnalysis}
            onSelectPreset={handleLocationSelect}
            onOpenRiskMap={() => setActiveTab("riskmap")}
            onOpenMultiday={() => setActiveTab("multiday")}
          />
        </TabsContent>

        <TabsContent
          value="multiday"
          className="space-y-6"
          role="tabpanel"
          aria-labelledby="multiday-tab"
          tabIndex={0}
        >
          <MultiDayForecast currentLocation={selectedLocation} />
        </TabsContent>

        <TabsContent
          value="riskmap"
          className="space-y-6"
          role="tabpanel"
          aria-labelledby="riskmap-tab"
          tabIndex={0}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskAreaMap
              currentLocation={selectedLocation}
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
          role="tabpanel"
          aria-labelledby="status-tab"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">ตั้งค่าและสถานะระบบ</h2>
            <ThemeToggle />
          </div>

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
      </Tabs>

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
