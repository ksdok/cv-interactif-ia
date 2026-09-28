/**
 * Rate Limiting System
 *
 * This module implements rate limiting to prevent API abuse.
 * Limits: 50 requests per day per IP address
 *
 * How it works:
 * 1. Track request count for each IP address
 * 2. Reset counter at midnight (UTC)
 * 3. Reject requests that exceed 50/day with 429 status
 *
 * RATE-001 : plafond abaissé de 200 à 50 req/jour/IP (pool partagé chat +
 * job-match) — motivations : coût API (GPT-6 Luna), anti-abus, usage légitime
 * d'un recruteur très inférieur à 50 messages. La forme du contrat 429
 * (`errorCode`, `Retry-After`, `X-RateLimit-*`) est inchangée (CONTEXT.md §6.5).
 *
 * Security Purpose:
 * - Prevent API quota exhaustion from spam/attacks
 * - Control costs (each API call costs money)
 * - Ensure fair access for all users
 */

/**
 * Interface for tracking requests per IP
 */
interface RateLimitRecord {
  date: string  // Format: YYYY-MM-DD (UTC)
  count: number // Number of requests today
}

/**
 * In-memory storage for rate limit tracking
 * Maps IP address → request count and date
 *
 * Note: This resets on server restart/deployment.
 * For persistent rate limiting, use Redis or Vercel KV.
 */
const requestCounts: { [ip: string]: RateLimitRecord } = {}

let lastCleanup = 0
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Rate limit configuration
 */
export const RATE_LIMIT_CONFIG = {
  maxRequestsPerDay: 50,
  dailyResetTime: '00:00:00 UTC', // Reset at midnight UTC
} as const

/**
 * Message de refus 429, dérivé de la configuration.
 *
 * RATE-001 (décision 2) : le plafond était auparavant dupliqué en dur dans le
 * message de `checkRateLimit()` **et** dans les corps 429 des deux routes — un
 * changement de plafond pouvait donc laisser un message qui mentait. Les trois
 * sites consomment désormais cette constante unique (le texte serveur n'est
 * jamais affiché au client, qui mappe `errorCode` vers le dictionnaire).
 */
export const RATE_LIMIT_MESSAGE = `Rate limit exceeded: ${RATE_LIMIT_CONFIG.maxRequestsPerDay} requests per day maximum`

/**
 * Get current UTC date in YYYY-MM-DD format
 * Used for daily counter reset
 */
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get the next reset time (midnight UTC tomorrow)
 */
function getNextResetTime(): Date {
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow
}

/**
 * Extract client IP from request headers
 *
 * Checks headers in order of reliability:
 * 1. x-forwarded-for (most reliable, from proxies)
 * 2. cf-connecting-ip (Cloudflare)
 * 3. x-real-ip (nginx, other reverse proxies)
 *
 * SEC-007: dans une chaîne `x-forwarded-for`, c'est le **dernier** maillon qui
 * est le plus proche de la plateforme — le premier peut être fourni par le
 * client (spoof). La sonde prod du 2026-09-28 a montré que Vercel écrase le XFF
 * (scénario B : la valeur injectée par le client n'arrive jamais à la fonction) ;
 * on durcit quand même en retenant le dernier élément (defense-in-depth gratuit,
 * identique au comportement actuel sur un XFF mono-IP).
 *
 * @param req - Next.js Request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(req: Request): string {
  // Check x-forwarded-for first (can contain multiple IPs)
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    // x-forwarded-for format: "IP client, …, IP plateforme"
    // On retient le dernier IP non vide (le plus proche de la plateforme).
    const chain = xForwardedFor
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0)
    if (chain.length > 0) {
      return chain[chain.length - 1]
    }
  }

  // Check Cloudflare header
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Check generic x-real-ip header
  const xRealIp = req.headers.get('x-real-ip')
  if (xRealIp) {
    return xRealIp
  }

  // Fallback for local development
  return 'unknown'
}

/**
 * Check if an IP is allowed to make a request
 *
 * Returns immediately if under limit.
 * Returns 429 status if limit exceeded.
 *
 * @param ip - Client IP address
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetTime: string
  message?: string
} {
  const today = getTodayUTC()
  const max = RATE_LIMIT_CONFIG.maxRequestsPerDay

  // Periodic cleanup: remove old IP records at most once per hour
  const now = Date.now()
  if (now - lastCleanup >= CLEANUP_INTERVAL_MS) {
    lastCleanup = now
    cleanupOldRecords()
  }

  // Initialize new IP or reset if it's a new day
  if (!requestCounts[ip] || requestCounts[ip].date !== today) {
    requestCounts[ip] = {
      date: today,
      count: 0,
    }
  }

  const record = requestCounts[ip]

  // Check if under limit
  if (record.count < max) {
    // Increment counter and allow request
    record.count++
    const remaining = max - record.count

    return {
      allowed: true,
      remaining: remaining,
      resetTime: getNextResetTime().toISOString(),
    }
  }

  // Limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetTime: getNextResetTime().toISOString(),
    message: RATE_LIMIT_MESSAGE,
  }
}

/**
 * Get rate limit headers for HTTP response
 *
 * Includes standard rate limit information that clients
 * can use to manage their request rate.
 *
 * @param rateLimit - Result from checkRateLimit()
 * @returns Object with headers for response
 */
export function getRateLimitHeaders(rateLimit: ReturnType<typeof checkRateLimit>) {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequestsPerDay),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': rateLimit.resetTime,
  }
}

/**
 * Get Retry-After header value (seconds)
 * Used when returning 429 Too Many Requests
 */
export function getRetryAfterSeconds(): number {
  const now = new Date()
  const nextReset = getNextResetTime()
  return Math.ceil((nextReset.getTime() - now.getTime()) / 1000)
}

/**
 * Cleanup old IP records (optional)
 * Call this periodically to remove IPs from tracking
 * Useful to prevent memory bloat from infinite IP addresses
 */
export function cleanupOldRecords(daysToKeep: number = 7): number {
  const cutoffDate = new Date()
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - daysToKeep)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

  let removedCount = 0
  for (const ip in requestCounts) {
    if (requestCounts[ip].date < cutoffDateStr) {
      delete requestCounts[ip]
      removedCount++
    }
  }

  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} old IP records`)
  }
  return removedCount
}

/**
 * Get statistics about current rate limit state
 * Useful for monitoring and debugging
 */
export function getStats(): {
  totalIPsTracked: number
  todayRequests: number
  oldestRecord: string | null
} {
  const today = getTodayUTC()
  let todayCount = 0
  let oldestRecord: string | null = null

  for (const ip in requestCounts) {
    const record = requestCounts[ip]
    if (record.date === today) {
      todayCount += record.count
    }
    if (!oldestRecord || record.date < oldestRecord) {
      oldestRecord = record.date
    }
  }

  return {
    totalIPsTracked: Object.keys(requestCounts).length,
    todayRequests: todayCount,
    oldestRecord,
  }
}
