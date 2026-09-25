/**
 * OBS-001 — server instrumentation hook (Next.js App Router).
 *
 * `register()` runs once per server runtime before the app handles requests.
 * Only the Node runtime is covered: this repo has no edge runtime (OBS-001 §Scope).
 */
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
}

// Automatically captures errors thrown in Server Components, route handlers
// and server actions (Next.js instrumentation convention).
export const onRequestError = Sentry.captureRequestError
