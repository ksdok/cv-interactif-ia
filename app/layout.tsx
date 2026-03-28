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
import { cookies } from 'next/headers'
import { CSRF_COOKIE_CONFIG } from '@/lib/csrf'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://kimsandok.com'),
  title: {
    default: 'Kim-san DOK | Interactive Resume',
    template: '%s | Kim-san DOK',
  },
  description: 'Interactive resume of Kim-san DOK. Explore my professional background through an AI-powered chatbot. Ask about my experience, skills, and projects.',
  keywords: ['Kim-san DOK', 'Resume', 'CV', 'Portfolio', 'AI', 'Product Design', 'React', 'TypeScript'],
  authors: [{ name: 'Kim-san DOK' }],
  creator: 'Kim-san DOK',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kimsandok.com',
    title: 'Kim-san DOK | Interactive Resume',
    description: 'Explore my professional journey through an AI chatbot. Ask about my experience, skills, and recent projects.',
    siteName: 'Kim-san DOK - Interactive Resume',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Kim-san DOK - Interactive Resume',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kim-san DOK | Interactive Resume',
    description: 'Interactive resume powered by AI. Chat with my assistant to learn more about my experience and projects.',
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
  const csrfToken = cookieStore.get(CSRF_COOKIE_CONFIG.name)?.value || ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Kim-san DOK',
    jobTitle: 'Product Designer',
    url: 'https://kimsandok.com',
    sameAs: [
      'https://www.linkedin.com/in/kim-san-dok',
      'https://github.com/ksdok',
    ],
    knowsAbout: ['Product Design', 'UI/UX', 'React', 'TypeScript', 'Design Systems'],
  }

  return (
    <html lang="en">
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
        {children}
      </body>
    </html>
  )
}