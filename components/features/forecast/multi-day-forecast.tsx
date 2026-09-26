"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    Waves,
    ArrowUp,
    ArrowDown,
    Moon,
    MapPin,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Info,
    TrendingUp,
} from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getLocationForecastRange, type ForecastResult } from "@/actions/get-location-forecast";
import type { TideData, LocationData } from "@/lib/domain/types";
import {
    analyzeDisasterRisk,
    type RiskLevel,
    getRiskLevelText,
    getRiskLevelColor,
} from "@/lib/domain/disaster-analysis";

interface MultiDayForecastProps {
    currentLocation: LocationData;
    className?: string;
}

interface DayForecast {
    date: Date;
    tideData: TideData | null;
    riskLevel: RiskLevel;
    maxTideLevel: number;
    minTideLevel: number;
    highTideTime: string;
    lowTideTime: string;
    tideStatus: string;
    lunarPhase: number;
    isWaxing: boolean;
    loading: boolean;
    error: string | null;
}

// Day card component
function DayCard({
    forecast,
    isSelected,
    onClick,
}: {
    forecast: DayForecast;
    isSelected: boolean;
    onClick: () => void;
}) {
    const isToday = isSameDay(forecast.date, new Date());

    if (forecast.loading) {
        return (
            <button
                onClick={onClick}
                className={cn(
                    "p-3 rounded-xl border min-w-[100px]",
                    "bg-slate-50 border-slate-100",
                    "animate-pulse motion-reduce:animate-none"
                )}
            >
                <div className="text-center space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-16 mx-auto" />
                    <div className="h-8 bg-slate-200 rounded w-12 mx-auto" />
                    <div className="h-3 bg-slate-200 rounded w-14 mx-auto" />
                </div>
            </button>
        );
    }

    const peakRatio = Math.min(100, Math.max(8, (forecast.maxTideLevel / 3) * 100));
    const barColor =
        forecast.riskLevel === "critical" || forecast.riskLevel === "high"
            ? "bg-red-500"
            : forecast.riskLevel === "medium"
                ? "bg-amber-500"
                : "bg-[#0284C7]";
    const badgeClass =
        forecast.riskLevel === "critical" || forecast.riskLevel === "high"
            ? "bg-red-600 text-white"
            : forecast.riskLevel === "medium"
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-emerald-100 text-emerald-700 border border-emerald-200";

    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative p-3 rounded-xl border min-w-[104px] cursor-pointer text-left",
                "shadow-sm transition-all duration-200 motion-reduce:transition-none hover:-translate-y-0.5",
                "focus-enhanced",
                isSelected
                    ? "bg-gradient-to-b from-sky-50 to-white border-2 border-sky-500 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md",
                isToday && !isSelected && "ring-2 ring-emerald-200"
            )}
        >
            <div className="flex items-center justify-between gap-1">
                <span className={cn("text-xs font-semibold", isSelected ? "text-sky-700 font-bold" : "text-slate-700")}>
                    {format(forecast.date, "EEE", { locale: th })}
                    {isToday ? " (วันนี้)" : ""}
                </span>
                <span className={cn("px-1.5 py-0.5 rounded-md text-[11px] font-bold", badgeClass)}>
                    {getRiskLevelText(forecast.riskLevel)}
                </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
                    {format(forecast.date, "d")}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                    {format(forecast.date, "MMM", { locale: th })}
                </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1 tabular-nums">
                    <Moon className="h-3 w-3 text-slate-400" />
                    {forecast.lunarPhase} ค่ำ
                </span>
                <span className="font-bold tabular-nums text-slate-800">
                    {forecast.maxTideLevel.toFixed(2)} ม.
                </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                <div className={cn("h-full rounded-full", barColor)} style={{ width: `${peakRatio}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                <span className="font-medium tabular-nums">Peak {forecast.highTideTime}</span>
                <span className="font-semibold text-slate-500">ยังไม่แปลงเป็น ม.รทก.</span>
            </div>
            {isSelected && (
                <div className="absolute -bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-sky-600" aria-hidden="true" />
            )}
        </button>
    );
}

// Detailed day view
function DayDetailView({ forecast }: { forecast: DayForecast }) {
    const riskColors = getRiskLevelColor(forecast.riskLevel);

    if (forecast.loading) {
        return (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse motion-reduce:animate-none">
                <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-slate-200 rounded-xl" />
                    <div className="h-20 bg-slate-200 rounded-xl" />
                </div>
            </div>
        );
    }

    if (forecast.error) {
        return (
            <div role="alert" className="p-6 bg-red-50 rounded-xl border border-red-100 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" aria-hidden="true" />
                <p className="text-red-700">{forecast.error}</p>
            </div>
        );
    }

    const range = forecast.maxTideLevel - forecast.minTideLevel;
    const watmermarks = [
        { Icon: ArrowUp, tint: "text-sky-100", title: "Peak", tone: "text-sky-700", ring: "bg-sky-50 text-sky-700 border-sky-200", value: forecast.maxTideLevel, unit: "ม.", sub: "ระดับสูงสุดของวัน (ยังไม่แปลงเป็น ม.รทก.)", foot: `ระวังน้ำล้นคันกั้นช่วง ${forecast.highTideTime}`, time: forecast.highTideTime },
        { Icon: ArrowDown, tint: "text-emerald-100", title: "Low", tone: "text-emerald-700", ring: `bg-slate-100 text-slate-700 border-slate-200`, value: forecast.minTideLevel, unit: "ม.", sub: "ช่วงแห้งแล้งสันดอนโผล่", foot: "มองเห็นแนวชายฝั่งชัดเจน", time: forecast.lowTideTime },
        { Icon: TrendingUp, tint: "text-sky-100", title: "Range", tone: "text-sky-700", ring: "bg-slate-100 text-slate-700 border-slate-200", value: range, unit: "ม.", sub: "ความต่างระดับน้ำรายวัน", foot: `พลังงานกระแสน้ำ: ${range >= 1.5 ? "สูงมาก" : range >= 0.8 ? "ปานกลาง" : "ต่ำ"}`, time: "แอมพลิจูด" },
        { Icon: Moon, tint: "text-slate-200", title: "ข้างขึ้นข้างแรม", tone: "text-slate-700", ring: "bg-slate-100 text-sky-700 border-slate-200", value: forecast.lunarPhase, unit: "ค่ำ", sub: `${forecast.isWaxing ? "ข้างขึ้น" : "ข้างแรม"} • ${forecast.tideStatus}`, foot: forecast.isWaxing ? "น้ำเกิด / น้ำเป็น" : "น้ำตาย / น้ำอ่อน", time: forecast.isWaxing ? "ดวงจันทร์สว่าง" : "ดวงจันทร์มืด" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-bold text-slate-900">
                            {format(forecast.date, "EEEE d MMMM yyyy", { locale: th })}
                        </h3>
                        <Badge
                            className={cn("font-bold uppercase tracking-wider text-white", riskColors.bg)}
                        >
                            ระดับความเสี่ยง: {getRiskLevelText(forecast.riskLevel)}
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 tabular-nums">
                        ปรากฏการณ์: {forecast.isWaxing ? "ข้างขึ้น" : "ข้างแรม"} {forecast.lunarPhase} ค่ำ • {forecast.tideStatus} (Spring Tide อิทธิพลน้ำทะเลหนุนสูงสุดรอบเดือน)
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="text-xs font-medium text-slate-600">คาดการณ์น้ำท่วมตลิ่ง:</span>
                    <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 tabular-nums">
                        +{Math.max(0, forecast.maxTideLevel - 2.4).toFixed(2)} ม. เหนือแนวคันกั้น
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {watmermarks.map(({ Icon, tint, title, tone, ring, value, unit, sub, foot, time }) => (
                    <div key={title} className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="pointer-events-none absolute -bottom-2 right-2 select-none" aria-hidden="true">
                            <Icon className={cn("h-20 w-20", tint)} strokeWidth={1.5} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className={cn("flex items-center gap-1 text-xs font-bold", tone)}>
                                <Icon className="h-4 w-4" />
                                {title === "Peak" ? "น้ำขึ้นสูงสุด (Peak)" : title === "Low" ? "น้ำลงต่ำสุด (Low)" : title === "Range" ? "ช่วงขึ้น-ลง (Range)" : title}
                            </span>
                            <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", ring)}>{time} น.</span>
                        </div>
                        <div className="my-2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
                                    {typeof value === "number" ? value.toFixed(title === "Range" ? 2 : 2) : value}
                                </span>
                                <span className="text-sm font-semibold text-slate-500">{unit}</span>
                            </div>
                            <div className="mt-0.5 text-xs font-bold text-slate-600">{sub}</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                            <span>{foot}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tide events timeline */}
            {forecast.tideData && forecast.tideData.tideEvents.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Waves className="h-4 w-4 text-sky-600" />
                            เหตุการณ์น้ำขึ้น-ลง ในวันนี้ ({format(forecast.date, "d MMM yyyy", { locale: th })})
                        </h4>
                        <span className="text-xs font-medium text-slate-500">รวม {forecast.tideData.tideEvents.length} รอบความเคลื่อนไหวหลัก</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {forecast.tideData.tideEvents.map((event, index) => {
                            const peak = event.type === "high" && event.level >= 2.4;
                            const label = index === 0 ? "น้ำลงรอบแรก" : index === 1 ? "น้ำขึ้นรอบเช้า" : index === 2 ? "ต่ำสุดของวัน" : "ขึ้นสูงสุด (Peak)";
                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex flex-col gap-1 rounded-lg border p-3",
                                        peak ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50",
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            "flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold",
                                            peak ? "border-red-600 bg-red-600 text-white" : event.type === "high" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                                        )}>
                                            {event.type === "high" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                            {label}
                                        </span>
                                        <span className={cn("font-mono text-[11px]", peak ? "font-bold text-red-700" : "text-slate-500")}>
                                            {peak ? "วิกฤต" : event.type === "high" ? "ช่วงเช้าตรู่" : "รอบดึก"}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                                        {event.time} <span className="text-sm font-semibold text-slate-500">น.</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">ระดับความสูงน้ำ:</span>
                                        <span className={cn("font-bold tabular-nums", peak ? "text-red-600" : event.type === "high" ? "text-sky-700" : "text-emerald-700")}>
                                            {event.level.toFixed(2)} ม.
                                        </span>
                                    </div>
                                    <div className="mt-1 h-1 w-full rounded-full bg-slate-200">
                                        <div className={cn("h-full rounded-full", peak ? "bg-red-600" : event.type === "high" ? "bg-sky-600" : "bg-emerald-600")} style={{ width: `${Math.min(100, (event.level / 3) * 100)}%` }} />
                                    </div>
                                    <span className={cn("text-[11px]", peak ? "font-bold text-red-700" : "text-slate-500")}>
                                        {peak ? "ล้นตลิ่งแน่นอน เตือนชุมชนนอกคันกั้น" : event.type === "high" ? "ช่วงระวังน้ำหนุนริมคลองและท่าเรือ" : "กระแสน้ำไหลลงสู่ทะเลปานกลาง"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Warnings */}
            {forecast.riskLevel !== "low" && (
                <div
                    className={cn(
                        "p-4 rounded-2xl border flex items-start gap-3",
                        forecast.riskLevel === "critical"
                            ? "bg-red-100 border-red-200/60"
                            : forecast.riskLevel === "high"
                                ? "bg-orange-100 border-orange-200/60"
                                : "bg-yellow-100 border-yellow-200/60"
                    )}
                >
                    <AlertTriangle
                        className={cn(
                            "h-5 w-5 mt-0.5 shrink-0",
                            forecast.riskLevel === "critical"
                                ? "text-red-600"
                                : forecast.riskLevel === "high"
                                    ? "text-orange-600"
                                    : "text-yellow-600"
                        )}
                    />
                    <div>
                        <h4 className="font-medium text-slate-800">คำเตือน</h4>
                        <p className="text-sm text-slate-600 mt-1">
                            {forecast.riskLevel === "critical"
                                ? "ความเสี่ยงวิกฤต! ควรหลีกเลี่ยงกิจกรรมทางทะเลและพื้นที่ชายฝั่งโดยเด็ดขาด"
                                : forecast.riskLevel === "high"
                                    ? "ความเสี่ยงสูง ไม่แนะนำให้ทำกิจกรรมทางทะเล ระวังน้ำท่วมพื้นที่ต่ำ"
                                    : "ความเสี่ยงปานกลาง ควรระมัดระวังเมื่อทำกิจกรรมใกล้ชายฝั่ง"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MultiDayForecast({
    currentLocation,
    className,
}: MultiDayForecastProps) {
    const [forecasts, setForecasts] = useState<DayForecast[]>([]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [startDayOffset, setStartDayOffset] = useState(0);

    const daysToShow = 7;

    // Initialize forecasts for 7 days
    const initializeForecasts = useCallback(() => {
        const today = startOfDay(new Date());
        const initialForecasts: DayForecast[] = [];

        for (let i = 0; i < daysToShow; i++) {
            const date = addDays(today, startDayOffset + i);
            initialForecasts.push({
                date,
                tideData: null,
                riskLevel: "low",
                maxTideLevel: 0,
                minTideLevel: 0,
                highTideTime: "--:--",
                lowTideTime: "--:--",
                tideStatus: "ไม่ทราบ",
                lunarPhase: 0,
                isWaxing: true,
                loading: true,
                error: null,
            });
        }

        setForecasts(initialForecasts);
        return initialForecasts;
    }, [startDayOffset]);

    // Load forecasts when location or offset changes — a single batched request
    // returns every day at once instead of N staggered per-day requests.
    useEffect(() => {
        const initialForecasts = initializeForecasts();
        let cancelled = false;

        const applyResults = (results: ForecastResult[]) => {
            setForecasts((prev) =>
                prev.map((forecast, index) => {
                    const result = results[index];

                    if (result?.tideData && result?.weatherData) {
                        const tideData = result.tideData;
                        const weatherData = result.weatherData;

                        // Analyze risk
                        const analysis = analyzeDisasterRisk(
                            tideData,
                            weatherData,
                            forecast.date,
                            currentLocation.name
                        );

                        // Calculate max/min tide levels
                        const highTides = tideData.tideEvents.filter((e) => e.type === "high");
                        const lowTides = tideData.tideEvents.filter((e) => e.type === "low");

                        const maxTideLevel =
                            highTides.length > 0
                                ? Math.max(...highTides.map((e) => e.level))
                                : tideData.currentWaterLevel || 0;
                        const minTideLevel =
                            lowTides.length > 0
                                ? Math.min(...lowTides.map((e) => e.level))
                                : 0;

                        return {
                            ...forecast,
                            tideData,
                            riskLevel: analysis.riskLevel,
                            maxTideLevel,
                            minTideLevel,
                            highTideTime: tideData.highTideTime || "--:--",
                            lowTideTime: tideData.lowTideTime || "--:--",
                            tideStatus: tideData.tideStatus,
                            lunarPhase: tideData.lunarPhaseKham,
                            isWaxing: tideData.isWaxingMoon,
                            loading: false,
                            error: null,
                        };
                    }

                    return {
                        ...forecast,
                        loading: false,
                        error: "ไม่สามารถดึงข้อมูลได้",
                    };
                })
            );
        };

        getLocationForecastRange(
            currentLocation,
            initialForecasts.map((forecast) => forecast.date)
        )
            .then((results) => {
                if (!cancelled) {
                    applyResults(results);
                }
            })
            .catch((error) => {
                if (cancelled) {
                    return;
                }
                setForecasts((prev) =>
                    prev.map((forecast) => ({
                        ...forecast,
                        loading: false,
                        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
                    }))
                );
            });

        return () => {
            cancelled = true;
        };
    }, [currentLocation, startDayOffset, initializeForecasts]);

    const selectedForecast = forecasts[selectedDayIndex];

    // Count risk levels
    const riskCounts = useMemo(() => {
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };
        forecasts.forEach((f) => {
            if (!f.loading) {
                counts[f.riskLevel]++;
            }
        });
        return counts;
    }, [forecasts]);

    return (
        <Card
            className={cn(
                "space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5",
                className
            )}
        >
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-100/50 blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-red-100/40 blur-3xl" aria-hidden="true" />
                <div className="relative flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <MapPin className="h-5 w-5 text-sky-600" aria-hidden="true" />
                            <div>
                                <div className="micro-label text-slate-500">พื้นที่ตรวจวัด / Selected Location</div>
                                <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                                    {currentLocation.name || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lon.toFixed(4)}`}
                                </div>
                            </div>
                        </div>
                        {selectedForecast && !selectedForecast.loading && !selectedForecast.error && (
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <Moon className="h-5 w-5 text-sky-600" aria-hidden="true" />
                                <div>
                                    <div className="micro-label text-slate-500">ปรากฏการณ์ดวงจันทร์</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {selectedForecast.isWaxing ? "ข้างขึ้น" : "ข้างแรม"} {selectedForecast.lunarPhase} ค่ำ · <span className="font-bold text-sky-700">{selectedForecast.tideStatus} (Spring Tide)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-600 motion-reduce:animate-none" />
                            แบบจำลอง Harmonic · Hydrodynamic Run v4.8
                        </span>
                    </div>
                    {riskCounts.critical + riskCounts.high > 0 && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-white shadow-md">
                            <AlertTriangle className="h-6 w-6 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
                            <div>
                                <div className="micro-label text-red-100">การแจ้งเตือนระดับสูง</div>
                                <div className="text-sm font-bold">ตรวจพบช่วงเสี่ยง{riskCounts.critical > 0 ? "วิกฤต" : "สูง"} {riskCounts.critical + riskCounts.high} วันต่อเนื่อง</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-sky-600" aria-hidden="true" />
                    <h2 className="font-display text-lg font-bold text-slate-900">
                        พยากรณ์ล่วงหน้า 7 วัน
                        {forecasts[0] && forecasts[forecasts.length - 1] && (
                            <span className="font-medium text-slate-500">
                                {" "}({format(forecasts[0].date, "d MMM", { locale: th })} - {format(forecasts[forecasts.length - 1].date, "d MMM yyyy", { locale: th })})
                            </span>
                        )}
                    </h2>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">คลิกการ์ดเพื่อสลับดูข้อมูลรายวัน</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer focus-enhanced"
                        onClick={() => { setStartDayOffset((prev) => prev - 7); setSelectedDayIndex(0); }}
                        disabled={startDayOffset <= 0}
                        aria-label="7 วันก่อนหน้า"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 cursor-pointer focus-enhanced"
                        onClick={() => { setStartDayOffset((prev) => prev + 7); setSelectedDayIndex(0); }}
                        disabled={startDayOffset >= 21}
                        aria-label="7 วันถัดไป"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Info className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <span className="text-sm text-slate-600">สรุปความเสี่ยง:</span>
                {riskCounts.critical > 0 && (
                    <Badge className="bg-red-600 text-white tabular-nums">{riskCounts.critical} วิกฤต</Badge>
                )}
                {riskCounts.high > 0 && (
                    <Badge className="bg-orange-500 text-white tabular-nums">{riskCounts.high} สูง</Badge>
                )}
                {riskCounts.medium > 0 && (
                    <Badge className="bg-yellow-500 text-white tabular-nums">{riskCounts.medium} ปานกลาง</Badge>
                )}
                {riskCounts.low > 0 && (
                    <Badge className="bg-emerald-500 text-white tabular-nums">{riskCounts.low} ต่ำ</Badge>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {forecasts.map((forecast, index) => (
                    <DayCard
                        key={forecast.date.toISOString()}
                        forecast={forecast}
                        isSelected={selectedDayIndex === index}
                        onClick={() => setSelectedDayIndex(index)}
                    />
                ))}
            </div>

            {selectedForecast && <DayDetailView forecast={selectedForecast} />}

            {forecasts.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <TrendingUp className="h-4 w-4 text-sky-600" aria-hidden="true" />
                            เปรียบเทียบจุดสูงสุด 7 วัน
                        </h4>
                        <span className="font-mono text-[11px] text-slate-500">เกณฑ์ ≥ 2.40 ม.</span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                        {forecasts.map((f) => {
                            const pct = Math.min(100, (f.maxTideLevel / 3) * 100);
                            const critical = f.riskLevel === "critical" || f.riskLevel === "high";
                            return (
                                <div key={f.date.toISOString()} className="flex items-center gap-2">
                                    <span className={cn("w-12 text-[11px]", isSameDay(f.date, new Date()) ? "font-bold text-sky-700" : "font-medium text-slate-600")}>
                                        {format(f.date, "EEE d", { locale: th })}
                                    </span>
                                    <div className="h-5 flex-1 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                        <div
                                            className={cn("flex h-full items-center justify-end rounded-md pr-2 font-mono text-[11px] font-bold text-white", f.riskLevel === "medium" ? "bg-amber-500" : critical ? "bg-red-500" : "bg-[#0284C7]")}
                                            style={{ width: `${f.loading ? 8 : pct}%` }}
                                        >
                                            {f.loading ? "" : `${f.maxTideLevel.toFixed(2)} ม.`}
                                        </div>
                                    </div>
                                    <span className={cn("w-12 text-right text-[11px] font-bold", critical ? "text-red-600" : f.riskLevel === "medium" ? "text-amber-700" : "text-emerald-700")}>
                                        {f.loading ? "…" : getRiskLevelText(f.riskLevel)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card>
    );
}
