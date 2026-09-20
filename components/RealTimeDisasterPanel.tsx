// components/RealTimeDisasterPanel.tsx

"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DisasterEvent } from "@/lib/services/disaster-data-service";
import { RefreshCw, AlertTriangle } from "lucide-react";

/**
 * Panel that displays live disaster events fetched from the `/api/live-disasters` endpoint.
 * It polls the endpoint every 5 minutes (configurable) and shows a list of events.
 */
export const RealTimeDisasterPanel: React.FC = () => {
    const [events, setEvents] = useState<DisasterEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/live-disasters");
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data = (await res.json()) as DisasterEvent[];
            setEvents(data);
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 5 * 60 * 1000); // 5 minutes
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="w-full shadow-lg border-0 bg-white/90 dark:bg-gray-900/90 overflow-hidden ring-1 ring-slate-900/5">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    สถานการณ์ภัยพิบัติ (เรียลไทม์)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                            กำลังโหลดข้อมูล...
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            ไม่มีเหตุการณ์เรียลไทม์ในขณะนี้
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {events.map((event) => (
                                <div
                                    key={event.id}
                                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-normal">
                                            {event.type}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(event.time).toLocaleString('th-TH')}</span>
                                    </div>
                                    <p className="text-sm font-medium mb-1">{event.description}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={cn('inline-block w-2 h-2 rounded-full', {
                                            catastrophic: 'bg-red-600',
                                            severe: 'bg-orange-600',
                                            moderate: 'bg-yellow-600',
                                            minor: 'bg-green-600',
                                        }[event.severity])} />
                                        <span>{event.severity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {lastUpdated && (
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                            อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
