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
import { localeFromHeaders } from '@/lib/i18n/config'
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
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

// Title : nom d'abord (préférence utilisateur), puis métier. GEO-08d : le
// wording normatif vit désormais dans lib/i18n/{fr,en}.ts (metadata par
// locale) ; ces constantes sont le fallback FR (dérivé du dictionnaire via
// lib/site.ts) servi aux routes hors [lang] : not-found racine. Constantes
// partagées avec app/sitemap.ts.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Kim-san DOK',
  },
  description: SITE_DESCRIPTION,
  // Review M4 (Lot 1) : keywords dérivés du dictionnaire (lib/site.ts),
  // pas recopiés — source unique du wording.
  keywords: SITE_KEYWORDS,
  authors: [{ name: 'Kim-san DOK' }],
  creator: 'Kim-san DOK',
  openGraph: {
    type: 'website',
    // Fallback FR : le root layout ne sert plus que des routes hors [lang]
    // (not-found racine depuis la migration /cv de GEO-08h) et les 404.
    locale: 'fr_FR',
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    // og:image : la convention fichier (app/opengraph-image.png + .alt.txt)
    // s'applique QU'AUX segments qui ne redéclarent PAS openGraph (cas du
    // root layout : /de, 404 — image servie, mesuré review M3 Lot 1). Un
    // segment qui redéclare openGraph fait tomber l'image et doit la
    // déclarer explicitement : app/[lang]/layout.tsx et app/[lang]/cv/page.tsx
    // le font (review M3) — l'alt y est traduit (alt.txt est FR-only).
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
  // Fallback : /fr et /en surchargent (canonical par locale, GEO-08d), les
  // pages CV surchargent (pattern GEO-08d, GEO-08h).
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
  // GEO-08a (option A) : la locale est injectée par proxy.ts via le header
  // x-locale (même pattern que x-nonce), toujours dérivée du préfixe de chemin
  // (revue M2 — le préfixe gagne, pas Accept-Language). Le root layout est
  // conservé minimal — déplacer <html> sous app/[lang]/ casserait les routes
  // hors [lang] (pas de root layout, erreur fatale Next 16). Fallback fr si le
  // header est absent.
  // GEO-08d : le JSON-LD (Person + ProfessionalService) a été déplacé dans
  // app/[lang]/layout.tsx — wording traduit par locale, mêmes @id (critères 2
  // et 3 GEO-08d). GEO-08h : /cv a été migré sous app/[lang]/cv — il hérite
  // désormais du JSON-LD du segment (plus de page hors [lang] avec contenu).
  const headerLocale = headersList.get('x-locale')
  const lang = localeFromHeaders(headerLocale)

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
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}