import Link from 'next/link'
import type { Lang } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/types'

interface FooterProps {
  dictionary: Dictionary
  /** GEO-08h : locale courante — le lien CV pointe vers /{lang}/cv. */
  lang: Lang
}

export default function Footer({ dictionary, lang }: FooterProps) {
  return (
    <footer className="w-full py-12 bg-transparent">
      <div className="flex flex-col md:flex-row justify-between items-center px-8 w-full max-w-7xl mx-auto gap-6 md:gap-0">
        <p className="text-[0.75rem] tracking-wider uppercase text-secondary">
          {dictionary.footer.copyright}
        </p>
        {/* PROJ-001 : 5 liens désormais (Projets + CV + LinkedIn + GitHub + E-mail).
            `flex-wrap` + gap (au lieu de `space-x-12` non wrappable) : sans lui, la
            rangée débordait horizontalement sous ~375px (le footer à 4 liens
            débordait déjà à 320px) — correction nécessaire au critère responsive. */}
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-3">
          {/* PROJ-001 (M5) : lien « Projets » en première position, cohérent avec
              le lien CV. Header et home inchangés (décision spec). */}
          <Link
            href={`/${lang}/projets`}
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.projectsLink}
          </Link>
          <Link
            href={`/${lang}/cv`}
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.cvLink}
          </Link>
          <a
            href="https://www.linkedin.com/in/kim-san-dok"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.linkedinLink}
          </a>
          <a
            href="https://github.com/ksdok"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.githubLink}
          </a>
          <a
            href="mailto:dokkimsan@gmail.com"
            className="text-[0.75rem] tracking-wider uppercase text-secondary hover:text-on-surface transition-colors"
          >
            {dictionary.footer.emailLink}
          </a>
        </div>
      </div>
    </footer>
  )
}