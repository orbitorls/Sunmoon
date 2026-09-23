---
title: Execute the components restructure
type: task
mode: AFK
assignee: command-code
blocked_by: [01-green-baseline, 03-ui-kit-prune, 05-layout-convention]
map: map
labels: [wayfinder:task]
status: closed
---

## Question

ย้าย component ตาม tree ที่ ticket "Settle the layout convention for components/ and tests/"
ประกาศ และ normalize import ทั้ง repo ให้เสร็จโดย CI เขียว

## ขอบเขตงาน

- ย้ายไฟล์ตาม tree ที่ตกลง (`components/{ui,shared,features/*}`) ด้วย `git mv` เพื่อให้ history ตาม
- ลบ atom ที่ ticket "Decide the fate of the unused shadcn/ui atoms" ตัดสินให้ลบ
- แก้ชื่อคู่ `.client.tsx` ที่ไม่ตรง (`water-level-graph.tsx` ↔ `water-level-chart.client.tsx`)
  และคง pattern wrapper + `next/dynamic ssr:false`
- เปลี่ยน **127 relative import ใน 36 ไฟล์** ให้เป็น `@/` (`components/` หนักสุด: `enhanced-location-selector` 10,
  `forecast-today-panel` 7, `disaster-alert` 6; ฝั่ง lib: `services/line/index` 9,
  `line-service` 8, `comparison/index` 7, `domain/forecast-facade` 7)
- แก้ path ที่ config อ้างถึง component (`tailwind.config.ts` content globs, `components.json`,
  `app/layout.tsx` ถ้าอ้างตรง)
- **อย่าแตะ logic ภายใน component** — งานนี้ย้าย/เปลี่ยน path เท่านั้น

## เกณฑ์ผ่าน

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` เขียว (build สำคัญสุด เพราะ `next/dynamic` + route)
- `grep -r 'from "\.\./' app components lib hooks actions` ได้ 0
- ไม่มีไฟล์ใน `components/` ที่ไม่ถูกอ้างจาก `app/` ยกเว้น `ui/` ตามผล ticket ui-kit
- dev server รันได้และหน้าแรกไม่ error (ตรวจด้วยตาหรือ curl 1 ครั้ง)

## Resolution — 2026-09-22

- ย้าย **31 ไฟล์** ด้วย `git mv` (history ตาม) เข้า `components/{shared,features/{location,forecast,weather,disaster,status,tiles}}`;
  `components/disaster/` เดิมถูกลบเมื่อว่าง
- เขียน codemod ที่ rewrite import **โดยการ resolve path จริง** ไม่ใช่เดา — 83 rewrites,
  ผลลัพธ์ `../` import = **0 ทั้ง repo**
- จุดที่ codemod รอบแรกพลาดและแก้เพิ่ม (บันทึกไว้เพราะเป็นกับดักของงานแบบนี้):
  1. `./sibling` ภายในไฟล์ที่ย้ายเอง ซึ่ง sibling ย้ายไปด้วย
  2. `import("./water-level-chart.client")` ที่ถูก rename พร้อมกัน
  3. `jest.mock("../lib/harmonic/station-model")` (regex แรกไม่ครอบ `jest.mock`)
  4. `readFileSync(join(__dirname, '..', 'next.config.mjs'))` ที่ผูกกับตำแหน่งเทสต์
     → เปลี่ยนเป็น `join(process.cwd(), 'next.config.mjs')`
- ไม่แตะ logic ภายใน component — ย้าย/เปลี่ยน path เท่านั้น ตามขอบเขตที่ตกลง
- ตรวจหลังแก้: `pnpm typecheck` exit 0 · `pnpm lint` 0 errors · `pnpm test` 29/29 suites (132 tests) ·
  `pnpm build` สำเร็จ
