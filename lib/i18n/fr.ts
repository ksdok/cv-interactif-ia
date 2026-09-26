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
    // Review M3 (Lot 1) : alt traduit de l'og:image déclarée explicitement
    // (l'alt.txt de la convention fichier est FR-only). Aligné sur alt.txt.
    ogImageAlt:
      'Kim-san DOK — Business Analyst Senior freelance, AMOA finance de marché (Paris)',
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
      'migration',
      'Paris',
    ],
  },

  // GEO-08d — wording JSON-LD (blocs Person + ProfessionalService), consommé
  // par le builder mutualisé lib/jsonLd.ts (review M2). Les champs non
  // traduits (name, email, homeLocation, sameAs, knowsLanguage) et les @id
  // sont posés dans le builder ; personDescription n'existe pas ici — la
  // description Person réutilise metadata.description dans le builder.
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
      'Migration',
      'SQL',
    ],
    serviceName: 'Kim-san DOK — Business Analyst Freelance (AMOA)',
    serviceDescription:
      'Consulting en business analysis et AMOA pour la finance de marché. ' +
      'Intervention en freelance sur Paris et en remote.',
  },

  header: {
    name: 'Kim-san DOK',
    tagline: 'design par kim-san / codé par l’IA',
    // GEO-08f — switcher de langue : les deux locales sont affichées (FR / EN),
    // highlight sur la langue active (préférence utilisateur, 2026-09-14).
    // Les labels FR/EN sont des codes ISO — dans le composant, pas ici.
    // aria-label dans la langue CIBLE : le lien porte lang correspondant, les
    // lecteurs d'écran l'annoncent avec la voix correspondante.
    switcherAriaFr: 'Version française',
    switcherAriaEn: 'Switch to English',
    // Lien direct vers la page CV de la locale courante (/fr/cv, GEO-08h).
    // N4 (review c150986) : valeur identique à footer.cvLink — dupliquée
    // volontairement (clé par section, pas de couplage header→footer) ; si
    // l'un des deux libellés change, vérifier l'autre.
    cvLink: 'CV',
    cvLinkAria: 'Voir le CV',
    // PROJ-001 — lien Projets du header (second après le CV).
    projectsLink: 'Projets',
    projectsLinkAria: 'Voir les projets',
    // Logo cliquable → home de la locale courante.
    homeLinkAria: 'Retour à l\u2019accueil',
  },

  // GEO-08h — metadata de la page CV (wording BA freelance, convention corpus
  // 🔗 SEO-03 : le keyword « Product Designer » du backlog n°10 est remplacé).
  // N4 (review Lot 2) : title volontairement « type de page d'abord » sans le
  // nom — c'est un choix explicite, pas un glissement : le template du layout
  // [lang] porte le nom en suffixe (« ... | Kim-san DOK »), et le sujet de la
  // page (CV) prime pour une URL de CV partagée par des recruteurs. Le root
  // layout documente « nom d'abord » pour le title PAR DÉFAUT, pas pour les
  // pages qui définissent leur propre title.
  cv: {
    title: 'CV — Business Analyst Senior Freelance (AMOA) · Finance de marché',
    description:
      'CV complet de Kim-san DOK, Business Analyst senior freelance en finance de marché (Paris). ' +
      '10 ans à Société Générale — Securities Lending, Repo, Forex, Hedging. ' +
      '14 M de transactions/an, ×4 de scalabilité, 500 000€/an d’économies. PSM I.',
    ogDescription:
      '10 ans en finance de marché à Société Générale — Securities Lending, Repo, Forex, Hedging. ' +
      '14 M de transactions/an, ×4 de scalabilité, 500 000€/an d’économies.',
    keywords: [
      'Kim-san DOK',
      'CV',
      'Business Analyst',
      'freelance',
      'AMOA',
      'finance de marché',
      'Securities Lending',
      'Repo',
      'Forex',
      'Hedging',
      'Société Générale',
      'Broadridge',
      'Kondor+',
      'PSM I',
      'Migration',
      'Paris',
    ],
  },

  // PROJ-001 — page Projets (hub + détail), wording via dictionnaire (GEO-08b).
  // Les libellés de boutons portent l'icône en SVG côté composant (pas de
  // glyphe en JSX) ; `newTab` alimente l'aria-label des liens externes.
  projects: {
    metaTitle: 'Projets — Kim-san DOK',
    metaDescription:
      'Projets GitHub en cours de Kim-san DOK : le code réel au-delà du CV — applications web, IA et outils en ligne de commande.',
    ogDescription:
      'Le code réel derrière le CV — quelques projets en cours autour du web, de l’IA et du design éditorial.',
    keywords: [
      'Kim-san DOK',
      'projets',
      'GitHub',
      'portfolio',
      'open source',
      'développement',
    ],
    eyebrow: 'Portfolio',
    title: 'Projets',
    lead: 'Une sélection de projets en cours — le code réel derrière le CV, au-delà des expériences.',
    aside:
      'Des projets principalement autour de l’IA, du web et de l’automatisation. Chaque projet mis en avant a sa propre page détail.',
    featuredLabel: 'Mis en avant',
    githubLabel: 'Projet GitHub',
    viewProject: 'Voir le projet',
    viewOnGithub: 'Voir sur GitHub',
    newTab: 'nouvel onglet',
    // Libellé de GROUPE des pastilles (tags éditoriaux + topics GitHub) —
    // utilisé comme aria-label du bloc de pills sur le hub (finding 5).
    topicsLabel: 'Technologies et sujets',
    detail: {
      eyebrow: 'Projet',
      back: 'Tous les projets',
      demoLabel: 'Démo en ligne',
      otherProjects: 'Autres projets',
      otherLocaleExcerpt: 'Aussi disponible en anglais',
    },
  },

  hero: {
    label: 'Portfolio',    titleName: 'Kim-san DOK',
    titleRole: 'Business Analyst Freelance',
    introLead:
      'Explorez mon parcours professionnel à travers une interface conversationnelle — Business Analyst senior en ',
    introHighlight: 'finance de marché',
    introRest:
      ' (Paris) avec plus de 10 ans d’expérience, spécialisé en Securities Lending, Repo et Forex.',
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
    featuredLabel: 'Poste actuel',
    featuredTitle: 'Libre de tout contrat',
    featuredCompany: 'Veille active et opportunités freelance',
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
    passion2Title: 'Intelligence Artificielle',
    passion2Body: 'Jouer, tester, apprendre et partager',
    matcherLabel: 'Testez votre match',
    matcherTitle: 'Matchez un poste',
    matcherSubtitle: 'Analyse de poste par IA',
    matcherBody:
      'Collez une fiche de poste et obtenez une analyse instantanée de l’adéquation entre mon profil et le poste.',
    matcherCta: 'Ouvrir le matcher',
    ctaTitle: 'Prêt à collaborer ?',
    ctaBody: 'Je suis disponible et ouvert aux opportunités.',
    ctaButton: 'C\'est par là',
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
    projectsLink: 'Projets',
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
