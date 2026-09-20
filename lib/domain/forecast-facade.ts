/**
 * Forecast facade — the narrow public surface the UI and LINE integration use
 * to consume tide, weather, and lunar data. Responsible for applying
 * calibration offsets and unit/datum conversion (via the modules it composes).
 *
 * Shared types live in lib/domain/types.ts. Provider/event/quality helpers
 * were extracted to lib/domain/tide-events.ts.
 */

import {
  getStationHarmonicDayPrediction,
  getStationHarmonicUnavailable,
} from "../harmonic/station-model";
import {
  getThailandClockParts,
  getThailandDayBounds,
  roundToDigits,
} from "./thailand-time";
import type { StationMeasuredAccuracy } from "../comparison";
import { calculateLunarPhase } from "./lunar-phase";
import { predictTideEvents } from "./tide-prediction";
import type {
  ApiStatus,
  ConfidenceMethod,
  LocationData,
  SourceTier,
  TideData,
  TideEvent,
  TimeRangePrediction,
  WaterLevelGraphData,
} from "./types";
import {
  deriveCanonicalGraphData,
  filterPlausibleProviderEvents,
  getProviderQualityInfo,
  isStormglassResponse,
  isWorldTidesResponse,
  sortTideEvents,
  toClockString,
  toTideEventFromStormglass,
  toTideEventFromWorldTides,
} from "./tide-events";

type TideSourceMetadata = {
  source: string;
  sourceTier: SourceTier;
  sourceLabel: string;
  confidenceMethod: ConfidenceMethod;
  qualityScore: number | null;
  degraded: boolean;
  degradedReason?: string;
  isObserved: boolean;
  modelVersion: string;
  stationId?: string;
  distanceKm?: number;
  datum?: string;
  measuredAccuracy?: StationMeasuredAccuracy | null;
};

type TideInputResult = {
  events: TideEvent[];
  graphData?: WaterLevelGraphData[];
  metadata: TideSourceMetadata;
};

/**
 * Determine tide status based on lunar phase
 */
function calculateTideStatus(lunarPhaseKham: number): "น้ำเป็น" | "น้ำตาย" {
  // Spring tides occur during new moon and full moon (1-3 and 13-15 ค่ำ for both phases)
  // Neap tides occur during first and third quarters (6-9 ค่ำ for both phases)

  if (lunarPhaseKham >= 13 && lunarPhaseKham <= 15) {
    return "น้ำเป็น"; // Spring tide (near full/new moon)
  } else if (lunarPhaseKham >= 1 && lunarPhaseKham <= 3) {
    return "น้ำเป็น"; // Spring tide (near new/full moon)
  } else if (lunarPhaseKham >= 6 && lunarPhaseKham <= 9) {
    return "น้ำตาย"; // Neap tide (quarter moons)
  } else {
    // Transitional periods
    return lunarPhaseKham < 6 ? "น้ำเป็น" : "น้ำตาย";
  }
}

/**
 * Fetch real tide data from WorldTides API or use harmonic prediction as fallback
 */
const FORECAST_MODEL_VERSION = "canonical-harmonic-v1";
const STATION_HARMONIC_MODEL_VERSION = "station-harmonic-v1";

function getWaterLevelReference(metadata: TideSourceMetadata): string {
  switch (metadata.sourceTier) {
    case "station_harmonic":
      return metadata.stationId
        ? `สถานี ${metadata.stationId} คำนวณด้วย harmonic constants รายสถานี`
        : "คำนวณด้วย harmonic constants รายสถานี";
    case "station_projected":
      return metadata.stationId
        ? `สถานีใกล้เคียง ${metadata.stationId} ร่วมกับโมเดลคาดการณ์ภายใน`
        : "สถานีใกล้เคียงร่วมกับโมเดลคาดการณ์ภายใน";
    case "provider":
      return `ข้อมูลผู้ให้บริการภายนอก: ${metadata.source}`;
    case "observed":
      return metadata.source;
    case "harmonic":
    default:
      return "โมเดล harmonic ภายในสำหรับชายฝั่งไทย";
  }
}

async function fetchRealTideData(
  location: LocationData,
  date: Date,
): Promise<TideInputResult> {
  const stationHarmonic = getStationHarmonicDayPrediction(location, date);
  if (stationHarmonic && stationHarmonic.events.length > 0) {
    const { qualityScore, measuredAccuracy } = await getProviderQualityInfo(
      location,
      stationHarmonic.qualityScore ?? 70,
    );
    return {
      events: sortTideEvents(stationHarmonic.events),
      graphData: stationHarmonic.series.map((point) => ({
        time: toClockString(point.time),
        level: roundToDigits(point.level, 2),
        prediction: point.time.getTime() > Date.now(),
      })),
      metadata: {
        source: "Station Harmonic Model",
        sourceTier: "station_harmonic",
        sourceLabel: `สถานี ${stationHarmonic.stationName}`,
        confidenceMethod: "model",
        // qualityScore is provenance-gated inside getStationHarmonicPrediction,
        // then further banded by measured timing MAE when validation fixtures exist.
        qualityScore,
        degraded: false,
        isObserved: false,
        modelVersion: STATION_HARMONIC_MODEL_VERSION,
        stationId: stationHarmonic.stationId,
        distanceKm: stationHarmonic.distanceKm,
        datum: stationHarmonic.datum,
        measuredAccuracy,
      },
    };
  }

  const stationUnavailable = getStationHarmonicUnavailable(location);

  let worldTidesApiKey: string | undefined;
  let stormglassApiKey: string | undefined;

  if (typeof process !== "undefined" && process.env) {
    worldTidesApiKey = process.env.WORLDTIDES_API_KEY;
    stormglassApiKey = process.env.STORMGLASS_API_KEY;
  }

  if (worldTidesApiKey) {
    try {
      const { start } = getThailandDayBounds(date);
      const startUnix = Math.floor(start.getTime() / 1000);
      const url = `https://www.worldtides.info/api/v3?extremes&lat=${location.lat}&lon=${location.lon}&start=${startUnix}&length=86400&key=${worldTidesApiKey}`;
      const response = await fetch(url, { cache: "force-cache" });

      if (response.ok) {
        const payload: unknown = await response.json();
        if (isWorldTidesResponse(payload) && payload.extremes.length > 0) {
          const events = payload.extremes
            .map(toTideEventFromWorldTides)
            .filter((event): event is TideEvent => event !== null);
          const plausibleEvents = filterPlausibleProviderEvents(
            events,
            await predictTideEvents(location, date),
          );
          if (plausibleEvents.length > 0) {
            const { qualityScore, measuredAccuracy } =
              await getProviderQualityInfo(location, 84);
            return {
              events: sortTideEvents(plausibleEvents),
              metadata: {
                source: "WorldTides API",
                sourceTier: "provider",
                sourceLabel: "WorldTides",
                confidenceMethod: "provider",
                qualityScore,
                degraded: false,
                isObserved: false,
                modelVersion: FORECAST_MODEL_VERSION,
                measuredAccuracy,
              },
            };
          }
        }
      }
    } catch (error) {
      console.error("WorldTides API error:", error);
    }
  }

  if (!worldTidesApiKey && stormglassApiKey) {
    try {
      const { start, end } = getThailandDayBounds(date);
      const endInclusive = new Date(end.getTime() - 1);
      const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${location.lat}&lng=${location.lon}&start=${start.toISOString()}&end=${endInclusive.toISOString()}`;
      const response = await fetch(url, {
        headers: { Authorization: stormglassApiKey },
        cache: "force-cache",
      });

      if (response.ok) {
        const payload: unknown = await response.json();
        if (isStormglassResponse(payload) && payload.data.length > 0) {
          const events = payload.data
            .map(toTideEventFromStormglass)
            .filter((event): event is TideEvent => event !== null);
          const plausibleEvents = filterPlausibleProviderEvents(
            events,
            await predictTideEvents(location, date),
          );
          if (plausibleEvents.length > 0) {
            const { qualityScore, measuredAccuracy } =
              await getProviderQualityInfo(location, 80);
            return {
              events: sortTideEvents(plausibleEvents),
              metadata: {
                source: "Stormglass API",
                sourceTier: "provider",
                sourceLabel: "Stormglass",
                confidenceMethod: "provider",
                qualityScore,
                degraded: false,
                isObserved: false,
                modelVersion: FORECAST_MODEL_VERSION,
                measuredAccuracy,
              },
            };
          }
        }
      }
    } catch (error) {
      console.error("Stormglass API error:", error);
    }
  }

  const fallbackQuality = await getProviderQualityInfo(location, 68);
  return {
    events: [],
    metadata: {
      source: "Canonical Harmonic Model",
      sourceTier: "harmonic",
      sourceLabel: "โมเดล harmonic ภายใน",
      confidenceMethod: "none",
      qualityScore: fallbackQuality.qualityScore,
      degraded: true,
      degradedReason:
        stationUnavailable?.reason === "station_too_far"
          ? `สถานี harmonic ที่ตั้งค่าไว้ใกล้ที่สุดอยู่ไกล ${stationUnavailable.distanceKm} กม. จึงใช้โมเดลภูมิภาคภายใน`
          : "ไม่มี station harmonic constants หรือ provider ที่พร้อมใช้ จึงใช้โมเดลภูมิภาคภายใน",
      isObserved: false,
      modelVersion: FORECAST_MODEL_VERSION,
      stationId: stationUnavailable?.nearestStationId,
      distanceKm: stationUnavailable?.distanceKm,
      measuredAccuracy: fallbackQuality.measuredAccuracy,
    },
  };
}

// Deprecated helper functions removed to reduce bundle size and unused exports.

function calculateCurrentWaterLevel(
  graphData: WaterLevelGraphData[],
  currentTime: { hour: number; minute: number },
): { level: number; status: string } {
  if (graphData.length === 0) {
    return { level: 0, status: "ไม่ทราบ" };
  }

  const currentMinutes = currentTime.hour * 60 + currentTime.minute;
  const indexed = graphData.map((point) => {
    const [hours, minutes] = point.time.split(":").map(Number);
    return { ...point, totalMinutes: hours * 60 + minutes };
  });

  let before = indexed[0];
  let after = indexed[indexed.length - 1];

  for (let i = 0; i < indexed.length; i++) {
    if (indexed[i].totalMinutes <= currentMinutes) {
      before = indexed[i];
    }
    if (indexed[i].totalMinutes >= currentMinutes) {
      after = indexed[i];
      break;
    }
  }

  if (after.totalMinutes === before.totalMinutes) {
    return { level: before.level, status: "น้ำนิ่ง" };
  }

  const ratio =
    (currentMinutes - before.totalMinutes) /
    (after.totalMinutes - before.totalMinutes);
  const level = before.level + (after.level - before.level) * ratio;
  const delta = after.level - before.level;

  return {
    level: Number.parseFloat(level.toFixed(2)),
    status: delta > 0.03 ? "น้ำขึ้น" : delta < -0.03 ? "น้ำลง" : "น้ำนิ่ง",
  };
}

/**
 * Generate time range predictions for tide events
 */
function generateTimeRangePredictions(
  tideEvents: TideEvent[],
  qualityScore: number | null,
): TimeRangePrediction[] {
  const confidence = qualityScore ?? 70;

  return tideEvents.slice(0, 4).map((event) => {
    const [hours, minutes] = event.time.split(":").map(Number);
    const eventMinutes = hours * 60 + minutes;
    const startMinutes = Math.max(0, eventMinutes - 120);
    const endMinutes = Math.min(23 * 60 + 59, eventMinutes + 120);
    const startHours = Math.floor(startMinutes / 60);
    const endHours = Math.floor(endMinutes / 60);

    return {
      startTime: `${startHours.toString().padStart(2, "0")}:${(startMinutes % 60)
        .toString()
        .padStart(2, "0")}`,
      endTime: `${endHours.toString().padStart(2, "0")}:${(endMinutes % 60)
        .toString()
        .padStart(2, "0")}`,
      range: `${startHours.toString().padStart(2, "0")}-${endHours
        .toString()
        .padStart(2, "0")}`,
      description:
        event.type === "high" ? "ช่วงเข้าใกล้น้ำขึ้นสูงสุด" : "ช่วงเข้าใกล้น้ำลงต่ำสุด",
      confidence,
    };
  });
}

function getApiStatus(
  metadata: TideSourceMetadata,
): { status: ApiStatus; message: string } {
  if (metadata.degraded) {
    return {
      status: "offline",
      message: metadata.degradedReason || "ใช้ข้อมูลสำรองจากโมเดลภายใน",
    };
  }

  if (metadata.sourceTier === "station_harmonic") {
    return {
      status: "success",
      message: "ใช้ harmonic constants รายสถานี",
    };
  }

  if (metadata.sourceTier === "station_projected") {
    return {
      status: "success",
      message: "ใช้สถานีใกล้เคียงร่วมกับโมเดลภายใน",
    };
  }

  if (metadata.sourceTier === "provider") {
    return {
      status: "success",
      message: "ใช้ข้อมูลจากผู้ให้บริการภายนอก",
    };
  }

  return {
    status: "success",
    message: "ใช้การคำนวณจากโมเดล harmonic ภายใน",
  };
}

/**
 * Get comprehensive tide data using real calculations and API data
 */
export async function getTideData(
  location: LocationData,
  date: Date,
  time?: { hour: number; minute: number },
): Promise<TideData> {
  try {
    // Calculate accurate lunar data
    const { isWaxingMoon, lunarPhaseKham } = await calculateLunarPhase(date);
    const tideStatus = calculateTideStatus(lunarPhaseKham);

    const tideInput = await fetchRealTideData(location, date);
    const graphData =
      tideInput.graphData ?? deriveCanonicalGraphData(location, date);
    const tideEvents: TideEvent[] =
      tideInput.events.length > 0
        ? tideInput.events
        : await predictTideEvents(location, date);

    const currentTime =
      time ||
      (() => {
        return getThailandClockParts(new Date());
      })();

    const interpolated = calculateCurrentWaterLevel(graphData, currentTime);
    const currentWaterLevel = interpolated.level;
    const waterLevelStatus = interpolated.status;

    // Determine high and low tide times
    const highTideTime = tideEvents.find((e) => e.type === "high")?.time || "N/A";
    const lowTideTime = tideEvents.find((e) => e.type === "low")?.time || "N/A";

    // Check if today is a high sea level day (spring tide with high lunar influence)
    const isSeaLevelHighToday =
      tideStatus === "น้ำเป็น" && (lunarPhaseKham <= 2 || lunarPhaseKham >= 14);

    // Calculate pier distance (estimated based on location type)
    const isCoastalArea =
      location.lat < 15 &&
      ((location.lon > 99 && location.lon < 105) || // Gulf of Thailand
        (location.lon > 95 && location.lon < 99)); // Andaman Sea
    const pierDistance = isCoastalArea ? 50 : 150; // Fixed values instead of random

    // Generate additional data
    const timeRangePredictions = generateTimeRangePredictions(
      tideEvents,
      tideInput.metadata.qualityScore,
    );
    const { status: apiStatus, message: apiStatusMessage } = getApiStatus(
      tideInput.metadata,
    );
    const lastUpdated = new Date().toISOString();

    return {
      isWaxingMoon,
      lunarPhaseKham,
      tideStatus,
      highTideTime,
      lowTideTime,
      isSeaLevelHighToday,
      currentWaterLevel,
      waterLevelStatus,
      waterLevelReference: getWaterLevelReference(tideInput.metadata),
      seaLevelRiseReference:
        "กรมทรัพยากรทางทะเลและชายฝั่ง กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม",
      pierDistance,
      pierReference: "ข้อมูลจากท่าเรือท้องถิ่นและการประมาณระยะทาง GPS",
      tideEvents,
      timeRangePredictions,
      graphData,
      apiStatus,
      apiStatusMessage,
      lastUpdated,
      dataSource: tideInput.metadata.source,
      sourceTier: tideInput.metadata.sourceTier,
      sourceLabel: tideInput.metadata.sourceLabel,
      qualityScore: tideInput.metadata.qualityScore,
      confidenceMethod: tideInput.metadata.confidenceMethod,
      degraded: tideInput.metadata.degraded,
      degradedReason: tideInput.metadata.degradedReason,
      modelVersion: tideInput.metadata.modelVersion,
      stationId: tideInput.metadata.stationId,
      stationDistanceKm: tideInput.metadata.distanceKm,
      measuredAccuracy: tideInput.metadata.measuredAccuracy ?? null,
    };
  } catch (error) {
    console.error("Error in getTideData:", error);
    throw new Error("ไม่สามารถดึงข้อมูลน้ำขึ้นน้ำลงได้");
  }
}
