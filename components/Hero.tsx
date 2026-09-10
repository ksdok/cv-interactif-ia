/**
 * Hero.tsx - Hero section with asymmetrical layout
 * Displays the main heading and intro text with magazine-style asymmetry.
 *
 * SEO-02 : le <h1> porte désormais nom + métier (Kim-san DOK / Business Analyst
 * Freelancer) au lieu du label décoratif « Portfolio Showcase », qui devient un
 * <p> pour préserver la hiérarchie des headings. Wording EN pour matcher le reste
 * du site (fast-path) ; déclinaison FR reportée au Lot 0 (GEO-08).
 */
export default function Hero() {
  return (
    <section className="w-full text-center mb-32 px-8 max-w-7xl mx-auto">
      {/* Metadata label — décoratif, hors hiérarchie des headings (était <h1>) */}
      <p className="text-secondary text-[0.75rem] tracking-[0.3em] uppercase mb-8 font-medium">
        Portfolio Showcase
      </p>

      {/* Main heading - Editorial style with generous leading.
          SEO-02 : H1 = nom + métier (était <h2> « Interactive Resume via an AI Chatbot »),
          mêmes classes que le titre d'origine pour préserver la composition. */}
      <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.1] max-w-4xl mx-auto mb-24">
        Kim-san DOK <br /> Business Analyst Freelancer
      </h1>

      {/* Asymmetrical intro text - Grid layout */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left column (col-start-2, col-span-5) */}
        <div className="md:col-start-2 md:col-span-5">
          <p className="text-[23px] text-on-surface leading-relaxed font-light">
            Explore my professional journey through a conversational interface — Senior Business
            Analyst in <span className="font-medium italic">market finance</span> (Paris),
            specialized in Securities Lending, Repo, and Forex. Ask about my background, technical
            stack, or recent projects.
          </p>
        </div>

        {/* Right column (col-start-8, col-span-4) - Self-end for bottom alignment */}
        <div className="md:col-start-8 md:col-span-4 self-end">
          <p className="text-secondary text-base leading-loose">
            This experimental interface bridges the gap between static documents and human
            conversation, powered by custom LLM integration.
          </p>
        </div>
      </div>
    </section>
  )
}