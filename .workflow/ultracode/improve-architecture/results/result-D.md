# Result D — repo hygiene + tests layout + config constraints

Captured from subagent 3dd15976 output (subagent profile could not write files).

## 1. Hygiene deletion/move list (12 files)

### Zero-byte (2) — delete
- `STATUS_REPORT.md` (0 bytes)
- `test-location-parsing.js` (0 bytes)

### Backup files (2) — delete
- `components/enhanced-location-selector.tsx.bak`
- `lib/services/line-service.ts.bak`

### Stray root test scripts (7) — delete (not in package.json scripts, not in CI)
- `smoke-test.js`, `test-api.ps1`, `test-api.sh`, `test-compact-simple.mjs`, `test-current-vs-forecast.js`, `test-harmonic-verification.js`, `test-endpoint.ps1`

### Generated artifact (1) — gitignore + regenerate
- `lint-report.txt` (~57KB, ESLint output)

### tmp-* (0)
Already gitignored (`/tmp-*` at .gitignore:29). None found in root.

## 2. Tests layout & coverage gaps

### Current structure
`tests/` with flat test files + `tests/lib/domain/`, `tests/lib/`, `tests/scripts/`, `tests/services/`. Legacy JS tests: `harmonic-calculation-test.js`, `integration-test.js`, `storage-compression-test.js` (not matched by jest testRegex `tests/.*\.test\.[jt]sx?$` — so NOT run by Jest; dead).

### Coverage: 23/70 lib modules have tests (33%); 47 lack tests
Key untested core modules: `harmonic-engine`, `harmonic-prediction`, `tide-service` (tested indirectly), `offline-first/*` (6 files), `tile-*`, `indexed-db`, `line/*` (tested indirectly via line-service), `security-manager` (dead), `calibration-system`, `confidence-bands`.

### Stray root test scripts
Not referenced by package.json:8-18 or CI (no .github/workflows). Delete, don't move.

## 3. Config constraints for future restructuring

| Constraint | Source | Implication |
|------------|--------|-------------|
| `@/*` → repo root (`"./*"`) | tsconfig.json:22-23 | Moves must update `@/lib/...` import paths |
| webpack alias `@` → `.` | next.config.mjs:22-28 | Keep `@/` alias |
| Jest `roots: ["<rootDir>/tests"]` | package.json:21-23 | All tests under tests/ |
| Jest `testRegex: tests/.*\.test\.[jt]sx?$` | package.json:24 | Legacy `*-test.js` files NOT run |
| Jest `moduleNameMapper @/ → root` | package.json:25-27 | Matches tsconfig |
| Headers for `/api/tiles/(.*)` | next.config.mjs:67-79 | Keep `/api/tiles/` route path |
| shadcn `components: @/components`, `utils: @/lib/utils` | components.json:13-14 | Keep components/ and lib/utils.ts paths |
| Tailwind content: `./pages/**`, `./components/**`, `./app/**`, `./src/**` | tailwind.config.ts:5-10 | Moves within these dirs are safe |
| `*.bak` NOT in .gitignore | .gitignore | MISSING — add |
| `lint-report.txt` NOT in .gitignore | .gitignore | MISSING — add |

## 4. Proposed .gitignore additions
```gitignore
*.bak
lint-report.txt
test-*.js
test-*.mjs
test-*.ps1
test-*.sh
```

## 5. Risks & recommended action
- Low risk: delete .bak, zero-byte, stray test scripts.
- Medium: `*.bak` gitignore may hide legit backups (unlikely).
- Legacy JS test files in tests/ (`*-test.js`) are NOT run by Jest — either rename to `.test.js` or delete.
- When restructuring lib/, maintain `@/` alias + update all import paths.

## Confirmation summary
- Hygiene targets: 12 files (2 zero-byte, 2 .bak, 7 stray tests, 1 gitignore)
- Test coverage gaps: 47/70 lib modules (67%) untested
- Key config constraints: `@/` alias in tsconfig/webpack/jest; Jest roots=tests/; shadcn aliases fixed
- Unresolved: exact byte sizes (estimated)
