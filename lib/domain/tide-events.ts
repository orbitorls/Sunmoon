/**
 * Tide event acquisition helpers.
 *
 * Extracted from the former lib/tide-service.ts god module. This module owns the
 * "raw material" side of the forecast: parsing provider extremes
 * (WorldTides / Stormglass), sanity-checking them against the canonical
 * harmonic baseline, banding quality from measured accuracy, and deriving the
 * canonical harmonic graph series. The orchestration/assembly side stays in
 * lib/domain/forecast-facade.ts.
 */

import {
  CONSTITUENTS_DATABASE,
  createPredictionSeries,
  type TideConstituent,
} from "@/lib/harmonic/core";
import { getLocationConstituents } from "@/lib/harmonic/constituent-catalog";
import {
  formatThailandClock,
  getThailandDayBounds,
  roundToDigits,
} from "./thailand-time";
import {
  eventDeltaMinutes,
  getMostRecentStationMeasuredAccuracy,
  type ComparisonEvent,
  type StationMeasuredAccuracy,
} from "@/lib/comparison";
import type {
  LocationData,
  TideEvent,
  WaterLevelGraphData,
} from "./types";

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

export function isWorldTidesResponse(
  value: unknown,
): value is WorldTidesResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const extremes = (value as { extremes?: unknown }).extremes;
  return Array.isArray(extremes);
}

export function isStormglassResponse(
  value: unknown,
): value is StormglassResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = (value as { data?: unknown }).data;
  return Array.isArray(data);
}

export function toTideEventFromWorldTides(
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

export function toTideEventFromStormglass(
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

export function sortTideEvents(events: TideEvent[]): TideEvent[] {
  return [...events].sort((a, b) => {
    const [ha, ma] = a.time.split(":").map(Number);
    const [hb, mb] = b.time.split(":").map(Number);
    if (ha !== hb) {
      return ha - hb;
    }
    return ma - mb;
  });
}

export function toClockString(value: Date): string {
  return formatThailandClock(value);
}

// Mean sea level baseline for the generic regional fallback tier (no
// per-station offset is available here). Matches the constant
// lib/harmonic-prediction.ts's old engine used -- lib/harmonic-tide-core.ts's
// predictTideLevel has no baseline of its own, it only sums constituent
// contributions around zero.
const CANONICAL_MSL_METERS = 1.2;

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

export function deriveCanonicalSeries(
  location: LocationData,
  date: Date,
  intervalMinutes: number,
): Array<{ time: Date; level: number }> {
  const { start } = getThailandDayBounds(date);
  const end = new Date(start.getTime() + (23 * 60 + 59) * 60 * 1000);
  const constituents = toHarmonicCoreConstituents(
    getLocationConstituents(location),
  );

  return createPredictionSeries(
    start,
    end,
    constituents,
    intervalMinutes,
    location.lon,
  ).map((point) => ({
    time: point.time,
    level: point.level + CANONICAL_MSL_METERS,
  }));
}

export function deriveCanonicalGraphData(
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

function isPlausibleAgainstBaseline(
  event: TideEvent,
  baselineEvents: TideEvent[],
): boolean {
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

export function filterPlausibleProviderEvents(
  events: TideEvent[],
  baselineEvents: TideEvent[],
): TideEvent[] {
  if (baselineEvents.length === 0) {
    return events;
  }
  return events.filter((event) =>
    isPlausibleAgainstBaseline(event, baselineEvents),
  );
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
function bandQualityScoreFromMeasuredAccuracy(
  accuracy: StationMeasuredAccuracy,
  ceiling: number,
): number {
  const timingErrorMinutes = Math.max(
    accuracy.rmseTimingMinutes,
    accuracy.meanAbsoluteTimingErrorMinutes,
  );
  // Align with getTimingAccuracyBand: ≤15 keep ceiling, ≤30 mid, ≤60 low, else floor.
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

export async function getProviderQualityInfo(
  location: LocationData,
  ceiling: number,
): Promise<{
  qualityScore: number;
  measuredAccuracy: StationMeasuredAccuracy | null;
}> {
  const accuracy = await getMostRecentStationMeasuredAccuracy(location);
  return {
    qualityScore: accuracy
      ? bandQualityScoreFromMeasuredAccuracy(accuracy, ceiling)
      : ceiling,
    measuredAccuracy: accuracy,
  };
}