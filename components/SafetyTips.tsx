"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    LifeBuoy,
    AlertTriangle,
    Phone,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Shield,
    Waves,
    Wind,
    Cloud,
    Home,
    Car,
    Info,
} from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/domain/disaster-analysis";

interface SafetyTipsProps {
    currentRiskLevel?: RiskLevel;
    className?: string;
}

interface SafetyTip {
    icon: React.ReactNode;
    title: string;
    description: string;
    riskLevels: RiskLevel[];
}

const SAFETY_TIPS: SafetyTip[] = [
    {
        icon: <Waves className="h-4 w-4 text-blue-500" />,
        title: "หลีกเลี่ยงชายหาดและพื้นที่ต่ำ",
        description: "เมื่อน้ำขึ้นสูง ควรอยู่ห่างจากชายฝั่งอย่างน้อย 100 เมตร",
        riskLevels: ["high", "critical"],
    },
    {
        icon: <Car className="h-4 w-4 text-orange-500" />,
        title: "จอดรถในที่สูง",
        description: "หลีกเลี่ยงจอดรถในพื้นที่ต่ำ หรือใกล้แม่น้ำ/ทะเล",
        riskLevels: ["medium", "high", "critical"],
    },
    {
        icon: <Home className="h-4 w-4 text-green-500" />,
        title: "เตรียมบ้านให้พร้อม",
        description: "ยกของมีค่าขึ้นที่สูง เตรียมกระสอบทราย",
        riskLevels: ["high", "critical"],
    },
    {
        icon: <Phone className="h-4 w-4 text-red-500" />,
        title: "บันทึกเบอร์ฉุกเฉิน",
        description: "ฉุกเฉิน 1669, กรมอุทกศาสตร์ 02-266-6600",
        riskLevels: ["low", "medium", "high", "critical"],
    },
    {
        icon: <Shield className="h-4 w-4 text-purple-500" />,
        title: "ติดตามข่าวสาร",
        description: "ติดตามประกาศจากกรมอุทกศาสตร์และกรมอุตุนิยมวิทยา",
        riskLevels: ["low", "medium", "high", "critical"],
    },
    {
        icon: <Wind className="h-4 w-4 text-cyan-500" />,
        title: "ระวังลมแรง",
        description: "หลีกเลี่ยงกิจกรรมทางทะเลเมื่อลมแรงเกิน 20 กม./ชม.",
        riskLevels: ["medium", "high", "critical"],
    },
    {
        icon: <Cloud className="h-4 w-4 text-gray-500" />,
        title: "เตรียมรับมือฝนตก",
        description: "น้ำฝนร่วมกับน้ำหนุนอาจทำให้ท่วมรุนแรงขึ้น",
        riskLevels: ["high", "critical"],
    },
];

const EMERGENCY_CONTACTS = [
    { name: "ฉุกเฉิน", number: "1669" },
    { name: "ตำรวจ", number: "191" },
    { name: "ดับเพลิง", number: "199" },
    { name: "กรมอุทกศาสตร์", number: "02-266-6600" },
    { name: "กรมอุตุนิยมวิทยา", number: "1182" },
    { name: "ปภ.", number: "1784" },
];

const USEFUL_LINKS = [
    {
        name: "กรมอุทกศาสตร์",
        url: "https://www.navy.mi.th/hydro",
        description: "ข้อมูลน้ำขึ้นน้ำลงอย่างเป็นทางการ",
    },
    {
        name: "กรมอุตุนิยมวิทยา",
        url: "https://www.tmd.go.th",
        description: "พยากรณ์อากาศและคำเตือนภัย",
    },
    {
        name: "ศูนย์เตือนภัยพิบัติ",
        url: "https://www.disaster.go.th",
        description: "กรมป้องกันและบรรเทาสาธารณภัย",
    },
];

export default function SafetyTips({
    currentRiskLevel = "low",
    className,
}: SafetyTipsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showAllTips, setShowAllTips] = useState(false);

    // Filter tips based on current risk level
    const relevantTips = showAllTips
        ? SAFETY_TIPS
        : SAFETY_TIPS.filter((tip) => tip.riskLevels.includes(currentRiskLevel));

    const riskColors = {
        low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
        high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };

    return (
        <Card className={cn("", className)}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LifeBuoy className="h-5 w-5 text-red-500" />
                                คำแนะนำความปลอดภัย
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge className={cn(riskColors[currentRiskLevel])}>
                                    {currentRiskLevel === "critical"
                                        ? "วิกฤต"
                                        : currentRiskLevel === "high"
                                            ? "สูง"
                                            : currentRiskLevel === "medium"
                                                ? "ปานกลาง"
                                                : "ปกติ"}
                                </Badge>
                                {isOpen ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </div>
                        </button>
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        {/* Risk-specific message */}
                        {currentRiskLevel !== "low" && (
                            <div
                                className={cn(
                                    "p-3 rounded-lg flex items-start gap-3",
                                    riskColors[currentRiskLevel]
                                )}
                            >
                                <AlertTriangle className="h-5 w-5 mt-0.5" />
                                <div>
                                    <h4 className="font-bold">
                                        {currentRiskLevel === "critical"
                                            ? "⚠️ คำเตือนระดับวิกฤต"
                                            : currentRiskLevel === "high"
                                                ? "⚠️ คำเตือนระดับสูง"
                                                : "⚠️ ควรระมัดระวัง"}
                                    </h4>
                                    <p className="text-sm mt-1">
                                        {currentRiskLevel === "critical"
                                            ? "กรุณาหลีกเลี่ยงพื้นที่ชายฝั่งโดยเด็ดขาด และเตรียมพร้อมอพยพหากจำเป็น"
                                            : currentRiskLevel === "high"
                                                ? "ไม่แนะนำให้ทำกิจกรรมทางทะเล ติดตามสถานการณ์อย่างใกล้ชิด"
                                                : "ควรระมัดระวังเมื่อทำกิจกรรมใกล้ชายฝั่ง"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Safety tips */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    คำแนะนำ
                                </h4>
                                <button
                                    onClick={() => setShowAllTips(!showAllTips)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    {showAllTips ? "แสดงเฉพาะที่เกี่ยวข้อง" : "แสดงทั้งหมด"}
                                </button>
                            </div>

                            <div className="grid gap-2">
                                {relevantTips.map((tip, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                    >
                                        <div className="mt-0.5">{tip.icon}</div>
                                        <div>
                                            <div className="font-medium text-sm">{tip.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {tip.description}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Emergency contacts */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                เบอร์ฉุกเฉิน
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                {EMERGENCY_CONTACTS.map((contact) => (
                                    <a
                                        key={contact.number}
                                        href={`tel:${contact.number}`}
                                        className="p-2 text-center bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    >
                                        <div className="text-lg font-bold text-red-600">
                                            {contact.number}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {contact.name}
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Useful links */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <ExternalLink className="h-4 w-4" />
                                ลิงก์ที่เป็นประโยชน์
                            </h4>
                            <div className="space-y-2">
                                {USEFUL_LINKS.map((link) => (
                                    <a
                                        key={link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                    >
                                        <div>
                                            <div className="font-medium text-sm text-blue-700 dark:text-blue-300">
                                                {link.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {link.description}
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-blue-500" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
