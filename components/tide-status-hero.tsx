"use client"

import React, { useState } from "react"
import { ArrowUp, ArrowDown, Minus, Droplets, Clock, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { tideControlManager } from "@/lib/ui/controls"
import { StatCard } from "@/components/stat-card"

interface TideStatusHeroProps {
    status: string; // "น้ำขึ้น", "น้ำลง", "น้ำนิ่ง"
    currentLevel: number;
    nextEvent?: {
        type: "high" | "low";
        time: string;
        level: number;
    };
    dataSource?: string;
    className?: string;
    // Needed only to let the user report a real observed tide event at the
    // nearest station -- omit both and the report affordance just hides.
    stationId?: string;
    location?: { lat: number; lon: number };
}

// ponytail: no account system exists yet, so a real report is tied to a
// client-generated anonymous device id kept in localStorage instead of
// inventing an auth system for this one feature.
function getOrCreateDeviceId(): string {
    const key = "sunmoon-device-id";
    try {
        const existing = window.localStorage.getItem(key);
        if (existing) return existing;
        const created = crypto.randomUUID();
        window.localStorage.setItem(key, created);
        return created;
    } catch {
        return "anonymous";
    }
}

function ReportTideButton({
    stationId,
    location,
    defaultType,
}: {
    stationId: string;
    location: { lat: number; lon: number };
    defaultType: "high" | "low";
}) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<"high" | "low">(defaultType);
    const [levelMeters, setLevelMeters] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            const response = await fetch("/api/observations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-device-id": getOrCreateDeviceId(),
                },
                body: JSON.stringify({
                    stationId,
                    lat: location.lat,
                    lon: location.lon,
                    type,
                    levelMeters: levelMeters.trim() ? Number(levelMeters) : undefined,
                    observedAt: new Date().toISOString(),
                }),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || "ส่งรายงานไม่สำเร็จ");
            }
            setOpen(false);
            setLevelMeters("");
            alert("ขอบคุณสำหรับรายงาน! ข้อมูลจะถูกนำไปตรวจสอบก่อนนำไปใช้ปรับโมเดล");
        } catch (error) {
            alert(error instanceof Error ? error.message : "ส่งรายงานไม่สำเร็จ");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 bg-white/20 text-white backdrop-blur-xl border border-white/30 hover:bg-white/30"
                >
                    <MapPin className="h-3.5 w-3.5" />
                    รายงานน้ำจริง
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-slate-900 dark:text-white" align="end">
                <div className="space-y-3">
                    <p className="text-sm font-semibold">ตอนนี้น้ำเป็นอย่างไร?</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant={type === "high" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setType("high")}
                        >
                            ขึ้นสูงสุด
                        </Button>
                        <Button
                            type="button"
                            variant={type === "low" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setType("low")}
                        >
                            ลงต่ำสุด
                        </Button>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">ระดับน้ำ (เมตร) — ไม่บังคับ</label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="เช่น 1.85"
                            value={levelMeters}
                            onChange={(event) => setLevelMeters(event.target.value)}
                        />
                    </div>
                    <Button className="w-full" size="sm" disabled={submitting} onClick={submit}>
                        {submitting ? "กำลังส่ง..." : "ยืนยันรายงาน"}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function TideStatusHero({ status, currentLevel, nextEvent, className, dataSource, stationId, location }: TideStatusHeroProps) {
    const normalizedStatus = status === "น้ำขึ้น" || status === "น้ำลง" || status === "น้ำนิ่ง"
        ? status
        : "น้ำนิ่ง";
    const isRising = normalizedStatus === "น้ำขึ้น";
    const isFalling = normalizedStatus === "น้ำลง";
    const isStand = normalizedStatus === "น้ำนิ่ง";

    // Enhanced logic for user-friendly Status
    const displayStatus = isRising ? "น้ำกำลังขึ้น" : isFalling ? "น้ำกำลังลง" : "น้ำค่อนข้างนิ่ง";
    const statusDescription = isRising 
        ? "เหมาะสำหรับ: เข้าใกล้ชายฝั่ง, ตกปลาริมตลิ่ง" 
        : isFalling 
        ? "เหมาะสำหรับ: เดินชายหาด, เก็บหอย, ออกเรือไกลฝั่ง" 
        : "ระดับน้ำคงที่ เหมาะสำหรับกิจกรรมทั่วไป";

    // Dynamic styles based on status
    const containerClass = cn(
        "relative overflow-hidden rounded-3xl p-6 shadow-2xl transition-all duration-700 motion-reduce:transition-none sm:p-8 border-4",
        isRising && "bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 border-blue-400 text-white shadow-blue-500/20",
        isFalling && "bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 border-emerald-400 text-white shadow-emerald-500/20",
        isStand && "bg-gradient-to-br from-slate-600 via-gray-700 to-zinc-800 border-slate-500 text-white shadow-slate-500/20",
        className
    );

    const ArrowIcon = isRising ? ArrowUp : isFalling ? ArrowDown : Minus;

    return (
        <Card className={cn("border-none", containerClass)}>
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none animate-pulse motion-reduce:animate-none" />
            <div className="absolute bottom-1/2 left-1/4 w-32 h-32 bg-sky-300/10 rounded-full blur-[40px] pointer-events-none" />

            {stationId && location && (
                <div className="absolute top-4 right-4 z-20">
                    <ReportTideButton
                        stationId={stationId}
                        location={location}
                        defaultType={nextEvent?.type ?? "high"}
                    />
                </div>
            )}

            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                
                {/* Visual Status Side */}
                <div className="flex flex-col items-center md:items-start space-y-4">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center justify-center w-16 h-16 rounded-2xl backdrop-blur-xl bg-white/20 border-2 border-white/40 shadow-xl",
                            isRising && "animate-bounce-slow motion-reduce:animate-none"
                        )}>
                            <ArrowIcon className="w-10 h-10 text-white stroke-[3px]" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-lg leading-tight">
                                {displayStatus}
                            </h2>
                            <div className="h-1.5 w-full bg-white/30 rounded-full mt-1 overflow-hidden">
                                <div className={cn(
                                    "h-full bg-white transition-all duration-1000 motion-reduce:transition-none",
                                    isRising ? "w-2/3 animate-shimmer motion-reduce:animate-none" : isFalling ? "w-1/3" : "w-1/2"
                                )} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-white/40 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <p className="text-white font-bold text-sm md:text-base">
                            {statusDescription}
                        </p>
                    </div>
                </div>

                {/* Big Number Section */}
                <StatCard
                    className="flex w-full md:w-auto flex-col items-center justify-center p-4 sm:p-6 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-inner transition-shadow duration-200 hover:shadow-2xl"
                    labelClassName="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/80 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 mt-1"
                    label={<><Droplets className="w-3 h-3 sm:w-4 sm:h-4" />ระดับน้ำปัจจุบัน (MSL)</>}
                    labelAfter
                >
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter tabular-nums drop-shadow-2xl">
                            {tideControlManager.adjustHeightForDatum(currentLevel).toFixed(2)}
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-white/80 mb-2">ม.</span>
                    </div>
                </StatCard>

                {/* Next Milestone */}
                {nextEvent && (
                    <div className="flex w-full md:w-auto flex-col items-center md:items-end min-w-[120px] space-y-2">
                        <div className="p-3 bg-black/30 rounded-2xl border border-white/10 backdrop-blur-xl flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-white/70 tracking-[0.2em]">เหตุการณ์ถัดไป</span>
                                <span className="text-3xl font-black leading-none tabular-nums">{nextEvent.time}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={cn(
                                "text-sm font-black px-3 py-1 rounded-full uppercase tracking-wider",
                                nextEvent.type === "high" ? "bg-blue-400 text-blue-900" : "bg-emerald-400 text-emerald-900"
                            )}>
                                {nextEvent.type === "high" ? "น้ำขึ้นเต็มที่" : "น้ำลดต่ำสุด"}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
