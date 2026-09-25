#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeChatResponse } from './chat-response.mjs'
import { analyzeOffTopicAnswer } from '../lib/guardrail.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = resolve(__dirname, 'results')
const BASE_URL = process.env.CAG_BASE_URL || 'http://localhost:3000'
const MODE = process.env.CV_CONTEXT_SOURCE || 'cag'
const LANG = process.env.CAG_LANG || 'fr'
const VALID_LANGS = ['fr', 'en']
// `fr` conserve le nom de fichier historique (comparabilité du baseline +
// compare-results.mjs) ; les autres langues sont suffixées pour cohabiter.
const OUTPUT_FILE = resolve(
  RESULTS_DIR,
  `${MODE}-validation-results${LANG === 'fr' ? '' : `-${LANG}`}.json`,
)
const REQUEST_TIMEOUT_MS = Number(process.env.CAG_REQUEST_TIMEOUT_MS || 30_000)

// GEO-08g — échantillon de questions. Le jeu FR est le jeu historique (wording
// EN, conservé tel quel pour rester comparable au baseline CAG/RAG) ; le jeu EN
// est le test de fidélité du critère 2 : il vise les chiffres et les entités
// métier que la traduction à la volée depuis un CV FR risque de déformer.
//
// `fidelityTokens` est un PRÉ-FILTRE mécanique : un token absent est un signal
// d'alerte exploitable, un token présent ne prouve rien (la phrase peut être
// fausse autour) — la revue de fidélité reste manuelle.
//
// Un token peut être une chaîne ou un **tableau d'alternatives** acceptées
// (ex. `['10 ans', '10 years']`) : nécessaire pour les chiffres, dont la forme
// dépend de la langue de réponse. Nit 3 (review post-livraison) : les chiffres
// sont ancrés (`'14 million'`, `'500 000'`) et non nus (`'14'` matchait « 2014 »).
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

const TEST_QUESTIONS_BY_LANG = {
  fr: TEST_QUESTIONS,
  en: TEST_QUESTIONS_EN,
}

function parseArgs() {
  const args = process.argv.slice(2)
  const config = { outputFile: OUTPUT_FILE, baseUrl: BASE_URL, mode: MODE, lang: LANG }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--base-url') config.baseUrl = args[++i]
    else if (arg === '--mode') config.mode = args[++i]
    else if (arg === '--lang') config.lang = args[++i]
    else if (arg === '--output') config.outputFile = resolve(args[++i])
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/validate-cag.mjs [--base-url http://localhost:3000] [--mode cag|rag] [--lang fr|en] [--output path]

Requires a running local server (npm run dev) and valid provider/Supabase environment variables.
--lang en runs the EN fidelity sample (GEO-08g) and writes ${MODE}-validation-results-en.json.`)
      process.exit(0)
    }
  }

  if (!VALID_LANGS.includes(config.lang)) {
    console.error(`[validate-cag] Invalid --lang '${config.lang}'. Expected one of: ${VALID_LANGS.join(', ')}`)
    process.exit(1)
  }

  // Les noms de fichiers par défaut suivent la langue effectivement retenue.
  if (config.outputFile === OUTPUT_FILE) {
    config.outputFile = resolve(
      RESULTS_DIR,
      `${config.mode}-validation-results${config.lang === 'fr' ? '' : `-${config.lang}`}` + '.json',
    )
  }

  config.questions = TEST_QUESTIONS_BY_LANG[config.lang]
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

// Pré-filtre hors-sujet (MODEL-004 §5) : délégué au détecteur partagé
// `lib/guardrail.mjs`, qui remplace l'heuristique bespoke de GEO-08g — celle-ci
// annonçait 0/2 en EN pour des refus corrects, faute de connaître la formulation
// exacte du modèle (« professional experience or skills » ne matchait aucun de
// ses signaux de périmètre). Un refus correct ⇒ `suspect = false`. La qualité
// reste relue manuellement (`manualQualityReviewRequired`) : le détecteur n'est
// qu'un signal, jamais la preuve.
function isLikelyPoliteDecline(response, lang) {
  return !analyzeOffTopicAnswer(response, lang).suspect
}

// Pré-filtre de fidélité (GEO-08g, critère 2) : les tokens attendus sont des
// entités/chiffres qui doivent survivre à la traduction. Comparaison
// normalisée (casse + accents) car une réponse EN peut garder « Société
// Générale » ou l'écrire sans accent. Un token peut être un tableau
// d'alternatives (nit 3) ; `labelOf` le rend lisible dans le rapport.
function normalizeToken(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function labelOf(token) {
  return Array.isArray(token) ? token.join(' | ') : token
}

function checkFidelityTokens(response, expectedTokens = []) {
  if (!expectedTokens.length) return null
  const haystack = normalizeToken(response)
  const alternatives = (token) => (Array.isArray(token) ? token : [token])
  const matches = (token) => alternatives(token).some((alt) => haystack.includes(normalizeToken(alt)))
  const matched = expectedTokens.filter(matches)
  const missing = expectedTokens.filter((token) => !matches(token))
  return {
    expected: expectedTokens.map(labelOf),
    matched: matched.map(labelOf),
    missing: missing.map(labelOf),
    preScreen: missing.length === 0 ? 'pass' : matched.length === 0 ? 'fail' : 'partial',
  }
}

// Détection de langue du pré-filtre (critère 1) : marqueurs exclusifs, volontairement
// grossier — un texte technique FR et EN partagent trop de vocabulaire pour un
// vrai classifieur, et le script n'a pas de dépendance externe.
//
// Nit 1 (review post-livraison) : `' a '` a été retiré des marqueurs EN — « a »
// est aussi le verbe avoir en français (« il a 10 ans d'expérience »), il
// gonflait le score EN des réponses FR. Nit 4 : les blancs (dont les retours à
// la ligne) sont normalisés avant scoring, sinon `' le '` ratait un marqueur en
// début de ligne.
const FR_MARKERS = [' le ', ' la ', ' les ', ' des ', ' est ', ' avec ', ' pour ', ' une ']
const EN_MARKERS = [' the ', ' and ', ' with ', ' is ', ' for ', ' of ']

function guessLanguage(response) {
  if (!response) return 'unknown'
  const text = ` ${response.toLowerCase().replace(/\s+/g, ' ')} `
  const frScore = FR_MARKERS.reduce((sum, marker) => sum + (text.split(marker).length - 1), 0)
  const enScore = EN_MARKERS.reduce((sum, marker) => sum + (text.split(marker).length - 1), 0)
  if (frScore === 0 && enScore === 0) return 'unknown'
  if (frScore === enScore) return 'ambiguous'
  return frScore > enScore ? 'fr' : 'en'
}

async function askQuestion(baseUrl, question, lang) {
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
      lang,
    }),
  })

  const latencyMs = Date.now() - startedAt
  const rawBody = await response.text()
  // PERF-002 : le succès est un flux NDJSON, plus un objet JSON unique.
  const decoded = decodeChatResponse(rawBody)
  const body = {
    response: decoded.response,
    error: decoded.error ?? (response.ok ? null : `HTTP ${response.status}`),
    errorCode: decoded.errorCode,
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
  const languageChecked = results.filter((result) => result.languageMatchesRequest !== null)
  const fidelityChecked = results.filter((result) => result.fidelity)

  return {
    totalQuestions: results.length,
    answered: results.filter((result) => result.hasAnswer).length,
    offTopicCorrectlyDeclined: offTopicResults.filter((result) => result.offTopicCorrectlyDeclined).length,
    // GEO-08g — critère 1 : la langue détectée correspond-elle à celle demandée ?
    // Les réponses hors-sujet (refus) sont exclues : elles mélangent souvent les
    // deux langues dans un refus court et faussent l'heuristique.
    answerLanguageMatches: `${languageChecked.filter((result) => result.languageMatchesRequest).length}/${languageChecked.length}`,
    // GEO-08g — critère 2 : pré-filtre mécanique sur les entités/chiffres.
    fidelityPreScreen: {
      checked: fidelityChecked.length,
      pass: fidelityChecked.filter((result) => result.fidelity.preScreen === 'pass').length,
      partial: fidelityChecked.filter((result) => result.fidelity.preScreen === 'partial').length,
      fail: fidelityChecked.filter((result) => result.fidelity.preScreen === 'fail').length,
      missingTokens: fidelityChecked.flatMap((result) => result.fidelity.missing),
    },
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
  console.log(`[validate-cag] Response language: ${config.lang} (${config.questions.length} questions)`)

  for (const test of config.questions) {
    process.stdout.write(`[validate-cag] ${test.question} ... `)
    try {
      const result = await askQuestion(config.baseUrl, test.question, config.lang)
      const detectedLanguage = guessLanguage(result.response)
      const enriched = {
        category: test.category,
        question: test.question,
        response: result.response,
        latencyMs: result.latencyMs,
        hasAnswer: result.hasAnswer,
        offTopic: Boolean(test.offTopic),
        offTopicCorrectlyDeclined: test.offTopic ? isLikelyPoliteDecline(result.response, config.lang) : null,
        // GEO-08g — critères 1 et 2 (pré-filtres)
        requestedLanguage: config.lang,
        detectedLanguage,
        languageMatchesRequest: test.offTopic || !result.hasAnswer ? null : detectedLanguage === config.lang,
        fidelity: checkFidelityTokens(result.response, test.fidelityTokens),
        status: result.status,
        error: result.error,
        rateLimitHeaders: result.rateLimitHeaders,
        quality: test.offTopic ? 'guardrail-check' : 'pending-manual-review',
      }
      results.push(enriched)
      const fidelityNote = enriched.fidelity
        ? ` fidelity=${enriched.fidelity.preScreen}${enriched.fidelity.missing.length ? ` missing=[${enriched.fidelity.missing.join(', ')}]` : ''}`
        : ''
      console.log(`${result.status} ${result.latencyMs}ms lang=${detectedLanguage}${fidelityNote}`)
    } catch (error) {
      results.push({
        category: test.category,
        question: test.question,
        response: '',
        latencyMs: null,
        hasAnswer: false,
        offTopic: Boolean(test.offTopic),
        offTopicCorrectlyDeclined: null,
        requestedLanguage: config.lang,
        detectedLanguage: 'unknown',
        languageMatchesRequest: null,
        fidelity: null,
        status: null,
        error: error instanceof Error ? error.message : String(error),
        quality: 'error',
      })
      console.log(`ERROR ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const payload = {
    mode: config.mode,
    lang: config.lang,
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
