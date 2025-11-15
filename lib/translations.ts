export const translations = {
  fr: {
    // Header
    header: {
      titleMobile: 'CV Chat Interactif • KSD',
      titleTablet: 'CV Chat Interactif • Kim-san',
      titleDesktop: 'CV Chat Interactif, designé par Kim-san, codé par Claude',
    },

    // Chat Interface
    chat: {
      greeting:
        "Bonjour ! Je suis l'assistant IA qui représente Kim-San. Posez-moi des questions sur son parcours, ses compétences, ou comment ce site a été créé ! Utilisez la fonctionnalité 'Match Job' pour voir comment son profil correspond à votre besoin.",
      placeholder: 'Posez votre question...',
      sendButton: 'Envoyer',
      errorMessage: "Désolé, une erreur s'est produite. Veuillez réessayer.",
      rateLimitError: 'Limite de requêtes atteinte. Veuillez réessayer plus tard.',
    },

    // About Section
    about: {
      title: 'À propos',
      name: 'DOK Kim-san',
      subtitle: 'En poste chez la Société Générale, ouvert aux opportunités',
      description:
        "\nEnchanté, je m'appelle Kim-san DOK.\n\n Je vous présente Nicky mon assistant IA qui va vous aider à mieux me connaître.\n\nN'hésitez pas lui poser des questions sur mon parcours professionnel, mes compétences techniques, ou même sur la construction de ce site !",
      keySkills: 'Compétences clés',
      suggestedQuestions: 'Questions suggérées',
      suggestedQ1: 'Quel est son parcours professionnel ?',
      suggestedQ2: 'Quels types d\'agents IA avez-vous créés ?',
      suggestedQ3: 'Comment ce site a-t-il été construit ?',
      suggestedQ4: 'Aime-t-il les chats ?',
      matchJobButton: 'Match Job',
      matchJobDescription: 'Voyez comment votre annonce s\'aligne avec le profil de Kim-San',
      contactButton: 'Me contacter par email',
      contactSubject: 'Opportunité professionnelle',
      contactBody:
        "Bonjour Kim-san,\n\nJ'ai consulté votre CV interactif et je souhaite échanger avec vous concernant une opportunité.",
    },

    // Tech Stack
    techStack: {
      title: 'Stack technique par Claude',
      frontend: 'Frontend',
      frontendDesc:
        'Développé avec Next.js 15 et React 19, stylisé avec TailwindCSS pour un design moderne et responsive. Mode clair/sombre intégré pour une meilleure expérience utilisateur.',
      ai: 'Intelligence Artificielle',
      aiDesc:
        'Propulsé par Claude Haiku 4.5 d\'Anthropic pour des réponses naturelles et pertinentes sur le parcours professionnel.',
      rag: 'Système RAG',
      ragDesc:
        'Architecture RAG (Retrieval Augmented Generation) construite avec le framework LangChain, hébergée sur Supabase avec base vectorielle intégrée. Permet d\'indexer et rechercher intelligemment dans les informations du CV.',
      ragEnrichment: 'Enrichissement du RAG',
      ragEnrichmentDesc:
        'Workflow n8n avec un agent recruteur conversationnel qui pose des questions interactives sur le parcours professionnel. Les réponses sont automatiquement enregistrées et indexées dans le système RAG pour enrichir la base de connaissances.',
    },

    // RAG Info
    rag: {
      title: 'RAG Activé',
      description: 'Les réponses sont générées à partir des informations stockées dans le RAG.',
    },

    // Job Matcher
    jobMatcher: {
      title: 'Match Job',
      closeButton: 'Fermer',
      jobDescriptionLabel: 'Coller la description du poste',
      jobDescriptionPlaceholder: 'Collez la description complète du poste ici... (max 10 000 caractères)',
      characterCount: 'caractères',
      analyzeButton: 'Analyser le matching du du poste',
      analyzing: 'Analyse en cours...',
      results: 'Résultats',
      overallMatch: 'Correspondance Globale',
      skillsMatch: 'Correspondance Compétences',
      experienceMatch: 'Correspondance Expérience',
      analysis: 'Analyse',
      strengths: 'Ses Points Forts',
      improvements: 'Ses domaines à Développer',
      analyzeAnother: 'Analyser un Autre Poste',
      contactButton: 'Contactez moi',
      contactSubject: 'Analyse de Correspondance de Poste',
      errorEmptyDescription: 'Veuillez coller une description de poste',
      errorTooLong: 'La description du poste est trop longue (max 10 000 caractères)',
      errorMessage: 'Une erreur est survenue lors de l\'analyse. Veuillez réessayer.',
      rateLimitError: 'Limite de requêtes atteinte. Veuillez réessayer plus tard.',
    },

    // Gallery
    gallery: {
      title: 'Galerie',
      projects: 'Projets',
    },

    // Footer
    footer: 'Powered by Claude AI + RAG + n8n • Built with Next.js',

    // Buttons & Controls
    buttons: {
      english: 'English',
      french: 'Français',
    },
  },

  en: {
    // Header
    header: {
      titleMobile: 'Interactive Resume • KSD',
      titleTablet: 'Interactive Resume Chat• Kim-san',
      titleDesktop: 'Interactive Resume Chat, designed by Kim-san, coded by Claude',
    },

    // Chat Interface
    chat: {
      greeting:
        'Hello! I\'m the AI assistant representing Kim-San. Ask me questions about his background, skills, or how this site was built! Use the "Match Job" feature to see how his profile aligns with your needs.',
      placeholder: 'Ask your question...',
      sendButton: 'Send',
      errorMessage: 'Sorry, an error occurred. Please try again.',
      rateLimitError: 'Request limit reached. Please try again later.',
    },

    // About Section
    about: {
      title: 'About',
      name: 'DOK Kim-san',
      subtitle: 'Currently at Société Générale, open to opportunities',
      description:
        '\nNice to meet you, my name is Kim-san DOK.\n\n Let me introduce you Nicky, my AI assistant, who will help you get more information about me.\n\nFeel free to ask him questions about my professional background, technical skills, or even how this site was built!',
      keySkills: 'Key Skills',
      suggestedQuestions: 'Suggested Questions',
      suggestedQ1: 'What is his professional background?',
      suggestedQ2: 'What types of AI agents have you created?',
      suggestedQ3: 'How was this site built?',
      suggestedQ4: 'Does he like cats?',
      matchJobButton: 'Match Job',
      matchJobDescription: 'See how your job posting aligns with Kim-San\'s profile',
      contactButton: 'Contact me by email',
      contactSubject: 'Professional Opportunity',
      contactBody:
        'Hello Kim-san,\n\nI have reviewed your interactive Resume and would like to discuss a professional opportunity with you.',
    },

    // Tech Stack
    techStack: {
      title: 'Tech Stack by Claude',
      frontend: 'Frontend',
      frontendDesc:
        'Built with Next.js 15 and React 19, styled with TailwindCSS for modern and responsive design. Light/dark mode integrated for a better user experience.',
      ai: 'Artificial Intelligence',
      aiDesc:
        'Powered by Claude Haiku 4.5 from Anthropic for natural and relevant responses about professional background.',
      rag: 'RAG System',
      ragDesc:
        'RAG (Retrieval Augmented Generation) architecture built with LangChain framework, hosted on Supabase with integrated vector database. Allows intelligent indexing and searching within Resume information.',
      ragEnrichment: 'RAG Enrichment',
      ragEnrichmentDesc:
        'n8n workflow with a conversational recruiter agent that asks interactive questions about professional background. Responses are automatically recorded and indexed in the RAG system to enrich the knowledge base.',
    },

    // RAG Info
    rag: {
      title: 'RAG Enabled',
      description: 'Responses are generated from information stored in the RAG.',
    },

    // Job Matcher
    jobMatcher: {
      title: 'Job Match',
      closeButton: 'Close',
      jobDescriptionLabel: 'Paste the job description',
      jobDescriptionPlaceholder: 'Paste the complete job description here... (max 10,000 characters)',
      characterCount: 'characters',
      analyzeButton: 'Analyze the job match',
      analyzing: 'Analyzing...',
      results: 'Results',
      overallMatch: 'Overall Match',
      skillsMatch: 'Skills Match',
      experienceMatch: 'Experience Match',
      analysis: 'Analysis',
      strengths: 'Strengths',
      improvements: 'Areas for Improvement',
      analyzeAnother: 'Analyze Another Job',
      contactButton: 'Contact me',
      contactSubject: 'Job Match Analysis Results',
      errorEmptyDescription: 'Please paste a job description',
      errorTooLong: 'The job description is too long (max 10,000 characters)',
      errorMessage: 'An error occurred during analysis. Please try again.',
      rateLimitError: 'Request limit reached. Please try again later.',
    },

    // Gallery
    gallery: {
      title: 'Gallery',
      projects: 'Projects',
    },

    // Footer
    footer: 'Powered by Claude AI + RAG + n8n • Built with Next.js',

    // Buttons & Controls
    buttons: {
      english: 'English',
      french: 'Français',
    },
  },
}

/**
 * Get translated string by key path
 * Usage: t('chat.greeting') or t('about.suggestedQ1')
 */
export function getTranslation(language: 'fr' | 'en', keyPath: string): string {
  const keys = keyPath.split('.')
  let value: Record<string, unknown> | unknown = translations[language]

  for (const key of keys) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[key]
    } else {
      console.warn(`Translation key not found: ${keyPath} for language: ${language}`)
      return keyPath // Return the key path as fallback
    }
  }

  return typeof value === 'string' ? value : keyPath
}
