import moonEventSource from "@/data/authoritative-moons.json";
import { toThailandDayStart } from "@/lib/thailand-time";

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
