---
title: Validate the config-hardening set against Next 15.2.4 / ESLint 9
type: research
mode: AFK
assignee: research-agent
blocked_by: []
map: map
labels: [wayfinder:research]
status: closed
---

## Question

อะไรใน config ของโปรเจคที่ deprecated จริง และ version ปลายทางที่จะ pin คืออะไร?
(ผลของ ticket นี้คือวัตถุดิบของ ticket "Execute the config hardening" — ไม่ตัดสินใจแทนคน)

## ต้องตอบให้ครบ

1. **`next.config.mjs` กับ Next 15.2.4**
   - `modularizeImports` (ตอนนี้ตั้ง `lucide-react`) — ยังใช้ได้ไหม ถูกแทนด้วย `optimizePackageImports` หรือไม่ และต้องตั้งที่ระดับไหน
   - `experimental.serverActions.allowedOrigins` — server actions เป็น stable แล้วหรือยัง; `allowedOrigins` อยู่ที่ path ไหนในเวอร์ชันนี้
   - `experimental.optimizeCss: false` — ยัง valid ไหม (มี `critters` ใน deps)
   - `images.unoptimized: true` — ยังถูกและยังจำเป็นไหม
   - webpack alias `'@'` — ซ้ำกับ tsconfig paths หรือไม่
2. **`scripts.lint = "next lint"`** — ใน Next 15.2.4 `next lint` สถานะไหน, และกับ `eslint-config-next@^16.2.10` + flat `eslint.config.mjs` + `eslint@^9` ควรเปลี่ยนคำสั่งเป็นอะไร (ระบุคำสั่ง + flag ที่ถูกต้อง และความเสี่ยงที่ rule set จะเปลี่ยนจากเดิม)
3. **Version ที่ต้อง pin** — อ่าน `pnpm-lock.yaml` แล้วระบุ version จริงที่ resolve ได้ของทุก dep ที่เป็น `"latest"`: `@radix-ui/*` (27 ตัว), `cmdk`, `date-fns`, `input-otp`, `next-themes`, `pigeon-maps`, `react-day-picker`, `react-resizable-panels`, `sonner` — ทำเป็นตาราง `package | version ใน lock`
4. **`vercel.json`** — `installCommand: "pnpm install --no-frozen-lockfile"` เปลี่ยนเป็น `--frozen-lockfile` ได้หรือไม่ มีเหตุผลอะไรที่ต้องผ่อน และ `reports/` ที่จะถูก untrack กระทบ build บน Vercel ไหม

## ผลลัพธ์

เขียนเป็น research note ที่ `.wayfinder/research/config-validation.md` แล้วใส่ context pointer
ในไฟล์นี้ — **อย่า paste ทั้งก้อนใน ticket**

- Research note: [config-validation.md](../research/config-validation.md) — resolved 2026-09-22
- สรุปสั้น: `modularizeImports` เลิกใช้ได้ (lucide-react ถูก `optimizePackageImports` ครอบ default แล้ว);
  `experimental.serverActions.allowedOrigins` ยังถูกต้อง; `experimental.optimizeCss: false` เป็น no-op
  (ทำให้ `critters` เป็น dep ตาย); `images.unoptimized: true` ยังถูก; webpack alias `'@'` ซ้ำกับ tsconfig paths;
  `next lint` ยังรันได้ใน 15.2.4 แต่ deprecated แล้ว → `"lint": "eslint"` **พร้อม** scope/ignores (ไม่งั้น 45 errors);
  คู่ `eslint-config-next@16` + `next@15.2.4` ใช้ได้ ให้คงไว้; pin 36 ตัวจาก `"latest"` เป็น version ในตารางของ note;
  `vercel.json` เปลี่ยนเป็น `--frozen-lockfile` ได้ **หลัง** pin + re-lock เท่านั้น; untrack `reports/*` ไม่กระทบ Vercel build
