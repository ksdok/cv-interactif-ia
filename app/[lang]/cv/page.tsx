// app/[lang]/cv/page.tsx
// SEO-03 + GEO-08h — CV indexable, bilingue : /fr/cv (contenu FR, dérivé de
// data/cv.md) et /en/cv (contenu EN du fast-path SEO-03). L'URL /cv historique
// est préservée par un 301 vers /fr/cv dans proxy.ts (l'URL est indexée).
//
// Metadata : wording par dictionnaire (GEO-08b, positionnement BA freelance —
// convention corpus 🔗 SEO-03 : le keyword « Product Designer » du backlog n°10
// est remplacé) + canonical par locale + hreflang fr/en/x-default (pattern
// GEO-08d). JSON-LD : hérité du layout du segment [lang] (buildEntityJsonLd,
// mêmes @id sur les deux locales) — la page ne re-déclare pas de script.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CvContentEn from '@/content/cv-en'
import CvContentFr from '@/content/cv-fr'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { isLocale, type Lang } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { SITE_URL } from '@/lib/site'

// generateMetadata : metadata CV re-déclinées par dictionnaire (wording BA
// freelance dans les 2 langues). `lang` typé string (pattern M3 Lot 0 — le
// runtime peut appeler avec un param non encore validé ; le layout rejette
// avant tout rendu, les metadata de fallback fr sont inoffensives sur une 404).
// Alternates : canonical absolu + hreflang fr/en/x-default (x-default → /fr/cv,
// aligné sur le cluster : même raisonnement que la review M1 Lot 1 sur la
// racine — la cible x-default est la version du marché cible).
// openGraph/twitter re-déclarés en entier (le merge Next est superficiel,
// review B3 Lot 0) avec images explicites (review M3 Lot 1 : la convention
// fichier ne s'applique qu'aux segments qui ne redéclarent PAS openGraph) —
// ce qui ferme aussi la review N3 (twitter/og:locale alignés sur la page CV).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const locale: Lang = isLocale(lang) ? lang : 'fr'
  const dictionary = getDictionary(locale)
  const pageUrl = `${SITE_URL}/${locale}/cv`

  return {
    // Template du layout [lang] : « ... | Kim-san DOK » est ajouté au title.
    title: dictionary.cv.title,
    description: dictionary.cv.description,
    keywords: dictionary.cv.keywords,
    alternates: {
      canonical: pageUrl,
      // N6 (review Lot 2) : convention relative alignée sur le layout du
      // segment [lang] ('/fr', '/en') — résolue en absolu par metadataBase,
      // même résultat.
      languages: {
        fr: '/fr/cv',
        en: '/en/cv',
        'x-default': '/fr/cv',
      },
    },
    openGraph: {
      type: 'profile',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      alternateLocale: [locale === 'fr' ? 'en_US' : 'fr_FR'],
      url: pageUrl,
      title: dictionary.cv.title,
      description: dictionary.cv.ogDescription,
      siteName: dictionary.metadata.siteName,
      images: [
        {
          url: '/opengraph-image.png',
          width: 1024,
          height: 1024,
          alt: dictionary.metadata.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dictionary.cv.title,
      description: dictionary.cv.ogDescription,
      images: [
        {
          url: '/opengraph-image.png',
          width: 1024,
          height: 1024,
          alt: dictionary.metadata.ogImageAlt,
        },
      ],
    },
  }
}

export default async function CvPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dictionary = getDictionary(lang)

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header dictionary={dictionary} lang={lang} />
      <main className="w-full pt-16 flex-1">
        {lang === 'fr' ? <CvContentFr lang={lang} /> : <CvContentEn lang={lang} />}
      </main>
      <Footer dictionary={dictionary} lang={lang} />
    </div>
  )
}