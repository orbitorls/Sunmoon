# Wayfinder tracker — local markdown

Tracker ของ map "Sunmoon repo organization and readiness" (โปรเจคนี้ไม่มี issue tracker ภายนอก จึงใช้ local-markdown ตามค่าเริ่มต้น)

## โครงสร้าง

```
.wayfinder/
├── README.md            ← ไฟล์นี้ (Wayfinding operations)
├── map.md               ← map: label wayfinder:map
├── tickets/NN-slug.md   ← child issue ของ map
└── research/            ← ผลของ research ticket (context pointer target)
```

## Frontmatter ของ ticket

```yaml
---
title: <ชื่อ ticket — ใช้ชื่อนี้เวลาเรียกถึง ticket>
type: research | prototype | grilling | task
mode: HITL | AFK
assignee: null          # null = ยังไม่มีใคร claim
blocked_by: [01-green-baseline]
map: map
labels: [wayfinder:<type>]
status: open
---
```

## กติกา

- **1 session = 1 ticket** (ยกเว้น `research` ที่ทำรวดเดียวหลายใบได้)
- **Claim** = ใส่ชื่อใน `assignee` **ก่อน**เริ่มงาน — ticket ที่ `assignee: null` คือยังไม่มีเจ้าของ
- **ไม่ resolve ticket ไหนแทนคน**: HITL ticket ต้องคุยกับคนจริง ๆ เท่านั้น
- **ปิด ticket** = เขียน `## Resolution` ท้ายไฟล์ + เปลี่ยน `status: closed` + append context pointer ใน `map.md` → `Decisions so far`
- **`blocked_by`** อ้าง slug ของ ticket (ชื่อไฟล์ไม่รวม `.md`) เพราะ tracker นี้ไม่มี native blocking
- **เรียกถึง ticket ด้วยชื่อ (title) เสมอ** ไม่ใช่เลข
- `wayfinder:task` ที่เป็น AFK ทำจริงในที่ได้; ถ้าต้องมีคนทำ ให้เขียน checklist ให้ครบแล้วหยุด

## Frontier query

ticket ที่ `status: open` + `assignee: null` + ไม่มี blocker ที่ยังเปิด:

```powershell
Get-ChildItem .wayfinder/tickets/*.md | ForEach-Object {
  $text = Get-Content $_ -Raw
  if ($text -match 'status:\s*open' -and $text -match 'assignee:\s*null') {
    $blockers = @()
    if ($text -match 'blocked_by:\s*\[(.*?)\]') {
      $blockers = $Matches[1] -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    }
    $open = $blockers | Where-Object { (Get-Content ".wayfinder/tickets/$_.md" -Raw) -match 'status:\s*open' }
    if (-not $open) { $_.Name }
  }
}
```

## ตรวจความถูกต้องของ tracker

- ทุก ticket มี `map: map`, `type`, และ `labels: [wayfinder:<type>]` ที่ตรงกัน
- ทุก slug ใน `blocked_by` มีไฟล์จริงใน `tickets/`
- จำนวน ticket = 14 — ปิดแล้ว 13 (`01`–`13`), ยังเปิด 1 (`14` secret rotation — ต้องมีคน rotate key)
- ผล research เก็บที่ `research/<slug>.md` และ ticket ต้องมี context pointer ไปถึง
