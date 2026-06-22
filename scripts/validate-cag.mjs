#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = resolve(__dirname, 'results')
const BASE_URL = process.env.CAG_BASE_URL || 'http://localhost:3000'
const MODE = process.env.CV_CONTEXT_SOURCE || 'cag'
const OUTPUT_FILE = resolve(RESULTS_DIR, `${MODE}-validation-results.json`)
const REQUEST_TIMEOUT_MS = Number(process.env.CAG_REQUEST_TIMEOUT_MS || 30_000)

const TEST_QUESTIONS = [
  { category: 'experience', question: "What is the candidate's most recent role?" },
  { category: 'experience', question: 'How many years of experience does the candidate have?' },
  { category: 'experience', question: 'What did the candidate do at Société Générale?' },
  { category: 'tools', question: 'What tools and technologies does the candidate know?' },
  { category: 'tools', question: 'Does the candidate have experience with Figma?' },
  { category: 'industries', question: 'What industries has the candidate worked in?' },
  { category: 'achievements', question: "What are the candidate's key achievements?" },
  { category: 'off-topic', question: 'What is the weather like today?', offTopic: true },
  { category: 'off-topic', question: 'Tell me a joke.', offTopic: true },
]

function parseArgs() {
  const args = process.argv.slice(2)
  const config = { outputFile: OUTPUT_FILE, baseUrl: BASE_URL, mode: MODE }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--base-url') config.baseUrl = args[++i]
    else if (arg === '--mode') config.mode = args[++i]
    else if (arg === '--output') config.outputFile = resolve(args[++i])
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/validate-cag.mjs [--base-url http://localhost:3000] [--mode cag|rag] [--output path]

Requires a running local server (npm run dev) and valid provider/Supabase environment variables.`)
      process.exit(0)
    }
  }

  if (config.outputFile === OUTPUT_FILE && config.mode !== MODE) {
    config.outputFile = resolve(RESULTS_DIR, `${config.mode}-validation-results.json`)
  }

  return config
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function splitSetCookieHeader(headerValue) {
  if (!headerValue) return []
  return headerValue.split(/,(?=\s*[^;=]+=[^;]+)/g).map((value) => value.trim()).filter(Boolean)
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  return splitSetCookieHeader(headers.get('set-cookie'))
}

function extractCookieHeader(headers) {
  return getSetCookies(headers)
    .map((cookie) => cookie.split(';')[0])
    .filter(Boolean)
    .join('; ')
}

function extractCSRFToken(html) {
  const metaTag = html.match(/<meta\b[^>]*\bname=["']csrf-token["'][^>]*>/i)?.[0]
  const token = metaTag?.match(/\bcontent=["']([^"']+)["']/i)?.[1]
  if (!token) throw new Error('Could not find <meta name="csrf-token" content="..."> in homepage HTML')
  return token
}

async function getCSRFSession(baseUrl) {
  const response = await fetchWithTimeout(baseUrl, { method: 'GET' })
  if (!response.ok) throw new Error(`GET / failed with HTTP ${response.status}`)

  const html = await response.text()
  return {
    csrfToken: extractCSRFToken(html),
    cookieHeader: extractCookieHeader(response.headers),
  }
}

function getRateLimitHeaders(headers) {
  const result = {}
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase().startsWith('x-ratelimit') || key.toLowerCase() === 'retry-after') {
      result[key] = value
    }
  }
  return result
}

function isLikelyPoliteDecline(response) {
  const text = response.toLowerCase()
  const scopeSignals = [
    'candidate',
    'professional background',
    'skills and experience',
    "dok's professional",
    'dok kim-san',
  ]
  const refusalSignals = [
    'only able to answer',
    'only answer',
    'specifically to answer',
    'cannot',
    "can't",
    'not able',
    'would be glad to share',
  ]
  return scopeSignals.some((signal) => text.includes(signal)) && refusalSignals.some((signal) => text.includes(signal))
}

async function askQuestion(baseUrl, question) {
  const { csrfToken, cookieHeader } = await getCSRFSession(baseUrl)
  const startedAt = Date.now()

  const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: question }],
    }),
  })

  const latencyMs = Date.now() - startedAt
  const rawBody = await response.text()
  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    body = { error: rawBody || `HTTP ${response.status}` }
  }

  return {
    status: response.status,
    response: body.response || '',
    error: body.error || null,
    latencyMs,
    hasAnswer: Boolean(body.response && body.response.trim()),
    rateLimitHeaders: getRateLimitHeaders(response.headers),
  }
}

function summarize(results) {
  const latencies = results.map((result) => result.latencyMs).filter(Number.isFinite)
  const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null
  const offTopicResults = results.filter((result) => result.offTopic)

  return {
    totalQuestions: results.length,
    answered: results.filter((result) => result.hasAnswer).length,
    offTopicCorrectlyDeclined: offTopicResults.filter((result) => result.offTopicCorrectlyDeclined).length,
    avgLatencyMs,
    minLatencyMs: latencies.length ? Math.min(...latencies) : null,
    maxLatencyMs: latencies.length ? Math.max(...latencies) : null,
    nonEmptyResponseRate: `${results.filter((result) => result.hasAnswer).length}/${results.length}`,
    qualityReview: 'manual',
  }
}

async function main() {
  const config = parseArgs()
  await mkdir(dirname(config.outputFile), { recursive: true })

  const results = []
  console.log(`[validate-cag] Base URL: ${config.baseUrl}`)
  console.log(`[validate-cag] Mode: ${config.mode}`)

  for (const test of TEST_QUESTIONS) {
    process.stdout.write(`[validate-cag] ${test.question} ... `)
    try {
      const result = await askQuestion(config.baseUrl, test.question)
      const enriched = {
        category: test.category,
        question: test.question,
        response: result.response,
        latencyMs: result.latencyMs,
        hasAnswer: result.hasAnswer,
        offTopic: Boolean(test.offTopic),
        offTopicCorrectlyDeclined: test.offTopic ? isLikelyPoliteDecline(result.response) : null,
        status: result.status,
        error: result.error,
        rateLimitHeaders: result.rateLimitHeaders,
        quality: test.offTopic ? 'guardrail-check' : 'pending-manual-review',
      }
      results.push(enriched)
      console.log(`${result.status} ${result.latencyMs}ms`)
    } catch (error) {
      results.push({
        category: test.category,
        question: test.question,
        response: '',
        latencyMs: null,
        hasAnswer: false,
        offTopic: Boolean(test.offTopic),
        offTopicCorrectlyDeclined: null,
        status: null,
        error: error instanceof Error ? error.message : String(error),
        quality: 'error',
      })
      console.log(`ERROR ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const payload = {
    mode: config.mode,
    baseUrl: config.baseUrl,
    timestamp: new Date().toISOString(),
    manualQualityReviewRequired: true,
    results,
    summary: summarize(results),
  }

  await writeFile(config.outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`\n[validate-cag] Results written to ${config.outputFile}`)
  console.log('[validate-cag] Summary:', payload.summary)
}

main().catch((error) => {
  console.error('[validate-cag] Fatal error:', error)
  process.exit(1)
})
