# OBS-001 — Error Monitoring & Alerting Spec

> **Statut : PROPOSÉE** — revue kimi-analyst 2026-09-25 : À AMENDER → amendements 1–9 appliqués (10–11 reportés), en attente de validation opérateur.

## Goal
Get automatic visibility into production errors (500s, provider failures, unhandled exceptions) with alerting, instead of discovering issues from Vercel log noise.

## Why this ticket exists
Current state in the repo:
- All logging is `console.log/warn/error` (≈ 75 call sites across `app/`, `lib/`, `components/` — 77 including `lib/__tests__/`).
- No error tracking service, no alerting, no source-mapped stack traces in production.
- Observability maturity is rated 1/10 in `project-state.md` — a 500 in production is invisible unless a user reports it.

## Scope

In scope:
- integrate **Sentry** (`@sentry/nextjs`) for error + performance tracking
- client and server (Node) runtimes covered. **No edge runtime exists in this repo** (`proxy.ts` runs on the default Node runtime — no `export const runtime = 'edge'`): create `sentry.edge.config.ts` only if the wizard generates it by default, otherwise document "edge N/A for the current architecture".
- alerting on new/unhandled server errors
- CSP compatibility with the nonce-based policy in `proxy.ts`

Out of scope:
- structured logging migration (`console.*` → logger) — that is QUAL-002
- dashboards/uptime monitoring beyond Sentry's built-ins
- session replay (decide separately; it adds privacy + CSP considerations)

## Files to inspect first
- `proxy.ts` (CSP: `script-src`, nonce handling, `CSP_REPORT_ONLY`)
- `app/api/chat/route.ts`, `app/api/job-match/route.ts` (main error sources)
- `lib/modelProviders.ts` (provider fallback errors)
- `next.config.ts`
- `package.json`
- `docs/backlog/SEC-001-content-security-policy-spec.md` (CSP contract)

## Required changes

### 1. Install and configure Sentry
- `npx @sentry/wizard@latest -i nextjs` or manual setup with `@sentry/nextjs`.
- File layout changed across majors: `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` on older majors, `instrumentation.ts` + `instrumentation-client.ts` on the current SDK — check the installed `@sentry/nextjs` docs rather than memory. The DSN is read from `NEXT_PUBLIC_SENTRY_DSN`.
- **Pin `@sentry/nextjs` ≥ 10.13.0** (required for post-build source-map upload under **Turbopack**, which is Next 16's default builder — Context7 `/getsentry/sentry-docs`) **and ≥ 7.77** (CVE-2023-46729 — SSRF in the SDK's tunneling endpoint on 7.26–7.76; Sentry advisory).
- Add `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT` to Vercel env vars; document in README.
- Enable source map upload via `sentry.organization` / `sentry.project` + auth token in the build.
- **The build must stay green without secrets (CICD-001 contract).** Source-map upload only runs when `org` + `project` + `authToken` are all configured; **with no token the upload is simply skipped — it is not a build failure** (documented behaviour, Context7). Safety net: `SENTRY_ALLOW_FAILURE=true`. CI must therefore be able to build with zero Sentry env vars.
- **Performance sampling must be explicit**: set `tracesSampleRate` (e.g. `0.1` in production) and leave it at `0`/absent in dev when no DSN is configured (aligned with the DSN guard). No implicit `1.0` default.

### 2. CSP compatibility (critical)
Sentry injects scripts into the client bundle. The existing CSP is nonce-based with `strict-dynamic` and **no `unsafe-inline`**:
- Sentry's client SDK is bundled (not inline), so it should load under the existing policy — verify.
- **Error reporting endpoint — prefer `tunnelRoute`.** Configure `tunnelRoute: '/monitoring'` in `withSentryConfig`: the browser posts to your own origin (**no `connect-src` widening at all — `'self'` is enough**) and the SDK server-tunnels to Sentry, also bypassing ad-blockers (documented SDK option — Context7 `/getsentry/sentry-docs`, "server tunneling to bypass ad-blockers"). Fallback option: add `https://*.ingest.sentry.io` to `connect-src`. **Decide and document which option is retained in this spec.**
- If `tunnelRoute` is retained, verify:
  - the tunnel path matches `proxy.ts`'s `matcher` (`/((?!_next/static|_next/image|favicon.ico).*)`) — it currently will, so it passes through the nonce/CSP branch and may set the CSRF cookie; confirm this is harmless for a POST tunnel.
  - `tunnelRoute` compatibility with Turbopack (Next 16) — to confirm at setup.
- Validate in enforcing mode (`CSP_REPORT_ONLY=false`) AND report-only mode; check `/api/csp-report` for violations after deploy.
- Do NOT weaken the CSP to make Sentry work (no adding `unsafe-inline`/`unsafe-eval`).

### 3. Instrument the API routes
- In `app/api/chat/route.ts` and `app/api/job-match/route.ts` catch blocks: report the error to Sentry (with `errorCode` and provider context as tags) before returning the generic 500.
- **Cover Phase 2 streaming errors** (PERF-002): the `catch` inside `ReadableStream.start()` (`app/api/chat/route.ts:183–195`) swallows a server failure into an NDJSON `error` event inside an already-`200` response — no `500` is ever returned, so auto-instrumentation never sees it. Add `captureException(error, { tags: { errorCode: 'SERVER', phase: 'streaming' } })` before the `error` event is enqueued. Do **not** instrument the `AbortError` / `req.signal.aborted` branch — that is a normal client disconnect.
- **A successful provider fallback is a signal, not background noise.** In `lib/modelProviders.ts`, when `provider !== ACTIVE_PROVIDER` after a successful call the code currently only emits `console.warn` (a breadcrumb — no event, so a primary-provider outage stays invisible). Emit `captureMessage('Provider fallback used', 'warning')` with provider/model tags in `generateResponse` / `streamResponse` and in `generateJobMatchResponse`.
- Add tags/breadcrumbs for: provider used, fallback triggered, `CV_CONTEXT_SOURCE`.
- Do NOT send chat message contents or job descriptions to Sentry by default (privacy) — configure `beforeSend` to strip request bodies, or use `sendDefaultPii: false` and verify.

### 4. Noise control
- Expected high-frequency, non-actionable events should not page anyone: rate-limit 429s (`app/api/chat/route.ts:86–98`) and CSRF 403s (`app/api/chat/route.ts:112–117`) are **responses, never exceptions** — do not instrument those paths at all, not even as breadcrumbs. Any future visibility there belongs to metrics, not error events.
- Alert policy: default "new issue" email alerts are enough for V1; refine later.

### 5. Vercel integration
- Enable the Sentry–Vercel integration (or verify the build plugin) so releases are tagged with deployment metadata. **This is a manual human action in the Vercel/Sentry dashboards — it is not executable by the implementing coder**, and is not a blocker for the code changes.

## Implementation notes
- Keep the local/dev experience unchanged: disable Sentry or lower sampling when no DSN is configured (guard config with `process.env.NEXT_PUBLIC_SENTRY_DSN`).
- `captureException` in catch blocks must never replace the existing user-facing error response contract (`errorCode` mapping in `ChatPreview.tsx` stays the source of truth for UI messages).
- Check Sentry SDK compatibility with Next.js 16 / React 19 before pinning versions.

## Acceptance criteria
- A thrown 500 in `/api/chat` (e.g. temporarily invalid provider key in a test env) appears in the Sentry dashboard with server context within minutes.
- Client-side errors (e.g. thrown in `ChatPreview.tsx`) are captured.
- A Phase 2 streaming failure (NDJSON `error` event in a `200` response) is captured with `phase: 'streaming'`.
- A provider fallback (primary down, secondary served) produces a Sentry `warning` message with provider/model tags.
- `npm run build` passes in CI **with no Sentry env vars at all** (secret-free build contract); source-map upload is skipped, not failed, without `SENTRY_AUTH_TOKEN`.
- No new CSP violation reports are generated by Sentry in production enforcing mode.
- No chat content or job descriptions leak into Sentry events (verified via a test event inspection).
- 429/403 traffic does not create alert noise.
- Performance transactions stay ≤ X% of the plan quota in the first week (fix X at implementation).

## Verification
Run:
- `npm run lint`, `npm run build`, `npm run start` with test DSN configured
- `npm run build` with no Sentry env vars (CI contract)
- trigger a forced provider error and confirm the event in the Sentry dashboard
- trigger a Phase 2 streaming failure and confirm the `phase: 'streaming'` event
- trigger a fallback (primary key invalid) and confirm the `Provider fallback used` warning
- inspect `/api/csp-report` output in production after deployment
- `npm run test` passes (TEST-001 is delivered — Vitest 5)

## Handoff notes for the implementing LLM
- The CSP interaction is the highest-risk part of this ticket — read `proxy.ts` fully before touching anything.
- Sentry docs move fast; consult current `@sentry/nextjs` docs for the Next.js version in `package.json` (16.x) rather than memory or older tutorials.
- Do not migrate `console.*` calls — that is QUAL-002's job.
- Do not add Sentry user-feedback widgets or session replay in this ticket.
- Facts still **"to confirm at implementation"**: the exact behaviour of `withSentryConfig` on the installed SDK version; whether the wizard generates `sentry.edge.config.ts` by default; `tunnelRoute` × Turbopack compatibility; the Sentry–Vercel integration is a manual human action (see §5).

## Sources
- Context7 `/getsentry/sentry-docs`: `tunnelRoute` in `withSentryConfig`; post-build source-map upload under Turbopack requires `@sentry/nextjs@10.13.0+` and `next@15.4.1+`; upload skipped when `org`/`project`/`authToken` are not all set; `instrumentation.ts` + `instrumentation-client.ts` layout; DSN via `NEXT_PUBLIC_SENTRY_DSN`.
- Sentry blog: Turbopack support.
- Advisory CVE-2023-46729: SSRF via the SDK tunneling endpoint on `@sentry/nextjs` 7.26–7.76 → pin ≥ 7.77.
- kimi-analyst review 2026-09-25 (verdict: À AMENDER) — amendments 1–9 applied, 10–11 deferred below.

## Suggestions de revue reportées (non appliquées)
- **10 — ordre de déploiement CSP/tunnel avant DSN.** Deferred: it is a deployment-ordering instruction and belongs in an operator runbook, not this spec.
- **11 — `VERCEL_ENV`.** Deferred: redundant environment variable — arbitration to be made at implementation.