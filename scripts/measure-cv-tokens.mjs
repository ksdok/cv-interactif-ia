#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SYSTEM_PROMPT_WITHOUT_CONTEXT } from '../lib/systemPrompt.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const CV_PATH = resolve(PROJECT_ROOT, 'data', 'cv.md')
const RESULTS_DIR = resolve(__dirname, 'results')
const OUTPUT_FILE = resolve(RESULTS_DIR, 'cv-token-report.json')

const OPENAI_CACHE_THRESHOLD_TOKENS = 1024
const GEMINI_CACHE_THRESHOLD_TOKENS = 2048
const CAG_REVIEW_THRESHOLD_TOKENS = 10_000
const RAG_SWITCH_THRESHOLD_TOKENS = 50_000

function estimateTokens(text) {
  // Rough English/Markdown approximation. Good enough for cache-threshold checks.
  return Math.ceil(text.length / 4)
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function parseArgs() {
  const args = process.argv.slice(2)
  const config = { outputFile: OUTPUT_FILE, cvPath: CV_PATH }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--output') config.outputFile = resolve(args[++i])
    else if (arg === '--cv') config.cvPath = resolve(args[++i])
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/measure-cv-tokens.mjs [--cv data/cv.md] [--output scripts/results/cv-token-report.json]')
      process.exit(0)
    }
  }
  return config
}

function decision(cvTokens) {
  if (cvTokens > RAG_SWITCH_THRESHOLD_TOKENS) {
    return 'switch-to-rag'
  }
  if (cvTokens > CAG_REVIEW_THRESHOLD_TOKENS) {
    return 'evaluate-cag-cost-latency-or-consider-rag'
  }
  return 'stay-on-cag'
}

async function main() {
  const config = parseArgs()
  const cvContent = await readFile(config.cvPath, 'utf8')
  const stablePrefix = `${SYSTEM_PROMPT_WITHOUT_CONTEXT}\n\nCANDIDATE CV:\n${cvContent.trim()}\n`

  const report = {
    timestamp: new Date().toISOString(),
    cvPath: config.cvPath,
    cv: {
      chars: cvContent.length,
      words: countWords(cvContent),
      lines: cvContent.split(/\r?\n/).length,
      estimatedTokens: estimateTokens(cvContent),
    },
    stablePrefix: {
      chars: stablePrefix.length,
      estimatedTokens: estimateTokens(stablePrefix),
    },
    thresholds: {
      openAIPromptCacheTokens: OPENAI_CACHE_THRESHOLD_TOKENS,
      geminiPromptCacheTokens: GEMINI_CACHE_THRESHOLD_TOKENS,
      reviewCagAtTokens: CAG_REVIEW_THRESHOLD_TOKENS,
      switchToRagAtTokens: RAG_SWITCH_THRESHOLD_TOKENS,
    },
    cacheEligibility: {
      openAI: estimateTokens(stablePrefix) >= OPENAI_CACHE_THRESHOLD_TOKENS,
      gemini: estimateTokens(stablePrefix) >= GEMINI_CACHE_THRESHOLD_TOKENS,
    },
    decision: decision(estimateTokens(cvContent)),
    tokenEstimator: 'chars/4 approximation',
  }

  await mkdir(dirname(config.outputFile), { recursive: true })
  await writeFile(config.outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log('CV token report')
  console.log('---------------')
  console.log(`CV chars: ${report.cv.chars}`)
  console.log(`CV words: ${report.cv.words}`)
  console.log(`CV lines: ${report.cv.lines}`)
  console.log(`CV estimated tokens: ${report.cv.estimatedTokens}`)
  console.log(`Stable prefix estimated tokens: ${report.stablePrefix.estimatedTokens}`)
  console.log(`OpenAI cache eligible: ${report.cacheEligibility.openAI ? 'yes' : 'no'}`)
  console.log(`Gemini cache eligible: ${report.cacheEligibility.gemini ? 'yes' : 'no'}`)
  console.log(`Decision: ${report.decision}`)
  console.log(`Report written to ${config.outputFile}`)
}

main().catch((error) => {
  console.error('[measure-cv-tokens] Fatal error:', error)
  process.exit(1)
})
