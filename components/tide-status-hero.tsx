"use client"

import React from "react"
import { ArrowUp, ArrowDown, Minus, Droplets, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { tideControlManager } from "@/lib/controls"

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
}

export function TideStatusHero({ status, currentLevel, nextEvent, className, dataSource }: TideStatusHeroProps) {
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
        "relative overflow-hidden rounded-3xl p-6 shadow-2xl transition-all duration-700 sm:p-8 border-4",
        isRising && "bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 border-blue-400 text-white shadow-blue-500/20",
        isFalling && "bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 border-emerald-400 text-white shadow-emerald-500/20",
        isStand && "bg-gradient-to-br from-slate-600 via-gray-700 to-zinc-800 border-slate-500 text-white shadow-slate-500/20",
        className
    );

    const ArrowIcon = isRising ? ArrowUp : isFalling ? ArrowDown : Minus;

    return (
        <Card className={cn("border-none", containerClass)}>
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/2 left-1/4 w-32 h-32 bg-sky-300/10 rounded-full blur-[40px] pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                
                {/* Visual Status Side */}
                <div className="flex flex-col items-center md:items-start space-y-4">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center justify-center w-16 h-16 rounded-2xl backdrop-blur-xl bg-white/20 border-2 border-white/40 shadow-xl",
                            isRising && "animate-bounce-slow"
                        )}>
                            <ArrowIcon className="w-10 h-10 text-white stroke-[3px]" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-lg leading-tight">
                                {displayStatus}
                            </h2>
                            <div className="h-1.5 w-full bg-white/30 rounded-full mt-1 overflow-hidden">
                                <div className={cn(
                                    "h-full bg-white transition-all duration-1000",
                                    isRising ? "w-2/3 animate-shimmer" : isFalling ? "w-1/3" : "w-1/2"
                                )} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <p className="text-white font-bold text-sm md:text-md">
                            {statusDescription}
                        </p>
                    </div>
                </div>

                {/* Big Number Section */}
                <div className="flex w-full md:w-auto flex-col items-center justify-center p-4 sm:p-6 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-inner group transition-transform hover:scale-105">
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter drop-shadow-2xl">
                            {tideControlManager.adjustHeightForDatum(currentLevel).toFixed(2)}
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-white/60 mb-2">ม.</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/80 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 mt-1">
                        <Droplets className="w-3 h-3 sm:w-4 sm:h-4" />
                        ระดับน้ำปัจจุบัน (MSL)
                    </div>
                </div>

                {/* Next Milestone */}
                {nextEvent && (
                    <div className="flex w-full md:w-auto flex-col items-center md:items-end min-w-[120px] space-y-2">
                        <div className="p-3 bg-black/30 rounded-2xl border border-white/10 backdrop-blur-xl flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">เหตุการณ์ถัดไป</span>
                                <span className="text-3xl font-black leading-none">{nextEvent.time}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={cn(
                                "text-sm font-black px-3 py-1 rounded-lg uppercase tracking-wider",
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
