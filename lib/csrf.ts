/**
 * CSRF Token Generation and Verification
 *
 * This module provides utilities for CSRF (Cross-Site Request Forgery) protection.
 *
 * CSRF Protection Flow:
 * 1. Server generates a random token and stores it in secure httpOnly cookie
 * 2. Token is passed to client in HTML (never exposed to JavaScript directly)
 * 3. Client includes token in X-CSRF-Token request header
 * 4. Server verifies token matches the cookie value
 * 5. Request is processed only if token is valid
 */

/**
 * Generate a random CSRF token
 * Uses Web Crypto API (works in both Node.js and Edge Runtime)
 *
 * @returns 32-byte random string in hex format (64 characters)
 */
export async function generateCSRFToken(): Promise<string> {
  // Use Web Crypto API which is available in both Node.js and Edge Runtime
  const array = new Uint8Array(32)
  const randomValues = crypto.getRandomValues(array)
  return Array.from(randomValues)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify that a CSRF token is valid
 * Tokens must match exactly for verification to pass
 *
 * @param providedToken - Token from request header
 * @param storedToken - Token from httpOnly cookie
 * @returns true if tokens match, false otherwise
 */
export function verifyCSRFToken(
  providedToken: string | null | undefined,
  storedToken: string | null | undefined
): boolean {
  // Both tokens must exist
  if (!providedToken || !storedToken) {
    return false
  }

  // Tokens must match exactly
  // Simple string comparison is safe for CSRF tokens since they're not secret
  // (the real secret is that it's in httpOnly cookie)
  return providedToken === storedToken
}

/**
 * Extract CSRF token from request headers
 * Accepts token in X-CSRF-Token header (standard convention)
 *
 * @param req - Next.js Request object
 * @returns Token string or null if not found
 */
export function getCSRFTokenFromRequest(req: Request): string | null {
  return req.headers.get('x-csrf-token') || null
}

/**
 * CSRF Cookie Configuration
 * These are the secure defaults for the CSRF token cookie
 */
export const CSRF_COOKIE_CONFIG = {
  name: 'csrf-token',
  // Security settings
  httpOnly: true,        // Prevent JavaScript from accessing the token
  secure: true,          // Only send over HTTPS (production)
  sameSite: 'strict',    // Only send from same-site requests
  maxAge: 60 * 60 * 24,  // 24 hours
} as const
