import type { NextRequest } from "next/server";

import benchmarkLocations from "../data/forecast-benchmark-thai-coastal.json";
import { POST as predictTidePOST } from "../app/api/predict-tide/route";
import {
  getStationHarmonicDiagnostics,
  getStationHarmonicPrediction,
} from "../lib/harmonic";
import { getTideData } from "../lib/domain/forecast-facade";

type BenchmarkLocation = (typeof benchmarkLocations)[number];

const TEST_DATE = new Date("2025-03-24T06:00:00Z");
const CANONICAL_START = new Date("2025-03-24T00:00:00Z");
const CANONICAL_END = new Date("2025-03-25T00:00:00Z");

function roundLevel(value: number): number {
  return Number(value.toFixed(3));
}

function formatThailandClock(date: Date): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

function annotatePredictionTypes(
  series: Array<{ time: Date; level: number }>,
): Array<{ time: string; waterLevel: number; type?: "high" | "low" | "normal" }> {
  const predictions = series.map((point) => ({
    time: point.time.toISOString(),
    waterLevel: roundLevel(point.level),
  })) as Array<{ time: string; waterLevel: number; type?: "high" | "low" | "normal" }>;

  for (let i = 1; i < predictions.length - 1; i++) {
    const prev = predictions[i - 1].waterLevel;
    const curr = predictions[i].waterLevel;
    const next = predictions[i + 1].waterLevel;

    if (curr > prev && curr > next && (curr - prev > 0.05 || curr - next > 0.05)) {
      predictions[i].type = "high";
    } else if (curr < prev && curr < next && (prev - curr > 0.05 || next - curr > 0.05)) {
      predictions[i].type = "low";
    }
  }

  return predictions;
}

function minutesSinceMidnight(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function buildPredictionRequest(location: BenchmarkLocation): NextRequest {
  return new Request("http://localhost/api/predict-tide", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      lat: location.lat,
      lon: location.lon,
      startDate: CANONICAL_START.toISOString(),
      hours: 24,
      interval: 60,
    }),
  }) as unknown as NextRequest;
}

function cloneEnv(keys: string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("forecast provenance regression", () => {
  const envKeys = [
    "OPENWEATHER_API_KEY",
    "WORLDTIDES_API_KEY",
    "STORMGLASS_API_KEY",
  ];

  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    envSnapshot = cloneEnv(envKeys);
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
    jest.restoreAllMocks();
  });

  it("keeps the Thai coastal benchmark fixture explicit and auditable", () => {
    expect(benchmarkLocations).toHaveLength(4);

    const zones = new Set<string>();
    const stationIds = new Set<string>();

    for (const location of benchmarkLocations as BenchmarkLocation[]) {
      expect(location.id).toEqual(expect.any(String));
      expect(location.name).toEqual(expect.any(String));
      expect(location.lat).toEqual(expect.any(Number));
      expect(location.lon).toEqual(expect.any(Number));
      expect(location.region).toMatch(/^(gulf|andaman)$/);
      expect(location.zone).toEqual(expect.any(String));
      expect(location.expectedStationId).toEqual(expect.any(String));
      expect(location.expectedStationName).toEqual(expect.any(String));
      expect(location.expectedSourceTier).toBe("station_harmonic");
      expect(location.modelFamily).toBe("harmonic");
      expect(location.notes).toEqual(expect.any(String));

      zones.add(location.zone);
      stationIds.add(location.expectedStationId);
    }

    expect(zones.size).toBe(4);
    expect(stationIds.size).toBe(4);
  });

  it("reports station harmonic constant coverage without inventing missing station constants", () => {
    const diagnostics = getStationHarmonicDiagnostics();

    expect(diagnostics.totalStations).toBe(38);
    expect(diagnostics.configuredStations).toBe(19);
    expect(diagnostics.missingStationIds).toHaveLength(
      diagnostics.totalStations - diagnostics.configuredStations,
    );
    expect(diagnostics.missingStationIds).toContain("hydro-2");
    expect(diagnostics.invalidStationIds).toHaveLength(0);
  });

  it.each(benchmarkLocations as BenchmarkLocation[])(
    "returns station harmonic route output for %s",
    async (location) => {
      const randomSpy = jest.spyOn(Math, "random");
      const response = await predictTidePOST(buildPredictionRequest(location));

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        location: { lat: number; lon: number; region: string };
        prediction: { start: string; end: string; interval: number; count: number };
        data: Array<{ time: string; waterLevel: number; type?: "high" | "low" | "normal" }>;
        highTides: Array<{ time: string; level: number }>;
        lowTides: Array<{ time: string; level: number }>;
        metadata: {
          engine: string;
          stationId: string;
          constituents: number;
          datum: string;
          version: string;
          sourceTier: string;
          confidenceMethod: string;
          qualityScore: number;
        };
      };

      const stationPrediction = getStationHarmonicPrediction(
        { lat: location.lat, lon: location.lon },
        CANONICAL_START,
        CANONICAL_END,
        60,
      );
      expect(stationPrediction).not.toBeNull();

      expect(body.location.lat).toBe(location.lat);
      expect(body.location.lon).toBe(location.lon);
      expect(body.location.region).toMatch(
        /^(Upper Gulf of Thailand \(อ่าวไทยตอนบน\)|Gulf of Thailand \(อ่าวไทย\)|Andaman Sea \(ทะเลอันดามัน\)|Unknown region)$/,
      );
      expect(body.prediction).toMatchObject({
        start: CANONICAL_START.toISOString(),
        end: CANONICAL_END.toISOString(),
        interval: 60,
        count: stationPrediction!.series.length,
      });
      expect(body.metadata).toMatchObject({
        engine: "Station Harmonic Forecast",
        stationId: location.expectedStationId,
        version: "station-harmonic-v1",
        sourceTier: "station_harmonic",
        confidenceMethod: "model",
        qualityScore: stationPrediction!.qualityScore,
      });

      expect(body.data).toEqual(annotatePredictionTypes(stationPrediction!.series));
      expect(body.highTides.length).toBeGreaterThan(0);
      expect(body.lowTides.length).toBeGreaterThan(0);
      expect(randomSpy).not.toHaveBeenCalled();
    },
  );

  it.each(benchmarkLocations as BenchmarkLocation[])(
    "returns station harmonic provenance and time-range windows for %s",
    async (location) => {
      const randomSpy = jest.spyOn(Math, "random");
      const tideData = await getTideData(
        {
          lat: location.lat,
          lon: location.lon,
          name: location.name,
        },
        TEST_DATE,
        {
          hour: 6,
          minute: 0,
        },
      );

      const stationPrediction = getStationHarmonicPrediction(
        { lat: location.lat, lon: location.lon },
        new Date("2025-03-23T17:00:00Z"),
        new Date("2025-03-24T16:59:00Z"),
        60,
      );
      expect(stationPrediction).not.toBeNull();

      expect(tideData).toMatchObject({
        tideStatus: expect.stringMatching(/^(น้ำเป็น|น้ำตาย)$/),
        apiStatus: "success",
        sourceTier: "station_harmonic",
        confidenceMethod: "model",
        degraded: false,
        modelVersion: "station-harmonic-v1",
        stationId: location.expectedStationId,
        sourceLabel: expect.stringContaining(location.expectedStationName),
      });
      expect(tideData.stationDistanceKm).toEqual(expect.any(Number));
      expect(tideData.qualityScore).toBe(stationPrediction!.qualityScore);
      expect(tideData.degradedReason).toBeFalsy();
      expect(tideData.isFromCache).toBeUndefined();
      expect(tideData.dataSource).toBe("Station Harmonic Model");
      expect(tideData.graphData).toHaveLength(stationPrediction!.series.length);
      expect(tideData.graphData.map((point) => point.time)).toEqual(
        stationPrediction!.series.map((point) => formatThailandClock(point.time)),
      );
      const levels = tideData.graphData.map((point) => point.level);
      expect(tideData.tideEvents[0].level).toBeGreaterThanOrEqual(Math.min(...levels) - 0.1);
      expect(tideData.tideEvents[0].level).toBeLessThanOrEqual(Math.max(...levels) + 0.1);

      for (const prediction of tideData.timeRangePredictions) {
        const [startHour, startMinute] = prediction.startTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = prediction.endTime.split(":").map(Number);
        expect(Number.isFinite(startHour)).toBe(true);
        expect(Number.isFinite(startMinute)).toBe(true);
        expect(Number.isFinite(endHour)).toBe(true);
        expect(Number.isFinite(endMinute)).toBe(true);
        expect(prediction.confidence).toBe(tideData.qualityScore);
        expect(prediction.description).toMatch(/น้ำ(ขึ้น|ลง)/);
      }

      expect(tideData.timeRangePredictions.length).toBeGreaterThan(0);
      expect(tideData.timeRangePredictions.length).toBeLessThanOrEqual(4);
      expect(tideData.tideEvents.length).toBeGreaterThan(0);
      expect(randomSpy).not.toHaveBeenCalled();
    },
  );
});
