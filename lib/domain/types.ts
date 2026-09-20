/**
 * Shared domain types for the forecast facade.
 *
 * These types used to live in lib/tide-service.ts (the god module). They are
 * extracted here so sub-modules (harmonic, services, compression, hooks, etc.)
 * can depend on types without pulling in the whole forecast facade.
 */

import type { StationMeasuredAccuracy } from "../comparison";

export type { WeatherData } from "./weather-blend";

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