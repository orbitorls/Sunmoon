---
title: Settle the layout convention for components/ and tests/
type: grilling
mode: HITL
assignee: command-code
blocked_by: []
map: map
labels: [wayfinder:grilling]
status: closed
---

## Question

ต้นไม้ปลายทางของ `components/` และ `tests/` หน้าตาอย่างไรกันแน่? (ตกลงหลักการแล้วว่า
`components/{ui,shared,features/*}` + ไฟล์ kebab-case — ticket นี้คือการลงรายละเอียดให้
ย้ายได้โดยไม่ต้องเดาอีก)

## ประเด็นที่ต้องตัดสิน

1. **Mapping ของ 25 component** (นอก `ui/`) เข้า `ui/ shared/ features/{location,forecast,weather,disaster,status,tiles}`
   ข้อที่กำกวมและต้องฟันธง: `stat-card`, `api-status-dashboard`, `quick-actions`, `settings-panel`,
   `theme-provider`, `theme-toggle`, `service-worker-registration` (shared?) ·
   `risk-area-map` + `.client` (disaster หรือ location?) · `water-level-graph`, `tide-status-hero`,
   `forecast-today-panel`, `multi-day-forecast`, `forecast-trust-strip` (forecast?) ·
   `historical-events-panel` (features/history ใหม่ หรือ disaster?) · `weather-trends` (weather?) ·
   `tile-management-panel` (tiles?)
2. **`components/disaster/` 6 ไฟล์ที่มีอยู่** — กลืนเข้า `features/disaster/` แล้ว flatten
   หรือคง sub-structure ของ section ไว้
3. **convention `.client.tsx`** — ยืนยันว่าคือ "wrapper (server/state) + inner ที่โหลดด้วย
   `next/dynamic ssr:false`" และแก้คู่ที่ชื่อไม่ตรง: `water-level-graph.tsx` ↔ `water-level-chart.client.tsx`
   (ควรเป็น `water-level-graph.client.tsx` หรือย้าย wrapper ไปชื่อ `water-level-chart.tsx`?)
4. **`tests/`** — จะ mirror path ของ source หรือไม่? ตอนนี้มี `tests/lib/domain/`, `tests/line/`,
   `tests/services/`, `tests/components/`, `tests/scripts/` อยู่แล้ว แต่มี 16 ไฟล์วางที่ root ของ `tests/`
   และ `tests/scripts/calibrate-pilots.test.ts` จริง ๆ ทดสอบ `lib/comparison/tide-calibration-apply`

## ➡️ คำแนะนำ

- Tree: `components/{ui, shared, features/{location,forecast,weather,disaster,status,tiles}}`
  โดย `shared/` = ของกลางที่ไม่ผูก feature (theme, stat-card, service-worker-registration,
  quick-actions, settings-panel), `features/disaster/` รับทั้ง `disaster-alert`, `real-time-disaster-panel`,
  `risk-area-map(+.client)` และ section ทั้ง 6
- `.client.tsx` = inner ที่ lazy-load; เปลี่ยนชื่อคู่ที่ไม่ตรงให้ตรงกัน
- `tests/` mirror path ของ source: ย้าย 16 ไฟล์ที่ root เข้าโฟลเดอร์ตาม module ของมัน
  และย้าย `tests/scripts/calibrate-pilots.test.ts` → `tests/lib/comparison/tide-calibration-apply.test.ts`
- เขียน tree ที่ตกลงเป็น `docs/` หรือ `CONTEXT.md` บรรทัดสั้น ๆ เพื่อให้คนถัดไปยึดได้

## ผลลัพธ์กำหนด

- `blocked_by` ของ ticket "Execute the components restructure" และ "Execute the tests/ re-layout"
- ปลด fog สองข้อใน map: `lib/comparison/*` เป็น runtime หรือ tooling, และ hook layer ควร co-locate ไหม

## Resolution — 2026-09-22 (ตัดสินโดย assistant ตามที่ผู้ใช้สั่ง "จัดการเลย")

Tree ปลายทางที่ใช้จริง:

```
components/
├── ui/                    (44 shadcn atom — ไม่ย้าย)
├── shared/                stat-card, theme-provider, theme-toggle,
│                          service-worker-registration, quick-actions, settings-panel
└── features/
    ├── location/          enhanced-location-selector, favorite-locations,
    │                      map-selector, map-selector.client
    ├── forecast/          forecast-today-panel, forecast-trust-strip, multi-day-forecast,
    │                      tide-status-hero, water-level-graph, water-level-graph.client
    ├── weather/           weather-trends
    ├── disaster/          disaster-alert, real-time-disaster-panel, risk-area-map(+.client),
    │                      historical-events-panel, safety-tips + 6 sections เดิมใน disaster/
    ├── status/            api-status-dashboard
    └── tiles/             tile-management-panel
```

สิ่งที่ตัดสินเพิ่มจากที่ chart ไว้ (บันทึกให้ตรวจได้):
- **ไม่สร้าง `features/history/`** — มี historical-events-panel ไฟล์เดียว จึงรวมเข้า
  `features/disaster/` (historical context ของภัยพิบัติ) แทนการทำโฟลเดอร์ไฟล์เดียว
- `features/status/` ได้ `api-status-dashboard` (ไม่งั้นโฟลเดอร์ที่อนุมัติไว้จะว่างเปล่า)
- `safety-tips.tsx` ตกหล่นจาก mapping แรก → `features/disaster/`
- `.client.tsx` = inner ที่โหลดด้วย `next/dynamic ssr:false`; คู่ชื่อไม่ตรงถูกแก้เป็น
  `water-level-graph.client.tsx` และ wrapper อัปเดต dynamic import ตาม
- `tests/` mirror path ของ source โดย **คง basename เดิม** (ไม่ rename ไฟล์ test)

**กติกาที่บังคับใช้**: ไฟล์ kebab-case · export component PascalCase · import ผ่าน `@/` (0 `../` ทั้ง repo)
