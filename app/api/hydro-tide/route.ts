import { NextResponse } from 'next/server';
import hydroStations from '@/data/hydro-stations.json';
import { getStationHarmonicDayPrediction } from '@/lib/harmonic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date') || new Date().toISOString();
        const lat = parseFloat(searchParams.get('lat') || '13.7563');
        const lon = parseFloat(searchParams.get('lon') || '100.5018');

        const date = new Date(dateStr);

        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Number.isNaN(date.getTime())) {
            return NextResponse.json({
                success: false,
                error: 'Invalid lat, lon, or date'
            }, { status: 400 });
        }

        const prediction = getStationHarmonicDayPrediction({ lat, lon }, date);
        if (!prediction) {
            return NextResponse.json({
                success: false,
                error: 'No configured station harmonic model is available for this location'
            }, { status: 422 });
        }

        return NextResponse.json({
            success: true,
            stationId: prediction.stationId,
            stationName: prediction.stationName,
            stationNameEn: prediction.stationName,
            stationLat: prediction.stationLat,
            stationLon: prediction.stationLon,
            distanceKm: prediction.distanceKm,
            source: "Station Harmonic Model",
            sourceTier: "station_harmonic",
            confidenceMethod: "model",
            qualityScore: prediction.qualityScore,
            degraded: false,
            lastCheck: new Date().toISOString(),
            date: date.toISOString().split('T')[0],
            events: prediction.events,
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
