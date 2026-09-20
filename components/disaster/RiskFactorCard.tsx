"use client";

import type { ReactNode } from "react";
import { AlertCircle, CloudRain, Gauge, Info, Moon, Waves, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskFactor } from "@/lib/domain/disaster-analysis";

// ไอคอนสำหรับแต่ละปัจจัย
function getFactorIcon(iconName: string) {
    const icons: Record<string, ReactNode> = {
        Moon: <Moon className="h-5 w-5" />,
        Waves: <Waves className="h-5 w-5" />,
        Wind: <Wind className="h-5 w-5" />,
        Gauge: <Gauge className="h-5 w-5" />,
        CloudRain: <CloudRain className="h-5 w-5" />,
    };
    return icons[iconName] || <Info className="h-5 w-5" />;
}

// Component แสดงข้อมูลปัจจัยเสี่ยง
function RiskFactorCard({ factor }: { factor: RiskFactor }) {
    return (
        <div
            className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                factor.contributeToRisk
                    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
            )}
        >
            <div
                className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    factor.contributeToRisk
                        ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                )}
            >
                {getFactorIcon(factor.icon)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {factor.name}
                    </h4>
                    <div className="flex items-center gap-1 text-sm font-mono">
                        <span className="font-bold text-gray-900 dark:text-white">
                            {typeof factor.value === "number"
                                ? factor.value.toFixed(2)
                                : factor.value}
                        </span>
                        {factor.unit && (
                            <span className="text-gray-500 dark:text-gray-400">
                                {factor.unit}
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {factor.description}
                </p>
                {factor.contributeToRisk && (
                    <Badge className="mt-2 bg-red-500 text-white text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        เพิ่มความเสี่ยง +{factor.riskContribution}%
                    </Badge>
                )}
            </div>
        </div>
    );
}

export { RiskFactorCard };
export default RiskFactorCard;
