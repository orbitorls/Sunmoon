---
title: Establish the green baseline
type: task
mode: AFK
assignee: command-code
blocked_by: []
map: map
labels: [wayfinder:task]
status: closed
---

## Question

CI gate วันนี้เขียวหรือแดง? ต้องรู้ก่อนลบหรือย้ายอะไรทั้งสิ้น เพราะถ้าแดงอยู่แล้ว
งาน cleanup จะถูกกล่าวหาว่าทำพังไม่ได้

## สิ่งที่ต้องทำ

รันตามลำดับ และบันทึกผลจริงทีละคำสั่ง (ไม่ใช่แค่ผ่าน/ไม่ผ่าน):

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`
5. `pnpm build`

## สิ่งที่ต้องบันทึกใน resolution

- สถานะของแต่ละคำสั่ง + exit code
- ถ้า fail: ชื่อ test ที่ fail / error ของ tsc หรือ eslint ฉบับย่อ
- ระยะเวลา build และคำเตือนที่โผล่ (deprecation warning ของ Next สำคัญต่อ ticket "Validate the config-hardening set…")
- วาง log ไว้ที่ `reports/baseline-<date>.md` แล้วอ้างเป็น context pointer

## หมายเหตุที่พบระหว่าง charting

- `tests/scripts/calibrate-pilots.test.ts` ไม่ใช่ test ของ script ที่ไม่มีอยู่ —
  ข้างในทดสอบ `lib/comparison/tide-calibration-apply` ผ่าน relative import
  (คือ "ถูกจัดผิดที่" ไม่ใช่ "test ผี") เก็บไว้ใช้ตอน layout
- `pnpm build` ต้องเน็ตได้ (next/font/google โหลด Sarabun) — ถ้า offline แล้ว fail ให้ระบุว่าเป็นข้อจำกัดของ environment ไม่ใช่ baseline แดง

## Resolution — 2026-09-22

Baseline วัดตอน tree ยังสะอาด (ก่อนลบ/ย้ายอะไรทั้งสิ้น) — **เขียวทั้งชุด**:

| คำสั่ง | ผล |
| --- | --- |
| `pnpm install --frozen-lockfile` | ผ่าน (Already up to date) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` (`next lint` ขณะนั้น) | exit 0 — warnings ล้วน ไม่มี error |
| `pnpm test` | **29 suites / 132 tests ผ่านทั้งหมด** (~77 วิ) |
| `pnpm build` | สำเร็จ — 15 routes, First Load JS ร่วม 102 kB |

ข้อสังเกต: เครื่องนี้รัน node **v24.16.0** แต่ `engines` ประกาศ `>=18.18 <22` → pnpm ออก warning
ทุกคำสั่ง (CI ใช้ node 20 จึงไม่กระทบ) ไม่ได้แก้ในรอบนี้เพราะเป็นการเปลี่ยน runtime ของผู้ใช้เอง
