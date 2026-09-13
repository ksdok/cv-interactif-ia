/**
 * app/[lang]/layout.tsx
 * Layout nested du segment de locale — SANS <html>/<body> (le root layout
 * app/layout.tsx les conserve, décision option A de GEO-08a).
 *
 * GEO-08a : fondation routing i18n. À ce stade (avant GEO-08b), les deux
 * locales servent le même contenu EN en dur — assumé et temporaire.
 * GEO-08b branchera ici le chargement du dictionnaire lib/i18n/,
 * GEO-08d les metadata + JSON-LD + hreflang par locale.
 */

import type { ReactNode } from 'react'

// Locales supportées — source de vérité pour generateStaticParams et pour la
// validation du header x-locale posé par proxy.ts (consumé par app/layout.tsx).
export const LANGUAGES = ['fr', 'en'] as const
export type Lang = (typeof LANGUAGES)[number]

// GEO-08a : seules /fr et /en existent. dynamicParams=false => /de, /es... -> 404
// (rendu via app/[lang]/not-found.tsx, revue M2).
export function generateStaticParams(): { lang: Lang }[] {
  return LANGUAGES.map((lang) => ({ lang }))
}

export const dynamicParams = false

export default function LangLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}