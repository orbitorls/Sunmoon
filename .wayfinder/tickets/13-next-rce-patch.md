---
title: Patch the Next.js RCE in the 15.2 line
type: task
mode: AFK
assignee: command-code
blocked_by: []
map: map
labels: [wayfinder:task]
status: closed
---

## Question

โปรเจคใช้ `next@15.2.4` ซึ่ง research note ของ ticket "Validate the config-hardening set…"
flag ว่าติด CVE-2025-66478 (RSC RCE, CVSS 10.0) และ patch ของสาย 15.2 คือ **15.2.6** —
ควรอัปเดตตอนนี้ไหม?

## ทำไมอยู่ในขอบเขต

ปลายทางคือ "พร้อมใช้งาน" การ ship framework ที่มี RCE ระดับ critical ไม่ใช่ "พร้อมใช้งาน"
และการอัปเดตนี้เป็น **patch bump ภายใน 15.2.x** ไม่ใช่การอัปเกรด 15 → 16 ที่ถูกตัดออกไปแล้ว
(ดู `Out of scope` ของ map) — ถ้าจะตัดออก ให้ย้ายไป `Out of scope` พร้อมเหตุผล ไม่ใช่ปิดเงียบ ๆ

## สิ่งที่ต้องทำ

1. **ยืนยันจากแหล่งปฐมภูมิก่อนลงมือ** — เปิด Next.js security advisories / release notes ของ 15.2.6
   ด้วยตัวเอง แล้วบันทึกใน resolution ว่า CVE นี้กระทบ configuration ของเราจริงไหม (App Router + RSC)
   และ 15.2.6 คือ patch ที่ถูกต้อง — **อย่าเชื่อ research note อย่างเดียว**
2. อัปเดต `next` เป็น 15.2.6 (หรือ patch สูงสุดในสาย 15.2 ถ้ามีใหม่กว่า ณ วันทำ) แล้ว `pnpm install`
3. ตรวจว่าไม่มี API/config ที่ใช้อยู่เปลี่ยน behavior (`next.config.mjs` มี `experimental.*` หลายตัว)
4. รัน gate เต็ม: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
5. ตรวจว่า `eslint-config-next@16.2.10` ยังใช้กับ patch ใหม่ได้ (ไม่ต้องแตะ)

## ความสัมพันธ์กับใบอื่น

- ถ้า ticket "Execute the config hardening" ทำก่อน จะได้ lockfile ที่ pin แล้ว —
  การ bump `next` จะแตะ lock เดียวกัน ควรทำใบนี้ให้จบก่อนหรือหลังให้ชัดเจน ไม่ทำพร้อมกัน
- ถ้า bump สำเร็จ `pnpm install --frozen-lockfile` ต้องเขียว (เป็นเงื่อนไขเดียวกับใบนั้น)

## Resolution — 2026-09-22

**ยืนยันจากแหล่งปฐมภูมิก่อนลงมือ** (ไม่เชื่อ research note อย่างเดียว):

- `nextjs.org/blog/CVE-2025-66478` — CVE-2025-66478 (ต้นทาง CVE-2025-55182), **CVSS 10.0**,
  RCE ผ่าน RSC protocol; กระทบ **Next.js 15.x App Router**; patched release ของสาย 15.2 = `15.2.6`
- `react.dev/blog/2025/12/03/...` — สำหรับ Next.js ให้ใช้ **`next@15.2.9`** ในสาย 15.2
  (อัปเดต ม.ค. 2026 ให้ครอบ CVE-2025-55184/67779/55183 และ CVE-2026-23864 เพิ่มด้วย)
- ⇒ `next` 15.2.4 → **15.2.9** (patch สูงสุดในสาย 15.2 — ไม่ใช่การอัปเกรด 15 → 16 ที่ตัดออกจาก scope)
- ไม่ต้อง bump `react` แยก: advisory ของ Next ระบุว่า patched Next แก้ให้กับแอป Next ครบแล้ว
  และไม่ได้อยู่ในรายการที่ต้องอัปเดตแยกสำหรับผู้ใช้ Next

**ผล**: `pnpm install` ผ่าน · typecheck / lint / test / build เขียว
**ส่งต่อ**: ทั้งสอง advisory สั่งให้ rotate secret ถ้าแอปเคยออนไลน์แบบ unpatched → ตรงกับ
"Remediate the API keys committed in git history"
