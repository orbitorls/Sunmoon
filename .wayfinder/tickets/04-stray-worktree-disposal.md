---
title: Inspect and dispose of the stray tide-accuracy-improvements worktree
type: task
mode: AFK
assignee: command-code
blocked_by: []
map: map
labels: [wayfinder:task]
status: closed
---

## Question

`.claude/worktrees/tide-accuracy-improvements` (git worktree ที่ register จริง, branch
`worktree-tide-accuracy-improvements` @ `647dd67`) ควรเก็บไว้หรือรื้อออก?

## ข้อเท็จจริงที่ยืนยันแล้ว

- `git worktree list` แสดง 2 worktree: `D:/Sunmoon` (main) และ
  `D:/Sunmoon/.claude/worktrees/tide-accuracy-improvements` (branch ข้างต้น)
- ข้างในเป็นสำเนาโปรเจคทั้งชุด รวม `.env`, `plugins/`, `app/globals.css`, `styles/globals.css`
  ของรุ่นเก่า — และเป็นที่เก็บไฟล์ "dead" รุ่นก่อนที่ถูกลบออกจาก main แล้ว
- `.claude/` **ไม่ได้** อยู่ใน `.gitignore` (root dot-dirs ที่ยังไม่ ignore: `.agents/ .claude/ .codex/ .cursor/`)

## สิ่งที่ต้องเก็บข้อเท็จจริงก่อนตัดสิน

1. `git log main..worktree-tide-accuracy-improvements --oneline` — มี commit ที่ยังไม่ merge ไหม
2. `git status --short` ใน worktree นั้น — มีไฟล์ที่ยังไม่ commit ไหม
3. `.env` ข้างในเป็น credential จริงหรือแค่ template (เทียบกับ `.env.example`; **อย่าเปิดเผยค่า** ใน resolution)
4. ขนาดบนดิสก์ของ `.claude/worktrees/`

## ➡️ คำแนะนำ

- ถ้า **ไม่มี** commit ที่ยังไม่ merge และไม่มีไฟล์ค้าง: `git worktree remove` → `git branch -D worktree-tide-accuracy-improvements`
  → เพิ่ม `.claude/ .codex/ .cursor/ .agents/` เข้า `.gitignore`
- ถ้า **มี** งานค้าง: หยุด และเขียน checklist ให้คนตัดสิน (ห้ามลบเอง) — ระบุว่า commit ไหน/ไฟล์ไหน และผลของการเก็บไว้

## ข้อควรระวัง

การรื้อต้องไม่แตะ working tree หลัก — ตรวจว่า `git status` ของ main ยังสะอาดหลังรื้อ
และอย่าใช้ `rm -rf` กับ directory ที่ git ยังไม่ยอมปลด (ใช้ `git worktree remove` ก่อน)

## Resolution — 2026-09-22

ตรวจก่อนรื้อ: `git log main..worktree-tide-accuracy-improvements` = **0 commit** และ
`git merge-base --is-ancestor <branch> main` = exit 0 ⇒ branch เป็นบรรพบุรุษของ `main` แล้ว
คือเป็น snapshot ก่อนการ cleanup ไม่มีงานที่ยังไม่ merge; tracked file ไม่มีอะไรถูกแก้ (status สะอาด)
เหลือแค่ untracked 1 ไฟล์ `.openclaude/settings.local.json` ซึ่ง **กู้สำรองไว้ที่ scratchpad ก่อนรื้อ**

- `git worktree remove --force .claude/worktrees/tide-accuracy-improvements` → exit 0
- `git branch -d worktree-tide-accuracy-improvements` → Deleted (was 647dd67)
- `git worktree list` เหลือ `D:/Sunmoon [main]` ตัวเดียว และโฟลเดอร์หายจริง
- `.claude/ .codex/ .cursor/ .agents/` เข้า `.gitignore` แล้ว (ทำในใบ "Execute the hygiene pass")

**ส่งต่อ**: `.env` ใน worktree นั้นถูก track อยู่ใน history (commit `70db73d`, `c7d586d` — reachable
จาก `main`) และมี key จริง 5 ตัว → เปิด ticket ใหม่ "Remediate the API keys committed in git history"
การรื้อ worktree **ไม่ได้** ลบ key ออกจาก history
