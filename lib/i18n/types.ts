/**
 * lib/i18n/types.ts — type Dictionary dérivé du dictionnaire source (review N4).
 *
 * `typeof fr` (SANS as const dans fr.ts) donne des valeurs élargies en `string` :
 * une clé manquante ou mal orthographiée dans en.ts = erreur de compilation,
 * mais les chaînes FR et EN peuvent différer. À consommer comme
 * `import type { Dictionary } from '@/lib/i18n/types'`.
 */

import fr from './fr'

export type Dictionary = typeof fr

// Codes d'erreur renvoyés par les routes API (review M4) — clés de
// Dictionary['apiErrors'].
export type ApiErrorCode = keyof Dictionary['apiErrors']