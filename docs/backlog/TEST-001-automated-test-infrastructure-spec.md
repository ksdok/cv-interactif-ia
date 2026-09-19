# TEST-001 — Automated Test Infrastructure Spec

**Priorité** : CRITICAL (cf. `project-state.md` — maturité Tests 1/10)
**Effort estimé** : S (< 1 h)
**Bloque** : CICD-001
**Révision** : 2026-09-19 — review : cible Node tranchée, parité de couverture 37 cas,
suppression actée de `lib/test-validation.ts` + table de propagation, section Pitfalls

## Goal
Add a real automated test runner to the project so validation and utility logic can be executed in CI and before merges.

## Why this ticket exists
Current state in the repo (vérifié le 2026-09-19) :
- `package.json` has no `test` script, and no `type-check` script either (see §2).
- No `*.test.*` or `*.spec.*` files exist.
- `lib/test-validation.ts` is **not a working manual runner — it is dead code** :
  - `node lib/test-validation.ts` fails with
    `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../lib/validation' imported from '.../lib/test-validation.ts'`
    (extensionless import is not resolvable by Node's ESM resolver).
  - its docblock documents `npm run test:validation`, a script that does **not** exist in `package.json`.
  - its entry guard `if (typeof require !== 'undefined' && require.main === module)` is always false
    under ESM, so `runValidationTests()` is never invoked.
- The **cases** it contains are nonetheless valuable and must not be lost: the `testCases` array holds
  **37 cases** (13 valid / 24 invalid), of which **24 carry an `expectedError`**. Today those 24
  expectations are only `console.log`-warned on mismatch and **never asserted**, so they have never
  been enforced by anything.
- `docs/security/*` claim "40+ test cases — all passing ✅". Both numbers are wrong: there are 37 cases
  and none of them has ever been executed. See the propagation table below.

This makes every code change effectively unguarded.

## Dependencies
- **Bloque** : CICD-001

CICD-001 depends on this ticket because its pipeline runs `npm run test` and `npm run type-check`.
The dependency is declared in both directions on purpose: any change to the script names or to the
Node target here must be propagated to CICD-001 in the same pass.

## Scope
Deliver the minimum viable automated test foundation for this Next.js + TypeScript repo.

In scope:
- install and configure Vitest
- add `npm run test` (non-watch) and `npm run test:watch`
- migrate **all 37** validation cases from `lib/test-validation.ts` into real automated tests
- make the setup compatible with future unit tests for `lib/csrf.ts`, `lib/linkify.ts`, and `lib/rateLimit.ts`

Out of scope:
- Playwright
- API integration tests with MSW
- broad component test coverage
- React component testing (⇒ no `@vitejs/plugin-react`, no `jsdom`, no `@testing-library/*` in this ticket, see §1)
- coverage thresholds (see §2, `test:coverage` is optional)

## Files to inspect first
- `package.json` (current scripts, absence of `engines`)
- `tsconfig.json` (`paths`, `include`)
- `lib/test-validation.ts` (the 37 cases to migrate)
- `lib/validation.ts` (the module under test)
- `lib/csrf.ts`, `lib/linkify.ts`, `lib/rateLimit.ts` (future test targets — read for testability constraints)
- `docs/backlog/CICD-001-minimal-ci-pipeline-spec.md` (consumer of the scripts added here)
- `docs/security/INPUT_VALIDATION_SECURITY.md`, `docs/security/SECURITY_IMPLEMENTATION_COMPLETE.md` (stale claims to fix)

## Required changes

### 0. Pin the Node target before anything else
Vitest's supported Node range is a hard install-time constraint, and it is **stricter than Next.js's**.
Verified against the npm registry:

| Package | `engines.node` |
|---|---|
| `next@16.0.10` | `>=20.9.0` |
| `vitest@5.0.1` (latest) | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| `vite@7.x` / `vite@8.x` (transitive) | `^20.19.0 \|\| >=22.12.0` |

Decision: **target Node 22.12+ (`>=22.12.0`)**.

Actions:
- add to `package.json`: `"engines": { "node": ">=22.12.0" }`
- update `README.md:41` (`- Node.js 18+` → `- Node.js 22.12+`) — Node 18 is already wrong for Next 16 (`>=20.9.0`), so this line must not survive this ticket
- **If the project must stay on Node 20**, then install `vitest@^4` instead (`engines: ^20.0.0 || ^22.0.0 || >=24.0.0`) and say so explicitly in the commit body. Do not leave the version unpinned.

Do not rely on the local Node version to validate this: a dev machine running Node 26 installs Vitest 5
successfully while a Node 20 CI runner fails at `npm ci`.

### 1. Add test dependencies
Add the minimum dev dependencies needed for a maintainable baseline:
- `vitest` (`^5`, consistent with the Node 22.12+ target from §0)
- `vite-tsconfig-paths` (`^6`) — resolves the `@/*` alias from `tsconfig.json` without duplicating it (see §3)

Do **not** add in this ticket:
- `@vitejs/plugin-react` — only needed for React/JSX component tests, which are out of scope. Its v6 peer
  dependency pins `vite: ^8.0.0`, and the Next.js official Vitest guide pairs it with `jsdom` + `@testing-library/*`,
  i.e. a component-testing toolchain this ticket does not use.
- `jsdom` — no DOM under test. `jsdom@30` also requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`,
  a stricter floor than the Node target chosen in §0.
- `@testing-library/react`, `@testing-library/dom`

Keep the dependency set small: this ticket adds exactly two packages.

### 2. Add package scripts
Update `package.json` with at least:
- `test`: `vitest run`
- `test:watch`: `vitest`
- `type-check`: `tsc --noEmit`

> **Critical — do not copy the Next.js guide blindly.** The official guide
> ("How to set up Vitest with Next.js", updated 2026-08-25) recommends `"test": "vitest"`, which starts
> **watch mode** by default. `CICD-001` runs `npm run test` inside GitHub Actions, so a watch-mode
> `test` script makes the CI job **hang until the runner timeout**. `test` MUST be `vitest run`;
> watch mode belongs in `test:watch` (developer-only).

> **`type-check` is a rename, not a creation.** `package.json` currently exposes `typecheck`
> (no hyphen) while `CICD-001 §1` already calls `npm run type-check`. Pick `type-check` as the canonical
> name (kebab-case, consistent with `test:watch`, `format:check`), update `package.json`, and grep for
> `npm run typecheck` to update any remaining caller. This is the only script change in this ticket that
> touches CICD-001's contract — mention it in the commit body.

Optional, only if coverage is actually configured in the same commit:
- `test:coverage`: `vitest run --coverage` + devDependency `@vitest/coverage-v8` (Vitest's default provider is `v8`)

If coverage is not configured, do not add the script at all. Note for the record: `/coverage` is
**already** present in `.gitignore:11`, so no `.gitignore` change is needed either way.

### 3. Add Vitest config
Create `vitest.config.mts` (`.mts`, not `.ts` — `package.json` has no `"type": "module"`, and Next.js's own
guide uses `.mts`; this avoids the ESM/CommonJS module-type ambiguity that already affects `lib/test-validation.ts`).

Requirements:
- `test.environment` set explicitly to `'node'` — the modules under test are server-side TypeScript with no DOM.
- TypeScript path alias `@/*` must work in tests: register `vite-tsconfig-paths` as a plugin so the alias is
  read from `tsconfig.json`. Do **not** hand-mirror `paths` into `resolve.alias`: a duplicated alias drifts
  silently the first time `tsconfig.json` gains a path, and the failure mode is an unresolvable import inside
  a test file rather than a config error.
- **Do not narrow `test.include`.** Vitest's default is
  `['**/*.{test,spec}.?(c|m)[jt]s?(x)']` and it already covers both required shapes
  (`lib/**/*.test.ts` and `lib/**/__tests__/*.test.ts`). Setting `include` *replaces* that default, so
  writing `include: ['lib/**/*.test.ts']` would silently exclude future `app/**`, `components/**` and
  `proxy.ts` tests. Either leave `include` unset, or set it deliberately wide
  (`['**/*.{test,spec}.{ts,tsx}']`) with explicit `exclude` entries.
- Prefer a simple setup over a heavily customized one. Do not enable `test.globals`; import
  `describe` / `it` / `expect` explicitly from `vitest` so every test file stays type-checkable by `tsc`
  without a `types: ['vitest/globals']` entry.

Reference shape:
```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
  },
})
```

### 4. Migrate the manual validation runner — full parity, not a sample
Take the assertions currently living in `lib/test-validation.ts` and convert them into real test cases in
`lib/__tests__/validation.test.ts`.

**Parity requirement: all 37 cases must be migrated.** The inventory, extracted from the `testCases`
array in the current file, is:

*Valid — 13 cases (all `isValid: true`):*
1. valid single message
2. valid multi-message conversation
3. content at the maximum allowed length (5 000 chars)
4. content with special characters
5. content with newlines
6. content with unicode characters
7. content with leading/trailing whitespace
8. XSS attempt in content — **allowed by design**, React escapes it on render
9. SQL injection attempt in content — **allowed by design**, content goes to the LLM, not to a DB
10. deeply nested extra field — allowed, unexpected fields are tolerated
11. 50 messages — within the 100-message limit
12. numeric-only content
13. emoji content

*Invalid — 24 cases (`isValid: false`, each with an `expectedError` substring):*
- non-array input ×5: `string`, `number`, `object`, `null`, `undefined`
- empty array ×1
- 101 messages ×1
- message not a plain object ×3: `string`, `null`, array
- missing field ×2: `role`, `content`
- invalid role ×2: `'admin'`, `''`
- wrong-typed `role` ×2: number, `null`
- bad content ×2: empty string, whitespace-only
- oversized content ×2: 5 001 chars, 100 000 chars
- invalid role at index 1 of a 2-message array ×1

Additionally, and beyond strict parity:
- **Convert the 24 `expectedError` substrings into blocking assertions** (`expect(result.error).toContain(...)`).
  The current runner only prints `⚠️ Error message mismatch`, so migrating without this leaves the same
  expectations unenforced behind a different runner.
- Cover `assertValidChatMessages()` (exported by `lib/validation.ts`, currently untested): it must throw on
  invalid input and not throw on valid input, with the error message embedding the validator's reason.
- Do **not** keep the "unexpected fields" case as-is without care: that path goes through a `console.warn`
  inside `validateChatMessages()`. Assert on the returned `isValid` value, never on `console.warn`.
  `QUAL-002` will replace that `console.warn` with a structured logger; a test spying on `console` would
  break for the wrong reason.

Important:
- Preserve the current runtime contract of `validateChatMessages()`.
- Do not weaken validation only to make tests easier. If a migrated case fails, the finding is a real
  behaviour mismatch to report — not a case to soften.

### 5. Delete `lib/test-validation.ts` and propagate the documentation
The file is dead code (§Why) and is fully replaced by §4. Outcome: **delete it**.
"Keep it temporarily but mark it as deprecated/manual-only" is **not a viable option**: the file cannot be
executed at all (no resolvable import, no npm script, a guard that never fires), so keeping it preserves
only the illusion of a manual runner.

Deleting it breaks references that this ticket must fix in the same pass:

| File | Lines | Stale content | Action |
|---|---|---|---|
| `README.md` | `41` | `- Node.js 18+` | → `Node.js 22.12+` (§0) |
| `README.md` | `143` | `test-validation.ts # Standalone validation test suite` | → point to `lib/__tests__/` (Vitest) |
| `docs/security/INPUT_VALIDATION_SECURITY.md` | `21-22` | `3. **lib/test-validation.ts** (NEW)` + `40+ test cases` | → Vitest suite, 37 cases |
| `docs/security/INPUT_VALIDATION_SECURITY.md` | `263-266` | "The test suite … can be imported and run" + `import { runValidationTests } from '@/lib/test-validation'` | → `npm run test` |
| `docs/security/INPUT_VALIDATION_SECURITY.md` | `277` | `40+ test cases covering normal use, edge cases, and attack vectors` | → 37 cases |
| `docs/security/SECURITY_IMPLEMENTATION_COMPLETE.md` | `11`, `24`, `37`, `184`, `229`, `250`, `367` | `40+ test cases` / `All 40+ test cases passing ✅` | → `37 cases, automated via Vitest` ; remove the "passing ✅" claim (it was never true) |
| `docs/backlog/QUAL-002-structured-logging-spec.md` | `12`, `32`, `76` | allowlist / migration scope names `lib/test-validation.ts` | → `lib/__tests__/**` (console usage lives in the test file's own output, if any) |
| `docs/backlog/QUAL-003-eslint-strict-rules-spec.md` | `36` | `lib/test-validation.ts (manual runner — removed by TEST-001; allow or delete)` | → allowlist `**/*.test.ts` (and `vitest.config.mts`) instead |
| `project-state.md` | `162-163` | `installer **Vitest** + @vitejs/plugin-react` | → `installer **Vitest** + vite-tsconfig-paths` (no component tests in this ticket), and update the maturity/backlog status |
| `docs/backlog/CICD-001-minimal-ci-pipeline-spec.md` | §2, §4 | `preferably Node 20` (ex-§2), no mention of the non-watch constraint | ✅ **already propagated** — see the note below |

Two of these are **factual corrections**, not just renames: "40+ test cases" (actual: 37) and
"all passing ✅" (actual: never executed). When the wording is replaced, the replacement must be
verifiable — do not restate a number you have not counted.

**Already done in the same pass** : `CICD-001` has been updated for this ticket's contracts — `Dependencies`
now declares `Bloque par : TEST-001`, §1 records that `type-check` is a rename of the existing `typecheck`
script, §4 documents the Vitest-driven Node 22 target (replacing "preferably Node 20"), and the
non-watch `test` requirement is stated in `Dependencies`, `Pitfalls` and the acceptance criteria. Do not
re-open those sections; if the Node target or a script name changes later, both specs must change together.

### 5b. Callers of the renamed `type-check` script
The `typecheck` → `type-check` rename in §2 breaks every place that quotes the old invocation. Update them
in the same branch (do not pre-rename them before this ticket lands, or they become wrong in the other
direction):

| File | Lines |
|---|---|
| `CONTEXT.md` | `36`, `106` |
| `docs/backlog/QUAL-001-prettier-pre-commit-hooks-spec.md` | `10`, `58`, `68` |
| `docs/backlog/QUAL-002-structured-logging-spec.md` | `79` |
| `docs/backlog/QUAL-003-eslint-strict-rules-spec.md` | `70` |
| `docs/backlog/SEC-003-persistent-rate-limiting-spec.md` | `88` |

`CONTEXT.md` is the agent entry point for this backlog (added after the 2026-09-19 review, discoverable via
`README.md` and `AGENTS.md`). It had drifted on `proxy.ts` — documented as "Edge-compatible" while Next 16
runs the Proxy in the **Node.js runtime, non-configurable** — as well as on `typecheck`. Both are fixed;
keep it in sync whenever a script name or the Node target changes.

Re-run `grep -rn "npm run typecheck" . --exclude-dir=node_modules` after the rename. Expected result:
**zero hits in `CONTEXT.md`, `docs/backlog/QUAL-*.md` and `docs/backlog/SEC-003-*.md`**. The only remaining
matches are self-referential and legitimate — the two occurrences inside this spec (the §2 callout that
explains the rename, and this grep line itself). The prose note at
`docs/features/seo-geo/GEO-08b-dictionnaires-i18n.md:62` mentions `typecheck` without the `npm run` prefix,
so it does not match this pattern at all: it is a closed ticket's record, leave it alone.

## Implementation notes
- Keep the first version fast and boring.
- Prefer pure unit tests in a Node environment; `jsdom` is not required (see §1).
- Do not refactor production code beyond what is necessary to make it testable.
- The `test` script must be non-watch (§2) — this is the single point where following the framework's own
  documentation breaks CI.
- Mirror the `@/*` path from `tsconfig.json` — preferably via `vite-tsconfig-paths` rather than a hand-copied
  `resolve.alias` (§3).

## Pitfalls
- **Watch mode in `test`.** `vitest` without `run` watches forever; CICD-001 calls `npm run test` and the job
  hangs until the 6-hour runner timeout. The Next.js official guide shows exactly this trap.
- **`lib/rateLimit.ts` is a module-level singleton.** `requestCounts` and `lastCleanup` are private and no
  reset is exported, so tests leak counters into one another. Use
  `beforeEach(() => vi.resetModules())` + `const { checkRateLimit } = await import('../rateLimit')` in each
  test (this touches no production code), and `vi.useFakeTimers()` / `vi.setSystemTime(...)` for anything
  derived from `getTodayUTC()` / `getNextResetTime()` — otherwise a run that crosses midnight UTC flakes.
  Note also that the first `checkRateLimit()` call is guaranteed to run `cleanupOldRecords()` because
  `lastCleanup` starts at `0` (hidden side effect, not a bug, but it must not surprise a test).
- **`server-only` vs `next build`.** `tsconfig.json` includes `**/*.ts`, so test files are type-checked by
  `next build`. A future test importing `lib/supabase.ts` (`import 'server-only'`) will break the build, not
  just the test run. Not a problem for this ticket's targets (`validation`, `csrf`, `linkify`, `rateLimit`),
  but do not assume the pattern extends for free.
- **`console` coupling.** `lib/validation.ts` currently `console.warn`s on unexpected fields; `QUAL-002`
  replaces that with a logger. Assert on return values only.
- **Linting the tests.** `eslint.config.mjs` has no block for test files. `QUAL-003` (`no-console: error` on
  `lib/**`) must allowlist `**/*.test.ts`, not the deleted `lib/test-validation.ts`.
- **`vitest.config.ts` vs `.mts`.** Without `"type": "module"` in `package.json`, a `.ts` config lands in the
  same module-type ambiguity that makes `lib/test-validation.ts` unrunnable. Use `.mts`.

## Acceptance criteria
- `package.json` exposes `test` (`vitest run`, non-watch), `test:watch`, and `type-check`, plus
  `"engines": { "node": ">=22.12.0" }`.
- `npm run test` passes locally with exit code 0, without watch mode, with **0 skipped tests**.
- `lib/__tests__/validation.test.ts` exists and contains **37 migrated cases**, including 24
  `expectedError` assertions that fail the run on mismatch (not warnings).
- `assertValidChatMessages()` is covered (throws on invalid, narrows on valid).
- `lib/test-validation.ts` is deleted, and every reference listed in §5 is updated in the same branch.
- `vite-tsconfig-paths` resolves `@/*` inside test files (prove it with at least one alias-based import, or
  document that the first alias-based test will be added with the `csrf`/`linkify` tests).
- The suite is suitable for future CI usage: a second `npm run test` invocation after a `vi.resetModules()`
  test does not depend on execution order.
- `docs/security/*` no longer claims "40+ test cases" or "all passing".

## Verification
Run:
- `npm ci` (the repo has `package-lock.json`; `npm install` can silently rewrite the lockfile)
- `npm run test`
- `npm run type-check`
- `npm run lint`
- `npm run build`

Expected result:
- tests pass, 0 skipped, non-watch
- type-check passes (test files and `vitest.config.mts` are inside `tsconfig.json`'s `include`)
- lint passes
- build passes

Additional checks:
- `grep -rn "test-validation" . --exclude-dir=node_modules` → only the historical notes intentionally kept
  (review records, git history) and no runnable reference.
- `grep -rn "40+" docs/security/` → no hit.
- Count the migrated cases and compare to 37: the number must come from the file, not from this spec.

## Handoff notes for the implementing LLM
- Keep this ticket intentionally narrow.
- Do not jump ahead into Playwright/MSW, component testing, or coverage thresholds.
- If you need to touch production files, explain exactly why. For this ticket the expected production
  touches are limited to `package.json`; `lib/validation.ts` must stay behaviourally unchanged.
- If a migrated case fails, report the mismatch instead of adjusting the expectation to match the code.
- Propagate every script/Node change to `CICD-001` in the same branch, and rename the `typecheck` callers
  listed in §5b in the same commit as the script rename.
