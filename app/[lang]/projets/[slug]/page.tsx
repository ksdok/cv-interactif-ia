// app/[lang]/projets/[slug]/page.tsx
// PROJ-001 — page détail par projet mis en avant (/[lang]/projets/[slug]).
//
// Décision 3 (spec) : slug éditorial (indépendant du nom de repo) ; slug inconnu
// OU projet sans détail complet FR/EN → notFound() (boundary app/not-found.tsx).
// Décision 4 (M3) : la page n'existe que si `hasDetail` (invariant featured ⟹
// detailFr && detailEn) — pas de page pour un détail mono-langue (anti-thin-content).
// Décision 5 (M4) : JSON-LD `SoftwareSourceCode` noncé, `author` RÉFÉRENCÉ par
// `@id` (jamais l'entité Person ré-émise — elle vit dans le layout [lang]).
// Le title ne porte PAS de suffixe « | Kim-san DOK » : le template du layout
// [lang] l'ajoute déjà.

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { isLocale, type Lang } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { SITE_URL } from '@/lib/site'
import { detailProjects, hasDetail, projectBySlug, type Project } from '@/content/projects'

// Icône lien externe.
function ExternalIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

function repoUrl(project: Project): string {
  return `https://github.com/${project.repo.owner}/${project.repo.name}`
}

function localized(project: Project, lang: Lang) {
  return lang === 'fr'
    ? { title: project.titleFr, summary: project.summaryFr, sections: project.detailFr }
    : { title: project.titleEn, summary: project.summaryEn, sections: project.detailEn }
}

function otherLocale(lang: Lang): Lang {
  return lang === 'fr' ? 'en' : 'fr'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}): Promise<Metadata> {
  const { lang, slug } = await params
  const locale: Lang = isLocale(lang) ? lang : 'fr'
  const dictionary = getDictionary(locale)
  const project = projectBySlug(slug)
  if (!project || !hasDetail(project)) notFound()

  const { title, summary } = localized(project, locale)
  const pageUrl = `${SITE_URL}/${locale}/projets/${project.slug}`

  return {
    title,
    description: summary,
    alternates: {
      canonical: pageUrl,
      languages: {
        fr: `/fr/projets/${project.slug}`,
        en: `/en/projets/${project.slug}`,
        'x-default': `/fr/projets/${project.slug}`,
      },
    },
    openGraph: {
      type: 'article',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      alternateLocale: [locale === 'fr' ? 'en_US' : 'fr_FR'],
      url: pageUrl,
      title,
      description: summary,
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
      title,
      description: summary,
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

export default async function ProjetDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { lang, slug } = await params
  if (!isLocale(lang)) notFound()
  const dictionary = getDictionary(lang)

  const project = projectBySlug(slug)
  if (!project || !hasDetail(project)) notFound()

  const { title, summary, sections } = localized(project, lang)
  const nonce = (await headers()).get('x-nonce') || undefined

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: title,
    description: summary,
    codeRepository: repoUrl(project),
    author: { '@id': `${SITE_URL}/#person` },
    inLanguage: lang,
    keywords: project.tags.join(', '),
    // dateModified : source ÉDITORIALE (content/projects.ts) — plus aucun champ
    // dérivé de l'API GitHub (métadonnées non affichées, consigne opérateur).
    dateModified: project.updatedAt,
  }

  const others = detailProjects().filter((p) => p.slug !== project.slug)
  const excerpt = otherLocale(lang) === 'fr' ? project.summaryFr : project.summaryEn

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
        <article className="max-w-3xl mx-auto px-8 pb-16">
          <Link
            href={`/${lang}/projets`}
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.projects.detail.back}
          </Link>

          <p className="text-secondary text-[0.75rem] tracking-[0.3em] uppercase mt-10 font-medium">
            {dictionary.projects.detail.eyebrow}
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-on-surface leading-[1.05] mt-4">
            {title}
          </h1>
          <p className="text-secondary mt-4 font-mono text-sm">
            {`${project.repo.owner} / ${project.repo.name}`}
          </p>

          <div className="mt-10 space-y-6">
            {sections?.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-bold text-on-surface">{section.heading}</h2>
                <p className="text-on-surface leading-relaxed mt-2">{section.body}</p>
              </section>
            ))}
          </div>

          {/* Liens visibles : plus AUCUN lien repo GitHub (consigne opérateur).
              Seule la démo produit reste, si elle existe. Le repo n'est plus
              utilisé que comme `codeRepository` dans le JSON-LD (SEO). */}
          {project.demoUrl && (
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${dictionary.projects.detail.demoLabel} — ${title} (${dictionary.projects.newTab})`}
                className="inline-flex items-center gap-2 text-[0.75rem] tracking-wider uppercase font-semibold text-on-surface border-b border-on-surface pb-0.5 hover:opacity-60 transition-opacity"
              >
                {dictionary.projects.detail.demoLabel}
                <ExternalIcon />
              </a>
            </div>
          )}

          {/* Appel à tester (bêta) — CTA vers le contact public du site. */}
          {project.contactForBeta && (
            <div className="mt-8 bg-surface-container-low rounded-lg p-8">
              <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-2">
                {dictionary.projects.detail.betaLabel}
              </p>
              <p className="text-on-surface leading-relaxed">{dictionary.projects.detail.betaBody}</p>
              <a
                href="mailto:dokkimsan@gmail.com"
                className="mt-4 inline-flex items-center gap-2 text-[0.75rem] tracking-wider uppercase font-semibold text-on-surface border-b border-on-surface pb-0.5 hover:opacity-60 transition-opacity"
              >
                {dictionary.projects.detail.betaCta}
              </a>
            </div>
          )}

          {/* Extrait dans l'autre langue — porté par lang={...} (a11y : voix du lecteur d'écran) */}
          <div className="mt-8 bg-surface-container-lowest border border-surface-variant rounded-lg p-6">
            <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-2">
              {dictionary.projects.detail.otherLocaleExcerpt}
            </p>
            <p lang={otherLocale(lang)} className="text-secondary leading-relaxed">
              {excerpt}
            </p>
          </div>

          {others.length > 0 && (
            <nav className="mt-16 pt-8 border-t border-surface-variant" aria-label={dictionary.projects.detail.otherProjects}>
              <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-4">
                {dictionary.projects.detail.otherProjects}
              </p>
              <ul className="flex flex-col gap-3">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/${lang}/projets/${other.slug}`}
                      className="font-semibold text-on-surface underline underline-offset-4 hover:opacity-60 transition-opacity"
                    >
                      {localized(other, lang).title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </article>
      </main>
      <Footer dictionary={dictionary} lang={lang} />
    </div>
  )
}
