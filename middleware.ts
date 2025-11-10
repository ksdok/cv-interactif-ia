/**
 * Next.js Middleware for CSRF Protection
 *
 * This middleware runs on every request and:
 * 1. Checks if the request has a CSRF token in a secure cookie
 * 2. If not present, generates a new token
 * 3. Sets the token in a secure httpOnly cookie
 *
 * The token is never accessible to JavaScript, only sent in HTTP headers.
 * This prevents XSS attacks from stealing the token.
 *
 * Note: This middleware runs on the edge (fast) and completes before
 * route handlers are called.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateCSRFToken, CSRF_COOKIE_CONFIG } from '@/lib/csrf'

/**
 * Middleware function that generates and sets CSRF tokens
 * Runs on all requests to ensure token is always available
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Check if CSRF token already exists in cookies
  const csrfToken = request.cookies.get(CSRF_COOKIE_CONFIG.name)?.value

  // If token doesn't exist, generate a new one
  if (!csrfToken) {
    const newToken = await generateCSRFToken()

    // Set the token in a secure httpOnly cookie
    // This cookie will NOT be accessible to JavaScript
    response.cookies.set(CSRF_COOKIE_CONFIG.name, newToken, {
      httpOnly: CSRF_COOKIE_CONFIG.httpOnly,      // Prevent XSS access
      secure: CSRF_COOKIE_CONFIG.secure,          // HTTPS only
      sameSite: CSRF_COOKIE_CONFIG.sameSite as any, // Strict same-site policy
      maxAge: CSRF_COOKIE_CONFIG.maxAge,          // 24 hours
      path: '/',                                   // Available for all routes
    })
  }

  return response
}

/**
 * Configure which routes this middleware applies to
 * We want to run on all routes to ensure token is always available
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
