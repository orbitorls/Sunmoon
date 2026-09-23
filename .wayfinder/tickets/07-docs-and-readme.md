---
title: Settle docs/ layout and the root README
type: grilling
mode: HITL
assignee: command-code
blocked_by: []
map: map
labels: [wayfinder:grilling]
status: closed
---

## Question

อะไรอยู่ใน `docs/`, อะไรไป `docs/archive/`, และ root README ควรบอกอะไร?

## ข้อเท็จจริงที่ยืนยันแล้ว

- `docs/` มี: `README.md` (index), `architecture.md`, `mega-spec-assessment.md`,
  `offline-first-architecture.md`, `LINE_WEBHOOK_GUIDE.md`, `LOCAL_LINE_TESTING.md`,
  `TIDAL_CONSTITUENTS.md`, `WASM_SETUP.md`, `adr/0001-offline-first-calibration-for-accuracy.md`,
  `workflows/{README.md,offline-tiles.md}`,
  `superpowers/plans/` 6 ไฟล์ + `superpowers/specs/` 1 ไฟล์ (ลงวันที่ 2026-07-29)
- **ไม่มี `README.md` ที่ root เลย**
- `.env.example` มีอยู่ที่ root (ยังไม่ได้ตรวจว่าครบทุกตัวที่โค้ดต้องใช้)
- recon เดิมระบุว่า `docs/README.md` เคยอ้าง `STATUS.md` ที่ไม่มีอยู่ และ `tests/README.md` ล้าสมัย

## ประเด็นที่ต้องตัดสิน

1. `docs/superpowers/plans/*` (6) + `superpowers/specs/*` (1) + `mega-spec-assessment.md`
   → ย้ายไป `docs/archive/` หรือเก็บที่เดิม (หมายเหตุ: plan บางอันอ้าง `reports/` ที่กำลังจะ untrack)
2. ไฟล์ไหนใน `docs/` ที่ "ยังจริง" และต้องแก้ให้ตรงโค้ดปัจจุบัน — โดยเฉพาะ `architecture.md`
   (มี `reports/` reference) และ `README.md` index
3. **root README โครงอะไร** — แนะนำ: ภาพรวมโครงการ, prerequisites (node >=18.18 <22, pnpm),
   วิธีติดตั้ง/รัน dev, คำสั่ง test/typecheck/lint/build, script pipeline ของ tide
   (`fit:tides`/`compare:tides`/`calibrate:tides`), env vars จาก `.env.example`, แผนที่โครงสร้างโค้ด
   (lib/ buckets + components/{ui,shared,features}) และ pointer ไป `docs/` — ความยาวระดับที่คนใหม่รันได้ใน 5 นาที
4. `.env.example` ครบไหม — ตรวจว่าตัวแปรที่โค้ดอ่าน (LINE channel token/secret, Redis, tile) มีครบ
   และตัวไหนเป็น optional

## ➡️ คำแนะนำ

ย้าย plan/spec เก่าไป `docs/archive/` (ทั้งซับโฟลเดอร์ `superpowers/`), คง `architecture.md`/`adr/`/`workflows/`
ไว้ที่เดิมแต่แก้ให้ตรง, เขียน root README ตามข้อ 3 และปิดช่องว่าง `.env.example`

## ผลลัพธ์กำหนด

- `blocked_by` ของ ticket "Execute the docs archive and write the root README"

## Resolution — 2026-09-22 (ตัดสินโดย assistant ตามที่ผู้ใช้สั่ง "จัดการเลย")

- ย้ายไป `docs/archive/`: `superpowers/` (plans 6 + specs 1), `mega-spec-assessment.md`,
  `offline-first-architecture.md`, `WASM_SETUP.md` — สองตัวหลังถูก `docs/README.md` ระบุว่า
  "Historical / superseded" อยู่แล้ว จึงย้ายให้สอดคล้องกับคำประกาศของตัวเอง
- คงไว้ที่ `docs/`: `architecture.md`, `README.md`, `TIDAL_CONSTITUENTS.md`,
  `LINE_WEBHOOK_GUIDE.md`, `LOCAL_LINE_TESTING.md`, `adr/`, `workflows/`
- เพิ่ม `docs/archive/README.md` ระบุชัดว่าทุก path ข้างในเป็น historical
- `docs/README.md` เขียนใหม่เป็น index ชี้ไฟล์จริง; `docs/architecture.md` แก้ reference
  `docs/superpowers/plans/` → `docs/archive/`
- root `README.md`: ตามโครงที่ตกลง (ภาพรวม, prerequisites node/pnpm, ติดตั้ง+รัน,
  ตารางคำสั่งรวม pipeline tide, env vars, project layout, ลิงก์ docs)
- `.env.example`: **ครบแล้ว ไม่ต้องแก้** — เทียบกับ key ทั้งหมดที่พบใน `.env` ที่รั่ว พบว่ามีครบ
  และมีคอมเมนต์เตือนเรื่อง `NEXT_PUBLIC_*` อยู่แล้ว
