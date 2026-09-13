import Link from 'next/link'

/**
 * app/[lang]/not-found.tsx
 * GEO-08a (revue M2) : avec dynamicParams = false, les requêtes hors locales
 * déclarées (/de, /es...) tombent en 404. Sans ce fichier, la page 404 serait
 * non localisée (fallback global). Message bilingue minimal — la déclinaison
 * par dictionnaire est livrée avec GEO-08b.
 */

export default function LangNotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm tracking-widest uppercase text-muted mb-4">404</p>
      <h1 className="text-2xl font-semibold text-primary mb-2">
        Page not found
      </h1>
      <p className="text-base text-muted mb-1">Page introuvable</p>
      <Link
        href="/"
        className="text-sm underline underline-offset-4 hover:text-primary"
      >
        Back to home / Retour à l’accueil
      </Link>
    </div>
  )
}