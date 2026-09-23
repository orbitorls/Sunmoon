---
title: Decide the fate of the unused shadcn/ui atoms
type: grilling
mode: HITL
assignee: user + command-code
blocked_by: []
map: map
labels: [wayfinder:grilling]
status: closed
---

## Question

UI kit ทั้งชุด (44 atom ใน `components/ui/`) ควรเก็บไว้ครบเพื่ออนาคต หรือเก็บเฉพาะตัวที่มี importer?

## ข้อเท็จจริงที่ยืนยันแล้ว

- **ไม่มี importer เลย 21 ไฟล์**: `sidebar` (710 บรรทัด), `menubar`, `context-menu`, `command`,
  `navigation-menu`, `alert-dialog`, `breadcrumb`, `pagination`, `table`, `input-otp`,
  `toggle-group`, `resizable`, `scroll-area`, `avatar`, `radio-group`, `hover-card`,
  `checkbox`, `sonner`, `toaster`, `textarea`, `aspect-ratio`
- **ตายต่อเนื่อง** (มี importer เพียง 1 แต่ importer นั้นตายเอง): `toggle` (← toggle-group),
  `hooks/use-mobile.tsx` (← sidebar), `hooks/use-toast.ts` (← toaster), `ui/toast.tsx` (← toaster)
- รวม ≈ 2,300 บรรทัด และ `sidebar` เป็นตัวเดียวที่ดึง `use-mobile` เข้ามา
- ตัวที่ยัง live: `button` (17 importers), `card` (15), `badge` (12), `collapsible` (6),
  `input` (4) และอื่น ๆ ที่มี ≥1
- การลบจะทำให้ dependency หลายตัวไม่มีคนใช้ — `@radix-ui/*` ส่วนใหญ่, `cmdk`, `input-otp`,
  `react-resizable-panels`, `sonner`, `react-day-picker` (บางส่วน)

## ประเด็นที่ต้องตัดสิน

1. นโยบาย: "kit ต้องครบไว้ก่อน เผื่ออนาคตใช้" หรือ "เก็บเท่าที่เรียกใช้จริง"
2. ถ้าลบ: ลบทั้ง 21 + cluster ตายต่อเนื่อง และตามด้วย prune dependency ที่เหลือไม่มีคนใช้
   หรือลบเฉพาะที่ชัดเจนว่าตายและยังไม่ prune dep
3. `sonner` กับ `toast`/`toaster` เป็นระบบ toast ซ้อนกัน — ตัดสินว่าอันไหนคืออนาคตของโปรเจค (ถ้ามี)

## ➡️ คำแนะนำ

ลบ cluster ที่ตายทั้งหมด (impoter = 0 ทั้งทางตรงและทางอ้อม) แล้วคง atom ที่มี importer ≥1 ไว้
จากนั้นให้ ticket "Execute the config hardening" เป็นคน prune dependency ตามผลของที่นี่
และบันทึกนโยบายเป็นบรรทัดเดียวใน `CONTEXT.md`/README ว่า "UI kit เก็บเท่าที่ใช้"

## ผลลัพธ์กำหนด

- `blocked_by` ของ ticket "Execute the components restructure"
- ขอบเขตการ prune dependency ของ ticket "Execute the config hardening"

## Resolution — 2026-09-22 (ผู้ใช้ตัดสิน: "ลบ + prune dep")

- วิเคราะห์ importer ใหม่ด้วยการ resolve path จริง (ไม่ใช้รายการจากการ chart) เพื่อไม่ให้ลบของที่ยังใช้
  → ยืนยันชุดที่ตาย: 21 atom ที่ importer=0 + cluster ตายต่อเนื่องอีก 4 ไฟล์
  (`toast.tsx`, `toggle.tsx`, `hooks/use-toast.ts`, `hooks/use-mobile.tsx`) = **25 ไฟล์ ≈ 2,480 บรรทัด**
- ลบด้วย `git rm`; `components/ui/` เหลือ **21 atom** ที่มี importer จริง และ `hooks/` เหลือ 5 ไฟล์ที่ใช้จริง
- **บทเรียนจากงานนี้**: สคริปต์รายงานว่า `lib/harmonic/index.ts` และ `lib/services/line/index.ts`
  มี importer=0 ด้วย แต่เป็น **false positive** (โค้ด import แบบชี้โฟลเดอร์ `@/lib/harmonic` แล้ว resolve
  ไป `index.ts`) — ทั้งสองไฟล์ยังถูกใช้จริง จึงไม่ถูกลบ
- Prune dependency เฉพาะตระกูลที่อนุมัติและตรวจการใช้งานจริงทุกรายการ → ลบ **16 ตัว**
  (`pnpm remove` → Packages: -16): radix 13 ตัว (`alert-dialog`, `aspect-ratio`, `avatar`, `checkbox`,
  `context-menu`, `hover-card`, `menubar`, `navigation-menu`, `radio-group`, `scroll-area`, `toast`,
  `toggle`, `toggle-group`) + `cmdk`, `input-otp`, `react-resizable-panels`
- **`sonner` ไม่ถูกลบ** แม้ wrapper `components/ui/sonner.tsx` จะตาย — เพราะ
  `components/shared/quick-actions.tsx` import `toast` จาก sonner จริง (ตรวจก่อนลบทุกครั้ง)
- ตรวจหลังแก้: `typecheck` 0 · `lint` 0 errors (51 warnings) · `test` 29/29 suites / 132 tests ·
  `build` ผ่าน · `pnpm install --frozen-lockfile` = up to date
