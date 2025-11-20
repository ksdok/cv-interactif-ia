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
import { ThemeProvider } from '@/components/ThemeProvider'
import { LanguageProvider } from '@/lib/LanguageContext'
import { cookies } from 'next/headers'
import { CSRF_COOKIE_CONFIG } from '@/lib/csrf'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://kimsandok.com'),
  title: {
    default: 'Kim-san DOK | Business Analyst & Passionné d\'IA',
    template: '%s | Kim-san DOK',
  },
  description: 'CV interactif de Kim-san DOK, Business Analyst & Passionné d\'IA. Expert en RAG, Agents IA, Workflow automatisé et n8n. Discutez avec mon assistant IA pour en savoir plus.',
  keywords: ['Kim-san DOK', 'Passionné d\'IA', 'Business Analyst', 'RAG', 'Agents IA', 'Workflow automatisé', 'React', 'TypeScript', 'n8n', 'Société Générale'],
  authors: [{ name: 'Kim-san DOK' }],
  creator: 'Kim-san DOK',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://kimsandok.com',
    title: 'Kim-san DOK | Business Analyst & Passionné d\'IA',
    description: 'Découvrez le CV interactif de Kim-san DOK. Discutez avec mon assistant IA pour explorer mes compétences en RAG, Agents IA et workflows automatisés.',
    siteName: 'Kim-san DOK - CV Interactif',
    images: [
      {
        url: '/opengraph-image.png', // TODO: Create this image in public/ or app/
        width: 1200,
        height: 630,
        alt: 'Kim-san DOK - CV Interactif',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kim-san DOK | Business Analyst & Passionné d\'IA',
    description: 'CV interactif propulsé par l\'IA. Discutez avec mon assistant pour en savoir plus sur mon travail en RAG et Agents IA.',
    images: ['/opengraph-image.png'], // TODO: Create this image
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
  const csrfToken = cookieStore.get(CSRF_COOKIE_CONFIG.name)?.value || ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Kim-san DOK',
    jobTitle: 'Business Analyst & Passionné d\'IA',
    worksFor: {
      '@type': 'Organization',
      name: 'Société Générale',
    },
    url: 'https://kimsandok.com',
    sameAs: [
      // TODO: Add actual social links
      'https://www.linkedin.com/in/kim-san-dok', // Placeholder
      'https://github.com/kimsandok', // Placeholder
    ],
    knowsAbout: ['Intelligence Artificielle', 'RAG', 'Agents IA', 'Workflow automatisé', 'React', 'TypeScript', 'n8n'],
  }

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Prevent zoom on iOS when focusing on input fields */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        {/* SECURITY: Embed CSRF token in meta tag for client access
            The token is in a data attribute, not directly accessible to JavaScript in older browsers.
            Client components will read this meta tag and use the token in API requests. */}
        <meta name="csrf-token" content={csrfToken} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}