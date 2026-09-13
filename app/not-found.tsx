import { headers } from 'next/headers'
import Link from 'next/link'
import { localeFromHeaders } from '@/lib/i18n/config'
import { getDictionary } from '@/lib/i18n/dictionaries'

/**
 * app/not-found.tsx — frontière 404 à la racine (GEO-08a, review B1).
 *
 * Pourquoi ici et pas dans app/[lang]/ : avec un param [lang] invalide, le
 * segment est rejeté avant rendu — sa frontière not-found ne serait jamais
 * montée. Un not-found racine couvre tous les 404 (params [lang] invalides ET
 * routes inexistantes type /fr/cv avant GEO-08h), avec une locale déduite du
 * header x-locale posé par proxy.ts.
 *
 * GEO-08b : le message est rendu via le dictionnaire de la locale (plus de
 * message bilingue en dur). Le lien de retour vise /{locale} et non / (nit
 * review : / ne fait que re-négocier la locale via Accept-Language).
 */
export default async function NotFound() {
  const headerList = await headers()
  const lang = localeFromHeaders(headerList.get('x-locale'))
  const dictionary = getDictionary(lang)

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm tracking-widest uppercase text-muted mb-4">404</p>
      <h1 className="text-2xl font-semibold text-primary mb-2">
        {dictionary.notFound.title}
      </h1>
      <Link
        href={`/${lang}`}
        className="text-sm underline underline-offset-4 hover:text-primary"
      >
        {dictionary.notFound.back}
      </Link>
    </div>
  )
}