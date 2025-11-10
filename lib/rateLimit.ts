/**
 * Rate Limiting System
 *
 * This module implements rate limiting to prevent API abuse.
 * Limits: 200 requests per day per IP address
 *
 * How it works:
 * 1. Track request count for each IP address
 * 2. Reset counter at midnight (UTC)
 * 3. Reject requests that exceed 200/day with 429 status
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

/**
 * Rate limit configuration
 */
export const RATE_LIMIT_CONFIG = {
  maxRequestsPerDay: 200,
  dailyResetTime: '00:00:00 UTC', // Reset at midnight UTC
} as const

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
 * @param req - Next.js Request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(req: Request): string {
  // Check x-forwarded-for first (can contain multiple IPs)
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    // x-forwarded-for format: "IP1, IP2, IP3"
    // We want the first one (original client IP)
    return xForwardedFor.split(',')[0].trim()
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
    message: `Rate limit exceeded: 200 requests per day maximum.`,
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

  console.log(`Cleaned up ${removedCount} old IP records`)
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
