"use client";

import { Bell, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    type AdvanceWarning,
    getWarningLevelColor,
    getWarningLevelText,
} from "@/lib/domain/disaster-analysis";

// Component แสดง Advance Warnings
function AdvanceWarningsSection({ warnings }: { warnings: AdvanceWarning[] }) {
    if (warnings.length === 0) return null;

    return (
        <div className="bg-white/80 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                การเตือนล่วงหน้า ({warnings.length})
            </h3>
            <div className="space-y-3">
                {warnings.map((warning, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "p-4 rounded-lg border-l-4",
                            warning.warningLevel === "emergency"
                                ? "bg-red-50 dark:bg-red-950/30 border-l-red-600"
                                : warning.warningLevel === "warning"
                                    ? "bg-orange-50 dark:bg-orange-950/30 border-l-orange-500"
                                    : warning.warningLevel === "advisory"
                                        ? "bg-yellow-50 dark:bg-yellow-950/30 border-l-yellow-500"
                                        : "bg-blue-50 dark:bg-blue-950/30 border-l-blue-500"
                        )}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Badge className={getWarningLevelColor(warning.warningLevel)}>
                                    {getWarningLevelText(warning.warningLevel)}
                                </Badge>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {warning.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <Timer className="h-4 w-4" />
                                {warning.timeUntil}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {warning.message}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {warning.actionRequired.map((action, aidx) => (
                                <Badge
                                    key={aidx}
                                    variant="outline"
                                    className="bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300"
                                >
                                    ✓ {action}
                                </Badge>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export { AdvanceWarningsSection };
export default AdvanceWarningsSection;
