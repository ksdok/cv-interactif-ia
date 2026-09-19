# QUAL-002 — Structured Logging Spec

## Goal
Replace ad-hoc `console.*` calls in server code with a structured, leveled logger so production logs are filterable, consistent, and free of debug noise.

## Why this ticket exists
Current state in the repo (count of `console.*` call sites):
- `app/api/job-match/route.ts`: 25
- `app/api/chat/route.ts`: 20
- `lib/modelProviders.ts`: 8
- `lib/rag.ts`: 5
- `lib/test-validation.ts`: 7 (manual runner — TEST-001 scope)
- `app/api/csp-report/route.ts`, `lib/validation.ts`, `lib/rateLimit.ts`, `lib/supabase.ts`: 1 each

Problems:
- Debug `console.log` ("Verifying CSRF token...", "POST /api/chat - handler start") runs in production — noise in Vercel logs.
- No severity levels, no consistent structure — logs are unsearchable strings.
- Some logs print truncated user content (chat messages) — mild privacy concern in third-party log drains.

## Scope

In scope:
- choose and integrate a structured logger (Pino recommended, see decision below)
- migrate `console.*` in `app/api/` and `lib/` (server code only)
- classify every existing log line: keep (warn/error/info) vs drop (debug noise)
- redaction policy for user-generated content

Out of scope:
- Sentry integration (OBS-001)
- client-side logging (`components/`, keep `console.error` there for now)
- `scripts/*.mjs` (standalone CLI tools, `console` is their interface)
- `lib/test-validation.ts` (migrated by TEST-001)

## Decision to make: Pino vs in-house logger
- **Pino** (recommended in backlog): structured JSON, tiny, fast, first-class levels. On Vercel, JSON lines are ingested by log drains (Logtail, Datadog) and by Sentry's logging integrations.
- **In-house `lib/logger.ts`** (acceptable fallback): thin wrapper adding levels + JSON serialization + env-based filtering; zero dependencies.

Pick one in the PR; Pino is preferred if its edge/serverless build behaves fine on Vercel's Node runtime used by this project. Document the trade-off.

## Files to inspect first
- `app/api/chat/route.ts` (largest concentration; also the most sensitive data flow)
- `app/api/job-match/route.ts`
- `lib/modelProviders.ts`, `lib/rag.ts`, `lib/supabase.ts`, `lib/rateLimit.ts`, `lib/validation.ts`
- `app/api/csp-report/route.ts`
- `proxy.ts` (check whether it logs — edge runtime constraints if so)

## Required changes

### 1. Logger module
- Create `lib/logger.ts` (or equivalent) exposing `logger.debug/info/warn/error` with:
  - level from env (`LOG_LEVEL`, default `info` in production, `debug` in development)
  - JSON output in production, human-readable in development (Pino: `pino-pretty` as dev-only transport or skip it)
  - child loggers with bound context (`logger.child({ route: 'chat' })`)

### 2. Migration pass — classify every call site
For each existing `console.*`:
- `console.error` → `logger.error` (keep all)
- `console.warn` (rate limit, CSRF failure, invalid input) → `logger.warn` (keep)
- informational flow logs ("Checking rate limit...", "CSRF token verified ✓") → either `logger.debug` or **delete** — most of these are one-time debug leftovers, deleting is the better default
- data-dumping logs (document arrays, CV snippets, usage metadata) → `logger.debug` with size-bounded fields, or delete
- Never log: full chat messages, job descriptions, API keys, Supabase keys. Truncation alone is not redaction for user content — prefer logging only lengths/shapes.

### 3. Error handling consistency
- In catch blocks, log with the error object as the first argument (Pino serializes `err` with stack) rather than stringifying ad hoc.

### 4. Env docs
- Document `LOG_LEVEL` in README's environment variables section (optional var).

## Implementation notes
- Server-only modules already import `server-only` where relevant (`lib/supabase.ts`) — the logger must be safe to import anywhere in `app/` and `lib/` server code; if it could ever be pulled into client bundles, guard it (the goal is to never ship `pino` to the browser).
- Do not change any runtime behavior: log migration must not alter error responses, status codes, or control flow.
- If `proxy.ts` runs in the Edge runtime and logs, verify the chosen logger works there or leave `proxy.ts` on `console` with a comment (document the decision).
- This ticket is a prerequisite for QUAL-003's `no-console` rule — after this migration, `no-console` can be enabled without a giant allowlist.

## Acceptance criteria
- `grep -rn "console\." app/api lib` returns only documented exceptions (e.g. `proxy.ts` if justified, `lib/test-validation.ts`).
- Production logs are JSON lines with level, timestamp, and route context (verified via `npm run start` locally).
- User chat content and job descriptions never appear in logs (manual check with a canary message).
- `npm run lint`, `npm run typecheck`, `npm run build` pass.

## Verification
Run:
- `npm run build`, `npm run start`
- exercise `/api/chat` (success, 400 validation, 403 CSRF) and `/api/job-match`, inspect log output for structure and absence of PII
- `grep -rn "console\." app lib` to confirm coverage

## Handoff notes for the implementing LLM
- The migration is mechanical but classification requires judgment: when in doubt between keep-as-debug and delete, delete (git history preserves it).
- Do not refactor the code beyond logging (no renaming, no extracting helpers) — keep the diff reviewable.
- Coordinate ordering with QUAL-003: this ticket first, then QUAL-003 enables `no-console`.