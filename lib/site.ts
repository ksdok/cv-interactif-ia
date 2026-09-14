/**
 * lib/site.ts
 * URL du site + fallback FR des metadata pour les routes hors segment [lang]
 * (not-found racine). GEO-08h : /cv a été migré sous app/[lang]/cv — il n'est
 * plus servi par le root layout.
 *
 * GEO-08d : le wording normatif (title/description/keywords/JSON-LD) vit dans
 * les dictionnaires lib/i18n/{fr,en}.ts ; ce fichier dérive du FR (fast-path
 * SEO-01) pour garantir une source unique — pas de duplication de wording.
 */

import fr from './i18n/fr'

export const SITE_URL = 'https://kimsandok.com'

// Fallback FR (fast-path SEO-01), dérivé du dictionnaire (GEO-08d).
export const SITE_TITLE = fr.metadata.title

export const SITE_DESCRIPTION = fr.metadata.description

// og:siteName (root layout, wording SEO-01)
export const SITE_NAME = fr.metadata.siteName

// Meta keywords du root layout (review M4 Lot 1 : dérivées, pas recopiées —
// certains moteurs IA lisent la meta keywords ; Google l'ignore, coût quasi nul)
export const SITE_KEYWORDS = fr.metadata.keywords