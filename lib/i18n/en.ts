/**
 * lib/i18n/en.ts — dictionnaire EN.
 *
 * Contraint par `Dictionary` (dérivé de fr.ts) : toute clé absente ou en trop
 * ici = erreur de compilation (review N4). Les chaînes reprennent le wording
 * visible EN actuel de la prod.
 */

import type { Dictionary } from './types'

const en: Dictionary = {
  header: {
    name: 'Kim-san DOK',
    tagline: 'designed by kim-san / coded by AI',
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
    initialMessage:
      "Hello, I'm Nicky, Kim-san's digital twin. I'm here to help you navigate through years of experience.\n\nWhat would you like to know first?",
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
      tooLong: 'Job description is too long (max 10,000 characters)',
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
