"use client";

import { Clock, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    type RiskLevel,
    type RiskTimeSlot,
    getRiskLevelText,
} from "@/lib/domain/disaster-analysis";

// สีสำหรับ timeline slot
function getTimeSlotBg(level: RiskLevel) {
    switch (level) {
        case "critical":
            return "bg-red-500";
        case "high":
            return "bg-orange-500";
        case "medium":
            return "bg-yellow-500";
        case "low":
            return "bg-green-500";
    }
}

// Component แสดง Risk Timeline
function RiskTimelineSection({ timeline }: { timeline: RiskTimeSlot[] }) {
    if (timeline.length === 0) return null;

    return (
        <div className="bg-white/80 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                ช่วงเวลาที่ต้องระวัง
            </h3>
            <div className="space-y-3">
                {timeline.map((slot, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex-shrink-0 text-center">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {slot.startTime}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ถึง</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {slot.endTime}
                            </div>
                        </div>
                        <div className={cn("w-2 h-16 rounded-full", getTimeSlotBg(slot.riskLevel))} />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge
                                    className={cn(
                                        "text-xs",
                                        slot.riskLevel === "critical"
                                            ? "bg-red-500"
                                            : slot.riskLevel === "high"
                                                ? "bg-orange-500"
                                                : slot.riskLevel === "medium"
                                                    ? "bg-yellow-500"
                                                    : "bg-green-500"
                                    )}
                                >
                                    {getRiskLevelText(slot.riskLevel)}
                                </Badge>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {slot.mainRisk}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {slot.description}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-sm text-blue-600 dark:text-blue-400">
                                <Waves className="h-3 w-3" />
                                ระดับน้ำ: {slot.tideLevel.toFixed(2)} ม.
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export { RiskTimelineSection };
export default RiskTimelineSection;
