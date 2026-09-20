"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    Wind,
    Gauge,
    Droplets,
    Thermometer,
    ArrowRight,
    Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/lib/domain/types";

interface WeatherTrendsProps {
    weatherData: WeatherData;
    className?: string;
}

// Mini trend indicator
function TrendIndicator({
    current,
    description,
    unit,
    icon: Icon,
    color,
    trend,
}: {
    current: number;
    description: string;
    unit: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    trend: "up" | "down" | "stable";
}) {
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const trendColor =
        trend === "up"
            ? "text-red-500"
            : trend === "down"
                ? "text-blue-500"
                : "text-gray-500";

    return (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg", color)}>
                        <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                        {description}
                    </span>
                </div>
                <TrendIcon className={cn("h-4 w-4", trendColor)} />
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{current.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
        </div>
    );
}

// Wind direction indicator
function WindDirection({ degrees }: { degrees: number }) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(degrees / 45) % 8;
    const direction = directions[index];

    const thaiDirections: Record<string, string> = {
        N: "เหนือ",
        NE: "ตะวันออกเฉียงเหนือ",
        E: "ตะวันออก",
        SE: "ตะวันออกเฉียงใต้",
        S: "ใต้",
        SW: "ตะวันตกเฉียงใต้",
        W: "ตะวันตก",
        NW: "ตะวันตกเฉียงเหนือ",
    };

    return (
        <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
                {/* Compass background */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-300 dark:border-blue-700">
                    {/* Direction labels */}
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-600">
                        N
                    </span>
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-600">
                        S
                    </span>
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600">
                        W
                    </span>
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600">
                        E
                    </span>

                    {/* Arrow */}
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ transform: `rotate(${degrees}deg)` }}
                    >
                        <div className="flex flex-col items-center">
                            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-500" />
                            <div className="w-1 h-4 bg-gray-400 rounded-b" />
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <div className="text-lg font-bold">{direction}</div>
                <div className="text-sm text-muted-foreground">{thaiDirections[direction]}</div>
                <div className="text-xs text-muted-foreground">{degrees}°</div>
            </div>
        </div>
    );
}

// Pressure status
function PressureStatus({ pressure }: { pressure: number }) {
    let status: { label: string; color: string; description: string };

    if (pressure < 995) {
        status = {
            label: "ต่ำมาก",
            color: "bg-red-500",
            description: "อาจมีพายุเข้าใกล้",
        };
    } else if (pressure < 1005) {
        status = {
            label: "ต่ำ",
            color: "bg-orange-500",
            description: "สภาพอากาศไม่เสถียร",
        };
    } else if (pressure < 1015) {
        status = {
            label: "ปกติ",
            color: "bg-green-500",
            description: "สภาพอากาศปกติ",
        };
    } else {
        status = {
            label: "สูง",
            color: "bg-blue-500",
            description: "อากาศแจ่มใส",
        };
    }

    return (
        <div className="flex items-center gap-3">
            <div
                className={cn(
                    "px-3 py-1 rounded-full text-white text-sm font-bold",
                    status.color
                )}
            >
                {status.label}
            </div>
            <span className="text-sm text-muted-foreground">{status.description}</span>
        </div>
    );
}

export default function WeatherTrends({
    weatherData,
    className,
}: WeatherTrendsProps) {
    // Determine trends based on typical patterns (in real app, would compare with historical data)
    const trends = useMemo(() => {
        const windTrend =
            weatherData.wind.speed > 8 ? "up" : weatherData.wind.speed < 3 ? "down" : "stable";
        const pressureTrend =
            weatherData.main.pressure < 1005
                ? "down"
                : weatherData.main.pressure > 1015
                    ? "up"
                    : "stable";
        const humidityTrend =
            weatherData.main.humidity > 80
                ? "up"
                : weatherData.main.humidity < 50
                    ? "down"
                    : "stable";
        const tempTrend =
            weatherData.main.temp > 35
                ? "up"
                : weatherData.main.temp < 25
                    ? "down"
                    : "stable";

        return { windTrend, pressureTrend, humidityTrend, tempTrend } as const;
    }, [weatherData]);

    // Wind speed status
    const windStatus = useMemo(() => {
        const speed = weatherData.wind.speed;
        if (speed >= 15) return { label: "พายุ", color: "text-red-600" };
        if (speed >= 10) return { label: "แรงมาก", color: "text-orange-600" };
        if (speed >= 8) return { label: "แรง", color: "text-yellow-600" };
        if (speed >= 5) return { label: "ปานกลาง", color: "text-blue-600" };
        return { label: "เบา", color: "text-green-600" };
    }, [weatherData.wind.speed]);

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Wind className="h-5 w-5 text-blue-600" />
                    แนวโน้มสภาพอากาศ
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {weatherData.name} • {weatherData.weather[0]?.description}
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Main metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <TrendIndicator
                        current={weatherData.main.temp}
                        description="อุณหภูมิ"
                        unit="°C"
                        icon={Thermometer}
                        color="bg-orange-500"
                        trend={trends.tempTrend}
                    />
                    <TrendIndicator
                        current={weatherData.wind.speed}
                        description="ความเร็วลม"
                        unit="m/s"
                        icon={Wind}
                        color="bg-blue-500"
                        trend={trends.windTrend}
                    />
                    <TrendIndicator
                        current={weatherData.main.pressure}
                        description="ความกดอากาศ"
                        unit="hPa"
                        icon={Gauge}
                        color="bg-purple-500"
                        trend={trends.pressureTrend}
                    />
                    <TrendIndicator
                        current={weatherData.main.humidity}
                        description="ความชื้น"
                        unit="%"
                        icon={Droplets}
                        color="bg-cyan-500"
                        trend={trends.humidityTrend}
                    />
                </div>

                {/* Wind details */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Wind className="h-4 w-4" />
                        รายละเอียดลม
                    </h4>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <WindDirection degrees={weatherData.wind.deg} />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">ความเร็ว:</span>
                                <span className="font-bold">{weatherData.wind.speed} m/s</span>
                                <span className="text-sm text-muted-foreground">
                                    ({(weatherData.wind.speed * 3.6).toFixed(1)} km/h)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">สถานะ:</span>
                                <Badge className={cn("font-bold", windStatus.color)} variant="outline">
                                    {windStatus.label}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pressure details */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        ความกดอากาศ
                    </h4>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-black">{weatherData.main.pressure}</div>
                            <div className="text-sm text-muted-foreground">hPa</div>
                        </div>
                        <PressureStatus pressure={weatherData.main.pressure} />
                    </div>
                    {weatherData.main.pressure < 1005 && (
                        <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-sm text-orange-700 dark:text-orange-300">
                            ⚠️ ความกดอากาศต่ำอาจทำให้ระดับน้ำทะเลสูงขึ้น
                        </div>
                    )}
                </div>

                {/* Feels like temperature */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Thermometer className="h-5 w-5 text-orange-500" />
                        <div>
                            <div className="text-sm font-medium">รู้สึกเหมือน</div>
                            <div className="text-xs text-muted-foreground">อุณหภูมิที่รู้สึก</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{weatherData.main.temp}°C</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-lg font-bold text-orange-600">
                            {weatherData.main.feels_like}°C
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
