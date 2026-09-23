# Validate the config-hardening set against Next 15.2.4 / ESLint 9

Research note for ticket **02-config-validation** ("Validate the config-hardening set against Next 15.2.4 / ESLint 9").
Date: **2026-09-22**. Mode: AFK research. No config file was changed — every command below is read-only
(`git status --porcelain` after the session: only `.wayfinder/` is untracked; no tracked file changed).

Repo facts assumed throughout (`D:\Sunmoon`):

| Fact | Source |
| --- | --- |
| `next@15.2.4` installed, `eslint@9.38.0`, `eslint-config-next@16.2.10`, `typescript@5.0.2`, `pnpm@11.8.0` | `package.json`, `pnpm-lock.yaml` importers, `node_modules/*/package.json` |
| `eslint.config.mjs` = flat config importing `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` | `eslint.config.mjs` |
| `scripts.lint = "next lint"` | `package.json` |
| 36 dependency specifiers are literally `"latest"` | `package.json` |
| CI runs `pnpm install --frozen-lockfile`; Vercel runs `pnpm install --no-frozen-lockfile` | `.github/workflows/ci.yml`, `vercel.json` |

Verification commands run (all local, read-only):

```
npx next lint                              # current lint gate
npx eslint .            ; npx eslint . --quiet
pnpm install --frozen-lockfile --dry-run --ignore-scripts
git ls-files reports ; git status --porcelain
grep of node_modules/next/dist/** (config-schema.js, config.js, load-jsconfig.js, webpack-config.js,
                                   build/index.js, server/post-process.js, action-handler.js, constants.js)
```

---

## 1. `next.config.mjs` against Next 15.2.4

### 1.1 `modularizeImports.lucide-react` — superseded, and redundant here; drop it

**Verdict: still *accepted and functional* in 15.2.4, but undocumented and redundant for `lucide-react`.
Delete the block; no replacement is needed.**

Evidence:

- Still implemented in 15.2.4 — it is in the config schema and reaches the compiler:
  - `node_modules/next/dist/server/config-schema.js:499` — `modularizeImports: z.record(z.string(), z.object({...}))`
  - `node_modules/next/dist/build/webpack-config.js:401` and `:727` (also passed to the Turbopack/Rspack options), `:1791`
  - `node_modules/next/dist/build/webpack/loaders/next-swc-loader.js:151`
  - 15.2.4 even injects its own entries *after* the user's: `node_modules/next/dist/server/config.js:790-802` adds `@mui/icons-material` and `lodash`.
  - No deprecation warning is emitted anywhere in 15.2.4's `next/dist` for this key.
- It is **no longer documented**: `https://nextjs.org/docs/app/api-reference/config/next-config-js/modularizeImports`
  and `https://nextjs.org/docs/15/app/api-reference/config/next-config-js/modularizeImports` both return **404**,
  and the option is absent from the Next 15 doc index (`https://nextjs.org/docs/15/llms.txt`) while
  `optimizePackageImports` *is* listed. It is not in the Next 16 "Removals" list either
  (`https://nextjs.org/docs/app/guides/upgrading/version-16#removals`), so there is no formal deprecation
  notice — the option is simply legacy/undocumented.
- The successor (`experimental.optimizePackageImports`) already covers `lucide-react` **by default**:
  - Docs (both v15 and v16): the default list is `lucide-react`, `date-fns`, `lodash-es`, `ramda`, `antd`, … —
    `https://nextjs.org/docs/15/app/api-reference/config/next-config-js/optimizePackageImports`
  - And 15.2.4 hard-codes that default list: `node_modules/next/dist/server/config.js:807-824` merges
    `['lucide-react', 'date-fns', 'lodash-es', ...]` into `experimental.optimizePackageImports`.

**Exact replacement config:** none for `lucide-react`. Remove:

```js
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/{{member}}',
    },
  },
```

If some future package outside the built-in default list ever needs per-symbol splitting, the documented
option is (still experimental in 15.x and 16.x):

```js
  experimental: {
    optimizePackageImports: ['some-package'],   // additive; defaults are merged in
  },
```

Note the two mechanisms are not identical (`modularizeImports` rewrites to `pkg/{{member}}`, which requires
that deep-import path to exist); for `lucide-react` both produce the same result, and Next's own default
handles it — so removing the block is behaviour-neutral for this repo, to be confirmed by `pnpm build`.

### 1.2 `experimental.serverActions.allowedOrigins` — still the correct path in 15.x. Keep.

**Verdict: valid and correctly located. Server Actions are stable (since 14), but `allowedOrigins` deliberately
lives under `experimental.serverActions` in 15.x **and in 16.x**. Keep as-is.**

- v15 doc — the option is documented at exactly this path:
  `https://nextjs.org/docs/15/app/api-reference/config/next-config-js/serverActions#allowedorigins`
  ("Next.js compares the origin of a Server Action request with the host domain…"; example
  `experimental: { serverActions: { allowedOrigins: ['my-proxy.com', '*.my-proxy.com'] } }`).
  The same page states Server Actions became stable in Next.js 14 while the *options* stayed under `experimental`.
- v16 doc shows the identical path: `https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions`
- Local schema: `node_modules/next/dist/server/config-schema.js:260-263`
  (`experimental.serverActions = { bodySizeLimit?, allowedOrigins?: string[] }`); runtime enforcement at
  `node_modules/next/dist/server/app-render/action-handler.js:350` (`isCsrfOriginAllowed(originDomain, serverActions?.allowedOrigins)`).
- Wildcards are intended in 15.2.4 too — the type itself documents them:
  `node_modules/next/dist/server/config-shared.d.ts:396-402` (`@example ["my-app.com", "*.my-app.com"]`).
  The port-form entries (`localhost:3000`, `127.0.0.1:3000`) match the documented "host plus port" matching.
- Related but **different** key worth noting for the tunnels: `allowedDevOrigins` (top-level, present in 15.2.4 —
  `config-shared.js:63`, documented at `/docs/15/app/api-reference/config/next-config-js/allowedDevOrigins`) is what
  the *dev server* needs in order to serve assets/endpoints to a tunnel origin. The v16 docs explicitly say a tunnel
  host belongs in **both** places. Not requested by this ticket, but it is the other half of "works through a tunnel".

### 1.3 `experimental.optimizeCss: false` — valid but a no-op; undocumented; `critters` is dead weight

**Verdict: not deprecated, but `false` is the default, so the key can be deleted with zero behaviour change. With it
false, the `critters` dependency is never loaded — `critters: ^0.0.25` in `dependencies` is unused. Either delete the
key (recommended) or, if it is kept as documentation of intent, keep `critters` too.**

- Schema: `node_modules/next/dist/server/config-schema.js:292-295` — `optimizeCss: z.union([z.boolean(), z.any()])`
  (the comment there is literally "The critter option is unknown, use z.any() here").
- Default is `false`, and only a truthy value does anything:
  - `node_modules/next/dist/build/index.js:1423` (`if (config.experimental.optimizeCss) { … }`) and `:1443` (telemetry).
  - `node_modules/next/dist/build/webpack/plugins/define-env-plugin.js:165` → `process.env.__NEXT_OPTIMIZE_CSS`
    is `(config.experimental.optimizeCss && !dev) ?? false`.
  - `node_modules/next/dist/server/post-process.js:24-32` — `require('critters')` is a **lazy** require inside the
    post-process path, i.e. only reached when the option is enabled.
- It is not documented in the 15.x doc index (`https://nextjs.org/docs/15/llms.txt` has no `optimizeCss` entry), so
  there is no doc URL to cite for the "requires critters" rule any more — the option is legacy.
- `critters@0.0.25` is explicitly deprecated upstream ("Ownership of Critters has moved to the Nuxt team … switch to …
  beasties"), observed in the pnpm install warnings.

### 1.4 `images.unoptimized: true` — still correct. Keep (it is a product decision, not a deprecation).

**Verdict: valid, documented, and not deprecated. Nothing to change.**

- Docs: `https://nextjs.org/docs/15/app/api-reference/components/image#unoptimized` — "Since Next.js 12.3.0, this prop
  can be assigned to all images by updating `next.config.js` with `images: { unoptimized: true }`". The image page's
  "Deprecated configuration options" section lists only `domains` (deprecated since 14), not `unoptimized`.
- Local schema: `node_modules/next/dist/server/config-schema.js:463` — `unoptimized: z.boolean().optional()`.
- Effect: `next/image` serves the `src` as-is instead of going through `/_next/image` (no on-demand resize/format
  conversion). This is the same switch that makes the app deployable as a static/edge-only surface, so it remains
  “correct and still needed” for this offline-first app; the only cost is losing automatic image optimization.

### 1.5 webpack `'@'` alias — redundant with `tsconfig.json` paths. Remove (and it must go before a Next 16 move).

**Verdict: redundant. Next resolves `@/*` from `tsconfig.json` itself; the webpack alias duplicates it. Removing the
`webpack` function is safe in principle, but it is a behaviour-visible change and must be verified with `pnpm build`
(and it is *required* before any Next 16 upgrade, see below).**

- Docs: `https://nextjs.org/docs/15/app/getting-started/installation#set-up-absolute-imports-and-module-path-aliases` —
  "Next.js has in-built support for the `"paths"` and `"baseUrl"` options of `tsconfig.json` and `jsconfig.json` files."
- Local proof that the tsconfig alone is enough even **without** `baseUrl`:
  - `node_modules/next/dist/build/load-jsconfig.js:132` sets `implicitBaseurl = path.dirname(tsConfigPath)` and
    `:140-151` falls back to that implicit base URL when `compilerOptions.baseUrl` is absent.
  - `node_modules/next/dist/build/webpack-config.js:1681` always installs
    `new JsConfigPathsPlugin(jsConfig.compilerOptions.paths, resolvedBaseUrl)` ("always add JsConfigPathsPlugin to allow
    hot-reloading").
  - `tsconfig.json` here has `"paths": { "@/*": ["./*"] }` and no `baseUrl` → `@/x` → `<repo>/x`, exactly what the
    webpack alias `'@': rootDir` does.
- Scope/behaviour notes for whoever applies this:
  - Jest is unaffected: `package.json` has its own `moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" }`.
  - The inverse risk is worth recording: while both exist, TypeScript resolves `@/*` from `tsconfig.json` and webpack
    from the alias — if the two ever disagree, the editor and the build disagree silently. Removing one of them
    removes that class of bug.
  - Next 16 makes this mandatory rather than optional: "If your project has a custom `webpack` configuration and you run
    `next build` (which now uses Turbopack by default), the build will **fail**" — removing the whole `webpack(Object)`
    key now avoids that cliff later (`https://nextjs.org/docs/app/guides/upgrading/version-16#turbopack-by-default`).

### 1.6 Other keys in the file (checked, not asked)

`compress`, `onDemandEntries`, `productionBrowserSourceMaps`, `headers` and `images` are all present in the Next 15
config reference index (`https://nextjs.org/docs/15/llms.txt` → next.config.js options) and validate against
`node_modules/next/dist/server/config-schema.js`. The custom `headers()` ordering logic is a Next-specific behaviour
question, out of scope here.

---

## 2. `scripts.lint = "next lint"` in Next 15.2.4

**Verdict: `next lint` still exists and *works* in 15.2.4 (it is not deprecated in this version, and it does read the
flat config), but it is deprecated as of 15.5 and removed in 16 — and the replacement is not a drop-in unless the
command is scoped. The version pairing `next@15.2.4` + `eslint-config-next@^16.2.10` is *not* a hard problem and should
be kept as-is.**

### 2.1 Status of `next lint`

- Present and functional in 15.2.4, and **flat-config aware**:
  - `node_modules/next/dist/lib/eslint/runLintCheck.js:128-135` — `const useFlatConfig = eslintrcFile ?
    path.basename(eslintrcFile).startsWith('eslint.config.') : false;` and it then uses the flat worker/ESLint class;
  - `:268-287` — the config search list includes `eslint.config.js|mjs|cjs|ts|mts|cts` alongside `.eslintrc*`;
  - `node_modules/next/dist/cli/next-lint.js:56-64` — `--dir/--file`, else `ESLINT_DEFAULT_DIRS`;
  - `node_modules/next/dist/lib/constants.js:271-275` — `ESLINT_DEFAULT_DIRS = ['app','pages','components','lib','src']`.
- Deprecation timeline (docs, not local):
  - 15.5 blog: "Starting with Next.js 15.5, the `next lint` command shows a deprecation warning and will be removed in
    Next.js 16" and it names the new scripts (`"lint": "eslint"`, `"lint:fix": "eslint --fix"`) plus the codemod
    `npx @next/codemod@latest next-lint-to-eslint-cli .`
    — `https://nextjs.org/blog/next-15-5#next-lint-deprecation`
  - Next 16 upgrade guide: "The `next lint` command has been removed. Use Biome or ESLint directly. `next build` no
    longer runs linting." — `https://nextjs.org/docs/app/guides/upgrading/version-16#next-lint-command`
  - The Next 15 install page's own `package.json` example already uses `"lint": "eslint"`:
    `https://nextjs.org/docs/15/app/getting-started/installation` (Manual installation → scripts block).

### 2.2 Exact new script line — and the trap that comes with it

```jsonc
// package.json
"lint": "eslint",
"lint:fix": "eslint --fix",   // optional
```

`eslint` with no path defaults to the current directory (equivalent to `eslint .`); `--max-warnings 0` is what
replaces `next lint --strict`. **However, running that today makes the gate red**, because the CLI lints the *whole*
repo while `next lint` only visited `app/pages/components/lib/src`:

| Command (run 2026-09-22) | Result |
| --- | --- |
| `npx next lint` | exit **0** — warnings only (≈60 warnings across `app/`, `components/`, `lib/`), no errors |
| `npx eslint .` | exit **1** — 338 problems (**45 errors**, 293 warnings) |
| `npx eslint . --quiet` | exit **1** — 45 errors: **43 of them inside `.claude/worktrees/tide-accuracy-improvements/**`** (the stale registered worktree copy of the repo), plus **2 real ones**: `tailwind.config.ts:94` and `tests/thailand-time.test.ts:50`, both `@typescript-eslint/no-require-imports` |

Consequences to record for the execution ticket:

1. The switch must be scoped or ignored, otherwise `pnpm lint` goes from green to 45 errors. ESLint's only default
   ignores are `["**/node_modules/", ".git/"]` (`https://eslint.org/docs/latest/use/configure/ignore`), so `.claude/`,
   `.next/` and anything else are linted by `eslint .`.
2. Minimal fix to keep the gate green in the same change set: add `globalIgnores([...])` to `eslint.config.mjs`
   (`import { defineConfig, globalIgnores } from "eslint/config"`, exported from `eslint/config`) covering at least
   `.claude/` — or run `eslint app components lib hooks scripts tests` explicitly — **and** clear the 2 real errors
   (or ignore `tailwind.config.ts` + `tests/`).
3. Coverage genuinely changes: `hooks/**`, `scripts/**`, `tests/**`, `tailwind.config.ts` were never linted by
   `next lint` and are now in scope. Today that is only warnings for `hooks/**` (`react-hooks/set-state-in-effect`,
   `react-hooks/exhaustive-deps`) — but it is new signal, not a like-for-like swap.
4. Because `next build` in 15.2.4 also runs its own lint pass, `lint` and `build` are currently redundant; after the
   switch only the explicit `eslint` step reports lint.

### 2.3 Is the `eslint-config-next@16` + `next@15.2.4` pairing a problem? Keep v16.

- **It installs and runs cleanly.** `eslint-config-next@16.2.10` declares peer deps `eslint >=9.0.0` and
  `typescript >=3.3.1` only — **no `next` peer** — so pnpm installs it beside `next@15.2.4` with no peer warning
  (`node_modules/eslint-config-next/package.json`; same via `npm view`). `npx next lint` and `npx eslint .` both ran
  successfully against it in this repo.
- **It is the version that makes the current `eslint.config.mjs` work.** v16 ships flat-config entry points
  `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` (`exports` map: `./core-web-vitals`,
  `./typescript`, `./parser`) and depends on `eslint-plugin-react-hooks ^7.0.0` (which is where
  `react-hooks/set-state-in-effect` comes from) and `typescript-eslint ^8.46.0` (which provides
  `@typescript-eslint/no-explicit-any`). The Next 16 upgrade guide also notes `@next/eslint-plugin-next` "now defaults
  to ESLint Flat Config format" (`https://nextjs.org/docs/app/guides/upgrading/version-16#eslint-flat-config`).
- **Downgrading to `eslint-config-next@15.2.x` is *not* a drop-in** and would be the bigger change:
  - `eslint-config-next@15.5.25`'s `core-web-vitals.js` is a **legacy eslintrc object** —
    `module.exports = { extends: [require.resolve('.'), 'plugin:@next/next/core-web-vitals'] }`
    (verified at `https://unpkg.com/eslint-config-next@15.5.25/core-web-vitals.js`); spreading it into a flat-config
    array is invalid for ESLint 9.
  - Its dependency set pins `eslint-plugin-react-hooks ^5.0.0`, `@typescript-eslint/* ^5||6||7||8` and
    `@rushstack/eslint-patch`, so the rule `react-hooks/set-state-in-effect` used in the repo's override block would
    not exist → "Definition for rule was not found" errors.
  - The 15 docs' own flat-config recipe is `FlatCompat` from `@eslint/eslintrc`
    (`https://nextjs.org/docs/15/app/api-reference/config/eslint#with-core-web-vitals`) — i.e. a different config file
    shape, and the `@eslint/eslintrc` devDependency already in `package.json` exists for exactly that legacy path.
- **Residual (low) risk to record, not act on:** `@next/eslint-plugin-next@16.2.10` applies Next 16-era rule
  definitions to a Next 15 app, so rule coverage/messages may drift from the Next 15 line; the repo's explicit
  `warn` overrides (`react-hooks/set-state-in-effect`, `react/display-name`, `@typescript-eslint/no-explicit-any`)
  plus `next/core-web-vitals` keep the noise bounded. When `next` is eventually bumped to 16, `lint` (ESLint CLI) and
  `eslint-config-next` become version-aligned with no further change.

---

## 3. Versions to pin — resolved from `pnpm-lock.yaml`

Every dependency whose specifier is currently `"latest"` (36 entries: 27 `@radix-ui/*` + 9 others). Read from
`pnpm-lock.yaml` → `importers['.'].dependencies`, and cross-checked to exist in the `packages:` section of the same
lockfile (line numbers in the last column of the check are from `pnpm-lock.yaml`).

| package | resolved version |
| --- | --- |
| `@radix-ui/react-accordion` | 1.2.20 |
| `@radix-ui/react-alert-dialog` | 1.1.23 |
| `@radix-ui/react-aspect-ratio` | 1.1.15 |
| `@radix-ui/react-avatar` | 1.2.6 |
| `@radix-ui/react-checkbox` | 1.3.11 |
| `@radix-ui/react-collapsible` | 1.1.20 |
| `@radix-ui/react-context-menu` | 2.3.7 |
| `@radix-ui/react-dialog` | 1.1.23 |
| `@radix-ui/react-dropdown-menu` | 2.1.24 |
| `@radix-ui/react-hover-card` | 1.1.23 |
| `@radix-ui/react-label` | 2.1.15 |
| `@radix-ui/react-menubar` | 1.1.24 |
| `@radix-ui/react-navigation-menu` | 1.2.22 |
| `@radix-ui/react-popover` | 1.1.23 |
| `@radix-ui/react-progress` | 1.1.16 |
| `@radix-ui/react-radio-group` | 1.4.7 |
| `@radix-ui/react-scroll-area` | 1.2.18 |
| `@radix-ui/react-select` | 2.3.7 |
| `@radix-ui/react-separator` | 1.1.15 |
| `@radix-ui/react-slider` | 1.4.7 |
| `@radix-ui/react-slot` | 1.3.3 |
| `@radix-ui/react-switch` | 1.3.7 |
| `@radix-ui/react-tabs` | 1.1.21 |
| `@radix-ui/react-toast` | 1.2.23 |
| `@radix-ui/react-toggle` | 1.1.18 |
| `@radix-ui/react-toggle-group` | 1.1.19 |
| `@radix-ui/react-tooltip` | 1.2.16 |
| `cmdk` | 1.1.1 |
| `date-fns` | 4.4.0 |
| `input-otp` | 1.5.0 |
| `next-themes` | 0.4.6 |
| `pigeon-maps` | 0.22.1 |
| `react-day-picker` | 10.0.1 |
| `react-resizable-panels` | 4.12.4 |
| `sonner` | 2.0.8 |

Notes / caveats (all local facts):

- All 36 keys are recorded in the lockfile with `specifier: latest` and a concrete `version:`; each also exists in the
  lockfile's `packages:` section (e.g. `@radix-ui/react-accordion@1.2.20` at line 1037, `cmdk@1.1.1` at 2298,
  `date-fns@4.4.0` at 2449, `react-resizable-panels@4.12.4` at 3936, `sonner@2.0.8` at 4130).
- **Two duplicates to expect after pinning** (pinning the direct dependency does not remove the nested copy):
  - `date-fns`: the importer resolves **4.4.0**, but `date-fns@4.1.0` also exists in the lockfile as a transitive
    dependency (line 2446) — pinning `date-fns: 4.4.0` leaves that nested copy in place.
  - `@radix-ui/react-slot`: importer resolves **1.3.3**; `@radix-ui/react-slot@1.2.3` remains as a transitive
    dependency of other radix packages (line 1503).
- **Pin to exact versions**, per the map's "pin version, reproducible" decision. A caret (`^4.12.4`) would also satisfy
  a frozen lockfile install once the lockfile is regenerated, but only an exact pin guarantees the next resolution does
  not move.
- Pinning changes the `specifier:` fields in the lockfile, so **`package.json` and `pnpm-lock.yaml` must be committed
  together** (run `pnpm install` / `pnpm install --lockfile-only` as part of the change); otherwise every
  `--frozen-lockfile` install fails. See item 4.

---

## 4. `vercel.json` — `--frozen-lockfile`, and untracking `reports/*`

### 4.1 Is switching safe? Not today — it is safe only *after* item 3 lands

**Verdict: switching Vercel to `pnpm install --frozen-lockfile` is the right end state, but it fails today. The
`--no-frozen-lockfile` flag is currently the only thing letting the install succeed, because with 36 `"latest"`
specifiers the lockfile can never be considered in sync.**

Evidence:

- `pnpm install --frozen-lockfile --dry-run --ignore-scripts` (pnpm **11.8.0**, run in the repo on 2026-09-22) reported
  that a real install would change dependencies:
  `react-resizable-panels 4.12.4(…) → 4.13.1(…)` (+ one package added, one removed). The manifest says `"latest"`, so
  "an update is needed" is permanent — a new release upstream re-breaks the frozen check.
- pnpm's documented semantics: `--frozen-lockfile` — Default: **false** for non-CI, **true for CI** if a lockfile is
  present; "If `true`, pnpm doesn't generate a lockfile and fails to install if the lockfile is out of sync with the
  manifest / an update is needed or no lockfile is present." — `https://pnpm.io/cli/install#--frozen-lockfile`
- Vercel sets `CI=1` at build time (`https://vercel.com/docs/environment-variables/system-environment-variables#CI`),
  so on Vercel the pnpm default is already frozen — the explicit `--no-frozen-lockfile` in `vercel.json` is exactly what
  opts out of it.
- `installCommand` in `vercel.json` overrides Project Settings for that deployment
  (`https://vercel.com/docs/project-configuration/vercel-json#installcommand`); an empty string skips install entirely.
- The same staleness applies to CI: `.github/workflows/ci.yml` already runs `pnpm install --frozen-lockfile`, so with a
  drifting lockfile the CI install step is the next thing to break. That makes pinning (item 3) a precondition for both.

Recommended order (for the execution ticket, not applied here):

1. Replace all 36 `"latest"` specifiers with the pinned versions from item 3.
2. Run `pnpm install` to regenerate `pnpm-lock.yaml`; commit `package.json` + `pnpm-lock.yaml` together.
3. Set `vercel.json` to `{ "installCommand": "pnpm install --frozen-lockfile" }` — or delete `vercel.json` entirely and
   let pnpm's CI default apply (same effect on Vercel, fewer moving parts; note the default would also start enforcing
   frozen installs on any other CI that sets `CI`).
4. Re-confirm both places: CI's `pnpm install --frozen-lockfile` step and a Vercel deployment.

Residual risks to keep in mind when loosening is tempting again: `--no-frozen-lockfile` lets the Vercel build rewrite
the lockfile, so Vercel can ship a dependency set CI never validated (drift by construction); and a pnpm version
mismatch on the build image is the other classic reason people loosen it — here `packageManager: pnpm@11.8.0` pins it
(corepack), and CI uses `pnpm/action-setup@v4` which reads the same field.

Also observed in passing: the local dry-run warned
`Unsupported engine: wanted: {"node":">=18.18 <22"} (current: {"node":"v24.16.0"})` — engines are not enforced on Vercel
(only a warning), but CI pins Node 20, consistent with `engines.node`.

### 4.2 Does untracking `reports/*` affect the Vercel build? No.

**Verdict: no effect on the Vercel build. `reports/` is not read by anything in the build or runtime path; it is a
generated-artifact directory consumed only by docs and written by offline scripts. The only real consequence is
provenance of the committed baselines.**

Evidence (local):

- 21 files are tracked under `reports/` today (`git ls-files reports`): `reports/perf/bench-tide-baseline.json`,
  `reports/perf/bench-tide-after-ephemeris-hoist.json`, and `reports/tide-comparison-{2025-03-24, 2026-06-20, …,
  2026-08-15}.{json,md}`.
- Nothing in `app/`, `lib/`, `components/`, `hooks/` or `next.config.mjs` references `reports/`. The only references
  are documentation and the offline scripts:
  - `scripts/perf/bench-tide.ts:82` — default `--out` is `reports/perf/bench-tide.json` (writes there);
  - `docs/architecture.md:148,150`, `docs/README.md:20` — cite `reports/perf/` as "the committed baseline";
  - archived plans under `docs/superpowers/**` reference `reports/tide-comparison-*` (historical).
- Vercel builds from the git checkout, so untracked files simply are not present there — and because nothing in the
  build reads them, nothing changes. `next build`'s output-file tracing only follows actual imports, so `reports/` would
  not be pulled into the deployment either way.
- Practical consequences for the hygiene pass: (a) if `docs/architecture.md` is to keep pointing at a *committed*
  baseline, either keep the two `reports/perf/*.json` files tracked or rewrite that paragraph — that decision belongs to
  ticket "Execute the hygiene pass"; (b) add `reports/` (or `reports/**` minus tracked files) to `.gitignore` so local
  runs of `scripts/perf/bench-tide.ts` and `scripts/compare-external-tides.ts` do not re-add artifacts.

---

## 5. Adjacent findings worth carrying into the execution ticket

1. **`next@15.2.4` is a vulnerable version (critical).** The pnpm install prints
   `deprecated next@15.2.4: This version has a security vulnerability…`. Per the advisory
   `https://nextjs.org/blog/CVE-2025-66478`: CVE-2025-66478 (with upstream CVE-2025-55182) is a **CVSS 10.0 RSC
   remote-code-execution** issue affecting **all Next.js 15.x App Router apps**, and the patched releases include
   **15.2.6** for the 15.2.x line (`15.0.5`, `15.1.9`, `15.2.6`, `15.3.6`, `15.4.8`, `15.5.7`, `16.0.7`). Pinning
   `next` to `15.2.6` is a patch-level bump inside the current line (not the Next 15→16 upgrade the map excludes) and
   belongs in the hardening set; the advisory also recommends rotating secrets for any app that was online unpatched.
2. `critters@0.0.25` — deprecated upstream (moved to the `beasties` fork) and unused while `optimizeCss` is false (§1.3).
3. `eslint@9.38.0` — npm now flags it as no longer supported by ESLint's version policy; independent of the flat-config
   question, but if the lint config is being touched anyway, a current 9.x is the cheap fix.
4. `recharts@2.15.0` — flagged deprecated ("1.x and 2.x branches are no longer active"), out of scope here.
5. Unverified / explicitly out of scope in this note: the exact `allowedOrigins` wildcard matcher implementation in
   15.2.4 (only the option path, schema and the JSDoc wildcard example were verified locally; the `*`/`**` semantics
   are documented on the v16 page); whether `eslint-config-next@15.5.x`'s exports could be adapted to this flat config
   (it cannot, without FlatCompat — §2.3); and the `headers()` matching/override semantics in `next.config.mjs`.

---

## Sources

Docs and advisories:

- Next.js 15 — `next.config.js: serverActions` (allowedOrigins path in 15.x):
  https://nextjs.org/docs/15/app/api-reference/config/next-config-js/serverActions
- Next.js 16 — `next.config.js: serverActions` (same path in 16.x, wildcard/port semantics):
  https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- Next.js 15 — `optimizePackageImports` (default-optimized package list): https://nextjs.org/docs/15/app/api-reference/config/next-config-js/optimizePackageImports
- Next.js 16 — `optimizePackageImports` (still experimental; same default list): https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
- Next.js 15 — `modularizeImports` (page no longer exists; 404): https://nextjs.org/docs/15/app/api-reference/config/next-config-js/modularizeImports
- Next.js 16 — `modularizeImports` (page no longer exists; 404): https://nextjs.org/docs/app/api-reference/config/next-config-js/modularizeImports
- Next.js 15 documentation index (config options actually documented in 15.x): https://nextjs.org/docs/15/llms.txt
- Next.js 15 — Image Component (`unoptimized` prop + `images.unoptimized`; deprecated list contains only `domains`): https://nextjs.org/docs/15/app/api-reference/components/image
- Next.js 15 — `images` config page: https://nextjs.org/docs/15/app/api-reference/config/next-config-js/images
- Next.js 15 — Installation (absolute imports / module path aliases; `"lint": "eslint"` script example): https://nextjs.org/docs/15/app/getting-started/installation
- Next.js 15 — ESLint plugin config (FlatCompat recipes used by the 15 line): https://nextjs.org/docs/15/app/api-reference/config/eslint
- Next.js 15.5 release notes (`next lint` deprecation, new scripts, codemod): https://nextjs.org/blog/next-15-5#next-lint-deprecation
- Next.js 16 upgrade guide (`next lint` removed, `next build` no longer lints, ESLint flat config default, custom webpack + Turbopack build failure, removals list): https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js security advisory CVE-2025-66478 (affected 15.x; patched versions incl. 15.2.6): https://nextjs.org/blog/CVE-2025-66478
- `eslint-config-next@15.5.25` `core-web-vitals.js` (legacy eslintrc shape): https://unpkg.com/eslint-config-next@15.5.25/core-web-vitals.js
- pnpm — `install` (`--frozen-lockfile` default and failure semantics): https://pnpm.io/cli/install
- Vercel — system environment variables (`CI=1` at build time): https://vercel.com/docs/environment-variables/system-environment-variables
- Vercel — `vercel.json` (`installCommand` overrides project settings): https://vercel.com/docs/project-configuration/vercel-json#installcommand
- ESLint — Ignore files (only `**/node_modules/` and `.git/` are ignored by default): https://eslint.org/docs/latest/use/configure/ignore

Repo files and installed packages (local, version-pinned evidence):

- `next.config.mjs`, `package.json`, `eslint.config.mjs`, `vercel.json`, `tsconfig.json`
- `.github/workflows/ci.yml`, `.wayfinder/map.md`, `.wayfinder/README.md`, `.wayfinder/tickets/02-config-validation.md`
- `pnpm-lock.yaml` (importers + packages sections)
- `node_modules/next/dist/server/config-schema.js`, `server/config.js`, `server/config-shared.{js,d.ts}`,
  `build/index.js`, `build/load-jsconfig.js`, `build/webpack-config.js`, `build/webpack/loaders/next-swc-loader.js`,
  `build/webpack/plugins/define-env-plugin.js`, `server/post-process.js`, `server/app-render/action-handler.js`,
  `lib/eslint/runLintCheck.js`, `cli/next-lint.js`, `lib/constants.js`
- `node_modules/eslint-config-next/package.json`, `node_modules/eslint/package.json`
- `docs/architecture.md`, `docs/README.md`, `scripts/perf/bench-tide.ts`
- Command output captured 2026-09-22: `npx next lint`, `npx eslint .`, `npx eslint . --quiet`,
  `pnpm install --frozen-lockfile --dry-run --ignore-scripts`, `git ls-files reports`, `git status --porcelain`
