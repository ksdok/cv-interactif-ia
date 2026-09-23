#!/usr/bin/env node
/**
 * bench-models.mjs — banc A/B de modèles de chat sur le prompt CAG réel du projet.
 *
 * Objectif : comparer deux modèles OpenAI (ex. `gpt-5.4-mini` vs `gpt-6-luna`) sur
 * les critères qui comptent ici, pas sur des évals agentiques :
 *   - latence perçue : TTFT (temps jusqu'au premier token de réponse), latence totale
 *   - coût : tokens de prompt / cachés / sortie / raisonnement, tarifés par le script
 *   - fidélité : présence des `fidelityTokens` du questionnaire (pré-filtre mécanique)
 *   - garde-fou hors-sujet : drapeau heuristique + réponse conservée pour revue manuelle
 *
 * Ce script est **ad hoc** et read-only vis-à-vis du code de prod :
 *   - il réutilise `lib/systemPrompt.mjs` → le prompt est byte-identique à /api/chat
 *   - il n'importe ni `lib/modelProviders.ts` ni `lib/modelConfig.ts` : il ne change
 *     pas le provider actif, il appelle l'API OpenAI en direct
 *   - il écrit ses résultats dans `scripts/results/` (gitignoré)
 *
 * Usage :
 *   node scripts/bench-models.mjs --models gpt-5.4-mini,gpt-6-luna --effort none --lang both
 *   node scripts/bench-models.mjs --models gpt-6-luna:default --effort none
 *
 * Les jeux de questions sont **dupliqués** depuis `scripts/validate-cag.mjs` (qui ne
 * les exporte pas) : garder les deux en phase, ou extraire un module partagé si le
 * banc devient un outil permanent.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { buildChatSystemPrompt, buildCvContextBlock } from '../lib/systemPrompt.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const RESULTS_DIR = resolve(__dirname, 'results')

// ─── .env.local (pas de dépendance dotenv dans ce dépôt) ───────────────────
function loadEnvLocal() {
  const file = resolve(ROOT, '.env.local')
  if (!existsSync(file)) return
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

// ─── Questions (miroir de scripts/validate-cag.mjs) ────────────────────────
const TEST_QUESTIONS = [
  { category: 'experience', question: "What is the candidate's most recent role?", fidelityTokens: ['Société Générale'] },
  { category: 'experience', question: 'How many years of experience does the candidate have?', fidelityTokens: [['10 ans', '10 years']] },
  { category: 'experience', question: 'What did the candidate do at Société Générale?', fidelityTokens: ['Société Générale'] },
  { category: 'tools', question: 'What tools and technologies does the candidate know?', fidelityTokens: ['Broadridge', 'SQL'] },
  { category: 'tools', question: 'Does the candidate have experience with Figma?' },
  { category: 'industries', question: 'What industries has the candidate worked in?' },
  { category: 'achievements', question: "What are the candidate's key achievements?" },
  { category: 'off-topic', question: 'What is the weather like today?', offTopic: true },
  { category: 'off-topic', question: 'Tell me a joke.', offTopic: true },
]

const TEST_QUESTIONS_EN = [
  { category: 'fidelity-role', question: "What is the candidate's most recent role, and at which company?", fidelityTokens: ['Société Générale'] },
  { category: 'fidelity-figures', question: 'How many years of experience does the candidate have, and in which sector?', fidelityTokens: [['10 ans', '10 years']] },
  { category: 'fidelity-scope', question: 'What was the candidate responsible for on X-One Secloan?', fidelityTokens: ['Repo', 'Securities Lending', 'Triparty'] },
  { category: 'fidelity-entities', question: 'Does the candidate have hands-on experience with Securities Lending and Repo?', fidelityTokens: ['Securities Lending', 'Repo'] },
  { category: 'fidelity-editor', question: 'Which Broadridge products has the candidate worked with, and on what?', fidelityTokens: ['Broadridge', 'SFCM'] },
  { category: 'fidelity-tools', question: 'Which front-office and back-office platforms did the candidate replace, and what was the financial impact?', fidelityTokens: ['Kondor', ['500 000', '500,000']] },
  { category: 'fidelity-volume', question: 'What transaction volume did the platform the candidate worked on handle?', fidelityTokens: [['14 million', '14 millions', '14 M']] },
  { category: 'achievements', question: "What are the candidate's key achievements?" },
  { category: 'off-topic', question: 'What is the weather like today?', offTopic: true },
  { category: 'off-topic', question: 'Tell me a joke.', offTopic: true },
]

const QUESTIONS_BY_LANG = { fr: TEST_QUESTIONS, en: TEST_QUESTIONS_EN }

// ─── Tarifs officiels $/M tokens (fiches docs OpenAI, 2026-09-23) ──────────
const PRICES = {
  'gpt-5.4-mini': { input: 0.75, cached: 0.075, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, cached: 0.02, output: 1.25 },
  'gpt-5.6-luna': { input: 0.2, cached: 0.02, output: 1.2 },
  'gpt-5.6-terra': { input: 2, cached: 0.2, output: 12 },
  'gpt-6-sol': { input: 2, cached: 0.2, output: 10 },
  'gpt-6-luna': { input: 0.1, cached: 0.01, output: 0.5 },
  'gpt-6-astra': { input: 10, cached: 1, output: 50 },
}

// ─── Args ─────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    models: ['gpt-5.4-mini', 'gpt-6-luna'],
    effort: 'none',
    lang: 'both',
    maxTokens: 1024,
    out: resolve(RESULTS_DIR, 'bench-models-results.json'),
  }
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]
    if (a === '--models') config.models = args[++i].split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--effort') config.effort = args[++i]
    else if (a === '--lang') config.lang = args[++i]
    else if (a === '--max-tokens') config.maxTokens = Number(args[++i])
    else if (a === '--out') config.out = resolve(args[++i])
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/bench-models.mjs [--models a,b] [--effort none|low|medium|default] [--lang fr|en|both] [--max-tokens 1024] [--out path]

--effort default => le paramètre reasoning_effort n'est pas envoyé (défaut du provider).
Suffixe par modèle possible : --models gpt-6-luna:default,gpt-5.4-mini:none`)
      process.exit(0)
    }
  }
  config.langs = config.lang === 'both' ? ['fr', 'en'] : [config.lang]
  return config
}

// ─── Aides ────────────────────────────────────────────────────────────────
const norm = (s) => s.toLowerCase()

function missingFidelityTokens(answer, tokens = []) {
  const hay = norm(answer)
  const missing = []
  for (const token of tokens) {
    const alternatives = Array.isArray(token) ? token : [token]
    if (!alternatives.some((alt) => hay.includes(norm(alt)))) missing.push(alternatives[0])
  }
  return missing
}

// Heuristique volontairement grossière : un token de conformité détecté = à relire.
// La revue de fidélité/hors-sujet reste manuelle (convention du dépôt).
const OFF_TOPIC_MARKERS = [
  /sunny|rainy|rain\b|cloudy|degrees|°\s?C|weather forecast|températur|météo/i,
  /knock knock|why did the .{0,30}cross the road|blague\s*:|voici une blague|here'?s a joke/i,
]

function offTopicFlags(answer) {
  return OFF_TOPIC_MARKERS.map((re, i) => (re.test(answer) ? i : -1)).filter((i) => i >= 0)
}

function costOf(model, usage) {
  const p = PRICES[model]
  if (!p || !usage) return null
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0
  const fresh = Math.max(0, (usage.prompt_tokens ?? 0) - cached)
  const out = usage.completion_tokens ?? 0
  return (fresh * p.input + cached * p.cached + out * p.output) / 1e6
}

function percentile(values, p) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return Math.round(sorted[idx])
}

const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

// ─── Un appel, en streaming, pour mesurer le TTFT ─────────────────────────
async function runOne(openai, { model, effort, lang, question, systemPrompt, maxTokens }) {
  const started = Date.now()
  let ttftMs = null
  let text = ''
  let usage = null
  let error = null

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      max_completion_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      ...(effort && effort !== 'default' ? { reasoning_effort: effort } : {}),
    })

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) {
        if (ttftMs === null) ttftMs = Date.now() - started
        text += delta
      }
      if (chunk.usage) usage = chunk.usage
    }
  } catch (err) {
    error = err?.message || String(err)
  }

  return {
    model,
    effort,
    lang,
    question,
    ttftMs,
    totalMs: Date.now() - started,
    usage,
    chars: text.length,
    answer: text,
    error,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const config = parseArgs()

  if (!process.env.OPENAI_API_KEY) {
    console.error('[bench-models] OPENAI_API_KEY absente (.env.local) — abandon.')
    process.exit(1)
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const cvContent = readFileSync(resolve(ROOT, 'data/cv.md'), 'utf8')
  const cvBlock = buildCvContextBlock(cvContent)
  const prompts = Object.fromEntries(config.langs.map((l) => [l, buildChatSystemPrompt(cvBlock, l)]))
  console.log(
    `[bench-models] CV ${cvContent.length} chars | prompt système fr=${prompts.fr.length} en=${prompts.en.length} chars` +
      ` | effort=${config.effort} | modèles=${config.models.join(', ')}`
  )

  const runs = []

  for (const spec of config.models) {
    const [model, specEffort] = spec.split(':')
    const effort = specEffort ?? config.effort

    // Appel de chauffe : remplit le cache de prompt, non mesuré.
    process.stdout.write(`[bench-models] chauffe ${model} (${effort})… `)
    const warm = await runOne(openai, {
      model,
      effort,
      lang: 'fr',
      question: "What is the candidate's most recent role?",
      systemPrompt: prompts.fr,
      maxTokens: config.maxTokens,
    })
    console.log(warm.error ? `ERREUR: ${warm.error}` : 'ok')

    let n = 0
    const total = config.langs.reduce((acc, l) => acc + QUESTIONS_BY_LANG[l].length, 0)
    for (const lang of config.langs) {
      for (const q of QUESTIONS_BY_LANG[lang]) {
        n += 1
        const result = await runOne(openai, {
          model,
          effort,
          lang,
          question: q.question,
          systemPrompt: prompts[lang],
          maxTokens: config.maxTokens,
        })
        const record = {
          ...result,
          category: q.category,
          offTopic: !!q.offTopic,
          missingTokens: q.fidelityTokens ? missingFidelityTokens(result.answer, q.fidelityTokens) : [],
          offTopicFlags: q.offTopic ? offTopicFlags(result.answer) : [],
          costUsd: costOf(model, result.usage),
        }
        runs.push(record)
        const status = result.error
          ? `ERREUR ${String(result.error).slice(0, 60)}`
          : `ttft ${String(result.ttftMs).padStart(5)}ms total ${String(result.totalMs).padStart(5)}ms` +
            ` out ${String(result.usage?.completion_tokens ?? '?').padStart(4)}` +
            ` cachés ${String(result.usage?.prompt_tokens_details?.cached_tokens ?? 0).padStart(5)}`
        console.log(`  [${n}/${total}] ${lang} ${q.category.padEnd(18)} ${status}`)
      }
    }
  }

  // ─── Synthèse ───────────────────────────────────────────────────────────
  const summary = []
  for (const spec of config.models) {
    const [model, specEffort] = spec.split(':')
    const effort = specEffort ?? config.effort
    const mine = runs.filter((r) => r.model === model && r.effort === effort)
    const ok = mine.filter((r) => !r.error)
    const ttfts = ok.map((r) => r.ttftMs).filter((v) => typeof v === 'number')
    const totals = ok.map((r) => r.totalMs)
    const costs = ok.map((r) => r.costUsd).filter((v) => typeof v === 'number')
    const cached = ok.map((r) => r.usage?.prompt_tokens_details?.cached_tokens ?? 0)
    const reasoning = ok.map((r) => r.usage?.completion_tokens_details?.reasoning_tokens ?? 0)
    const fidelityRuns = ok.filter((r) => r.missingTokens.length > 0)
    const offTopicRuns = ok.filter((r) => r.offTopic)
    const offTopicSuspect = offTopicRuns.filter((r) => r.offTopicFlags.length > 0)
    summary.push({
      model,
      effort,
      calls: mine.length,
      errors: mine.length - ok.length,
      emptyAnswers: ok.filter((r) => r.chars === 0).length,
      ttftAvgMs: avg(ttfts) === null ? null : Math.round(avg(ttfts)),
      ttftP50Ms: percentile(ttfts, 50),
      totalAvgMs: avg(totals) === null ? null : Math.round(avg(totals)),
      cacheHitRate: ok.length ? `${cached.filter((c) => c > 0).length}/${ok.length}` : '0/0',
      avgCachedTokens: avg(cached) === null ? null : Math.round(avg(cached)),
      avgOutputTokens: avg(ok.map((r) => r.usage?.completion_tokens ?? 0)) === null ? null : Math.round(avg(ok.map((r) => r.usage?.completion_tokens ?? 0))),
      avgReasoningTokens: avg(reasoning) === null ? null : Math.round(avg(reasoning)),
      costPerCallUsd: avg(costs),
      fidelityMisses: fidelityRuns.length ? fidelityRuns.map((r) => `${r.lang}/${r.category}: ${r.missingTokens.join(',')}`) : [],
      offTopicSuspect: `${offTopicSuspect.length}/${offTopicRuns.length}`,
    })
  }

  mkdirSync(RESULTS_DIR, { recursive: true })
  writeFileSync(
    config.out,
    JSON.stringify({ generatedAt: new Date().toISOString(), config: { ...config, out: undefined }, summary, runs }, null, 2)
  )

  console.log('\n=== SYNTHÈSE ===')
  for (const s of summary) {
    console.log(`\n${s.model} (effort: ${s.effort})`)
    console.log(
      `  TTFT moy ${s.ttftAvgMs}ms / p50 ${s.ttftP50Ms}ms · latence totale moy ${s.totalAvgMs}ms` +
        ` · coût/appel $${s.costPerCallUsd === null ? '?' : s.costPerCallUsd.toFixed(6)}`
    )
    console.log(
      `  cache ${s.cacheHitRate} hits (~${s.avgCachedTokens} tokens cachés) · sortie moy ${s.avgOutputTokens} tokens` +
        ` · raisonnement moy ${s.avgReasoningTokens} tokens`
    )
    console.log(`  réponses vides: ${s.emptyAnswers} · erreurs: ${s.errors} · hors-sujet suspects: ${s.offTopicSuspect}`)
    console.log(`  fidélité — tokens manquants: ${s.fidelityMisses.length ? s.fidelityMisses.join(' | ') : 'aucun'}`)
  }

  console.log('\n=== RÉPONSES HORS-SUJET (revue manuelle) ===')
  for (const r of runs.filter((x) => x.offTopic && !x.error)) {
    console.log(`\n[${r.model}] ${r.lang} « ${r.question} »`)
    console.log('  ' + r.answer.replace(/\s+/g, ' ').slice(0, 220))
  }

  console.log(`\n[bench-models] Résultats complets: ${config.out}`)
}

main().catch((err) => {
  console.error('[bench-models] Erreur fatale:', err)
  process.exit(1)
})
