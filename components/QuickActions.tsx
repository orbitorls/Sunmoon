"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
    Share2,
    Copy,
    MapPin,
    Star,
    MessageCircle,
    Link,
    Check,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TideData, LocationData } from "@/lib/tide-service";

interface QuickActionsProps {
    location: LocationData;
    tideData: TideData;
    onSelectPreset?: (location: LocationData) => void;
    className?: string;
}

// Quick location presets
const LOCATION_PRESETS = [
    { name: "กรุงเทพมหานคร", lat: 13.7563, lon: 100.5018 },
    { name: "พัทยา", lat: 12.93, lon: 100.88 },
    { name: "ภูเก็ต", lat: 7.89, lon: 98.40 },
    { name: "หัวหิน", lat: 12.57, lon: 99.96 },
    { name: "สมุย", lat: 9.51, lon: 100.06 },
    { name: "เกาะช้าง", lat: 12.05, lon: 102.36 },
];

export default function QuickActions({
    location,
    tideData,
    onSelectPreset,
    className,
}: QuickActionsProps) {
    const [copied, setCopied] = useState(false);

    // Generate share text
    const generateShareText = () => {
        const date = new Date().toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        return `🌊 พยากรณ์น้ำขึ้นน้ำลง ${date}
📍 ${location.name}
🌊 ระดับน้ำ: ${tideData.currentWaterLevel?.toFixed(2) || "N/A"} ม.
🌙 ${tideData.tideStatus} (${tideData.isWaxingMoon ? "ข้างขึ้น" : "ข้างแรม"} ${tideData.lunarPhaseKham} ค่ำ)
⬆️ น้ำขึ้น: ${tideData.highTideTime || "N/A"}
⬇️ น้ำลง: ${tideData.lowTideTime || "N/A"}

🔗 ดูข้อมูลเพิ่มเติม: ${typeof window !== 'undefined' ? window.location.href : ''}`;
    };

    // Generate coordinates text
    const generateCoordsText = () => {
        return `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
    };

    // Copy to clipboard
    const copyToClipboard = async (text: string, successMessage: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success(successMessage);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("ไม่สามารถคัดลอกได้");
        }
    };

    // Share via Web Share API
    const shareData = async () => {
        const shareText = generateShareText();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "พยากรณ์น้ำขึ้นน้ำลง - SEAPALO",
                    text: shareText,
                    url: window.location.href,
                });
                toast.success("แชร์สำเร็จ!");
            } catch (err) {
                if ((err as Error).name !== "AbortError") {
                    // Fallback to copy
                    copyToClipboard(shareText, "คัดลอกข้อความแล้ว");
                }
            }
        } else {
            // Fallback for browsers without Web Share API
            copyToClipboard(shareText, "คัดลอกข้อความแล้ว");
        }
    };

    // Open in Google Maps
    const openInGoogleMaps = () => {
        const url = `https://www.google.com/maps?q=${location.lat},${location.lon}`;
        window.open(url, "_blank");
    };

    // Generate LINE share URL
    const shareToLine = () => {
        const text = encodeURIComponent(generateShareText());
        const url = `https://line.me/R/msg/text/?${text}`;
        window.open(url, "_blank");
    };

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {/* Share button */}
            <Button
                variant="outline"
                size="sm"
                onClick={shareData}
                className="gap-2"
            >
                <Share2 className="h-4 w-4" />
                แชร์
            </Button>

            {/* Copy dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        คัดลอก
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => copyToClipboard(generateShareText(), "คัดลอกข้อมูลพยากรณ์แล้ว")}
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        คัดลอกข้อมูลพยากรณ์
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => copyToClipboard(generateCoordsText(), "คัดลอกพิกัดแล้ว")}
                    >
                        <MapPin className="h-4 w-4 mr-2" />
                        คัดลอกพิกัด
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            copyToClipboard(
                                typeof window !== 'undefined' ? window.location.href : '',
                                "คัดลอกลิงก์แล้ว"
                            )
                        }
                    >
                        <Link className="h-4 w-4 mr-2" />
                        คัดลอกลิงก์
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* More actions dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Star className="h-4 w-4" />
                        เพิ่มเติม
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={openInGoogleMaps}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        เปิดใน Google Maps
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareToLine}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        แชร์ไปยัง LINE
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        เปลี่ยนตำแหน่งเร็ว
                    </div>
                    {LOCATION_PRESETS.map((preset) => (
                        <DropdownMenuItem
                            key={preset.name}
                            onClick={() => {
                                const nextLocation = {
                                    lat: preset.lat,
                                    lon: preset.lon,
                                    name: preset.name,
                                };
                                onSelectPreset?.(nextLocation);
                                toast.success(`เลือก ${preset.name} แล้ว`);
                            }}
                        >
                            <MapPin className="h-4 w-4 mr-2" />
                            {preset.name}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
