---
title: Consolidate the LINE service seam
type: grilling
mode: HITL
assignee: command-code
blocked_by: []
map: map
labels: [wayfinder:grilling]
status: closed
---

## Question

`lib/services/line-service.ts` (57 บรรทัด re-export barrel ซ้ำกับ `lib/services/line/*`) ควรอยู่หรือตาย?

## ข้อเท็จจริงที่ยืนยันแล้ว

- `lib/services/line-service.ts` = 57 บรรทัด, **3 importers**: `app/api/webhook/line/route.ts`,
  `app/api/line/weather-update/route.ts`, `actions/send-line-weather-update.ts`
  (ตัวหลังสุดมี importer 0 → ถ้าลบ barrel ต้องพิจารณา action นี้พร้อมกัน)
- `lib/services/line/` มี 11 ไฟล์ (17–382 บรรทัด): `client`, `config`, `index`, `message-builder`,
  `message-handler`, `reply`, `signature`, `subscriber-store`, `types`, `weather-dispatch` ฯลฯ
- `lib/services/line/index.ts` (barrel 24 บรรทัด) **ไม่มี consumer** — น่าจะมีไว้ให้ `line-service.ts` re-export
- ประวัติ: recon เดิมระบุว่า webhook กับ dispatch ใช้คนละชุด (seam ซ้ำจริง)

## ประเด็นที่ต้องตัดสิน

1. ให้ consumer อ้าง `lib/services/line/*` ตรง ๆ แล้วลบ `line-service.ts` หรือคง barrel เป็น public surface
2. ถ้าลบ: `lib/services/line/index.ts` ควรเก็บเป็น public surface ของ feature (แล้วให้ route อ้าง
   `@/lib/services/line`) หรือลบทั้งคู่แล้วให้อ้าง path ของโมดูลจริง
3. `actions/send-line-weather-update.ts` (importer 0) — เป็น server action ที่ไม่มีใครเรียก
   ควรลบ หรือตั้งใจเก็บไว้เป็น API ให้ LINE เรียก

## ➡️ คำแนะนำ

ลบ `line-service.ts` + ให้ consumer ทั้ง 3 อ้าง `@/lib/services/line` (barrel เดียว) — เหลือ seam เดียว
คือ `lib/services/line/index.ts` เป็น public surface ของ feature; และลบ
`actions/send-line-weather-update.ts` ถ้ายืนยันว่าไม่มีใครเรียก (เป็น server action ⇒ ต้องมี import จริง)

## Resolution — 2026-09-22

- ลบ `lib/services/line-service.ts` (barrel 57 บรรทัด) — consumer ที่ยัง live ทั้ง 2
  (`app/api/webhook/line/route.ts`, `app/api/line/weather-update/route.ts`) เปลี่ยนมาอ้าง
  `@/lib/services/line` ⇒ **เหลือ seam เดียว**; ชื่อที่ import ใช้อยู่ (handleLineMessage,
  sendWelcomeMessage, verifyLineSignature, getDefaultLineLocation, getLineDispatchToken,
  dispatchWeatherUpdate) ถูก export จาก barrel อยู่แล้ว จึงไม่ต้องแก้ที่อื่น
- ลบ `actions/send-line-weather-update.ts` — ยืนยัน 0 importers (server action ต้องถูก import
  จึงจะเรียกได้) จึงเป็น dead code จริง
- ตรวจหลังแก้: `pnpm typecheck` exit 0 · `pnpm lint` 0 errors

**ข้อสังเกตที่เหลือ (ไม่ทำในรอบนี้)**: `lib/services/line/index.ts` เป็น `export *` ทั้ง 9 โมดูล
รวมถึง `client.ts` ที่ควรเป็น internal — ถ้าต้องการ surface แคบกว่านี้ให้เปิดใบใหม่
