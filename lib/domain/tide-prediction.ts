import {
  CONSTITUENTS_DATABASE,
  createPredictionSeries,
  type TideConstituent,
} from "@/lib/harmonic";
import { getLocationConstituents } from "@/lib/harmonic";
import { getStationHarmonicDayPrediction } from "@/lib/harmonic";
import { getThailandDayBounds, roundToDigits } from "@/lib/domain/thailand-time";
import { deriveExtremesFromSeries } from "@/lib/comparison";

export type TideEvent = {
  time: string;
  level: number;
  type: "high" | "low";
  prediction: boolean;
};

const CANONICAL_MSL_METERS = 1.2;
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
  location: { lat: number; lon: number; name: string },
  date: Date,
): Array<{ time: Date; level: number }> {
  const { start } = getThailandDayBounds(date);
  const end = new Date(start.getTime() + (23 * 60 + 59) * 60 * 1000);
  const constituents = toHarmonicCoreConstituents(getLocationConstituents(location));

  return createPredictionSeries(
    start,
    end,
    constituents,
    CANONICAL_EXTREMA_INTERVAL_MINUTES,
    location.lon,
  ).map((point) => ({ time: point.time, level: point.level + CANONICAL_MSL_METERS }));
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

export async function predictTideEvents(
  location: { lat: number; lon: number; name: string },
  date: Date,
): Promise<TideEvent[]> {
  const station = getStationHarmonicDayPrediction(location, date);
  if (station && station.events.length > 0) {
    return sortTideEvents(
      station.events.map((event) => ({
        time: event.time,
        level: event.level,
        type: event.type,
        prediction: event.prediction,
      })),
    );
  }

  const series = deriveCanonicalSeries(location, date);
  const extremes = deriveExtremesFromSeries(series);
  return sortTideEvents(
    extremes.map((event) => ({
      time: event.clockTime,
      level: roundToDigits(event.level ?? 0, 2),
      type: event.type,
      prediction: new Date(event.timestamp).getTime() > Date.now(),
    })),
  );
}
