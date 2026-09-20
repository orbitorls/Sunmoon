"use client";

import { Droplets, MapPin, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    type FloodPrediction,
    getFloodTypeText,
} from "@/lib/domain/disaster-analysis";

// Component แสดง Flood Prediction
function FloodPredictionSection({ prediction }: { prediction: FloodPrediction | null }) {
    if (!prediction) return null;

    const floodColor = prediction.floodType === "severe" || prediction.floodType === "major"
        ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30"
        : prediction.floodType === "moderate"
            ? "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30"
            : "border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30";

    return (
        <div className={cn("rounded-xl p-4 border-2", floodColor)}>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                การพยากรณ์น้ำท่วม
                <Badge
                    className={cn(
                        "ml-auto",
                        prediction.floodType === "severe"
                            ? "bg-red-600"
                            : prediction.floodType === "major"
                                ? "bg-red-500"
                                : prediction.floodType === "moderate"
                                    ? "bg-orange-500"
                                    : "bg-yellow-500"
                    )}
                >
                    {getFloodTypeText(prediction.floodType)}
                </Badge>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white/80 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {prediction.expectedLevel}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ซม. (สูงกว่าปกติ)</div>
                </div>
                <div className="text-center p-3 bg-white/80 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {prediction.peakTime}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">เวลาน้ำสูงสุด</div>
                </div>
                <div className="text-center p-3 bg-white/80 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {prediction.duration}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">นาที (ระยะเวลา)</div>
                </div>
                <div className="text-center p-3 bg-white/80 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {prediction.confidence}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ความมั่นใจ</div>
                </div>
            </div>

            {/* สาเหตุ */}
            <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    ปัจจัยที่ทำให้เกิด:
                </h4>
                <div className="flex flex-wrap gap-2">
                    {prediction.causedBy.map((cause, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                            {cause}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* พื้นที่ได้รับผลกระทบ */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    พื้นที่อาจได้รับผลกระทบ:
                </h4>
                <div className="flex flex-wrap gap-2">
                    {prediction.affectedAreas.map((area, idx) => (
                        <Badge key={idx} variant="outline" className="bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                            {area}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    );
}

export { FloodPredictionSection };
export default FloodPredictionSection;
