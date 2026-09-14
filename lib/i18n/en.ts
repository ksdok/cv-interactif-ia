/**
 * lib/i18n/en.ts — dictionnaire EN.
 *
 * Contraint par `Dictionary` (dérivé de fr.ts) : toute clé absente ou en trop
 * ici = erreur de compilation (review N4). Les chaînes reprennent le wording
 * visible EN actuel de la prod.
 */

import type { Dictionary } from './types'

const en: Dictionary = {
  // GEO-08d — per-locale metadata (title/description = SEO-01 wording, EN).
  // Cohérence d'entité (ticket GEO-08d point 5) : même nom, même métier
  // (Business Analyst / AMOA), mêmes termes métier que la version FR.
  metadata: {
    title:
      'Kim-san DOK — Senior Freelance Business Analyst (AMOA) | Market Finance',
    description:
      'Kim-san DOK, Senior freelance Business Analyst in market finance (Paris, La Défense). ' +
      '10 years of experience in IT transformation, Securities Lending, Repo, Forex. ' +
      'Interactive resume with an AI assistant.',
    siteName: 'Kim-san DOK — Freelance Business Analyst (AMOA)',
    // Review M3 (Lot 1): translated og:image alt (the file-convention
    // .alt.txt is FR-only).
    ogImageAlt:
      'Kim-san DOK — Senior freelance Business Analyst, AMOA market finance (Paris)',
    keywords: [
      'Kim-san DOK',
      'Business Analyst',
      'freelance',
      'independent consultant',
      'AMOA',
      'market finance',
      'Securities Lending',
      'Forex',
      'IT transformation',
      'Paris',
    ],
  },

  // GEO-08d — JSON-LD wording (Person + ProfessionalService blocks).
  // Securities Lending / Repo / Forex are kept verbatim: they are domain
  // jargon, not translatable terms.
  jsonLd: {
    jobTitle: 'Senior Business Analyst (AMOA)',
    knowsAbout: [
      'Business Analysis',
      'AMOA',
      'Market Finance',
      'Securities Lending',
      'Repo',
      'Forex',
      'Collateral',
      'IT Transformation',
      'SQL',
    ],
    serviceName: 'Kim-san DOK — Freelance Business Analyst (AMOA)',
    serviceDescription:
      'Business analysis and AMOA consulting for market finance. ' +
      'Freelance engagements in Paris (France) and remote.',
  },

  header: {
    name: 'Kim-san DOK',
    tagline: 'designed by kim-san / coded by AI',
    // GEO-08f — language switcher (crawlable link to the other locale).
    // aria-label in the TARGET language: the link carries lang="fr", so screen
    // readers announce it with the matching voice.
    switcherLabel: 'FR',
    switcherAria: 'Passer en français',
  },

  // GEO-08h — CV page metadata (BA freelance wording, corpus convention 🔗
  // SEO-03: the backlog item n°10 keyword "Product Designer" is replaced).
  // N4 (Lot 2 review): the title deliberately leads with the page type, not
  // the name — an explicit choice: the [lang] layout template carries the name
  // as a suffix ("... | Kim-san DOK"), and the page subject (CV) matters most
  // for a URL shared with recruiters. The root layout documents "name first"
  // for its DEFAULT title, not for pages declaring their own.
  cv: {
    title: 'CV — Senior Freelance Business Analyst (AMOA) · Market Finance',
    description:
      'Full CV of Kim-san DOK, senior freelance Business Analyst in market finance (Paris). ' +
      '10 years at Société Générale — Securities Lending, Repo, Forex, Hedging. ' +
      '14M transactions/yr, ×4 scalability, €500K/yr savings. PSM I.',
    ogDescription:
      '10 years in market finance at Société Générale — Securities Lending, Repo, Forex, Hedging. ' +
      '14M transactions/yr, ×4 scalability, €500K/yr savings.',
    keywords: [
      'Kim-san DOK',
      'CV',
      'Business Analyst',
      'freelance',
      'AMOA',
      'market finance',
      'Securities Lending',
      'Repo',
      'Forex',
      'Hedging',
      'Société Générale',
      'Broadridge',
      'Kondor+',
      'PSM I',
      'Paris',
    ],
  },

  hero: {
    label: 'Portfolio Showcase',
    titleName: 'Kim-san DOK',
    titleRole: 'Business Analyst Freelancer',
    introLead:
      'Explore my professional journey through a conversational interface — Senior Business Analyst in ',
    introHighlight: 'market finance',
    introRest:
      ' (Paris) with more than 10 years of experience, specialized in Securities Lending, Repo, and Forex. Ask about my background, technical stack, or recent projects.',
    aside:
      'This experimental interface bridges the gap between static documents and human conversation, powered by custom LLM integration.',
  },

  chat: {
    greeting1:
      "Hello, I'm Nicky, Kim-san's digital twin. I'm here to help you navigate through years of experience.",
    greeting2: 'What would you like to know first?',
    placeholder: "Ask Nicky about Kim-san's experience...",
    placeholderAria: "Ask Nicky about Kim-san's experience",
    sendAria: 'Send message',
    loadingTitle: 'Loading...',
    errorMessage: 'Failed to get response. Please try again.',
  },

  experience: {
    featuredLabel: 'Featured Role',
    featuredTitle: 'Business Analyst',
    featuredCompany: '@ Société Générale — 2016–Present',
    featuredBody:
      'Value driven solutions with a human-centered approach, adapted to the evolving landscape of finance and technology. I bridge the gap between complex data and actionable insights, ensuring that every project not only meets business objectives but also resonates with the people it serves.',
    featuredCta: 'View full CV →',
    humanStackLabel: 'Human Stack',
    humanStack: ['Empathy driven', 'Adaptable', 'Collaborative', 'AI Enthusiast'],
    techStackLabel: 'Project Technical Stack',
    techStack: ['Agentic Coding', 'React', 'TypeScript', 'Next.js', 'Tailwind', 'Python', 'Supabase'],
    githubCta: 'View GitHub',
    passionsLabel: 'Burning passions',
    passion1Title: 'Bike & Food',
    passion1Body: 'Ride, sweat and eat',
    passion2Title: 'Cats',
    passion2Body: 'In Cat Distribution System I trust',
    matcherLabel: 'Test Your Fit',
    matcherTitle: 'Match a Job',
    matcherSubtitle: 'AI-powered resume analysis',
    matcherBody:
      'Paste any job description and get an instant analysis of how well your profile matches the role.',
    matcherCta: 'Open Matcher',
    ctaTitle: 'Ready to collaborate?',
    ctaBody: "I'm not yet available but open for opportunities.",
    ctaButton: 'Say Hello',
  },

  jobMatcher: {
    aiLabel: 'AI Analysis',
    title: 'Job Match',
    closeAria: 'Close dialog',
    descLabel: 'Job Description',
    descPlaceholder: 'Paste the job description here...',
    charsCount: '/5,000 characters',
    errors: {
      empty: 'Please enter a job description',
      csrfMissing: 'Security error: CSRF token not found. Please refresh the page.',
      apiFallback: 'Failed to analyze job match',
      unexpected: 'An error occurred while analyzing the job match',
    },
    analyzing: 'Analyzing...',
    analyzeCta: 'Analyze Match',
    overall: 'Overall',
    skills: 'Skills',
    experience: 'Experience',
    analysis: 'Analysis',
    strengths: 'Strengths',
    improvements: 'Areas for Improvement',
    anotherCta: 'Analyze Another Job',
    contactCta: 'Contact Me',
    closeCta: 'Close',
  },

  // API error messages — mapped client-side from the errorCode returned by
  // /api/chat and /api/job-match (review M4): the API stays language-agnostic.
  apiErrors: {
    RATE_LIMIT: 'Rate limit exceeded: 200 requests per day maximum.',
    VALIDATION: 'Invalid request. Please try again.',
    CSRF: 'Security error: invalid CSRF token. Please refresh the page.',
    SERVER: 'Failed to generate response. Please try again.',
  },

  footer: {
    copyright: '© 2026 Kim-san DOK. Curated Minimalism.',
    cvLink: 'CV',
    linkedinLink: 'LinkedIn',
    githubLink: 'GitHub',
    emailLink: 'Email',
  },

  notFound: {
    title: 'Page not found',
    back: 'Back to home',
  },
}

export default en
