interface ExperienceGridProps {
  onOpenJobMatcher: () => void
}

export default function ExperienceGrid({ onOpenJobMatcher }: ExperienceGridProps) {
  const stack = ['Agentic Coding', 'React', 'TypeScript', 'Next.js', 'Tailwind', 'Python', 'Figma', 'Supabase']
  const humanStack = ['Empathy driven', 'Adaptable', 'Collaborative', 'AI Enthusiast']
  return (
    <section className="w-full px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">

        {/* Featured Role — 2 cols */}
        <div className="md:col-span-2 bg-surface-container-low rounded-lg p-10 flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
          <div className="z-10">
            <span className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold">Featured Role</span>
            <h3 className="text-3xl font-bold mt-4 mb-2 text-on-surface">Business Analyst</h3>
            <p className="text-secondary">@ Société Générale — 2016–Present</p>
          </div>
          <div className="mt-8 z-10">
            <p className="max-w-md text-on-surface leading-relaxed">
              Value driven solutions with a human-centered approach, adapted to the evolving landscape of finance and technology. I bridge the gap between complex data and actionable insights, ensuring that every project not only meets business objectives but also resonates with the people it serves.
            </p>
          </div>
          {/* Decorative background icon */}
          <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none select-none">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" className="text-on-surface">
              <path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z"/>
            </svg>
          </div>
        </div>

        {/* Technical Stack — 1 col */}
        <div className="bg-surface-container-highest rounded-lg p-10 flex flex-col justify-between">
          <div>
            <span className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold">Human Stack</span>
            <div className="mt-6 flex flex-wrap gap-2">
              {humanStack.map((humanStack) => (
                <span key={humanStack} className="bg-surface-container-lowest px-3 py-1 rounded text-xs font-medium text-on-surface">
                  {humanStack}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold">Project Technical Stack</span>
            <div className="mt-6 flex flex-wrap gap-2">
              {stack.map((skill) => (
                <span key={skill} className="bg-surface-container-lowest px-3 py-1 rounded text-xs font-medium text-on-surface">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <a
              href="https://github.com/ksdok"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-on-surface hover:text-secondary transition-colors underline underline-offset-8"
            >
              View GitHub
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Burning passions — 1 col */}
        <div className="bg-surface-container-lowest rounded-lg p-10 md:col-span-1 shadow-sm flex flex-col group overflow-hidden relative">
          <span className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-6">Burning passions</span>
          <p className="text-lg font-bold text-on-surface">Bike &amp; Food</p>
          <p className="text-secondary text-sm">Ride, sweat and eat</p>
          <p className="text-lg font-bold text-on-surface">Cats</p>
          <p className="text-secondary text-sm">I trust in Cat Distribution System</p>
          {/* Decorative background flame */}
          <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none select-none">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" className="text-on-surface">
              <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
            </svg>
          </div>
        </div>

        {/* Job Matcher — 2 cols */}
        <div className="md:col-span-2 bg-surface-container-low rounded-lg p-10 flex flex-col justify-between group overflow-hidden relative">
          <div className="z-10">
            <span className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold">Test Your Fit</span>
            <h3 className="text-3xl font-bold mt-4 mb-2 text-on-surface">Match a Job</h3>
            <p className="text-secondary text-sm">AI-powered resume analysis</p>
          </div>
          <div className="mt-8 z-10">
            <p className="max-w-md text-on-surface leading-relaxed mb-8">
              Paste any job description and get an instant analysis of how well your profile matches the role.
            </p>
            <button
              onClick={onOpenJobMatcher}
              className="px-8 py-4 bg-primary text-on-primary rounded-full text-sm font-bold hover:opacity-80 active:scale-95 transition-all"
            >
              Open Matcher
            </button>
          </div>
          {/* Decorative background icon */}
          <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none select-none">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" className="text-on-surface">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
        </div>

        {/* CTA — 3 cols full width, dark card */}
        <div className="md:col-span-3 bg-on-background rounded-lg p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div className="max-w-md">
            <h3 className="text-2xl font-bold mb-4 text-on-primary">Ready to collaborate?</h3>
            <p className="text-secondary-fixed-dim text-sm leading-relaxed">
              I&apos;m not yet available but open for opportunities.
            </p>
          </div>
          <a
            href="mailto:dokkimsan@gmail.com"
            className="shrink-0 bg-surface-container-lowest text-on-surface px-8 py-4 rounded font-bold hover:bg-surface-container-low transition-colors text-sm"
          >
            Say Hello
          </a>
        </div>

      </div>
    </section>
  )
}
