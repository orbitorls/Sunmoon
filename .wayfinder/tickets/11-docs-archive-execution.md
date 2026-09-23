---
title: Execute the docs archive and write the root README
type: task
mode: AFK
assignee: command-code
blocked_by: [07-docs-and-readme]
map: map
labels: [wayfinder:task]
status: closed
---

## Question

ย้าย docs ตามที่ ticket "Settle docs/ layout and the root README" ตัดสิน และเขียน README ใหม่
ให้เอกสารชี้แต่ไฟล์ที่มีอยู่จริง

## ขอบเขตงาน

- `git mv` plan/spec เก่าไป `docs/archive/` ตามที่ตัดสิน (คาดว่า `docs/superpowers/plans/` 6 ไฟล์,
  `docs/superpowers/specs/` 1 ไฟล์, `mega-spec-assessment.md`) และเพิ่ม `docs/archive/README.md`
  บอกว่าที่นี่คือของ historical ไม่ใช่ spec ที่ใช้อยู่
- เขียน `README.md` ที่ root ตามโครงที่ตกลง (ภาพรวม, prerequisites `node >=18.18 <22` + pnpm,
  วิธีรัน dev, คำสั่ง test/typecheck/lint/build, pipeline `fit:tides`/`compare:tides`/`calibrate:tides`,
  env vars จาก `.env.example`, แผนที่โครงสร้างโค้ด, ลิงก์ไป `docs/`)
- อัปเดต `docs/README.md` index ให้ชี้ไฟล์ที่มีจริง (ลบ reference ถึง `STATUS.md` ที่ไม่มี)
- อัปเดต `tests/README.md` ให้ตรงกับของจริง
- ปิดช่องว่าง `.env.example` ถ้าพบว่าขาดตัวแปรที่โค้ดอ่าน (โดยไม่ใส่ค่าจริง)
- ตรวจว่า reference ไป `reports/` ใน `docs/architecture.md` ยังถูกหลัง hygiene pass

## เกณฑ์ผ่าน

ทุก path ที่เอกสารอ้างถึงมีอยู่จริง (ตรวจด้วยการ grep path ใน `docs/` + root README แล้วเช็คไฟล์)
และไม่มีเอกสารอ้างไฟล์ที่ถูกลบในงานนี้

## Resolution — 2026-09-22

- ย้าย historical docs ไป `docs/archive/` ด้วย `git mv` (การตัดสินอยู่ในใบ "Settle docs/ layout and the root README")
- เขียน `docs/archive/README.md` ใหม่ (เตือนว่าทุก path ข้างในเป็น historical)
- เขียน `docs/README.md` ใหม่เป็น index ที่ชี้ไฟล์จริง
- แก้ reference ใน `docs/architecture.md` จาก `docs/superpowers/plans/` → `docs/archive/`
- เขียน `tests/README.md` ใหม่: แก้คำสั่ง lint (`next lint` → `eslint .`), แก้ path ของ suite
  ทั้งหมดให้ตรง tree ใหม่, เพิ่มหัวข้อ Layout (กติกา mirror), เพิ่มหมายเหตุเรื่อง `jest.mock`
  path และการอ่านไฟล์จาก repo root, และ **ลบหมายเหตุที่อ้าง `lib/harmonic/constituents.ts`**
  ซึ่งไม่มีไฟล์นี้แล้ว
- เขียน root `README.md` (ไฟล์นี้ไม่เคยมีมาก่อนในโปรเจค)
- ตรวจ: path ที่เอกสารอ้างมีอยู่จริงทั้งหมด (index ใหม่ไม่มี reference ถึง `STATUS.md` ที่ตายไปแล้ว)
