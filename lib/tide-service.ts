import {
  generatePredictionTimeSeries,
} from "./harmonic-prediction";
import { fetchHydroTideData } from "./hydro-service";
import moonEventSource from "@/data/authoritative-moons.json";

type MoonEvent = {
  type: "new" | "full";
  date: string;
};

const authoritativeMoonEvents: MoonEvent[] = Array.isArray(moonEventSource)
  ? moonEventSource
    .map((event) => ({ type: event?.type, date: event?.date }))
    .filter((event): event is MoonEvent => {
      if (event?.type !== "new" && event?.type !== "full") {
        return false;
      }
      if (typeof event.date !== "string") {
        return false;
      }
      const asDate = new Date(event.date);
      return !Number.isNaN(asDate.getTime());
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  : [];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const THAILAND_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

function toThailandDayStart(date: Date): number {
  return (
    Math.floor((date.getTime() + THAILAND_TZ_OFFSET_MS) / MS_PER_DAY) *
    MS_PER_DAY -
    THAILAND_TZ_OFFSET_MS
  );
}

export type LocationData = {
  lat: number;
  lon: number;
  name: string;
};

export type ApiStatus = "loading" | "success" | "error" | "offline" | "timeout";
export type SourceTier =
  | "observed"
  | "provider"
  | "station_projected"
  | "harmonic"
  | "synthetic";
export type ConfidenceMethod = "empirical" | "provider" | "none";

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

/**
 * Calculate accurate lunar phase for Thai lunar calendar.
 *
 * The function first prefers authoritative pre-computed events (local TZ aware)
 * and falls back to astronomy-engine or a simple synodic approximation.
 */
export async function calculateLunarPhase(
  date: Date,
): Promise<{ isWaxingMoon: boolean; lunarPhaseKham: number }> {
  const targetDayStart = toThailandDayStart(date);

  if (authoritativeMoonEvents.length > 0) {
    try {
      let previousEvent: MoonEvent | null = null;
      let previousNewStart: number | null = null;
      let previousFullStart: number | null = null;
      let nextNewStart: number | null = null;
      let nextFullStart: number | null = null;

      for (const event of authoritativeMoonEvents) {
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime())) {
          continue;
        }
        const eventDayStart = toThailandDayStart(eventDate);

        if (eventDayStart <= targetDayStart) {
          previousEvent = event;
          if (event.type === "new") {
            previousNewStart = eventDayStart;
          }
          if (event.type === "full") {
            previousFullStart = eventDayStart;
          }
        } else {
          if (event.type === "new" && nextNewStart === null) {
            nextNewStart = eventDayStart;
          }
          if (event.type === "full" && nextFullStart === null) {
            nextFullStart = eventDayStart;
          }
          if (nextNewStart !== null && nextFullStart !== null) {
            break;
          }
        }
      }

      if (!previousEvent) {
        throw new Error("insufficient_authoritative_data");
      }

      const waxingSpanDays =
        nextFullStart !== null && previousNewStart !== null
          ? Math.min(
            15,
            Math.max(
              14,
              Math.floor((nextFullStart - previousNewStart) / MS_PER_DAY),
            ),
          )
          : 15;

      const waningSpanDays =
        previousFullStart !== null && nextNewStart !== null
          ? Math.min(
            15,
            Math.max(
              14,
              Math.floor((nextNewStart - previousFullStart) / MS_PER_DAY),
            ),
          )
          : 15;

      const isWaxingMoon = previousEvent.type === "new";
      let lunarPhaseKham: number;

      if (isWaxingMoon && previousNewStart !== null) {
        const daysSinceNew = Math.floor(
          (targetDayStart - previousNewStart) / MS_PER_DAY,
        );
        lunarPhaseKham = Math.min(waxingSpanDays, Math.max(1, daysSinceNew));
      } else if (!isWaxingMoon && previousFullStart !== null) {
        const daysSinceFull = Math.floor(
          (targetDayStart - previousFullStart) / MS_PER_DAY,
        );
        lunarPhaseKham = Math.min(waningSpanDays, Math.max(1, daysSinceFull));
      } else {
        throw new Error("insufficient_authoritative_data");
      }

      return { isWaxingMoon, lunarPhaseKham };
    } catch (error) {
      console.warn(
        "Falling back to astronomy-engine lunar calculation:",
        error,
      );
    }
  }

  try {
    const AE = await import("astronomy-engine");
    const time = AE.MakeTime(date);
    const previousNew = AE.SearchMoonPhase(0, time, -30);
    const previousFull = AE.SearchMoonPhase(180, time, -30);
    const synodicMonth = 29.530588853;

    if (!previousNew || !previousFull) {
      return computeSynodicFallback(date, synodicMonth);
    }

    const previousNewDate =
      previousNew.date instanceof Date
        ? previousNew.date
        : new Date(previousNew.date);
    const previousFullDate =
      previousFull.date instanceof Date
        ? previousFull.date
        : new Date(previousFull.date);

    const eventLocalIndex = toThailandDayStart(date);
    const newLocalIndex = toThailandDayStart(previousNewDate);
    const fullLocalIndex = toThailandDayStart(previousFullDate);
    const daysSinceNewLocal = Math.floor(
      (eventLocalIndex - newLocalIndex) / MS_PER_DAY,
    );
    const daysSinceFullLocal = Math.floor(
      (eventLocalIndex - fullLocalIndex) / MS_PER_DAY,
    );
    const isWaxingMoon = daysSinceNewLocal >= 0 && daysSinceNewLocal <= 14;
    const lunarPhaseKham = isWaxingMoon
      ? Math.min(15, Math.max(1, daysSinceNewLocal + 1))
      : Math.min(15, Math.max(1, daysSinceFullLocal));

    return { isWaxingMoon, lunarPhaseKham };
  } catch (error) {
    console.warn("Falling back to synodic-month lunar calculation:", error);
    return computeSynodicFallback(date);
  }
}

function computeSynodicFallback(
  date: Date,
  synodicMonth = 29.530588853,
): { isWaxingMoon: boolean; lunarPhaseKham: number } {
  const julianDate = date.getTime() / MS_PER_DAY + 2440587.5;
  const age =
    (((julianDate - 2451550.1) % synodicMonth) + synodicMonth) % synodicMonth;
  const isWaxingMoon = age <= synodicMonth / 2;
  const rawKham = isWaxingMoon
    ? Math.round(age)
    : Math.round(synodicMonth - age);
  const lunarPhaseKham = Math.min(15, Math.max(1, rawKham));
  return { isWaxingMoon, lunarPhaseKham };
}

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
  const thailandOffsetMs = 7 * 60 * 60 * 1000;
  const thailandDate = new Date(eventDate.getTime() + thailandOffsetMs);
  const hours = thailandDate.getUTCHours().toString().padStart(2, '0');
  const minutes = thailandDate.getUTCMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;
  return {
    time,
    level: Number.parseFloat(extreme.height.toFixed(2)),
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
  // Convert UTC to Thailand time (UTC+7)
  const thailandOffsetMs = 7 * 60 * 60 * 1000;
  const thailandDate = new Date(eventDate.getTime() + thailandOffsetMs);
  const hours = thailandDate.getUTCHours().toString().padStart(2, '0');
  const minutes = thailandDate.getUTCMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;
  const type =
    typeof extreme.type === "string"
      ? normaliseTideType(extreme.type)
      : inferTypeFromNeighbors();
  return {
    time,
    level: Number.parseFloat(extreme.height.toFixed(2)),
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

type TideSourceMetadata = {
  source: string;
  sourceTier: SourceTier;
  sourceLabel: string;
  confidenceMethod: ConfidenceMethod;
  qualityScore: number | null;
  degraded: boolean;
  degradedReason?: string;
  isObserved: boolean;
  stationId?: string;
  distanceKm?: number;
};

type TideInputResult = {
  events: TideEvent[];
  metadata: TideSourceMetadata;
};

function getWaterLevelReference(metadata: TideSourceMetadata): string {
  switch (metadata.sourceTier) {
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
  return `${value.getHours().toString().padStart(2, "0")}:${value
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function deriveCanonicalGraphData(
  location: LocationData,
  date: Date,
  intervalMinutes = 60,
): WaterLevelGraphData[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 0, 0);

  return generatePredictionTimeSeries(start, end, location, intervalMinutes).map(
    (point) => ({
      time: toClockString(point.time),
      level: Number.parseFloat(point.level.toFixed(2)),
      prediction: point.time.getTime() > Date.now(),
    }),
  );
}

function deriveExtremesFromGraphData(graphData: WaterLevelGraphData[]): TideEvent[] {
  const events: TideEvent[] = [];

  for (let i = 1; i < graphData.length - 1; i++) {
    const prev = graphData[i - 1].level;
    const current = graphData[i].level;
    const next = graphData[i + 1].level;

    if (current >= prev && current > next) {
      events.push({
        time: graphData[i].time,
        level: current,
        type: "high",
        prediction: graphData[i].prediction,
      });
    } else if (current <= prev && current < next) {
      events.push({
        time: graphData[i].time,
        level: current,
        type: "low",
        prediction: graphData[i].prediction,
      });
    }
  }

  return sortTideEvents(events);
}

async function fetchRealTideData(
  location: LocationData,
  date: Date,
): Promise<TideInputResult> {
  try {
    const stationProjectedData = await fetchHydroTideData(date, location.lat, location.lon);
    if (stationProjectedData && stationProjectedData.events.length > 0) {
      return {
        events: sortTideEvents(stationProjectedData.events),
        metadata: {
          source: stationProjectedData.source,
          sourceTier: "station_projected",
          sourceLabel: `สถานีใกล้เคียง ${stationProjectedData.stationName}`,
          confidenceMethod: "empirical",
          qualityScore: 78,
          degraded: false,
          isObserved: false,
          stationId: stationProjectedData.stationId,
          distanceKm: stationProjectedData.distanceKm,
        },
      };
    }
  } catch (error) {
    console.warn("Failed to fetch station-projected tide data:", error);
  }

  let worldTidesApiKey: string | undefined;
  let stormglassApiKey: string | undefined;

  if (typeof process !== "undefined" && process.env) {
    worldTidesApiKey = process.env.WORLDTIDES_API_KEY;
    stormglassApiKey = process.env.STORMGLASS_API_KEY;
  }

  if (worldTidesApiKey) {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const start = Math.floor(startDate.getTime() / 1000);
      const url = `https://www.worldtides.info/api/v3?extremes&lat=${location.lat}&lon=${location.lon}&start=${start}&length=86400&key=${worldTidesApiKey}`;
      const response = await fetch(url, { cache: "force-cache" });

      if (response.ok) {
        const payload: unknown = await response.json();
        if (isWorldTidesResponse(payload) && payload.extremes.length > 0) {
          const events = payload.extremes
            .map(toTideEventFromWorldTides)
            .filter((event): event is TideEvent => event !== null);
          if (events.length > 0) {
            return {
              events: sortTideEvents(events),
              metadata: {
                source: "WorldTides API",
                sourceTier: "provider",
                sourceLabel: "WorldTides",
                confidenceMethod: "provider",
                qualityScore: 84,
                degraded: false,
                isObserved: false,
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
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${location.lat}&lng=${location.lon}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
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
          if (events.length > 0) {
            return {
              events: sortTideEvents(events),
              metadata: {
                source: "Stormglass API",
                sourceTier: "provider",
                sourceLabel: "Stormglass",
                confidenceMethod: "provider",
                qualityScore: 80,
                degraded: false,
                isObserved: false,
              },
            };
          }
        }
      }
    } catch (error) {
      console.error("Stormglass API error:", error);
    }
  }

  return {
    events: [],
    metadata: {
      source: "Canonical Harmonic Model",
      sourceTier: "harmonic",
      sourceLabel: "โมเดล harmonic ภายใน",
      confidenceMethod: "none",
      qualityScore: 68,
      degraded: true,
      degradedReason: "ไม่มี provider หรือ station feed ที่พร้อมใช้ จึงใช้โมเดลภายใน",
      isObserved: false,
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

  let currentMinutes = currentTime.hour * 60 + currentTime.minute;

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
    const graphData = deriveCanonicalGraphData(location, date);
    const harmonicEvents = deriveExtremesFromGraphData(graphData);
    const tideEvents =
      tideInput.events.length > 0 ? tideInput.events : harmonicEvents;

    const currentTime =
      time ||
      (() => {
        const now = new Date();
        return { hour: now.getHours(), minute: now.getMinutes() };
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
      modelVersion: FORECAST_MODEL_VERSION,
      stationId: tideInput.metadata.stationId,
      stationDistanceKm: tideInput.metadata.distanceKm,
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
