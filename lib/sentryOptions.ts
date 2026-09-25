/**
 * OBS-001 — Shared Sentry initialisation options (client + server).
 *
 * Deliberately a plain module (no `server-only`): it is imported by both the
 * browser bundle (`instrumentation-client.ts`) and the Node runtime
 * (`sentry.server.config.ts`).
 *
 * Design decisions:
 * - **DSN guard** — nothing is initialised without `NEXT_PUBLIC_SENTRY_DSN`, so
 *   local dev and the secret-free CI build are unchanged (OBS-001 §1).
 * - **Explicit sampling** — 10 % of transactions in production, disabled
 *   everywhere else. No implicit `1.0` default (OBS-001 §1).
 * - **Privacy** — `sendDefaultPii: false` plus `beforeSend`/`beforeBreadcrumb`
 *   scrubbers: request bodies, cookies and console-breadcrumb arguments are
 *   dropped because the chat/job-match code logs 200-char slices of user
 *   content (OBS-001 §3).
 */
import type { BrowserOptions, Breadcrumb, ErrorEvent, NodeOptions } from '@sentry/nextjs'

type SentryInitOptions = BrowserOptions & NodeOptions

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export const isSentryEnabled = Boolean(SENTRY_DSN)

// `VERCEL_ENV` is injected automatically by Vercel; `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
// is only needed to label the *client* bundle (server-side vars are not inlined
// client-side). It is therefore optional, not mandatory.
const SENTRY_ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV

const TRACES_SAMPLE_RATE = process.env.NODE_ENV === 'production' ? 0.1 : 0

/** Remove user content from the event payload before it leaves the process. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.query_string
    if (event.request.headers) {
      for (const header of ['cookie', 'Cookie', 'authorization', 'Authorization']) {
        delete event.request.headers[header]
      }
    }
  }
  return event
}

/** Console breadcrumbs carry chat excerpts / job descriptions as arguments. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.data) {
    if (breadcrumb.category === 'console') {
      delete breadcrumb.data.arguments
    }
    if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
      delete breadcrumb.data.body
    }
  }
  return breadcrumb
}

export function buildSentryOptions(): SentryInitOptions {
  return {
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    sendDefaultPii: false,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  }
}
