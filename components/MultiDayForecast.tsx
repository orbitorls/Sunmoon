"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    Waves,
    ArrowUp,
    ArrowDown,
    Moon,
    AlertTriangle,
    Sun,
    ChevronLeft,
    ChevronRight,
    Info,
    Clock,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getLocationForecast } from "@/actions/get-location-forecast";
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
    const riskColors = getRiskLevelColor(forecast.riskLevel);
    const isToday = isSameDay(forecast.date, new Date());

    if (forecast.loading) {
        return (
            <button
                onClick={onClick}
                className={cn(
                    "p-3 rounded-2xl border min-w-[100px]",
                    "bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800",
                    "animate-pulse motion-reduce:animate-none"
                )}
            >
                <div className="text-center space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mx-auto" />
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12 mx-auto" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14 mx-auto" />
                </div>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "p-3 rounded-2xl border min-w-[100px] cursor-pointer",
                "bg-white dark:bg-slate-800 shadow-sm hover:shadow-md",
                "transition-all duration-200 motion-reduce:transition-none",
                "focus-enhanced",
                isSelected
                    ? "border-primary/60 ring-2 ring-primary/20"
                    : "border-slate-100 dark:border-slate-700 hover:border-primary/30",
                isToday && !isSelected && "ring-2 ring-emerald-200 dark:ring-emerald-800/60"
            )}
        >
            <div className="text-center space-y-1">
                {/* Day name */}
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {format(forecast.date, "EEE", { locale: th })}
                </div>
                {/* Date */}
                <div
                    className={cn(
                        "text-lg font-black tabular-nums",
                        isToday && "text-emerald-600 dark:text-emerald-400"
                    )}
                >
                    {format(forecast.date, "d")}
                </div>
                {/* Month */}
                <div className="text-xs text-slate-600 dark:text-slate-300">
                    {format(forecast.date, "MMM", { locale: th })}
                </div>

                {/* Risk indicator */}
                <div
                    className={cn(
                        "mt-2 py-1 px-2 rounded-full text-xs font-bold text-white",
                        riskColors.bg
                    )}
                >
                    {getRiskLevelText(forecast.riskLevel)}
                </div>

                {/* Tide info */}
                <div className="flex items-center justify-center gap-1 text-xs mt-1">
                    <Moon className="h-3 w-3 text-purple-500" />
                    <span className="tabular-nums">{forecast.lunarPhase} ค่ำ</span>
                </div>
            </div>
        </button>
    );
}

// Detailed day view
function DayDetailView({ forecast }: { forecast: DayForecast }) {
    const riskColors = getRiskLevelColor(forecast.riskLevel);

    if (forecast.loading) {
        return (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 animate-pulse motion-reduce:animate-none">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                    <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
            </div>
        );
    }

    if (forecast.error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/40 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 dark:text-red-300">{forecast.error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="responsive-title">
                        {format(forecast.date, "EEEE d MMMM yyyy", { locale: th })}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
                        {forecast.tideStatus} • {forecast.isWaxing ? "ข้างขึ้น" : "ข้างแรม"} {forecast.lunarPhase} ค่ำ
                    </p>
                </div>
                <Badge
                    className={cn("text-white font-bold px-4 py-2", riskColors.bg)}
                >
                    ความเสี่ยง{getRiskLevelText(forecast.riskLevel)}
                </Badge>
            </div>

            {/* Main stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* High tide */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl border border-blue-100/60 dark:border-blue-800/40 shadow-sm hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <ArrowUp className="h-5 w-5" />
                        <span className="font-medium">น้ำขึ้นสูงสุด</span>
                    </div>
                    <div className="text-3xl font-black text-blue-700 dark:text-blue-300 tabular-nums">
                        {forecast.maxTideLevel.toFixed(2)}
                        <span className="text-lg ml-1">ม.</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {forecast.highTideTime}
                    </div>
                </div>

                {/* Low tide */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-2xl border border-emerald-100/60 dark:border-emerald-800/40 shadow-sm hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                        <ArrowDown className="h-5 w-5" />
                        <span className="font-medium">น้ำลงต่ำสุด</span>
                    </div>
                    <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                        {forecast.minTideLevel.toFixed(2)}
                        <span className="text-lg ml-1">ม.</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {forecast.lowTideTime}
                    </div>
                </div>

                {/* Tide range */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-100/60 dark:border-purple-800/40 shadow-sm hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                        <TrendingUp className="h-5 w-5" />
                        <span className="font-medium">ช่วงขึ้นลง</span>
                    </div>
                    <div className="text-3xl font-black text-purple-700 dark:text-purple-300 tabular-nums">
                        {(forecast.maxTideLevel - forecast.minTideLevel).toFixed(2)}
                        <span className="text-lg ml-1">ม.</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        ความต่างระดับน้ำ
                    </div>
                </div>

                {/* Lunar phase */}
                <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-2xl border border-amber-100/60 dark:border-amber-800/40 shadow-sm hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                        <Moon className="h-5 w-5" />
                        <span className="font-medium">ข้างจันทร์</span>
                    </div>
                    <div className="text-3xl font-black text-amber-700 dark:text-amber-300 tabular-nums">
                        {forecast.lunarPhase}
                        <span className="text-lg ml-1">ค่ำ</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {forecast.isWaxing ? "ข้างขึ้น" : "ข้างแรม"} • {forecast.tideStatus}
                    </div>
                </div>
            </div>

            {/* Tide events timeline */}
            {forecast.tideData && forecast.tideData.tideEvents.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Waves className="h-4 w-4" />
                        เหตุการณ์น้ำขึ้นลงในวันนี้
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {forecast.tideData.tideEvents.map((event, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "px-3 py-2 rounded-xl text-sm font-medium tabular-nums",
                                    event.type === "high"
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                        : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {event.type === "high" ? (
                                        <ArrowUp className="h-3 w-3" />
                                    ) : (
                                        <ArrowDown className="h-3 w-3" />
                                    )}
                                    <span>{event.time}</span>
                                    <span className="font-bold">{event.level.toFixed(2)} ม.</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Warnings */}
            {forecast.riskLevel !== "low" && (
                <div
                    className={cn(
                        "p-4 rounded-2xl border flex items-start gap-3",
                        forecast.riskLevel === "critical"
                            ? "bg-red-100 dark:bg-red-900/30 border-red-200/60 dark:border-red-800/40"
                            : forecast.riskLevel === "high"
                                ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200/60 dark:border-orange-800/40"
                                : "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200/60 dark:border-yellow-800/40"
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
                        <h4 className="font-medium text-slate-800 dark:text-slate-100">คำเตือน</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
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

    // Fetch forecast data for each day
    const fetchDayForecast = useCallback(
        async (date: Date, index: number) => {
            try {
                const result = await getLocationForecast(currentLocation, date);

                if (result?.tideData && result?.weatherData) {
                    const tideData = result.tideData;
                    const weatherData = result.weatherData;

                    // Analyze risk
                    const analysis = analyzeDisasterRisk(
                        tideData,
                        weatherData,
                        date,
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

                    setForecasts((prev) => {
                        const updated = [...prev];
                        if (updated[index]) {
                            updated[index] = {
                                ...updated[index],
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
                        return updated;
                    });
                } else {
                    throw new Error("ไม่สามารถดึงข้อมูลได้");
                }
            } catch (error) {
                setForecasts((prev) => {
                    const updated = [...prev];
                    if (updated[index]) {
                        updated[index] = {
                            ...updated[index],
                            loading: false,
                            error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
                        };
                    }
                    return updated;
                });
            }
        },
        [currentLocation]
    );

    // Load forecasts when location or offset changes
    useEffect(() => {
        const initialForecasts = initializeForecasts();

        // Fetch data for each day with staggered timing to avoid rate limits
        initialForecasts.forEach((forecast, index) => {
            setTimeout(() => {
                fetchDayForecast(forecast.date, index);
            }, index * 500); // 500ms delay between each request
        });
    }, [currentLocation.lat, currentLocation.lon, startDayOffset, initializeForecasts, fetchDayForecast]);

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
                "rounded-2xl border-0 shadow-xl shadow-sky-100/60 dark:bg-slate-900/90 dark:shadow-none",
                className
            )}
        >
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        พยากรณ์ล่วงหน้า 7 วัน
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 cursor-pointer focus-enhanced"
                            onClick={() => setStartDayOffset((prev) => prev - 7)}
                            disabled={startDayOffset <= 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 cursor-pointer focus-enhanced"
                            onClick={() => setStartDayOffset((prev) => prev + 7)}
                            disabled={startDayOffset >= 21}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Risk summary */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">สรุปความเสี่ยง:</span>
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
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Day selector calendar */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                    {forecasts.map((forecast, index) => (
                        <DayCard
                            key={forecast.date.toISOString()}
                            forecast={forecast}
                            isSelected={selectedDayIndex === index}
                            onClick={() => setSelectedDayIndex(index)}
                        />
                    ))}
                </div>

                {/* Selected day details */}
                {selectedForecast && <DayDetailView forecast={selectedForecast} />}
            </CardContent>
        </Card>
    );
}
