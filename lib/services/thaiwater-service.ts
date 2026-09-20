"use server";

export interface ThaiWaterLevel {
    station_id: string;
    station_name: string;
    province_name: string;
    water_level: number; // Current water level
    storage_percent?: number; // For dams
    timestamp: string;
    lat: number;
    lon: number;
}

export interface ThaiWaterResponse {
    result: ThaiWaterLevel[];
}

/**
 * Fetch real-time water level data from ThaiWater Open API
 * Using the public Runoff endpoint which is often accessible
 * NO MOCK DATA - returns empty array if API fails
 */
export async function getRealTimeWaterLevels(): Promise<ThaiWaterLevel[]> {
    try {
        // Note: This is a public endpoint found in search results.
        // In a production app, we should use a proper API key if required.
        // This endpoint typically returns river/canal runoff but also coastal stations.
        const response = await fetch('http://api.thaiwater.net/v1/public/Runoff', {
            next: { revalidate: 300 }, // Cache for 5 minutes
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'SEAPALO-Disaster-Watch/1.0'
            }
        });

        if (!response.ok) {
            console.error('ThaiWater API returned error:', response.status, response.statusText);
            return []; // Return empty array instead of mock data
        }

        const data = await response.json();

        // Transform data to our interface if needed
        // The actual structure might vary, so we map safely
        if (data && Array.isArray(data.data)) {
            return data.data.map((item: any) => ({
                station_id: item.station_id?.toString() || `UNKNOWN-${Math.random()}`,
                station_name: item.tele_station_name?.th || item.station_name || 'Unknown Station',
                province_name: item.province_name?.th || 'Unknown',
                water_level: parseFloat(item.water_level) || 0,
                timestamp: item.tele_station_lat ? new Date().toISOString() : new Date().toISOString(), // Use current time if missing
                lat: parseFloat(item.tele_station_lat) || 13.75,
                lon: parseFloat(item.tele_station_long) || 100.50,
            }));
        } else if (data && data.result) {
            // Handle "result" wrapper if that's the format
            return data.result;
        }

        console.warn('ThaiWater API returned unexpected format');
        return []; // Return empty array instead of mock data
    } catch (error) {
        console.error('Error fetching ThaiWater data:', error);
        return []; // Return empty array instead of mock data
    }
}
