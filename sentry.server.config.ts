/**
 * OBS-001 — server-side (Node runtime) Sentry initialisation.
 *
 * Imported by `instrumentation.ts` only when `NEXT_RUNTIME === 'nodejs'`.
 * No `sentry.edge.config.ts` exists on purpose: this repo has no edge runtime
 * (`proxy.ts` runs on the default Node runtime) — see OBS-001 §Scope.
 */
import * as Sentry from '@sentry/nextjs'
import { buildSentryOptions, isSentryEnabled } from './lib/sentryOptions'

if (isSentryEnabled) {
  Sentry.init(buildSentryOptions())
}
