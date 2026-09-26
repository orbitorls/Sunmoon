"use client";

import { cn } from "@/lib/utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SeapaloNavKey = "forecast" | "multiday" | "riskmap" | "status";

const NAV_ITEMS: { key: SeapaloNavKey; label: string }[] = [
  { key: "forecast", label: "พยากรณ์วันนี้" },
  { key: "multiday", label: "พยากรณ์ 7 วัน" },
  { key: "riskmap", label: "แผนที่เสี่ยงภัย" },
  { key: "status", label: "สถานะ & ไทล์" },
];

type SeapaloHeaderProps = {
  active: SeapaloNavKey;
  onNavigate?: (tab: SeapaloNavKey) => void;
  locationName?: string;
  lat?: number;
  lon?: number;
  updatedLabel?: string;
  online?: boolean;
  surgeLabel?: string;
};

function WaveMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
      <svg
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      </svg>
    </div>
  );
}

export default function SeapaloHeader({
  active,
  onNavigate,
  locationName,
  lat,
  lon,
  updatedLabel,
  online = true,
  surgeLabel,
  badges,
}: SeapaloHeaderProps & { badges?: Partial<Record<SeapaloNavKey, number>> }) {
  const renderNavItem = (item: { key: SeapaloNavKey; label: string }) => {
    const isActive = active === item.key;
    const badge = badges?.[item.key];
    const className = cn(
      "relative cursor-pointer whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition sm:px-4",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
      isActive
        ? "bg-white font-bold text-brand-700 shadow-md ring-1 ring-brand-200 after:absolute after:inset-x-3 after:-bottom-[3px] after:h-[3px] after:rounded-full after:bg-brand-600"
        : "font-medium text-slate-600 hover:bg-white/60 hover:text-slate-900",
    );
    const label = (
      <>
        {item.label}
        {typeof badge === "number" && badge > 0 && (
          <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
            {badge}
          </span>
        )}
      </>
    );

    // Inside the home page's Tabs root these are Radix triggers, so arrow-key
    // roving focus and `aria-selected` come from the same implementation that
    // owns the panels below. `id` is what the panel's aria-labelledby resolves.
    return onNavigate ? (
      <TabsTrigger key={item.key} value={item.key} id={`${item.key}-tab`} className={className}>
        {label}
      </TabsTrigger>
    ) : (
      <a
        key={item.key}
        href={item.key === "status" ? "/tiles" : `/?tab=${item.key}`}
        aria-current={isActive ? "page" : undefined}
        className={cn(className, "inline-flex items-center")}
      >
        {label}
      </a>
    );
  };

  return (
    <header id="app-header" className="sticky top-0 z-30 border-b border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <WaveMark />
              <div>
                <span className="block font-display text-2xl font-black leading-tight tracking-tight text-slate-900">
                  SEAPALO
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Marine Surge &amp; Telemetry
                </span>
              </div>
            </div>
            {(locationName || lat !== undefined) && (
              <div className="hidden items-center border-l border-slate-200 pl-6 lg:flex">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <svg
                    className="h-5 w-5 text-brand-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <path
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="text-left">
                    <div className="text-xs font-medium text-slate-400">จุดตรวจวัดหลัก</div>
                    <div className="text-sm font-bold tabular-nums text-slate-800">
                      {locationName ?? `${lat?.toFixed(4)}°, ${lon?.toFixed(4)}°`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {onNavigate ? (
            <TabsList
              className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border-2 border-slate-200/60 bg-slate-100/80 p-1.5 shadow-inner"
              aria-label="เมนูหลัก SEAPALO"
            >
              {NAV_ITEMS.map((item) => renderNavItem(item))}
            </TabsList>
          ) : (
            <nav
              className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border-2 border-slate-200/60 bg-slate-100/80 p-1.5 shadow-inner"
              aria-label="เมนูหลัก SEAPALO"
            >
              {NAV_ITEMS.map((item) => renderNavItem(item))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div
                className={cn(
                  "flex items-center justify-end gap-1.5 text-xs font-semibold",
                  online ? "text-emerald-600" : "text-amber-600",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 animate-pulse rounded-full motion-reduce:animate-none",
                    online ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                {online ? "ระบบออนไลน์ปกติ" : "โหมดออฟไลน์"}
              </div>
              {updatedLabel && (
                <div className="text-sm font-bold tabular-nums text-slate-700">
                  อัปเดต {updatedLabel}
                </div>
              )}
            </div>
            {surgeLabel && (
              <span className="badge-critical">SURGE {surgeLabel}</span>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
