import { NextResponse } from 'next/server'
import { getClientIP } from '@/lib/rateLimit'

const MAX_CSP_REPORT_BODY_BYTES = 10_000
const MAX_CSP_REPORTS_PER_WINDOW = 100
const CSP_REPORT_WINDOW_MS = 60 * 1000

type CspReportRateLimitRecord = {
  windowStart: number
  count: number
}

const cspReportRequests = new Map<string, CspReportRateLimitRecord>()
let lastCleanup = 0

function cleanupCspReportRateLimit(now: number) {
  if (now - lastCleanup < CSP_REPORT_WINDOW_MS) return

  for (const [ip, record] of cspReportRequests) {
    if (now - record.windowStart >= CSP_REPORT_WINDOW_MS) {
      cspReportRequests.delete(ip)
    }
  }

  lastCleanup = now
}

function checkCspReportRateLimit(ip: string) {
  const now = Date.now()
  cleanupCspReportRateLimit(now)

  const record = cspReportRequests.get(ip)
  if (!record || now - record.windowStart >= CSP_REPORT_WINDOW_MS) {
    cspReportRequests.set(ip, { windowStart: now, count: 1 })
    return true
  }

  if (record.count >= MAX_CSP_REPORTS_PER_WINDOW) {
    return false
  }

  record.count += 1
  return true
}

async function readLimitedBody(request: Request) {
  if (!request.body) {
    return { body: '', tooLarge: false }
  }

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let body = ''
  let bytesRead = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      if (bytesRead > MAX_CSP_REPORT_BODY_BYTES) {
        return { body: '', tooLarge: true }
      }

      body += decoder.decode(value, { stream: true })
    }

    body += decoder.decode()
    return { body, tooLarge: false }
  } finally {
    reader.releaseLock()
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_CSP_REPORT_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  const ip = getClientIP(request)
  if (!checkCspReportRateLimit(ip)) {
    return new NextResponse(null, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(CSP_REPORT_WINDOW_MS / 1000)) },
    })
  }

  const { body, tooLarge } = await readLimitedBody(request)
  if (tooLarge) {
    return new NextResponse(null, { status: 413 })
  }

  if (body) {
    try {
      console.warn('CSP violation report:', JSON.parse(body))
    } catch {
      console.warn('CSP violation report (raw):', body.slice(0, 500))
    }
  }

  return new NextResponse(null, { status: 204 })
}
