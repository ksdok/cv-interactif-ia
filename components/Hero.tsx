/**
 * Hero.tsx - Hero section with asymmetrical layout
 * Displays the main heading and intro text with magazine-style asymmetry.
 *
 * SEO-02 : le <h1> porte désormais nom + métier (Kim-san DOK / Business Analyst
 * Freelancer) au lieu du label décoratif « Portfolio Showcase », qui devient un
 * <p> pour préserver la hiérarchie des headings.
 * GEO-08b : wording bilingue via le dictionnaire passé en props.
 */
import type { Dictionary } from '@/lib/i18n/types'

interface HeroProps {
  dictionary: Dictionary
}

export default function Hero({ dictionary }: HeroProps) {
  return (
    <section className="w-full text-center mb-32 px-8 max-w-7xl mx-auto">
      {/* Metadata label — décoratif, hors hiérarchie des headings (était <h1>) */}
      <p className="text-secondary text-[0.75rem] tracking-[0.3em] uppercase mb-8 font-medium">
        {dictionary.hero.label}
      </p>

      {/* Main heading - Editorial style with generous leading.
          SEO-02 : H1 = nom + métier (était <h2> « Interactive Resume via an AI Chatbot »),
          mêmes classes que le titre d'origine pour préserver la composition. */}
      <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.1] max-w-4xl mx-auto mb-24">
        {dictionary.hero.titleName} <br /> {dictionary.hero.titleRole}
      </h1>

      {/* Asymmetrical intro text - Grid layout */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left column (col-start-2, col-span-5) */}
        <div className="md:col-start-2 md:col-span-5">
          <p className="text-[23px] text-on-surface leading-relaxed font-light">
            {dictionary.hero.introLead}
            <span className="font-medium italic">{dictionary.hero.introHighlight}</span>
            {dictionary.hero.introRest}
          </p>
        </div>

        {/* Right column (col-start-8, col-span-4) - Self-end for bottom alignment */}
        <div className="md:col-start-8 md:col-span-4 self-end">
          <p className="text-secondary text-base leading-loose">
            {dictionary.hero.aside}
          </p>
        </div>
      </div>
    </section>
  )
}