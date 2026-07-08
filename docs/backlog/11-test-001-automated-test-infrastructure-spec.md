# TEST-001 — Automated Test Infrastructure Spec

## Goal
Add a real automated test runner to the project so validation and utility logic can be executed in CI and before merges.

## Why this ticket exists
Current state in the repo:
- `package.json` has no `test` script.
- No `*.test.*` or `*.spec.*` files exist.
- `lib/test-validation.ts` is a manual runner and is not connected to any framework.

This makes every code change effectively unguarded.

## Scope
Deliver the minimum viable automated test foundation for this Next.js + TypeScript repo.

In scope:
- install and configure Vitest
- add `npm run test`
- migrate validation checks from `lib/test-validation.ts` into real automated tests
- make the setup compatible with future unit tests for `lib/csrf.ts`, `lib/linkify.ts`, and `lib/rateLimit.ts`

Out of scope:
- Playwright
- API integration tests with MSW
- broad component test coverage

## Files to inspect first
- `package.json`
- `tsconfig.json`
- `lib/test-validation.ts`
- `lib/validation.ts`
- `lib/csrf.ts`
- `lib/linkify.ts`
- `lib/rateLimit.ts`

## Required changes

### 1. Add test dependencies
Add the minimum dev dependencies needed for a maintainable baseline:
- `vitest`
- `@vitejs/plugin-react`
- `jsdom` if the config uses a browser-like environment

Keep the dependency set small. Do not add Playwright or MSW in this ticket.

### 2. Add package scripts
Update `package.json` with at least:
- `test`: `vitest run`
- `test:watch`: `vitest`

Optional but useful:
- `test:coverage`: only if coverage is configured in the same PR

### 3. Add Vitest config
Create a dedicated config file if needed, for example:
- `vitest.config.ts`

Requirements:
- TypeScript path alias `@/*` must work in tests.
- Test discovery should cover files such as `lib/**/*.test.ts` and `lib/**/__tests__/*.test.ts`.
- Prefer a simple setup over a heavily customized one.

### 4. Migrate the manual validation runner
Take the assertions currently living in `lib/test-validation.ts` and convert them into real test cases in a new automated file, for example:
- `lib/__tests__/validation.test.ts`

Test at least:
- valid chat message array passes
- non-array input fails
- empty array fails
- too many messages fails
- invalid role fails
- empty content fails
- oversized content fails

Important:
- Preserve the current runtime contract of `validateChatMessages()`.
- Do not weaken validation only to make tests easier.

### 5. Decide what to do with `lib/test-validation.ts`
Choose one of these two outcomes and document it in the PR:
- delete it once the automated test suite replaces it, or
- keep it temporarily but mark it as deprecated/manual-only

Preferred outcome: remove it if the automated tests fully replace it.

## Implementation notes
- Keep the first version fast and boring.
- Prefer pure unit tests in a Node environment unless jsdom is genuinely required.
- Do not refactor production code beyond what is necessary to make it testable.
- If Vitest needs alias resolution help, mirror the `@/*` path from `tsconfig.json`.

## Acceptance criteria
- `npm run test` exists and passes locally.
- At least one real test file is committed.
- `lib/test-validation.ts` is no longer the only way to validate `lib/validation.ts`.
- The suite is suitable for future CI usage.

## Verification
Run:
- `npm install`
- `npm run test`
- `npm run lint`
- `npm run build`

Expected result:
- tests pass
- lint passes
- build passes

## Handoff notes for the implementing LLM
- Keep this ticket intentionally narrow.
- Do not jump ahead into Playwright/MSW.
- If you need to touch production files, explain exactly why.
