/**
 * app/[lang]/layout.tsx
 * Layout nested du segment de locale — SANS <html>/<body> (le root layout
 * app/layout.tsx les conserve, décision option A de GEO-08a).
 *
 * GEO-08a : fondation routing i18n. À ce stade (avant GEO-08b), les deux
 * locales servent le même contenu EN en dur — assumé et temporaire.
 * GEO-08b branchera le dictionnaire lib/i18n/, GEO-08d les metadata
 * complètes (title/description/JSON-LD/hreflang) par locale.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { isLocale, LANGUAGES, type Lang } from '@/lib/i18n/config'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site'

// generateStaticParams déclare fr/en au build (critère 3 GEO-08a).
// dynamicParams = false a été RETIRÉ (review B1, itération 2) : il rejette le
// param au niveau du routeur AVANT tout rendu → document d'erreur minimal
// (__next_error__) sans root layout (pas de meta CSRF ni <html lang>) et sans
// frontière not-found custom. La validation explicite dans app/[lang]/page.tsx
// (notFound() avant rendu) produit le même 404 mais avec le shell complet.
// generateStaticParams déclare fr/en au build (critère 3 GEO-08a). Testé :
// ce n'est PAS lui le déclencheur du document d'erreur minimal sur /de —
// c'est le notFound() pour un param [lang] invalide, comportement structurel
// Next 16 (documenté dans le ticket GEO-08a, revue B1 itération 3).
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
  // GEO-08a/B1 (review, itération 3) : validation du param AU LAYOUT — un
  // notFound() levé ici rend la frontière not-found du segment PARENT
  // (app/not-found.tsx) dans le shell root layout complet (<html lang>, meta
  // CSRF). Le même notFound() levé dans la page produisait le document d'erreur
  // minimal __next_error__ (sans layout) dans le HTML brut.
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return children
}