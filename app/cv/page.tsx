// app/cv/page.tsx
// SEO-03 — Full CV rendered as indexable HTML (fast-path EN at /cv).
// Bilingue /fr/cv + /en/cv reporté au Lot 0 (GEO-08, routing app/[lang]/).
//
// Contenu éditorial co-rédigé dans content/cv-en.tsx (distinct de data/cv.md,
// source FR du chatbot). Cette page ne gère que le metadata + le shell.

import type { Metadata } from 'next'
import CvContent from '@/content/cv-en'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import en from '@/lib/i18n/en'

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
    // Fast-path EN — canonical /cv. hreflang FR/EN ajouté au Lot 0 (GEO-08).
    canonical: `${SITE_URL}/cv`,
  },
  openGraph: {
    title: 'Kim-san DOK — CV | Senior Business Analyst Freelancer, Market Finance',
    description:
      '10 years in market finance at Société Générale — Securities Lending, Repo, Forex, Hedging. 14M tx/yr, ×4 scalability, 500 000€/yr savings.',
    url: `${SITE_URL}/cv`,
    type: 'profile',
  },
}

export default function CvPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header dictionary={en} />
      <main className="w-full pt-16 flex-1">
        <CvContent />
      </main>
      <Footer dictionary={en} />
    </div>
  )
}