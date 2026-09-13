import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateCSRFToken, CSRF_COOKIE_CONFIG } from './lib/csrf'
import { DEFAULT_LOCALE, localeFromPathname } from './lib/i18n/config'

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

  // Ordre imposé par la spec GEO-08c (review B3) : ① redirect host (ci-dessus)
  // → ② pose x-locale → ③ redirect / → ④ nonce/CSP. Les redirections return
  // avant la génération du nonce pour ne pas en gaspiller (revue M3).

  // ② GEO-08a (option A) + GEO-08c étape 2 (revue M2 corrigée) : le préfixe de
  // chemin gagne TOUJOURS pour x-locale (<html lang> suit l'URL, critère 1 de
  // 08a) — Accept-Language ne sert qu'à choisir la cible du redirect de /.
  // Fallback fr (marché cible). /cv est en contenu EN (fast-path SEO-03) tant
  // que GEO-08h n'est pas livré : on aligne lang sur le contenu (revue M4).
  const pathname = request.nextUrl.pathname
  const pathLocale = localeFromPathname(pathname)
  const locale = pathLocale ?? (pathname === '/cv' ? 'en' : DEFAULT_LOCALE)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', locale)

  // ③ GEO-08c étape 3 : redirect de / vers la locale négociée. 307 (pas de
  // 308/301 : la cible dépend d'un header de négociation, non cacheable par
  // les intermédiaires — review B2) + Vary: Accept-Language. Pas de branche
  // cookie NEXT_LOCALE (review M3 du corpus — code mort, GEO-08f ne le pose pas).
  if (pathname === '/') {
    const acceptLanguage = (request.headers.get('accept-language') || '').toLowerCase()
    const target = acceptLanguage.startsWith('en') ? 'en' : DEFAULT_LOCALE
    const url = request.nextUrl.clone()
    url.pathname = `/${target}`
    const redirect = NextResponse.redirect(url, 307)
    redirect.headers.set('Vary', 'Accept-Language')
    return redirect
  }

  // GEO-08a/B1 : la protection anti-soft-404 est assurée par la validation du
  // param dans app/[lang]/page.tsx (notFound() avant tout rendu → 404 + body
  // propre). Un rewrite 404 côté proxy a été testé puis retiré : le statut
  // forcé par NextResponse.rewrite(url, {status: 404}) fait servir le 404
  // PAR DÉFAUT de Next (frontières custom bypassées) et le corps streamé
  // contenait la homepage (rendu [lang] avant résolution du 404 en flight).
  // → voir review B1 ; validation page > rewrite proxy.

  // ④ nonce/CSP — inchangés, placés après les redirections (return early).
  const nonce = generateNonce()
  const cspHeader = buildCspHeader(nonce)
  const reportOnly = process.env.CSP_REPORT_ONLY === 'true'

  requestHeaders.set('x-nonce', nonce)

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
