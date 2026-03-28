/**
 * Hero.tsx - Hero section with asymmetrical layout
 * Displays the main heading and intro text with magazine-style asymmetry
 */
export default function Hero() {
  return (
    <section className="w-full text-center mb-32 px-8 max-w-7xl mx-auto">
      {/* Metadata label */}
      <h1 className="text-secondary text-[0.75rem] tracking-[0.3em] uppercase mb-8 font-medium">
        Portfolio Showcase
      </h1>

      {/* Main heading - Editorial style with generous leading */}
      <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.1] max-w-4xl mx-auto mb-24">
        Interactive Resume <br /> via an AI Chatbot
      </h2>

      {/* Asymmetrical intro text - Grid layout */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left column (col-start-2, col-span-5) */}
        <div className="md:col-start-2 md:col-span-5">
          <p className="text-2xl text-on-surface leading-relaxed font-light">
            Explore my professional journey through a conversational interface. Ask about{' '}
            <span className="font-medium italic">the human behind</span>, technical stack, or
            recent projects.
          </p>
        </div>

        {/* Right column (col-start-8, col-span-4) - Self-end for bottom alignment */}
        <div className="md:col-start-8 md:col-span-4 self-end">
          <p className="text-secondary text-sm leading-loose">
            This experimental interface bridges the gap between static documents and human
            conversation, powered by custom LLM integration.
          </p>
        </div>
      </div>
    </section>
  )
}
