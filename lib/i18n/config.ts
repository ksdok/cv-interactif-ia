/**
 * lib/i18n/config.ts
 * Source de vérité unique des locales supportées (revue M1 — GEO-08a).
 *
 * Module pur (aucune dépendance React/Next) : importable depuis les fichiers
 * de route (app/layout.tsx), le bundle edge (proxy.ts) et la lib.
 * GEO-08b y adjoindra les dictionnaires lib/i18n/{fr,en}.ts.
 */

export const LANGUAGES = ['fr', 'en'] as const
export type Lang = (typeof LANGUAGES)[number]

// Marché cible : fallback si ni préfixe d'URL ni indice de négociation.
export const DEFAULT_LOCALE: Lang = 'fr'

export function isLocale(value: unknown): value is Lang {
  return (
    typeof value === 'string' &&
    (LANGUAGES as readonly string[]).includes(value.toLowerCase())
  )
}

/** Locale d'un chemin préfixé (/en, /en/cv...) ; null si pas de préfixe valide. */
export function localeFromPathname(pathname: string): Lang | null {
  const segment = pathname.split('/')[1]
  return isLocale(segment) ? (segment.toLowerCase() as Lang) : null
}