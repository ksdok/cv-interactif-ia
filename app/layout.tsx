/**
 * app/layout.tsx
 * Root layout for the application
 *
 * SECURITY: This layout embeds the CSRF token in a meta tag
 * so client components can read it for form submissions.
 * The actual token is stored securely in httpOnly cookie by middleware.
 */

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cookies, headers } from 'next/headers'
import { CSRF_COOKIE_CONFIG } from '@/lib/csrf'
import { DEFAULT_LOCALE, isLocale, type Lang } from '@/lib/i18n/config'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from '@/lib/site'

const inter = Inter({ subsets: ['latin'] })

// TECH-10 : viewport déclaré via l'export Next.js (une seule meta dans le HTML servi).
// Pas de maximumScale/user-scalable (WCAG 1.4.4 — zoom utilisateur préservé) ;
// le zoom iOS sur focus input est évité par font-size ≥ 16px sur les champs de
// saisie (ChatPreview text-xl, JobMatcher text-base).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Title : nom d'abord (préférence utilisateur), puis métier. Wording EN + hreflang
// au Lot 0 (i18n, cf. GEO-08). Constantes wordées dans lib/site.ts (source unique,
// partagées avec app/[lang]/layout.tsx et app/sitemap.ts).

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
    siteName: SITE_NAME,
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
  // SEO-04 : canonical du domaine canonique. Le domaine preview vercel.app est
  // redirigé (301) vers kimsandok.com dans proxy.ts — pas de duplicate content.
  // Les pages qui surchargent (ex. /cv) définissent leur propre canonical.
  alternates: {
    canonical: SITE_URL,
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
  // GEO-08a (option A) : la locale est injectée par proxy.ts via le header
  // x-locale (même pattern que x-nonce), toujours dérivée du préfixe de chemin
  // (revue M2 — le préfixe gagne, pas Accept-Language). Le root layout est
  // conservé minimal — déplacer <html> sous app/[lang]/ casserait app/cv (pas
  // de root layout, erreur fatale Next 16). Fallback fr si le header est absent.
  const headerLocale = headersList.get('x-locale')
  const lang: Lang = isLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE

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
    <html lang={lang}>
      <head>
        {/* TECH-10 : la meta viewport est générée par l'export `viewport` ci-dessus —
            ne pas remettre une meta manuelle (doublon + maximum-scale bloque le zoom). */}
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