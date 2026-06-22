#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = resolve(__dirname, 'results')
const OUTPUT_FILE = resolve(RESULTS_DIR, 'cache-measurement-results.json')
const BASE_URL = process.env.CAG_BASE_URL || 'http://localhost:3000'
const REQUEST_TIMEOUT_MS = Number(process.env.CAG_REQUEST_TIMEOUT_MS || 30_000)
const RUNS = Number(process.env.CAG_CACHE_RUNS || 5)
const QUESTION = process.env.CAG_CACHE_QUESTION || "What is the candidate's most recent role?"

const OPENAI_CACHE_RE = /\[modelProviders\] OpenAI cache hit: (\d+) cached tokens/
const GEMINI_USAGE_RE = /\[modelProviders\] Gemini usage: ({.*})/
const PROVIDER_RE = /\[modelProviders\] Trying provider: (\w+)/

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    baseUrl: BASE_URL,
    outputFile: OUTPUT_FILE,
    question: QUESTION,
    runs: RUNS,
    startServer: true,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--base-url') config.baseUrl = args[++i]
    else if (arg === '--output') config.outputFile = resolve(args[++i])
    else if (arg === '--question') config.question = args[++i]
    else if (arg === '--runs') config.runs = Number(args[++i])
    else if (arg === '--use-existing-server') config.startServer = false
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/measure-cache.mjs [--base-url http://localhost:3000] [--runs 5] [--question "..."] [--use-existing-server]

Default behavior starts npm run dev as a subprocess to capture provider cache logs.
Use --use-existing-server when the server is already running; cache logs cannot be captured in that mode, so latency is the main signal.`)
      process.exit(0)
    }
  }

  return config
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
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
  if (!token) throw new Error('Could not find CSRF meta token in homepage HTML')
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

async function postChat(baseUrl, question) {
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
  return { status: response.status, latencyMs, body }
}

async function waitForServer(baseUrl, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`, { method: 'GET' })
      if (response.ok) return
    } catch {
      // Server not ready yet.
    }
    await sleep(500)
  }
  throw new Error(`Server did not become ready at ${baseUrl} within ${timeoutMs}ms`)
}

function startDevServer() {
  const logs = []
  const child = spawn('npm', ['run', 'dev'], {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const capture = (source) => (chunk) => {
    const text = chunk.toString()
    process.stdout.write(`[dev:${source}] ${text}`)
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      logs.push({ ts: Date.now(), source, line })
    }
  }

  child.stdout.on('data', capture('stdout'))
  child.stderr.on('data', capture('stderr'))

  return { child, logs }
}

function parseMetrics(logs, startIndex) {
  const relevantLogs = logs.slice(startIndex).map((entry) => entry.line)
  const provider = relevantLogs.map((line) => line.match(PROVIDER_RE)?.[1]).find(Boolean) || null
  const openAIHit = relevantLogs.map((line) => line.match(OPENAI_CACHE_RE)?.[1]).find(Boolean)
  const geminiUsageRaw = relevantLogs.map((line) => line.match(GEMINI_USAGE_RE)?.[1]).find(Boolean)

  let geminiUsage = null
  if (geminiUsageRaw) {
    try {
      geminiUsage = JSON.parse(geminiUsageRaw)
    } catch {
      geminiUsage = { parseError: true, raw: geminiUsageRaw }
    }
  }

  return {
    provider,
    cachedTokens: openAIHit ? Number(openAIHit) : geminiUsage?.cachedContentTokenCount ?? null,
    promptTokens: geminiUsage?.promptTokenCount ?? null,
    totalTokens: geminiUsage?.totalTokenCount ?? null,
    rawGeminiUsage: geminiUsage,
    matchedLogLines: relevantLogs.filter((line) => OPENAI_CACHE_RE.test(line) || GEMINI_USAGE_RE.test(line) || PROVIDER_RE.test(line)),
  }
}

function average(values) {
  const filtered = values.filter((value) => typeof value === 'number' && Number.isFinite(value))
  if (!filtered.length) return null
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length)
}

function summarize(runs) {
  const cacheHits = runs.filter((run) => typeof run.cachedTokens === 'number' && run.cachedTokens > 0)
  const cachedLatencies = cacheHits.map((run) => run.latencyMs)
  const uncachedLatencies = runs.filter((run) => !run.cachedTokens).map((run) => run.latencyMs)
  const avgLatencyWithCacheMs = average(cachedLatencies)
  const avgLatencyWithoutCacheMs = average(uncachedLatencies)

  let latencyReduction = null
  if (avgLatencyWithCacheMs && avgLatencyWithoutCacheMs) {
    latencyReduction = `${Math.round(((avgLatencyWithoutCacheMs - avgLatencyWithCacheMs) / avgLatencyWithoutCacheMs) * 100)}%`
  }

  return {
    cacheHitRate: `${cacheHits.length}/${runs.length} (${Math.round((cacheHits.length / runs.length) * 100)}%)`,
    avgLatencyWithCacheMs,
    avgLatencyWithoutCacheMs,
    avgLatencyMs: average(runs.map((run) => run.latencyMs)),
    latencyReduction,
    metricsSource: 'server-stdout-regex-best-effort',
  }
}

async function main() {
  const config = parseArgs()
  await mkdir(dirname(config.outputFile), { recursive: true })

  let devServer = null
  if (config.startServer) {
    console.log('[measure-cache] Starting npm run dev to capture server logs...')
    devServer = startDevServer()
  } else {
    console.log('[measure-cache] Using existing server; cache logs cannot be captured from this process.')
    devServer = { logs: [] }
  }

  const shutdown = () => {
    if (devServer?.child && !devServer.child.killed) devServer.child.kill('SIGTERM')
  }
  process.on('exit', shutdown)
  process.on('SIGINT', () => {
    shutdown()
    process.exit(130)
  })

  try {
    await waitForServer(config.baseUrl)

    const runs = []
    for (let run = 1; run <= config.runs; run += 1) {
      const logStartIndex = devServer.logs.length
      console.log(`[measure-cache] Run ${run}/${config.runs}: ${config.question}`)
      const result = await postChat(config.baseUrl, config.question)
      await sleep(1_000)
      const metrics = parseMetrics(devServer.logs, logStartIndex)

      runs.push({
        run,
        status: result.status,
        latencyMs: result.latencyMs,
        provider: metrics.provider,
        cachedTokens: metrics.cachedTokens,
        totalPromptTokens: metrics.promptTokens,
        totalTokens: metrics.totalTokens,
        hasAnswer: Boolean(result.body?.response),
        error: result.body?.error || null,
        rawGeminiUsage: metrics.rawGeminiUsage,
        matchedLogLines: metrics.matchedLogLines,
      })
    }

    const provider = runs.map((run) => run.provider).find(Boolean) || process.env.ACTIVE_PROVIDER || null
    const payload = {
      mode: process.env.CV_CONTEXT_SOURCE || 'cag',
      provider,
      question: config.question,
      timestamp: new Date().toISOString(),
      runs,
      summary: summarize(runs),
      notes: [
        'Cache metrics are parsed from server stdout and are best-effort.',
        'If cachedTokens stays null, compare latency trends and inspect provider dashboard/logs.',
      ],
    }

    await writeFile(config.outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    console.log(`\n[measure-cache] Results written to ${config.outputFile}`)
    console.log('[measure-cache] Summary:', payload.summary)
  } finally {
    shutdown()
  }
}

main().catch((error) => {
  console.error('[measure-cache] Fatal error:', error)
  process.exit(1)
})
