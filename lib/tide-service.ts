import {
  getLocationConstituents,
} from "./harmonic-prediction";
import {
  CONSTITUENTS_DATABASE,
  createPredictionSeries,
  type TideConstituent,
} from "./harmonic-tide-core";
import {
  getStationHarmonicDayPrediction,
  getStationHarmonicUnavailable,
} from "./station-harmonic-model";
import {
  formatThailandClock,
  getThailandClockParts,
  getThailandDayBounds,
  roundToDigits,
  toThailandDayStart,
} from "./thailand-time";
import {
  deriveExtremesFromSeries,
  eventDeltaMinutes,
  getMostRecentStationMeasuredAccuracy,
  type ComparisonEvent,
  type StationMeasuredAccuracy,
} from "./tide-comparison";
import { calculateLunarPhase } from "@/lib/domain/lunar-phase";

export type LocationData = {
  lat: number;
  lon: number;
  name: string;
};

export type ApiStatus = "loading" | "success" | "error" | "offline" | "timeout";
export type SourceTier =
  | "observed"
  | "provider"
  | "station_harmonic"
  | "station_projected"
  | "harmonic"
  | "synthetic";
export type ConfidenceMethod = "empirical" | "provider" | "model" | "none";

export type TideEvent = {
  time: string; // HH:MM format
  level: number; // in meters
  type: "high" | "low";
  timeRange?: string; // e.g., "13-19" for time range predictions
  prediction?: boolean; // true if predicted data, false if actual data
};

export type TimeRangePrediction = {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  range: string; // e.g., "13-19"
  description: string; // e.g., "น้ำขึ้นสูง", "น้ำลงต่ำ"
  confidence: number; // 0-100 confidence percentage
};

export type WaterLevelGraphData = {
  time: string;
  level: number;
  prediction: boolean; // true if predicted data
};

export type TideData = {
  isWaxingMoon: boolean; // ข้างขึ้น (true) / ข้างแรม (false)
  lunarPhaseKham: number; // 1-15 ค่ำ
  tideStatus: "น้ำเป็น" | "น้ำตาย"; // น้ำเป็น (spring tide) / น้ำตาย (neap tide)
  highTideTime: string; // HH:MM format
  lowTideTime: string; // HH:MM format
  isSeaLevelHighToday: boolean; // Indicates if sea level is unusually high today
  currentWaterLevel: number; // Current water level in meters
  waterLevelStatus: string; // e.g., "น้ำขึ้น", "น้ำลง", "น้ำนิ่ง"
  waterLevelReference: string; // Reference for water level data
  seaLevelRiseReference: string; // Reference for sea level rise data
  pierDistance: number; // Distance from pier in meters
  pierReference: string; // Reference for pier distance data
  nearestPierName?: string; // Name of nearest pier
  nearestPierDistance?: number; // Distance to nearest pier in kilometers
  nearestPierRegion?: string; // Region of nearest pier
  tideEvents: TideEvent[]; // Array of significant tide events for the day
  timeRangePredictions: TimeRangePrediction[]; // Time range predictions
  graphData: WaterLevelGraphData[]; // Data for graphic display
  apiStatus: ApiStatus; // Current API status
  apiStatusMessage: string; // Status message
  lastUpdated: string; // Last update timestamp
  isFromCache?: boolean; // Indicates if data is from cache
  dataSource?: string; // Source of the data (e.g., "WorldTides", "Hydrographic Dept", "Harmonic Model")
  sourceTier?: SourceTier;
  sourceLabel?: string;
  qualityScore?: number | null;
  confidenceMethod?: ConfidenceMethod;
  degraded?: boolean;
  degradedReason?: string;
  modelVersion?: string;
  stationId?: string;
  stationDistanceKm?: number;
  // Real measured accuracy of the internal harmonic baseline against the
  // most recent validation fixture for the nearest station, when one
  // exists (see getMostRecentStationMeasuredAccuracy in tide-comparison.ts).
  // Used as a proxy for provider confidence too -- this repo has no
  // per-provider ground truth.
  measuredAccuracy?: StationMeasuredAccuracy | null;
};

export type WeatherData = {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  name: string;
};

export { calculateLunarPhase };

type TideEventType = TideEvent["type"];

type WorldTidesExtreme = {
  dt: number;
  height: number;
  type: string;
};

type WorldTidesResponse = {
  extremes: WorldTidesExtreme[];
};

type StormglassExtreme = {
  height: number;
  time: string;
  type?: string;
};

type StormglassResponse = {
  data: StormglassExtreme[];
};

function isWorldTidesResponse(value: unknown): value is WorldTidesResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const extremes = (value as { extremes?: unknown }).extremes;
  return Array.isArray(extremes);
}

function isStormglassResponse(value: unknown): value is StormglassResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = (value as { data?: unknown }).data;
  return Array.isArray(data);
}

function toTideEventFromWorldTides(
  extreme: WorldTidesExtreme,
): TideEvent | null {
  if (
    !Number.isFinite(extreme?.dt) ||
    !Number.isFinite(extreme?.height) ||
    typeof extreme?.type !== "string"
  ) {
    return null;
  }
  const eventDate = new Date(extreme.dt * 1000);
  if (Number.isNaN(eventDate.getTime())) {
    return null;
  }
  // Convert UTC to Thailand time (UTC+7)
  const time = formatThailandClock(eventDate);
  return {
    time,
    level: roundToDigits(extreme.height, 2),
    type: normaliseTideType(extreme.type),
  };
}

function toTideEventFromStormglass(
  extreme: StormglassExtreme,
): TideEvent | null {
  if (!Number.isFinite(extreme?.height) || typeof extreme?.time !== "string") {
    return null;
  }
  const eventDate = new Date(extreme.time);
  if (Number.isNaN(eventDate.getTime())) {
    return null;
  }
  const time = formatThailandClock(eventDate);
  const type =
    typeof extreme.type === "string"
      ? normaliseTideType(extreme.type)
      : inferTypeFromNeighbors();
  return {
    time,
    level: roundToDigits(extreme.height, 2),
    type,
  };
}

function normaliseTideType(value: string): TideEventType {
  return value.toLowerCase() === "high" ? "high" : "low";
}

function inferTypeFromNeighbors(): TideEventType {
  // When the upstream API omits the type we default to 'high'.
  return "high";
}

function sortTideEvents(events: TideEvent[]): TideEvent[] {
  return [...events].sort((a, b) => {
    const [ha, ma] = a.time.split(":").map(Number);
    const [hb, mb] = b.time.split(":").map(Number);
    if (ha !== hb) {
      return ha - hb;
    }
    return ma - mb;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

type OpenWeatherApiResponse = {
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
    pressure?: number;
  };
  weather?: Array<{
    description?: string;
    icon?: string;
  }>;
  wind?: {
    speed?: number;
    deg?: number;
  };
  name?: string;
};

function isOpenWeatherApiResponse(
  value: unknown,
): value is OpenWeatherApiResponse {
  if (!isRecord(value)) {
    return false;
  }

  const { main, weather, wind } = value as {
    main?: unknown;
    weather?: unknown;
    wind?: unknown;
  };

  if (main !== undefined && !isRecord(main)) {
    return false;
  }

  if (weather !== undefined && !Array.isArray(weather)) {
    return false;
  }

  if (wind !== undefined && !isRecord(wind)) {
    return false;
  }

  return true;
}

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

function toClockString(value: Date): string {
  return formatThailandClock(value);
}

// Mean sea level baseline for the generic regional fallback tier (no
// per-station offset is available here). Matches the constant
// lib/harmonic-prediction.ts's old engine used -- lib/harmonic-tide-core.ts's
// predictTideLevel has no baseline of its own, it only sums constituent
// contributions around zero.
const CANONICAL_MSL_METERS = 1.2;

// Extrema are detected from a finer-grained series than the hourly display
// graph so a real high/low isn't missed between two hourly samples (mirrors
// the 30-min interval lib/tide-comparison.ts uses for the same purpose).
const CANONICAL_EXTREMA_INTERVAL_MINUTES = 30;

function toHarmonicCoreConstituents(
  constituents: Array<{ name: string; amplitude: number; phase: number }>,
): TideConstituent[] {
  return constituents
    .map((constituent) => {
      const definition = CONSTITUENTS_DATABASE[constituent.name.toUpperCase()];
      if (!definition) {
        return null;
      }
      return {
        name: constituent.name.toUpperCase(),
        speed: definition.speed,
        amplitude: constituent.amplitude,
        phase: constituent.phase,
        description: definition.description,
      };
    })
    .filter((item): item is TideConstituent => item !== null);
}

function deriveCanonicalSeries(
  location: LocationData,
  date: Date,
  intervalMinutes: number,
): Array<{ time: Date; level: number }> {
  const { start } = getThailandDayBounds(date);
  const end = new Date(start.getTime() + (23 * 60 + 59) * 60 * 1000);
  const constituents = toHarmonicCoreConstituents(getLocationConstituents(location));

  return createPredictionSeries(start, end, constituents, intervalMinutes, location.lon).map(
    (point) => ({ time: point.time, level: point.level + CANONICAL_MSL_METERS }),
  );
}

function deriveCanonicalGraphData(
  location: LocationData,
  date: Date,
  intervalMinutes = 60,
): WaterLevelGraphData[] {
  return deriveCanonicalSeries(location, date, intervalMinutes).map((point) => ({
    time: toClockString(point.time),
    level: roundToDigits(point.level, 2),
    prediction: point.time.getTime() > Date.now(),
  }));
}

function toTideEventFromComparisonEvent(event: ComparisonEvent): TideEvent {
  return {
    time: event.clockTime,
    level: event.level ?? 0,
    type: event.type,
    prediction: new Date(event.timestamp).getTime() > Date.now(),
  };
}

function deriveCanonicalHarmonicEvents(location: LocationData, date: Date): TideEvent[] {
  const series = deriveCanonicalSeries(location, date, CANONICAL_EXTREMA_INTERVAL_MINUTES);
  return sortTideEvents(deriveExtremesFromSeries(series).map(toTideEventFromComparisonEvent));
}

// A provider extreme is only usable if it roughly agrees with the
// always-computed canonical harmonic baseline. Reuses the same
// eventDeltaMinutes matching logic lib/tide-comparison.ts uses offline
// (comparing by clockTime since a TideEvent carries no ISO timestamp) so a
// provider timing bug or wrong-cycle event can't silently pass through as a
// forecast.
// ponytail: single fixed bound borrowed from the offline default match
// window, not a per-station quarter-period bound -- tighten if a provider
// starts leaking near-miss wrong-cycle events past this.
const PROVIDER_SANITY_BOUND_MINUTES = 180;

function toComparisonEventForSanityCheck(event: TideEvent): ComparisonEvent {
  return {
    type: event.type,
    timestamp: "",
    clockTime: event.time,
    level: event.level,
    confidence: null,
  };
}

function isPlausibleAgainstBaseline(event: TideEvent, baselineEvents: TideEvent[]): boolean {
  return baselineEvents.some((baselineEvent) => {
    if (baselineEvent.type !== event.type) {
      return false;
    }
    const delta = Math.abs(
      eventDeltaMinutes(
        toComparisonEventForSanityCheck(baselineEvent),
        toComparisonEventForSanityCheck(event),
      ),
    );
    return delta <= PROVIDER_SANITY_BOUND_MINUTES;
  });
}

function filterPlausibleProviderEvents(events: TideEvent[], baselineEvents: TideEvent[]): TideEvent[] {
  if (baselineEvents.length === 0) {
    return events;
  }
  return events.filter((event) => isPlausibleAgainstBaseline(event, baselineEvents));
}

// IHO S-44-style banding: order-1 tidal-prediction tolerance is roughly
// +/-15-25 min timing, so measured error inside that band keeps the
// provider's usual confidence ceiling, and each rougher band steps it down.
// Falls back to the ceiling itself when no measured comparison exists for
// the nearest station -- this repo only has measured accuracy for the
// internal harmonic baseline (see getMostRecentStationMeasuredAccuracy), not
// per-provider ground truth, so a missing measurement must not be treated as
// a bad one.
// ponytail: coarse 4-band step function, not a continuous IHO curve --
// refine only if the confidence score needs finer resolution than these steps.
function bandQualityScoreFromMeasuredAccuracy(accuracy: StationMeasuredAccuracy, ceiling: number): number {
  const timingErrorMinutes = Math.max(accuracy.rmseTimingMinutes, accuracy.meanAbsoluteTimingErrorMinutes);
  if (timingErrorMinutes <= 15) {
    return ceiling;
  }
  if (timingErrorMinutes <= 30) {
    return Math.min(ceiling, 75);
  }
  if (timingErrorMinutes <= 60) {
    return Math.min(ceiling, 55);
  }
  return Math.min(ceiling, 35);
}

async function getProviderQualityInfo(
  location: LocationData,
  ceiling: number,
): Promise<{ qualityScore: number; measuredAccuracy: StationMeasuredAccuracy | null }> {
  const accuracy = await getMostRecentStationMeasuredAccuracy(location);
  return {
    qualityScore: accuracy ? bandQualityScoreFromMeasuredAccuracy(accuracy, ceiling) : ceiling,
    measuredAccuracy: accuracy,
  };
}

async function fetchRealTideData(
  location: LocationData,
  date: Date,
): Promise<TideInputResult> {
  const stationHarmonic = getStationHarmonicDayPrediction(location, date);
  if (stationHarmonic && stationHarmonic.events.length > 0) {
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
        // qualityScore is already gated on real-fit provenance (sourceKind
        // "field_fit" + a non-placeholder citation) inside
        // getStationHarmonicPrediction -- a station without a real fit can
        // never report a higher score here than the "Canonical Harmonic
        // Model" fallback tier below.
        qualityScore: stationHarmonic.qualityScore,
        degraded: false,
        isObserved: false,
        modelVersion: STATION_HARMONIC_MODEL_VERSION,
        stationId: stationHarmonic.stationId,
        distanceKm: stationHarmonic.distanceKm,
        datum: stationHarmonic.datum,
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
            deriveCanonicalHarmonicEvents(location, date),
          );
          if (plausibleEvents.length > 0) {
            const { qualityScore, measuredAccuracy } = await getProviderQualityInfo(location, 84);
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
            deriveCanonicalHarmonicEvents(location, date),
          );
          if (plausibleEvents.length > 0) {
            const { qualityScore, measuredAccuracy } = await getProviderQualityInfo(location, 80);
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
      degradedReason: stationUnavailable?.reason === "station_too_far"
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

/**
 * Get surrounding tide events for a given time
 */
function getSurroundingTideEvents(
  tideEvents: TideEvent[],
  currentTime: { hour: number; minute: number },
): { prev: TideEvent | null; next: TideEvent | null } {
  let prevEvent: TideEvent | null = null;
  let nextEvent: TideEvent | null = null;

  const currentMinutes = currentTime.hour * 60 + currentTime.minute;

  for (let i = 0; i < tideEvents.length; i++) {
    const event = tideEvents[i];
    const [eventHour, eventMinute] = event.time.split(":").map(Number);
    const eventMinutes = eventHour * 60 + eventMinute;

    if (eventMinutes <= currentMinutes) {
      prevEvent = event;
    } else if (!nextEvent) {
      nextEvent = event;
      break;
    }
  }

  return { prev: prevEvent, next: nextEvent };
}

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
    const graphData = tideInput.graphData ?? deriveCanonicalGraphData(location, date);
    const tideEvents =
      tideInput.events.length > 0
        ? tideInput.events
        : deriveCanonicalHarmonicEvents(location, date);

    const currentTime =
      time ||
      (() => {
        return getThailandClockParts(new Date());
      })();

    const interpolated = calculateCurrentWaterLevel(graphData, currentTime);
    const currentWaterLevel = interpolated.level;
    const waterLevelStatus = interpolated.status;

    // Determine high and low tide times
    const highTideTime =
      tideEvents.find((e) => e.type === "high")?.time || "N/A";
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

// This function simulates fetching weather data from OpenWeatherMap.
// In a real application, this would call the OpenWeatherMap API.
export async function getWeatherData(
  location: LocationData,
): Promise<WeatherData> {
  // Try to get real weather data from OpenWeatherMap API
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (apiKey) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric&lang=th`;
      const requestOptions: RequestInit & { next: { revalidate: number } } = {
        cache: "default",
        next: { revalidate: 3600 },
      };

      const response = await fetch(url, requestOptions);

      if (response.ok) {
        const payload: unknown = await response.json();
        if (isOpenWeatherApiResponse(payload)) {
          const main = payload.main ?? {};
          const weatherArray = Array.isArray(payload.weather)
            ? payload.weather
            : [];
          const wind = payload.wind ?? {};
          const primaryWeather =
            weatherArray.find(
              (entry): entry is { description?: string; icon?: string } =>
                typeof entry === "object" && entry !== null,
            ) ?? {};

          return {
            main: {
              temp:
                typeof main.temp === "number"
                  ? Number.parseFloat(main.temp.toFixed(1))
                  : 0,
              feels_like:
                typeof main.feels_like === "number"
                  ? Number.parseFloat(main.feels_like.toFixed(1))
                  : 0,
              humidity:
                typeof main.humidity === "number"
                  ? Math.round(main.humidity)
                  : 0,
              pressure:
                typeof main.pressure === "number"
                  ? Math.round(main.pressure)
                  : 0,
            },
            weather: [
              {
                description:
                  typeof primaryWeather.description === "string"
                    ? primaryWeather.description
                    : "ไม่ทราบ",
                icon:
                  typeof primaryWeather.icon === "string"
                    ? primaryWeather.icon
                    : "01d",
              },
            ],
            wind: {
              speed:
                typeof wind.speed === "number"
                  ? Number.parseFloat(wind.speed.toFixed(1))
                  : 0,
              deg: typeof wind.deg === "number" ? wind.deg : 0,
            },
            name:
              typeof payload.name === "string" && payload.name.trim()
                ? payload.name
                : location.name,
          };
        }
      }
    } catch (error) {
      console.error("OpenWeatherMap API error:", error);
    }
  }

  // No fallback - throw error if API fails or key is missing
  const errorMessage = apiKey
    ? "OpenWeatherMap API failed - unable to fetch real weather data"
    : "OPENWEATHER_API_KEY is not configured - please add it to .env";
  console.error(errorMessage);
  throw new Error(errorMessage);
}
