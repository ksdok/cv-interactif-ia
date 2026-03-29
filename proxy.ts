import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateCSRFToken, CSRF_COOKIE_CONFIG } from './lib/csrf'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Set CSRF cookie if not already present
  if (!request.cookies.get(CSRF_COOKIE_CONFIG.name)) {
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
