/**
 * app/[lang]/layout.tsx
 * Layout nested du segment de locale — SANS <html>/<body> (le root layout
 * app/layout.tsx les conserve, décision option A de GEO-08a).
 *
 * GEO-08a : fondation routing i18n. GEO-08b : les deux locales servent le
 * dictionnaire lib/i18n/ (chargé dans page.tsx, passé en props).
 * GEO-08d : metadata complètes par locale (title/description/keywords/OG/
 * Twitter issus du dictionnaire) + hreflang fr/en/x-default + canonical par
 * locale (complète SEO-04) + JSON-LD déplacé du root layout — entité unique
 * Person + ProfessionalService, mêmes @id sur les deux locales, wording traduit.
 */

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { isLocale, LANGUAGES, type Lang } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { buildEntityJsonLd } from '@/lib/jsonLd'
import { SITE_URL } from '@/lib/site'

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

// GEO-08d point 4 (prérequis dur, review B4) : metadataBase est conservé dans
// le root layout — sans lui, `alternates.languages` / `canonical` relatifs ne
// se résolvent pas en absolu (Next retomberait sur localhost) et le hreflang
// émis serait invalide pour Google.

// GEO-08d : title/description/keywords/OG/Twitter par locale, issus du
// dictionnaire (wording BA freelance dans les 2 langues, mêmes entités :
// Kim-san DOK, AMOA, finance de marché). Le canonical + hreflang complètent
// SEO-04 dans le même objet (le hreflang du root layout était FR-only).
// Review M3 (Lot 0) : `lang` typé `string` — au runtime, generateMetadata peut
// être appelé avec un param non encore validé (ex. /de) ; le type ne doit pas
// mentir. Les metadata de la locale de fallback (fr) sont alors servies :
// inoffensif, la page 404 n'est pas indexée et le LangLayout rejette avant
// tout rendu de contenu.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const locale = isLocale(lang) ? lang : 'fr'
  const dictionary = getDictionary(locale)
  const pageUrl = `${SITE_URL}/${locale}`

  return {
    // Template %s : les pages du segment [lang] qui définissent un title
    // propre (ex. /fr/cv à GEO-08h) héritent « ... | Kim-san DOK ».
    // `absolute` (pas `default`) : sinon le template du ROOT layout
    // (« %s | Kim-san DOK ») s'applique AUSSI au title par défaut de ce
    // segment → suffixe dupliqué (« ... | Finance de marché | Kim-san DOK »).
    title: {
      absolute: dictionary.metadata.title,
      template: '%s | Kim-san DOK',
    },
    description: dictionary.metadata.description,
    keywords: dictionary.metadata.keywords,
    alternates: {
      // SEO-04 (complété) : canonical par locale — une URL canonique unique
      // par page, jamais la racine morte https://kimsandok.com (redirigée 307
      // par GEO-08c).
      canonical: pageUrl,
      // GEO-08d point 2 : hreflang reliant les deux versions — c'est ce qui
      // permet à Google de traiter /fr et /en comme une entité unique bilingue
      // et non comme du duplicate content.
      languages: {
        fr: '/fr',
        en: '/en',
        // x-default → /fr : Google recommande la locale « la plus
        // universellement appropriée » (souvent EN), mais le marché cible est
        // FR (missions AMOA en banques françaises) — /fr est défendable
        // (ticket GEO-08d, point 2). À reconsidérer si le trafic EN devient
        // significatif.
        'x-default': '/fr',
      },
    },
    // Re-déclaré en entier : le merge de metadata Next est superficiel (un
    // openGraph partiel écraserait title/description — cf. review B3 Lot 0).
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      // N2 (review Lot 1) : og:locale:alternate — signal OG bilingue.
      alternateLocale: [locale === 'fr' ? 'en_US' : 'fr_FR'],
      url: pageUrl,
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      siteName: dictionary.metadata.siteName,
      // Review M3 (Lot 1) : la convention fichier (app/opengraph-image.png)
      // ne s'applique QU'AUX segments qui ne redéclarent PAS openGraph —
      // redéclarer openGraph fait tomber l'image, il faut la déclarer
      // explicitement (URL relative résolue via metadataBase du root layout).
      // Alt traduit par locale (l'alt.txt de la convention est FR-only).
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
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
      // Review M3 (Lot 1) : image déclarée explicitement (même règle que
      // og:image) — summary_large_image sans image = aperçu X dégradé.
      images: [
        {
          url: '/opengraph-image.png',
          width: 1024,
          height: 1024,
          alt: dictionary.metadata.ogImageAlt,
        },
      ],
    },
    // robots (index/follow) est hérité du root layout.
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
  // not-found du segment PARENT (app/not-found.tsx). Le même notFound() levé
  // dans la page produisait le document d'erreur minimal __next_error__ (sans
  // layout). page.tsx ne refait PAS ce check au runtime (le sien ne sert
  // qu'au narrowing type pour getDictionary).
  // Review M4 (Lot 0) — précision : pour une ROUTE MANQUANTE sous une locale
  // valide (/fr/cv), le shell complet est servi (lang, CSRF, 404 localisé dans
  // le HTML brut, mesuré). Pour un PARAM INVALIDE (/de), Next 16 sert le
  // document d'erreur minimal __next_error__ : la 404 localisée est livrée via
  // le payload RSC (rendue par les navigateurs après hydratation) —
  // comportement structurel Next 16 documenté dans le ticket GEO-08a.
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dictionary = getDictionary(lang)

  // GEO-08d point 3 : le JSON-LD sort du root layout (FR-only) et devient une
  // fonction de params.lang. Builder mutualisé (review M2 Lot 1) — une entité
  // Person unique, traduite par page, avec les MÊMES @id
  // (https://kimsandok.com/#person, /#service) sur les deux locales — critère
  // 3 : c'est ce qui garantit que Google traite /fr et /en comme une seule
  // entité bilingue, pas deux entités concurrentes. /cv consomme le même
  // builder (en EN) via app/cv/page.tsx.
  const jsonLd = buildEntityJsonLd(dictionary)

  // nonce est server-only (injecté par proxy.ts via x-nonce, même pattern que
  // le root layout) ; le client n'en dispose pas à l'hydration -> diff
  // d'attribut attendu, on le supprime. Le script JSON-LD est rendu en tête
  // de <body> (le root layout est seul propriétaire de <head>) — schema.org
  // et Google lisent le JSON-LD quel que soit son emplacement dans le HTML.
  const nonce = (await headers()).get('x-nonce') || undefined

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}