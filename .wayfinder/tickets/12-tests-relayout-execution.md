---
title: Execute the tests/ re-layout
type: task
mode: AFK
assignee: command-code
blocked_by: [01-green-baseline, 05-layout-convention]
map: map
labels: [wayfinder:task]
status: closed
---

## Question

ย้าย test ตาม convention ที่ ticket "Settle the layout convention for components/ and tests/"
ประกาศ และแก้ import ให้เป็น `@/`

## ขอบเขตงาน

- `git mv` ไฟล์ test ที่วางที่ root ของ `tests/` (16 ไฟล์: `community-observations`, `disaster-analysis`,
  `ephemerides`, `forecast-degraded-regression`, `forecast-provenance-regression`, `harmonic-fit`,
  `harmonic-integration`, `harmonic-tide-core`, `next-config-headers`, `thailand-time`,
  `tide-calibration-apply`, `tide-comparison`, `tide-validation-events`, `tile-packaging`,
  `worldtides-client` ฯลฯ) เข้าโฟลเดอร์ตาม module ของ source
- ย้าย `tests/scripts/calibrate-pilots.test.ts` → `tests/lib/comparison/tide-calibration-apply.test.ts`
  (ข้างในทดสอบ `lib/comparison/tide-calibration-apply` ไม่ใช่ script)
- เปลี่ยน relative import ในเทสต์ (`../../lib/...`) เป็น `@/`
- ปรับ `package.json` (jest `roots`/`testRegex`) หรือ `tsconfig.jest.json` เฉพาะเท่าที่จำเป็น
- ถ้ามีเทสต์ที่ `next-config-headers.test.ts` ผูกกับ `next.config.mjs` ต้องรันหลัง ticket
  "Execute the config hardening" เพื่อไม่ให้ชนกัน — ถ้าไฟล์ config ยังถูกแก้ ให้ประสาน/เลื่อน

## เกณฑ์ผ่าน

`pnpm test` เขียว และ **จำนวน test ไม่ลดลง** เทียบกับ baseline ของ ticket "Establish the green baseline"
(ยกเว้นที่ ticket อื่นตัดสินให้ลบจริง)

## Resolution — 2026-09-22

- ย้าย **26 ไฟล์** test ด้วย `git mv` เข้าโฟลเดอร์ที่ mirror source โดยคง basename เดิม เช่น
  `tests/harmonic-fit.test.ts` → `tests/lib/harmonic/harmonic-fit.test.ts`,
  `tests/line/*` → `tests/lib/services/line/*`, `tests/next-config-headers.test.ts` → `tests/config/`,
  `tests/tide-validation-events.test.ts` → `tests/data/`,
  `tests/components/forecast-trust-strip.test.tsx` → `tests/components/features/forecast/`;
  ลบโฟลเดอร์ `tests/{line,services,scripts}` ที่ว่าง
- **ไม่ต้องแก้ jest config** — `roots: ["<rootDir>/tests"]` + `testRegex` เดิมรองรับ path ซ้อนอยู่แล้ว
- หลังย้ายรอบแรกล้ม 2 suite (128/132 tests) เพราะ path ที่ผูกกับตำแหน่งไฟล์:
  - `jest.mock("../lib/harmonic/station-model")` → `jest.mock("@/lib/harmonic/station-model")`
  - `tests/config/next-config-headers.test.ts`: `join(__dirname, '..', 'next.config.mjs')`
    → `join(process.cwd(), 'next.config.mjs')`
- ตรวจหลังแก้: **29 suites / 132 tests ผ่าน** — จำนวนเท่า baseline (ไม่ลดลง)
