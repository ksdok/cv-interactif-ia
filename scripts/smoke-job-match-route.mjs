#!/usr/bin/env node
/**
 * smoke-job-match-route.mjs — test de fumée **route-level** de `/api/job-match`
 * (MODEL-004, décision 4 — complète `smoke-job-match.mjs`, provider-direct).
 *
 * Différence avec `smoke-job-match.mjs` : ce script n'appelle pas le provider
 * lui-même. Il démarre le serveur de dev et fait un POST réel sur
 * `/api/job-match` (pipeline complet : rate limit → CSRF → validation → RAG →
 * provider), en FR et EN, puis valide la forme de la réponse HTTP et du JSON.
 * C'est la vérification que le modèle livré répond bien **à travers la route**,
 * et non seulement via un prompt miré.
 *
 * Pourquoi un script et pas un test Vitest : la CI tourne sans aucun secret
 * (`CONTEXT.md` §9) et cette fumée consomme de vrais appels provider + Supabase.
 *
 * Usage :
 *   node scripts/smoke-job-match-route.mjs
 *   node scripts/smoke-job-match-route.mjs --base http://localhost:3000 --lang fr
 *   node scripts/smoke-job-match-route.mjs --out scripts/results/smoke-job-match-route.json
 *
 * Le serveur doit être joignable sur `--base` (le script ne le démarre pas lui-même :
 * l'orchestrateur a déjà un serveur de dev, et en lancer un second échouerait sur
 * le port). Sortie : JSON gitignoré dans `scripts/results/` + code de sortie 1 si
 * une langue échoue.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = resolve(__dirname, 'results')
const CSRF_COOKIE = 'csrf-token'

// Doit passer `validateJobDescriptionContent` de la route (pas de balise, pas de
// motif SQL, pas de séquence de commandes) et faire >= 100 caractères.
const JOB_DESCRIPTION = `Business Analyst / Product Owner — Market Finance (Securities Lending & Repo). We are looking for a business analyst with at least eight years of experience in the financial markets industry, ideally in securities lending, repo or collateral management. The role covers functional analysis, writing specifications, coordinating developers and business stakeholders, and driving the delivery of a new front-to-back platform. Experience with Broadridge products (SFCM), SQL and agile delivery is required. Fluent English and French.`

const EXPECTED_KEYS = [
  'overallMatch',
  'skillsMatch',
  'experienceMatch',
  'analysis',
  'strengths',
  'improvements',
]

function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    base: process.env.SMOKE_BASE_URL || 'http://localhost:3000',
    langs: ['fr', 'en'],
    out: resolve(RESULTS_DIR, 'smoke-job-match-route.json'),
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--base') config.base = args[++i].replace(/\/$/, '')
    else if (arg === '--lang') {
      const value = args[++i]
      config.langs = value === 'both' ? ['fr', 'en'] : [value]
    } else if (arg === '--out') config.out = resolve(args[++i])
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/smoke-job-match-route.mjs [--base http://localhost:3000] [--lang fr|en|both] [--out scripts/results/smoke-job-match-route.json]

Fait un POST réel sur /api/job-match (CSRF + rate limit + RAG + provider) en fr et en
et vérifie la forme de la réponse. Le serveur de dev doit déjà tourner.`)
      process.exit(0)
    }
  }
  return config
}

// Le token CSRF est dans une meta du HTML (patron double-submit : le cookie
// httpOnly est la moitié serveur, la meta est la moitié client). On lit la meta
// du HTML rendu : c'est exactement ce que fait `JobMatcher.tsx`.
async function fetchCsrfToken(base) {
  const response = await fetch(`${base}/fr`, { redirect: 'follow' })
  if (!response.ok) throw new Error(`GET /fr → HTTP ${response.status}`)
  const html = await response.text()
  const meta = html.match(/<meta\s+name="csrf-token"\s+content="([^"]*)"/)
  const setCookie = response.headers.getSetCookie?.() ?? []
  const cookieHeader = setCookie
    .map((line) => line.split(';')[0])
    .filter((pair) => pair.startsWith(`${CSRF_COOKIE}=`))
    .join('; ')
  const token = meta?.[1] || cookieHeader.split('=')[1] || ''
  if (!token) throw new Error('token CSRF introuvable (ni meta[name=csrf-token] ni Set-Cookie)')
  return { token, cookieHeader }
}

// Mêmes contrôles structurels que la route (clés anglaises, types, bornes).
function validateAnalysis(parsed, language) {
  const problems = []
  if (!parsed || typeof parsed !== 'object') return ['corps non objet']

  const keys = Object.keys(parsed)
  const missing = EXPECTED_KEYS.filter((key) => !keys.includes(key))
  if (missing.length) problems.push(`clés manquantes : ${missing.join(', ')}`)
  const unexpected = keys.filter((key) => !EXPECTED_KEYS.includes(key))
  if (unexpected.length) problems.push(`clés inattendues : ${unexpected.join(', ')}`)

  for (const key of ['overallMatch', 'skillsMatch', 'experienceMatch']) {
    const value = parsed[key]
    if (typeof value !== 'number' || Number.isNaN(value)) problems.push(`${key} non numérique`)
    else if (value < 0 || value > 100) problems.push(`${key} hors bornes (${value})`)
  }
  if (typeof parsed.analysis !== 'string' || !parsed.analysis.trim()) {
    problems.push('analysis vide ou non textuelle')
  }
  for (const key of ['strengths', 'improvements']) {
    if (!Array.isArray(parsed[key]) || parsed[key].length === 0) problems.push(`${key} non renseigné`)
  }

  const readable = [parsed.analysis, ...(parsed.strengths ?? []), ...(parsed.improvements ?? [])]
    .filter((value) => typeof value === 'string')
    .join(' ')
  const looksEnglish = /\b(the|and|with|for|is|are|of|to)\b/i.test(readable)
  const looksFrench = /\b(le|la|les|des|est|avec|pour|une|et)\b/i.test(readable)
  if (language === 'fr' && looksEnglish && !looksFrench) problems.push('valeurs lisibles probablement en anglais')
  if (language === 'en' && looksFrench && !looksEnglish) problems.push('valeurs lisibles probablement en français')

  return problems
}

async function main() {
  const config = parseArgs()
  const { token, cookieHeader } = await fetchCsrfToken(config.base)
  console.log(`[smoke-route] base=${config.base} · token CSRF ${token.slice(0, 8)}… · langues=${config.langs.join(', ')}`)

  const reports = []
  let failed = 0

  for (const lang of config.langs) {
    const started = Date.now()
    let status = 0
    let body = null
    let error = null
    try {
      const response = await fetch(`${config.base}/api/job-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ jobDescription: JOB_DESCRIPTION, language: lang }),
      })
      status = response.status
      const text = await response.text()
      try {
        body = JSON.parse(text)
      } catch {
        body = { raw: text.slice(0, 500) }
      }
      body = { status, payload: body }
    } catch (err) {
      error = err?.message || String(err)
    }

    const problems = error
      ? [`requête en échec : ${error}`]
      : body.status !== 200
        ? [`HTTP ${body.status}`, body.payload?.errorCode ? `errorCode=${body.payload.errorCode}` : null].filter(Boolean)
        : validateAnalysis(body.payload, lang)
    if (problems.length) failed += 1

    reports.push({
      lang,
      httpStatus: body?.status ?? null,
      totalMs: Date.now() - started,
      problems,
      ok: problems.length === 0,
      parsed: body?.payload ?? null,
    })

    const label = problems.length ? `ÉCHEC — ${problems.join(' | ')}` : 'OK'
    const score = body?.payload?.overallMatch
    console.log(`  [${lang}] ${label} · HTTP ${body?.status ?? '—'} · ${Date.now() - started}ms${score !== undefined ? ` · overall ${score}%` : ''}`)
  }

  mkdirSync(RESULTS_DIR, { recursive: true })
  writeFileSync(
    config.out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        base: config.base,
        note:
          "POST réel sur /api/job-match (pipeline route complet : rate limit → CSRF → validation → RAG → provider). " +
          'Complète scripts/smoke-job-match.mjs, qui est provider-direct (prompt miré).',
        jobDescription: JOB_DESCRIPTION,
        reports,
      },
      null,
      2
    )
  )

  console.log(`\n[smoke-route] ${reports.length - failed}/${reports.length} langues conformes`)
  console.log(`[smoke-route] Rapport : ${config.out}`)
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error('[smoke-route] Erreur fatale:', error)
  process.exit(1)
})
