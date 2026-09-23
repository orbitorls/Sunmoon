---
title: Execute the config hardening
type: task
mode: AFK
assignee: command-code
blocked_by: [01-green-baseline, 02-config-validation]
map: map
labels: [wayfinder:task]
status: closed
---

## Question

ทำ config hardening ตามชุดที่ research note ของ ticket "Validate the config-hardening set…"
ยืนยันแล้ว ให้เสร็จและ CI เขียว

## ขอบเขตงาน

- pin ทุก dependency ที่เป็น `"latest"` เป็น version จริงที่ `pnpm-lock.yaml` resolve
  (`@radix-ui/*` 27 ตัว, `cmdk`, `date-fns`, `input-otp`, `next-themes`, `pigeon-maps`,
  `react-day-picker`, `react-resizable-panels`, `sonner`) แล้ว `pnpm install` ให้ lock ตรง
- prune dependency ที่ไม่มีใครใช้แล้วตามผลของ ticket "Decide the fate of the unused shadcn/ui atoms"
  (ถ้า ticket นั้นตัดสินให้ลบ atom)
- เปลี่ยน `scripts.lint` จาก `next lint` → `eslint` และปรับ `.github/workflows/ci.yml` ให้ตรงกัน
  **พร้อมกับใส่ `globalIgnores`** สำหรับ local state ของ agent tool — ESLint 9 ไม่ได้อ่าน `.gitignore`
  และไม่รู้จัก `.claude/`, `.codex/`, `.cursor/`, `.sessions/` เอง (ถ้าไม่ ignore จะได้ error
  จากซาก worktree `.claude/worktrees/tide-accuracy-improvements/**` ทันที) — ควรทำหลัง ticket
  "Inspect and dispose of the stray tide-accuracy-improvements worktree" เพื่อไม่ต้อง ignore ซาก
- `next.config.mjs`: **ลบ** `modularizeImports` (ซ้ำกับ `experimental.optimizePackageImports`
  ที่ Next 15.2.4 hard-code `lucide-react` ไว้แล้ว), **ลบ** `experimental.optimizeCss` (เป็นค่า default
  = no-op) และ **ลบ** webpack `'@'` alias (ซ้ำกับ tsconfig `paths`) — **คง**
  `experimental.serverActions.allowedOrigins` และ `images.unoptimized` ไว้
  หลังลบ `optimizeCss` แล้ว `critters` กลายเป็น dependency ตาย → prune ในใบนี้ด้วย
- `vercel.json`: เปลี่ยน `--no-frozen-lockfile` → `--frozen-lockfile` ให้ตรงกับ CI
  **ลำดับสำคัญ**: pin ให้เสร็จ + `pnpm install` + commit ทั้ง `package.json` และ lock ก่อน
  (วันนี้ `--frozen-lockfile` ยัง fail เพราะ manifest เป็น `"latest"` → pnpm จะพยายามขยับ
  `react-resizable-panels` 4.12.4 → 4.13.1)
- แก้ `package.json` script ที่ชี้ไฟล์/ค่าที่ไม่มีอยู่

## ข้อเท็จจริงจาก research note

อ่าน [config-validation.md](../research/config-validation.md) ก่อนเริ่ม — สรุปที่ต้องใช้:

- `next lint` ใน 15.2.4 ยังใช้ได้และรู้จัก flat config แต่ **deprecated ใน 15.5 และถูกถอดใน 16**
  → เปลี่ยนตอนนี้เลยพร้อม `globalIgnores`
- กับดัก: `npx next lint` วันนี้ exit 0 (มีแต่ warning) แต่ `npx eslint .` exit 1 ด้วย **45 errors** —
  43 อยู่ในซาก worktree, ที่เหลือจริง 2 จุด: `tailwind.config.ts:94` และ `tests/thailand-time.test.ts:50`
  (`no-require-imports`) → ต้องแก้ 2 จุดนี้ในใบนี้ ไม่ใช่ ignore ทิ้ง
- การเปลี่ยนไป `eslint` ทำให้ขอบเขต lint กว้างขึ้น (ครอบ `hooks/`, `scripts/`, `tests/`, `tailwind.config.ts`)
- `eslint-config-next@^16.2.10` + Next 15.2.4 **เข้ากันได้ ให้คงไว้** (ไม่มี peer `next`; ถอยไป 15.x
  จะพังเพราะ config สาย 15 เป็น eslintrc legacy ที่ต้องใช้ `FlatCompat`)
- version ที่ต้อง pin อยู่ในตารางของ research note ครบแล้ว (radix 27 ตัว + อีก 8 ตัว)

## เกณฑ์ผ่าน

`pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build` เขียว
และ `pnpm install --frozen-lockfile` ต้องไม่แก้ lock (พิสูจน์ว่า lock ตรงกับ package.json)

## Resolution — 2026-09-22

- **Pin dep ลอย**: เขียน script อ่าน version ที่ lock resolve จริงจาก `node_modules` แล้วแทนที่
  `"latest"` ทั้ง **35 จุด** (radix 27 + cmdk, date-fns, input-otp, next-themes, pigeon-maps,
  react-day-picker, react-resizable-panels, sonner) เป็น `^<version>` — ไม่พิมพ์ version ด้วยมือเลย
- `next` 15.2.4 → **15.2.9** (เหตุผลด้าน security อยู่ในใบ "Patch the Next.js RCE in the 15.2 line")
- ลบ `critters` (ตายหลังเอา `experimental.optimizeCss` ออก) — lock หลัง install ลดลง 315 บรรทัด
- `scripts.lint`: `next lint` → `eslint .` + เพิ่ม `globalIgnores` ใน `eslint.config.mjs`
  (ESLint 9 ไม่อ่าน `.gitignore` ⇒ ถ้าไม่ ignore จะวิ่งเข้า local state ของ agent tool)
  พร้อมแก้ error จริง 2 จุดที่ `eslint .` เปิดโปง: `tailwind.config.ts` (`require` → ESM import)
  และ `tests/thailand-time.test.ts` (`require` ในเทสต์ → top-level import)
- `next.config.mjs`: ลบ `modularizeImports` (ซ้ำกับ `optimizePackageImports` ที่ Next hard-code
  `lucide-react` ไว้แล้ว), ลบ `experimental.optimizeCss` (ค่า default = no-op), ลบ webpack `'@'`
  alias (ซ้ำกับ tsconfig `paths`) — **คง** `experimental.serverActions.allowedOrigins`,
  `images.unoptimized`, `headers()` และ `onDemandEntries` ตามเดิม
- `vercel.json`: `--no-frozen-lockfile` → `--frozen-lockfile` (ตรงกับ CI)
- ลบ `.npmrc` ที่ตั้ง `prefer-frozen-lockfile=false` — **นี่คือรากของ drift**: manifest ที่เป็น
  `"latest"` ทำให้ frozen-lockfile ล้มเหลวตลอดกาล (pnpm พยายามขยับ `react-resizable-panels`)

**หลักฐาน**: `pnpm install --frozen-lockfile` → "Already up to date" exit 0 ·
`pnpm lint` → 0 errors / 52 warnings (warning เป็นของเดิมในโค้ด ไม่ได้เพิ่มขึ้น)
