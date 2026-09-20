"use client";

import { useState } from "react";
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Shield,
    ChevronDown,
    ChevronUp,
    XCircle,
    Info,
    Lightbulb,
    History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
    type DisasterAnalysis,
    type RiskLevel,
    getRiskLevelText,
} from "@/lib/domain/disaster-analysis";
import { findSimilarEventByLevel, formatEventDateThai } from "@/lib/historical-data-service";
import { AdvanceWarningsSection } from "./disaster/AdvanceWarningsSection";
import { DisasterCard } from "./disaster/DisasterCard";
import { FloodPredictionSection } from "./disaster/FloodPredictionSection";
import { HistoricalContextSection } from "./disaster/HistoricalContextSection";
import { RiskFactorCard } from "./disaster/RiskFactorCard";
import { RiskTimelineSection } from "./disaster/RiskTimelineSection";

type DisasterAlertProps = {
    analysis: DisasterAnalysis | null;
    location?: { lat: number; lon: number };
    className?: string;
};

// ไอคอนสำหรับระดับความเสี่ยง
function getRiskIcon(level: RiskLevel) {
    switch (level) {
        case "critical":
            return <XCircle className="h-8 w-8 text-red-500" />;
        case "high":
            return <AlertTriangle className="h-8 w-8 text-orange-500" />;
        case "medium":
            return <AlertCircle className="h-8 w-8 text-yellow-500" />;
        case "low":
            return <Shield className="h-8 w-8 text-green-500" />;
    }
}

// สีพื้นหลังสำหรับระดับความเสี่ยง
function getRiskBgGradient(level: RiskLevel) {
    switch (level) {
        case "critical":
            return "from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border-red-300 dark:border-red-800";
        case "high":
            return "from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-300 dark:border-orange-800";
        case "medium":
            return "from-yellow-50 to-amber-100 dark:from-yellow-950/50 dark:to-amber-900/30 border-yellow-300 dark:border-yellow-800";
        case "low":
            return "from-green-50 to-emerald-100 dark:from-green-950/50 dark:to-emerald-900/30 border-green-300 dark:border-green-800";
    }
}

export default function DisasterAlert({
    analysis,
    location,
    className,
}: DisasterAlertProps) {
    const [showFactors, setShowFactors] = useState(false);

    if (!analysis) {
        return null;
    }

    const riskBg = getRiskBgGradient(analysis.riskLevel);
    const hasDisasters = analysis.disasters.length > 0;

    // จุดนี้เคยท่วมที่ระดับใกล้กันหรือไม่ (nearest-level match กับข้อมูลประวัติศาสตร์)
    const referenceLevel = analysis.riskTimeline[0]?.tideLevel ?? null;
    const similarPastEvent = location && referenceLevel !== null
        ? findSimilarEventByLevel(location.lat, location.lon, referenceLevel)
        : null;

    return (
        <Card
            className={cn(
                "shadow-xl border-2 overflow-hidden bg-gradient-to-br",
                riskBg,
                className
            )}
        >
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {getRiskIcon(analysis.riskLevel)}
                        <div>
                            <CardTitle className="text-xl md:text-2xl flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                การวิเคราะห์ความเสี่ยงภัยพิบัติ
                            </CardTitle>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                📍 {analysis.location} •{" "}
                                {new Date(analysis.timestamp).toLocaleTimeString("th-TH")}
                            </p>
                        </div>
                    </div>

                    {/* Risk Rating */}
                    <div className="text-right">
                        <Badge
                            className={cn(
                                "text-lg px-4 py-2 font-bold",
                                analysis.riskLevel === "critical"
                                    ? "bg-red-600 text-white"
                                    : analysis.riskLevel === "high"
                                        ? "bg-orange-500 text-white"
                                        : analysis.riskLevel === "medium"
                                            ? "bg-yellow-500 text-black"
                                            : "bg-green-500 text-white"
                            )}
                        >
                            ความเสี่ยง{getRiskLevelText(analysis.riskLevel)}
                        </Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            คะแนนความเสี่ยง:{" "}
                            <span className="font-bold text-gray-900 dark:text-white">
                                {analysis.overallRating}
                            </span>
                            /100
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* ประโยคสรุปเฉพาะเจาะจง: เวลา + ระดับน้ำ + ลม */}
                {analysis.headline && (
                    <div className="flex items-start gap-2 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-100/80 dark:bg-red-950/50 p-4">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="font-bold text-red-900 dark:text-red-200 leading-relaxed">
                            {analysis.headline}
                        </p>
                    </div>
                )}

                {/* เหตุการณ์คล้ายกันในอดีตที่ระดับใกล้เคียง */}
                {similarPastEvent && (
                    <div className="flex items-start gap-2 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-3 text-sm text-purple-800 dark:text-purple-300">
                        <History className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                            จุดนี้เคยท่วม {formatEventDateThai(similarPastEvent.date)} ที่ระดับใกล้กัน ({similarPastEvent.maxWaterLevel.toFixed(1)} ม.)
                        </span>
                    </div>
                )}

                {/* การเตือนล่วงหน้า - แสดงก่อนถ้ามี */}
                <AdvanceWarningsSection warnings={analysis.advanceWarnings} />

                {/* คำแนะนำหลัก */}
                <div className="bg-white/80 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        คำแนะนำ
                    </h3>
                    <ul className="space-y-2">
                        {analysis.recommendations.map((rec, idx) => (
                            <li
                                key={idx}
                                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                            >
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* การพยากรณ์น้ำท่วม */}
                <FloodPredictionSection prediction={analysis.floodPrediction} />

                {/* ช่วงเวลาที่ต้องระวัง */}
                <RiskTimelineSection timeline={analysis.riskTimeline} />

                {/* ภัยพิบัติที่อาจเกิดขึ้น */}
                {hasDisasters && (
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            ภัยพิบัติที่อาจเกิดขึ้น ({analysis.disasters.length})
                        </h3>
                        <div className="space-y-3">
                            {analysis.disasters.map((disaster, idx) => (
                                <DisasterCard key={idx} disaster={disaster} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ปัจจัยเสี่ยง (Collapsible) */}
                <Collapsible open={showFactors} onOpenChange={setShowFactors}>
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full justify-between bg-white/80 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600"
                        >
                            <span className="flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                ปัจจัยที่นำมาวิเคราะห์ ({analysis.factors.length} ปัจจัย)
                            </span>
                            {showFactors ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-4 space-y-3">
                            {analysis.factors.map((factor, idx) => (
                                <RiskFactorCard key={idx} factor={factor} />
                            ))}
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* ข้อมูลประวัติศาสตร์ */}
                <HistoricalContextSection context={analysis.historicalContext} />

                {/* คำอธิบายเพิ่มเติมสำหรับความเสี่ยงต่ำ */}
                {analysis.riskLevel === "low" && (
                    <div className="bg-green-100 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            สถานการณ์ปกติ
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-400">
                            ไม่พบปัจจัยเสี่ยงที่น่าเป็นห่วง
                            สามารถทำกิจกรรมทางทะเลได้ตามปกติ
                            แต่ควรติดตามสภาพอากาศอย่างสม่ำเสมอ
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
