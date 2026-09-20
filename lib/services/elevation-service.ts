/**
 * Elevation Service
 * Fetches ground elevation data from Open-Meteo API
 */

export interface ElevationData {
    elevation: number; // meters above sea level
    latitude: number;
    longitude: number;
}

const ELEVATION_API_URL = "https://api.open-meteo.com/v1/elevation";

/**
 * Fetch elevation for a specific location
 */
export async function getElevation(lat: number, lon: number): Promise<ElevationData | null> {
    try {
        const response = await fetch(
            `${ELEVATION_API_URL}?latitude=${lat}&longitude=${lon}`
        );

        if (!response.ok) {
            throw new Error(`Elevation API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Open-Meteo returns 'elevation' as an array matching the requested points
        if (data && data.elevation && data.elevation.length > 0) {
            return {
                elevation: data.elevation[0],
                latitude: lat,
                longitude: lon
            };
        }

        return null;
    } catch (error) {
        console.error("Failed to fetch elevation data:", error);
        return null;
    }
}
