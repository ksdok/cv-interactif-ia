import { MetadataRoute } from 'next'
import { LANGUAGES } from '@/lib/i18n/config'
import { SITE_URL } from '@/lib/site'

// GEO-08e : sitemap bilingue avec alternates.languages (hreflang par entrée,
// x-default inclus — review N3). L'entrée racine (https://kimsandok.com) est
// retirée : depuis GEO-08a, / n'est qu'un redirect 307 de négociation de
// locale, pas une page indexable. /cv reste listé tant que GEO-08h ne l'a pas
// migré vers /fr/cv + /en/cv.
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date()

    const languages: Record<string, string> = {
        ...Object.fromEntries(
            LANGUAGES.map((lang) => [lang, `${SITE_URL}/${lang}`]),
        ),
        'x-default': SITE_URL,
    }

    return [
        ...LANGUAGES.map((lang) => ({
            url: `${SITE_URL}/${lang}`,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 1,
            alternates: { languages },
        })),
        // SEO-03 — page CV indexable. Migration bilingue + hreflang à GEO-08h.
        {
            url: `${SITE_URL}/cv`,
            lastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.9,
        },
    ]
}