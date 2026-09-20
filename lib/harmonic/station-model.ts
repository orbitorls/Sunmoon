import hydroStations from "@/data/hydro-stations.json";
import stationConstants from "@/data/station-harmonic-constants.calibrated.json";
import {
  CONSTITUENTS_DATABASE,
  createPredictionSeries,
  findHighLowTides,
  type TideConstituent,
} from "./core";
import {
  formatThailandClock,
  formatThailandTimestamp,
  getThailandDayBounds,
  roundToDigits,
} from "../thailand-time";
import { calculateDistance } from "../domain/geo";

const MAX_STATION_DISTANCE_KM = 150;
const DEFAULT_HARMONIC_EPOCH = new Date("2000-01-01T00:00:00Z");

type HydroStation = {
  id: string;
  name: string;
  nameTh?: string;
  lat: number;
  lon: number;
};

type StationConstant = {
  stationId: string;
  datum: string;
  epoch: string;
  levelOffsetMeters: number;
  timeOffsetMinutes?: number;
  qualityScore: number;
  source: string;
  sourceKind?: "harmonic_constants" | "field_fit";
  sourceCitation?: string;
  constituents: Array<{
    name: string;
    amplitude: number;
    phase: number;
  }>;
};

export type StationHarmonicPoint = {
  time: Date;
  level: number;
  slope: number;
};

export type StationHarmonicEvent = {
  time: string; // HH:MM (Thailand local time)
  timestamp: string; // ISO timestamp with Thailand offset
  level: number;
  type: "high" | "low";
  prediction: boolean;
};

export type StationHarmonicPrediction = {
  stationId: string;
  stationName: string;
  stationLat: number;
  stationLon: number;
  distanceKm: number;
  datum: string;
  source: string;
  qualityScore: number;
  constituentsCount: number;
  dominantConstituentQuarterPeriodMinutes: number | null;
  series: StationHarmonicPoint[];
  events: StationHarmonicEvent[];
};

export type StationHarmonicUnavailable = {
  reason: "no_configured_station" | "station_too_far" | "invalid_constituents";
  nearestStationId?: string;
  nearestStationName?: string;
  distanceKm?: number;
};

export type StationHarmonicDiagnostics = {
  totalStations: number;
  configuredStations: number;
  missingStationIds: string[];
  invalidStationIds: string[];
};

function toConstituents(constants: StationConstant): TideConstituent[] {
  return constants.constituents
    .map((item) => {
      const definition = CONSTITUENTS_DATABASE[item.name];
      if (!definition || !Number.isFinite(item.amplitude) || !Number.isFinite(item.phase)) {
        return null;
      }
      return {
        name: item.name,
        speed: definition.speed,
        amplitude: item.amplitude,
        phase: item.phase,
        description: definition.description,
      };
    })
    .filter((item): item is TideConstituent => item !== null);
}

function isValidConstant(constants: StationConstant): boolean {
  return toConstituents(constants).length > 0;
}

// The dominant constituent (largest amplitude) sets the tide's basic rhythm:
// ~12.4h for a semidiurnal-dominant station (M2), ~24h for a diurnal-dominant
// one (K1/O1). A quarter of that period is the natural "this could plausibly
// be the same high/low, not the next or previous cycle's" bound -- used to
// cap the event-matching window in tide-comparison.ts so it scales with the
// station's actual rhythm instead of a single hardcoded constant.
function getDominantConstituentQuarterPeriodMinutes(constituents: TideConstituent[]): number | null {
  if (constituents.length === 0) {
    return null;
  }

  const dominant = constituents.reduce((best, current) =>
    current.amplitude > best.amplitude ? current : best
  );

  if (!Number.isFinite(dominant.speed) || dominant.speed <= 0) {
    return null;
  }

  const periodMinutes = (360 / dominant.speed) * 60;
  return periodMinutes / 4;
}

// A high qualityScore is only honest when the constituents actually came
// from a least-squares fit against a real continuous observation series
// (sourceKind "field_fit") with a citation that says so. Placeholder seed
// data has historically carried sourceKind "field_fit" too (mislabeled), so
// the citation text itself must also be checked -- otherwise a fabricated
// seed constant could claim the same confidence as a real fit. This is the
// single choke point every caller of getStationHarmonicPrediction routes
// through, so gating here protects all of them (forecast-facade.ts, the
// predict-tide/hydro-tide API routes, tide-comparison) at once.
const PLACEHOLDER_CITATION_PATTERN = /seed/i;
// Matches the "Canonical Harmonic Model" fallback tier's qualityScore in
// lib/domain/forecast-facade.ts: a station constant without real-fit provenance is no
// more trustworthy than that generic fallback, so it can't score higher.
const NO_REAL_FIT_QUALITY_CEILING = 68;

function isRealFitProvenance(constants: StationConstant): boolean {
  return (
    constants.sourceKind === "field_fit" &&
    !!constants.sourceCitation &&
    !PLACEHOLDER_CITATION_PATTERN.test(constants.sourceCitation)
  );
}

function parseEpoch(epoch: string): Date {
  const parsed = new Date(epoch);
  return Number.isFinite(parsed.getTime()) ? parsed : DEFAULT_HARMONIC_EPOCH;
}

function findNearestConfiguredStation(
  lat: number,
  lon: number,
): { station: HydroStation; constants: StationConstant; distanceKm: number } | null {
  let best: { station: HydroStation; constants: StationConstant; distanceKm: number } | null = null;

  for (const constants of stationConstants as StationConstant[]) {
    const station = (hydroStations as HydroStation[]).find((item) => item.id === constants.stationId);
    if (!station) {
      continue;
    }

    const distanceKm = calculateDistance(lat, lon, station.lat, station.lon);
    if (!best || distanceKm < best.distanceKm) {
      best = { station, constants, distanceKm };
    }
  }

  return best;
}

export function getStationHarmonicPrediction(
  location: { lat: number; lon: number },
  start: Date,
  end: Date,
  intervalMinutes = 60,
): StationHarmonicPrediction | null {
  const nearest = findNearestConfiguredStation(location.lat, location.lon);
  if (!nearest) {
    return null;
  }

  if (nearest.distanceKm > MAX_STATION_DISTANCE_KM) {
    return null;
  }

  const constituents = toConstituents(nearest.constants);
  if (constituents.length === 0) {
    return null;
  }

  const offset = nearest.constants.levelOffsetMeters;
  const epoch = parseEpoch(nearest.constants.epoch);
  const timeOffsetMinutes = Number.isFinite(nearest.constants.timeOffsetMinutes)
    ? nearest.constants.timeOffsetMinutes ?? 0
    : 0;
  const shiftedStart = new Date(start.getTime() - timeOffsetMinutes * 60 * 1000);
  const shiftedEnd = new Date(end.getTime() - timeOffsetMinutes * 60 * 1000);
  const series = createPredictionSeries(
    shiftedStart,
    shiftedEnd,
    constituents,
    intervalMinutes,
    nearest.station.lon,
    epoch,
  ).map((point) => ({
    time: new Date(point.time.getTime() + timeOffsetMinutes * 60 * 1000),
    level: roundToDigits(point.level + offset, 3),
    slope: point.slope,
  }));

  // 5-minute extremum scan reduces quantization vs the previous 10-minute step
  // (Wave A timing residual; still offline / no network).
  const extremes = findHighLowTides(shiftedStart, shiftedEnd, constituents, 5, nearest.station.lon, epoch);
  const events = extremes.map((event) => {
    const actualTime = new Date(event.time.getTime() + timeOffsetMinutes * 60 * 1000);
    return {
      time: formatThailandClock(actualTime),
      timestamp: formatThailandTimestamp(actualTime),
      level: roundToDigits(event.level + offset, 2),
      type: event.type,
      prediction: actualTime.getTime() > Date.now(),
    };
  });

  return {
    stationId: nearest.station.id,
    stationName: nearest.station.nameTh || nearest.station.name,
    stationLat: nearest.station.lat,
    stationLon: nearest.station.lon,
    distanceKm: roundToDigits(nearest.distanceKm, 2),
    datum: nearest.constants.datum,
    source: nearest.constants.source,
    qualityScore: isRealFitProvenance(nearest.constants)
      ? nearest.constants.qualityScore
      : Math.min(nearest.constants.qualityScore, NO_REAL_FIT_QUALITY_CEILING),
    constituentsCount: constituents.length,
    dominantConstituentQuarterPeriodMinutes: getDominantConstituentQuarterPeriodMinutes(constituents),
    series,
    events,
  };
}

// Lightweight lookup used to gate a measured-accuracy lookup (see
// lib/tide-comparison.ts's getMostRecentStationMeasuredAccuracy) to only the
// stations we actually have harmonic constants for, without generating a
// full prediction series.
export function getNearestConfiguredStationId(location: { lat: number; lon: number }): string | null {
  const nearest = findNearestConfiguredStation(location.lat, location.lon)
  if (!nearest || nearest.distanceKm > MAX_STATION_DISTANCE_KM) {
    return null
  }
  return nearest.station.id
}

export function getStationHarmonicDiagnostics(): StationHarmonicDiagnostics {
  const stations = hydroStations as HydroStation[];
  const constants = stationConstants as StationConstant[];
  const configuredStationIds = new Set(constants.map((item) => item.stationId));
  const invalidStationIds = constants
    .filter((item) => !isValidConstant(item))
    .map((item) => item.stationId)
    .sort();

  return {
    totalStations: stations.length,
    configuredStations: configuredStationIds.size,
    missingStationIds: stations
      .map((station) => station.id)
      .filter((stationId) => !configuredStationIds.has(stationId))
      .sort(),
    invalidStationIds,
  };
}

export function getStationHarmonicUnavailable(
  location: { lat: number; lon: number },
): StationHarmonicUnavailable | null {
  const nearest = findNearestConfiguredStation(location.lat, location.lon);
  if (!nearest) {
    return { reason: "no_configured_station" };
  }

  if (nearest.distanceKm > MAX_STATION_DISTANCE_KM) {
    return {
      reason: "station_too_far",
      nearestStationId: nearest.station.id,
      nearestStationName: nearest.station.nameTh || nearest.station.name,
      distanceKm: roundToDigits(nearest.distanceKm, 2),
    };
  }

  if (toConstituents(nearest.constants).length === 0) {
    return {
      reason: "invalid_constituents",
      nearestStationId: nearest.station.id,
      nearestStationName: nearest.station.nameTh || nearest.station.name,
      distanceKm: roundToDigits(nearest.distanceKm, 2),
    };
  }

  return null;
}

export function getStationHarmonicDayPrediction(
  location: { lat: number; lon: number },
  date: Date,
  intervalMinutes = 60,
): StationHarmonicPrediction | null {
  const { start } = getThailandDayBounds(date);
  const end = new Date(start.getTime() + (23 * 60 + 59) * 60 * 1000);
  return getStationHarmonicPrediction(location, start, end, intervalMinutes);
}
