"use client";

import { Activity, Calendar as CalendarDays, Map, Waves } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LocationData, TideData, WeatherData } from "@/lib/domain/types";
import type { DisasterAnalysis } from "@/lib/domain/disaster-analysis";
import type { NearestPier } from "@/lib/domain/geo";
import ForecastTodayPanel from "../ForecastTodayPanel";
import MultiDayForecast from "../MultiDayForecast";
import RiskAreaMap from "../RiskAreaMap";
import HistoricalEventsPanel from "../HistoricalEventsPanel";
import ApiStatusDashboard from "../ApiStatusDashboard";
import SettingsPanel from "../SettingsPanel";
import FavoriteLocations from "../FavoriteLocations";
import SafetyTips from "../SafetyTips";
import ThemeToggle from "../ThemeToggle";

type ForecastTabsProps = {
  activeTab: string;
  onTabChange: (value: string) => void;
  loading: boolean;
  selectedLocation: LocationData;
  currentTideData: TideData;
  currentWeatherData: WeatherData;
  nearestPierInfo: NearestPier | null;
  disasterAnalysis: DisasterAnalysis | null;
  onSelectPreset: (location: LocationData) => void;
  onRefresh: () => void;
  onRiskAreaSelect: (lat: number, lon: number) => void;
  onFavoriteSelect: (location: LocationData) => void;
};

/**
 * The tab shell for the dashboard: the tab list, its accessibility
 * descriptions, and the four tab panels (forecast / multi-day / risk map /
 * system status).
 */
export function ForecastTabs({
  activeTab,
  onTabChange,
  loading,
  selectedLocation,
  currentTideData,
  currentWeatherData,
  nearestPierInfo,
  disasterAnalysis,
  onSelectPreset,
  onRefresh,
  onRiskAreaSelect,
  onFavoriteSelect,
}: ForecastTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
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
          onSelectPreset={onSelectPreset}
          onOpenRiskMap={() => onTabChange("riskmap")}
          onOpenMultiday={() => onTabChange("multiday")}
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
            onLocationSelect={onRiskAreaSelect}
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
              onRefresh={onRefresh}
            />

            <SettingsPanel />
          </div>
          <div className="space-y-6">
            <FavoriteLocations
              currentLocation={selectedLocation}
              onSelectLocation={onFavoriteSelect}
            />

            <SafetyTips currentRiskLevel={disasterAnalysis?.riskLevel || "low"} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default ForecastTabs;
