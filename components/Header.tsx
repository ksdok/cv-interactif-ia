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
  // PROJ-001 : actif sur le hub Projets ET ses pages détail (/projets/<slug>),
  // même convention que le switcher qui dérive `rest` du pathname.
  const isProjectsActive = rest === '/projets' || rest.startsWith('/projets/')
  const switcherAria = { fr: dictionary.header.switcherAriaFr, en: dictionary.header.switcherAriaEn }
  // M1 (review c150986, WCAG 2.5.3 Label in Name) : le nom accessible du lien
  // logo DOIT contenir le libellé visible (« Kim-san DOK ») — on compose donc
  // name + homeLinkAria au lieu de remplacer le texte visible par l'aria-label.
  const homeAria = `${dictionary.header.name} — ${dictionary.header.homeLinkAria}`

  return (
    <nav className="sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-xl">
      {/* B1 (review c150986) : gap resserré sous sm — le cluster CV|FR/EN
          consommait ~60 px en permanence et faisait passer la tagline sur 2
          lignes dès 375 px. */}
      <div className="flex justify-between items-center w-full px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {/* Logo — lien vers la home de la locale courante (l'ensemble
            name + tagline est cliquable ; nom accessible composé ci-dessus,
            conforme WCAG 2.5.3) */}
        <a
          href={`/${lang}`}
          aria-label={homeAria}
          className="flex flex-col"
        >
          <span className="text-xl xs:text-2xl font-semibold tracking-[-0.02em] text-on-surface">{dictionary.header.name}</span>
          {/* B1 : tagline masquée sous sm — non essentielle, rétablissait un
              header de 114 px (2 lignes) sur les mobiles ≤ 414 px. */}
          <span className="hidden sm:block text-[10px] uppercase tracking-widest text-secondary mt-1">{dictionary.header.tagline}</span>
        </a>
        <div className="flex items-center gap-2 xs:gap-3 sm:gap-6 text-[0.75rem] tracking-wider uppercase">
          {/* Lien CV — page locale courante (GEO-08h). N5 (review c150986) :
              invariant = Next 16 ne sert pas de trailing slash (redirige), donc
              l'égalité stricte rest === '/cv' est correcte ; si une sous-page
              /cv/<x> apparaissait, étendre le test. */}
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
          {/* PROJ-001 — lien Projets (second après le CV, destination principale).
              Mêmes classes que le lien CV : traitement visuel identique (pas de
              redondance de style), actif sur le hub et les pages détail. */}
          <a
            href={`/${lang}/projets`}
            aria-label={dictionary.header.projectsLinkAria}
            aria-current={isProjectsActive ? 'page' : undefined}
            className={
              isProjectsActive
                ? 'font-semibold text-on-surface'
                : 'text-secondary hover:text-on-surface transition-colors'
            }
          >
            {dictionary.header.projectsLink}
          </a>
          {/* Séparateur CV | switcher — décoratif, exclu du tree d'accessibilité */}
          <span aria-hidden="true" className="h-4 w-px bg-surface-variant" />
          {/* GEO-08f — switcher FR / EN, highlight sur la locale active.
              M2 (review c150986) : sur /fr/cv, ce lien FR et le lien CV portent
              tous deux aria-current="page" vers le même href — assumé : le
              switcher désigne la page courante dans l'ensemble des locales
              (convention GEO-08f validée itération 2), le lien CV désigne la
              page courante du site. */}
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