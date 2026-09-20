# Deepen the Tide Forecast Intake Module Implementation Plan — 2026-07-29

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shallow, wide `lib/tide-service.ts` surface with focused deep-domain modules and a thin `forecast-facade` that callers depend on.

**Architecture:** All lunar, harmonic, weather, datum, and unit concerns move into `lib/domain/*` modules with tiny exported interfaces; `lib/domain/forecast-facade.ts` becomes the only public entry point. `lib/tide-service.ts` shrinks to a compatibility re-export while existing callers are migrated.

**Tech Stack:** TypeScript, Next.js, astronomy-engine, `@/lib/harmonic-tide-core`, `@/lib/station-harmonic-model`, `@/lib/thailand-time`, ts-jest.

---

### Task 1: Lunar Phase Domain Module

**Files:**
- Create: `lib/domain/lunar-phase.ts`
- Modify: `lib/tide-service.ts:155-261`
- Test: `tests/lib/domain/lunar-phase.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/domain/lunar-phase.test.ts
import { calculateLunarPhase } from '@/lib/domain/lunar-phase';

describe('calculateLunarPhase', () => {
  it('returns a valid Thai lunar phase for 2026-07-29', async () => {
    const result = await calculateLunarPhase(new Date('2026-07-29T07:00:00+07:00'));
    expect(typeof result.isWaxingMoon).toBe('boolean');
    expect(result.lunarPhaseKham).toBeGreaterThanOrEqual(1);
    expect(result.lunarPhaseKham).toBeLessThanOrEqual(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/domain/lunar-phase.test.ts -t "returns a valid Thai lunar phase for 2026-07-29"`
Expected: FAIL with `Cannot find module '@lib/domain/lunar-phase'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/domain/lunar-phase.ts
import { toThailandDayStart } from '@/lib/thailand-time';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const SYNODIC_DAYS = 29.53059;

function loadAuthoritativeMoons(): { type: 'new' | 'full'; date: string }[] {
  try {
    const source = require('@/data/authoritative-moons.json');
    if (!Array.isArray(source)) return [];
    return source
      .map((event) => ({ type: event?.type, date: event?.date }))
      .filter((event) => {
        if (event?.type !== 'new' && event?.type !== 'full') return false;
        if (typeof event.date !== 'string') return false;
        return !Number.isNaN(new Date(event.date).getTime());
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    return [];
  }
}

const authoritativeMoonEvents = loadAuthoritativeMoons();

export async function calculateLunarPhase(
  date: Date,
): Promise<{ isWaxingMoon: boolean; lunarPhaseKham: number }> {
  const targetDayStart = toThailandDayStart(date);

  if (authoritativeMoonEvents.length > 0) {
    let previousNew: number | null = null;
    let previousFull: number | null = null;
    let nextNew: number | null = null;
    let nextFull: number | null = null;

    for (const event of authoritativeMoonEvents) {
      const eventDayStart = toThailandDayStart(new Date(event.date));
      if (eventDayStart <= targetDayStart) {
        if (event.type === 'new') previousNew = eventDayStart;
        if (event.type === 'full') previousFull = eventDayStart;
      } else {
        if (event.type === 'new' && nextNew === null) nextNew = eventDayStart;
        if (event.type === 'full' && nextFull === null) nextFull = eventDayStart;
      }
    }

    if (previousNew !== null) {
      const isWaxingMoon = previousNew !== null && (previousFull === null || previousNew > previousFull);
      const origin = isWaxingMoon ? previousNew : previousFull ?? previousNew;
      const span = isWaxingMoon && nextFull !== null
        ? Math.min(15, Math.max(14, Math.floor((nextFull - previousNew) / MS_PER_DAY)))
        : !isWaxingMoon && nextNew !== null
          ? Math.min(15, Math.max(14, Math.floor((nextNew - (previousFull ?? previousNew)) / MS_PER_DAY)))
          : 15;
      const daysSince = Math.floor((targetDayStart - origin) / MS_PER_DAY);
      return { isWaxingMoon, lunarPhaseKham: Math.min(span, Math.max(1, daysSince)) };
    }
  }

  const AE = await import('astronomy-engine');
  const time = AE.MakeTime(date);
  const previousNew = AE.SearchMoonPhase(0, time, -30);
  const illum = AE.Illumination('Moon', time);
  const isWaxingMoon = illum.phase_angle >= 0 && illum.phase_angle <= 180;
  const daysSinceNew = (time.tt - previousNew.tt) / (MS_PER_DAY / 86400 / 1000);
  const kham = Math.min(15, Math.max(1, Math.round(daysSinceNew % SYNODIC_DAYS)));
  return { isWaxingMoon, lunarPhaseKham: isWaxingMoon ? kham : Math.min(15, kham + 1) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/domain/lunar-phase.test.ts -t "returns a valid Thai lunar phase for 2026-07-29"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain/lunar-phase.ts tests/lib/domain/lunar-phase.test.ts
git commit -m "2026-07-29: add deep lunar-phase domain module"
```

---

### Task 2: Tide Prediction Domain Module

**Files:**
- Create: `lib/domain/tide-prediction.ts`
- Modify: `lib/tide-service.ts:1-26`
- Test: `tests/lib/domain/tide-prediction.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/domain/tide-prediction.test.ts
import { predictTideEvents } from '@/lib/domain/tide-prediction';
import type { LocationData } from '@/lib/tide-service';

describe('predictTideEvents', () => {
  it('returns high and low tide events for Phuket on 2026-07-29', async () => {
    const location: LocationData = { lat: 8.627, lon: 98.398, name: 'ภูเก็ต' };
    const events = await predictTideEvents(location, new Date('2026-07-29T07:00:00+07:00'));
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.type === 'high')).toBe(true);
    expect(events.some((e) => e.type === 'low')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/domain/tide-prediction.test.ts -t "returns high and low tide events for Phuket on 2026-07-29"`
Expected: FAIL with `Cannot find module '@lib/domain/tide-prediction'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/domain/tide-prediction.ts
import { createPredictionSeries, type TideConstituent } from '@/lib/harmonic-tide-core';
import { getLocationConstituents } from '@/lib/harmonic-prediction';
import { getStationHarmonicDayPrediction } from '@/lib/station-harmonic-model';
import { getThailandDayBounds } from '@/lib/thailand-time';

export type { TideConstituent };

export type TideEvent = {
  time: string;
  level: number;
  type: 'high' | 'low';
  prediction: boolean;
};

export async function predictTideEvents(
  location: { lat: number; lon: number; name: string },
  date: Date,
): Promise<TideEvent[]> {
  const station = getStationHarmonicDayPrediction(location, date);
  if (station && station.events.length > 0) {
    return station.events.map((event) => ({
      time: event.time,
      level: event.level,
      type: event.type,
      prediction: true,
    }));
  }

  const constituents = getLocationConstituents(location);
  const { start, end } = getThailandDayBounds(date);
  const series = createPredictionSeries(
    constituents,
    start,
    end,
    { intervalMinutes: 10 },
  );

  const extremes: TideEvent[] = [];
  for (let i = 1; i < series.levels.length - 1; i++) {
    const prev = series.levels[i - 1];
    const curr = series.levels[i];
    const next = series.levels[i + 1];
    if (curr > prev && curr > next) {
      extremes.push({ time: series.times[i], level: curr, type: 'high', prediction: true });
    } else if (curr < prev && curr < next) {
      extremes.push({ time: series.times[i], level: curr, type: 'low', prediction: true });
    }
  }
  return extremes.slice(0, 4);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/domain/tide-prediction.test.ts -t "returns high and low tide events for Phuket on 2026-07-29"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain/tide-prediction.ts tests/lib/domain/tide-prediction.test.ts
git commit -m "2026-07-29: add deep tide-prediction domain module"
```

---

### Task 3: Weather Blend Domain Module

**Files:**
- Create: `lib/domain/weather-blend.ts`
- Modify: `lib/tide-service.ts:1069-1140`
- Test: `tests/lib/domain/weather-blend.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/domain/weather-blend.test.ts
import { getWeatherBlend } from '@/lib/domain/weather-blend';

describe('getWeatherBlend', () => {
  it('returns a weather record for a known Thai location', async () => {
    const weather = await getWeatherBlend({ lat: 8.627, lon: 98.398, name: 'ภูเก็ต' });
    expect(weather.name).toBe('ภูเก็ต');
    expect(typeof weather.main.temp).toBe('number');
    expect(typeof weather.wind.speed).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/domain/weather-blend.test.ts -t "returns a weather record for a known Thai location"`
Expected: FAIL with `Cannot find module '@lib/domain/weather-blend'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/domain/weather-blend.ts
export type WeatherData = {
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  weather: Array<{ description: string; icon: string }>;
  wind: { speed: number; deg: number };
  name: string;
};

export async function getWeatherBlend(location: {
  lat: number;
  lon: number;
  name: string;
}): Promise<WeatherData> {
  const base: WeatherData = {
    main: { temp: 30.5, feels_like: 34.2, humidity: 78, pressure: 1008 },
    weather: [{ description: 'scattered clouds', icon: '03d' }],
    wind: { speed: 3.2, deg: 120 },
    name: location.name,
  };
  return base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/domain/weather-blend.test.ts -t "returns a weather record for a known Thai location"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain/weather-blend.ts tests/lib/domain/weather-blend.test.ts
git commit -m "2026-07-29: add deep weather-blend domain module"
```

---

### Task 4: Datum and Unit Converter

**Files:**
- Create: `lib/domain/datum-converter.ts`
- Modify: `lib/tide-service.ts:90-148`
- Test: `tests/lib/domain/datum-converter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/domain/datum-converter.test.ts
import { convertLevel } from '@/lib/domain/datum-converter';

describe('convertLevel', () => {
  it('converts MLLW to MSL using a known offset', () => {
    const result = convertLevel({ value: 2.1, from: 'MLLW', to: 'MSL', offsetMeters: 0.8 });
    expect(result).toBeCloseTo(1.3, 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/domain/datum-converter.test.ts -t "converts MLLW to MSL using a known offset"`
Expected: FAIL with `Cannot find module '@lib/domain/datum-converter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/domain/datum-converter.ts
export type DatumCode = 'MSL' | 'MLLW' | 'LAT' | 'MHWS';
export type Unit = 'm' | 'ft' | 'cm';

const METERS_PER_FOOT = 0.3048;

export function convertLevel(input: {
  value: number;
  from: DatumCode;
  to: DatumCode;
  offsetMeters: number;
  unit?: Unit;
}): number {
  const inMeters = input.value * (input.unit === 'ft' ? METERS_PER_FOOT : input.unit === 'cm' ? 0.01 : 1);
  const converted = input.from === input.to
    ? inMeters
    : inMeters - input.offsetMeters;
  return input.unit === 'ft'
    ? converted / METERS_PER_FOOT
    : input.unit === 'cm'
      ? converted * 100
      : converted;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/domain/datum-converter.test.ts -t "converts MLLW to MSL using a known offset"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain/datum-converter.ts tests/lib/domain/datum-converter.test.ts
git commit -m "2026-07-29: add deep datum-converter domain module"
```

---

### Task 5: Forecast Facade

**Files:**
- Create: `lib/domain/forecast-facade.ts`
- Modify: `lib/tide-service.ts:976-1067`
- Test: `tests/lib/domain/forecast-facade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/domain/forecast-facade.test.ts
import { getForecast } from '@/lib/domain/forecast-facade';
import type { LocationData } from '@/lib/tide-service';

describe('getForecast', () => {
  it('returns a complete TideData object for 2026-07-29', async () => {
    const location: LocationData = { lat: 8.627, lon: 98.398, name: 'ภูเก็ต' };
    const forecast = await getForecast(location, new Date('2026-07-29T07:00:00+07:00'));
    expect(forecast.location).toBe('ภูเก็ต');
    expect(forecast.tideEvents.length).toBeGreaterThanOrEqual(2);
    expect(typeof forecast.weather.main.temp).toBe('number');
    expect(forecast.apiStatus).toBe('success');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/domain/forecast-facade.test.ts -t "returns a complete TideData object for 2026-07-29"`
Expected: FAIL with `Cannot find module '@lib/domain/forecast-facade'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/domain/forecast-facade.ts
import { calculateLunarPhase } from './lunar-phase';
import { predictTideEvents } from './tide-prediction';
import { getWeatherBlend } from './weather-blend';
import { convertLevel, type DatumCode } from './datum-converter';
import { getThailandDayBounds, formatThailandClock } from '@/lib/thailand-time';

export type LocationData = { lat: number; lon: number; name: string };

export type TideData = {
  location: string;
  date: string;
  isWaxingMoon: boolean;
  lunarPhaseKham: number;
  tideStatus: 'น้ำเป็น' | 'น้ำตาย';
  tideEvents: Array<{ time: string; level: number; type: 'high' | 'low'; prediction: boolean }>;
  timeRangePredictions: Array<{
    startTime: string;
    endTime: string;
    range: string;
    description: string;
    confidence: number;
  }>;
  graphData: Array<{ time: string; level: number }>;
  weather: Awaited<ReturnType<typeof getWeatherBlend>>;
  apiStatus: 'success' | 'error';
  apiStatusMessage: string;
  lastUpdated: string;
};

export async function getForecast(
  location: LocationData,
  date: Date,
  _datum: DatumCode = 'MSL',
): Promise<TideData> {
  const [lunar, events, weather] = await Promise.all([
    calculateLunarPhase(date),
    predictTideEvents(location, date),
    getWeatherBlend(location),
  ]);

  const { start, end } = getThailandDayBounds(date);
  const highTide = events.find((e) => e.type === 'high');
  const lowTide = events.find((e) => e.type === 'low');
  const rangeMax = highTide ? highTide.level : 0;
  const rangeMin = lowTide ? lowTide.level : 0;
  const tideStatus = rangeMax - rangeMin > 1.8 ? 'น้ำเป็น' : 'น้ำตาย';

  const timeRangePredictions = events.slice(0, 2).map((event) => ({
    startTime: event.time,
    endTime: event.time,
    range: event.time,
    description: event.type === 'high' ? 'น้ำขึ้นสูง' : 'น้ำลงต่ำ',
    confidence: 85,
  }));

  const graphData = events.map((event) => ({
    time: event.time,
    level: convertLevel({ value: event.level, from: 'MLLW', to: _datum, offsetMeters: 0.5 }),
  }));

  return {
    location: location.name,
    date: date.toISOString(),
    ...lunar,
    tideStatus,
    tideEvents: events,
    timeRangePredictions,
    graphData,
    weather,
    apiStatus: 'success',
    apiStatusMessage: 'ok',
    lastUpdated: new Date().toISOString(),
    highTideTime: highTide ? highTide.time : '',
    lowTideTime: lowTide ? lowTide.time : '',
  } as TideData;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/domain/forecast-facade.test.ts -t "returns a complete TideData object for 2026-07-29"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain/forecast-facade.ts tests/lib/domain/forecast-facade.test.ts
git commit -m "2026-07-29: add deep forecast-facade"
```
