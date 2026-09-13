import { headers } from 'next/headers'
import Link from 'next/link'
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/config'

/**
 * app/not-found.tsx — frontière 404 à la racine (GEO-08a, review B1).
 *
 * Pourquoi ici et pas dans app/[lang]/ : avec dynamicParams = false, une URL
 * hors locales déclarées (/de, /es...) est rejetée AU niveau du segment [lang] —
 * son layout et sa frontière not-found ne sont jamais rendus ; Next sert sinon
 * le 404 par défaut (anglais, non localisé). Un not-found racine couvre tous les
 * 404 (params [lang] invalides ET routes inexistantes type /fr/cv avant GEO-08h),
 * avec une locale déduite du header x-locale posé par proxy.ts.
 *
 * Message bilingue minimal — déclinaison par dictionnaire à GEO-08b.
 * Le lien de retour vise /{locale} et non / (nit review : / ne fait que
 * re-négocier la locale via Accept-Language).
 */
export default async function NotFound() {
  const headerList = await headers()
  const headerLocale = headerList.get('x-locale')
  const lang = isLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm tracking-widest uppercase text-muted mb-4">404</p>
      <h1 className="text-2xl font-semibold text-primary mb-2">
        Page not found
      </h1>
      <p className="text-base text-muted mb-1">Page introuvable</p>
      <Link
        href={`/${lang}`}
        className="text-sm underline underline-offset-4 hover:text-primary"
      >
        Back to home / Retour à l’accueil
      </Link>
    </div>
  )
}