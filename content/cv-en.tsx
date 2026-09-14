// content/cv-en.tsx
// SEO-03 — Editorial EN CV content (fast-path).
// Distinct from data/cv.md (FR, chatbot source). Bilingue /fr/cv + /en/cv reporté au Lot 0 (GEO-08).
//
// Co-édité : ajuster le wording directement ici. La page app/cv/page.tsx ne gère que
// le metadata + le shell de page.

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n/config'

const KICKER = 'text-[0.7rem] uppercase tracking-[0.3em] text-secondary font-semibold'
const SECTION_TITLE = 'text-3xl md:text-4xl font-bold tracking-tighter text-on-surface mt-2 mb-10'
const BODY = 'text-on-surface-variant leading-relaxed'

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-24">
      <span className={KICKER}>{kicker}</span>
      <h2 className={SECTION_TITLE}>{title}</h2>
      {children}
    </section>
  )
}

export default function CvContentEn({ lang }: { lang: Lang }) {
  return (
    <div className="max-w-5xl mx-auto px-8 py-24">
      {/* ---------------------------------------------------------------- Header */}
      <header className="mb-24">
        <span className={KICKER}>Curriculum Vitae</span>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-[1.05] mt-2 mb-6">
          Kim-san DOK
        </h1>
        <p className="text-xl md:text-2xl text-on-surface font-light leading-relaxed max-w-3xl">
          Senior Business Analyst Freelancer · AMOA · Market Finance — 10 years bridging
          business and IT on mission-critical trading &amp; post-trade systems.
        </p>
        <p className="text-secondary text-sm mt-6">
          Paris, France · dokkimsan@gmail.com · kimsandok.com
        </p>
      </header>

      {/* ---------------------------------------------------------------- Profile */}
      <Section id="profile" kicker="Profile" title="Senior Business Analyst, Market Finance">
        <p className={`${BODY} text-xl`}>
          Senior Business Analyst with{' '}
          <strong className="text-on-surface">10 years of experience in market finance</strong>,
          operating on high-volume, mission-critical trading and post-trade systems at Société
          Générale. Specialized in simplifying complex IT landscapes, reducing costs, and securing
          front-to-back processes — bridging business and IT teams to deliver robust, scalable,
          production-ready solutions across{' '}
          <strong className="text-on-surface">
            Securities Lending, Repo, Forex, and Hedging
          </strong>
          .
        </p>
      </Section>

      {/* ---------------------------------------------------------------- Key figures */}
      <Section id="key-figures" kicker="By the numbers" title="Selected impact">
        <div className="overflow-hidden border border-surface-variant rounded-lg">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-surface-variant">
              <Figure figure="10 years" context="Market finance Business Analyst" />
              <Figure figure="500 000€/yr saved" context="Replacing Kondor+ and K+TP (Front + Back Office) with in-house solutions" />
              <Figure figure="Opening new business lines" context="Migrating 4Sight Financial to SFCM" />
            </tbody>
          </table>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Expertise */}
      <Section id="expertise" kicker="Expertise" title="Three focus areas">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-variant border border-surface-variant rounded-lg overflow-hidden">
          <ExpertiseCol
            label="Market Finance"
            items={['Securities Lending', 'Repo', 'Forex', 'Hedging', 'Triparty', 'Collateral', 'Corporate Actions (OST)', 'Settlement', 'Billing', 'Referential data']}
          />
          <ExpertiseCol
            label="Business Analysis / AMOA"
            items={['Requirements elicitation', 'Process mapping', 'Functional specifications', 'UAT / Recette', 'KPIs & Monitoring', 'Critical incident management']}
          />
          <ExpertiseCol
            label="Tools & Tech"
            items={['SFCM Broadridge', 'Kondor+', 'TIBCO BusinessWorks', 'SQL', 'Unix Shell', 'Java', 'Agile / Scrum', 'PSM I', 'BDD', 'Generative AI for specs & UAT']}
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Experience */}
      <Section id="experience" kicker="Experience" title="6 roles over 10 years">
        <div className="space-y-16">
          <Article
            role="Senior SI Analyst — Securities Lending, Repo & Triparty"
            org="Société Générale, La Défense"
            dates="Jul 2025 – Jun 2026"
            context="Engagement on X-One Secloan, a global mission-critical application used for Repo, Securities Lending, Triparty and collateral by Front Office and Sales teams (US, Europe, Asia), covering the full trade lifecycle."
            points={[
              'Contributed to the migration of Repo, Securities Lending, Triparty and collateral settlement management to the GTPM solution (Broadridge); ran workshops with the vendor to formalize needs and arbitrate functional tradeoffs.',
              'Scoped platform scalability for 14 M transactions/yr with ×4 load growth — identified fragility points (databases, critical batch jobs) and prioritized corrective actions to uphold SLAs.',
              'Introduced process-level monitoring to anticipate incidents and secure production; formalized documentation to reduce reliance on tacit knowledge.',
              'Aligned X-One applicative design with group standards — favored component reusability and tech-debt reduction.',
              'Mapped front-to-back processes and defined KPIs to clarify ownership and steer operational performance.',
            ]}
          />
          <Article
            role="Senior SI Analyst — Forex / Hedging"
            org="Société Générale"
            dates="Jun 2022 – Jul 2025"
            context="Functional referent on Forex, Share Class Hedging and Multi-Currency Hedging, in a context of transformation and simplification of the information system."
            points={[
              'Key role in replacing Kondor+ (Front Office) and K+TP (Back Office) with in-house solutions — about 500 000€/yr saved in license and support costs and a significant simplification of the SI architecture.',
              'Covered the full project lifecycle (requirements, specifications, test phases, deployment) to secure deliveries on critical flows.',
              'Drove organizational transformation — refocused the activity on Front Office while Back Office functions were mutualized and transferred to X-One FX.',
              'Migrated Solaris environments to Red Hat Linux to improve maintainability and cut run costs by 500 000€/yr.',
            ]}
          />
          <Article
            role="SI Analyst — Agency Securities Lending"
            org="Société Générale"
            dates="Jun 2016 – Jun 2022"
            context="Techno-functional referent on securities lending/borrowing and cash reinvestment activities, with direct interactions with Front Office and Middle/Back Office (settlement, collateral, billing, OST, reference data)."
            points={[
              'Handled critical market flows under cut-off constraints, notably intraday-maturity cash reinvestment operations.',
              'Key role in migrating the 4Sight Financial trading platform to SFCM — unlocked new activities (Repo and Triparty) and expanded the business perimeter.',
              'Ran workshops with Broadridge to adapt the solution to business needs and accompany functional evolutions.',
              'Covered the full project lifecycle (framing, specifications, tests, deployment) to secure production rollouts.',
              'Onboarded new internal and external clients, coordinating business, IT and support teams for a safe go-live.',
              'Modernized TIBCO processing (Solaris → Red Hat Linux, version upgrades) to handle MX messages and reduce maintenance costs.',
            ]}
          />
          <Article
            role="Fund Reference Data Administration"
            org="BNP Paribas Securities & Services, Pantin"
            dates="Nov 2014 – May 2016"
            context="Member of a reference-data team in charge of price management for fund valuation."
            points={[
              'Ensured consistency of financial information from providers (Bloomberg, Reuters).',
              'Controlled the integration of prices (client and provider) into internal tools.',
              'Analyzed and developed specific services for new-client onboarding.',
              'Implemented new control policies and production processes for continuous improvement.',
              'Success: automated the retrieval and validation of prices from Reuters.',
            ]}
          />
          <Article
            role="Web Developer"
            org="University of New South Wales, Sydney, Australia"
            dates="Aug 2013 – Aug 2014"
            context='Member of the "New Financial Services" research group led by Prof. Fethi Rahbi.'
            points={[
              'Built a web application (D3.js) to visualize corporate-action impacts across markets via interactive graphs.',
              'Developed a Java tool to retrieve, extract and clean financial data from Reuters.',
              'Success: the web app was used in demonstrations to the professor’s research sponsors.',
            ]}
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Skills & Certs */}
      <Section id="skills" kicker="Skills & Certifications" title="Toolkit">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <SkillRow term="Certifications" items={['Professional Scrum Master I (PSM I)']} />
          <SkillRow term="Spoken languages" items={['English — fluent (TOEIC 895)', 'Khmer — fluent', 'French — fluent', 'Japanese — beginner']} />
          <SkillRow term="Programming" items={['SQL', 'Unix shell', 'Java', 'HTML', 'CSS']} />
          <SkillRow term="Software" items={['SFCM Broadridge', 'Kondor+', 'TIBCO BusinessWorks']} />
        </dl>
      </Section>

      {/* ---------------------------------------------------------------- Education */}
      <Section id="education" kicker="Education" title="Academic background">
        <ul className="space-y-6">
          <EduRow degree="Master — Management of Information Systems" school="ESIEE Paris, Champs-sur-Marne" years="2012 – 2014" />
          <EduRow degree="Licence — Mathematics & Computer Science" school="Université de Marne-la-Vallée, Champs-sur-Marne" years="2011 – 2012" />
          <EduRow degree="DUT — Computer Science" school="IUT de Villetaneuse, Paris 13" years="2011" />
        </ul>
      </Section>

      {/* ---------------------------------------------------------------- Personal projects */}
      <Section id="projects" kicker="Side projects" title="Built outside the day job">
        <div className="space-y-8">
          <Project
            name="Interactive AI CV"
            what="This site — recruiters chat with an AI assistant (Nicky) to ask questions about the candidate. Answers are grounded in the real CV via CAG (Cache-Augmented Generation), with provider-side prompt caching to cut cost and latency."
            stack="Next.js 16, TypeScript, Tailwind 4, Supabase (pgvector), Vercel — multi-provider OpenAI/Gemini with automatic fallback. Includes a Job Matcher scoring CV-vs-offer fit."
            url="github.com/ksdok/cv-interactif-ia"
          />
          <Project
            name="Menu Renzu"
            what="iOS app that reads restaurant menus from any country with AI vision — snap one or more menu photos, get original text, romanization, translation, categories and prices, then build an order and have it read aloud in the menu's language. Multi-photo sessions with dedup merge, BYOK (keys in Keychain) or an App Attest-hardened Cloudflare Worker proxy."
            stack="Swift / SwiftUI (MVVM, iOS 16+), Gemini 2.5 Flash-Lite Vision with GPT-4o Vision fallback, TTS OpenAI / ElevenLabs, Cloudflare Workers + App Attest, SwiftData, String Catalog EN/FR/KM — 599 Swift tests + 243 Worker tests."
            url="menurenzu.app"
          />
          <Project
            name="YouTube Audio Converter"
            what="Modular Bash script to extract audio from YouTube videos and convert to MP3 at max quality. Multi-source (single URL, multiple, text file), playlist mode, dedup, dry-run preview, interactive assistant."
            stack="yt-dlp + ffmpeg — installable via install.sh."
            url="github.com/ksdok/youtube-audio-converter"
          />
          <Project
            name="Hermes Skills"
            what="Collection of skills for Hermes Agent (Nous Research). Each skill is a reusable module with its SKILL.md (YAML frontmatter + markdown)."
            stack="Markdown / YAML."
            url="github.com/ksdok/hermes-skills"
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- Interests */}
      <Section id="interests" kicker="Beyond work" title="Interests">
        <ul className="space-y-3 text-on-surface-variant">
          <li><span className="text-on-surface font-medium">Cycling</span> — mountain cols with friends.</li>
          <li><span className="text-on-surface font-medium">Running</span> — Paris Marathon, Paris semi-marathon, Oxy’Trail, Paris 10KM.</li>
        </ul>
      </Section>

      {/* ---------------------------------------------------------------- Contact */}
      <Section id="contact" kicker="Contact" title="Let’s talk">
        <p className={BODY}>
          Available for Business Analyst / AMOA freelance missions in market finance. Reach out
          to discuss your needs:
        </p>
        <ul className="mt-6 space-y-2 text-on-surface">
          <li>Email: <a className="underline decoration-surface-variant underline-offset-4 hover:text-secondary" href="mailto:dokkimsan@gmail.com">dokkimsan@gmail.com</a></li>
          <li>Site: <a className="underline decoration-surface-variant underline-offset-4 hover:text-secondary" href="https://kimsandok.com">kimsandok.com</a></li>
        </ul>
        <p className="mt-10 text-secondary text-sm">
          Prefer a conversation?{' '}
          <Link className="underline underline-offset-4 hover:text-on-surface" href={`/${lang}`}>
            Chat with Nicky, my AI digital twin →
          </Link>
        </p>
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ helpers */

function Figure({ figure, context }: { figure: string; context: string }) {
  return (
    <tr className="bg-surface-container-lowest">
      <th scope="row" className="font-semibold text-on-surface px-5 py-4 align-top text-left">
        {context}
      </th>
      <td className="text-on-surface-variant px-5 py-4 text-right whitespace-nowrap w-[40%]">{figure}</td>
    </tr>
  )
}

function ExpertiseCol({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="bg-surface-container-lowest p-6">
      <h3 className="text-on-surface font-semibold mb-4">{label}</h3>
      <ul className="space-y-2 text-sm text-on-surface-variant">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

function Article({ role, org, dates, context, points }: { role: string; org: string; dates: string; context: string; points: string[] }) {
  return (
    <article>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-1">
        <h3 className="text-xl font-semibold text-on-surface tracking-tight">{role}</h3>
        <time className="text-secondary text-sm whitespace-nowrap">{dates}</time>
      </div>
      <p className="text-secondary text-sm mb-4">{org}</p>
      <p className={`${BODY} mb-5`}>{context}</p>
      <ul className="space-y-3 text-on-surface-variant">
        {points.map((p, i) => (
          <li key={i} className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-2 before:h-px before:bg-secondary">
            {p}
          </li>
        ))}
      </ul>
    </article>
  )
}

function SkillRow({ term, items }: { term: string; items: string[] }) {
  return (
    <div>
      <dt className="text-secondary text-sm uppercase tracking-wider mb-2">{term}</dt>
      <dd className="text-on-surface">{items.join(' · ')}</dd>
    </div>
  )
}

function EduRow({ degree, school, years }: { degree: string; school: string; years: string }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-surface-variant pb-4">
      <div>
        <p className="text-on-surface font-medium">{degree}</p>
        <p className="text-secondary text-sm">{school}</p>
      </div>
      <time className="text-secondary text-sm">{years}</time>
    </li>
  )
}

function Project({ name, what, stack, url }: { name: string; what: string; stack: string; url: string }) {
  return (
    <article>
      <h3 className="text-lg font-semibold text-on-surface tracking-tight mb-2">{name}</h3>
      <p className={`${BODY} mb-2`}>{what}</p>
      <p className="text-secondary text-sm mb-1">Stack: {stack}</p>
      <p className="text-secondary text-sm">{url}</p>
    </article>
  )
}