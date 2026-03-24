jest.mock("../lib/hydro-service", () => ({
  fetchHydroTideData: jest.fn(),
}));

import benchmarkLocations from "../data/forecast-benchmark-thai-coastal.json";
import { fetchHydroTideData } from "../lib/hydro-service";
import { getTideData } from "../lib/tide-service";

type BenchmarkLocation = (typeof benchmarkLocations)[number];

const mockedFetchHydroTideData = fetchHydroTideData as jest.MockedFunction<
  typeof fetchHydroTideData
>;

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

describe("forecast degraded regression", () => {
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

    mockedFetchHydroTideData.mockResolvedValue(null);
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it.each(benchmarkLocations.slice(0, 2) as BenchmarkLocation[])(
    "falls back to a degraded canonical harmonic response for %s without synthetic/random leakage",
    async (location) => {
      const randomSpy = jest.spyOn(Math, "random");
      const tideData = await getTideData(
        {
          lat: location.lat,
          lon: location.lon,
          name: location.name,
        },
        new Date("2025-03-24T06:00:00Z"),
        {
          hour: 6,
          minute: 0,
        },
      );

      expect(mockedFetchHydroTideData).toHaveBeenCalled();
      expect(randomSpy).not.toHaveBeenCalled();
      expect(tideData).toMatchObject({
        apiStatus: "offline",
        sourceTier: "harmonic",
        sourceLabel: "โมเดล harmonic ภายใน",
        confidenceMethod: "none",
        qualityScore: 68,
        degraded: true,
        modelVersion: "canonical-harmonic-v1",
      });
      expect(tideData.degradedReason).toContain("โมเดลภายใน");
      expect(tideData.dataSource).toBe("Canonical Harmonic Model");
      expect(tideData.isFromCache).toBeUndefined();
      expect(tideData.stationId).toBeUndefined();
      expect(tideData.stationDistanceKm).toBeUndefined();
      expect(tideData.graphData.length).toBeGreaterThan(0);
      expect(tideData.timeRangePredictions.length).toBeGreaterThan(0);
      expect(tideData.timeRangePredictions.every((prediction) => prediction.confidence === 68)).toBe(
        true,
      );
    },
  );
});
