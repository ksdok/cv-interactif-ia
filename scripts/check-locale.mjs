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
 *    fichier dictionnaire de sa locale (mustHave) — et, pour les mustNotHave,
 *    dans le dictionnaire de l'AUTRE locale. Si un wording change sans mise à
 *    jour de ce script, il échoue avec un message explicite au lieu de produire
 *    des faux négatifs/positifs silencieux.
 * 2. CHECK RUNTIME : les pages servies ne doivent contenir que les sentinelles
 *    de leur locale.
 *
 * PROJ-001 (N6) : les sentinelles sont étendues aux pages Projets — une
 * sentinelle FR et une EN par page hub (`/fr/projets`) et détail
 * (`/fr/projets/cv-interactif-ia`, projet `hasDetail`). Note : la page détail
 * contient VOLONTAIREMENT un court extrait dans l'autre langue (attribut
 * `lang`) — les sentinelles choisies évitent donc le texte du résumé traduit et
 * ciblent les libellés d'interface, qui restent mono-locale.
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

// Sentinelles par locale. `mustHave` = présent uniquement dans cette locale ;
// `mustNotHave` = doit être absent de cette locale (sentinelle de l'autre).
// Chaque entrée est re-vérifiée statiquement contre les dictionnaires.
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
    // PROJ-001 (N6) — pages supplémentaires à vérifier (hors home).
    pages: [
      {
        path: '/fr/projets',
        mustHave: ['Une sélection de projets en cours'], // projects.lead (fr.ts)
        mustNotHave: ['A selection of ongoing projects'], // projects.lead EN (en.ts)
      },
      {
        path: '/fr/projets/cv-interactif-ia',
        mustHave: ['Aussi disponible en anglais'], // projects.detail.otherLocaleExcerpt (fr.ts)
        mustNotHave: ['Also available in French'], // projects.detail.otherLocaleExcerpt EN (en.ts)
      },
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
    pages: [
      {
        path: '/en/projets',
        mustHave: ['A selection of ongoing projects'],
        mustNotHave: ['Une sélection de projets en cours'],
      },
      {
        path: '/en/projets/cv-interactif-ia',
        mustHave: ['Also available in French'],
        mustNotHave: ['Aussi disponible en anglais'],
      },
    ],
  },
}

// ── 1. Garde statique : sentinelles synchronisées avec les dictionnaires ────
const dictFiles = {
  fr: readFileSync(join(ROOT, 'lib/i18n/fr.ts'), 'utf8'),
  en: readFileSync(join(ROOT, 'lib/i18n/en.ts'), 'utf8'),
}

// Toutes les entrées de sentinelles, home incluse, aplaties pour la garde statique.
function allEntries(locale, spec) {
  const entries = [
    { path: `/${locale}`, mustHave: spec.mustHave, mustNotHave: spec.mustNotHave },
  ]
  for (const page of spec.pages || []) entries.push(page)
  return entries
}

let staticFailures = 0
for (const [locale, spec] of Object.entries(SENTINELS)) {
  const other = locale === 'fr' ? 'en' : 'fr'
  for (const entry of allEntries(locale, spec)) {
    for (const s of entry.mustHave) {
      if (!dictFiles[locale].includes(s)) {
        staticFailures++
        console.error(`✗ sentinelle obsolète : "${s}" absente de lib/i18n/${locale}.ts — le wording a changé, mettre à jour SENTINELS dans ce script.`)
      }
    }
    for (const s of entry.mustNotHave) {
      if (!dictFiles[other].includes(s)) {
        staticFailures++
        console.error(`✗ sentinelle obsolète : "${s}" (doit exister dans lib/i18n/${other}.ts) — mettre à jour SENTINELS dans ce script.`)
      }
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
  for (const entry of allEntries(locale, spec)) {
    const html = await fetch(`${BASE}${entry.path}`).then((r) => {
      if (!r.ok) throw new Error(`${BASE}${entry.path} → HTTP ${r.status}`)
      return r.text()
    })

    let pageFailures = 0
    for (const s of entry.mustHave) {
      if (!html.includes(s)) {
        failures++; pageFailures++
        console.error(`✗ ${entry.path} : sentinelle attendue absente : "${s}"`)
      }
    }
    for (const s of entry.mustNotHave) {
      if (html.includes(s)) {
        failures++; pageFailures++
        console.error(`✗ ${entry.path} : résidu de l'autre locale : "${s}"`)
      }
    }
    localeStats.push({ path: entry.path, pageFailures, total: entry.mustHave.length })
    if (pageFailures === 0) {
      console.log(`✓ ${entry.path} : ${entry.mustHave.length} sentinelles OK, 0 résidu`)
    } else {
      console.error(`✗ ${entry.path} : ${pageFailures} échec(s) runtime — voir ci-dessus`)
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} échec(s) — résidu(s) de locale détecté(s).`)
  process.exit(1)
}
console.log(`\nOK — aucun résidu de locale sur ${localeStats.length} page(s).`)
