/**
 * OBS-001 — client-side Sentry initialisation (App Router).
 *
 * Without a DSN the SDK stays inert (no network calls, no console noise), so
 * the local experience is unchanged.
 */
import * as Sentry from '@sentry/nextjs'
import { buildSentryOptions, isSentryEnabled } from './lib/sentryOptions'

if (isSentryEnabled) {
  Sentry.init(buildSentryOptions())
}

// Required by the SDK to instrument client-side navigations (App Router);
// without this export the SDK logs an ACTION REQUIRED warning at build time.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
