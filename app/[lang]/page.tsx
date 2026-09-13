import { notFound } from 'next/navigation'
import { isLocale } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import Home from './Home'

/**
 * app/[lang]/page.tsx — wrapper server du segment [lang].
 *
 * GEO-08a/B1 (review) : voir app/[lang]/layout.tsx pour l'historique du
 * traitement anti-soft-404 (revue F8 GEO-08b : la validation du param vit
 * UNIQUEMENT dans le layout — le doublon ici était inatteignable et son
 * commentaire contredisait celui du layout).
 * Le contenu client vit dans Home.tsx ('use client').
 *
 * GEO-08b : le dictionnaire de la locale active est chargé ici (serveur) et
 * passé en props — les composants client n'importent jamais le dictionnaire
 * directement (pattern minimal du plan GEO-08, pas de next-intl).
 */
export default async function LangPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  // Type-guard sound : isLocale est strict depuis la review F1 (GEO-08b) ;
  // le notFound() du layout a déjà filtré les params invalides.
  if (!isLocale(lang)) notFound()
  const dictionary = getDictionary(lang)
  return <Home dictionary={dictionary} locale={lang} />
}
