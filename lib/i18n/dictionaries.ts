/**
 * lib/i18n/dictionaries.ts — chargement du dictionnaire par locale (GEO-08b).
 *
 * Utilisé côté serveur (app/[lang]/page.tsx) : le dictionnaire est passé en
 * props aux composants client — pas de next-intl, pas de contexte global
 * (pattern minimal du plan GEO-08, point 3).
 */

import type { Dictionary } from './types'
import type { Lang } from './config'
import fr from './fr'
import en from './en'

const dictionaries: Record<Lang, Dictionary> = { fr, en }

// Review F1 (GEO-08b) : pas de fallback silencieux — le Record<Lang, Dictionary>
// est total et l'appelant a validé la locale (layout) ; un fallback `?? fr`
// masquerait une valeur non normalisée en amont.
export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang]
}