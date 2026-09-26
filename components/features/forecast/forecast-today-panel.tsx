"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Anchor,
  Calendar as CalendarDays,
  Compass,
  Map,
  MapPin,
} from "lucide-react";
import ForecastTrustStrip from "@/components/features/forecast/forecast-trust-strip";
import { WaterLevelGraph } from "@/components/features/forecast/water-level-graph";
import DisasterAlert from "@/components/features/disaster/disaster-alert";
import WeatherTrends from "@/components/features/weather/weather-trends";
import QuickActions from "@/components/shared/quick-actions";
import { cn } from "@/lib/utils";
import type { LocationData, TideData, WeatherData } from "@/lib/domain/types";
import type { DisasterAnalysis } from "@/lib/domain/disaster-analysis";
import {
  getDistanceCategory,
  getDistanceCategoryColor,
  getDistanceCategoryText,
  getPierTypeIcon,
  getPierTypeText,
} from "@/lib/presentation/geo-display";
import type { NearestPier } from "@/lib/domain/geo";

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
      <Card className="border-0 shadow-xl shadow-sky-100/60">
        <CardContent className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="relative mb-6">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600 motion-reduce:animate-none" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Map className="h-6 w-6 text-sky-600" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">
            กำลังเตรียมข้อมูลให้ดูง่ายที่สุด
          </h3>
          <p className="max-w-md text-sm text-slate-600">
            กำลังดึงข้อมูลน้ำขึ้นน้ำลงและอากาศสำหรับ {selectedLocation.name}
          </p>
        </CardContent>
      </Card>
    );
  }

  const distanceCategory = nearestPierInfo
    ? getDistanceCategory(nearestPierInfo.distance)
    : null;

  const beginnerSummary = buildFriendlySummary(currentTideData);

  // Real per-factor risk contributions computed in `disaster-classify.ts`,
  // not share-of-total percentages: the score is a sum of contributions, so
  // normalising it would invent a decomposition the model never made.
  const surgeFactors = disasterAnalysis
    ? disasterAnalysis.factors.filter((f) => f.id !== "monsoon").slice(0, 3)
    : [];

  return (
    <div className="space-y-6">
      {disasterAnalysis && (disasterAnalysis.riskLevel === "critical" || disasterAnalysis.riskLevel === "high") && (
        <section className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Map className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                  ประกาศเตือนภัยด่วน
                </span>
              </div>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900 md:text-xl">
                {disasterAnalysis.headline || `ระวังน้ำทะเลหนุนสูง ${currentTideData.highTideTime || ""} น. คาดว่าน้ำท่วมเหนือระดับปกติ ${typeof disasterAnalysis.floodPrediction?.expectedLevel === "number" ? Math.round(disasterAnalysis.floodPrediction.expectedLevel) : "—"} ซม.`}
              </h2>
            </div>
          </div>
          <div className="shrink-0 self-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold tabular-nums text-slate-600 md:self-center">
            {selectedLocation.name} • {currentTideData.tideStatus} • {currentTideData.isWaxingMoon ? "ข้างขึ้น" : "ข้างแรม"} {currentTideData.lunarPhaseKham} ค่ำ • {currentTideData.lastUpdated ? new Date(currentTideData.lastUpdated).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"} น.
          </div>
        </section>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-200 bg-white p-7 shadow-[0_2px_10px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-brand-50" aria-hidden="true" />
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">ระดับน้ำตรวจวัดล่าสุด</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-blue-50 px-3 py-1 text-xs font-bold text-brand-700">
                {currentTideData.waterLevelStatus}
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="hero-metric text-6xl font-extrabold tracking-tight text-slate-900">
                {currentTideData.currentWaterLevel.toFixed(2)}
              </span>
              <span className="text-2xl font-bold text-slate-500">ม.</span>
            </div>
          </div>
          <div className="relative flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span className="tabular-nums">อัปเดต {currentTideData.lastUpdated ? new Date(currentTideData.lastUpdated).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
            <span className="font-semibold text-slate-700">เกณฑ์เตือน +2.40 ม.</span>
          </div>
        </Card>

        <Card className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-red-200 bg-white p-7 shadow-[0_2px_10px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-red-50" aria-hidden="true" />
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">น้ำขึ้นสูงสุดถัดไป</span>
              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                ⚠️ ระวังน้ำท่วมขัง
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="hero-metric text-6xl font-extrabold tracking-tight text-red-600">
                {currentTideData.highTideTime || "-"}
              </span>
              <span className="text-xl font-bold text-slate-600">น.</span>
            </div>
          </div>
          <div className="relative flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
            <span className="text-slate-500">คาดการณ์ระดับสูงสุด</span>
            <span className="text-sm font-black text-red-600">
              {currentTideData.tideEvents?.find((e) => e.type === "high")?.level.toFixed(2) ?? currentTideData.currentWaterLevel.toFixed(2)} ม.
            </span>
          </div>
        </Card>

        <Card className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_2px_10px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">น้ำลงต่ำสุดถัดไป</span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                🌊 แนวหาดโผล่
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="hero-metric text-6xl font-extrabold tracking-tight text-slate-800">
                {currentTideData.lowTideTime || "-"}
              </span>
              <span className="text-xl font-bold text-slate-600">น.</span>
            </div>
          </div>
          <div className="relative flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
            <span className="text-slate-500">ระดับต่ำสุดประมาณ</span>
            <span className="text-sm font-bold tabular-nums text-slate-700">
              {currentTideData.tideEvents?.find((e) => e.type === "low")?.level.toFixed(2) ?? "-"} ม.
            </span>
          </div>
        </Card>

        <Card className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-brand-600 to-brand-800 p-7 text-white shadow-[0_2px_10px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-white/70">ภาวะทางดาราศาสตร์</span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                {currentTideData.tideStatus === "น้ำเป็น" ? "Spring Tide" : "Neap Tide"}
              </span>
            </div>
            <div className="my-2 font-thai text-5xl font-extrabold tracking-tight">
              {currentTideData.tideStatus === "น้ำเป็น" ? "น้ำเกิด" : "น้ำตาย"}
            </div>
            <p className="text-sm leading-6 text-white/80">
              {currentTideData.isWaxingMoon ? "ข้างขึ้น" : "ข้างแรม"} {currentTideData.lunarPhaseKham} ค่ำ • {Math.round(currentWeatherData.main?.temp ?? 0)}°C รู้สึกเหมือน {Math.round(currentWeatherData.main?.feels_like ?? 0)}°C
            </p>
          </div>
          <div className="relative flex items-center justify-between border-t border-white/15 pt-4 text-xs text-white/80">
            <span>{currentTideData.apiStatus === "success" ? "มีข้อมูลพร้อมดูต่อ" : "ใช้ข้อมูลสำรองหรือออฟไลน์"}</span>
            <span className="font-semibold">{currentTideData.isWaxingMoon ? "ดวงจันทร์หนุนแรง" : "แรงดึงปานกลาง"}</span>
          </div>
        </Card>
      </div>

      <ForecastTrustStrip
        sourceLabel={currentTideData.sourceLabel || currentTideData.dataSource}
        apiStatus={currentTideData.apiStatus}
        apiStatusMessage={currentTideData.apiStatusMessage}
        isFromCache={currentTideData.isFromCache}
        lastUpdated={currentTideData.lastUpdated}
        qualityScore={currentTideData.qualityScore}
        confidenceMethod={currentTideData.confidenceMethod}
        degraded={currentTideData.degraded}
        degradedReason={currentTideData.degradedReason}
        measuredAccuracy={currentTideData.measuredAccuracy}
        verificationTier={currentTideData.verificationTier}
        gaugeDistanceKm={currentTideData.gaugeDistanceKm}
        isDatumConvertedToMsl={currentTideData.isDatumConvertedToMsl}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)] lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden="true" />
                  กราฟคาดการณ์ระดับน้ำทะเล 24 ชั่วโมง
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  {currentTideData.isDatumConvertedToMsl
                    ? "โมเดลฮาร์มอนิกและสถานีวัดจริงอ้างอิงเส้นเดียวกัน (MSL)"
                    : "ระดับน้ำอ้างอิงมาตรฐานของสถานี (ยังไม่ได้แปลงเป็นระดับทะเลปานกลาง) ดูป้ายกำกับด้านบน"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand-600" /> ระดับคาดการณ์</span>
                <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-red-500" /> วิกฤต (&gt;2.40 ม.)</span>
                <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-slate-400" /> เกณฑ์ปกติ</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="micro-label text-slate-400">เวลาปัจจุบัน</div>
                <div className="telemetry-num mt-1 text-lg font-bold text-slate-800">
                  {currentTideData.lastUpdated ? new Date(currentTideData.lastUpdated).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"} น.
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="micro-label text-slate-400">ระดับตอนนี้</div>
                <div className="telemetry-num mt-1 text-lg font-bold text-slate-800">
                  {currentTideData.currentWaterLevel >= 0 ? "+" : ""}{currentTideData.currentWaterLevel.toFixed(2)} ม.
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <div className="micro-label text-emerald-700">สภาพคลื่นลม</div>
                <div className="mt-1 text-lg font-bold text-emerald-700">
                  คลื่นสงบ ({(currentWeatherData.wind?.speed ?? 0).toFixed(1)} ม.)
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="micro-label text-slate-400">ความกดอากาศ</div>
                <div className="telemetry-num mt-1 text-lg font-bold text-slate-800">
                  {currentWeatherData.main?.pressure ?? "-"} hPa
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {currentTideData.graphData && currentTideData.graphData.length > 0 ? (
              <>
                <WaterLevelGraph tideData={currentTideData} location={selectedLocation} />
                {currentTideData.tideEvents && currentTideData.tideEvents.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500">
                      คาดการณ์ล่วงหน้าช่วงเวลาที่สำคัญ
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {currentTideData.tideEvents.slice(0, 6).map((event, index) => {
                        const level = event.level;
                        const critical = level >= 2.4;
                        const high = event.type === "high";
                        return (
                          <div
                            key={`${event.time}-${index}`}
                            className={cn(
                              "rounded-xl border p-2 text-center",
                              critical
                                ? "border-red-200 bg-red-50"
                                : high
                                  ? "border-brand-200 bg-brand-50"
                                  : "border-slate-200 bg-white",
                            )}
                          >
                            <div className="telemetry-num text-[11px] font-medium text-slate-500">{event.time}</div>
                            <div className={cn("telemetry-num text-lg font-extrabold", critical ? "text-red-600" : high ? "text-brand-700" : "text-slate-800")}>
                              {level.toFixed(2)}<span className="text-xs font-bold">ม.</span>
                            </div>
                            <div className={cn("text-[11px] font-semibold", critical ? "text-red-600" : "text-slate-500")}>
                              {critical ? "⚠ วิกฤต" : high ? "↑ หนุนแล้ว" : "↓ ปลอดภัย"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-600">
                ยังไม่มีข้อมูลกราฟสำหรับตำแหน่งนี้
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <CardTitle className="flex items-center justify-between font-display text-base font-bold text-slate-900">
              วิเคราะห์ความเสี่ยงภัยพิบัติ
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                disasterAnalysis?.riskLevel === "critical" || disasterAnalysis?.riskLevel === "high"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700",
              )}>
                {disasterAnalysis ? `วิกฤตสูงสุด` : "รอข้อมูล"}
              </span>
            </CardTitle>
            <div className="mt-4 flex items-start gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-red-500">
                <div className="text-center">
                  <div className="telemetry-num text-2xl font-extrabold text-slate-900">
                    {disasterAnalysis?.overallRating ?? "-"}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">/ 100 คะแนน</div>
                </div>
              </div>
              <div className="text-sm leading-6 text-slate-600">
                <p className="font-bold text-slate-900">
                  คาดการณ์น้ำล้นตลิ่ง {typeof disasterAnalysis?.floodPrediction?.expectedLevel === "number" ? `+${Math.max(0, Math.round(disasterAnalysis.floodPrediction.expectedLevel))} ซม.` : "—"}
                </p>
                <p className="mt-1">{beginnerSummary}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="micro-label text-slate-400">พื้นที่คาดว่าจะได้รับผลกระทบโดยตรง</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(nearestPierInfo ? [nearestPierInfo.name, nearestPierInfo.region] : ["ท่าเรือและชายฝั่ง", "ถนนริมน้ำ"]).slice(0, 4).map((area) => (
                  <span key={area} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {area}
                  </span>
                ))}
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">ชุมชนริมคลอง</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">แพปลาและท่าเรือ</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
            <CardTitle className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">✓</span>
              คำแนะนำการรับมือฉุกเฉิน
            </CardTitle>
            <ol className="mt-3 space-y-2">
              {(disasterAnalysis?.recommendations?.slice(0, 3) ?? [
                "เคลื่อนย้ายยานพาหนะไปจอดที่สูงก่อน 03:00 น.",
                "เตรียมแนวกระสอบทรายหน้าทางเข้าอาคารริมน้ำ",
                "งดเดินเรือเล็กจนกว่าระดับน้ำจะลดลงสู่ระดับปกติ",
              ]).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {idx + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Card className="rounded-2xl border-0 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef8ff] shadow-xl shadow-sky-100/60">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Compass className="h-5 w-5 text-sky-600" />
            สรุปให้ก่อนตัดสินใจ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            {beginnerSummary}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              className="h-14 cursor-pointer rounded-2xl bg-sky-600 text-base font-bold transition-colors duration-200 hover:bg-sky-700 focus-enhanced"
              onClick={onOpenMultiday}
            >
              <CalendarDays className="mr-2 h-5 w-5" />
              ดูภาพรวม 7 วัน
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 cursor-pointer rounded-2xl border-slate-200 bg-white text-base font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-enhanced"
              onClick={onOpenRiskMap}
            >
              <Map className="mr-2 h-5 w-5" />
              เปิดแผนที่จุดเสี่ยง
            </Button>
          </div>
        </CardContent>
      </Card>

      {disasterAnalysis && (
        <DisasterAlert
          analysis={disasterAnalysis}
          location={{ lat: selectedLocation.lat, lon: selectedLocation.lon }}
        />
      )}

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="rounded-3xl border border-slate-200 bg-white px-5 shadow-sm">
          <AccordionTrigger className="text-left text-base font-bold text-slate-900 hover:no-underline">
            ดูรายละเอียดเพิ่มเติมสำหรับคนที่อยากเช็กให้ครบ
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pb-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="surge" className="rounded-2xl border border-slate-200 bg-white px-5">
                <AccordionTrigger className="text-left text-base font-bold text-slate-900 hover:no-underline">
                  องค์ประกอบการหนุนของระดับน้ำทะเล
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <p className="mb-3 text-xs text-slate-500">
                    {disasterAnalysis
                      ? `คำนวณจากข้อมูลจริงที่จุดนี้ • ระดับน้ำปัจจุบัน ${currentTideData.currentWaterLevel.toFixed(2)} ม.`
                      : "ยังไม่มีผลวิเคราะห์ปัจจัยเสี่ยงสำหรับตำแหน่งนี้"}
                  </p>
                  {surgeFactors.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {surgeFactors.map((factor) => (
                        <div key={factor.id} className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span>{factor.name}</span>
                            <span className="font-bold tabular-nums text-slate-700">
                              {factor.riskContribution}
                            </span>
                          </div>
                          <div className="telemetry-num mt-1 text-lg font-extrabold text-slate-900">
                            {typeof factor.value === "number"
                              ? `${factor.value.toFixed(1)}${factor.unit === "เมตร" ? " ม." : ""}`
                              : factor.value}
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                factor.contributeToRisk ? "bg-brand-600" : "bg-slate-300",
                              )}
                              style={{ width: `${Math.min(100, factor.riskContribution * 2.5)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] leading-4 text-slate-500">
                            {factor.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                      ไม่มีข้อมูลปัจจัยเสี่ยงที่คำนวณได้
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="weather" className="rounded-2xl border border-slate-200 bg-white px-5">
                <AccordionTrigger className="text-left text-base font-bold text-slate-900 hover:no-underline">
                  สภาพอากาศประกอบ
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-5 shadow-md shadow-slate-100">
                      <div className="mb-3 flex items-center gap-2 text-slate-600">
                        <Map className="h-4 w-4 text-sky-500" />
                        <span className="text-sm font-semibold">อากาศตอนนี้</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {currentWeatherData.weather?.[0]?.description || "ไม่มีข้อมูล"}
                      </div>
                      <div className="mt-2 text-sm tabular-nums text-slate-600">
                        รู้สึกเหมือน {Math.round(currentWeatherData.main?.feels_like ?? 0)}°C
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-5 shadow-md shadow-slate-100">
                      <div className="mb-3 flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-semibold">ลมและความชื้น</span>
                      </div>
                      <div className="text-2xl font-black tabular-nums text-slate-900">
                        {currentWeatherData.wind?.speed ?? 0} m/s
                      </div>
                      <div className="mt-2 text-sm tabular-nums text-slate-600">
                        ความชื้น {currentWeatherData.main?.humidity ?? 0}%
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white p-5 shadow-md shadow-slate-100">
                      <div className="mb-3 flex items-center gap-2 text-slate-600">
                        <Compass className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold">ความหมายของวันนี้</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {currentTideData.tideStatus}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {currentTideData.tideStatus === "น้ำเป็น"
                          ? "ช่วงต่างระดับน้ำค่อนข้างชัด ควรดูเวลาน้ำขึ้นน้ำลงให้แม่น"
                          : "ระดับน้ำเปลี่ยนไม่รุนแรงมาก เหมาะกับการวางแผนแบบสบายขึ้น"}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {nearestPierInfo && distanceCategory && (
              <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-50 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                    <Anchor className="h-5 w-5 text-sky-600" />
                    จุดอ้างอิงใกล้ที่สุด
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl bg-white/80 p-4">
                    <div className="mb-2 text-sm text-slate-600">ชื่อสถานี/ท่าเรือ</div>
                    <div className="text-xl font-black text-slate-900">{nearestPierInfo.name}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span>{getPierTypeIcon(nearestPierInfo.type)}</span>
                      <span>{getPierTypeText(nearestPierInfo.type)}</span>
                      <span>•</span>
                      <span>{nearestPierInfo.region}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4" />
                      ระยะจากจุดที่คุณดู
                    </div>
                    <div className="text-3xl font-black text-slate-900">
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
              <Card className="border-0 bg-slate-50 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-black text-slate-900">
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

              <Card className="border-0 bg-slate-50 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-black text-slate-900">
                    แนวโน้มอากาศประกอบ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentWeatherData && currentWeatherData.main.temp > 0 ? (
                    <WeatherTrends weatherData={currentWeatherData} />
                  ) : (
                    <div className="text-sm text-slate-600">ยังไม่มีข้อมูลแนวโน้มอากาศ</div>
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
