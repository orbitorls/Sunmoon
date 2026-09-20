// components/HistoricalEventsPanel.tsx

"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    History,
    MapPin,
    Waves,
    Wind,
    CloudRain,
    AlertTriangle,
    Calendar,
    Users,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Filter,
    BarChart3,
} from "lucide-react";
import {
    findEventsNearLocation,
    getEventStatistics,
    getEventTypeThai,
    getSeverityThai,
    getSeverityColor,
    type HistoricalEvent,
    type EventType,
    type Severity,
} from "@/lib/services/historical-data-service";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RealTimeDisasterPanel } from "@/components/real-time-disaster-panel";

interface HistoricalEventsPanelProps {
    currentLocation: { lat: number; lon: number; name: string };
    className?: string;
}

// Event card component
function EventCard({
    event,
    isExpanded,
    onToggle,
}: {
    event: HistoricalEvent;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const eventIcon = {
        flood: <CloudRain className="h-4 w-4" />,
        storm_surge: <Wind className="h-4 w-4" />,
        high_tide: <Waves className="h-4 w-4" />,
        erosion: <TrendingUp className="h-4 w-4" />,
    }[event.eventType];

    return (
        <div
            className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
            style={{ borderLeftWidth: "4px", borderLeftColor: getSeverityColor(event.severity) }}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${getSeverityColor(event.severity)}20` }}>
                        {eventIcon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base">{getEventTypeThai(event.eventType)}</h4>
                            <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: getSeverityColor(event.severity), color: getSeverityColor(event.severity) }}
                            >
                                {getSeverityThai(event.severity)}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>{event.date}</span>
                            <MapPin className="h-3 w-3 ml-2" />
                            <span className="truncate max-w-[150px]">{event.location.name}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{event.description}</p>
            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1 text-blue-600">
                    <Waves className="h-3 w-3" />
                    <span className="font-medium">{event.maxWaterLevel} ม.</span>
                </div>
                {event.damages.deaths > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{event.damages.deaths} ราย</span>
                    </div>
                )}
                <div className="flex items-center gap-1 text-gray-500">
                    <span>{event.duration} ชม.</span>
                </div>
            </div>
            {/* Expanded content */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <h5 className="text-sm font-medium mb-1">สาเหตุ</h5>
                        <p className="text-sm text-muted-foreground">{event.cause}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground">ความเสียหายทางเศรษฐกิจ</div>
                            <div className="font-bold text-blue-700 dark:text-blue-300">{event.damages.economic}</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground">พื้นที่ได้รับผลกระทบ</div>
                            <div className="font-bold text-orange-700 dark:text-orange-300">{event.damages.areaKm2} ตร.กม.</div>
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-2">จังหวัดที่ได้รับผลกระทบ</div>
                        <div className="flex flex-wrap gap-1">
                            {event.location.provinces.map((province) => (
                                <Badge key={province} variant="secondary" className="text-xs">{province}</Badge>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {event.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">แหล่งที่มา: {event.source}</p>
                </div>
            )}
        </div>
    );
}

// Statistics summary component
function StatisticsSummary() {
    const stats = useMemo(() => getEventStatistics(), []);
    const monthNames = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
    ];
    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold">สถิติภัยพิบัติ</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-blue-600">{stats.totalEvents}</div>
                    <div className="text-xs text-muted-foreground">เหตุการณ์ทั้งหมด</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-red-600">{stats.totalDeaths}</div>
                    <div className="text-xs text-muted-foreground">รวมผู้เสียชีวิต</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-orange-600">{stats.averageMaxWaterLevel.toFixed(1)} </div>
                    <div className="text-xs text-muted-foreground">เฉลี่ยระดับน้ำ (ม.)</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-purple-600">{monthNames[stats.mostCommonMonth - 1]}</div>
                    <div className="text-xs text-muted-foreground">เดือนที่เกิดบ่อยสุด</div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white dark:bg-slate-800 rounded">
                    <CloudRain className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                    <div className="font-bold">{stats.byType.flood}</div>
                    <div className="text-muted-foreground">น้ำท่วม</div>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded">
                    <Wind className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                    <div className="font-bold">{stats.byType.storm_surge}</div>
                    <div className="text-muted-foreground">พายุ</div>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded">
                    <Waves className="h-4 w-4 mx-auto text-cyan-500 mb-1" />
                    <div className="font-bold">{stats.byType.high_tide}</div>
                    <div className="text-muted-foreground">น้ำหนุน</div>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800 rounded">
                    <TrendingUp className="h-4 w-4 mx-auto text-orange-5 0 mb-1" />
                    <div className="font-bold">{stats.byType.erosion}</div>
                    <div className="text-muted-foreground">กัดเซาะ</div>
                </div>
            </div>
        </div>
    );
}

export default function HistoricalEventsPanel({ currentLocation, className }: HistoricalEventsPanelProps) {
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<EventType | "all">("all");
    const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
    const [searchRadius, setSearchRadius] = useState<number>(200);
    const [activeTab, setActiveTab] = useState<string>("historical");

    const nearbyEvents = useMemo(() => {
        let events = findEventsNearLocation(currentLocation.lat, currentLocation.lon, searchRadius);
        if (filterType !== "all") events = events.filter((e) => e.eventType === filterType);
        if (filterSeverity !== "all") events = events.filter((e) => e.severity === filterSeverity);
        return events;
    }, [currentLocation.lat, currentLocation.lon, searchRadius, filterType, filterSeverity]);

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("", className)}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="historical">ประวัติภัยพิบัติ</TabsTrigger>
                <TabsTrigger value="live">เรียลไทม์</TabsTrigger>
            </TabsList>
            <TabsContent value="historical">
                <Card className={cn("", className)}>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5 text-purple-600" />
                                ประวัติภัยพิบัติใกล้เคียง
                            </CardTitle>
                            <Badge variant="secondary" className="font-bold">{nearbyEvents.length} เหตุการณ์</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            ข้อมูลเหตุการณ์ภัยพิบัติในรัศมี {searchRadius} กม. จากตำแหน่งปัจจุบัน
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Statistics */}
                        <StatisticsSummary />
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">กรองข้อมูล:</span>
                            </div>
                            <Select value={String(searchRadius)} onValueChange={(v) => setSearchRadius(Number(v))}>
                                <SelectTrigger className="w-[120px] h-9">
                                    <SelectValue placeholder="รัศมี" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="50">50 กม.</SelectItem>
                                    <SelectItem value="100">100 กม.</SelectItem>
                                    <SelectItem value="200">200 กม.</SelectItem>
                                    <SelectItem value="500">500 กม.</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | "all")}>
                                <SelectTrigger className="w-[120px] h-9">
                                    <SelectValue placeholder="ประเภท" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกประเภท</SelectItem>
                                    <SelectItem value="flood">น้ำท่วม</SelectItem>
                                    <SelectItem value="storm_surge">พายุ</SelectItem>
                                    <SelectItem value="high_tide">น้ำหนุน</SelectItem>
                                    <SelectItem value="erosion">กัดเซาะ</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v as Severity | "all")}>
                                <SelectTrigger className="w-[120px] h-9">
                                    <SelectValue placeholder="ความรุนแรง" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทุกระดับ</SelectItem>
                                    <SelectItem value="catastrophic">หายนะ</SelectItem>
                                    <SelectItem value="severe">รุนแรง</SelectItem>
                                    <SelectItem value="moderate">ปานกลาง</SelectItem>
                                    <SelectItem value="minor">เล็กน้อย</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Events list */}
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {nearbyEvents.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    ไม่พบเหตุการณ์ในรัศมีที่กำหนด
                                </div>
                            ) : (
                                nearbyEvents.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        isExpanded={expandedEventId === event.id}
                                        onToggle={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                                    />
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="live">
                <RealTimeDisasterPanel />
            </TabsContent>
        </Tabs>
    );
}
