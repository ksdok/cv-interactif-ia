import { MetadataRoute } from 'next'
import { LANGUAGES } from '@/lib/i18n/config'
import { SITE_URL } from '@/lib/site'
import { detailProjects, projectsLastModified } from '@/content/projects'

// GEO-08e : sitemap bilingue avec alternates.languages (hreflang par entrée,
// x-default inclus — review N3). x-default → /fr (review M1 Lot 1 GEO-08d :
// aligné sur le x-default du HTML — la racine n'est qu'un redirect 307 de
// négociation, jamais un candidat x-default ; deux x-default divergents dans
// un même cluster font risquer le rejet de l'annotation par Google).
// L'entrée racine (https://kimsandok.com) est retirée : depuis GEO-08a, / n'est
// qu'un redirect 307 de négociation de locale, pas une page indexable.
// GEO-08h : /cv (fast-path SEO-03) est migré en /fr/cv + /en/cv avec
// alternates — x-default → /fr/cv (version du marché cible, aligné sur le
// canonical des pages CV). L'URL /cv historique est 301 vers /fr/cv (proxy.ts)
// et ne doit plus être listée.
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date()

    const languages: Record<string, string> = {
        ...Object.fromEntries(
            LANGUAGES.map((lang) => [lang, `${SITE_URL}/${lang}`]),
        ),
        'x-default': SITE_URL + '/fr',
    }

    const cvLanguages: Record<string, string> = {
        ...Object.fromEntries(
            LANGUAGES.map((lang) => [lang, `${SITE_URL}/${lang}/cv`]),
        ),
        'x-default': SITE_URL + '/fr/cv',
    }

    // PROJ-001 — hub Projets + pages détail (hasDetail). lastModified DÉRIVÉ de
    // content/projects.ts (champ éditorial) : AUCUN fetch GitHub → le sitemap
    // reste statique (○) et le build reste hors réseau (N5). x-default → FR
    // (marché cible), aligné sur le x-default du HTML des pages.
    const projectsLanguages: Record<string, string> = {
        ...Object.fromEntries(
            LANGUAGES.map((lang) => [lang, `${SITE_URL}/${lang}/projets`]),
        ),
        'x-default': SITE_URL + '/fr/projets',
    }
    const projectsHubLastModified = projectsLastModified()

    return [
        ...LANGUAGES.map((lang) => ({
            url: `${SITE_URL}/${lang}`,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 1,
            alternates: { languages },
        })),
        // SEO-03 + GEO-08h — pages CV bilingues, liées par hreflang.
        ...LANGUAGES.map((lang) => ({
            url: `${SITE_URL}/${lang}/cv`,
            lastModified,
            changeFrequency: 'monthly' as const,
            priority: 0.9,
            alternates: { languages: cvLanguages },
        })),
        // PROJ-001 — hub Projets bilingue.
        ...LANGUAGES.map((lang) => ({
            url: `${SITE_URL}/${lang}/projets`,
            lastModified: projectsHubLastModified,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
            alternates: { languages: projectsLanguages },
        })),
        // PROJ-001 — pages détail (uniquement les projets `hasDetail`).
        ...detailProjects().flatMap((project) => {
            const detailLanguages: Record<string, string> = {
                ...Object.fromEntries(
                    LANGUAGES.map((lang) => [
                        lang,
                        `${SITE_URL}/${lang}/projets/${project.slug}`,
                    ]),
                ),
                'x-default': `${SITE_URL}/fr/projets/${project.slug}`,
            }
            const detailLastModified = new Date(project.updatedAt)
            return LANGUAGES.map((lang) => ({
                url: `${SITE_URL}/${lang}/projets/${project.slug}`,
                lastModified: detailLastModified,
                changeFrequency: 'monthly' as const,
                priority: 0.7,
                alternates: { languages: detailLanguages },
            }))
        }),
    ]
}