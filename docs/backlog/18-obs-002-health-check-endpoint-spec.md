# OBS-002 — Health Check Endpoint Spec

## Goal
Add a minimal health endpoint for uptime monitoring and external probes.

## Why this ticket exists
Current state in the repo:
- there is no `GET /api/health` route
- the only API routes today are `POST /api/chat` and `POST /api/job-match`
- `projet-state.md` explicitly asks for a health endpoint returning `{ status: 'ok', timestamp }`

This makes basic external monitoring harder than it needs to be.

## Scope
In scope:
- add a lightweight `GET /api/health` endpoint
- return a stable JSON payload suitable for uptime checks
- keep it unauthenticated and cheap

Out of scope:
- deep dependency health checks
- database connectivity validation
- provider API reachability checks
- authentication or rate limiting on the health route

## Files to inspect first
- `app/api/chat/route.ts`
- `app/api/job-match/route.ts`
- `next.config.ts` if global headers are being added in parallel

## Endpoint contract
Create:
- `app/api/health/route.ts`

Method:
- `GET`

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-08T12:34:56.789Z"
}
```

Behavior requirements:
- return HTTP 200
- `timestamp` must be generated at request time in ISO-8601 format
- response must be JSON via `NextResponse.json(...)`

## Implementation requirements

### 1. Keep it dependency-light
Do not call:
- Supabase
- OpenAI
- Gemini
- rate limit storage

This route is for liveness/basic uptime, not deep readiness.

### 2. Keep it publicly callable
Do not require:
- CSRF token
- auth
- POST body

Monitoring systems need to hit it simply via GET.

### 3. Keep the response stable
Avoid adding extra fields unless there is a clear monitoring need.
The stable contract should remain:
- `status`
- `timestamp`

## Acceptance criteria
- `GET /api/health` exists
- the endpoint returns HTTP 200 with JSON `{ status: 'ok', timestamp }`
- no secrets or dependency checks are exposed
- lint and build pass

## Verification
Run:
- `npm run lint`
- `npm run build`
- `npm run dev`

Then verify with:
- `curl http://localhost:3000/api/health`

Expected result:
- JSON response with `status: "ok"`
- an ISO timestamp string generated at request time

## Handoff notes for the implementing LLM
- Keep this endpoint intentionally boring.
- Do not expand it into a readiness dashboard.
- If a later ticket needs deeper checks, add a separate endpoint or explicit readiness mode instead of bloating this one.
