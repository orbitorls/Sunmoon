"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Anchor,
  Calendar as CalendarDays,
  CloudSun,
  Compass,
  Droplet,
  Map,
  MapPin,
  Thermometer,
  TrendingUp,
  Wind,
} from "lucide-react";
import ForecastTrustStrip from "./forecast-trust-strip";
import { TideStatusHero } from "./tide-status-hero";
import { WaterLevelGraphV2 as WaterLevelGraph } from "./water-level-graph-v2";
import DisasterAlert from "./disaster-alert";
import WeatherTrends from "./WeatherTrends";
import QuickActions from "./QuickActions";
import { cn } from "@/lib/utils";
import type { LocationData, TideData, WeatherData } from "@/lib/tide-service";
import type { DisasterAnalysis } from "@/lib/disaster-analysis";
import {
  getDistanceCategory,
  getDistanceCategoryColor,
  getDistanceCategoryText,
  getPierTypeIcon,
  getPierTypeText,
} from "@/lib/distance-utils";
import type { NearestPier } from "@/lib/distance-utils";

type ForecastTodayPanelProps = {
  loading: boolean;
  selectedLocation: LocationData;
  currentTideData: TideData;
  currentWeatherData: WeatherData;
  nearestPierInfo: NearestPier | null;
  disasterAnalysis: DisasterAnalysis | null;
  onSelectPreset: (location: LocationData) => void;
  onOpenRiskMap: () => void;
  onOpenMultiday: () => void;
};

function buildFriendlySummary(tideData: TideData): string {
  if (tideData.apiStatus !== "success" && tideData.apiStatus !== "offline") {
    return "กำลังพยายามดึงข้อมูลล่าสุดให้อยู่ ถ้ายังไม่ขึ้นให้ลองรีเฟรชอีกครั้ง";
  }

  switch (tideData.waterLevelStatus) {
    case "น้ำขึ้น":
      return "น้ำกำลังขยับสูงขึ้น ถ้าจะลงชายหาดหรือจอดเรือเล็กควรเช็กช่วงเวลาถัดไปไว้ก่อน";
    case "น้ำลง":
      return "น้ำกำลังลด เหมาะกับการดูแนวชายหาดและเช็กทางเดินลงเรือได้ง่ายขึ้น";
    case "น้ำนิ่ง":
      return "ระดับน้ำค่อนข้างคงที่ในช่วงนี้ เหมาะกับการเช็กสภาพโดยรวมก่อนวางแผนต่อ";
    default:
      return "ดูข้อมูลด้านล่างเพื่อเช็กระดับน้ำและเวลาเปลี่ยนรอบถัดไปแบบเข้าใจง่าย";
  }
}

export default function ForecastTodayPanel({
  loading,
  selectedLocation,
  currentTideData,
  currentWeatherData,
  nearestPierInfo,
  disasterAnalysis,
  onSelectPreset,
  onOpenRiskMap,
  onOpenMultiday,
}: ForecastTodayPanelProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-xl shadow-sky-100/60 dark:bg-slate-900/90 dark:shadow-none">
        <CardContent className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="relative mb-6">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Map className="h-6 w-6 text-sky-600" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
            กำลังเตรียมข้อมูลให้ดูง่ายที่สุด
          </h3>
          <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
            กำลังดึงข้อมูลน้ำขึ้นน้ำลงและอากาศสำหรับ {selectedLocation.name}
          </p>
        </CardContent>
      </Card>
    );
  }

  let nextEvent:
    | {
        type: string;
        time: string;
        level?: number;
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

  const distanceCategory = nearestPierInfo
    ? getDistanceCategory(nearestPierInfo.distance)
    : null;

  const beginnerSummary = buildFriendlySummary(currentTideData);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[1.15fr_repeat(4,minmax(0,1fr))]">
        <Card className="border-0 bg-slate-950 text-white shadow-xl shadow-slate-200/70 dark:bg-slate-900 dark:shadow-none">
          <CardContent className="p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/50">ตัวเลขที่ต้องดูตอนนี้</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-black leading-none">
                {currentTideData.currentWaterLevel.toFixed(2)}
              </span>
              <span className="pb-1 text-lg font-bold text-white/60">ม.</span>
            </div>
            <div className="mt-2 text-base font-semibold text-white/90">{currentTideData.waterLevelStatus}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-md shadow-slate-100 dark:bg-slate-900/80 dark:shadow-none">
          <CardContent className="p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">น้ำขึ้นสูงสุด</div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{currentTideData.highTideTime || "-"}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-md shadow-slate-100 dark:bg-slate-900/80 dark:shadow-none">
          <CardContent className="p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">น้ำลงต่ำสุด</div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{currentTideData.lowTideTime || "-"}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-md shadow-slate-100 dark:bg-slate-900/80 dark:shadow-none">
          <CardContent className="p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">อุณหภูมิ</div>
            <div className="mt-3 flex items-center gap-2 text-3xl font-black text-slate-900 dark:text-white">
              <Thermometer className="h-5 w-5 text-orange-500" />
              {Math.round(currentWeatherData.main?.temp ?? 0)}°C
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-md shadow-slate-100 dark:bg-slate-900/80 dark:shadow-none">
          <CardContent className="p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">สภาพน้ำวันนี้</div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{currentTideData.tideStatus}</div>
          </CardContent>
        </Card>
      </div>

      <ForecastTrustStrip
        sourceLabel={currentTideData.sourceLabel || currentTideData.dataSource}
        apiStatus={currentTideData.apiStatus}
        apiStatusMessage={currentTideData.apiStatusMessage}
        isFromCache={currentTideData.isFromCache}
        lastUpdated={currentTideData.lastUpdated}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <TideStatusHero
          status={currentTideData.waterLevelStatus}
          currentLevel={currentTideData.currentWaterLevel}
          nextEvent={nextEvent}
          className="h-full"
        />

        <Card className="border-0 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef8ff] shadow-xl shadow-sky-100/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <Compass className="h-5 w-5 text-sky-600" />
              สรุปให้ก่อนตัดสินใจ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {beginnerSummary}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-800/80 dark:ring-slate-700">
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  น้ำขึ้นสูงสุด
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {currentTideData.highTideTime || "-"}
                </div>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-800/80 dark:ring-slate-700">
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  น้ำลงต่ำสุด
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {currentTideData.lowTideTime || "-"}
                </div>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-800/80 dark:ring-slate-700">
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  อุณหภูมิ
                </div>
                <div className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  {Math.round(currentWeatherData.main?.temp ?? 0)}°C
                </div>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-sky-100 dark:bg-slate-800/80 dark:ring-slate-700">
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  สภาพน้ำวันนี้
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {currentTideData.tideStatus}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                className="h-14 rounded-2xl bg-sky-600 text-base font-bold hover:bg-sky-700"
                onClick={onOpenMultiday}
              >
                <CalendarDays className="mr-2 h-5 w-5" />
                ดูภาพรวม 7 วัน
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-2xl border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={onOpenRiskMap}
              >
                <Map className="mr-2 h-5 w-5" />
                เปิดแผนที่จุดเสี่ยง
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {disasterAnalysis && <DisasterAlert analysis={disasterAnalysis} />}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-white shadow-md shadow-slate-100 dark:bg-slate-900/80 dark:shadow-none">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <CloudSun className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-semibold">อากาศตอนนี้</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {currentWeatherData.weather?.[0]?.description || "ไม่มีข้อมูล"}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              รู้สึกเหมือน {Math.round(currentWeatherData.main?.feels_like ?? 0)}°C
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-md shadow-slate-100 dark:bg-slate-900/80 dark:shadow-none">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Wind className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">ลมและความชื้น</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {currentWeatherData.wind?.speed ?? 0} m/s
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              ความชื้น {currentWeatherData.main?.humidity ?? 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-md shadow-slate-100 dark:bg-slate-900/80 dark:shadow-none">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Droplet className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">ความหมายของวันนี้</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {currentTideData.tideStatus}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {currentTideData.tideStatus === "น้ำเป็น"
                ? "ช่วงต่างระดับน้ำค่อนข้างชัด ควรดูเวลาน้ำขึ้นน้ำลงให้แม่น"
                : "ระดับน้ำเปลี่ยนไม่รุนแรงมาก เหมาะกับการวางแผนแบบสบายขึ้น"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-0 bg-white shadow-xl shadow-slate-100 dark:bg-slate-900/85 dark:shadow-none">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-sky-600" />
              กราฟดูแนวโน้มวันนี้
            </CardTitle>
            <Badge variant="outline" className="w-fit rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              ดูว่าช่วงไหนน้ำขึ้นหรือลง
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {currentTideData.graphData && currentTideData.graphData.length > 0 ? (
            <WaterLevelGraph tideData={currentTideData} location={selectedLocation} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              ยังไม่มีข้อมูลกราฟสำหรับตำแหน่งนี้
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="rounded-3xl border border-slate-200 bg-white px-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <AccordionTrigger className="text-left text-base font-bold text-slate-900 hover:no-underline dark:text-white">
            ดูรายละเอียดเพิ่มเติมสำหรับคนที่อยากเช็กให้ครบ
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pb-6">
            {nearestPierInfo && distanceCategory && (
              <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-50 shadow-none dark:from-sky-950/20 dark:to-indigo-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                    <Anchor className="h-5 w-5 text-sky-600" />
                    จุดอ้างอิงใกล้ที่สุด
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-900/60">
                    <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">ชื่อสถานี/ท่าเรือ</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">{nearestPierInfo.name}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span>{getPierTypeIcon(nearestPierInfo.type)}</span>
                      <span>{getPierTypeText(nearestPierInfo.type)}</span>
                      <span>•</span>
                      <span>{nearestPierInfo.region}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-900/60">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin className="h-4 w-4" />
                      ระยะจากจุดที่คุณดู
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                      {nearestPierInfo.distance.toFixed(1)} กม.
                    </div>
                    <Badge className={cn("mt-3 rounded-full px-3 py-1 font-semibold", getDistanceCategoryColor(distanceCategory))}>
                      {getDistanceCategoryText(distanceCategory)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 bg-slate-50 shadow-none dark:bg-slate-950/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white">
                    แชร์หรือเปลี่ยนจุดดูเร็ว
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QuickActions
                    location={selectedLocation}
                    tideData={currentTideData}
                    onSelectPreset={onSelectPreset}
                  />
                </CardContent>
              </Card>

              <Card className="border-0 bg-slate-50 shadow-none dark:bg-slate-950/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white">
                    แนวโน้มอากาศประกอบ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentWeatherData && currentWeatherData.main.temp > 0 ? (
                    <WeatherTrends weatherData={currentWeatherData} />
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีข้อมูลแนวโน้มอากาศ</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
