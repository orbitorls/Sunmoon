// lib/disaster-data-service.ts

/**
 * Disaster data service – fetches real‑time disaster events.
 * This is a simple wrapper around an external API. Replace `API_URL`
 * with the actual endpoint you intend to use.
 */

export type DisasterEvent = {
    id: string;
    type: string; // e.g. "flood", "storm_surge", etc.
    severity: string; // e.g. "catastrophic", "severe", "moderate", "minor"
    location: { lat: number; lon: number; name: string };
    time: string; // ISO string
    description: string;
    sourceUrl?: string;
};

const API_URL = "https://example.com/api/live-disasters"; // TODO: replace with real endpoint

/** Fetch the latest disaster events (no pagination for simplicity). */
export async function fetchLatestDisasters(): Promise<DisasterEvent[]> {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) {
            console.warn(`Disaster API unavailable (${res.status}), using mock data.`);
            throw new Error(`Failed to fetch disasters: ${res.status}`);
        }
        const data = (await res.json()) as DisasterEvent[];
        return data;
    } catch (err) {
        console.warn("Using mock disaster data due to error:", err);
        // Return mock data for demonstration
        return [
            {
                id: "mock-1",
                type: "flood",
                severity: "moderate",
                location: { lat: 13.3611, lon: 100.9847, name: "เมืองชลบุรี" },
                time: new Date().toISOString(),
                description: "น้ำท่วมขังรอการระบาย บริเวณแยกเฉลิมไทย สูงประมาณ 15-20 ซม.",
                sourceUrl: "#"
            },
            {
                id: "mock-2",
                type: "storm_surge",
                severity: "minor",
                location: { lat: 12.9276, lon: 100.8771, name: "พัทยา" },
                time: new Date(Date.now() - 3600000 * 2).toISOString(),
                description: "คลื่นลมแรงบริเวณชายหาด ควรระมัดระวังการลงเล่นน้ำ",
                sourceUrl: "#"
            }
        ];
    }
}

/** Optional WebSocket subscription – placeholder implementation. */
export function subscribeToDisasters(
    callback: (events: DisasterEvent[]) => void
): () => void {
    // This is a stub. In a real implementation you would open a WebSocket
    // connection to the provider and call `callback` whenever new data arrives.
    // Here we simply return a no‑op unsubscribe function.
    return () => { };
}
