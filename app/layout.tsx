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

// SEO-01 (fast-path FR-only) : positionnement BA freelance finance de marché.
// Title front-loaded (métier d'abord, nom en suffixe) pour éviter la troncature
// Google (~60 char). Wording EN + hreflang au Lot 0 (i18n, cf. GEO-08).
const SITE_URL = 'https://kimsandok.com'
const SITE_TITLE =
  'Business Analyst Senior Freelance (AMOA) — Finance de marché | Kim-san DOK'
const SITE_DESCRIPTION =
  "Kim-san DOK, Business Analyst Senior freelance en finance de marché (Paris, La Défense). " +
  "10 ans d'expérience en transformation SI, Securities Lending, Repo, Forex. " +
  "CV interactif avec assistant IA."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Kim-san DOK',
  },
  description: SITE_DESCRIPTION,
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
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: 'Kim-san DOK — Business Analyst Freelance (AMOA)',
    // og:image + width/height/type + alt sont générés par la convention fichier
    // app/opengraph-image.png + app/opengraph-image.alt.txt. Un tableau images[]
    // ici serait ignoré par la convention fichier (alt piloté par .alt.txt).
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // twitter:image dérivé de la convention app/opengraph-image.png.
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
        '@id': `${SITE_URL}/#person`,
        name: 'Kim-san DOK',
        jobTitle: 'Business Analyst Senior (AMOA)',
        description: SITE_DESCRIPTION,
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
        '@id': `${SITE_URL}/#service`,
        name: 'Kim-san DOK — Business Analyst Freelance (AMOA)',
        description:
          'Consulting en business analysis et AMOA pour la finance de marché. ' +
          'Intervention en freelance sur Paris et en remote.',
        areaServed: 'FR',
        url: SITE_URL,
        founder: { '@id': `${SITE_URL}/#person` },
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
          // nonce est server-only (injecté par proxy.ts via x-nonce) ; le client
          // n'en dispose pas à l'hydration -> diff d'attribut attendu, on le supprime.
          suppressHydrationWarning
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