import { NextResponse } from 'next/server';
import hydroStations from '@/data/hydro-stations.json';

interface HydroStation {
    id: string;
    name: string;
    nameTh: string;
    lat: number;
    lon: number;
    source: string;
}

interface TideEvent {
    time: string;
    level: number;
    type: "high" | "low";
}

type StationEventResult = {
    events: TideEvent[];
    degraded: boolean;
    degradedReason?: string;
};

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find nearest station to given coordinates
function findNearestStation(lat: number, lon: number): { station: HydroStation; distance: number } {
    let nearestStation = hydroStations[0] as HydroStation;
    let minDistance = calculateDistance(lat, lon, nearestStation.lat, nearestStation.lon);

    for (const station of hydroStations as HydroStation[]) {
        const distance = calculateDistance(lat, lon, station.lat, station.lon);
        if (distance < minDistance) {
            minDistance = distance;
            nearestStation = station;
        }
    }

    return { station: nearestStation, distance: minDistance };
}

// Generate tide events using the advanced harmonic engine with 37 constituents
// This is much more accurate than the previous lunar day approximation
import { findTideExtremes } from '@/lib/harmonic-engine';

function generateTideEventsForStation(station: HydroStation, date: Date): StationEventResult {
    const location = {
        lat: station.lat,
        lon: station.lon,
        name: station.nameTh
    };
    
    try {
        // Use the proper 37-constituent harmonic engine for accurate predictions
        const extremes = findTideExtremes(date, location);
        
        if (extremes.length === 0) {
            console.warn(`[Hydro API] No extremes found for station ${station.nameTh}, returning degraded fallback`);
            return {
                events: generateFallbackTideEvents(date),
                degraded: true,
                degradedReason: "ไม่พบจุด extreme จากสถานีใกล้เคียง จึงใช้รูปแบบสำรองภายใน"
            };
        }
        
        return {
            events: extremes.map(extreme => ({
                time: extreme.time,
                level: extreme.level,
                type: extreme.type
            })),
            degraded: false
        };
    } catch (error) {
        console.error(`[Hydro API] Harmonic engine error for ${station.nameTh}:`, error);
        return {
            events: generateFallbackTideEvents(date),
            degraded: true,
            degradedReason: "โมเดลสถานีใกล้เคียงล้มเหลว จึงใช้รูปแบบสำรองภายใน"
        };
    }
}

function generateFallbackTideEvents(date: Date): TideEvent[] {
    return [
        { time: "06:00", level: 1.8, type: "high" as const },
        { time: "12:15", level: 0.5, type: "low" as const },
        { time: "18:30", level: 1.7, type: "high" as const },
        { time: "00:45", level: 0.6, type: "low" as const }
    ].filter(e => {
        const [h] = e.time.split(':').map(Number);
        return h < 24;
    });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date') || new Date().toISOString();
        const lat = parseFloat(searchParams.get('lat') || '13.7563');
        const lon = parseFloat(searchParams.get('lon') || '100.5018');

        const date = new Date(dateStr);

        console.log(`[Hydro API] Fetching tide data for ${date.toISOString()} at (${lat}, ${lon})`);

        // Find nearest official station
        const { station, distance } = findNearestStation(lat, lon);
        console.log(`[Hydro API] Nearest station: ${station.nameTh} (${distance.toFixed(1)} km away)`);

        // Generate tide events for this station
        const stationResult = generateTideEventsForStation(station, date);

        return NextResponse.json({
            success: true,
            stationId: station.id,
            stationName: station.nameTh,
            stationNameEn: station.name,
            stationLat: station.lat,
            stationLon: station.lon,
            distanceKm: parseFloat(distance.toFixed(2)),
            source: "สถานีใกล้เคียง + โมเดลภายใน",
            sourceTier: stationResult.degraded ? "harmonic" : "station_projected",
            degraded: stationResult.degraded,
            degradedReason: stationResult.degradedReason,
            lastCheck: new Date().toISOString(),
            date: date.toISOString().split('T')[0],
            events: stationResult.events,
            allStations: hydroStations.map((s: any) => ({
                id: s.id,
                name: s.nameTh,
                lat: s.lat,
                lon: s.lon
            }))
        });

    } catch (error) {
        console.error('[Hydro API] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: String(error)
        }, { status: 500 });
    }
}
