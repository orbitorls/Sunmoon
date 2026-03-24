"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, Database, ShieldAlert, ShieldCheck } from "lucide-react";

type ForecastTrustStripProps = {
  sourceLabel?: string;
  apiStatus: string;
  apiStatusMessage: string;
  isFromCache?: boolean;
  lastUpdated: string;
  className?: string;
};

export default function ForecastTrustStrip({
  sourceLabel,
  apiStatus,
  apiStatusMessage,
  isFromCache,
  lastUpdated,
  className,
}: ForecastTrustStripProps) {
  const sourceText = sourceLabel?.trim() || "โมเดลฮาร์มอนิกภายใน";
  const freshnessState =
    apiStatus === "success"
      ? isFromCache
        ? "ข้อมูลจากแคช"
        : "ข้อมูลล่าสุด"
      : apiStatus === "loading"
        ? "กำลังประมวลผล"
        : "ข้อมูลลดทอน";
  const freshnessText = lastUpdated
    ? new Date(lastUpdated).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "ไม่มีข้อมูลอัปเดต";

  const statusTone =
    apiStatus === "success"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : apiStatus === "loading"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";

  return (
    <Card className={cn("border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70", className)}>
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Database className="h-3.5 w-3.5" />
              {sourceText}
            </Badge>
            <Badge className={cn("gap-1.5", isFromCache ? "bg-amber-500 text-white" : "bg-emerald-600 text-white")}>
              {isFromCache ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {freshnessState}
            </Badge>
            <Badge className={cn("gap-1.5", statusTone)}>
              <Clock className="h-3.5 w-3.5" />
              {freshnessText}
            </Badge>
          </div>
          <div className="text-sm leading-snug text-slate-600 dark:text-slate-300 md:max-w-[44%] md:text-right">
            {apiStatusMessage}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
