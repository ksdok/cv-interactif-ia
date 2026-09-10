# SEC-004 — Rate Limit Cleanup Invocation Spec

## Goal
Prevent unbounded growth of the in-memory rate limit map by ensuring stale IP records are actually purged.

## Why this ticket exists
Current state in the repo:
- `lib/rateLimit.ts` defines `cleanupOldRecords(daysToKeep = 7)`
- that function is never called anywhere
- the rate limiter uses a process-local in-memory object keyed by IP

As a result, a long-running process can retain stale IP entries forever.

## Scope
In scope:
- wire `cleanupOldRecords()` into the live request path or an equivalent lightweight cleanup trigger
- keep the current rate limit behavior unchanged for normal requests
- avoid adding external infrastructure

Out of scope:
- replacing the in-memory store with Redis, Vercel KV, or Upstash
- redesigning the public rate limit API
- full logging refactors

## Files to inspect first
- `lib/rateLimit.ts`
- `app/api/chat/route.ts`
- `app/api/job-match/route.ts`

## Problem details
The cleanup function currently exists here:
- `lib/rateLimit.ts:179-193`

The active request entry points currently call:
- `checkRateLimit(clientIP)` in `app/api/chat/route.ts`
- `checkRateLimit(clientIP)` in `app/api/job-match/route.ts`

There is no periodic or opportunistic purge step before or after these checks.

## Preferred implementation approach
Add cleanup in the rate limit module itself so callers do not need to remember to invoke it.

Preferred pattern:
- keep cleanup opportunistic and cheap
- do not run a full purge on every request
- gate cleanup behind a time-based threshold, for example once per hour or once every N minutes

This keeps the fix centralized and avoids duplicate logic in both API routes.

## Implementation requirements

### 1. Centralize the trigger in `lib/rateLimit.ts`
Preferred implementation:
- introduce a module-level timestamp such as `lastCleanupAt`
- add a small helper like `maybeCleanupOldRecords()`
- call that helper from `checkRateLimit()` before mutating the request map

Why:
- every current route already goes through `checkRateLimit()`
- future routes will inherit cleanup automatically

### 2. Keep cleanup low-cost
Requirements:
- do not scan the whole map on every request
- use a coarse interval to amortize cleanup cost
- keep the behavior deterministic and easy to reason about

### 3. Preserve rate-limit semantics
The change must not alter:
- the 200 requests/day limit
- daily reset behavior
- response header contract

### 4. Logging should stay minimal
If cleanup logging remains, keep it low-noise.
A debug log on every purge may still be too noisy in production.
If the current `console.log` in `cleanupOldRecords()` is preserved, make sure it is intentional.

## Acceptance criteria
- stale rate limit records are eventually purged in a long-running process
- no route has to remember to call cleanup manually
- rate limit behavior for active users remains unchanged
- lint and build pass

## Verification
Run:
- `npm run lint`
- `npm run build`

Suggested targeted validation:
- add or run a unit test if the project has test infra by then
- otherwise manually exercise `checkRateLimit()` and the cleanup helper in a small isolated script
- confirm that cleanup is skipped when the interval has not elapsed
- confirm that stale entries are removed once the interval elapses

## Handoff notes for the implementing LLM
- Prefer a tiny internal helper over touching multiple routes.
- Do not turn this into a persistence migration.
- Keep the fix surgical and easy to review.
