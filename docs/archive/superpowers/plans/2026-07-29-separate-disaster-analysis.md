# Separate Analysis and Presentation in Disaster Risk Implementation Plan — 2026-07-29

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `lib/disaster-analysis.ts` into a deep, narrow analysis module and a thin Thai presentation adapter so analysis logic is not fused with formatting.

**Architecture:** `lib/domain/disaster-analysis.ts` owns thresholds, monsoon logic, and returns a normalized `DisasterRiskAnalysis`; `lib/presentation/disaster-formatter.ts` adapts that result into Thai headline, color, and text; `lib/disaster-analysis.ts` becomes a compatibility shim that re-exports the public API.

**Tech Stack:** TypeScript, Next.js, `@/lib/tide-service`, ts-jest.

---

### Task 1: Deep Disaster Analysis Domain

**Files:**
- Create: `lib/domain/disaster-analysis.ts`
- Modify: `lib/disaster-analysis.ts:362-594`
- Test: `tests/lib/domain/disaster-analysis.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/domain/disaster-analysis.test.ts
import { analyzeDisasterRisk, type DisasterRiskAnalysis } from '@/lib/domain/disaster-analysis';
import type { TideData, WeatherData } from '@/lib/tide-service';

describe('analyzeDisasterRisk', () => {
  it('returns low risk for calm conditions', () => {
    const tide: TideData = {
      isWaxingMoon: true,
      lunarPhaseKham: 8,
      tideStatus: 'น้ำตาย',
      highTideTime: '08:30',
      lowTideTime: '14:30',
      isSeaLevelHighToday: false,
      currentWaterLevel: 1.2,
      waterLevelStatus: 'ปกติ',
      waterLevelReference: 'MSL',
      seaLevelRiseReference: 'MSL',
      pierDistance: 0,
      pierReference: 'MSL',
      tideEvents: [
        { time: '08:30', level: 1.8, type: 'high', prediction: true },
        { time: '14:30', level: 0.6, type: 'low', prediction: true },
      ],
      timeRangePredictions: [],
      graphData: [],
      apiStatus: 'success',
      apiStatusMessage: 'ok',
      lastUpdated: new Date().toISOString(),
    } as TideData;
    const weather: WeatherData = {
      main: { temp: 30, feels_like: 32, humidity: 70, pressure: 1010 },
      weather: [{ description: 'clear', icon: '01d' }],
      wind: { speed: 2, deg: 90 },
      name: 'ภูเก็ต',
    };

    const result = analyzeDisasterRisk(tide, weather, new Date('2026-07-29'), 'ภูเก็ต');
    expect(result.riskLevel).toBe('low');
    expect(result.overallRating).toBeLessThanOrEqual(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/domain/disaster-analysis.test.ts -t "returns low risk for calm conditions"`
Expected: FAIL with `Cannot find module '@lib/domain/disaster-analysis'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/domain/disaster-analysis.ts
import type { TideData, WeatherData } from '@/lib/tide-service';

export type DisasterType =
  | 'flood'
  | 'storm_surge'
  | 'high_tide'
  | 'erosion'
  | 'rip_current'
  | 'none';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskFactor = {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  description: string;
  contributeToRisk: boolean;
  riskContribution: number;
};

export type DisasterInfo = {
  type: DisasterType;
  probability: number;
  causes: string[];
  impactAreas: string[];
};

export type DisasterRiskAnalysis = {
  riskLevel: RiskLevel;
  overallRating: number;
  disasters: DisasterInfo[];
  factors: RiskFactor[];
  riskTimeSlots: Array<{ startTime: string; endTime: string; riskLevel: RiskLevel; tideLevel: number }>;
  headline: string | null;
  warnings: string[];
  location: string;
  timestamp: string;
};

const THRESHOLDS = {
  HIGH_TIDE_LEVEL: 2.5,
  CRITICAL_TIDE_LEVEL: 3.0,
  HIGH_WIND_SPEED: 8,
  STORM_WIND_SPEED: 15,
  LOW_PRESSURE: 1005,
  CRITICAL_PRESSURE: 995,
  HIGH_TIDE_RANGE: 2.0,
};

function getMonsoonSeason(date: Date): { season: 'southwest' | 'northeast' | 'transition'; riskMultiplier: number } {
  const month = date.getMonth() + 1;
  if (month >= 5 && month <= 10) return { season: 'southwest', riskMultiplier: 1.3 };
  if (month >= 11 || month <= 2) return { season: 'northeast', riskMultiplier: 1.2 };
  return { season: 'transition', riskMultiplier: 1.0 };
}

function getMaxHighTide(tide: TideData): number {
  const highs = tide.tideEvents.filter((e) => e.type === 'high');
  if (highs.length === 0) return 0;
  return Math.max(...highs.map((e) => e.level));
}

export function analyzeDisasterRisk(
  tide: TideData,
  weather: WeatherData,
  date: Date,
  location: string,
): DisasterRiskAnalysis {
  const highLevel = getMaxHighTide(tide);
  const { riskMultiplier } = getMonsoonSeason(date);
  const windRisk = weather.wind.speed >= THRESHOLDS.STORM_WIND_SPEED ? 30 :
    weather.wind.speed >= THRESHOLDS.HIGH_WIND_SPEED ? 15 : 0;
  const pressureRisk = weather.main.pressure <= THRESHOLDS.CRITICAL_PRESSURE ? 20 :
    weather.main.pressure <= THRESHOLDS.LOW_PRESSURE ? 10 : 0;
  const tideRisk = highLevel >= THRESHOLDS.CRITICAL_TIDE_LEVEL ? 40 :
    highLevel >= THRESHOLDS.HIGH_TIDE_LEVEL ? 25 : 0;
  const springRisk = tide.tideStatus === 'น้ำเป็น' ? 10 : 0;

  const overallRating = Math.min(
    100,
    Math.round((tideRisk + windRisk + pressureRisk + springRisk) * riskMultiplier),
  );

  const riskLevel: RiskLevel =
    overallRating >= 80 ? 'critical' :
    overallRating >= 60 ? 'high' :
    overallRating >= 30 ? 'medium' : 'low';

  const factors: RiskFactor[] = [
    { id: 'high-tide', name: 'ระดับน้ำขึ้น', value: highLevel, unit: 'm', description: 'ระดับน้ำขึ้นสูงสุดของวัน', contributeToRisk: highLevel >= THRESHOLDS.HIGH_TIDE_LEVEL, riskContribution: tideRisk },
    { id: 'wind', name: 'ความเร็วลม', value: weather.wind.speed, unit: 'm/s', description: 'ความเร็วลมเฉลี่ย', contributeToRisk: weather.wind.speed >= THRESHOLDS.HIGH_WIND_SPEED, riskContribution: windRisk },
    { id: 'pressure', name: 'ความกดอากาศ', value: weather.main.pressure, unit: 'hPa', description: 'ความกดอากาศ', contributeToRisk: weather.main.pressure <= THRESHOLDS.LOW_PRESSURE, riskContribution: pressureRisk },
  ];

  const disasters: DisasterInfo[] = [];
  if (highLevel >= THRESHOLDS.HIGH_TIDE_LEVEL && weather.wind.speed >= THRESHOLDS.HIGH_WIND_SPEED) {
    disasters.push({ type: 'storm_surge', probability: overallRating, causes: ['น้ำหนุนสูง', 'ลมแรง'], impactAreas: ['ชายฝั่งท่าเรือ'] });
  } else if (highLevel >= THRESHOLDS.HIGH_TIDE_LEVEL) {
    disasters.push({ type: 'high_tide', probability: overallRating, causes: ['น้ำหนุนสูง'], impactAreas: ['ท่าเทียบเรือ'] });
  } else {
    disasters.push({ type: 'none', probability: 0, causes: [], impactAreas: [] });
  }

  return {
    riskLevel,
    overallRating,
    disasters,
    factors,
    riskTimeSlots: tide.tideEvents.map((e) => ({
      startTime: e.time,
      endTime: e.time,
      riskLevel: e.level >= THRESHOLDS.HIGH_TIDE_LEVEL ? 'medium' : 'low',
      tideLevel: e.level,
    })),
    headline: null,
    warnings: overallRating >= 60 ? ['ควรหลีกเลี่ยงชายฝั่ง'] : [],
    location,
    timestamp: date.toISOString(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/domain/disaster-analysis.test.ts -t "returns low risk for calm conditions"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/domain/disaster-analysis.ts tests/lib/domain/disaster-analysis.test.ts
git commit -m "2026-07-29: add deep disaster-risk analysis module"
```

---

### Task 2: Thai Disaster Formatter

**Files:**
- Create: `lib/presentation/disaster-formatter.ts`
- Modify: `lib/disaster-analysis.ts:595-990`
- Test: `tests/lib/presentation/disaster-formatter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/presentation/disaster-formatter.test.ts
import { formatDisasterView, type ThaiDisasterView } from '@/lib/presentation/disaster-formatter';
import type { DisasterRiskAnalysis } from '@/lib/domain/disaster-analysis';

describe('formatDisasterView', () => {
  it('renders a Thai view for a high tide risk', () => {
    const analysis: DisasterRiskAnalysis = {
      riskLevel: 'high',
      overallRating: 65,
      disasters: [{ type: 'high_tide', probability: 65, causes: ['น้ำหนุนสูง'], impactAreas: ['ท่าเทียบเรือ'] }],
      factors: [{ id: 't', name: 'ระดับน้ำขึ้น', value: 2.6, unit: 'm', description: '', contributeToRisk: true, riskContribution: 25 }],
      riskTimeSlots: [{ startTime: '08:30', endTime: '08:30', riskLevel: 'medium', tideLevel: 2.6 }],
      headline: null,
      warnings: ['ควรหลีกเลี่ยงชายฝั่ง'],
      location: 'ภูเก็ต',
      timestamp: new Date().toISOString(),
    };
    const view = formatDisasterView(analysis);
    expect(view.headline).toContain('ภูเก็ต');
    expect(view.riskText).toContain('สูง');
    expect(view.color.border).toContain('red');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/presentation/disaster-formatter.test.ts -t "renders a Thai view for a high tide risk"`
Expected: FAIL with `Cannot find module '@lib/presentation/disaster-formatter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/presentation/disaster-formatter.ts
import type { DisasterRiskAnalysis, RiskLevel } from '@/lib/domain/disaster-analysis';

export type ThaiDisasterView = {
  headline: string;
  riskText: string;
  color: { bg: string; text: string; border: string };
  description: string;
  actions: string[];
};

export function getRiskLevelText(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'ต่ำ';
    case 'medium': return 'ปานกลาง';
    case 'high': return 'สูง';
    case 'critical': return 'วิกฤติ';
  }
}

export function getRiskLevelColor(level: RiskLevel): { bg: string; text: string; border: string } {
  switch (level) {
    case 'low': return { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-400' };
    case 'medium': return { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-400' };
    case 'high': return { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-400' };
    case 'critical': return { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-400' };
  }
}

export function formatDisasterHeadline(analysis: DisasterRiskAnalysis): string {
  const levelText = getRiskLevelText(analysis.riskLevel);
  return `${analysis.location} – ความเสี่ยง${levelText} (${analysis.overallRating}/100)`;
}

export function formatDisasterView(analysis: DisasterRiskAnalysis): ThaiDisasterView {
  const levelText = getRiskLevelText(analysis.riskLevel);
  const color = getRiskLevelColor(analysis.riskLevel);
  const mainRisk = analysis.disasters.find((d) => d.type !== 'none');
  const description = mainRisk
    ? `เสี่ยง${mainRisk.type === 'high_tide' ? 'น้ำหนุนสูง' : mainRisk.type === 'storm_surge' ? 'คลื่นพายุซัดฝั่ง' : 'ภัยพิบัติ'} จาก ${mainRisk.causes.join(', ')}`
    : 'สถานการณ์ปกติ';

  const headline = formatDisasterHeadline(analysis);
  const actions = analysis.warnings.length > 0
    ? analysis.warnings
    : ['สามารถทำกิจกรรมริมทะเลได้ตามปกติ'];

  return {
    headline,
    riskText: `ระดับความเสี่ยง: ${levelText}`,
    color,
    description,
    actions,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/presentation/disaster-formatter.test.ts -t "renders a Thai view for a high tide risk"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/presentation/disaster-formatter.ts tests/lib/presentation/disaster-formatter.test.ts
git commit -m "2026-07-29: add Thai disaster presentation formatter"
```

---

### Task 3: Compatibility Re-export Shim

**Files:**
- Modify: `lib/disaster-analysis.ts:1-110`
- Test: `tests/lib/disaster-analysis-shim.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/disaster-analysis-shim.test.ts
import { analyzeDisasterRisk, formatDisasterView, getRiskLevelText } from '@/lib/disaster-analysis';

describe('disaster-analysis shim', () => {
  it('re-exports the analysis and presentation entry points', () => {
    expect(typeof analyzeDisasterRisk).toBe('function');
    expect(typeof formatDisasterView).toBe('function');
    expect(getRiskLevelText('high')).toBe('สูง');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/disaster-analysis-shim.test.ts -t "re-exports the analysis and presentation entry points"`
Expected: FAIL with `Cannot find module '@/lib/disaster-analysis'` or `formatDisasterView is not a function`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/disaster-analysis.ts
export { analyzeDisasterRisk, type DisasterRiskAnalysis, type DisasterInfo, type RiskFactor, type RiskLevel } from '@/lib/domain/disaster-analysis';
export {
  formatDisasterView,
  formatDisasterHeadline,
  getRiskLevelText,
  getRiskLevelColor,
  type ThaiDisasterView,
} from '@/lib/presentation/disaster-formatter';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/disaster-analysis-shim.test.ts -t "re-exports the analysis and presentation entry points"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/disaster-analysis.ts tests/lib/disaster-analysis-shim.test.ts
git commit -m "2026-07-29: make disaster-analysis.ts a compatibility re-export shim"
```
