#!/usr/bin/env node
/**
 * scripts/check-locale.mjs — test de résidu de locale (GEO-08b, review F6).
 *
 * La parité structurelle des dictionnaires (review N4) ne vérifie que les CLÉS ;
 * cette vérification porte sur la SÉMANTIQUE : chaque page ne doit servir que
 * les sentinelles de sa locale, zéro marqueur de l'autre.
 *
 * Deux niveaux de vérification :
 * 1. GUARDE STATIQUE (sans serveur) : chaque sentinelle doit exister dans le
 *    fichier dictionnaire de sa locale. Si un wording change sans mise à jour
 *    de ce script, il échoue avec un message explicite au lieu de produire des
 *    faux négatifs/positifs silencieux (régression constatée : sentinelles FR
 *    obsolètes depuis 33d8498, script rouge sur main avec sortie « ✓ OK »).
 * 2. CHECK RUNTIME : les pages servies ne doivent contenir que les sentinelles
 *    de leur locale.
 *
 * Usage : lancer un serveur au préalable (npm run build && npm run start),
 * puis `node scripts/check-locale.mjs [baseURL]` (défaut http://localhost:3000).
 * Exit 1 = écart runtime · Exit 2 = sentinelles désynchronisées des
 * dictionnaires. Destiné à un usage manuel/pré-déploiement (et à CICD-001).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || 'http://localhost:3000'

// Sentinelles : présentes UNIQUEMENT dans la locale indiquée (page homepage).
// Sous-chaînes volontairement courtes et stables (préfixes sans ponctuation
// fragile). Chaque entrée est re-vérifiée statiquement contre le dictionnaire.
const SENTINELS = {
  fr: {
    mustHave: [
      'Poste actuel', // experience.featuredLabel (fr.ts)
      'Que souhaitez-vous savoir', // chat.greeting2 (fr.ts)
      'design par kim-san', // header.tagline (fr.ts)
    ],
    mustNotHave: [
      'Portfolio Showcase', // hero.label EN (en.ts)
      'Featured Role', // experience.featuredLabel EN (en.ts)
      'What would you like to know', // chat.greeting2 EN (en.ts)
    ],
  },
  en: {
    mustHave: [
      'Portfolio Showcase',
      'Featured Role',
      'What would you like to know',
    ],
    mustNotHave: [
      'Poste actuel',
      'Que souhaitez-vous savoir',
      'design par kim-san',
    ],
  },
}

// ── 1. Garde statique : sentinelles synchronisées avec les dictionnaires ────
const dictFiles = {
  fr: readFileSync(join(ROOT, 'lib/i18n/fr.ts'), 'utf8'),
  en: readFileSync(join(ROOT, 'lib/i18n/en.ts'), 'utf8'),
}

let staticFailures = 0
for (const [locale, spec] of Object.entries(SENTINELS)) {
  for (const s of spec.mustHave) {
    if (!dictFiles[locale].includes(s)) {
      staticFailures++
      console.error(`✗ sentinelle obsolète : "${s}" absente de lib/i18n/${locale}.ts — le wording a changé, mettre à jour SENTINELS dans ce script.`)
    }
  }
  for (const s of spec.mustNotHave) {
    const other = locale === 'fr' ? 'en' : 'fr'
    if (!dictFiles[other].includes(s)) {
      staticFailures++
      console.error(`✗ sentinelle obsolète : "${s}" (doit exister dans lib/i18n/${other}.ts) — mettre à jour SENTINELS dans ce script.`)
    }
  }
}
if (staticFailures > 0) {
  console.error(`\n${staticFailures} sentinelle(s) désynchronisée(s) des dictionnaires — correction requise avant tout check runtime.`)
  process.exit(2)
}
console.log('✓ Sentinelles synchronisées avec les dictionnaires FR/EN.')

// ── 2. Check runtime : zéro résidu de locale sur les pages servies ──────────
let failures = 0
const localeStats = []

for (const [locale, spec] of Object.entries(SENTINELS)) {
  const html = await fetch(`${BASE}/${locale}`).then((r) => {
    if (!r.ok) throw new Error(`${BASE}/${locale} → HTTP ${r.status}`)
    return r.text()
  })

  let localeFailures = 0
  for (const s of spec.mustHave) {
    if (!html.includes(s)) {
      failures++; localeFailures++
      console.error(`✗ /${locale} : sentinelle attendue absente : "${s}"`)
    }
  }
  for (const s of spec.mustNotHave) {
    if (html.includes(s)) {
      failures++; localeFailures++
      console.error(`✗ /${locale} : résidu de l'autre locale : "${s}"`)
    }
  }
  localeStats.push({ locale, localeFailures, total: spec.mustHave.length })
  if (localeFailures === 0) {
    console.log(`✓ /${locale} : ${spec.mustHave.length} sentinelles OK, 0 résidu`)
  } else {
    console.error(`✗ /${locale} : ${localeFailures} échec(s) runtime — voir ci-dessus`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} échec(s) — résidu(s) de locale détecté(s).`)
  process.exit(1)
}
console.log('\nOK — aucun résidu de locale sur /fr et /en.')