# SEC-005 — Supabase Service Key Fail-Fast Spec

## Goal
Prevent the app from silently falling back to the public anon key when privileged server-side Supabase access is expected.

## Why this ticket exists
Current state in the repo:
- `lib/supabase.ts` builds the client with `SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`
- in production, that means a missing service key can degrade silently instead of failing loudly
- silent fallback makes debugging harder and can hide permission problems until runtime

## Scope
In scope:
- harden `lib/supabase.ts`
- validate required environment variables explicitly
- fail fast in production if `SUPABASE_SERVICE_ROLE_KEY` is missing

Out of scope:
- rotating Supabase keys
- changing the RAG query logic
- changing client-side Supabase usage patterns

## Files to inspect first
- `lib/supabase.ts`
- `lib/rag.ts`
- `app/api/chat/route.ts`
- `app/api/job-match/route.ts`
- `README.md` environment variable section

## Required behavior

### Production behavior
If `NODE_ENV === 'production'` and `SUPABASE_SERVICE_ROLE_KEY` is missing or empty:
- throw a clear startup/module initialization error
- do not fall back to the anon key

### Non-production behavior
Keep local development practical.
One acceptable option:
- require `NEXT_PUBLIC_SUPABASE_URL`
- prefer `SUPABASE_SERVICE_ROLE_KEY` when present
- allow anon fallback only outside production, with an explicit comment explaining why

If a warning is added in development, keep it minimal and intentional.

## Implementation requirements

### 1. Replace non-null assertions with explicit checks
Current code uses `!` assertions. Replace that with explicit validation so missing env vars produce actionable errors.

Validate at least:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` in production
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` only if it is still used as a local fallback path

### 2. Preserve the server-only boundary
Do not remove:
- `import 'server-only'`

### 3. Keep the exported API stable
`lib/rag.ts` and the API routes should not need broad rewrites. Prefer improving env validation without changing call sites.

### 4. Update documentation if behavior changes materially
If local development rules change, update the relevant README environment variable or troubleshooting section.

## Acceptance criteria
- production no longer falls back silently to the anon key
- missing required env vars produce clear errors
- local development behavior is intentional and documented
- lint and build pass

## Verification
Test at least these cases:
1. normal local env with all vars present
2. local env without `SUPABASE_SERVICE_ROLE_KEY` if local fallback remains allowed
3. simulated production env without `SUPABASE_SERVICE_ROLE_KEY` and confirm fail-fast behavior

Suggested commands:
- `npm run lint`
- `npm run build`
- a targeted Node import test if needed to exercise module initialization under different env combinations

## Handoff notes for the implementing LLM
- This is primarily a correctness and safety ticket, not a refactor.
- Prefer small explicit checks over abstractions.
