# SEC-002 — Standard Security Headers Spec

## Goal
Harden every HTTP response with baseline browser security headers and enable React strict mode.

## Why this ticket exists
Current state in the repo:
- `next.config.ts` is effectively empty
- the backlog explicitly calls for standard security headers
- there is currently no global header policy applied by Next.js

## Scope
In scope:
- update `next.config.ts`
- set `poweredByHeader: false`
- set `reactStrictMode: true`
- add the required response headers globally

Out of scope:
- full Content Security Policy design
- rate limiting persistence
- auth changes

## Files to inspect first
- `next.config.ts`
- `proxy.ts`
- `app/layout.tsx`

## Required headers
Add these headers globally for application routes:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

Optional:
- `Permissions-Policy` only if the exact policy is intentionally chosen and tested

## Implementation requirements

### 1. Expand `next.config.ts`
Use the typed `NextConfig` export already present.

Required config flags:
- `poweredByHeader: false`
- `reactStrictMode: true`

### 2. Add a global `headers()` function
Apply the security headers to all routes via a global matcher such as `/:path*` or the equivalent Next.js syntax.

Requirements:
- do not accidentally skip API routes
- do not add duplicate or conflicting header logic in multiple places
- keep the implementation centralized in `next.config.ts`

### 3. Avoid scope creep into CSP
Do not implement `Content-Security-Policy` in this ticket. That belongs to `SEC-001`.
This ticket should land cleanly on its own.

## Acceptance criteria
- `next.config.ts` contains `poweredByHeader: false`
- `next.config.ts` contains `reactStrictMode: true`
- the three required security headers are present on normal page responses
- the three required security headers are present on API responses where Next.js header config applies
- lint and build still pass

## Verification
Run locally:
- `npm run lint`
- `npm run build`
- `npm run dev`

Then verify headers, for example with:
- `curl -I http://localhost:3000`
- `curl -I http://localhost:3000/api/chat` if the route can be hit safely without a POST body, otherwise inspect a normal route and confirm the global config behavior in browser devtools

Expected result:
- the required headers are visible
- `X-Powered-By` is absent

## Handoff notes for the implementing LLM
- Keep the change boring and centralized.
- Do not mix this ticket with CSP unless absolutely required by framework behavior.
