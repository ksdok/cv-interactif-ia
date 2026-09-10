# CICD-001 — Minimal CI Pipeline Spec

## Goal
Create a minimal GitHub Actions pipeline that blocks obviously broken changes before they reach `main`.

## Why this ticket exists
Current state in the repo:
- no `.github/workflows/*.yml` pipeline exists
- deployment relies on Vercel integration without pre-merge validation
- lint and build can only be run manually

## Dependency
This ticket depends on `TEST-001` being merged first, or being implemented in the same branch, because the CI pipeline should run `npm test` once the test script exists.

## Scope
In scope:
- add one CI workflow under `.github/workflows/`
- install dependencies with npm in CI
- run type-check, lint, test, and build
- trigger on pull requests and pushes to `main`

Out of scope:
- deploy from GitHub Actions
- preview environment orchestration
- release tagging
- cache fine-tuning or matrix complexity beyond what is needed now

## Files to inspect first
- `package.json`
- `tsconfig.json`
- `.github/` contents
- any test config introduced by `TEST-001`

## Required changes

### 1. Add missing scripts if they do not exist yet
CI should not call raw shell commands when a package script is the canonical entry point.

`package.json` should expose at least:
- `type-check`: `tsc --noEmit`
- `lint`: already exists
- `test`: added by `TEST-001`
- `build`: already exists

### 2. Create the workflow
Create a single workflow, for example:
- `.github/workflows/ci.yml`

Workflow requirements:
- trigger on `push` to `main`
- trigger on `pull_request`
- use a stable Node version supported by the project, preferably Node 20
- use `npm ci`
- run steps in this order:
  1. `npm ci`
  2. `npm run type-check`
  3. `npm run lint`
  4. `npm run test`
  5. `npm run build`

### 3. Keep the workflow simple
Do not introduce a strategy matrix unless there is a strong reason.
Do not add coverage upload, artifact upload, or Vercel deploy hooks in this ticket.

## Implementation notes
- The repo already includes `package-lock.json`, so `npm ci` is the correct install command.
- If `next build` requires environment variables, keep the build green without leaking secrets. If necessary, document which variables are optional for CI and which code paths already degrade safely.
- If CI cannot run a step without secrets, fail only if the production code truly requires them; otherwise prefer a deterministic mock-safe/default-safe path.

## Acceptance criteria
- A workflow file exists in `.github/workflows/`.
- Opening a PR triggers the workflow automatically.
- The workflow runs type-check, lint, test, and build in that order.
- The workflow succeeds on a clean clone when the repo is in a healthy state.

## Verification
Local verification before pushing:
- `npm ci`
- `npm run type-check`
- `npm run lint`
- `npm run test`
- `npm run build`

Remote verification after pushing branch:
- confirm GitHub Actions starts automatically on the PR
- confirm all jobs complete successfully

## Handoff notes for the implementing LLM
- Treat this as the thinnest viable CI guardrail.
- Avoid gold-plating.
- If `TEST-001` is not present, either implement it first or clearly mark this ticket as blocked.
