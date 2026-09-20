/**
 * Historical Data Service
 * บริการดึงข้อมูลประวัติศาสตร์ภัยพิบัติจากฐานข้อมูล
 */

import historicalData from '@/data/historical-events.json';
import { calculateDistance } from './domain/geo';

// Types
export type EventType = 'flood' | 'storm_surge' | 'high_tide' | 'erosion';
export type Severity = 'minor' | 'moderate' | 'severe' | 'catastrophic';

export interface HistoricalEventLocation {
    lat: number;
    lon: number;
    name: string;
    provinces: string[];
}

export interface EventDamages {
    economic: string;
    affected: string;
    deaths: number;
    areaKm2: number;
}

export interface HistoricalEvent {
    id: string;
    date: string;
    year: number;
    eventType: EventType;
    location: HistoricalEventLocation;
    severity: Severity;
    maxWaterLevel: number;
    duration: number;
    description: string;
    cause: string;
    damages: EventDamages;
    source: string;
    tags: string[];
}

export interface MonsoonRisk {
    southwest: 'low' | 'medium' | 'high';
    northeast: 'low' | 'medium' | 'high';
    transition: 'low' | 'medium' | 'high';
}

export interface RiskZone {
    id: string;
    name: string;
    description: string;
    baseRiskLevel: 'low' | 'medium' | 'high';
    monsoonRisk: MonsoonRisk;
    historicalFrequency: string;
    majorEvents: string[];
    // Calculated bounds for map display
    bounds?: {
        minLat: number;
        maxLat: number;
        minLon: number;
        maxLon: number;
    };
}

export interface HistoricalDataMetadata {
    version: string;
    lastUpdated: string;
    source: string;
    totalEvents: number;
}

// Zone boundaries for map display (approximate)
const ZONE_BOUNDARIES: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number; center: [number, number] }> = {
    'gulf-inner': {
        minLat: 13.0,
        maxLat: 14.5,
        minLon: 99.5,
        maxLon: 101.0,
        center: [13.7, 100.3]
    },
    'gulf-upper': {
        minLat: 12.0,
        maxLat: 14.0,
        minLon: 100.5,
        maxLon: 102.5,
        center: [13.0, 101.5]
    },
    'gulf-lower': {
        minLat: 7.0,
        maxLat: 11.0,
        minLon: 99.0,
        maxLon: 101.5,
        center: [9.0, 100.0]
    },
    'andaman': {
        minLat: 6.5,
        maxLat: 10.5,
        minLon: 97.5,
        maxLon: 99.0,
        center: [8.5, 98.3]
    }
};

/**
 * Get all historical events
 */
export function getAllEvents(): HistoricalEvent[] {
    return historicalData.events as HistoricalEvent[];
}

/**
 * Get all risk zones with boundaries
 */
export function getAllRiskZones(): RiskZone[] {
    return (historicalData.riskZones as RiskZone[]).map(zone => ({
        ...zone,
        bounds: ZONE_BOUNDARIES[zone.id]
    }));
}

/**
 * Get zone center for map positioning
 */
export function getZoneCenter(zoneId: string): [number, number] | null {
    return ZONE_BOUNDARIES[zoneId]?.center || null;
}

/**
 * Get metadata
 */
export function getMetadata(): HistoricalDataMetadata {
    return historicalData.metadata as HistoricalDataMetadata;
}

/**
 * Find events near a specific location
 */
export function findEventsNearLocation(
    lat: number,
    lon: number,
    radiusKm: number = 100
): HistoricalEvent[] {
    const events = getAllEvents();

    return events
        .filter(event => {
            const distance = calculateDistance(lat, lon, event.location.lat, event.location.lon);
            return distance <= radiusKm;
        })
        .sort((a, b) => {
            const distA = calculateDistance(lat, lon, a.location.lat, a.location.lon);
            const distB = calculateDistance(lat, lon, b.location.lat, b.location.lon);
            return distA - distB;
        });
}

/**
 * Find the nearby historical event whose max water level is closest to a
 * given predicted level (simple nearest-level match, no scoring model).
 * Returns null if nothing nearby comes within maxLevelDiff meters.
 */
export function findSimilarEventByLevel(
    lat: number,
    lon: number,
    level: number,
    radiusKm: number = 300,
    maxLevelDiff: number = 0.5
): HistoricalEvent | null {
    const nearby = findEventsNearLocation(lat, lon, radiusKm);

    let best: HistoricalEvent | null = null;
    let bestDiff = Infinity;
    for (const event of nearby) {
        const diff = Math.abs(event.maxWaterLevel - level);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = event;
        }
    }

    return bestDiff <= maxLevelDiff ? best : null;
}

/**
 * Format a "YYYY-MM" (Thai Buddhist year) event date as e.g. "ต.ค. 2565"
 */
export function formatEventDateThai(date: string): string {
    const monthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const match = date.match(/^(\d{4})-(\d{2})$/);
    if (!match) return date;
    const [, year, month] = match;
    const monthName = monthNames[Number.parseInt(month, 10) - 1] ?? month;
    return `${monthName} ${year}`;
}

/**
 * Find events by type
 */
export function findEventsByType(eventType: EventType): HistoricalEvent[] {
    return getAllEvents().filter(event => event.eventType === eventType);
}

/**
 * Find events by severity
 */
export function findEventsBySeverity(severity: Severity): HistoricalEvent[] {
    return getAllEvents().filter(event => event.severity === severity);
}

/**
 * Find events by year range
 */
export function findEventsByYearRange(startYear: number, endYear: number): HistoricalEvent[] {
    return getAllEvents().filter(event => event.year >= startYear && event.year <= endYear);
}

/**
 * Get risk zone for a location
 */
export function getRiskZoneForLocation(lat: number, lon: number): RiskZone | null {
    const zones = getAllRiskZones();

    for (const zone of zones) {
        if (zone.bounds) {
            const { minLat, maxLat, minLon, maxLon } = zone.bounds;
            if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
                return zone;
            }
        }
    }

    // If no exact match, find nearest zone
    let nearestZone: RiskZone | null = null;
    let minDistance = Infinity;

    for (const zone of zones) {
        const center = getZoneCenter(zone.id);
        if (center) {
            const distance = calculateDistance(lat, lon, center[0], center[1]);
            if (distance < minDistance) {
                minDistance = distance;
                nearestZone = zone;
            }
        }
    }

    return nearestZone;
}

/**
 * Get current monsoon season
 */
export function getCurrentMonsoonSeason(date: Date = new Date()): 'southwest' | 'northeast' | 'transition' {
    const month = date.getMonth() + 1;

    if (month >= 5 && month <= 10) {
        return 'southwest';
    } else if (month >= 11 || month <= 2) {
        return 'northeast';
    } else {
        return 'transition';
    }
}

/**
 * Get risk level for a zone based on current season
 */
export function getZoneSeasonalRisk(zone: RiskZone, date: Date = new Date()): 'low' | 'medium' | 'high' {
    const season = getCurrentMonsoonSeason(date);
    return zone.monsoonRisk[season];
}

/**
 * Get events for a specific risk zone
 */
export function getEventsForZone(zoneId: string): HistoricalEvent[] {
    const zone = getAllRiskZones().find(z => z.id === zoneId);
    if (!zone) return [];

    return zone.majorEvents
        .map(eventId => getAllEvents().find(e => e.id === eventId))
        .filter((e): e is HistoricalEvent => e !== undefined);
}

/**
 * Get statistics for events
 */
export interface EventStatistics {
    totalEvents: number;
    byType: Record<EventType, number>;
    bySeverity: Record<Severity, number>;
    averageMaxWaterLevel: number;
    totalDeaths: number;
    mostCommonMonth: number;
}

export function getEventStatistics(): EventStatistics {
    const events = getAllEvents();

    const byType: Record<EventType, number> = {
        flood: 0,
        storm_surge: 0,
        high_tide: 0,
        erosion: 0
    };

    const bySeverity: Record<Severity, number> = {
        minor: 0,
        moderate: 0,
        severe: 0,
        catastrophic: 0
    };

    const monthCounts: Record<number, number> = {};
    let totalWaterLevel = 0;
    let totalDeaths = 0;

    for (const event of events) {
        byType[event.eventType]++;
        bySeverity[event.severity]++;
        totalWaterLevel += event.maxWaterLevel;
        totalDeaths += event.damages.deaths;

        // Extract month from Thai Buddhist year format (2567-12)
        const monthMatch = event.date.match(/-(\d{2})$/);
        if (monthMatch) {
            const month = parseInt(monthMatch[1], 10);
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
    }

    // Find most common month
    let mostCommonMonth = 1;
    let maxCount = 0;
    for (const [month, count] of Object.entries(monthCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostCommonMonth = parseInt(month, 10);
        }
    }

    return {
        totalEvents: events.length,
        byType,
        bySeverity,
        averageMaxWaterLevel: totalWaterLevel / events.length,
        totalDeaths,
        mostCommonMonth
    };
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: Severity): string {
    switch (severity) {
        case 'catastrophic': return '#dc2626'; // red-600
        case 'severe': return '#ea580c'; // orange-600
        case 'moderate': return '#ca8a04'; // yellow-600
        case 'minor': return '#16a34a'; // green-600
    }
}

/**
 * Get event type in Thai
 */
export function getEventTypeThai(eventType: EventType): string {
    switch (eventType) {
        case 'flood': return 'น้ำท่วม';
        case 'storm_surge': return 'คลื่นพายุซัดฝั่ง';
        case 'high_tide': return 'น้ำหนุนสูง';
        case 'erosion': return 'กัดเซาะชายฝั่ง';
    }
}

/**
 * Get severity in Thai
 */
export function getSeverityThai(severity: Severity): string {
    switch (severity) {
        case 'catastrophic': return 'หายนะ';
        case 'severe': return 'รุนแรง';
        case 'moderate': return 'ปานกลาง';
        case 'minor': return 'เล็กน้อย';
    }
}

/**
 * Get risk level color for map
 */
export function getRiskLevelMapColor(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
        case 'high': return 'rgba(239, 68, 68, 0.3)'; // red with opacity
        case 'medium': return 'rgba(245, 158, 11, 0.3)'; // amber with opacity
        case 'low': return 'rgba(34, 197, 94, 0.3)'; // green with opacity
    }
}
