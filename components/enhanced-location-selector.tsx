"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Waves,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Thermometer,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  CalendarIcon,
  Moon,
  Clock,
  Star,
  Compass,
  Activity,
  Radio,
  Anchor,
  TrendingDown,
  TrendingUp,
  Map,
  History,
  Calendar as CalendarDays,
  Droplet,
  Wind,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getLocationForecast,
} from "@/actions/get-location-forecast";
import {
  type LocationData,
  type TideData,
  type WeatherData,
} from "@/lib/tide-service";
import { tideControlManager } from "@/lib/controls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import MapSelector from "./map-selector";
import { WaterLevelGraphV2 as WaterLevelGraph } from "./water-level-graph-v2";
import ApiStatusDashboard from "./api-status-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DisasterAlert from "./disaster-alert";
import {
  analyzeDisasterRisk,
  type DisasterAnalysis,
} from "@/lib/disaster-analysis";
import RiskAreaMap from "./RiskAreaMap";
import HistoricalEventsPanel from "./HistoricalEventsPanel";
import MultiDayForecast from "./MultiDayForecast";
import QuickActions from "./QuickActions";
import WeatherTrends from "./WeatherTrends";
import { HeroCardSkeleton, MetricCardSkeleton, GraphSkeleton } from "./LoadingSkeletons";
import FavoriteLocations from "./FavoriteLocations";
import SettingsPanel from "./SettingsPanel";
import SafetyTips from "./SafetyTips";
import ThemeToggle from "./ThemeToggle";
import ForecastTodayPanel from "./forecast-today-panel";

// Import distance and offline storage utilities
import {
  findNearestPier,
  getDistanceCategory,
  getDistanceCategoryText,
  getDistanceCategoryColor,
  getPierTypeIcon,
  getPierTypeText,
  type NearestPier,
} from "@/lib/distance-utils";
import {
  loadTideDataCache,
  saveTideDataCache,
  loadWeatherDataCache,
  saveWeatherDataCache,
  initializeOfflineStorage,
} from "@/lib/offline-storage";

// Import water level comparison for flood warnings
import {
  compareWaterLevel,
  type WaterLevelComparison,
} from "@/lib/water-level-comparison";

// Import elevation service
import { getElevation } from "@/lib/elevation-service";

import { TideStatusHero } from "./tide-status-hero";



// Enhanced default values with new properties
const defaultTideData = {
  isWaxingMoon: true,
  lunarPhaseKham: 0,
  tideStatus: "ไม่ทราบ" as "น้ำเป็น" | "น้ำตาย",
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
  apiStatus: "error" as const,
  apiStatusMessage: "ไม่มีข้อมูล",
  lastUpdated: new Date().toISOString(),
};

const defaultWeatherData = {
  main: { temp: 0, feels_like: 0, humidity: 0, pressure: 0 },
  weather: [{ description: "ไม่ทราบ", icon: "01d" }],
  wind: { speed: 0, deg: 0 },
  name: "ไม่ทราบ",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTideData = (value: unknown): value is TideData => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.tideStatus === "string" &&
    typeof value.apiStatus === "string" &&
    typeof value.apiStatusMessage === "string" &&
    typeof value.currentWaterLevel === "number"
  );
};

const isWeatherData = (value: unknown): value is WeatherData => {
  if (!isRecord(value)) {
    return false;
  }

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

export default function EnhancedLocationSelector() {
  const latInputId = "lat-input";
  const lonInputId = "lon-input";
  const dateLabelId = "date-label";
  const [selectedLocation, setSelectedLocation] = useState<LocationData>({
    lat: 13.7563,
    lon: 100.5018,
    name: "กรุงเทพมหานคร",
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const alertShown = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("forecast");
  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentTideData, setCurrentTideData] =
    useState<TideData>(defaultTideData);
  const [currentWeatherData, setCurrentWeatherData] =
    useState<WeatherData>(defaultWeatherData);

  // ... existing code ...

  const [nearestPierInfo, setNearestPierInfo] = useState<NearestPier | null>(
    null,
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [disasterAnalysis, setDisasterAnalysis] = useState<DisasterAnalysis | null>(null);
  const [waterLevelComparison, setWaterLevelComparison] = useState<WaterLevelComparison | null>(null);
  const [userElevation, setUserElevation] = useState<number | undefined>(undefined);

  // Tide control settings
  const [tideSettings, setTideSettings] = useState(tideControlManager.getSettings());


  const handleCoordinateChange = (value: string, field: "lat" | "lon") => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setSelectedLocation((prev) => ({
      ...prev,
      [field]: numValue,
      name: `${field === "lat" ? numValue : prev.lat}, ${field === "lon" ? numValue : prev.lon}`,
    }));
  };

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    if (typeof window !== "undefined") {
      localStorage.setItem("lastLocation", JSON.stringify(location));
    }
  };
  // Update nearest pier information
  const updateNearestPier = useCallback(() => {
    const pier = findNearestPier(selectedLocation.lat, selectedLocation.lon);
    if (pier) {
      setNearestPierInfo(pier);
    }
  }, [selectedLocation.lat, selectedLocation.lon]);

  // Enhanced fetch function with better error handling and offline cache support
  const fetchForecastData = useCallback(async () => {
    if (!isHydrated || !selectedLocation) return;

    setLoading(true);
    let cachedTideData: TideData | null = null;
    let cachedWeatherData: WeatherData | null = null;

    try {
      const tideCacheRaw = loadTideDataCache(
        selectedLocation.lat,
        selectedLocation.lon,
        selectedDate,
      );
      if (isTideData(tideCacheRaw)) {
        cachedTideData = tideCacheRaw;
      }

      const weatherCacheRaw = loadWeatherDataCache(
        selectedLocation.lat,
        selectedLocation.lon,
      );
      if (isWeatherData(weatherCacheRaw)) {
        cachedWeatherData = weatherCacheRaw;
      }

      if (cachedTideData && cachedWeatherData) {
        console.log("Loading data from cache...");
        setCurrentTideData({
          ...cachedTideData,
          isFromCache: true,
          apiStatusMessage: "ข้อมูลจากแคช (ออฟไลน์)",
        });
        setCurrentWeatherData(cachedWeatherData);
      }

      const result = await getLocationForecast(
        selectedLocation,
        selectedDate || new Date(),
      );

      if (result?.tideData && result?.weatherData) {
        saveTideDataCache(
          selectedLocation.lat,
          selectedLocation.lon,
          selectedDate || new Date(),
          result.tideData,
        );
        saveWeatherDataCache(
          selectedLocation.lat,
          selectedLocation.lon,
          result.weatherData,
        );

        setCurrentTideData({
          ...result.tideData,
          isFromCache: false,
        });
        setCurrentWeatherData(result.weatherData);
      } else {
        const fallbackMessage = result?.error || "ไม่พบข้อมูล";

        if (cachedTideData) {
          setCurrentTideData({
            ...cachedTideData,
            isFromCache: true,
            apiStatusMessage: "ข้อมูลจากแคช (API ล้มเหลว)",
          });
        } else {
          setCurrentTideData({
            ...defaultTideData,
            apiStatus: "error",
            apiStatusMessage: fallbackMessage,
            lastUpdated: new Date().toISOString(),
          });
        }
        setCurrentWeatherData(defaultWeatherData);
      }
    } catch (error) {
      console.error("Error fetching forecast:", error);

      if (!cachedTideData) {
        const tideCacheRaw = loadTideDataCache(
          selectedLocation.lat,
          selectedLocation.lon,
          selectedDate,
        );
        if (isTideData(tideCacheRaw)) {
          cachedTideData = tideCacheRaw;
        }
      }

      if (!cachedWeatherData) {
        const weatherCacheRaw = loadWeatherDataCache(
          selectedLocation.lat,
          selectedLocation.lon,
        );
        if (isWeatherData(weatherCacheRaw)) {
          cachedWeatherData = weatherCacheRaw;
        }
      }

      if (cachedTideData && cachedWeatherData) {
        console.log("Network error - using cached data");
        setCurrentTideData({
          ...cachedTideData,
          isFromCache: true,
          apiStatusMessage: "ข้อมูลจากแคช (เครือข่ายอื่น)",
        });
        setCurrentWeatherData(cachedWeatherData);
      } else {
        const fallbackMessage =
          error instanceof Error && error.message
            ? error.message
            : "ไม่สามารถโหลดข้อมูลได้";
        setCurrentTideData({
          ...defaultTideData,
          apiStatus: "error",
          apiStatusMessage: fallbackMessage,
          lastUpdated: new Date().toISOString(),
        });
        setCurrentWeatherData(defaultWeatherData);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, selectedDate, isHydrated]);

  // Enhanced geolocation function with IP fallback
  const getCurrentLocation = useCallback(async () => {
    if (typeof window === "undefined") return;

    setGettingLocation(true);
    setGeoError(null);

    try {
      // Try browser geolocation first with short timeout
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000, // Short 5 second timeout
              maximumAge: 120000,
            });
          },
        );

        const newLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          name: "ตำแหน่งปัจจุบัน (GPS)",
        };

        setSelectedLocation(newLocation);
        localStorage.setItem("lastLocation", JSON.stringify(newLocation));

        setTimeout(() => {
          if (isHydrated) {
            fetchForecastData();
          }
        }, 100);

        setGettingLocation(false);
        return; // Success!
      } catch {
        console.log("Browser geolocation failed, trying IP geolocation...");
      }

      // Fallback to IP geolocation API
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("IP API failed");

        const data = await response.json();

        if (data.latitude && data.longitude) {
          const newLocation = {
            lat: data.latitude,
            lon: data.longitude,
            name: `ตำแหน่งโดยประมาณ (${data.city || data.region || "IP"})`,
          };

          setSelectedLocation(newLocation);
          localStorage.setItem("lastLocation", JSON.stringify(newLocation));

          setTimeout(() => {
            if (isHydrated) {
              fetchForecastData();
            }
          }, 100);

          setGettingLocation(false);
          return; // Success with IP!
        }
      } catch {
        console.log("IP geolocation failed, using Bangkok default...");
      }

      // Final fallback: Bangkok
      const bangkokLocation = {
        lat: 13.7563,
        lon: 100.5018,
        name: "กรุงเทพมหานคร (ค่าพื้นฐาน)",
      };

      setSelectedLocation(bangkokLocation);
      localStorage.setItem("lastLocation", JSON.stringify(bangkokLocation));

      setTimeout(() => {
        if (isHydrated) {
          fetchForecastData();
        }
      }, 100);

    } catch (error) {
      console.error("All geolocation methods failed:", error);
      setGeoError("ไม่สามารถหาตำแหน่งได้ กรุณาใช้แผนที่หรือใส่พิกัดเอง");
    } finally {
      setGettingLocation(false);
    }
  }, [isHydrated, fetchForecastData]);
  // Initialize on hydration
  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== "undefined") {
      // Initialize offline storage
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

  // Fetch data when dependencies change (live updates)
  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  // Update nearest pier and cache stats when location changes
  useEffect(() => {
    if (isHydrated) {
      updateNearestPier();

      // Fetch user elevation when locations changes
      getElevation(selectedLocation.lat, selectedLocation.lon).then(data => {
        if (data) {
          setUserElevation(data.elevation);
        } else {
          setUserElevation(undefined);
        }
      });
    }
  }, [
    selectedLocation.lat,
    selectedLocation.lon,
    isHydrated,
    updateNearestPier,
  ]);

  // Update water level comparison when tide data or location changes
  useEffect(() => {
    if (isHydrated && currentTideData && currentTideData.currentWaterLevel > 0) {
      const comparison = compareWaterLevel(
        selectedLocation.lat,
        selectedLocation.lon,
        currentTideData.currentWaterLevel,
        userElevation // Pass user elevation
      );
      setWaterLevelComparison(comparison);
    }
  }, [
    selectedLocation.lat,
    selectedLocation.lon,
    currentTideData.currentWaterLevel,
    userElevation, // Add dependency
    isHydrated,
  ]);



  // Auto-refresh when location coordinates change
  useEffect(() => {
    if (isHydrated) {
      const timeoutId = setTimeout(() => {
        fetchForecastData();
      }, 500); // Debounce for 500ms to avoid too many requests
      return () => clearTimeout(timeoutId);
    }
  }, [
    selectedLocation.lat,
    selectedLocation.lon,
    isHydrated,
    fetchForecastData,
  ]);

  // Real-time updates when critical factors change
  useEffect(() => {
    if (isHydrated && currentWeatherData?.wind?.speed) {
      const windSpeed = currentWeatherData.wind.speed;

      // Alert for high wind speeds (potential storm)
      if (windSpeed > 10 && !alertShown.current) {
        alertShown.current = true;
        console.warn(
          `ตรวจพบความเร็วลมสูง ${windSpeed} m/s อาจมีพายุกำลังเข้ามา`,
        );
        setTimeout(() => {
          alertShown.current = false;
        }, 300000); // Reset after 5 minutes
      }
    }
  }, [currentWeatherData?.wind?.speed, isHydrated]);

  // Real-time tide level monitoring
  useEffect(() => {
    if (isHydrated && currentTideData?.currentWaterLevel) {
      const waterLevel = currentTideData.currentWaterLevel;

      // Alert for dangerously high water levels
      if (waterLevel > 2.5 && !alertShown.current) {
        alertShown.current = true;
        console.warn(
          `ตรวจพบระดับน้ำสูงผิดปกติ ${waterLevel.toFixed(2)} ม. อาจเกิดน้ำท่วม`,
        );
        setTimeout(() => {
          alertShown.current = false;
        }, 300000); // Reset after 5 minutes
      }
    }
  }, [currentTideData?.currentWaterLevel, isHydrated]);

  // Auto-refresh based on tide cycle changes
  useEffect(() => {
    if (isHydrated && currentTideData?.tideStatus) {
      const tideStatus = currentTideData.tideStatus;

      // More frequent updates during spring tides
      const refreshInterval =
        tideStatus === "น้ำเป็น" ? 15 * 60 * 1000 : 30 * 60 * 1000; // 15 or 30 minutes

      const intervalId = setInterval(() => {
        fetchForecastData();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [currentTideData?.tideStatus, fetchForecastData, isHydrated]);

  // Listen for tide control settings changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleStorageChange = () => {
        setTideSettings(tideControlManager.getSettings());
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Analyze disaster risk when tide or weather data changes
  useEffect(() => {
    if (isHydrated && currentTideData && currentWeatherData && currentTideData.apiStatus !== 'error') {
      try {
        const analysis = analyzeDisasterRisk(
          currentTideData,
          currentWeatherData,
          selectedDate || new Date(),
          selectedLocation.name
        );
        setDisasterAnalysis(analysis);
      } catch (error) {
        console.error('Error analyzing disaster risk:', error);
        setDisasterAnalysis(null);
      }
    }
  }, [currentTideData, currentWeatherData, selectedDate, selectedLocation.name, isHydrated]);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" aria-label="ตัวเลือกตำแหน่งและเวลา" role="region">
      <div className="bg-gradient-to-b from-blue-50/50 to-white p-4 md:p-6 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100 dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">ระดับน้ำตอนนี้</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {currentTideData.currentWaterLevel.toFixed(2)}
                </span>
                <span className="pb-1 text-sm font-bold text-slate-500 dark:text-slate-400">ม.</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {currentTideData.waterLevelStatus}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100 dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">น้ำขึ้นสูงสุด</div>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                {currentTideData.highTideTime || "-"}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">เวลาที่ควรระวังน้ำหนุน</div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100 dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">น้ำลงต่ำสุด</div>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                {currentTideData.lowTideTime || "-"}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ช่วงเห็นแนวชายฝั่งชัดขึ้น</div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100 dark:bg-slate-800/80 dark:ring-slate-700">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">อุณหภูมิ</div>
              <div className="mt-2 flex items-center gap-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                <Thermometer className="h-5 w-5 text-orange-500" />
                {Math.round(currentWeatherData.main?.temp ?? 0)}°
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                รู้สึกเหมือน {Math.round(currentWeatherData.main?.feels_like ?? 0)}°C
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 p-4 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-950/30">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">สรุปวันนี้</div>
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
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ตำแหน่ง</h3>
                </div>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-slate-900/50 rounded-xl border border-blue-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">ตำแหน่งที่เลือก</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedLocation.name || `${selectedLocation.lat.toFixed(4)}°, ${selectedLocation.lon.toFixed(4)}°`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsMapDialogOpen(true)}
                    className="h-12 border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    <Map className="w-4 h-4 mr-2 text-blue-500" />
                    แผนที่
                  </Button>
                  <Button
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="h-12 border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4 mr-2 text-blue-500" />
                    )}
                    ปัจจุบัน
                  </Button>
                </div>
<Button
                  onClick={fetchForecastData}
                  disabled={loading}
                  className="w-full h-12 mt-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200/50 dark:shadow-blue-900/20"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-5 w-5 mr-2" />
                  )}
                  {loading ? "กำลังโหลด..." : "อัปเดตข้อมูล"}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">เลือกวันที่</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      วันนี้: {format(new Date(), "d MMM", { locale: th })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center relative">
                  {loading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-xl flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
                        backgroundColor: 'rgb(34 197 94)',
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
                  <span className="text-sm text-slate-500 dark:text-slate-400">วันที่เลือก:</span>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-semibold text-sm flex items-center gap-2">
                    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
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
            className="flex items-center gap-2 py-3"
            aria-describedby="forecast-tab-description"
          >
            <Waves className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">พยากรณ์</span>วันนี้
          </TabsTrigger>
          <TabsTrigger
            value="multiday"
            className="flex items-center gap-2 py-3"
            aria-describedby="multiday-tab-description"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">พยากรณ์</span>7 วัน
          </TabsTrigger>
          <TabsTrigger
            value="status"
            className="flex items-center gap-2 py-3"
            aria-describedby="status-tab-description"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">สถานะ</span>ระบบ
          </TabsTrigger>
          <TabsTrigger
            value="riskmap"
            className="flex items-center gap-2 py-3"
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
            <h2 className="text-xl font-bold">ตั้งค่าและสถานะระบบ</h2>
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


