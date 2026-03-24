import { TideEvent } from "./tide-service";
import { findTideExtremes } from "./harmonic-engine";
import hydroStations from "@/data/hydro-stations.json";

/**
 * Hydrographic Department (Thai Navy) Data Service
 * Uses harmonic engine directly instead of API calls for server-side compatibility.
 */

export interface HydroData {
    stationName: string;
    stationId: string;
    distanceKm: number;
    source: "Hydrographic Station Projection" | "สถานีใกล้เคียง + โมเดลภายใน";
    events: TideEvent[];
}

export interface HydroStation {
    id: string;
    name: string;
    nameTh?: string;
    lat: number;
    lon: number;
}

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
    const stations = hydroStations as HydroStation[];
    let nearestStation = stations[0];
    let minDistance = calculateDistance(lat, lon, nearestStation.lat, nearestStation.lon);

    for (const station of stations) {
        const distance = calculateDistance(lat, lon, station.lat, station.lon);
        if (distance < minDistance) {
            minDistance = distance;
            nearestStation = station;
        }
    }

    return { station: nearestStation, distance: minDistance };
}

/**
 * Fetch tide data using harmonic engine directly (no API call needed)
 * This works on both client and server side
 * @param date Target date
 * @param lat Latitude of user location
 * @param lon Longitude of user location
 */
export async function fetchHydroTideData(
    date: Date,
    lat?: number,
    lon?: number
): Promise<HydroData | null> {
    try {
        const latitude = lat ?? 13.7563; // Default to Bangkok
        const longitude = lon ?? 100.5018;

        // Find nearest official station
        const { station, distance } = findNearestStation(latitude, longitude);
        
        // Create location object for harmonic engine
        const location = {
            lat: station.lat,
            lon: station.lon,
            name: station.nameTh || station.name
        };

        // Use harmonic engine directly (37 constituents)
        const extremes = findTideExtremes(date, location);

        if (extremes.length === 0) {
            console.warn(`No tide extremes found for station ${station.name}`);
            return null;
        }

        const events: TideEvent[] = extremes.map(extreme => ({
            time: extreme.time,
            level: extreme.level,
            type: extreme.type
        }));

        return {
            stationName: station.nameTh || station.name,
            stationId: station.id,
            distanceKm: parseFloat(distance.toFixed(2)),
            source: "สถานีใกล้เคียง + โมเดลภายใน",
            events
        };
    } catch (error) {
        console.error("Failed to calculate hydro data:", error);
        return null;
    }
}

/**
 * Get list of all official Hydrographic Department stations
 */
export function getAllHydroStations(): HydroStation[] {
    return (hydroStations as HydroStation[]).map(s => ({
        id: s.id,
        name: s.nameTh || s.name,
        lat: s.lat,
        lon: s.lon
    }));
}

