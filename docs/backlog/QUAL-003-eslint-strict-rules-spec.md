# QUAL-003 — Strict ESLint Rules Spec

## Goal
Harden the ESLint configuration with rules catching real bug classes (`no-console`, `prefer-const`, unused vars) and dangerous patterns, without drowning the team in violations.

## Why this ticket exists
Current state in the repo:
- `eslint.config.mjs` uses `eslint-config-next` (core-web-vitals + typescript) plus one custom rule (`react/jsx-no-literals` for i18n, GEO-08b).
- No `no-console`, no `prefer-const`, no explicit unused-vars policy, no security-oriented rules.
- ≈ 80 `console.*` call sites exist in `app/api/` and `lib/` today.

## Scope

In scope:
- add the rule set below to `eslint.config.mjs`
- fix or scope the resulting violations
- evaluate `eslint-plugin-security` (add only if it earns its keep)

Out of scope:
- replacing the `console.*` calls themselves (QUAL-002 — do this ticket **after** QUAL-002, otherwise `no-console` creates an unmanageable diff)
- Prettier/formatting rules (QUAL-001)
- CI wiring (CICD-001 runs `npm run lint` once it exists)

## Files to inspect first
- `eslint.config.mjs` (current config + existing custom rule and its comments)
- `app/api/**`, `lib/**` (violation surface for `no-console`)
- `scripts/*.mjs` (CLI tools where `console` is legitimate)
- `components/**` (client-side `console.error` usage)

## Required changes

### 1. Rule additions
In `eslint.config.mjs`, add a config block for server code (`app/api/**`, `lib/**`) and a general block:

- `no-console`: `error` for `app/api/**` and `lib/**`, with allowlist exceptions:
  - `**/*.test.ts` et `vitest.config.mts` (tests Vitest — TEST-001 ; `console` y est la sortie du runner)
  - `proxy.ts` only if QUAL-002 documents that the edge runtime can't use the project logger
  - `scripts/**` and `lib/systemPrompt.mjs` if they share a lint scope (console is their CLI interface) — prefer a separate block with `no-console: off`
- Client code (`components/**`, `app/[lang]/**`): `no-console: warn` initially (a few `console.error` exist in `ChatPreview.tsx`); decide warn vs error based on actual count, tighten later.
- `prefer-const`: `error` (project-wide)
- `@typescript-eslint/no-unused-vars`: `error` with `argsIgnorePattern: '^_'` (the TS-flavored rule, not the base `no-unused-vars`, to avoid flagging type-only params)
- `no-var`: `error`

### 2. Fix the violations
- Run `npm run lint`, triage the output:
  - genuine issues → fix in code
  - legitimate patterns → narrow inline disable with a comment (`// eslint-disable-next-line <rule> -- reason`), never a global rule removal
- Do not bulk-disable rules to get a green lint.

### 3. Evaluate `eslint-plugin-security`
- Install it in a scratch branch, run it against the codebase, and review findings.
- Adopt it only if: (a) findings are real or the rules are cheap noise-wise, and (b) it doesn't conflict with `eslint-config-next`.
- Decision (adopt / reject + why) must be recorded in the PR description. Do not add it "just in case".

## Implementation notes
- Respect the existing config structure (`defineConfig`, flat config) and the existing comments — especially the GEO-08b `jsx-no-literals` block and its documented limitations.
- TypeScript's compiler already catches some unused-var cases; the ESLint rule still adds value for `_`-prefixed intent and unused imports (which `tsc` only catches with specific flags).
- If `@typescript-eslint` plugin isn't directly in devDependencies, check that `eslint-config-next/typescript` exposes the rule namespace before writing rule names — verify rule resolution with `npx eslint --print-config` on one file.

## Acceptance criteria
- `npm run lint` passes with the new rules active.
- Adding a `console.log` in `app/api/chat/route.ts` fails lint (verified manually).
- Adding an unused variable fails lint (verified manually).
- No rule is disabled project-wide to achieve green; every inline disable has a justification comment.
- Decision on `eslint-plugin-security` documented (adopted or rejected with reasons).

## Verification
Run:
- `npm run lint`
- `npm run type-check`
- `npm run build`
- Manual negative tests: commit-attempt with a violation file, expect lint failure.

## Handoff notes for the implementing LLM
- Sequencing matters: **QUAL-002 (logger migration) must land before this ticket**, or `no-console` will force a 80-site diff that belongs to another ticket.
- The existing `react/jsx-no-literals` block has hard-won review context in comments (F5, F7, F6, N5) — do not disturb it.
- `eslint-config-next` already enables some of these rules with different severities; check `--print-config` before duplicating configuration.