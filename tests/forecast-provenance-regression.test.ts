import type { NextRequest } from "next/server";

import benchmarkLocations from "../data/forecast-benchmark-thai-coastal.json";
import { POST as predictTidePOST } from "../app/api/predict-tide/route";
import { generatePredictionTimeSeries } from "../lib/harmonic-prediction";
import { getTideData } from "../lib/tide-service";

type BenchmarkLocation = (typeof benchmarkLocations)[number];

const TEST_DATE = new Date("2025-03-24T06:00:00Z");
const CANONICAL_START = new Date("2025-03-24T00:00:00Z");
const CANONICAL_END = new Date("2025-03-25T00:00:00Z");

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function roundLevel(value: number): number {
  return Number(value.toFixed(3));
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
      expect(location.expectedSourceTier).toBe("station_projected");
      expect(location.modelFamily).toBe("harmonic");
      expect(location.notes).toEqual(expect.any(String));

      zones.add(location.zone);
      stationIds.add(location.expectedStationId);
    }

    expect(zones.size).toBe(4);
    expect(stationIds.size).toBe(4);
  });

  it.each(benchmarkLocations as BenchmarkLocation[])(
    "returns canonical harmonic route output for %s",
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
          constituents: number;
          datum: string;
          version: string;
          sourceTier: string;
          confidenceMethod: string;
          qualityScore: number;
        };
      };

      const canonicalSeries = generatePredictionTimeSeries(
        CANONICAL_START,
        CANONICAL_END,
        {
          lat: location.lat,
          lon: location.lon,
          name: location.name,
        },
        60,
      );

      expect(body.location.lat).toBe(location.lat);
      expect(body.location.lon).toBe(location.lon);
      expect(body.location.region).toMatch(
        /^(Upper Gulf of Thailand \(อ่าวไทยตอนบน\)|Gulf of Thailand \(อ่าวไทย\)|Andaman Sea \(ทะเลอันดามัน\)|Unknown region)$/,
      );
      expect(body.prediction).toMatchObject({
        start: CANONICAL_START.toISOString(),
        end: CANONICAL_END.toISOString(),
        interval: 60,
        count: canonicalSeries.length,
      });
      expect(body.metadata).toMatchObject({
        engine: "Canonical Harmonic Forecast",
        version: "canonical-harmonic-v1",
        sourceTier: "harmonic",
        confidenceMethod: "none",
        qualityScore: 68,
      });

      expect(body.data).toEqual(annotatePredictionTypes(canonicalSeries));
      expect(body.highTides.length).toBeGreaterThan(0);
      expect(body.lowTides.length).toBeGreaterThan(0);
      expect(randomSpy).not.toHaveBeenCalled();
    },
  );

  it.each(benchmarkLocations as BenchmarkLocation[])(
    "returns real station-projected provenance and time-range windows for %s",
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

      const canonicalSeries = generatePredictionTimeSeries(
        new Date("2025-03-24T00:00:00Z"),
        new Date("2025-03-24T23:00:00Z"),
        {
          lat: location.lat,
          lon: location.lon,
          name: location.name,
        },
        60,
      );

      expect(tideData).toMatchObject({
        tideStatus: expect.stringMatching(/^(น้ำเป็น|น้ำตาย)$/),
        apiStatus: "success",
        sourceTier: "station_projected",
        confidenceMethod: "empirical",
        degraded: false,
        modelVersion: "canonical-harmonic-v1",
        stationId: location.expectedStationId,
        sourceLabel: expect.stringContaining(location.expectedStationName),
      });
      expect(tideData.stationDistanceKm).toEqual(expect.any(Number));
      expect(tideData.qualityScore).toBe(78);
      expect(tideData.degradedReason).toBeFalsy();
      expect(tideData.isFromCache).toBeUndefined();
      expect(tideData.dataSource).toContain("สถานีใกล้เคียง");
      expect(tideData.graphData).toHaveLength(canonicalSeries.length);
      expect(tideData.graphData.map((point) => point.time)).toEqual(
        canonicalSeries.map((point) => formatTime(point.time)),
      );

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
