import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateCSRFToken, CSRF_COOKIE_CONFIG } from './lib/csrf'

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production'

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data:${isDev ? ' blob:' : ''}`,
    isDev ? "connect-src 'self' ws://localhost:* http://localhost:*" : "connect-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]

  if (!isDev) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

export async function proxy(request: NextRequest) {
  // SEO-04 : redirect 301 du domaine vercel.app (deployment production) vers le
  // domaine canonique pour éviter le duplicate content. Conditionné sur
  // VERCEL_ENV=production pour préserver les branch previews (VERCEL_ENV=preview)
  // accessibles aux reviewers. Pas de boucle : kimsandok.com ne matche pas vercel.app.
  // Local dev ignoré (host=localhost, VERCEL_ENV non défini).
  const host = (request.headers.get('host') || '').toLowerCase()
  const isVercelHost = host === 'vercel.app' || host.endsWith('.vercel.app')
  if (isVercelHost && process.env.VERCEL_ENV === 'production') {
    const target = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      'https://kimsandok.com',
    )
    // 301 pour les GET (standard SEO), 308 pour les autres méthodes (préserve le verbe).
    return NextResponse.redirect(target, request.method === 'GET' ? 301 : 308)
  }

  const nonce = generateNonce()
  const cspHeader = buildCspHeader(nonce)
  const reportOnly = process.env.CSP_REPORT_ONLY === 'true'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // GEO-08a (option A) : pose du header x-locale consommé par app/layout.tsx
  // pour <html lang> (même pattern que x-nonce). Détection minimale par préfixe
  // de chemin ; la détection Accept-Language + le redirect 307 de / sont la
  // spécification de GEO-08c (livré après). Fallback 'fr' (marché cible) pour
  // toute route sans préfixe de locale (/cv, /api, fichiers...).
  const pathname = request.nextUrl.pathname
  const locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'fr'
  requestHeaders.set('x-locale', locale)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const cspHeaderWithReporting = `${cspHeader}; report-uri /api/csp-report`

  response.headers.set(
    reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    cspHeaderWithReporting,
  )
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Set CSRF cookie if not already present (skip for /api/health to avoid side effects)
  if (
    request.nextUrl.pathname !== '/api/health' &&
    !request.cookies.get(CSRF_COOKIE_CONFIG.name)
  ) {
    const token = await generateCSRFToken()
    response.cookies.set({
      name: CSRF_COOKIE_CONFIG.name,
      value: token,
      httpOnly: CSRF_COOKIE_CONFIG.httpOnly,
      secure: CSRF_COOKIE_CONFIG.secure,
      sameSite: CSRF_COOKIE_CONFIG.sameSite,
      maxAge: CSRF_COOKIE_CONFIG.maxAge,
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
