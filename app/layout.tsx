/**
 * app/layout.tsx
 * Root layout for the application
 *
 * SECURITY: This layout embeds the CSRF token in a meta tag
 * so client components can read it for form submissions.
 * The actual token is stored securely in httpOnly cookie by middleware.
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cookies, headers } from 'next/headers'
import { CSRF_COOKIE_CONFIG } from '@/lib/csrf'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://kimsandok.com'),
  title: {
    default: 'Kim-san DOK — Business Analyst Senior Freelance (AMOA) | Finance de marché',
    template: '%s | Kim-san DOK',
  },
  // SEO-01 (fast-path FR-only) : positionnement BA freelance finance de marché.
  // Le wording EN + hreflang arrive au Lot 0 (i18n, cf. GEO-08).
  description:
    "Kim-san DOK, Business Analyst Senior freelance en finance de marché (Paris, La Défense). " +
    "10 ans d'expérience en transformation SI, Securities Lending, Repo, Forex. " +
    "CV interactif avec assistant IA.",
  keywords: [
    'Kim-san DOK',
    'Business Analyst',
    'freelance',
    'consultant indépendant',
    'AMOA',
    'finance de marché',
    'Securities Lending',
    'Forex',
    'transformation SI',
    'Paris',
  ],
  authors: [{ name: 'Kim-san DOK' }],
  creator: 'Kim-san DOK',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://kimsandok.com',
    title: 'Kim-san DOK — Business Analyst Senior Freelance (AMOA) | Finance de marché',
    description:
      "Business Analyst Senior freelance en finance de marché (Paris). " +
      "10 ans d'expérience en transformation SI, Securities Lending, Repo, Forex. " +
      "CV interactif avec assistant IA.",
    siteName: 'Kim-san DOK — Business Analyst Freelance (AMOA)',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1024,
        height: 1024,
        alt: 'Kim-san DOK — Business Analyst Senior freelance, AMOA finance de marché (Paris)',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kim-san DOK — Business Analyst Senior Freelance (AMOA) | Finance de marché',
    description:
      "Business Analyst Senior freelance en finance de marché (Paris). " +
      "10 ans d'expérience en transformation SI, Securities Lending, Repo, Forex. " +
      "CV interactif avec assistant IA.",
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SECURITY: Extract CSRF token from secure httpOnly cookie
  // This runs on the server, so it's safe to access the cookie
  const cookieStore = await cookies()
  const headersList = await headers()
  const csrfToken = cookieStore.get(CSRF_COOKIE_CONFIG.name)?.value || ''
  const nonce = headersList.get('x-nonce') || undefined

  // SEO-01 : entité Person (@id requis pour le cross-référencement par ProfessionalService)
  // + bloc ProfessionalService. Wording FR (fast-path), EN au Lot 0 (GEO-08).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': 'https://kimsandok.com/#person',
        name: 'Kim-san DOK',
        jobTitle: 'Business Analyst Senior (AMOA)',
        description:
          "Business Analyst Senior freelance en finance de marché (Paris, La Défense). " +
          "10 ans d'expérience en transformation SI, Securities Lending, Repo, Forex. " +
          "CV interactif avec assistant IA.",
        url: 'https://kimsandok.com',
        email: 'dokkimsan@gmail.com',
        homeLocation: {
          '@type': 'PostalAddress',
          addressLocality: 'Paris',
          addressRegion: 'Île-de-France',
          addressCountry: 'FR',
        },
        areaServed: 'France',
        knowsLanguage: ['fr', 'en'],
        sameAs: [
          'https://www.linkedin.com/in/kim-san-dok',
          'https://github.com/ksdok',
        ],
        knowsAbout: [
          'Business Analysis',
          'AMOA',
          'Finance de marché',
          'Securities Lending',
          'Repo',
          'Forex',
          'Collatéral',
          'Transformation SI',
          'SQL',
        ],
      },
      {
        '@type': 'ProfessionalService',
        '@id': 'https://kimsandok.com/#service',
        name: 'Kim-san DOK — Business Analyst Freelance (AMOA)',
        description:
          'Consulting en business analysis et AMOA pour la finance de marché. ' +
          'Intervention en freelance sur Paris et en remote.',
        areaServed: 'France',
        url: 'https://kimsandok.com',
        founder: { '@id': 'https://kimsandok.com/#person' },
      },
    ],
  }

  return (
    <html lang="fr">
      <head>
        {/* Prevent zoom on iOS when focusing on input fields */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        {/* SECURITY: CSRF token exposed to client via meta tag (double-submit cookie pattern).
            The token is stored in an httpOnly cookie (server-side verification) and mirrored
            in this meta tag's content attribute so client components can read it and include
            it in the X-CSRF-Token header on API requests. */}
        <meta name="csrf-token" content={csrfToken} />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}