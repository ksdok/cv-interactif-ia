/**
 * lib/jsonLd.ts — builder du JSON-LD d'entité (Person + ProfessionalService).
 *
 * GEO-08d (review M2, Lot 1) : mutualisé dans le layout du segment [lang].
 * GEO-08h : depuis la migration de /cv sous app/[lang]/cv, TOUTES les pages
 * (accueil + CV, deux locales) reçoivent le JSON-LD via le layout du segment —
 * le builder n'a plus qu'un seul consommateur.
 *
 * Les @id/url/sameAs/email/homeLocation sont des identifiants d'entité :
 * identiques sur toutes les locales, NON traduits (critère 3 GEO-08d — c'est
 * ce qui garantit que Google traite /fr, /en, /fr/cv et /en/cv comme une
 * seule entité).
 * La description Person réutilise metadata.description (SEO-01 : « identique
 * à la meta description ») — la réutilisation se fait ICI, pas dans le dico.
 */

import type { Dictionary } from './i18n/types'
import { SITE_URL } from './site'

export function buildEntityJsonLd(dictionary: Dictionary) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#person`,
        name: 'Kim-san DOK',
        jobTitle: dictionary.jsonLd.jobTitle,
        description: dictionary.metadata.description,
        url: SITE_URL,
        email: 'dokkimsan@gmail.com',
        homeLocation: {
          '@type': 'PostalAddress',
          addressLocality: 'Paris',
          addressRegion: 'FR-IDF',
          addressCountry: 'FR',
        },
        areaServed: 'FR',
        knowsLanguage: ['fr', 'en'],
        sameAs: [
          'https://www.linkedin.com/in/kim-san-dok',
          'https://github.com/ksdok',
        ],
        knowsAbout: dictionary.jsonLd.knowsAbout,
      },
      {
        '@type': 'ProfessionalService',
        '@id': `${SITE_URL}/#service`,
        name: dictionary.jsonLd.serviceName,
        description: dictionary.jsonLd.serviceDescription,
        areaServed: 'FR',
        url: SITE_URL,
        founder: { '@id': `${SITE_URL}/#person` },
      },
    ],
  }
}