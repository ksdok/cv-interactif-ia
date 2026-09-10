# SEC-001 — Content Security Policy Spec

## Goal
Add a real Content Security Policy that meaningfully reduces XSS risk without breaking the current app.

## Why this ticket exists
Current state in the repo:
- no CSP is configured today
- `app/layout.tsx` renders an inline JSON-LD `<script>` via `dangerouslySetInnerHTML`
- `proxy.ts` already intercepts requests and can be used if request-time header logic is needed
- the app is a good candidate for a strict baseline because it has no obvious need for third-party script sprawl

## Scope
In scope:
- add a CSP header to application responses
- account for the current inline JSON-LD script in `app/layout.tsx`
- keep the app working in development and production

Out of scope:
- broad observability changes
- analytics vendor expansion
- unrelated header hardening already covered by `SEC-002`

## Files to inspect first
- `app/layout.tsx`
- `proxy.ts`
- `next.config.ts`
- `package.json`
- any components or pages that inject inline scripts or external assets

## Important implementation constraint
The repo currently includes an inline JSON-LD script in `app/layout.tsx`.
A CSP that forbids inline scripts will break this unless you do one of the following:
- add a nonce-based approach, preferred
- add a stable hash for that exact inline script content
- temporarily allow `'unsafe-inline'` for `script-src`, least preferred

Preferred direction for this ticket: nonce-based CSP if feasible within the current Next.js setup.

## Preferred implementation approach

### Option A — Preferred: request-time nonce
Use `proxy.ts` to generate a per-request nonce and attach it consistently.
Then:
- set the CSP header on the response
- make the nonce available to server rendering code
- pass the nonce to the inline JSON-LD `<script>` in `app/layout.tsx`

Benefits:
- avoids broad `'unsafe-inline'` for scripts
- keeps the CSP meaningfully strict

### Option B — Acceptable fallback: initial strict-ish policy
If nonce plumbing is too invasive for this ticket, ship a narrower interim CSP with clearly documented tradeoffs.
In that fallback case:
- keep `default-src 'self'`
- keep `object-src 'none'`
- keep `base-uri 'self'`
- keep `frame-ancestors 'none'`
- restrict `img-src`, `font-src`, and `connect-src` to only what the app needs
- document why `script-src` still needs temporary relaxation

## Directive checklist
Start from least privilege. Example baseline to evaluate and adjust:
- `default-src 'self'`
- `script-src 'self' 'nonce-<dynamic>'` or narrowly relaxed fallback
- `style-src 'self' 'unsafe-inline'` if required by Next/Tailwind runtime behavior
- `img-src 'self' data: https:`
- `font-src 'self' data:`
- `connect-src 'self'`
- `object-src 'none'`
- `base-uri 'self'`
- `frame-ancestors 'none'`
- `form-action 'self'`

Do not whitelist domains that are not actually used.

## Acceptance criteria
- responses include a CSP header
- the homepage renders correctly with no obvious CSP breakage
- the JSON-LD script still works after the CSP is enabled
- browser console shows no blocking CSP violations during normal usage, or only documented intentional dev-only exceptions
- lint and build pass

## Verification
Run:
- `npm run lint`
- `npm run build`
- `npm run dev`

Then manually verify:
- open the homepage and interact with chat UI
- inspect browser console for CSP violations
- inspect network response headers for `Content-Security-Policy`
- optionally use `curl -I http://localhost:3000`

If possible, also validate the final policy with Google CSP Evaluator.

## Handoff notes for the implementing LLM
- Do not paste a generic CSP from the internet.
- Derive the policy from the actual assets and inline behavior of this repo.
- If you have to relax `script-src`, document exactly why.
