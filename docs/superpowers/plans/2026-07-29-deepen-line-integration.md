# Deepen the LINE Chat Integration Implementation Plan — 2026-07-29

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wide `lib/services/line-service.ts` surface with deep `lib/line/*` modules so the main handler is a thin "chat event in, response out" seam.

**Architecture:** `lib/line/location-resolver.ts` owns Thai place matching and GPS parsing, `lib/line/message-formatter.ts` owns Thai/emoji formatting, and `lib/line/dispatch-adapter.ts` owns API dispatch; `lib/services/line-service.ts` shrinks to a small `handleLineMessage` orchestrator that calls these three modules.

**Tech Stack:** TypeScript, Next.js, `@/lib/line/client.ts`, `@/lib/line/types.ts`, `@/lib/tide-service`, ts-jest.

---

### Task 1: Location Resolver

**Files:**
- Create: `lib/line/location-resolver.ts`
- Modify: `lib/services/line-service.ts:122-151`
- Test: `tests/lib/line/location-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/line/location-resolver.test.ts
import { resolveLocationFromText } from '@/lib/line/location-resolver';

describe('resolveLocationFromText', () => {
  it('resolves ภูเก็ต from a text message', () => {
    const location = resolveLocationFromText('น้ำขึ้น ภูเก็ต วันนี้');
    expect(location).not.toBeNull();
    expect(location!.name).toBe('ภูเก็ต');
    expect(location!.lat).toBe(8.627);
    expect(location!.lon).toBe(98.398);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/line/location-resolver.test.ts -t "resolves ภูเก็ต from a text message"`
Expected: FAIL with `Cannot find module '@lib/line/location-resolver'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/line/location-resolver.ts
import type { LocationData } from '@/lib/tide-service';

const LOCATION_MAP: Record<string, LocationData> = {
  'ภูเก็ต': { lat: 8.627, lon: 98.398, name: 'ภูเก็ต' },
  'ระยอง': { lat: 6.8495, lon: 101.9674, name: 'ระยอง' },
  'หาดใหญ่': { lat: 7.1973, lon: 100.4734, name: 'หาดใหญ่' },
  'สตูล': { lat: 6.6288, lon: 100.0742, name: 'สตูล' },
  'ชุมพร': { lat: 8.6682, lon: 99.1807, name: 'ชุมพร' },
  'กระบี่': { lat: 8.627, lon: 98.814, name: 'กระบี่' },
  'สงขลา': { lat: 7.1906, lon: 100.6087, name: 'สงขลา' },
  'พังงา': { lat: 8.4304, lon: 98.5298, name: 'พังงา' },
  'ตรัง': { lat: 7.5589, lon: 99.6259, name: 'ตรัง' },
  'ชลบุรี': { lat: 13.361, lon: 100.984, name: 'ชลบุรี' },
  'ระนอง': { lat: 9.969, lon: 98.629, name: 'ระนอง' },
  'บันฉุง': { lat: 11.933, lon: 100.073, name: 'บันฉุง' },
  'กำแพงแสน': { lat: 13.202, lon: 99.981, name: 'กำแพงแสน' },
  'เพชรบุรี': { lat: 12.831, lon: 99.787, name: 'เพชรบุรี' },
  'ประจวบคีรีขันธ์': { lat: 11.811, lon: 99.807, name: 'ประจวบคีรีขันธ์' },
  'เกาะสมุย': { lat: 8.6391, lon: 100.3348, name: 'เกาะสมุย' },
};

const userLocationCache = new Map<string, LocationData>();

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveLocationFromText(text: string): LocationData | null {
  const lower = text.trim().toLowerCase();
  for (const [name, data] of Object.entries(LOCATION_MAP)) {
    if (lower.includes(name.toLowerCase())) return data;
  }
  return null;
}

export function resolveLocationFromGps(
  latitude: number,
  longitude: number,
  name?: string,
): LocationData {
  return { lat: latitude, lon: longitude, name: name ?? 'ตำแหน่งปัจจุบัน' };
}

export function getCachedLocation(userId: string | null): LocationData | null {
  if (!userId) return null;
  return userLocationCache.get(userId) ?? null;
}

export function setCachedLocation(userId: string, location: LocationData): void {
  userLocationCache.set(userId, location);
}

export function getDefaultLineLocation(): LocationData {
  const lat = parseNumber(process.env.LINE_DEFAULT_LAT);
  const lon = parseNumber(process.env.LINE_DEFAULT_LON);
  const name = process.env.LINE_DEFAULT_LOCATION_NAME?.trim();
  if (lat === null || lon === null) {
    return { lat: 13.7563, lon: 100.5018, name: 'กรุงเทพมหานคร' };
  }
  return { lat, lon, name: name && name.length > 0 ? name : 'กรุงเทพมหานคร' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/line/location-resolver.test.ts -t "resolves ภูเก็ต from a text message"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/line/location-resolver.ts tests/lib/line/location-resolver.test.ts
git commit -m "2026-07-29: add deep LINE location resolver"
```

---

### Task 2: Thai Message Formatter

**Files:**
- Create: `lib/line/message-formatter.ts`
- Modify: `lib/services/line-service.ts:330-460`
- Test: `tests/lib/line/message-formatter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/line/message-formatter.test.ts
import { formatTideMessage } from '@/lib/line/message-formatter';
import type { LocationData } from '@/lib/tide-service';

describe('formatTideMessage', () => {
  it('formats a high/low tide summary in Thai for Phuket', () => {
    const location: LocationData = { lat: 8.627, lon: 98.398, name: 'ภูเก็ต' };
    const events = [
      { time: '08:30', level: 2.45, type: 'high' as const, prediction: true },
      { time: '14:40', level: 0.85, type: 'low' as const, prediction: true },
    ];
    const text = formatTideMessage(location, events);
    expect(text).toContain('ภูเก็ต');
    expect(text).toContain('🌊');
    expect(text).toContain('08:30');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/line/message-formatter.test.ts -t "formats a high/low tide summary in Thai for Phuket"`
Expected: FAIL with `Cannot find module '@lib/line/message-formatter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/line/message-formatter.ts
import type { LocationData } from '@/lib/tide-service';
import type { LineMessage } from './types';

export type TideEventLike = {
  time: string;
  level: number;
  type: 'high' | 'low';
  prediction: boolean;
};

export function formatTideMessage(location: LocationData, events: TideEventLike[]): string {
  const high = events.find((e) => e.type === 'high');
  const low = events.find((e) => e.type === 'low');
  const lines = [
    `🌊 ข้อมูลน้ำขึ้นน้ำลง – ${location.name}`,
    '',
    high ? `🌕 น้ำขึ้นสูง ${high.time} ระดับ ${high.level.toFixed(2)} ม.` : '• ยังไม่มีข้อมูลน้ำขึ้น',
    low ? `🌑 น้ำลงต่ำ ${low.time} ระดับ ${low.level.toFixed(2)} ม.` : '• ยังไม่มีข้อมูลน้ำลง',
  ];
  return lines.join('\n');
}

export function formatWeatherMessage(weather: {
  main: { temp: number; humidity: number };
  weather: Array<{ main?: string }>;
  wind: { speed: number };
}): string {
  const condition = weather.weather?.[0]?.main ?? 'ปกติ';
  return [
    '🌤️ สภาพอากาศ',
    `• อุณหภูมิ ${weather.main.temp.toFixed(1)}°C`,
    `• ความชื้น ${weather.main.humidity}%`,
    `• ลม ${weather.wind.speed.toFixed(1)} m/s – ${condition}`,
  ].join('\n');
}

export function formatErrorMessage(): LineMessage {
  return {
    type: 'text',
    text: '⚠️ ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/line/message-formatter.test.ts -t "formats a high/low tide summary in Thai for Phuket"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/line/message-formatter.ts tests/lib/line/message-formatter.test.ts
git commit -m "2026-07-29: add deep LINE Thai message formatter"
```

---

### Task 3: LINE Dispatch Adapter

**Files:**
- Create: `lib/line/dispatch-adapter.ts`
- Modify: `lib/services/line-service.ts:484-587`
- Test: `tests/lib/line/dispatch-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/line/dispatch-adapter.test.ts
import { reply } from '@/lib/line/dispatch-adapter';

jest.mock('@/lib/line/client', () => ({
  reply: jest.fn().mockResolvedValue(undefined),
  push: jest.fn().mockResolvedValue(undefined),
  broadcast: jest.fn().mockResolvedValue(undefined),
  multicast: jest.fn().mockResolvedValue(undefined),
}));

describe('dispatch-adapter reply', () => {
  it('returns a local fallback when no token is configured', async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = '';
    const result = await reply('test-token', [{ type: 'text', text: 'สวัสดี' }]);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/line/dispatch-adapter.test.ts -t "returns a local fallback when no token is configured"`
Expected: FAIL with `Cannot find module '@lib/line/dispatch-adapter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/line/dispatch-adapter.ts
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { reply as clientReply, push, broadcast, multicast } from './client';
import type { LineMessage } from './types';

async function logOfflineReply(payload: { replyToken: string; messages: LineMessage[] }) {
  const fallbackPath =
    process.env.LINE_OFFLINE_LOG_PATH || path.join(process.cwd(), '.next', 'logs', 'line-offline-replies.log');
  const directory = path.dirname(fallbackPath);
  try {
    await mkdir(directory, { recursive: true });
    const line = `${new Date().toISOString()} ${JSON.stringify(payload)}\n`;
    await appendFile(fallbackPath, line, 'utf8');
    console.log(`[LINE] Offline reply recorded at ${fallbackPath}`);
  } catch (error) {
    console.warn('[LINE] Failed to record offline reply log:', error);
  }
}

export async function reply(replyToken: string, messages: LineMessage[]): Promise<boolean> {
  try {
    await clientReply(replyToken, messages);
    return true;
  } catch (error) {
    console.error('[LINE] Reply dispatch failed:', error);
    await logOfflineReply({ replyToken, messages });
    return false;
  }
}

export async function pushMessage(userId: string, messages: LineMessage[]): Promise<boolean> {
  try {
    await push(userId, messages);
    return true;
  } catch (error) {
    console.error('[LINE] Push dispatch failed:', error);
    return false;
  }
}

export async function broadcastMessage(messages: LineMessage[]): Promise<boolean> {
  try {
    await broadcast(messages);
    return true;
  } catch (error) {
    console.error('[LINE] Broadcast dispatch failed:', error);
    return false;
  }
}

export async function multicastMessage(userIds: string[], messages: LineMessage[]): Promise<boolean> {
  try {
    await multicast(userIds, messages);
    return true;
  } catch (error) {
    console.error('[LINE] Multicast dispatch failed:', error);
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/line/dispatch-adapter.test.ts -t "returns a local fallback when no token is configured"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/line/dispatch-adapter.ts tests/lib/line/dispatch-adapter.test.ts
git commit -m "2026-07-29: add deep LINE dispatch adapter"
```

---

### Task 4: Refactor Main LINE Handler

**Files:**
- Modify: `lib/services/line-service.ts:178-209`
- Modify: `lib/services/line-service.ts:330-587`
- Test: `tests/lib/services/line-service.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/services/line-service.test.ts
import { handleLineMessage } from '@/lib/services/line-service';

describe('handleLineMessage', () => {
  it('replies with a tide forecast for a text location', async () => {
    const event = {
      type: 'message',
      replyToken: 'reply-123',
      source: { type: 'user' as const, userId: 'U123' },
      timestamp: Date.now(),
      message: { type: 'text' as const, id: 'M1', text: 'น้ำขึ้น ภูเก็ต' },
    };

    await expect(handleLineMessage(event as any)).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/services/line-service.test.ts -t "replies with a tide forecast for a text location"`
Expected: FAIL with `Cannot find module '@lib/services/line-service'` or `Cannot find module '@/lib/line/dispatch-adapter'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/services/line-service.ts
import {
  resolveLocationFromText,
  resolveLocationFromGps,
  setCachedLocation,
  getCachedLocation,
  getDefaultLineLocation,
} from '@/lib/line/location-resolver';
import { formatTideMessage, formatErrorMessage } from '@/lib/line/message-formatter';
import { reply } from '@/lib/line/dispatch-adapter';
import type { LineEventMessage, LineMessage } from '@/lib/line/types';

export interface LineEvent {
  type: string;
  message?: {
    type: string;
    text?: string;
    latitude?: number;
    longitude?: number;
    title?: string;
  };
  replyToken: string;
  source?: {
    userId?: string;
  };
}

export async function handleLineMessage(event: LineEvent): Promise<void> {
  try {
    if (!event.message) return;
    const userId = event.source?.userId || null;
    const messages: LineMessage[] = [];

    if (event.message.type === 'text') {
      let location = resolveLocationFromText(event.message.text || '');
      if (!location && userId) {
        location = getCachedLocation(userId) ?? getDefaultLineLocation();
      }
      if (!location) {
        messages.push({ type: 'text', text: '❓ กรุณาระบุชื่อสถานที่ เช่น ภูเก็ต หรือ ส่งตำแหน่งมา' });
      } else {
        if (userId) setCachedLocation(userId, location);
        messages.push({ type: 'text', text: formatTideMessage(location, []) });
      }
    } else if (event.message.type === 'location') {
      const location = resolveLocationFromGps(
        event.message.latitude ?? 0,
        event.message.longitude ?? 0,
        event.message.title,
      );
      if (userId) setCachedLocation(userId, location);
      messages.push({ type: 'text', text: formatTideMessage(location, []) });
    } else {
      messages.push({ type: 'text', text: '⚠️ ยังรับเฉพาะข้อความหรือตำแหน่ง' });
    }

    if (messages.length > 0) {
      await reply(event.replyToken, messages);
    }
  } catch (error) {
    console.error('❌ Error handling LINE message:', error);
    await reply(event.replyToken, [formatErrorMessage()]);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/services/line-service.test.ts -t "replies with a tide forecast for a text location"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/services/line-service.ts tests/lib/services/line-service.test.ts
git commit -m "2026-07-29: thin LINE service handler uses deep modules"
```
