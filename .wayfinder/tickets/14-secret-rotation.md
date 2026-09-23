---
title: Remediate the API keys committed in git history
type: task
mode: HITL
assignee: null
blocked_by: []
map: map
labels: [wayfinder:task]
status: open
---

## Question

มี API key จริงถูก commit อยู่ในประวัติ git ของ repo นี้ — จะแก้อย่างไร?

## ข้อเท็จจริงที่ยืนยันแล้ว (ระหว่างปิด ticket "Inspect and dispose of the stray…")

- ไฟล์ `.env` ที่ root เคยถูก track และอยู่ใน history จริง: commit `70db73d` และ `c7d586d`
  — **ทั้งคู่อยู่ใน history ของ `main`** (ไม่ใช่แค่ branch ที่ถูกรื้อ)
- key ที่อยู่ในไฟล์นั้น (นับความยาวจากค่าจริง แต่ **ไม่บันทึกค่าไว้ที่ไหน**):
  `OPENWEATHER_API_KEY` (32), `WORLDTIDES_API_KEY` (36), `STORMGLASS_API_KEY` (73),
  `NEXT_PUBLIC_WORLDTIDES_API_KEY` (36), `NEXT_PUBLIC_OPENWEATHER_API_KEY` (32)
  (ความยาวตรงกับรูปแบบ key จริงของบริการเหล่านั้น ไม่ใช่ placeholder)
- `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_DISPATCH_TOKEN` ในไฟล์นั้น **ว่าง**
  (ไม่ได้ตั้งค่า) — ส่วนที่รั่วคือ 5 key ข้างบน
- `NEXT_PUBLIC_*` สองตัวถูกออกแบบให้ฝังใน browser bundle อยู่แล้ว ⇒ ถือว่ารั่วสู่สาธารณะโดยสภาพ
- ไฟล์ `.env` ทั้งใน main และใน worktree ถูก**ลบไปแล้ว** (main ไม่ track `.env`, `.gitignore` มี `.env`)
  — การรื้อ worktree ในใบก่อนหน้า **ไม่ได้** ลบมันออกจาก history

## ทำไมเรื่องนี้สำคัญ

คำแนะนำอย่างเป็นทางการของทั้ง Next.js และ React หลัง CVE-2025-66478 (RSC RCE, CVSS 10.0)
ระบุว่า if the app was online and unpatched ให้ **rotate secret ทุกตัว** — repo นี้มี key
ที่ต้องถือว่ารั่วไม่ว่าจะ deploy ไปแล้วหรือไม่ เพราะมันอยู่ใน history ที่ใคร fork/clone ก็เห็น

## สิ่งที่ต้องทำ (ต้องมีคนทำ — เอเจนต์ทำแทนไม่ได้)

1. **Rotate key ทั้ง 5 ตัวที่ผู้ให้บริการ** — ออก key ใหม่ที่ OpenWeather, WorldTides, Stormglass
   แล้วเพิกถอนตัวเก่า จากนั้นอัปเดต `.env` ในเครื่อง (และใน Vercel/host ที่ deploy)
2. ตัดสินเรื่อง history:
   - **ยอมรับ** (key ถูก rotate แล้ว ⇒ ของเก่าไร้ค่า) — ทางที่แนะนำ เพราะไม่ต้อง force-push
   - หรือ **purge** ด้วย `git filter-repo --path .env --invert-paths` แล้ว force-push
     (ต้องประสานทุกคนที่ clone อยู่ — เป็นการเขียนทับ history)
3. ตรวจว่าไม่มี key หลงเหลือในไฟล์ที่ track: grep รูปแบบ key ในโค้ด/data/เอกสาร
   และยืนยันว่า `.env` ยังถูก ignore

## สิ่งที่ต้องบันทึกเมื่อปิดใบนี้

key ตัวไหน rotate แล้วเมื่อไร, ตัดสิน history อย่างไร, และหลักฐานว่าไม่มี key หลงเหลือ
(**ห้ามเขียนค่าจริงลงในไฟล์นี้หรือที่ไหนใน repo**)
