/**
 * app/[lang]/layout.tsx
 * Layout nested du segment de locale — SANS <html>/<body> (le root layout
 * app/layout.tsx les conserve, décision option A de GEO-08a).
 *
 * GEO-08a : fondation routing i18n. GEO-08b : les deux locales servent le
 * dictionnaire lib/i18n/ (chargé dans page.tsx, passé en props).
 * GEO-08d posera les metadata complètes (title/description/JSON-LD/hreflang)
 * par locale — le title/description de premier niveau reste hérité du root
 * layout (FR) en attendant, assumé et tracé (review F2 GEO-08b).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { isLocale, LANGUAGES, type Lang } from '@/lib/i18n/config'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site'

// generateStaticParams déclare fr/en au build (critère 3 GEO-08a). Testé
// (review B1, itérations 1→3) : ce n'est pas lui le déclencheur du document
// d'erreur minimal sur /de — c'est le notFound() pour un param [lang]
// invalide, comportement structurel Next 16 (voir ticket GEO-08a).
// dynamicParams = false a été RETIRÉ (itération 2) : rejet pré-rendu → shell
// minimal sans root layout ; le 404 passe désormais par la validation du
// LangLayout ci-dessous (review F8 GEO-08b : source unique de validation).
export function generateStaticParams(): { lang: Lang }[] {
  return LANGUAGES.map((lang) => ({ lang }))
}

// B3 (review GEO-08a) : canonical + og:url par locale dès maintenant. Le
// canonical hérité du root layout (https://kimsandok.com) pointe vers une URL
// morte depuis la suppression de app/page.tsx — Google risquerait de dropper
// /fr et /en. GEO-08d absorbera/refactorera (hreflang, title/description par
// locale) ; openGraph est re-déclaré en entier car le merge de metadata Next
// est superficiel (un openGraph partiel écraserait title/description).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Lang }>
}): Promise<Metadata> {
  const { lang } = await params
  const pageUrl = `${SITE_URL}/${lang}`
  return {
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      locale: lang === 'fr' ? 'fr_FR' : 'en_US',
      url: pageUrl,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      siteName: SITE_NAME,
      // og:image reste piloté par la convention fichier app/opengraph-image.png
      // (voir root layout) — un tableau images[] ici serait ignoré.
    },
  }
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  // GEO-08a/B1 (review, itérations 1→3) + F8 (GEO-08b) : validation du param
  // AU LAYOUT, source unique — un notFound() levé ici rend la frontière
  // not-found du segment PARENT (app/not-found.tsx) dans le shell root layout
  // complet (<html lang>, meta CSRF). Le même notFound() levé dans la page
  // produisait le document d'erreur minimal __next_error__ (sans layout).
  // page.tsx ne refait PAS ce check au runtime (le sien ne sert qu'au narrowing
  // type pour getDictionary).
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return children
}