"use client";

import { Map as PigeonMap, Marker } from "pigeon-maps";
import { Droplets } from "lucide-react";
import {
    getZoneSeasonalRisk,
    getSeverityColor,
    type RiskZone,
    type HistoricalEvent,
} from "@/lib/historical-data-service";
import { cn } from "@/lib/utils";
import type { ThaiWaterLevel } from "@/lib/thaiwater-service";

// Custom SVG Overlay for Risk Zones
// Pigeon Map passes these props to children: width, height, latLngToPixel, pixelToLatLng
interface RiskZoneLayerProps {
    zones: RiskZone[];
    onZoneClick: (zone: RiskZone) => void;
    selectedZoneId?: string;
    width?: number;
    height?: number;
    latLngToPixel?: (latLng: [number, number]) => [number, number];
}

function RiskZoneLayer({
    zones,
    onZoneClick,
    selectedZoneId,
    width,
    height,
    latLngToPixel
}: RiskZoneLayerProps) {
    if (!width || !height || !latLngToPixel) return null;

    return (
        <svg
            width={width}
            height={height}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
        >
            {zones.map(zone => {
                if (!zone.bounds) return null;

                // Calculate pixel coordinates for the bounding box
                const nw = latLngToPixel([zone.bounds.maxLat, zone.bounds.minLon]);
                const se = latLngToPixel([zone.bounds.minLat, zone.bounds.maxLon]);

                const x = nw[0];
                const y = nw[1];
                const boxWidth = se[0] - nw[0];
                const boxHeight = se[1] - nw[1];

                const currentRisk = getZoneSeasonalRisk(zone);
                const fillColor = {
                    high: "rgba(239, 68, 68, 0.2)",
                    medium: "rgba(245, 158, 11, 0.2)",
                    low: "rgba(34, 197, 94, 0.15)",
                }[currentRisk];

                const strokeColor = {
                    high: "rgba(239, 68, 68, 0.8)",
                    medium: "rgba(245, 158, 11, 0.8)",
                    low: "rgba(34, 197, 94, 0.8)",
                }[currentRisk];

                const isSelected = selectedZoneId === zone.id;

                return (
                    <g key={zone.id} onClick={() => onZoneClick(zone)} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
                        <rect
                            x={x}
                            y={y}
                            width={boxWidth}
                            height={boxHeight}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={isSelected ? 3 : 1}
                            rx={8}
                            className="transition-all duration-300 hover:opacity-80"
                        />
                        {/* Zone Label - Centered */}
                        <text
                            x={x + boxWidth / 2}
                            y={y + boxHeight / 2}
                            textAnchor="middle"
                            fill={strokeColor}
                            fontSize="12"
                            fontWeight="bold"
                            style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}
                        >
                            {zone.name}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// Event marker component
function EventMarker({
    event,
    onClick,
    isSelected,
}: {
    event: HistoricalEvent;
    onClick: () => void;
    isSelected: boolean;
}) {
    const color = getSeverityColor(event.severity);

    return (
        <Marker
            anchor={[event.location.lat, event.location.lon]}
            onClick={onClick}
        >
            <div
                className={cn(
                    "w-3 h-3 rounded-full border border-white shadow-sm cursor-pointer transition-all hover:scale-150 transform",
                    isSelected && "scale-150 ring-2 ring-blue-400 z-50",
                    !isSelected && "opacity-80"
                )}
                style={{ backgroundColor: color }}
            />
        </Marker>
    );
}

// Live Station Marker
function StationMarker({
    station,
    onClick,
}: {
    station: ThaiWaterLevel;
    onClick: () => void;
}) {
    return (
        <Marker
            anchor={[station.lat, station.lon]}
            onClick={onClick}
        >
            <div className="relative group cursor-pointer z-20">
                <div className="absolute -top-8 -left-6 bg-white dark:bg-slate-800 px-2 py-1 rounded text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                    {station.water_level.toFixed(2)} ม.
                </div>
                <div className="w-5 h-5 rounded-sm bg-blue-500 border-2 border-white shadow-md flex items-center justify-center transform rotate-45 hover:scale-125 transition-transform">
                    <Droplets className="w-3 h-3 text-white transform -rotate-45" />
                </div>
            </div>
        </Marker>
    );
}

interface RiskAreaMapInnerProps {
    center: [number, number];
    zones: RiskZone[];
    events: HistoricalEvent[];
    showStations: boolean;
    showEvents: boolean;
    waterStations: ThaiWaterLevel[];
    selectedZoneId?: string;
    selectedEventId?: string;
    onMapClick: (latLng: [number, number]) => void;
    onZoneClick: (zone: RiskZone) => void;
    onEventClick: (event: HistoricalEvent) => void;
    onStationClick: (station: ThaiWaterLevel) => void;
}

/**
 * The pigeon-maps canvas for RiskAreaMap. Extracted so pigeon-maps can be
 * loaded with next/dynamic (ssr: false) from RiskAreaMap.tsx and kept out of
 * the main bundle until the risk-map tab is opened.
 */
export default function RiskAreaMapInner({
    center,
    zones,
    events,
    showStations,
    showEvents,
    waterStations,
    selectedZoneId,
    selectedEventId,
    onMapClick,
    onZoneClick,
    onEventClick,
    onStationClick,
}: RiskAreaMapInnerProps) {
    return (
        <div className="h-[450px] md:h-[550px] w-full relative">
            <PigeonMap
                center={center}
                zoom={6}
                onClick={({ latLng }) => onMapClick(latLng)}
                attribution={false} // Clean look
                dprs={[1, 2]}
                minZoom={5}
                maxZoom={12}
            >
                {/* Risk Zone Overlays (SVG Layer) */}
                <RiskZoneLayer
                    zones={zones}
                    selectedZoneId={selectedZoneId}
                    onZoneClick={onZoneClick}
                />

                {/* Station markers */}
                {showStations && waterStations.map((station) => (
                    <StationMarker
                        key={station.station_id}
                        station={station}
                        onClick={() => onStationClick(station)}
                    />
                ))}

                {/* Event markers */}
                {showEvents &&
                    events.map((event) => (
                        <EventMarker
                            key={event.id}
                            event={event}
                            isSelected={selectedEventId === event.id}
                            onClick={() => onEventClick(event)}
                        />
                    ))}

                {/* Current location marker */}
                <Marker anchor={center}>
                    <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg animate-pulse z-50 relative">
                            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <div className="mt-1 bg-black/50 text-white text-[10px] px-1 rounded backdrop-blur-sm whitespace-nowrap">
                            คุณอยู่ที่นี่
                        </div>
                    </div>
                </Marker>
            </PigeonMap>
        </div>
    );
}