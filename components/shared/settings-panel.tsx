"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    Settings,
    Bell,
    BellOff,
    RefreshCw,
    Volume2,
    VolumeX,
    Eye,
    Clock,
    Waves,
    AlertTriangle,
} from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
    onSettingsChange?: (settings: UserSettings) => void;
    className?: string;
}

export interface UserSettings {
    autoRefresh: boolean;
    refreshInterval: number; // minutes
    notifications: boolean;
    soundAlerts: boolean;
    highTideAlert: boolean;
    highTideThreshold: number; // meters
    riskAlertLevel: "low" | "medium" | "high" | "critical";
    showAnimations: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
    autoRefresh: true,
    refreshInterval: 15,
    notifications: false,
    soundAlerts: false,
    highTideAlert: true,
    highTideThreshold: 2.5,
    riskAlertLevel: "medium",
    showAnimations: true,
};

export default function SettingsPanel({
    onSettingsChange,
    className,
}: SettingsPanelProps) {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [isOpen, setIsOpen] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("userSettings");
            if (saved) {
                try {
                    setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
                } catch {
                    console.error("Failed to parse settings");
                }
            }
        }
    }, []);

    // Save settings
    const updateSettings = (partial: Partial<UserSettings>) => {
        const updated = { ...settings, ...partial };
        setSettings(updated);
        localStorage.setItem("userSettings", JSON.stringify(updated));
        onSettingsChange?.(updated);
    };

    // Request notification permission
    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            alert("เบราว์เซอร์ไม่รองรับการแจ้งเตือน");
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            updateSettings({ notifications: true });
            // Show test notification
            new Notification("SEAPALO", {
                body: "เปิดใช้งานการแจ้งเตือนสำเร็จ!",
                icon: "/favicon.ico",
            });
        }
    };

    return (
        <Card className={cn("", className)}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="h-5 w-5 text-gray-600" />
                                ตั้งค่า
                            </CardTitle>
                            <Settings
                                className={cn(
                                    "h-4 w-4 transition-transform",
                                    isOpen && "rotate-90"
                                )}
                            />
                        </button>
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="space-y-6">
                        {/* Auto Refresh */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 text-blue-500" />
                                    <Label htmlFor="auto-refresh">รีเฟรชอัตโนมัติ</Label>
                                </div>
                                <Switch
                                    id="auto-refresh"
                                    checked={settings.autoRefresh}
                                    onCheckedChange={(checked) =>
                                        updateSettings({ autoRefresh: checked })
                                    }
                                />
                            </div>

                            {settings.autoRefresh && (
                                <div className="pl-6 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            ทุกๆ {settings.refreshInterval} นาที
                                        </span>
                                    </div>
                                    <Slider
                                        value={[settings.refreshInterval]}
                                        onValueChange={([value]) =>
                                            updateSettings({ refreshInterval: value })
                                        }
                                        min={5}
                                        max={60}
                                        step={5}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>5 นาที</span>
                                        <span>60 นาที</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {settings.notifications ? (
                                        <Bell className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <BellOff className="h-4 w-4 text-gray-400" />
                                    )}
                                    <Label htmlFor="notifications">การแจ้งเตือน</Label>
                                </div>
                                {settings.notifications ? (
                                    <Switch
                                        id="notifications"
                                        checked={settings.notifications}
                                        onCheckedChange={(checked) =>
                                            updateSettings({ notifications: checked })
                                        }
                                    />
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={requestNotificationPermission}
                                    >
                                        เปิดใช้งาน
                                    </Button>
                                )}
                            </div>

                            {settings.notifications && (
                                <div className="pl-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {settings.soundAlerts ? (
                                                <Volume2 className="h-3 w-3 text-blue-500" />
                                            ) : (
                                                <VolumeX className="h-3 w-3 text-gray-400" />
                                            )}
                                            <span className="text-sm">เสียงแจ้งเตือน</span>
                                        </div>
                                        <Switch
                                            checked={settings.soundAlerts}
                                            onCheckedChange={(checked) =>
                                                updateSettings({ soundAlerts: checked })
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* High Tide Alert */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Waves className="h-4 w-4 text-blue-500" />
                                    <Label htmlFor="high-tide-alert">แจ้งเตือนน้ำขึ้นสูง</Label>
                                </div>
                                <Switch
                                    id="high-tide-alert"
                                    checked={settings.highTideAlert}
                                    onCheckedChange={(checked) =>
                                        updateSettings({ highTideAlert: checked })
                                    }
                                />
                            </div>

                            {settings.highTideAlert && (
                                <div className="pl-6 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>เตือนเมื่อสูงกว่า {settings.highTideThreshold} เมตร</span>
                                    </div>
                                    <Slider
                                        value={[settings.highTideThreshold]}
                                        onValueChange={([value]) =>
                                            updateSettings({ highTideThreshold: value })
                                        }
                                        min={1.5}
                                        max={4.0}
                                        step={0.1}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>1.5 ม.</span>
                                        <span>4.0 ม.</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Risk Alert Level */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <Label>แจ้งเตือนระดับความเสี่ยง</Label>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {(["low", "medium", "high", "critical"] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => updateSettings({ riskAlertLevel: level })}
                                        className={cn(
                                            "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                            settings.riskAlertLevel === level
                                                ? level === "critical"
                                                    ? "bg-red-500 text-white"
                                                    : level === "high"
                                                        ? "bg-orange-500 text-white"
                                                        : level === "medium"
                                                            ? "bg-yellow-500 text-white"
                                                            : "bg-green-500 text-white"
                                                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                        )}
                                    >
                                        {level === "critical"
                                            ? "วิกฤต"
                                            : level === "high"
                                                ? "สูง"
                                                : level === "medium"
                                                    ? "กลาง"
                                                    : "ต่ำ"}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                จะแจ้งเตือนเมื่อความเสี่ยงถึงระดับ{" "}
                                {settings.riskAlertLevel === "critical"
                                    ? "วิกฤต"
                                    : settings.riskAlertLevel === "high"
                                        ? "สูง"
                                        : settings.riskAlertLevel === "medium"
                                            ? "ปานกลาง"
                                            : "ต่ำ"}{" "}
                                ขึ้นไป
                            </p>
                        </div>

                        {/* Animations */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-purple-500" />
                                <Label htmlFor="animations">แสดงแอนิเมชัน</Label>
                            </div>
                            <Switch
                                id="animations"
                                checked={settings.showAnimations}
                                onCheckedChange={(checked) =>
                                    updateSettings({ showAnimations: checked })
                                }
                            />
                        </div>

                        {/* Reset button */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setSettings(DEFAULT_SETTINGS);
                                localStorage.setItem(
                                    "userSettings",
                                    JSON.stringify(DEFAULT_SETTINGS)
                                );
                                onSettingsChange?.(DEFAULT_SETTINGS);
                            }}
                        >
                            รีเซ็ตเป็นค่าเริ่มต้น
                        </Button>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
