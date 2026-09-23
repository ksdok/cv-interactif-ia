'use client'

import { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import { LANGUAGES, type Lang } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/types'

interface HeaderProps {
  dictionary: Dictionary
  /** GEO-08f : locale de la page courante — highlight du switcher. */
  lang: Lang
}

/**
 * GEO-08f — switcher de langue : les DEUX locales affichées (FR / EN),
 * highlight sur la langue active (préférence utilisateur, 2026-09-14).
 * Deux <a> natifs (pas de widget JS), crawlables tous les deux — Google
 * découvre les deux locales depuis chaque page. La locale active porte
 * aria-current="page" (lecteurs d'écran) et reste un lien (pas de state JS).
 * Aucun cookie NEXT_LOCALE posé — préférence déduite de l'URL (GEO-08c).
 * Accessibilité (review N6) : hrefLang + lang (voix des lecteurs d'écran) +
 * aria-label par locale cible (dictionnaire, annonce dans la langue cible).
 * Le href est rendu côté serveur (SSR des composants client) : le switch
 * fonctionne avec JavaScript désactivé (critère 4).
 */
export default function Header({ dictionary, lang }: HeaderProps) {
  const pathname = usePathname()
  // Retire le préfixe de locale courant : '/fr' → '', '/fr/cv' → '/cv'.
  const rest = pathname.replace(new RegExp(`^/${lang}`), '') || ''
  const switcherAria = { fr: dictionary.header.switcherAriaFr, en: dictionary.header.switcherAriaEn }

  return (
    <nav className="sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-xl">
      <div className="flex justify-between items-center w-full px-8 py-6 max-w-7xl mx-auto">
        {/* Logo — lien vers la home de la locale courante (l'ensemble
            name + tagline est cliquable, tree d'accessibilité porté par
            l'aria-label du lien) */}
        <a
          href={`/${lang}`}
          aria-label={dictionary.header.homeLinkAria}
          className="flex flex-col"
        >
          <span className="text-2xl font-semibold tracking-[-0.02em] text-on-surface">{dictionary.header.name}</span>
          <span className="text-[10px] uppercase tracking-widest text-secondary mt-1">{dictionary.header.tagline}</span>
        </a>
        <div className="flex items-center gap-6 text-[0.75rem] tracking-wider uppercase">
          {/* Lien CV — page locale courante (GEO-08h), highlight si déjà sur /cv */}
          <a
            href={`/${lang}/cv`}
            aria-label={dictionary.header.cvLinkAria}
            aria-current={rest === '/cv' ? 'page' : undefined}
            className={
              rest === '/cv'
                ? 'font-semibold text-on-surface'
                : 'text-secondary hover:text-on-surface transition-colors'
            }
          >
            {dictionary.header.cvLink}
          </a>
          {/* Séparateur CV | switcher — décoratif, exclu du tree d'accessibilité */}
          <span aria-hidden="true" className="h-4 w-px bg-surface-variant" />
          {/* GEO-08f — switcher FR / EN, highlight sur la locale active */}
          <div className="flex items-center gap-2">
          {LANGUAGES.map((l, i) => (
            <Fragment key={l}>
              {i > 0 && <span aria-hidden="true" className="text-surface-variant">{'/'}</span>}
              <a
                href={`/${l}${rest}`}
                hrefLang={l}
                lang={l}
                aria-label={switcherAria[l]}
                aria-current={l === lang ? 'page' : undefined}
                className={
                  l === lang
                    ? 'font-semibold text-on-surface'
                    : 'text-secondary hover:text-on-surface transition-colors'
                }
              >
                {l.toUpperCase()}
              </a>
            </Fragment>
          ))}
          </div>
        </div>
      </div>
    </nav>
  )
}