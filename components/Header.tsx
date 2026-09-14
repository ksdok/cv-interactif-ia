'use client'

import { usePathname } from 'next/navigation'
import type { Lang } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/types'

interface HeaderProps {
  dictionary: Dictionary
  /** GEO-08f : locale de la page courante — détermine la cible du switcher. */
  lang: Lang
}

/**
 * GEO-08f — switcher de langue : un <a> natif (pas de widget JS), crawlable,
 * pointant vers la même page dans l'autre locale (le chemin est dérivé de
 * usePathname : /fr → /en, /fr/cv → /en/cv). Aucun cookie NEXT_LOCALE posé —
 * la préférence reste déduite de l'URL (cohérent avec GEO-08c, review M3).
 * Accessibilité (review N6) : hrefLang + lang (voix des lecteurs d'écran) +
 * aria-label — tous issus du dictionnaire ou de la locale cible.
 * Le href est rendu côté serveur (SSR des composants client) : le switch
 * fonctionne avec JavaScript désactivé (critère 4).
 */
export default function Header({ dictionary, lang }: HeaderProps) {
  const pathname = usePathname()
  const altLang: Lang = lang === 'fr' ? 'en' : 'fr'
  // Retire le préfixe de locale courant : '/fr' → '', '/fr/cv' → '/cv'.
  const rest = pathname.replace(new RegExp(`^/${lang}`), '') || ''
  const altHref = `/${altLang}${rest}`

  return (
    <nav className="sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-xl">
      <div className="flex justify-between items-center w-full px-8 py-6 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tracking-[-0.02em] text-on-surface">{dictionary.header.name}</span>
          <span className="text-[10px] uppercase tracking-widest text-secondary mt-1">{dictionary.header.tagline}</span>
        </div>
        {/* GEO-08f — switcher FR ↔ EN (lien natif, sans JS) */}
        <a
          href={altHref}
          hrefLang={altLang}
          lang={altLang}
          aria-label={dictionary.header.switcherAria}
          className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
        >
          {dictionary.header.switcherLabel}
        </a>
      </div>
    </nav>
  )
}