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
import { cookies } from 'next/headers'
import { CSRF_COOKIE_CONFIG } from '@/lib/csrf'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CV Interactif IA',
  description: 'Mon CV interactif propulsé par l\'intelligence artificielle',
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

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Empêcher le zoom sur iOS lors du focus sur les inputs */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        {/* SECURITY: Embed CSRF token in meta tag for client access
            The token is in a data attribute, not directly accessible to JavaScript in older browsers.
            Client components will read this meta tag and use the token in API requests. */}
        <meta name="csrf-token" content={csrfToken} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}