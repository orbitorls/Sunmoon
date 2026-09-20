# Adapter-ize the Tide Comparison Engine Implementation Plan — 2026-07-29

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic `lib/tide-comparison.ts` with a deep, generic `compare(baseline, candidate, options)` engine and small source-specific adapters.

**Architecture:** `lib/domain/comparison-engine.ts` owns the generic matching, metrics, and calibration-suggestion logic; `lib/comparison/sources/internal-adapter.ts`, `validation-adapter.ts`, and `api-adapter.ts` fetch and normalize snapshots. `lib/tide-comparison.ts` becomes a thin orchestrator that selects adapters and runs the engine.

**Tech Stack:** TypeScript, Next.js, `@/lib/station-harmonic-model`, `@/lib/worldtides-client`, `@/lib/thailand-time`, ts-jest.

---

### Task 1: Generic Comparison Engine

**Files:**
- Create: `lib/domain/comparison-engine.ts`
- Modify: `lib/tide-comparison.ts:198-900`
- Test: `tests/lib/domain/comparison-engine.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/domain/comparison-engine.test.ts
import { compare, type ComparisonOptions } from '@/lib/domain/comparison-engine';
import type { ComparisonSourceSnapshot } from '@/lib/tide-comparison';

describe('compare', () => {
  it('matches high/low events and returns metrics', () => {
    const baseline: ComparisonSourceSnapshot = {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: 'Internal',
      location: { id: 'p', name: 'ภูเก็ต', lat: 8.627, lon: 98.398 },
      date: '2026-07-29',
      available: true,
      datum: 'MSL',
      datumConfidence: 'known',
      supportsHeightComparison: true,
      events: [
        { type: 'high', timestamp: '2026-07-29T08:30:00+07:00', clockTime: '08:30', level: 2.5, confidence: 0.9 },
        { type: 'low', timestamp: '2026-07-29T14:30:00+07:00', clockTime: '14:30', level: 0.8, confidence: 0.9 },
      ],
      rawEventCount: 2,
      metadata: {},
    };

    const candidate: ComparisonSourceSnapshot = { ...baseline, sourceId: 'validation_fixture', sourceLabel: 'Validation' };
    candidate.events = [
      { type: 'high', timestamp: '2026-07-29T08:40:00+07:00', clockTime: '08:40', level: 2.45, confidence: 0.9 },
      { type: 'low', timestamp: '2026-07-29T14:25:00+07:00', clockTime: '14:25', level: 0.82, confidence: 0.9 },
    ];

    const options: ComparisonOptions = { maxMatchDeltaMinutes: 30 };
    const result = compare(baseline, candidate, options);
    expect(result.metrics.matchedEventCount).toBe(2);
    expect(result.metrics.meanAbsoluteTimingErrorMinutes).toBeLessThanOrEqual(15);
    expect(result.metrics.accuracyPass).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/domain/comparison-engine.test.ts -t "matches high/low events and returns metrics"`
Expected: FAIL with `Cannot find module '@lib/domain/comparison-engine'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/domain/comparison-engine.ts
export type ComparisonOptions = {
  maxMatchDeltaMinutes?: number;
  thresholdTimingMaeMinutes?: number;
  thresholdLevelMaeMeters?: number;
};

export type ComparisonSourceId = 'internal' | 'validation_fixture' | 'worldtides' | 'stormglass' | 'website';
export type ComparisonSourceCategory = 'internal' | 'validation' | 'api' | 'website';
export type DatumConfidence = 'known' | 'assumed' | 'unknown';
export type ComparisonEventType = 'high' | 'low';

export interface ComparisonLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface ComparisonEvent {
  type: ComparisonEventType;
  timestamp: string;
  clockTime: string;
  level: number | null;
  confidence: number | null;
}

export interface ComparisonSourceSnapshot {
  sourceId: ComparisonSourceId;
  category: ComparisonSourceCategory;
  sourceLabel: string;
  location: ComparisonLocation;
  date: string;
  available: boolean;
  unavailableReason?: string;
  datum: string | null;
  datumConfidence: DatumConfidence;
  supportsHeightComparison: boolean;
  events: ComparisonEvent[];
  rawEventCount: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface MatchedComparisonEvent {
  baseline: ComparisonEvent;
  candidate: ComparisonEvent;
  timingDeltaMinutes: number;
  absoluteTimingDeltaMinutes: number;
  levelDeltaMeters: number | null;
  absoluteLevelDeltaMeters: number | null;
}

export interface ComparisonMetrics {
  baselineEventCount: number;
  candidateEventCount: number;
  matchedEventCount: number;
  meanAbsoluteTimingErrorMinutes: number | null;
  meanAbsoluteLevelErrorMeters: number | null;
  accuracyPass: boolean | null;
  supportsHeightComparison: boolean;
}

export interface SourceComparisonResult {
  source: ComparisonSourceSnapshot;
  metrics: ComparisonMetrics;
  matches: MatchedComparisonEvent[];
  unmatchedBaselineEvents: ComparisonEvent[];
  unmatchedCandidateEvents: ComparisonEvent[];
}

function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
}

function timingDeltaMinutes(baseline: ComparisonEvent, candidate: ComparisonEvent): number {
  const a = Date.parse(baseline.timestamp);
  const b = Date.parse(candidate.timestamp);
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return (b - a) / (60 * 1000);
  }
  return clockToMinutes(candidate.clockTime) - clockToMinutes(baseline.clockTime);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function compare(
  baseline: ComparisonSourceSnapshot,
  candidate: ComparisonSourceSnapshot,
  options: ComparisonOptions = {},
): SourceComparisonResult {
  const maxDelta = options.maxMatchDeltaMinutes ?? 180;
  const timingThreshold = options.thresholdTimingMaeMinutes ?? 30;
  const levelThreshold = options.thresholdLevelMaeMeters ?? 0.2;

  const matches: MatchedComparisonEvent[] = [];
  const unmatchedBaseline: ComparisonEvent[] = [];
  const used = new Set<number>();

  for (const be of baseline.events) {
    let bestIndex = -1;
    let bestDelta = Number.POSITIVE_INFINITY;

    for (let i = 0; i < candidate.events.length; i++) {
      if (used.has(i)) continue;
      if (candidate.events[i].type !== be.type) continue;
      const delta = Math.abs(timingDeltaMinutes(be, candidate.events[i]));
      if (delta <= maxDelta && delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0) {
      const ce = candidate.events[bestIndex];
      used.add(bestIndex);
      const levelDelta = be.level !== null && ce.level !== null ? ce.level - be.level : null;
      matches.push({
        baseline: be,
        candidate: ce,
        timingDeltaMinutes: timingDeltaMinutes(be, ce),
        absoluteTimingDeltaMinutes: bestDelta,
        levelDeltaMeters: levelDelta,
        absoluteLevelDeltaMeters: levelDelta !== null ? Math.abs(levelDelta) : null,
      });
    } else {
      unmatchedBaseline.push(be);
    }
  }

  const unmatchedCandidate = candidate.events.filter((_, i) => !used.has(i));

  const timingErrors = matches.map((m) => Math.abs(m.timingDeltaMinutes));
  const levelErrors = matches
    .filter((m) => m.absoluteLevelDeltaMeters !== null)
    .map((m) => m.absoluteLevelDeltaMeters as number);

  const maeTiming = average(timingErrors);
  const maeLevel = levelErrors.length > 0 ? average(levelErrors) : null;

  const accuracyPass =
    matches.length === 0
      ? null
      : (maeTiming !== null && maeTiming <= timingThreshold) &&
        (!candidate.supportsHeightComparison || maeLevel === null || maeLevel <= levelThreshold);

  return {
    source: candidate,
    metrics: {
      baselineEventCount: baseline.events.length,
      candidateEventCount: candidate.events.length,
      matchedEventCount: matches.length,
      meanAbsoluteTimingErrorMinutes: maeTiming,
      meanAbsoluteLevelErrorMeters: maeLevel,
      accuracyPass,
      supportsHeightComparison: candidate.supportsHeightComparison,
    },
    matches,
    unmatchedBaselineEvents: unmatchedBaseline,
    unmatchedCandidateEvents: unmatchedCandidate,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/domain/comparison-engine.test.ts -t "matches high/low events and returns metrics"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain/comparison-engine.ts tests/lib/domain/comparison-engine.test.ts
git commit -m "2026-07-29: add generic tide comparison engine"
```

---

### Task 2: Internal Source Adapter

**Files:**
- Create: `lib/comparison/sources/internal-adapter.ts`
- Modify: `lib/tide-comparison.ts:478-533`
- Test: `tests/lib/comparison/sources/internal-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/comparison/sources/internal-adapter.test.ts
import { fetchInternalSnapshot } from '@/lib/comparison/sources/internal-adapter';

describe('fetchInternalSnapshot', () => {
  it('returns a snapshot for Phuket', async () => {
    const location = { id: 'phuket', name: 'ภูเก็ต', lat: 8.627, lon: 98.398 };
    const snapshot = await fetchInternalSnapshot(location, '2026-07-29');
    expect(snapshot.sourceId).toBe('internal');
    expect(snapshot.available).toBe(true);
    expect(snapshot.events.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/comparison/sources/internal-adapter.test.ts -t "returns a snapshot for Phuket"`
Expected: FAIL with `Cannot find module '@lib/comparison/sources/internal-adapter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/comparison/sources/internal-adapter.ts
import { getStationHarmonicPrediction } from '@/lib/station-harmonic-model';
import type { ComparisonSourceSnapshot, ComparisonLocation, ComparisonEvent } from '@/lib/domain/comparison-engine';

export async function fetchInternalSnapshot(
  location: ComparisonLocation,
  date: string,
): Promise<ComparisonSourceSnapshot> {
  try {
    const prediction = getStationHarmonicPrediction(location, date);
    const events: ComparisonEvent[] = (prediction?.events ?? []).map((e) => ({
      type: e.type as 'high' | 'low',
      timestamp: `${date}T${e.time}:00+07:00`,
      clockTime: e.time,
      level: e.level,
      confidence: 0.85,
    }));

    return {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: 'Station Harmonic Forecast',
      location,
      date,
      available: events.length > 0,
      datum: 'MSL',
      datumConfidence: 'assumed',
      supportsHeightComparison: true,
      events,
      rawEventCount: events.length,
      metadata: { stationId: prediction?.stationId ?? '' },
    };
  } catch (error) {
    return {
      sourceId: 'internal',
      category: 'internal',
      sourceLabel: 'Station Harmonic Forecast',
      location,
      date,
      available: false,
      unavailableReason: 'station_not_found',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: false,
      events: [],
      rawEventCount: 0,
      metadata: { error: String(error) },
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/comparison/sources/internal-adapter.test.ts -t "returns a snapshot for Phuket"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/comparison/sources/internal-adapter.ts tests/lib/comparison/sources/internal-adapter.test.ts
git commit -m "2026-07-29: add internal station comparison adapter"
```

---

### Task 3: Validation Fixture Adapter

**Files:**
- Create: `lib/comparison/sources/validation-adapter.ts`
- Modify: `lib/tide-comparison.ts:713-793`
- Test: `tests/lib/comparison/sources/validation-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/comparison/sources/validation-adapter.test.ts
import { fetchValidationSnapshot } from '@/lib/comparison/sources/validation-adapter';

describe('fetchValidationSnapshot', () => {
  it('returns an available or unavailable snapshot for Phuket', async () => {
    const location = { id: 'phuket', name: 'ภูเก็ต', lat: 8.627, lon: 98.398 };
    const snapshot = await fetchValidationSnapshot(location, '2026-07-29');
    expect(snapshot.sourceId).toBe('validation_fixture');
    expect(['known', 'assumed', 'unknown']).toContain(snapshot.datumConfidence);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/comparison/sources/validation-adapter.test.ts -t "returns an available or unavailable snapshot for Phuket"`
Expected: FAIL with `Cannot find module '@lib/comparison/sources/validation-adapter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/comparison/sources/validation-adapter.ts
import validationFixtures from '@/data/tide-validation-events.json';
import type { ComparisonSourceSnapshot, ComparisonLocation, ComparisonEvent } from '@/lib/domain/comparison-engine';

export async function fetchValidationSnapshot(
  location: ComparisonLocation,
  date: string,
): Promise<ComparisonSourceSnapshot> {
  const fixtures = (validationFixtures as any[]).filter(
    (f) => (f.locationId === location.id || f.stationId === location.id) && f.date === date,
  );

  if (fixtures.length === 0) {
    return {
      sourceId: 'validation_fixture',
      category: 'validation',
      sourceLabel: 'Validation Fixture',
      location,
      date,
      available: false,
      unavailableReason: 'no_fixture_for_location_or_date',
      datum: null,
      datumConfidence: 'unknown',
      supportsHeightComparison: true,
      events: [],
      rawEventCount: 0,
      metadata: {},
    };
  }

  const events: ComparisonEvent[] = fixtures.flatMap((f) =>
    (f.events as any[]).map((e) => ({
      type: e.type as 'high' | 'low',
      timestamp: `${date}T${e.time}:00+07:00`,
      clockTime: e.time,
      level: e.level ?? null,
      confidence: 1.0,
    })),
  );

  const fixture = fixtures[0];
  return {
    sourceId: 'validation_fixture',
    category: 'validation',
    sourceLabel: 'Validation Fixture',
    location,
    date,
    available: true,
    datum: fixture.datum ?? 'MSL',
    datumConfidence: 'known',
    supportsHeightComparison: true,
    events,
    rawEventCount: events.length,
    metadata: { source: fixture.source },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/comparison/sources/validation-adapter.test.ts -t "returns an available or unavailable snapshot for Phuket"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/comparison/sources/validation-adapter.ts tests/lib/comparison/sources/validation-adapter.test.ts
git commit -m "2026-07-29: add validation fixture comparison adapter"
```

---

### Task 4: API Source Adapter

**Files:**
- Create: `lib/comparison/sources/api-adapter.ts`
- Modify: `lib/tide-comparison.ts:535-711`
- Test: `tests/lib/comparison/sources/api-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/comparison/sources/api-adapter.test.ts
import { fetchApiSnapshot } from '@/lib/comparison/sources/api-adapter';

describe('fetchApiSnapshot', () => {
  it('returns a disabled/empty snapshot when no API key is configured', async () => {
    const location = { id: 'phuket', name: 'ภูเก็ต', lat: 8.627, lon: 98.398 };
    const snapshot = await fetchApiSnapshot('worldtides', location, '2026-07-29');
    expect(snapshot.sourceId).toBe('worldtides');
    expect(snapshot.available).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/comparison/sources/api-adapter.test.ts -t "returns a disabled/empty snapshot when no API key is configured"`
Expected: FAIL with `Cannot find module '@lib/comparison/sources/api-adapter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/comparison/sources/api-adapter.ts
import { WorldTidesClient } from '@/lib/worldtides-client';
import type { ComparisonSourceId, ComparisonSourceSnapshot, ComparisonLocation, ComparisonEvent } from '@/lib/domain/comparison-engine';

const API_KEYS = {
  worldtides: process.env.WORLDTIDES_API_KEY,
  stormglass: process.env.STORMGLASS_API_KEY,
};

function sourceLabel(sourceId: ComparisonSourceId): string {
  switch (sourceId) {
    case 'worldtides': return 'WorldTides';
    case 'stormglass': return 'Stormglass';
    default: return 'External API';
  }
}

async function fetchWorldTides(
  location: ComparisonLocation,
  date: string,
): Promise<ComparisonSourceSnapshot> {
  if (!API_KEYS.worldtides) {
    return unavailable(location, date, 'worldtides', 'no_api_key');
  }

  try {
    const client = new WorldTidesClient(API_KEYS.worldtides);
    const { heights, extremes } = await client.fetchDayExtremes(location, date);
    const events: ComparisonEvent[] = (extremes ?? []).map((e: any) => ({
      type: e.type,
      timestamp: e.date,
      clockTime: e.date.split('T')[1].slice(0, 5),
      level: e.height,
      confidence: 0.7,
    }));

    return {
      sourceId: 'worldtides',
      category: 'api',
      sourceLabel: sourceLabel('worldtides'),
      location,
      date,
      available: events.length > 0,
      datum: 'MSL',
      datumConfidence: 'assumed',
      supportsHeightComparison: true,
      events,
      rawEventCount: events.length,
      metadata: { heightCount: heights?.length ?? 0 },
    };
  } catch (error) {
    return unavailable(location, date, 'worldtides', String(error));
  }
}

async function fetchStormglass(
  location: ComparisonLocation,
  _date: string,
): Promise<ComparisonSourceSnapshot> {
  if (!API_KEYS.stormglass) {
    return unavailable(location, _date, 'stormglass', 'no_api_key');
  }

  // Return an unavailable snapshot for Stormglass.
  return unavailable(location, _date, 'stormglass', 'not_implemented');
}

function unavailable(
  location: ComparisonLocation,
  date: string,
  sourceId: ComparisonSourceId,
  reason: string,
): ComparisonSourceSnapshot {
  return {
    sourceId,
    category: 'api',
    sourceLabel: sourceLabel(sourceId),
    location,
    date,
    available: false,
    unavailableReason: reason,
    datum: null,
    datumConfidence: 'unknown',
    supportsHeightComparison: false,
    events: [],
    rawEventCount: 0,
    metadata: {},
  };
}

export async function fetchApiSnapshot(
  sourceId: Exclude<ComparisonSourceId, 'internal' | 'validation_fixture'>,
  location: ComparisonLocation,
  date: string,
): Promise<ComparisonSourceSnapshot> {
  if (sourceId === 'worldtides') return fetchWorldTides(location, date);
  if (sourceId === 'stormglass') return fetchStormglass(location, date);
  return unavailable(location, date, sourceId, 'unsupported_api');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/comparison/sources/api-adapter.test.ts -t "returns a disabled/empty snapshot when no API key is configured"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/comparison/sources/api-adapter.ts tests/lib/comparison/sources/api-adapter.test.ts
git commit -m "2026-07-29: add worldtides/stormglass API comparison adapter"
```

---

### Task 5: Comparison Orchestrator

**Files:**
- Create: `lib/comparison/orchestrator.ts`
- Modify: `lib/tide-comparison.ts:1032-1190`
- Test: `tests/lib/comparison/orchestrator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/comparison/orchestrator.test.ts
import { runComparison } from '@/lib/comparison/orchestrator';

describe('runComparison', () => {
  it('produces a report for one location and two sources', async () => {
    const report = await runComparison({
      date: '2026-07-29',
      locations: [{ id: 'phuket', name: 'ภูเก็ต', lat: 8.627, lon: 98.398 }],
      sources: ['internal', 'validation_fixture'],
    });
    expect(report.date).toBe('2026-07-29');
    expect(report.locations.length).toBe(1);
    expect(report.locations[0].comparisons.length).toBe(1);
    expect(typeof report.summary.totalLocations).toBe('number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/comparison/orchestrator.test.ts -t "produces a report for one location and two sources"`
Expected: FAIL with `Cannot find module '@lib/comparison/orchestrator'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/comparison/orchestrator.ts
import { compare } from '@/lib/domain/comparison-engine';
import { fetchInternalSnapshot } from './sources/internal-adapter';
import { fetchValidationSnapshot } from './sources/validation-adapter';
import { fetchApiSnapshot } from './sources/api-adapter';
import type {
  ComparisonSourceId,
  ComparisonLocation,
  ComparisonSourceSnapshot,
  SourceComparisonResult,
} from '@/lib/domain/comparison-engine';

export type RunComparisonOptions = {
  date: string;
  locations: ComparisonLocation[];
  sources: ComparisonSourceId[];
  maxMatchDeltaMinutes?: number;
};

export type TideComparisonReport = {
  generatedAt: string;
  date: string;
  locations: Array<{
    location: ComparisonLocation;
    baseline: ComparisonSourceSnapshot;
    comparisons: SourceComparisonResult[];
  }>;
  sourcesRequested: ComparisonSourceId[];
  summary: {
    totalLocations: number;
    availableComparisons: number;
    passedComparisons: number;
    failedComparisons: number;
    uncheckedComparisons: number;
  };
};

async function fetchSnapshot(
  source: ComparisonSourceId,
  location: ComparisonLocation,
  date: string,
): Promise<ComparisonSourceSnapshot> {
  if (source === 'internal') return fetchInternalSnapshot(location, date);
  if (source === 'validation_fixture') return fetchValidationSnapshot(location, date);
  return fetchApiSnapshot(source, location, date);
}

export async function runComparison(options: RunComparisonOptions): Promise<TideComparisonReport> {
  const generatedAt = new Date().toISOString();
  const locations = [];
  let available = 0;
  let passed = 0;
  let failed = 0;
  let unchecked = 0;

  for (const location of options.locations) {
    const baseline = await fetchSnapshot('internal', location, options.date);
    const comparisons: SourceComparisonResult[] = [];

    for (const source of options.sources.filter((s) => s !== 'internal')) {
      const candidate = await fetchSnapshot(source, location, options.date);
      if (!candidate.available) {
        unchecked++;
      } else {
        available++;
      }
      const result = compare(baseline, candidate, { maxMatchDeltaMinutes: options.maxMatchDeltaMinutes });
      if (result.metrics.accuracyPass === true) passed++;
      else if (result.metrics.accuracyPass === false) failed++;
      else unchecked++;
      comparisons.push(result);
    }

    locations.push({ location, baseline, comparisons });
  }

  return {
    generatedAt,
    date: options.date,
    locations,
    sourcesRequested: options.sources,
    summary: {
      totalLocations: options.locations.length,
      availableComparisons: available,
      passedComparisons: passed,
      failedComparisons: failed,
      uncheckedComparisons: unchecked,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/comparison/orchestrator.test.ts -t "produces a report for one location and two sources"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/comparison/orchestrator.ts tests/lib/comparison/orchestrator.test.ts
git commit -m "2026-07-29: add tide comparison orchestrator"
```
