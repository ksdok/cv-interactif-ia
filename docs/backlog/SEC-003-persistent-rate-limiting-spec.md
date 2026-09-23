# SEC-003 — Persistent Rate Limiting Spec

## Goal
Move rate limiting from in-memory storage to a persistent store so counters survive deployments, serverless instance recycling, and multi-region traffic — when traffic justifies the added infrastructure.

## Why this ticket exists
Current state in the repo:
- `lib/rateLimit.ts` keeps counters in a module-level `Map` (`requestCounts`).
- On Vercel serverless, each deployment (and potentially each warm instance) gets a fresh map: an attacker effectively gets a new 200-req/day budget per instance, and legitimate counters reset on every deploy.
- Cleanup is already throttled (SEC-004 done), but that only mitigates memory bloat, not the reset problem.
- `project-state.md` marks this `LOW` — conditional on traffic growth. This spec exists so the ticket is delegation-ready when that condition is met.

## Trigger condition (read first)
Do **not** implement this ticket while traffic is low unless a real abuse incident occurred. The in-memory limiter is free, fast, and adequate for a personal site. Implement when any of these holds:
- abuse/limit-evasion observed in production logs (counters resetting mid-day),
- API cost spikes attributable to the chat/job-match endpoints,
- multi-region deployments make instance-local state clearly ineffective.

## Scope

In scope:
- persistent rate limit backend (Upstash Redis or Vercel KV / Marketplace equivalent)
- atomic increment + TTL semantics
- graceful degradation policy when the store is unreachable
- dev experience unchanged (in-memory fallback locally)

Out of scope:
- changing limits or the 429 response contract (`error`, `errorCode: 'RATE_LIMIT'`, `retryAfter`, headers `X-RateLimit-*`, `Retry-After`)
- per-endpoint or per-user quotas beyond the existing IP-based daily limit
- bot protection / WAF (Cloudflare- or Vercel-level — separate decision)

## Files to inspect first
- `lib/rateLimit.ts` (the entire public API: `getClientIP`, `checkRateLimit`, `getRateLimitHeaders`, `getRetryAfterSeconds`, `getStats`, `cleanupOldRecords`)
- `app/api/chat/route.ts`, `app/api/job-match/route.ts`, `app/api/csp-report/route.ts` (call sites of `checkRateLimit`)
- `docs/backlog/SEC-005-supabase-service-key-fail-fast-spec.md` (precedent for the env-validation pattern)
- README (env var documentation)

## Design decisions to make (document in the PR)

### 1. Backend choice
- **Upstash Redis** (via Vercel Marketplace or direct): HTTP-based, per-request cost, works well with serverless, has `@upstash/ratelimit` with fixed-window primitives.
- **Vercel KV / Marketplace KV**: simplest to provision from the Vercel dashboard; check current product status before committing (Vercel's storage offerings have been renamed/transitioned).
- **Supabase/pgvector DB**: already in the stack, but adds a DB round-trip per request and table churn — acceptable only if we refuse new vendors.
Pick one; the spec assumes a Redis-compatible key-value store below.

### 2. Fail-open vs fail-closed
When the store is unreachable (network error, quota exceeded):
- **Fail-open** (recommended): allow the request, log a warning. Rationale: rate limiting is a cost guard, not a security boundary; blocking all users because Redis is down is worse than a temporary budget reset.
- Fail-closed would be defensible only if limits become an anti-abuse SLA.
Document the choice; it must be explicit in code.

### 3. Atomicity
- Use a single atomic server-side operation (e.g. `INCR` + `EXPIRE`/TTL keyed to midnight UTC, or the `@upstash/ratelimit` fixed window) — never read-then-write, which reintroduces the race across instances.
- Key format suggestion: `rl:{ip}:{YYYY-MM-DD}` with TTL of ~48h (daily keys self-expire; `cleanupOldRecords` becomes unnecessary for the persistent store).

## Required changes

### 1. Abstract the limiter
- Extract an interface so `checkRateLimit(ip)` keeps its exact signature and return shape (`allowed`, `remaining`, `resetTime`, `message?`).
- Implement `MemoryRateLimiter` (current logic, kept for dev + fallback) and `PersistentRateLimiter` (new store).
- Selection: env-driven (`RATE_LIMIT_BACKEND=memory|redis`, default `memory` in dev, explicit in production).

### 2. Environment & secrets
- Add store credentials as server-only env vars (never `NEXT_PUBLIC_*`); follow the SEC-005 fail-fast pattern (fail fast in production if the backend is configured but unreachable creds are missing).
- Document new env vars in README.

### 3. Callers stay untouched
- `app/api/chat/route.ts`, `app/api/job-match/route.ts`, `app/api/csp-report/route.ts` must not change — the abstraction absorbs the swap.

### 4. Observability
- Log (structured, per QUAL-002) when the persistent store errors or when fail-open triggers — these events are exactly what OBS-001 should alert on.

## Implementation notes
- Watch latency: the limiter adds a round-trip on every request to both endpoints; Redis HTTP from the same region as the Vercel function is typically <10ms — verify.
- `getStats()` is in-memory only; keep it working for the memory backend and return store-backed stats or a documented stub for the persistent backend.
- Keep the existing daily-reset-at-UTC semantics exactly (clients rely on `Retry-After` / `X-RateLimit-Reset`).
- If TEST-001 is merged, add unit tests for the new limiter (limit boundary, day rollover, fail-open path); if not, note it as follow-up debt.

## Acceptance criteria
- With the persistent backend enabled, counters survive a redeploy (verify: hit the limit partially, redeploy, counter continues).
- Race-safe under concurrent requests (two parallel requests can't both consume the last remaining slot).
- Store outage → requests still succeed (fail-open, if chosen) and a warning is logged.
- Dev workflow (`npm run dev`) requires zero new infra (memory backend default).
- 429 contract unchanged (same body shape, same headers).

## Verification
Run:
- `npm run lint`, `npm run type-check`, `npm run build`
- local: default memory backend works as before
- staging/prod with backend enabled: normal flow under limit, 429 path, redeploy-survival check, store-outage simulation (block network to the store, confirm fail-open + warning log)

## Handoff notes for the implementing LLM
- This ticket is explicitly deferred by project-state.md — implement only when the trigger condition is met or the operator asks.
- The hardest part is semantics preservation, not the store integration: `resetTime`, `Retry-After`, header set, and the 429 body must be byte-identical to today.
- Do not introduce the store for anything else (no caching, no sessions) in this ticket — that's PERF-003's territory.