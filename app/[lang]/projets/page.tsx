// app/[lang]/projets/page.tsx
// PROJ-001 — hub Projets bilingue (/fr/projets, /en/projets), server-rendered.
//
// Décision 2 (spec) : rendu DYNAMIQUE assumé — le layout [lang] lit
// headers()/cookies() (CSRF, nonce CSP) et le JSON-LD de page a besoin du nonce.
// Ne pas chercher le ○ au build ; le gain de charge vient du Data Cache GitHub
// (`lib/github.ts`) + du mémo négatif.
//
// Décision 5 (spec, M4) : premier JSON-LD de PAGE du dépôt (le layout [lang]
// reste l'unique émetteur de l'entité Person/ProfessionalService). Ici :
// - script NONCÉ (pattern proxy.ts — un script sans nonce est bloqué en silence) ;
// - `ItemList` (hub) — PAS d'entité Person ré-émise.
//
// Décision 4 (spec, M3) : la carte pointe vers la page détail ssi `hasDetail`
// (détail complet FR/EN), sinon vers GitHub en lien externe annoncé (a11y).

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { isLocale, type Lang } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { SITE_URL } from '@/lib/site'
import { hasDetail, visibleProjects, type Project } from '@/content/projects'
import { fetchRepoMetas, type RepoMeta } from '@/lib/github'

// Icône étoile (inline — pas de glyphe littéral en JSX, et rien à charger).
function StarIcon() {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
    </svg>
  )
}

// Icône lien externe.
function ExternalIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

// Flèche interne.
function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function repoUrl(project: Project): string {
  return `https://github.com/${project.repo.owner}/${project.repo.name}`
}

function localized(project: Project, lang: Lang) {
  return lang === 'fr'
    ? { title: project.titleFr, summary: project.summaryFr }
    : { title: project.titleEn, summary: project.summaryEn }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const locale: Lang = isLocale(lang) ? lang : 'fr'
  const dictionary = getDictionary(locale)
  const pageUrl = `${SITE_URL}/${locale}/projets`

  return {
    title: dictionary.projects.metaTitle,
    description: dictionary.projects.metaDescription,
    keywords: dictionary.projects.keywords,
    alternates: {
      canonical: pageUrl,
      languages: {
        fr: '/fr/projets',
        en: '/en/projets',
        'x-default': '/fr/projets',
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      alternateLocale: [locale === 'fr' ? 'en_US' : 'fr_FR'],
      url: pageUrl,
      title: dictionary.projects.metaTitle,
      description: dictionary.projects.ogDescription,
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
      title: dictionary.projects.metaTitle,
      description: dictionary.projects.ogDescription,
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

export default async function ProjetsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dictionary = getDictionary(lang)

  const projects = visibleProjects()
  const metas = await fetchRepoMetas(
    projects.map((p) => ({ slug: p.slug, owner: p.repo.owner, name: p.repo.name })),
  )
  const nonce = (await headers()).get('x-nonce') || undefined
  const dateFmt = new Intl.DateTimeFormat(lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: projects.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: localized(p, lang).title,
      url: hasDetail(p) ? `${SITE_URL}/${lang}/projets/${p.slug}` : repoUrl(p),
    })),
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header dictionary={dictionary} lang={lang} />
      <main className="w-full pt-16 flex-1">
        {/* Hero éditorial — miroir de la composition de la home (label + h1 unique) */}
        <section className="w-full text-center mb-24 px-8 max-w-7xl mx-auto">
          <p className="text-secondary text-[0.75rem] tracking-[0.3em] uppercase mb-8 font-medium">
            {dictionary.projects.eyebrow}
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.1] max-w-4xl mx-auto mb-16">
            {dictionary.projects.title}
          </h1>
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
            <p className="md:col-start-2 md:col-span-5 text-[23px] text-on-surface leading-relaxed font-light">
              {dictionary.projects.lead}
            </p>
            <p className="md:col-start-8 md:col-span-4 self-end text-secondary text-base leading-loose">
              {dictionary.projects.aside}
            </p>
          </div>
        </section>

        {/* Grille de cartes (décision 7 : liste éditoriale, featured d'abord) */}
        <section className="w-full px-8 pb-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const meta: RepoMeta | undefined = metas.get(project.slug)
              const { title, summary } = localized(project, lang)
              const pills = [...project.tags, ...(meta?.topics ?? [])]
              const activity = meta?.pushedAt ?? project.updatedAt
              return (
                <article
                  key={project.slug}
                  className="bg-surface-container-low rounded-lg p-10 flex flex-col min-h-[22rem]"
                >
                  <span className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold">
                    {project.featured
                      ? dictionary.projects.featuredLabel
                      : dictionary.projects.githubLabel}
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight mt-6 text-on-surface">
                    {title}
                  </h2>
                  <p className="text-secondary mt-3">{summary}</p>

                  {pills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-5">
                      {pills.map((pill) => (
                        <span
                          key={pill}
                          className="bg-surface-container-lowest px-3 py-1 rounded text-xs font-medium text-on-surface"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-surface-variant text-[0.8rem] text-secondary">
                    {typeof meta?.stars === 'number' && (
                      <span
                        className="inline-flex items-center gap-1.5"
                        aria-label={`${meta.stars} ${dictionary.projects.starsAria}`}
                      >
                        <StarIcon />
                        {meta.stars}
                      </span>
                    )}
                    {meta?.language && <span>{meta.language}</span>}
                    <span>{`${dictionary.projects.lastActivityLabel} ${dateFmt.format(new Date(activity))}`}</span>
                  </div>

                  {hasDetail(project) ? (
                    <Link
                      href={`/${lang}/projets/${project.slug}`}
                      className="mt-6 inline-flex items-center gap-2 self-start text-[0.75rem] tracking-wider uppercase font-semibold text-on-surface border-b border-on-surface pb-0.5 hover:opacity-60 transition-opacity"
                    >
                      {dictionary.projects.viewProject}
                      <ArrowIcon />
                    </Link>
                  ) : (
                    <a
                      href={repoUrl(project)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${dictionary.projects.viewOnGithub} — ${title} (${dictionary.projects.newTab})`}
                      className="mt-6 inline-flex items-center gap-2 self-start text-[0.75rem] tracking-wider uppercase font-semibold text-secondary border-b border-secondary pb-0.5 hover:opacity-60 transition-opacity"
                    >
                      {dictionary.projects.viewOnGithub}
                      <ExternalIcon />
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </main>
      <Footer dictionary={dictionary} lang={lang} />
    </div>
  )
}
