# CICD-001 — Minimal CI Pipeline Spec

## Goal
Create a minimal GitHub Actions pipeline that blocks obviously broken changes before they reach `main`.

## Why this ticket exists
Current state in the repo:
- no `.github/workflows/*.yml` pipeline exists
- deployment relies on Vercel integration without pre-merge validation
- lint and build can only be run manually

## Dependencies
- **Bloque par** : TEST-001

This ticket depends on `TEST-001` being merged first, or being implemented in the same branch, because the
CI pipeline runs `npm run test` and `npm run type-check`, both of which are created or renamed by TEST-001.
TEST-001 declares the reverse edge (`Bloque : CICD-001`), so the two tickets must move together: any change
to a script name or to the Node target in either ticket must be propagated to the other in the same pass.

Three contracts are inherited from TEST-001 and must not be re-invented here:
- `test` must be **non-watch** (`vitest run`). The Next.js official Vitest guide recommends
  `"test": "vitest"`, which starts watch mode by default; `npm run test` inside a GitHub Actions job would
  then hang until the runner timeout (6 h). See TEST-001 §2.
- `type-check` is a **rename** of the existing `typecheck` script (no hyphen) — see §1.
- The Node version is constrained by **Vitest's own `engines`**, which is stricter than Next.js's — see §2.

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
- `type-check`: `tsc --noEmit` — **rename, not a creation**: `package.json` currently exposes `typecheck`
  (no hyphen), and it is the only script this workflow calls that does not exist under that name yet.
  Rename it to `type-check` (kebab-case, consistent with `test:watch` / `format:check`) and update the
  callers, rather than adding a second alias that can drift.
- `lint`: already exists (`eslint`)
- `test`: added by `TEST-001` — must be `vitest run` (non-watch), otherwise this workflow never terminates
- `build`: already exists (`next build`, with a `prebuild` step that generates `public/llms-full.txt`)

Verify the exact script names before writing the workflow; do not assume them from this spec — `npm run`
prints the authoritative list.

### 2. Create the workflow
Create a single workflow, for example:
- `.github/workflows/ci.yml`

Workflow requirements:
- trigger on `push` to `main`
- trigger on `pull_request`
- use **Node 22** (`22.x`, i.e. `>=22.12`) via `actions/setup-node`
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

### 4. Node version — do not default to Node 20

The Node floor is set by the test toolchain, not by Next.js. Verified against the npm registry:

| Package | `engines.node` |
|---|---|
| `next@16.0.10` | `>=20.9.0` |
| `vitest@5.0.1` (latest) | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| `vite@7.x` / `vite@8.x` (transitive) | `^20.19.0 \|\| >=22.12.0` |

Consequence: on a Node 20 runner, `npm ci` **fails at install time** as soon as `vitest@5` is in the
lockfile — the job never reaches a step that produces a useful error message. Node 22 is therefore the
required target, matching `TEST-001 §0`. If the project ever falls back to Node 20, `TEST-001` must pin
`vitest@^4` in the same pass and this section must be updated.

Pin the version explicitly in the workflow (`node-version: 22`) and keep `package.json`'s `engines` in
agreement so the constraint is visible outside CI too.

## Implementation notes
- The repo already includes `package-lock.json`, so `npm ci` is the correct install command.
- If `next build` requires environment variables, keep the build green without leaking secrets. If necessary, document which variables are optional for CI and which code paths already degrade safely.
- If CI cannot run a step without secrets, fail only if the production code truly requires them; otherwise prefer a deterministic mock-safe/default-safe path.

## Pitfalls
- **Watch mode in the `test` step.** If `package.json`'s `test` script is `vitest` rather than `vitest run`,
  the CI job hangs until the runner timeout instead of failing. A hanging job is a failure, not a pass —
  configure a job `timeout-minutes` so this surfaces in minutes rather than hours.
- **Assuming the scripts exist.** `typecheck` (no hyphen) is the current name; `type-check` is the contract
  this workflow needs. Confirm with `npm run` before writing the workflow, and propagate the rename to
  TEST-001 rather than silently adding a second alias.
- **Node 20.** It satisfies Next.js but breaks `npm ci` on `vitest@5`. See §3.
- **`npm install` instead of `npm ci`.** `install` can rewrite `package-lock.json` in CI, so a green run
  would not prove the committed lockfile is installable.
- **Secrets in the build step.** `next build` must stay green without provider keys. Do not add dummy
  secrets to make it pass: if a code path truly requires a secret at build time, that is a finding to report,
  not something to paper over in the workflow.

## Acceptance criteria
- A workflow file exists in `.github/workflows/`.
- Opening a PR triggers the workflow automatically.
- The workflow runs type-check, lint, test, and build in that order.
- The `test` step **terminates on its own** (non-watch) and reports a pass — a job killed by its timeout is
  not an acceptance of this ticket.
- `npm ci` succeeds on the Node version used by the workflow.
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
- Confirm the real script names, the real Node floor (`vitest` `engines`, not Next.js `engines`), and the real
  test runner invocation before writing a single line of YAML.
- If `TEST-001` is not merged, check whether it is in the same branch before marking this blocked.
- Avoid gold-plating.
- If `TEST-001` is not present, either implement it first or clearly mark this ticket as blocked.
