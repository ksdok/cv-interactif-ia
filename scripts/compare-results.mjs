#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = resolve(__dirname, 'results')

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    cagFile: resolve(RESULTS_DIR, 'cag-validation-results.json'),
    ragFile: resolve(RESULTS_DIR, 'rag-validation-results.json'),
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--cag') config.cagFile = resolve(args[++i])
    else if (arg === '--rag') config.ragFile = resolve(args[++i])
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/compare-results.mjs [--cag scripts/results/cag-validation-results.json] [--rag scripts/results/rag-validation-results.json]')
      process.exit(0)
    }
  }

  return config
}

async function readJSON(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function byQuestion(results) {
  return new Map(results.map((result) => [result.question, result]))
}

function formatLatency(ms) {
  if (typeof ms !== 'number') return '—'
  return `${(ms / 1000).toFixed(1)}s`
}

function qualityMarker(result) {
  if (!result) return '—'
  if (result.quality && result.quality !== 'pending-manual-review') return result.quality
  if (result.offTopic) return result.offTopicCorrectlyDeclined ? '✓ guardrail' : '? guardrail'
  return '? manual'
}

function escapeCell(value) {
  return String(value ?? '—').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
}

async function main() {
  const config = parseArgs()
  const [cag, rag] = await Promise.all([readJSON(config.cagFile), readJSON(config.ragFile)])
  const ragByQuestion = byQuestion(rag.results)
  const questions = cag.results.map((result) => result.question)

  const rows = [
    ['Question', 'CAG lat.', 'RAG lat.', 'CAG quality', 'RAG quality'],
    ['---', '---:', '---:', '---', '---'],
  ]

  for (const question of questions) {
    const cagResult = cag.results.find((result) => result.question === question)
    const ragResult = ragByQuestion.get(question)
    rows.push([
      question,
      formatLatency(cagResult?.latencyMs),
      formatLatency(ragResult?.latencyMs),
      qualityMarker(cagResult),
      qualityMarker(ragResult),
    ])
  }

  const table = rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`).join('\n')

  console.log('# CAG vs RAG validation comparison')
  console.log('')
  console.log(`- CAG file: ${config.cagFile}`)
  console.log(`- RAG file: ${config.ragFile}`)
  console.log(`- CAG avg latency: ${formatLatency(cag.summary?.avgLatencyMs)}`)
  console.log(`- RAG avg latency: ${formatLatency(rag.summary?.avgLatencyMs)}`)
  console.log('')
  console.log(table)
  console.log('')
  console.log('Quality markers are intentionally manual placeholders; review responses before making a product decision.')
}

main().catch((error) => {
  console.error('[compare-results] Fatal error:', error.message)
  process.exit(1)
})
