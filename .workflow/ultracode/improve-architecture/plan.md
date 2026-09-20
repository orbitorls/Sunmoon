# Plan — Improve Codebase Architecture (Sunmoon)

## Goal
Produce a concrete, evidence-based refactor plan to consolidate the Sunmoon
Next.js tide-forecasting codebase: collapse the flat `lib/` dump into the
domain/services/offline-first structure, deduplicate overlapping components,
and clean up repo hygiene. **Read-only audit. No code changes in this run.**

## Success criteria
- Every overlapping module cluster in `lib/` is mapped: canonical survivor,
  dead/duplicate candidates, import evidence (who imports what).
- A target folder taxonomy for `lib/` is proposed, consistent with the
  existing `lib/domain`, `lib/services`, `lib/offline-first`, `lib/compression`,
  `lib/line` partial migration and with `CONTEXT.md`'s Forecast Facade.
- Every overlapping component cluster is mapped: canonical survivor, dead
  candidates, merge notes.
- A hygiene deletion/move list is produced with exact paths and rationale.
- A sequenced, safest-first execution plan with explicit approval gates.
- All findings cite file paths + line numbers; no claim without evidence.

## Current context
- Next.js 15 + React 19 + TS + Jest + Radix/shadcn UI.
- Domain glossary in `CONTEXT.md` defines Forecast Facade, Harmonic Synthesis,
  Calibration Offset, Fitted Constants, Offline-First.
- Partial migration already in flight: `lib/domain/`, `lib/services/`,
  `lib/offline-first/`, `lib/compression/`, `lib/line/` exist alongside ~60
  flat `lib/*.ts` files they were meant to replace.
- Tests in `tests/` (Jest, ts-jest). Several stray `test-*` scripts in repo root.

## Constraints
- **Read-only.** No edits, no moves, no deletions, no git mutations.
- No commits, pushes, publishes, or deploys.
- Subagents are read-only explorers; they must not edit.
- Findings must be evidence-based (paths + line numbers).

## Risk level
Medium for the *audit* (read-only, low risk). The *resulting plan* will
describe high-risk execution steps that require separate approval later.

## Approval gates
None triggered in this run (read-only). The produced plan will define
approval gates for the future execution phase.

## Mode
Delegated mode (Ultracode). 4 read-only explorer subagents in parallel,
non-overlapping ownership. Parent session integrates and writes the plan.

## Work packets
- **packet-A**: lib/ core tide-engine duplication (harmonic*, tide-service*,
  calibration*, water-level/tide comparison). Owns import graph for these.
- **packet-B**: lib/ data services + organizational overlap (external
  services, lib/services vs lib/domain vs lib/offline-first vs lib/compression
  vs lib/line). Owns import graph + proposes target taxonomy.
- **packet-C**: components/ dedup clusters. Owns import graph for clusters.
- **packet-D**: repo hygiene (tmp/bak/zero-byte/stray tests), tests/ layout,
  config constraints (tsconfig paths, next.config, eslint, jest).

## Eval contract (inline)
- Outcome: a refactor plan accurate enough to execute from without re-investigation.
- Shared surfaces: `lib/` module graph; `components/` import sites (mainly
  `app/page.tsx`, `app/layout.tsx`, `app/offline/page.tsx`, `app/tiles/page.tsx`).
- Required checks: every "dead" claim backed by an import search showing zero
  non-self references; every "canonical" claim backed by an import site or test.
- Blocking conditions: if a module's aliveness cannot be determined, mark it
  "unresolved" rather than guessing.
- Handoff evidence: each result file lists changed-surface candidates with paths.

## Integration policy
Parent session reads all four result files, cross-checks overlapping claims
(none expected by design, but taxonomy proposals from B must be reconciled
with A's canonical-survivor picks), resolves "unresolved" items by direct
inspection, then writes `integration.md` and `final-report.md` containing the
sequenced execution plan.

## Verification plan
- Re-read each result file; spot-check 3 random "dead" claims and 3 "canonical"
  claims against the actual files via grep.
- Confirm every packet returned evidence, not just conclusions.
- Confirm no packet edited any file (read-only profile enforces this).

## Completion criteria
- `integration.md` and `final-report.md` written.
- Final answer to user summarizes the plan and points to the artifacts.
