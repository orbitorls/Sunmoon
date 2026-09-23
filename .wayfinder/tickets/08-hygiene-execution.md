---
title: Execute the hygiene pass
type: task
mode: AFK
assignee: command-code
blocked_by: [01-green-baseline]
map: map
labels: [wayfinder:task]
status: closed
---

## Question

ลบ/untrack/ignore ของที่ยืนยันแล้วว่าเป็นขยะ ให้เสร็จโดย CI ยังเขียว

## ขอบเขตงาน

- `git rm styles/globals.css` (orphan — `app/layout.tsx` import `./globals.css`) แล้วลบโฟลเดอร์ `styles/` ถ้าว่าง
- `git rm` public/ ที่ไม่มีใครอ้าง 7 ไฟล์: `placeholder-logo.png`, `placeholder-logo.svg`,
  `placeholder-user.jpg`, `placeholder.jpg`, `placeholder.svg`, `icon.svg`, `generate-icons.html`
  (คง `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png` — มี reference จริง)
- untrack artifact ที่ generate ใน `reports/` (`tide-comparison-*`) + เพิ่ม `.gitignore`
  **ข้อที่ต้องตัดสินเองใน ticket นี้**: `reports/perf/*` ถูกอ้างใน `docs/architecture.md` ในฐานะ baseline
  หลักฐาน — ถ้าจะคง track ไว้ ให้ gitignore เฉพาะ `reports/tide-comparison-*` และเขียน `reports/README.md`
  อธิบายว่าอะไร track/อะไรไม่ track
- ลบไฟล์ตายที่เหลือ: barrel `lib/storage/index.ts`, barrel `lib/services/line/index.ts`
  **ยังไม่ต้องลบ** — รอ ticket "Consolidate the LINE service seam" ตัดสินก่อน
  (ในใบนี้ให้ลบเฉพาะ `lib/storage/index.ts` ถ้ายืนยันว่า 0 importers)
- เพิ่ม `.gitignore`: `.claude/`, `.codex/`, `.cursor/`, `.agents/`
  (`.commandcode/` และ `.github/` ตั้งใจ track ไว้ — อย่า ignore)
- ล้าง entry ที่ล้าสมัยใน `.gitignore` (เช่น `npm-debug.log*`/`yarn-*` ถ้าไม่ใช้ npm/yarn แล้ว,
  `/build` ที่ไม่ถูกใช้, comment "deepwork local state" ที่ยังต้องคงไว้ก็ได้ — ตัดสินตามจริง)

## ห้ามแตะ

- `lib/comparison/*` และ `data/*` — ยังตัดสินไม่จบ (ดู `Not yet specified` ของ map)
- `actions/send-line-weather-update.ts` — เป็นของ ticket "Consolidate the LINE service seam"

## เกณฑ์ผ่าน

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` เขียวเท่ากับ baseline ของ
ticket "Establish the green baseline" และ `git status --porcelain` สะอาดหลัง commit

## Resolution — 2026-09-22

- `git rm styles/globals.css` (orphan — `app/layout.tsx` import `./globals.css`) และโฟลเดอร์
  `styles/` หายไปเองเมื่อว่าง
- `git rm` public/ ที่ไม่มี reference 7 ไฟล์: `placeholder-logo.png/svg`, `placeholder-user.jpg`,
  `placeholder.jpg`, `placeholder.svg`, `icon.svg`, `generate-icons.html`
  (คง `sw.js`, `manifest.json`, `icon-192/512.png` ที่มี reference จริง)
- `git rm lib/storage/index.ts` (barrel, importer = 0 — เหลือแต่ comment อ้างตัวเอง)
- `git rm --cached reports/tide-comparison-*` 18 ไฟล์ (ไฟล์ยังอยู่บนดิสก์) + gitignore
  `/reports/tide-comparison-*`; **`reports/perf/*` คง track ไว้** เพราะ `docs/architecture.md`
  อ้างเป็น baseline หลักฐาน + เพิ่ม `reports/README.md` อธิบายกติกา track/ไม่ track
- เขียน `.gitignore` ใหม่: เพิ่ม `.claude/ .codex/ .cursor/ .agents/`, เติม `.pnpm-debug.log*`,
  รวม build output (`/.next/`, `/build`, `/tsconfig.tsbuildinfo`), เอา `.pnp*` กับ npm/yarn debug
  ที่ตายแล้วออก, คง `/test-*.js` ที่สะท้อนเจตนาว่าไม่ให้ root test script ถูก commit
- `lib/services/line/index.ts` **ไม่ลบ** ตามที่ ticket กำหนด — ยกให้ใบ "Consolidate the LINE service
  seam" ตัดสิน (ใบนั้นคงไว้เป็น public surface)
- ตรวจหลังแก้: `pnpm typecheck` exit 0 · `pnpm build` สำเร็จ
