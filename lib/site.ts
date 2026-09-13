/**
 * lib/site.ts
 * Constantes du site partagées root layout / [lang] / sitemap (GEO-08d).
 * Source unique du wording SEO-01 (FR fast-path) — la déclinaison EN des
 * metadata (title/description/JSON-LD) est GEO-08d (review F2 GEO-08b :
 * 08b n'a pas décliné le <head>, seulement le corps visible).
 */

export const SITE_URL = 'https://kimsandok.com'

export const SITE_TITLE =
  'Kim-san DOK — Business Analyst Senior Freelance (AMOA) | Finance de marché'

export const SITE_DESCRIPTION =
  "Kim-san DOK, Business Analyst Senior freelance en finance de marché (Paris, La Défense). " +
  "10 ans d'expérience en transformation SI, Securities Lending, Repo, Forex. " +
  "CV interactif avec assistant IA."

// og:siteName (root layout, wording SEO-01)
export const SITE_NAME = 'Kim-san DOK — Business Analyst Freelance (AMOA)'