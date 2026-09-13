#!/usr/bin/env node
/**
 * scripts/check-locale.mjs — test de résidu de locale (GEO-08b, review F6).
 *
 * La parité structurelle des dictionnaires (review N4) ne vérifie que les CLÉS ;
 * cette vérification porte sur la SÉMANTIQUE : chaque page ne doit servir que
 * les sentinelles de sa locale, zéro marqueur de l'autre.
 *
 * Usage : lancer un serveur au préalable (npm run build && npm run start),
 * puis `node scripts/check-locale.mjs [baseURL]` (défaut http://localhost:3000).
 * Exit 1 au premier écart — destiné à un usage manuel/pré-déploiement.
 */

const BASE = process.argv[2] || 'http://localhost:3000'

// Sentinelles : présentes UNIQUEMENT dans la locale indiquée (page homepage).
const SENTINELS = {
  fr: {
    mustHave: [
      'Vitrine de portfolio', // hero.label
      'Rôle à la une', // experience.featuredLabel
      'Que souhaitez-vous savoir', // chat.greeting2
    ],
    mustNotHave: [
      'Portfolio Showcase', // hero.label EN
      'Featured Role', // experience.featuredLabel EN
      'What would you like to know first?', // chat.greeting2 EN
    ],
  },
  en: {
    mustHave: [
      'Portfolio Showcase',
      'Featured Role',
      'What would you like to know first?',
    ],
    mustNotHave: [
      'Vitrine de portfolio',
      'Rôle à la une',
      'Que souhaitez-vous savoir',
    ],
  },
}

let failures = 0

for (const [locale, spec] of Object.entries(SENTINELS)) {
  const html = await fetch(`${BASE}/${locale}`).then((r) => {
    if (!r.ok) throw new Error(`${BASE}/${locale} → HTTP ${r.status}`)
    return r.text()
  })

  for (const s of spec.mustHave) {
    if (!html.includes(s)) {
      failures++
      console.error(`✗ /${locale} : sentinelle attendue absente : "${s}"`)
    }
  }
  for (const s of spec.mustNotHave) {
    if (html.includes(s)) {
      failures++
      console.error(`✗ /${locale} : résidu de l'autre locale : "${s}"`)
    }
  }
  console.log(`✓ /${locale} : ${spec.mustHave.length} sentinelles OK, 0 résidu`)
}

if (failures > 0) {
  console.error(`\n${failures} échec(s) — résidu(s) de locale détecté(s).`)
  process.exit(1)
}
console.log('\nOK — aucun résidu de locale sur /fr et /en.')