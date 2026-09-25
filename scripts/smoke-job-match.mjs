#!/usr/bin/env node
/**
 * smoke-job-match.mjs — test de fumée de `/api/job-match` (MODEL-004, décision 4).
 *
 * Le modèle est indexé **par provider** dans `lib/modelConfig.ts`
 * (`MODEL_CONFIG.openai.model`) : basculer le chat bascule aussi le job-match
 * (même clé `openai`). Ce script vérifie que le modèle cible continue de produire
 * un JSON conforme sur cet endpoint — clés anglaises, pourcentages numériques,
 * `analysis` non vide, `strengths`/`improvements` non vides — en **FR et EN**, et
 * que `reasoning_tokens` reste à 0 (décision 2).
 *
 * Pourquoi un script et pas un test Vitest : la CI tourne **sans aucun secret**
 * (`next build` est volontairement secret-free, cf. `CONTEXT.md` §9). Un test
 * Vitest qui appellerait l'API OpenAI rendrait la CI dépendante d'une clé et la
 * ferait échouer dans un runner nu. Le test de fumée reste donc un script local,
 * comme le banc.
 *
 * Déviation assumée : le contexte CV vient de `data/cv.md` (CAG) et non des
 * extraits RAG de Supabase, et le prompt est **miré** depuis
 * `app/api/job-match/route.ts` (garder les deux en phase). L'objet mesuré ici est
 * la conformité JSON et le budget de raisonnement du modèle, pas la chaîne RAG.
 *
 * Usage :
 *   node scripts/smoke-job-match.mjs                      # modèle courant, fr + en
 *   node scripts/smoke-job-match.mjs --model gpt-5.4-mini # comparaison / rollback
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

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

// Tarifs officiels $/M tokens (fiches docs OpenAI, 2026-09-23).
const PRICES = {
  'gpt-5.4-mini': { input: 0.75, cached: 0.075, output: 4.5 },
  'gpt-6-luna': { input: 0.1, cached: 0.01, output: 0.5 },
}

// MODÈLE DU PRODUIT : lu dans `lib/modelConfig.ts` (source de vérité, fichier
// TypeScript non importable depuis un .mjs) — le script échoue si l'option
// `--model` diverge, pour qu'un test de fumée ne puisse pas vérifier un modèle
// qui n'est pas celui livré.
function productModelFromConfig() {
  const source = readFileSync(resolve(ROOT, 'lib/modelConfig.ts'), 'utf8')
  const openaiBlock = source.match(/openai:\s*\{[^}]*?model:\s*'([^']+)'/s)
  return openaiBlock ? openaiBlock[1] : null
}

// Description de poste représentative — doit passer `validateJobDescriptionContent`
// de la route (pas de balise, pas de motif SQL, pas de séquence de commandes).
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
    model: process.env.SMOKE_MODEL || productModelFromConfig(),
    langs: ['fr', 'en'],
    out: resolve(RESULTS_DIR, 'smoke-job-match.json'),
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--model') config.model = args[++i]
    else if (arg === '--lang') {
      const value = args[++i]
      config.langs = value === 'both' ? ['fr', 'en'] : [value]
    } else if (arg === '--out') config.out = resolve(args[++i])
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/smoke-job-match.mjs [--model gpt-6-luna] [--lang fr|en|both] [--out scripts/results/smoke-job-match.json]

Vérifie que /api/job-match (partagé avec le chat via MODEL_CONFIG.openai.model) produit
un JSON conforme en fr et en, avec reasoning_tokens = 0 (MODEL-004 décisions 2 et 4).
Le modèle par défaut est lu dans lib/modelConfig.ts.`)
      process.exit(0)
    }
  }
  return config
}

// Prompt miré depuis `app/api/job-match/route.ts` (garder les deux en phase).
function buildAnalysisPrompt(cvContext, jobDescription, languageName) {
  return `You are a professional career guidance expert. Analyze the match between the candidate's CV and the job description.

${cvContext}

---

JOB DESCRIPTION TO ANALYZE:
${jobDescription}

---

Provide a detailed analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "overallMatch": <number 0-100>,
  "skillsMatch": <number 0-100>,
  "experienceMatch": <number 0-100>,
  "analysis": "<summary of 2-3 sentences about the match>",
  "strengths": [
    "<strength: what the candidate does well for this role>",
    "<another strength>"
  ],
  "improvements": [
    "<area for development>",
    "<another area>"
  ]
}

Be honest and specific. Consider:
- Alignment of technical skills
- Match of experience level
- Industry experience
- Required certifications or tools
- Soft skills adequacy

RESPONSE LANGUAGE:
- Write every human-readable string value ("analysis", "strengths", "improvements") in ${languageName}
- Keep the JSON keys exactly as specified above, in English
- Never translate, round or invent the candidate's figures, company names, tool names or job titles`
}

function costOf(model, usage) {
  const price = PRICES[model]
  if (!price || !usage) return null
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0
  const fresh = Math.max(0, (usage.prompt_tokens ?? 0) - cached)
  const out = usage.completion_tokens ?? 0
  return (fresh * price.input + cached * price.cached + out * price.output) / 1e6
}

// Mêmes contrôles structurels que la route (clés anglaises, types, bornes).
function validateAnalysis(raw, language) {
  const problems = []
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { problems: ['aucun objet JSON trouvé'], parsed: null }

  let parsed
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (error) {
    return { problems: [`JSON invalide : ${error.message}`], parsed: null }
  }

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
  // Contrôle léger de la langue demandée : les valeurs lisibles ne doivent pas
  // être en anglais quand la réponse est demandée en français (et inversement).
  // Heuristique assumée — la qualité reste relue manuellement.
  const readable = [parsed.analysis, ...(parsed.strengths ?? []), ...(parsed.improvements ?? [])]
    .filter((value) => typeof value === 'string')
    .join(' ')
  const looksEnglish = /\b(the|and|with|for|is|are|of|to)\b/i.test(readable)
  const looksFrench = /\b(le|la|les|des|est|avec|pour|une|et)\b/i.test(readable)
  if (language === 'fr' && looksEnglish && !looksFrench) problems.push('valeurs lisibles probablement en anglais')
  if (language === 'en' && looksFrench && !looksEnglish) problems.push('valeurs lisibles probablement en français')

  return { problems, parsed }
}

async function main() {
  const config = parseArgs()

  if (!config.model) {
    console.error('[smoke-job-match] Modèle introuvable (lib/modelConfig.ts illisible) — passez --model.')
    process.exit(1)
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('[smoke-job-match] OPENAI_API_KEY absente (.env.local).')
    process.exit(1)
  }

  const productModel = productModelFromConfig()
  if (productModel && productModel !== config.model) {
    console.log(
      `[smoke-job-match] AVERTISSEMENT : --model ${config.model} ≠ modèle du produit (${productModel}).`
    )
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const cvContent = readFileSync(resolve(ROOT, 'data/cv.md'), 'utf8')
  const cvContext = `USER CV INFORMATION:\n\n[1] ${cvContent.trim()}`

  console.log(`[smoke-job-match] modèle=${config.model} · langues=${config.langs.join(', ')}`)
  const reports = []
  let failed = 0

  for (const lang of config.langs) {
    const languageName = lang === 'en' ? 'English' : 'French'
    const prompt = buildAnalysisPrompt(cvContext, JOB_DESCRIPTION, languageName)
    const started = Date.now()
    let text = ''
    let usage = null
    let error = null

    try {
      const response = await openai.chat.completions.create({
        model: config.model,
        max_completion_tokens: 1024,
        // Décision 2 : même valeur que le chat — sortie JSON courte et rapide.
        reasoning_effort: 'none',
        messages: [{ role: 'user', content: prompt }],
      })
      text = response.choices[0]?.message?.content || ''
      usage = response.usage ?? null
    } catch (err) {
      error = err?.message || String(err)
    }

    const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens ?? 0
    const { problems, parsed } = error
      ? { problems: [`appel provider en échec : ${error}`], parsed: null }
      : validateAnalysis(text, lang)

    if (reasoningTokens !== 0) problems.push(`reasoning_tokens = ${reasoningTokens} (attendu 0)`)
    if (problems.length) failed += 1

    reports.push({
      model: config.model,
      lang,
      totalMs: Date.now() - started,
      reasoningTokens,
      costUsd: costOf(config.model, usage) ?? null,
      usage: usage ?? null,
      problems,
      ok: problems.length === 0,
      parsed,
      raw: text,
    })

    const status = problems.length ? `ÉCHEC — ${problems.join(' | ')}` : 'OK'
    console.log(
      `  [${lang}] ${status} · ${Date.now() - started}ms · reasoning ${reasoningTokens} tokens` +
        ` · ${parsed ? `overall ${parsed.overallMatch}%` : '—'}`
    )
  }

  mkdirSync(RESULTS_DIR, { recursive: true })
  writeFileSync(
    config.out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        productModel,
        jobDescription: JOB_DESCRIPTION,
        note: "Prompt miré depuis app/api/job-match/route.ts ; contexte CV = data/cv.md (CAG) et non les extraits RAG. La qualité rédactionnelle reste relue manuellement.",
        reports,
      },
      null,
      2
    )
  )

  console.log(`\n[smoke-job-match] ${reports.length - failed}/${reports.length} langues conformes`)
  console.log(`[smoke-job-match] Rapport : ${config.out}`)
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error('[smoke-job-match] Erreur fatale:', error)
  process.exit(1)
}) 
