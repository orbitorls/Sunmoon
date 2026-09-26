"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, MapPin, TrendingDown, TrendingUp, Waves } from "lucide-react";
import { TideData } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import {
  compareWaterLevel,
  compareWithPrediction,
  getPredictionDeviationColor,
  type WaterLevelComparison,
  type PredictionDeviation,
} from "@/lib/comparison/water-level-comparison";

// recharts is heavy — load the chart canvas only in the browser, keeping
// recharts out of the main client bundle (mirrors the map components).
const WaterLevelChart = dynamic(() => import("./water-level-graph.client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
      กำลังโหลดกราฟ...
    </div>
  ),
});

interface WaterLevelGraphProps {
  tideData: TideData;
  location?: { lat: number; lon: number; name: string };
}

const ReferenceComparisonBadge: React.FC<{ comparison: WaterLevelComparison }> = ({ comparison }) => {
  if (!comparison.referencePoint && comparison.distanceKm < 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span className="text-xs text-amber-700">
          ใช้ค่าประมาณเพราะไม่พบจุดอ้างอิงใกล้เคียง
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border px-3 py-2", comparison.statusColor)}>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        <span className="text-xs font-medium tabular-nums">
          {comparison.referencePoint?.name} ({comparison.distanceKm.toFixed(1)} กม.)
        </span>
      </div>
      <div className="flex items-center gap-2">
        {comparison.isAboveReference ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span className="text-xs">{comparison.statusText}</span>
      </div>
    </div>
  );
};

const PredictionDeviationBadge: React.FC<{ deviation: PredictionDeviation }> = ({ deviation }) => {
  if (deviation.warningLevel === "none") {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", getPredictionDeviationColor(deviation.warningLevel))}>
      {deviation.isHigherThanPredicted ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span className="text-xs font-medium">{deviation.warningText}</span>
    </div>
  );
};

export const WaterLevelGraph: React.FC<WaterLevelGraphProps> = ({ tideData, location }) => {
  const waterLevelComparison = useMemo<WaterLevelComparison>(() => {
    if (location) {
      return compareWaterLevel(location.lat, location.lon, tideData.currentWaterLevel);
    }
    return compareWaterLevel(13.7563, 100.5018, tideData.currentWaterLevel);
  }, [location, tideData.currentWaterLevel]);

  const predictionDeviation = useMemo<PredictionDeviation | null>(() => {
    const currentHour = new Date().getHours();
    const predictedData = tideData.graphData.find((d) => parseInt(d.time.split(":")[0], 10) === currentHour && d.prediction);
    const actualData = tideData.graphData.find((d) => parseInt(d.time.split(":")[0], 10) === currentHour && !d.prediction);

    if (actualData && predictedData) {
      return compareWithPrediction(actualData.level, predictedData.level);
    }

    if (predictedData && tideData.currentWaterLevel > 0) {
      return compareWithPrediction(tideData.currentWaterLevel, predictedData.level);
    }

    return null;
  }, [tideData.graphData, tideData.currentWaterLevel]);

  const levels = tideData.graphData.map((d) => d.level);
  const hasSeries = levels.length > 0;
  const minLevel = hasSeries ? Math.min(...levels) : 0;
  const maxLevel = hasSeries ? Math.max(...levels) : 0;
  const paddedMin = minLevel - 0.3;
  const paddedMax = maxLevel + 0.3;

  return (
    <Card className="w-full overflow-hidden rounded-2xl border-0 bg-white/90 shadow-lg ring-1 ring-slate-900/5">
      <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Waves className="h-5 w-5 text-blue-600" />
              กราฟระดับน้ำ 24 ชั่วโมง
            </CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-slate-100 tabular-nums text-slate-700">
                สูงสุด {maxLevel.toFixed(2)} ม.
              </Badge>
              <Badge variant="secondary" className="bg-slate-100 tabular-nums text-slate-700">
                ต่ำสุด {minLevel.toFixed(2)} ม.
              </Badge>
              <Badge
                className={cn(
                  "tabular-nums",
                  tideData.isDatumConvertedToMsl
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                เส้นอ้างอิง ม.รทก. {waterLevelComparison.referenceLevel.toFixed(2)} ม.
                {!tideData.isDatumConvertedToMsl && " (คนละ datum)"}
              </Badge>
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div>อัปเดตล่าสุด</div>
            <div className="font-medium tabular-nums text-slate-700">
              {new Date(tideData.lastUpdated).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 md:p-6">
        <div className={cn(
          "rounded-2xl p-5 text-white",
          waterLevelComparison.status === "critical"
            ? "bg-gradient-to-br from-red-500 to-red-600"
            : waterLevelComparison.status === "warning"
              ? "bg-gradient-to-br from-orange-500 to-orange-600"
              : waterLevelComparison.status === "low"
                ? "bg-gradient-to-br from-cyan-500 to-cyan-600"
                : "bg-gradient-to-br from-blue-500 to-blue-600"
        )}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">
                {tideData.waterLevelStatus}
                {waterLevelComparison.status === "critical" ? " - วิกฤต" : ""}
                {waterLevelComparison.status === "warning" ? " - เตือน" : ""}
                {waterLevelComparison.status === "low" ? " - น้ำลง" : ""}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                {/* Shown as computed; see the note in tide-status-hero.tsx. */}
                <span className="text-5xl font-black tabular-nums tracking-tight">
                  {tideData.currentWaterLevel.toFixed(2)}
                </span>
                <span className="pb-2 text-lg font-medium text-white/80">เมตร</span>
              </div>
              <p className="mt-2 text-sm text-white/80">
                {waterLevelComparison.statusText}
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <div className="text-xs text-white/70">น้ำขึ้นสูง</div>
                <div className="text-base font-bold tabular-nums">{tideData.highTideTime || "--:--"}</div>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <div className="text-xs text-white/70">น้ำลงต่ำ</div>
                <div className="text-base font-bold tabular-nums">{tideData.lowTideTime || "--:--"}</div>
              </div>
              <div className="col-span-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <div className="text-xs text-white/70">ข้อมูลแสดงผล</div>
                <div className="text-sm font-medium">
                  กราฟรายชั่วโมงเพื่ออ่านแนวโน้มเร็วขึ้น
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasSeries ? (
          <WaterLevelChart
            data={tideData.graphData}
            domain={[paddedMin, paddedMax]}
            referenceLevel={waterLevelComparison.referenceLevel}
            warningThresholdMeters={waterLevelComparison.referencePoint?.warningThresholdMeters}
            floodThresholdMeters={waterLevelComparison.referencePoint?.floodThresholdMeters}
          />
        ) : (
          <div className="flex h-[320px] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            ยังไม่มีข้อมูลกราฟสำหรับตำแหน่งนี้
          </div>
        )}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details">
            <AccordionTrigger className="text-sm font-medium">
              รายละเอียดเพิ่มเติม
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <ReferenceComparisonBadge comparison={waterLevelComparison} />
                {predictionDeviation && predictionDeviation.warningLevel !== "none" && (
                  <PredictionDeviationBadge deviation={predictionDeviation} />
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                กราฟนี้แสดงข้อมูลรายชั่วโมงเพื่ออ่านภาพรวมเร็วขึ้น รายละเอียดเชิงเทคนิคยังคงมีให้แต่ถูกซ่อนไว้เป็นค่าเริ่มต้น
              </div>

              <div className="max-h-60 overflow-y-auto overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">เวลา</th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-600">ระดับน้ำ</th>
                      <th className="px-4 py-2 text-center font-semibold text-slate-600">ต่างจากเส้นอ้างอิง</th>
                      <th className="px-4 py-2 text-center font-semibold text-slate-600">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tideData.graphData.map((data, index) => {
                      const diff = data.level - waterLevelComparison.referenceLevel;
                      const isCurrent = parseInt(data.time.split(":")[0], 10) === new Date().getHours();

                      return (
                        <tr
                          key={index}
                          className={cn(
                            "transition-colors duration-200 hover:bg-slate-50",
                            isCurrent ? "bg-blue-50/60" : "bg-white"
                          )}
                        >
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600">{data.time}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-slate-800">{data.level.toFixed(2)}</td>
                          <td className={cn("px-4 py-2.5 text-center font-mono tabular-nums", diff > 0 ? "text-orange-600" : "text-emerald-600")}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-600">
                            <span className={cn("mr-2 inline-block h-1.5 w-1.5 rounded-full", data.prediction ? "bg-blue-400" : "bg-emerald-500")} />
                            {data.prediction ? "ทำนาย" : "จริง"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default WaterLevelGraph;
