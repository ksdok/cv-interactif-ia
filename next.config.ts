import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs/config'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
}

// OBS-001 — Sentry build plugin.
//
// - `tunnelRoute: '/monitoring'` keeps the browser talking to our own origin, so
//   the strict CSP (`connect-src 'self'`, no `unsafe-*`) needs no widening — the
//   SDK server-tunnels to Sentry and ad-blockers are bypassed.
// - `org` / `project` / `authToken` come from env. Without `SENTRY_AUTH_TOKEN`
//   the source-map upload is skipped, and `errorHandler` (plus the
//   `SENTRY_ALLOW_FAILURE=true` safety net documented in the README) keeps the
//   build green — the CI build must need no Sentry env var at all (CICD-001).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
  telemetry: false,
  errorHandler: (err) => {
    console.warn('[sentry] build plugin error (non-fatal):', err.message)
  },
})
