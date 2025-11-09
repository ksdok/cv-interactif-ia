// ============================================
// FICHIER 2: app/layout.tsx
// Layout principal de l'application
// ============================================

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CV Interactif IA',
  description: 'Mon CV interactif propulsé par l\'intelligence artificielle',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
        {/* Vercel Analytics pour suivre les visites et le comportement utilisateur */}
        <Analytics />
      </body>
    </html>
  )
}