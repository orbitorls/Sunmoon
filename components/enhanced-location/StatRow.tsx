"use client";

import { Thermometer } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import type { TideData, WeatherData } from "@/lib/domain/types";

const CARD_CLASS =
  "rounded-2xl bg-white/85 backdrop-blur-sm p-4 sm:p-5 shadow-sm ring-1 ring-blue-100/70 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none dark:bg-slate-800/80 dark:ring-slate-700";

type StatRowProps = {
  tideData: TideData;
  weatherData: WeatherData;
};

/**
 * The row of five headline stat cards at the top of the dashboard.
 */
export function StatRow({ tideData, weatherData }: StatRowProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard className={CARD_CLASS} label="ระดับน้ำตอนนี้">
        <div className="mt-2 flex items-end gap-1">
          <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
            {tideData.currentWaterLevel.toFixed(2)}
          </span>
          <span className="pb-1 text-sm font-bold text-slate-600 dark:text-slate-400">ม.</span>
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {tideData.waterLevelStatus}
        </div>
      </StatCard>

      <StatCard className={CARD_CLASS} label="น้ำขึ้นสูงสุด">
        <div className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
          {tideData.highTideTime || "-"}
        </div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">เวลาที่ควรระวังน้ำหนุน</div>
      </StatCard>

      <StatCard className={CARD_CLASS} label="น้ำลงต่ำสุด">
        <div className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
          {tideData.lowTideTime || "-"}
        </div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">ช่วงเห็นแนวชายฝั่งชัดขึ้น</div>
      </StatCard>

      <StatCard className={CARD_CLASS} label="อุณหภูมิ">
        <div className="mt-2 flex items-center gap-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
          <Thermometer className="h-5 w-5 text-orange-500" />
          {Math.round(weatherData.main?.temp ?? 0)}°
        </div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          รู้สึกเหมือน {Math.round(weatherData.main?.feels_like ?? 0)}°C
        </div>
      </StatCard>

      <StatCard
        className="rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 p-4 sm:p-5 text-white shadow-lg shadow-blue-200/50 transition-shadow duration-200 hover:shadow-xl motion-reduce:transition-none dark:shadow-blue-950/30"
        label="สรุปวันนี้"
        labelClassName="text-[11px] font-black uppercase tracking-[0.18em] text-white/80"
      >
        <div className="mt-2 text-2xl font-black">
          {tideData.tideStatus}
        </div>
        <div className="mt-1 text-sm text-white/90">
          {tideData.apiStatus === "success" ? "มีข้อมูลพร้อมดูต่อ" : "ใช้ข้อมูลสำรองหรือออฟไลน์"}
        </div>
      </StatCard>
    </div>
  );
}

export default StatRow;
