/**
 * lib/i18n/fr.ts — dictionnaire FR (source de vérité du Dictionary).
 *
 * GEO-08b : PAS de `as const` ici — `typeof fr` doit donner des types `string`
 * élargis, sinon `const en: Dictionary = {...}` exigerait des chaînes strictement
 * identiques à la version FR (l'intention review N4 — « une clé manquante en
 * en.ts = erreur de compilation » — est préservée par le match structurel).
 * Le wording visible EN de prod est traduit ici.
 * GEO-08d : le wording metadata (SEO-01) et le wording JSON-LD vivent désormais
 * ici (clés metadata / jsonLd) — lib/site.ts dérive de ce fichier le fallback
 * FR servi aux routes hors [lang] (/cv, 404).
 */

const fr = {
  // GEO-08d — metadata par locale (title/description = wording SEO-01).
  metadata: {
    title:
      'Kim-san DOK — Business Analyst Senior Freelance (AMOA) | Finance de marché',
    description:
      "Kim-san DOK, Business Analyst Senior freelance en finance de marché (Paris, La Défense). " +
      "10 ans d'expérience en transformation SI, Securities Lending, Repo, Forex. " +
      'CV interactif avec assistant IA.',
    siteName: 'Kim-san DOK — Business Analyst Freelance (AMOA)',
    keywords: [
      'Kim-san DOK',
      'Business Analyst',
      'freelance',
      'consultant indépendant',
      'AMOA',
      'finance de marché',
      'Securities Lending',
      'Forex',
      'transformation SI',
      'Paris',
    ],
  },

  // GEO-08d — wording JSON-LD (blocs Person + ProfessionalService). Les champs
  // non traduits (name, email, homeLocation, sameAs, knowsLanguage) et les
  // @id sont posés dans app/[lang]/layout.tsx ; personDescription réutilise
  // metadata.description (SEO-01 : « identique à la meta description »).
  jsonLd: {
    jobTitle: 'Business Analyst Senior (AMOA)',
    knowsAbout: [
      'Business Analysis',
      'AMOA',
      'Finance de marché',
      'Securities Lending',
      'Repo',
      'Forex',
      'Collatéral',
      'Transformation SI',
      'SQL',
    ],
    serviceName: 'Kim-san DOK — Business Analyst Freelance (AMOA)',
    serviceDescription:
      'Consulting en business analysis et AMOA pour la finance de marché. ' +
      'Intervention en freelance sur Paris et en remote.',
  },

  header: {
    name: 'Kim-san DOK',
    tagline: 'design par kim-san / code par l’IA',
  },

  hero: {
    label: 'Vitrine de portfolio',
    titleName: 'Kim-san DOK',
    titleRole: 'Business Analyst Freelance',
    introLead:
      'Explorez mon parcours professionnel à travers une interface conversationnelle — Business Analyst senior en ',
    introHighlight: 'finance de marché',
    introRest:
      ' (Paris) avec plus de 10 ans d’expérience, spécialisé en Securities Lending, Repo et Forex. Interrogez librement mon parcours, ma stack technique ou mes projets récents.',
    aside:
      'Cette interface expérimentale fait le pont entre documents statiques et conversation humaine, propulsée par une intégration LLM sur mesure.',
  },

  chat: {
    greeting1:
      'Bonjour, je suis Nicky, le jumeau numérique de Kim-san. Je suis là pour vous aider à naviguer à travers des années d’expérience.',
    greeting2: 'Que souhaitez-vous savoir en premier ?',
    placeholder:
      'Demandez à Nicky ce que vous voulez savoir sur l’expérience de Kim-san...',
    placeholderAria:
      'Demandez à Nicky des informations sur l’expérience de Kim-san',
    sendAria: 'Envoyer le message',
    loadingTitle: 'Chargement...',
    errorMessage: 'Impossible d’obtenir une réponse. Veuillez réessayer.',
  },

  experience: {
    featuredLabel: 'Rôle à la une',
    featuredTitle: 'Business Analyst',
    featuredCompany: '@ Société Générale — 2016–aujourd’hui',
    featuredBody:
      'Des solutions orientées valeur avec une approche centrée humain, adaptée aux évolutions de la finance et de la technologie. Je fais le lien entre données complexes et décisions actionnables, pour que chaque projet atteigne ses objectifs métier tout en gardant du sens pour ses utilisateurs.',
    featuredCta: 'Voir le CV complet →',
    humanStackLabel: 'Stack humaine',
    humanStack: ['Empathie', 'Adaptabilité', 'Collaboratif', 'Passionné d’IA'],
    techStackLabel: 'Stack technique du projet',
    techStack: ['Agentic Coding', 'React', 'TypeScript', 'Next.js', 'Tailwind', 'Python', 'Supabase'],
    githubCta: 'Voir GitHub',
    passionsLabel: 'Passions brûlantes',
    passion1Title: 'Vélo & Cuisine',
    passion1Body: 'Rouler, transpirer et manger',
    passion2Title: 'Chats',
    passion2Body: 'Je crois au Cat Distribution System',
    matcherLabel: 'Testez votre match',
    matcherTitle: 'Matchez un poste',
    matcherSubtitle: 'Analyse de CV par IA',
    matcherBody:
      'Collez une fiche de poste et obtenez une analyse instantanée de l’adéquation entre votre profil et le rôle.',
    matcherCta: 'Ouvrir le matcher',
    ctaTitle: 'Prêt à collaborer ?',
    ctaBody: 'Je ne suis pas encore disponible mais ouvert aux opportunités.',
    ctaButton: 'Dites bonjour',
  },

  jobMatcher: {
    aiLabel: 'Analyse IA',
    title: 'Match de poste',
    closeAria: 'Fermer la fenêtre',
    descLabel: 'Description du poste',
    descPlaceholder: 'Collez la description du poste ici...',
    charsCount: '/5 000 caractères',
    errors: {
      empty: 'Veuillez saisir une description de poste.',
      csrfMissing: 'Erreur de sécurité : jeton CSRF introuvable. Veuillez recharger la page.',
      apiFallback: 'Échec de l’analyse du match. Veuillez réessayer.',
      unexpected: 'Une erreur est survenue pendant l’analyse du match.',
    },
    analyzing: 'Analyse en cours...',
    analyzeCta: 'Analyser le match',
    overall: 'Global',
    skills: 'Compétences',
    experience: 'Expérience',
    analysis: 'Analyse',
    strengths: 'Points forts',
    improvements: 'Axes d’amélioration',
    anotherCta: 'Analyser un autre poste',
    contactCta: 'Contactez-moi',
    closeCta: 'Fermer',
  },

  // Messages d'erreur API — mappés côté client depuis l'errorCode renvoyé par
  // /api/chat et /api/job-match (review M4) : l'API reste agnostique de la langue.
  apiErrors: {
    RATE_LIMIT: 'Limite de requêtes atteinte : 200 requêtes par jour maximum.',
    VALIDATION: 'Requête invalide. Veuillez réessayer.',
    CSRF: 'Erreur de sécurité : jeton CSRF invalide. Rechargez la page.',
    SERVER: 'Échec de la génération de la réponse. Veuillez réessayer.',
  },

  footer: {
    copyright: '© 2026 Kim-san DOK. Minimalisme éditorial.',
    cvLink: 'CV',
    linkedinLink: 'LinkedIn',
    githubLink: 'GitHub',
    emailLink: 'E-mail',
  },

  notFound: {
    title: 'Page introuvable',
    back: 'Retour à l’accueil',
  },
}

export default fr
