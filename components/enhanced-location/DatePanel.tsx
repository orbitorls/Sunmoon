"use client";

import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type DatePanelProps = {
  loading: boolean;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
};

/**
 * The "เลือกวันที่" card: the day calendar plus the selected-day summary.
 */
export function DatePanel({ loading, selectedDate, onSelectDate }: DatePanelProps) {
  return (
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
            onSelect={(date) => onSelectDate(date)}
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
  );
}

export default DatePanel;
