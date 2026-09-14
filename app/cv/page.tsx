// app/cv/page.tsx
// SEO-03 — Full CV rendered as indexable HTML (fast-path EN at /cv).
// Bilingue /fr/cv + /en/cv reporté à GEO-08h (routing app/[lang]/ livré, GEO-08b
// dictionnaires en place).
//
// Contenu éditorial co-rédigé dans content/cv-en.tsx (distinct de data/cv.md,
// source FR du chatbot). Cette page ne gère que le metadata + le shell.

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import CvContent from '@/content/cv-en'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import en from '@/lib/i18n/en'
import { buildEntityJsonLd } from '@/lib/jsonLd'

// GEO-08b : /cv reste EN (fast-path SEO-03) — dictionnaire EN passé directement
// (import serveur, page server) jusqu'à la migration bilingue GEO-08h.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kimsandok.com'

export const metadata: Metadata = {
  title: 'Kim-san DOK — CV | Senior Business Analyst Freelancer, Market Finance',
  description:
    'Full CV of Kim-san DOK, Senior Business Analyst freelancer in market finance (Paris). ' +
    '10 years at Société Générale — Securities Lending, Repo, Forex, Hedging. ' +
    '14M transactions/yr, ×4 scalability, 500 000€/yr savings. PSM I.',
  keywords: [
    'Kim-san DOK',
    'Business Analyst',
    'freelance',
    'AMOA',
    'market finance',
    'Securities Lending',
    'Repo',
    'Forex',
    'Hedging',
    'Société Générale',
    'Broadridge',
    'Kondor+',
    'PSM I',
    'Paris',
  ],
  alternates: {
    // Fast-path EN — canonical /cv. hreflang FR/EN ajouté à GEO-08d/h.
    canonical: `${SITE_URL}/cv`,
  },
  openGraph: {
    title: 'Kim-san DOK — CV | Senior Business Analyst Freelancer, Market Finance',
    description:
      '10 years in market finance at Société Générale — Securities Lending, Repo, Forex, Hedging. 14M tx/yr, ×4 scalability, 500 000€/yr savings.',
    url: `${SITE_URL}/cv`,
    type: 'profile',
    // Review M3 (Lot 1 GEO-08d) : la convention fichier (app/opengraph-image.png)
    // ne s'applique qu'aux segments qui ne redéclarent PAS openGraph — /cv la
    // redéclare, donc images explicites (pré-existant sans image sur main).
    images: [
      {
        url: '/opengraph-image.png',
        width: 1024,
        height: 1024,
        alt: en.metadata.ogImageAlt,
      },
    ],
  },
}

export default async function CvPage() {
  // Review M2 (Lot 1 GEO-08d) : JSON-LD restauré sur /cv via le builder
  // mutualisé (en EN, comme le contenu) — il avait été perdu avec la
  // suppression du bloc racine FR-only du root layout. Même nonce server-only
  // (x-nonce de proxy.ts) que le root layout ; suppressHydrationWarning car
  // le client n'a pas le nonce à l'hydration.
  const nonce = (await headers()).get('x-nonce') || undefined
  const jsonLd = buildEntityJsonLd(en)
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header dictionary={en} />
      <main className="w-full pt-16 flex-1">
        <CvContent />
      </main>
      <Footer dictionary={en} />
    </div>
  )
}