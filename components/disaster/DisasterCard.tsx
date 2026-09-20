"use client";

import { useState } from "react";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Info,
    MapPin,
    Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DisasterInfo } from "@/lib/domain/disaster-analysis";

// Component แสดงรายละเอียดภัยพิบัติ
function DisasterCard({ disaster }: { disaster: DisasterInfo }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                <CollapsibleTrigger asChild>
                    <button className="w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-gray-900 dark:text-gray-100">
                                    {disaster.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {disaster.description}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge
                                className={cn(
                                    "font-bold",
                                    disaster.probability >= 70
                                        ? "bg-red-500"
                                        : disaster.probability >= 40
                                            ? "bg-orange-500"
                                            : "bg-yellow-500"
                                )}
                            >
                                {disaster.probability}%
                            </Badge>
                            {isOpen ? (
                                <ChevronUp className="h-5 w-5 text-gray-500" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                            )}
                        </div>
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t border-red-100 dark:border-red-900/50 pt-4">
                        {/* คำอธิบายละเอียด */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                            <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                กลไกการเกิด
                            </h5>
                            <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-line leading-relaxed">
                                {disaster.detailedExplanation}
                            </p>
                        </div>

                        {/* สาเหตุ */}
                        <div>
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                สาเหตุที่ทำให้เกิด
                            </h5>
                            <ul className="space-y-2">
                                {disaster.causes.map((cause, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                                    >
                                        <span className="text-orange-500 mt-1">•</span>
                                        {cause}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* พื้นที่ได้รับผลกระทบ */}
                        <div>
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-red-500" />
                                พื้นที่ที่อาจได้รับผลกระทบ
                            </h5>
                            <div className="flex flex-wrap gap-2">
                                {disaster.impactAreas.map((area, idx) => (
                                    <Badge
                                        key={idx}
                                        variant="outline"
                                        className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                                    >
                                        {area}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* วิธีป้องกัน */}
                        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                            <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                วิธีป้องกันและเตรียมพร้อม
                            </h5>
                            <ul className="space-y-2">
                                {disaster.preventionTips.map((tip, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400"
                                    >
                                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

export { DisasterCard };
export default DisasterCard;
