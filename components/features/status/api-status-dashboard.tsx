"use client";

import { Button } from "@/components/ui/button";
import { Server, RefreshCw } from "lucide-react";
import HealthCards from "@/components/features/status/health-cards";
import { cn } from "@/lib/utils";
import { useApiHealth } from "@/hooks/use-api-health";

type ApiStatusDashboardProps = {
  tideApiStatus: string;
  weatherApiStatus: string;
  lastUpdated: string;
  onRefresh?: () => void;
};

function toHealthStatus(apiStatus: string): "online" | "offline" | "degraded" | "maintenance" {
  if (apiStatus === "success") return "online";
  if (apiStatus === "loading") return "degraded";
  if (apiStatus === "timeout") return "degraded";
  return "offline";
}

export default function ApiStatusDashboard({
  tideApiStatus,
  weatherApiStatus,
  lastUpdated,
  onRefresh,
}: ApiStatusDashboardProps) {
  const { health, loading, refresh } = useApiHealth(true);

  const handleRefresh = async () => {
    await refresh();
    onRefresh?.();
  };

  const tideHealth = toHealthStatus(tideApiStatus);
  const weatherHealth = toHealthStatus(weatherApiStatus);
  const checkedAt = health.checkedAt
    ? new Date(health.checkedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) +
      " น."
    : "—";

  return (
    <div className="space-y-4" role="region" aria-labelledby="api-status-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50"
            aria-hidden="true"
          >
            <Server className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h3 id="api-status-heading" className="font-display text-lg font-bold text-slate-900">
              สถานะระบบและ API
            </h3>
            <p className="text-sm text-slate-500">
              ตรวจสอบการเชื่อมต่อและแหล่งข้อมูลที่ใช้งานจริง
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2 rounded-[4px]"
          aria-label={loading ? "กำลังรีเฟรชข้อมูลสถานะระบบ" : "รีเฟรชข้อมูลสถานะระบบ"}
        >
          <RefreshCw
            className={cn("h-4 w-4", loading && "animate-spin motion-reduce:animate-none")}
            aria-hidden="true"
          />
          รีเฟรช
        </Button>
      </div>

      <HealthCards
        tideStatus={tideHealth}
        tideMessage={
          tideApiStatus === "success"
            ? "ข้อมูลน้ำขึ้นลงพร้อมใช้งาน"
            : tideApiStatus === "loading"
              ? "กำลังประมวลผลข้อมูลล่าสุด"
              : "กำลังใช้ข้อมูลที่ลดทอนหรือโหลดไม่สำเร็จ"
        }
        weatherStatus={weatherHealth}
        weatherMessage={
          weatherApiStatus === "success"
            ? "ข้อมูลสภาพอากาศพร้อมใช้งาน"
            : weatherApiStatus === "loading"
              ? "กำลังโหลดข้อมูลสภาพอากาศ"
              : "ยังไม่มีข้อมูลสภาพอากาศที่ยืนยันได้"
        }
        lastUpdated={lastUpdated ? `${new Date(lastUpdated).toLocaleTimeString("th-TH")} ICT` : "—"}
        providers={health.providers}
      />

      <p className="text-xs text-slate-500">
        ตรวจสอบผู้ให้บริการเมื่อ {checkedAt}
        {health.allHealthy ? " — ทุกรายการตอบกลับปกติ" : " — มีบางรายการที่ยังไม่พร้อมใช้งาน"}
      </p>
    </div>
  );
}
