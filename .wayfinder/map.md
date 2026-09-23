---
title: Sunmoon repo organization and readiness
labels: [wayfinder:map]
---

## Destination

Repo ที่จัดระเบียบและพร้อมใช้งาน: ไม่มีไฟล์ตาย/ซ้ำ/หลงเหลือ (รวม worktree แปลกปลอม),
components/tests/docs ยึด convention เดียวที่ประกาศไว้, import ทั้ง repo เป็น `@/`,
config reproducible (pin version, ไม่มี key deprecated, CI กับ Vercel ตรงกัน),
และ CI gate เขียว (`typecheck` + `lint` + `test` + `build`)

## Notes

- Domain: Next.js **15.2.9** App Router + React 19 + TS, pnpm, Jest + ts-jest, deploy Vercel,
  offline-first tide/weather forecasting สำหรับชายฝั่งไทย (LINE integration)
- Skills: HITL ทุกตัวเรียก "grilling" + "domain-modeling"; ถ้าต้องดูของจริงใช้ "prototype";
  research ticket ใช้ "research"
- Standing preferences: ไฟล์ kebab-case / export component PascalCase / import `@/` /
  การตรวจรับคือ `pnpm typecheck && pnpm lint && pnpm test && pnpm build` ให้เขียว
  (ตรงกับ `.github/workflows/ci.yml`)
- Execution in place เป็นส่วนหนึ่งของ effort นี้ (ปลายทางคือตัวการเปลี่ยนแปลงเอง):
  ticket ชนิด `task` ทำจริงในที่ได้ แต่ห้ามเริ่มก่อน decision ที่มันขึ้นอยู่ (ดู `blocked_by`)
- `.slim/deepwork/sunmoon-elevation.md` ล้าสมัยกว่าครึ่ง (dead code ส่วนใหญ่ถูกลบไปแล้ว)
  — map นี้แทนที่มัน ห้ามดึง claim จากมันโดยไม่ตรวจโค้ดก่อน
- 1 session = 1 ticket (ยกเว้น research)

## Decisions locked while charting

- ขอบเขต: cleanup + โครงสร้าง + config — **ไม่รื้อ logic**
- ลบไฟล์ตายด้วย `git rm`; artifact ที่ generate ให้ untrack + gitignore
- โครงสร้าง `components/{ui,shared,features/*}`; ไฟล์ kebab-case
- docs เก่า → `docs/archive/`; เขียน README ใหม่ที่ root
- config hardening ทำแบบครบชุด (pin version, ลบ deprecated, แก้ script)
- รื้อ god files / ย้าย logic เป็น hooks **ไม่อยู่ในงานนี้**
- เกณฑ์ "พร้อมใช้งาน" = CI gate 4 คำสั่งเขียว
- `reports/`: untrack artifact ที่ generate (ดู ticket "Execute the hygiene pass" เรื่อง `reports/perf/`)

## Decisions so far

- [Establish the green baseline](tickets/01-green-baseline.md): baseline เขียวทั้งชุดก่อนแตะอะไร — typecheck 0, lint warnings-only, **29 suites / 132 tests**, build 15 routes (เครื่องนี้ node v24 vs engines <22: warning เท่านั้น)
- [Validate the config-hardening set against Next 15.2.4 / ESLint 9](tickets/02-config-validation.md): `modularizeImports`, `experimental.optimizeCss` และ webpack `'@'` alias **ลบได้**; `experimental.serverActions.allowedOrigins` และ `images.unoptimized` **คงไว้**; lint script ต้องเปลี่ยนเป็น `eslint` + `globalIgnores`; คง `eslint-config-next@16`; Vercel ใช้ `--frozen-lockfile` ได้**หลัง** pin เท่านั้น — รายละเอียดใน research note
- [Inspect and dispose of the stray tide-accuracy-improvements worktree](tickets/04-stray-worktree-disposal.md): branch เป็น snapshot ที่ merge เข้า `main` แล้ว (0 commit ค้าง) → รื้อ worktree + ลบ branch; **พบว่า `.env` ของ worktree นั้น track อยู่ใน history ของ main** → เปิด ticket 14
- [Settle the layout convention for components/ and tests/](tickets/05-layout-convention.md): tree = `ui/` + `shared/` + `features/{location,forecast,weather,disaster,status,tiles}`; ไม่สร้าง `features/history/`; `.client.tsx` = inner ที่ lazy-load ด้วย `next/dynamic ssr:false`; tests mirror source โดยคง basename
- [Consolidate the LINE service seam](tickets/06-line-seam-consolidation.md): ลบ `line-service.ts` + action ที่ตาย → เหลือ seam เดียวที่ `@/lib/services/line`
- [Settle docs/ layout and the root README](tickets/07-docs-and-readme.md): archive 4 กลุ่มเอกสารไป `docs/archive/`, คง architecture/adr/workflows/guides, เขียน root README ใหม่, `.env.example` ครบอยู่แล้ว
- [Execute the hygiene pass](tickets/08-hygiene-execution.md): ลบ orphan CSS + public 7 ไฟล์ + barrel ตาย, untrack report ที่ generate (คง `reports/perf/` เป็นหลักฐาน), เขียน `.gitignore` ใหม่
- [Execute the config hardening](tickets/09-config-hardening-execution.md): pin 35 dep ลอยจาก lock, `eslint .` + `globalIgnores`, ตัด `modularizeImports`/`optimizeCss`/webpack alias/`critters`, Vercel เป็น frozen, ลบ `.npmrc` ที่เป็นรากของ lockfile drift
- [Execute the components restructure](tickets/10-components-restructure-execution.md): ย้าย 31 component + codemod rewrite import โดย resolve path จริง (83 rewrites, `../` = 0 ทั้ง repo)
- [Execute the docs archive and write the root README](tickets/11-docs-archive-execution.md): ย้าย docs, เขียน `docs/archive/README.md` + `docs/README.md` + `tests/README.md` + root `README.md` ใหม่ให้ชี้ไฟล์จริง
- [Execute the tests/ re-layout](tickets/12-tests-relayout-execution.md): ย้าย 26 suite เข้าโฟลเดอร์ mirror (29 suites / 132 tests เท่าเดิม) + แก้ path ที่ผูกกับตำแหน่งไฟล์
- [Patch the Next.js RCE in the 15.2 line](tickets/13-next-rce-patch.md): `next` 15.2.4 → **15.2.9** ตาม advisory ของ Next/React (CVE-2025-66478, CVSS 10.0, RSC RCE)
- [Decide the fate of the unused shadcn/ui atoms](tickets/03-ui-kit-prune.md): นโยบาย = **เก็บเท่าที่ใช้** — ลบ 25 ไฟล์ที่ตาย (~2,480 บรรทัด) และ prune 16 dependency ที่ตามมา; คงไว้ 21 atom ที่มี importer จริง

## Not yet specified

- `lib/comparison/*` เป็น runtime หรือ tooling offline? ถ้าเป็น tooling ควรอยู่นอก `lib/`
- hook layer ควร co-locate กับ feature ไหม (ตอนนี้ `hooks/` ยังแบนอยู่)
- `lib/services/line/index.ts` เป็น `export *` ทั้ง 9 โมดูล (รวม `client.ts` ที่ควรเป็น internal) —
  จะทำ surface ให้แคบลงไหม
- fixture ใน `data/` ที่โค้ดไม่ได้อ้าง (`accuracy-user-locations`, `tide-hourly-samples`,
  `authoritative-moons`, `pier-msl`) ยังต้องใช้ไหม หรือเก็บไว้เป็น provenance
- `app/api/debug/*` ควร ship ขึ้น production ไหม
- **toast ของ `quick-actions` ไม่มีอะไรเรนเดอร์**: `components/shared/quick-actions.tsx` เรียก
  `toast.success()` / `toast.error()` จาก `sonner` 4 จุด แต่ทั้ง repo ไม่มีที่ไหนเรนเดอร์ `<Toaster />`
  เลย ⇒ ข้อความ toast ไม่เคยขึ้น (เป็น bug ที่มีอยู่ก่อนงานนี้ — wrapper `components/ui/sonner.tsx`
  ที่ถูกลบไปก็ไม่มีใครเรนเดอร์เช่นกัน) เป็นการแก้ behavior จึงไม่ทำในรอบนี้
- ticket 03 ปิดแล้ว (นโยบาย "เก็บเท่าที่ใช้"); ถ้าต้องการ UI kit ครบชุดในอนาคตให้ดึง atom กลับจาก
  git history หรือ `npx shadcn@latest add <atom>`
- จะรองรับ **node 22+** ไหม? ตอนนี้ `engines` = `>=18.18 <22` แต่เครื่อง dev รัน v24 และ
  build จะล้มเมื่อ `.next` มี cache (`WasmHash` crash ของ webpack) — ทางเลือก: คง engines แล้วใช้
  node 20 ผ่าน nvm, หรือขยับ/ปลดล็อก engines แล้วรับความเสี่ยงนั้น (ควรมีใบใหม่ถ้าจะทำ)

## Out of scope

- รื้อ god files ที่เหลือ (8 ไฟล์ ≥300 บรรทัด) เป็น hooks/subcomponents — งาน refactor logic
- เพิ่ม characterization test / coverage
- งาน UI/visual, tide accuracy, เปลี่ยน behavior ของแอป
- อัปเกรด Next 15 → 16 / React major / เปลี่ยน package manager
- ย้าย tracker ไป GitHub Issues (ต้องรัน `/setup-matt-pocock-skills` ก่อน)

## Verified context (การ re-verify รอบ chart)

**สถานะหลัง execution** — รายการ "ยังจริง" ด้านล่างถูกจัดการไปแล้วทั้งหมด (ดู Decisions so far);
รายการนี้เก็บไว้เป็นบันทึกว่าตอน chart เจออะไร และของที่ "หมดแล้ว" คืออะไรเพื่อไม่ให้มีใครไปไล่หาอีก

claim จาก recon เดิมที่ **ยังจริงตอน chart** (จัดการแล้วทั้งหมด):

- `styles/globals.css` เป็น orphan → ลบแล้ว
- shadcn atom ไม่มี importer 21 ไฟล์ + `ui/sidebar.tsx` (710 บรรทัด) + cluster ตายต่อเนื่อง
  ≈ 2,300 บรรทัด → **ยังไม่ตัดสิน** (ticket 03 เปิดอยู่)
- barrel ตาย `lib/storage/index.ts` → ลบแล้ว; `lib/services/line/index.ts` → คงไว้เป็น surface (ticket 06)
- `public/` ไม่ถูกอ้าง 7 ไฟล์ → ลบแล้ว
- `reports/` tracked 20 ไฟล์ → untrack ที่ generate แล้ว, คง `perf/`
- radix 27 ตัว + อีก 8 ตัวเป็น `"latest"` → pin แล้ว
- `scripts.lint = "next lint"` → `eslint .` แล้ว
- `next.config.mjs` มี `modularizeImports`/`serverActions`/`optimizeCss` → จัดการตาม research แล้ว
- `vercel.json` drift กับ CI → ตรงกันแล้ว (พร้อมลบ `.npmrc` ที่เป็นรากเหตุ)
- คู่ `.client.tsx` ชื่อไม่ตรง → แก้แล้ว
- 127 relative import ใน 36 ไฟล์ → 0 `../` ทั้ง repo
- `.claude/worktrees/tide-accuracy-improvements` → รื้อแล้ว
- root dot-dirs ที่ยังไม่ ignore → ใส่ `.gitignore` แล้ว

**พบเพิ่มระหว่างทำ** (ไม่เคยอยู่ใน recon):

- `next@15.2.4` ติด **CVE-2025-66478** (CVSS 10.0, RSC RCE) — ยืนยันจาก nextjs.org + react.dev
  แล้ว bump เป็น 15.2.9 (ticket 13)
- **API key จริงถูก track ใน git history** ของ `main` (commit `70db73d`, `c7d586d`):
  OpenWeather / WorldTides / Stormglass + `NEXT_PUBLIC_*` 2 ตัว → ticket 14 (ต้องมีคน rotate)
- `.npmrc` ตั้ง `prefer-frozen-lockfile=false` → รากของ lockfile drift (ลบแล้ว)
- **build บน Node ≥22 ไม่เสถียรเมื่อ `.next` มี cache อยู่**: `pnpm build` ล้มด้วย
  `TypeError: Cannot read properties of undefined (reading 'length')` ที่
  `WasmHash._updateWithBuffer` (webpack ที่ Next 15.2.9 bundle มา) — ลบ `.next` แล้ว build ผ่านปกติ
  เครื่อง dev นี้รัน node v24.16.0 แต่ `engines` ประกาศ `>=18.18 <22` (CI ใช้ 20 จึงไม่กระทบ)
  ⇒ ยังไม่ตัดสินว่าจะรองรับ node 22+ หรือไม่ (ดู Not yet specified)
- `tests/scripts/calibrate-pilots.test.ts` ไม่ใช่ test ของ script ที่ไม่มีอยู่ — ข้างในทดสอบ
  `lib/comparison/tide-calibration-apply` (ย้ายเข้าที่ถูกต้องแล้ว)

claim จาก recon เดิมที่ **หมดแล้วตั้งแต่ก่อนเริ่ม** (อย่าไปตาม): dead lib ~7,000 บรรทัด, dead
components ~5,700 บรรทัด, harmonic engines ซ้ำ, sw 3 เวอร์ชัน, 2 lockfiles, package `my-v0-project`,
jsdom ใน deps, tsconfig `node`/`es2017`, tailwind globs ตาย, `enhanced-location-selector` 956 บรรทัด,
god files ~30 ไฟล์
