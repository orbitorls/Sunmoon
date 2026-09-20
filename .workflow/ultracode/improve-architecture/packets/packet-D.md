# Packet D — repo hygiene + tests/ layout + config constraints

You are working in the same repo as other agents. **Read-only. Do not edit any file.**

Repo root: `D:\Sunmoon`

## Task
(1) Produce a hygiene deletion/move list (tmp, bak, zero-byte, stray scripts).
(2) Audit `tests/` layout and coverage gaps. (3) Review config files for
constraints that affect any future restructuring (import aliases, build config,
lint/test config).

## Scope
Hygiene (repo root):
- All `tmp-*` files (PDFs, txt, json, ts, html) in repo root.
- All `*.bak` files anywhere in the repo.
- Zero-byte files: `STATUS_REPORT.md`, `test-location-parsing.js`, and any
  others you find.
- Stray root test scripts: `smoke-test.js`, `test-api.ps1`, `test-api.sh`,
  `test-compact-simple.mjs`, `test-current-vs-forecast.js`,
  `test-harmonic-verification.js`, `test-endpoint.ps1`.
- `lint-report.txt` (57KB) — is it a generated artifact that should be gitignored?

Tests layout:
- `tests/` tree (including `tests/lib/...`, `tests/services/...`,
  `tests/scripts/...`).
- Which `lib/` modules have tests, which don't (gap list).
- Stray root test scripts: are they referenced by package.json scripts or CI?
  Should they move into `tests/` or be deleted?

Config (read for constraints, do NOT change):
- `tsconfig.json` — path aliases (`@/*`), target, module resolution.
- `next.config.mjs` — any rewrites/redirects/webpack tweaks that reference
  specific paths.
- `eslint.config.mjs` — rules, ignore patterns.
- `jest` block in `package.json` — `roots`, `testRegex`, `moduleNameMapper`.
- `.gitignore` — what's already ignored; what tmp/bak patterns are missing.
- `components.json` — shadcn aliases (affects components/ui placement).
- `pnpm-workspace.yaml`, `vercel.json`, `postcss.config.mjs`, `tailwind.config.ts`.

## Do
- List every hygiene target with exact path, size, and a one-line rationale
  (delete / move-to-tests / gitignore-and-regenerate).
- Confirm `.bak` and `tmp-*` files are not referenced by any source/config
  (grep for their basenames).
- For tests: produce a coverage-gap table (lib module → has test? y/n).
- For config: list every constraint that a future move/rename must honor
  (e.g. "`@/*` maps to repo root", "jest roots = tests/", "shadcn alias = @/components").
- Propose `.gitignore` additions to prevent tmp/bak recurrence.

## Do not
- Edit, move, rename, delete, or gitignore anything.
- Audit lib/ duplication (A/B) or components (C).

## Expected output (write to `D:\Sunmoon\.workflow\ultracode\improve-architecture\results\result-D.md`)
- Hygiene table: path | size | action | rationale | referenced-by.
- Tests coverage-gap table.
- Config constraints list (constraint → source file:line → implication).
- Proposed `.gitignore` additions.
- Risks + recommended parent action.
- Cite paths + line numbers.
