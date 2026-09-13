import { notFound } from 'next/navigation'
import { isLocale } from '@/lib/i18n/config'
import Home from './Home'

/**
 * app/[lang]/page.tsx — wrapper server du segment [lang].
 *
 * GEO-08a/B1 (review) : la validation explicite du paramètre + notFound() levé
 * AVANT tout rendu remplace dynamicParams = false (voir layout) : sur une route
 * dynamique (root layout avec cookies/headers), dynamicParams=false rejetait
 * le param après le flush du shell (contenu homepage dans le HTML brut, swap
 * client) puis, en itération 2, produisait un document d'erreur minimal sans
 * root layout. notFound() ici → 404 + shell complet + frontière not-found
 * racine (app/not-found.tsx, locale-aware via x-locale).
 * Le contenu client vit dans Home.tsx ('use client').
 */
export default async function LangPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  return <Home />
}
