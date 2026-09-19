# QUAL-001 — Prettier & Pre-commit Hooks Spec

## Goal
Standardize code formatting and guarantee lint/format checks run before every commit.

## Why this ticket exists
Current state in the repo:
- No Prettier — formatting relies on each contributor's editor settings; risk of noisy diffs and style debates in PRs.
- No `husky` / `lint-staged` — nothing prevents committing code that fails `npm run lint`.
- `package.json` has `lint` and `typecheck` scripts but nothing enforces them locally.

## Scope

In scope:
- add Prettier with a committed config
- add `husky` + `lint-staged` pre-commit hook
- add `format` / `format:check` scripts
- one initial formatting pass over the repo (single commit)

Out of scope:
- CI pipeline (CICD-001 handles that)
- ESLint rule changes (QUAL-003)
- adding new formatters beyond Prettier

## Files to inspect first
- `package.json` (package manager is **npm** — do not use pnpm/yarn commands in hooks)
- `eslint.config.mjs` (avoid config conflicts between ESLint and Prettier)
- `.gitignore`
- `.editorconfig` (create if absent)

## Required changes

### 1. Add dev dependencies
- `prettier`
- `husky`
- `lint-staged`

### 2. Prettier configuration
- Add a minimal `.prettierrc` — explicit is better than implicit defaults; align with the existing codebase style (single quotes, no trailing commas changes beyond defaults, existing print width). Check a few core files (`lib/rateLimit.ts`, `components/ChatPreview.tsx`) to pick values that minimize the diff.
- Add `.prettierignore`: `.next/`, `out/`, `build/`, `node_modules/`, `public/llms-full.txt` (generated at build), `package-lock.json`, coverage dirs.
- Do not add `eslint-config-prettier` unless an actual rule conflict appears with the current `eslint.config.mjs` (note it in the PR if added).

### 3. Package scripts
Add to `package.json`:
- `format`: `prettier --write .`
- `format:check`: `prettier --check .`

### 4. Husky + lint-staged
- `npx husky init` (npm — creates `.husky/pre-commit`).
- `.husky/pre-commit` runs `npx lint-staged`.
- `lint-staged` config (in `package.json` or `lint-staged.config.js`) applying:
  - `prettier --write` to matched staged files
  - `eslint --fix` to `*.{ts,tsx,js,mjs}` files
- Hook must fail (non-zero exit) when lint-staged checks fail — that is the point.

### 5. Initial formatting pass
- Run `npm run format` once, in a dedicated commit, so the hook setup commit stays reviewable.
- Verify the diff contains only formatting changes: `npm run lint`, `npm run typecheck`, and `npm run build` must all pass after formatting.

## Implementation notes
- Keep the Prettier config tiny — 3–5 keys max. Defaults are fine; consistency is the goal, not a house style.
- The pre-commit hook must be fast: lint-staged scoping ensures only staged files are processed.
- Existing ignore globs in `eslint.config.mjs` (`.claude/**`, `example-project*/**`) must also be covered by `.prettierignore`.

## Acceptance criteria
- `npm run format:check` passes on a clean checkout.
- Committing a badly formatted `.ts` file triggers lint-staged and either auto-fixes it or fails the commit.
- `npm run lint`, `npm run typecheck`, `npm run build` all pass post-formatting.
- No behavioral diff in the formatting commit (build output unchanged).

## Verification
Run:
- `npm install`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Manual: stage a file with a formatting violation + a lint error, attempt to commit, confirm the hook blocks or fixes it.

## Handoff notes for the implementing LLM
- npm is the package manager — husky's `prepare` script and hook paths differ for pnpm/yarn; do not mix.
- Do not reorder or reformat config files beyond what Prettier produces.
- If `eslint --fix` and Prettier fight over a file, stop and document it rather than silently disabling one side.