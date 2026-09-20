"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CloudRain, History, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { HistoricalContext } from "@/lib/domain/disaster-analysis";

// Component แสดง Historical Context
function HistoricalContextSection({ context }: { context: HistoricalContext | null }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!context) return null;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-between bg-white/80 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600"
                >
                    <span className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        ข้อมูลประวัติศาสตร์และรูปแบบตามฤดูกาล
                    </span>
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                    {/* รูปแบบตามฤดูกาล */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                            <CloudRain className="h-4 w-4" />
                            รูปแบบตามฤดูกาล
                        </h4>
                        <p className="text-sm text-purple-700 dark:text-purple-400">
                            {context.seasonalPattern}
                        </p>
                    </div>

                    {/* ความถี่การเกิด */}
                    <div className="mb-4">
                        <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            ความถี่โดยเฉลี่ย
                        </h4>
                        <p className="text-sm text-purple-700 dark:text-purple-400">
                            {context.averageOccurrence}
                        </p>
                    </div>

                    {/* เหตุการณ์ที่คล้ายกันในอดีต */}
                    {context.similarEvents.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                                <History className="h-4 w-4" />
                                เหตุการณ์ที่คล้ายกันในอดีต
                            </h4>
                            <div className="space-y-2">
                                {context.similarEvents.map((event, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg text-sm"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {event.date}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {event.severity}
                                            </Badge>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            {event.description}
                                        </p>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                            ระดับน้ำสูงสุด: {event.maxWaterLevel} ม.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export { HistoricalContextSection };
export default HistoricalContextSection;
