/**
 * content/projects.ts — source de vérité ÉDITORIALE des projets GitHub (PROJ-001).
 *
 * Décision 1 (spec) : la liste affichée, son ordre et son filtrage sont
 * éditoriaux. GitHub ne fournit JAMAIS la sélection, ni le titre, ni les
 * descriptions (README mono-langue, ton non contrôlé) — l'API n'enrichit que
 * des métadonnées vivantes (étoiles, langage, topics, dernière activité) d'un
 * repo DÉJÀ listé ici (cf. `lib/github.ts`).
 *
 * Emplacement `content/` (comme `content/cv/`) et non `data/` : contenu
 * éditorial traduit, PAS la source du chat CAG — les projets n'entrent pas dans
 * le CAG (out-of-scope de la spec, surveillance de la taille `docs/cag-limits.md`).
 *
 * INVARIANT M3 (décision 4, anti-thin-content) : `featured ⟹ (detailFr && detailEn)`.
 * Le code DÉRIVE `hasDetail` de la présence d'un contenu détail COMPLET dans les
 * DEUX locales et ignore `featured` au rendu si l'invariant n'est pas respecté :
 * un détail présent dans une seule langue ⇒ pas de page détail, pas d'alternate
 * hreflang vers une page inexistante (erreur d'annotation Google documentée).
 * Un projet sans détail reste une carte du hub avec un lien GitHub externe.
 *
 * Le contenu FR/EN ci-dessous est un PREMIER JET éditorial (2-3 projets réels
 * pour démarrer) — à ajuster par l'opérateur, l'accroche « portfolio » étant un
 * choix rédactionnel.
 */

export interface ProjectDetailSection {
  /** Intertitre de section (traduit par locale). */
  heading: string
  /** Corps de section, texte plein (traduit par locale). */
  body: string
}

export interface Project {
  /** Identifiant d'URL : `/[lang]/projets/{slug}` (indépendant du nom de repo). */
  slug: string
  /** Dépôt GitHub ciblé par l'enrichissement métadonnées. */
  repo: { owner: string; name: string }
  /** `false` = dépôt privé : on omet `codeRepository` du JSON-LD (pas de lien
   *  SEO vers une URL non publique). Absent = public. */
  repoPublic?: boolean
  /** Ordre éditorial (featured d'abord, puis croissant). */
  order: number
  titleFr: string
  titleEn: string
  summaryFr: string
  summaryEn: string
  /** Contenu détail — DOIT exister dans les deux locales pour générer la page. */
  detailFr?: ProjectDetailSection[]
  detailEn?: ProjectDetailSection[]
  /** Tags éditoriaux (affichés en pastilles, avant les topics GitHub). */
  tags: string[]
  /** Mis en avant : page détail attendue (voir invariant M3). */
  featured: boolean
  /** Retiré de la liste affichée (éditorial). */
  hidden?: boolean
  /** Lien démo optionnel (le cas échéant). */
  demoUrl?: string
  /** Affiche un appel à tester (bêta) + CTA de contact sur la page détail. */
  contactForBeta?: boolean
  /** Date éditoriale de dernière mise à jour (YYYY-MM-DD) — alimente le sitemap
   *  SANS fetch GitHub (N5 : le sitemap reste statique, build hors réseau). */
  updatedAt: string
}

export const PROJECTS: Project[] = [
  {
    slug: 'cv-interactif-ia',
    repo: { owner: 'ksdok', name: 'cv-interactif-ia' },
    order: 1,
    featured: true,
    updatedAt: '2026-09-26',
    tags: ['Next.js', 'TypeScript', 'IA', 'CAG'],
    titleFr: 'CV interactif IA',
    titleEn: 'Interactive AI résumé',
    summaryFr:
      'CV bilingue propulsé par « Nicky », un assistant IA dont les réponses sont ancrées dans les données réelles du CV (CAG, avec repli RAG).',
    summaryEn:
      'Bilingual résumé powered by “Nicky”, an AI assistant whose answers are grounded in the real CV data (CAG, with a RAG fallback).',
    detailFr: [
      {
        heading: 'Le problème',
        body: 'Un CV classique ne répond pas aux questions d’un recruteur : « combien de temps sur tel projet ? », « quelle stack ? ». Un document statique laisse ces questions sans réponse.',
      },
      {
        heading: 'Approche',
        body: 'Le visiteur discute avec un assistant ancré sur les données réelles du parcours : pas d’invention, pas de hors-sujet. Architecture CAG par défaut (le CV complet est injecté dans le prompt) avec repli RAG, chaîne multi-provider avec bascule automatique, et pré-filtre hors-sujet. Bilingue FR/EN, rendu serveur, SEO et accessibilité soignés.',
      },
      {
        heading: 'Stack',
        body: 'Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase (pgvector), Vercel. Tests avec Vitest.',
      },
    ],
    detailEn: [
      {
        heading: 'The problem',
        body: 'A traditional résumé does not answer a recruiter’s questions: “how long on that project?”, “which stack?”. A static document leaves those unanswered.',
      },
      {
        heading: 'Approach',
        body: 'The visitor chats with an assistant grounded in the real career data: no invention, no off-topic. CAG by default (the full CV is injected into the prompt) with a RAG fallback, a multi-provider chain with automatic failover, and an off-topic pre-screen. Bilingual FR/EN, server-rendered, with careful SEO and accessibility.',
      },
      {
        heading: 'Stack',
        body: 'Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase (pgvector), Vercel. Tests with Vitest.',
      },
    ],
  },
  {
    slug: 'menu-renzu',
    repo: { owner: 'ksdok', name: 'menu-translator-ia' },
    order: 2,
    featured: true,
    updatedAt: '2026-09-26',
    contactForBeta: true,
    tags: ['iOS', 'Swift', 'IA', 'Vision'],
    titleFr: 'Menu Renzu',
    titleEn: 'Menu Renzu',
    summaryFr:
      'Application iOS qui lit un menu de restaurant dans n’importe quel pays : photo du menu → texte exact, romanisation, traduction, catégories, puis commande finale montrée au serveur.',
    summaryEn:
      'iOS app that reads a restaurant menu anywhere: photo of the menu → exact text, romanisation, translation, categories, then a finalised order to show the waiter.',
    detailFr: [
      {
        heading: 'Le problème',
        body: 'Lire un menu dans un pays dont on ne parle pas la langue ne se résume pas à traduire : il faut retrouver les plats, comprendre les prix et commander sans ambiguïté.',
      },
      {
        heading: 'Approche',
        body: 'On photographie le menu. L’IA en extrait le texte exact, la romanisation (Hepburn, Pinyin…), une traduction et des catégories, en ne décrivant que ce qui est visible. Plusieurs photos peuvent être fusionnées, les plats sélectionnés avec leur quantité, et la commande finale s’affiche pour être montrée au serveur — avec une lecture à voix haute dans la langue du menu.',
      },
      {
        heading: 'Fonctionnalités',
        body: 'Phrasebook de restaurant japonais hors-ligne, historique des scans, navigation par catégories, interface en plusieurs langues.',
      },
      {
        heading: 'Stack',
        body: 'Application iOS native (Swift/SwiftUI, iOS 16+), analyse d’images par un modèle de vision, synthèse vocale et OCR embarqué.',
      },
    ],
    detailEn: [
      {
        heading: 'The problem',
        body: 'Reading a menu in a country whose language you don’t speak is more than translation: you need to find the dishes, understand prices and order unambiguously.',
      },
      {
        heading: 'Approach',
        body: 'You photograph the menu. The AI extracts the exact text, a romanisation (Hepburn, Pinyin…), a translation and categories, describing only what is visible. Several photos can be merged, dishes selected with quantities, and the finalised order is displayed to show the waiter — with a read-aloud in the menu’s language.',
      },
      {
        heading: 'Features',
        body: 'Offline Japanese restaurant phrasebook, scan history, category navigation, multi-language interface.',
      },
      {
        heading: 'Stack',
        body: 'Native iOS app (Swift/SwiftUI, iOS 16+), image analysis through a vision model, speech synthesis and on-device OCR.',
      },
    ],
  },
  {
    slug: 'youtube-audio-converter',
    repo: { owner: 'ksdok', name: 'youtube-audio-converter' },
    order: 4,
    featured: true,
    updatedAt: '2026-06-19',
    tags: ['Shell', 'CLI', 'Audio'],
    titleFr: 'Convertisseur audio YouTube',
    titleEn: 'YouTube audio converter',
    summaryFr:
      'Petit outil en ligne de commande pour extraire et convertir la piste audio d’une vidéo YouTube dans le format voulu.',
    summaryEn:
      'A small command-line tool to extract and convert the audio track of a YouTube video to the desired format.',
    detailFr: [
      {
        heading: 'Le problème',
        body: 'Extraire l’audio d’une vidéo YouTube en qualité maximale demande normalement d’enchaîner plusieurs outils et plusieurs commandes.',
      },
      {
        heading: 'Approche',
        body: 'Un script Bash unique qui encapsule yt-dlp et ffmpeg : on lui passe une URL, plusieurs URLs ou un fichier de liens, et il produit des fichiers audio (MP3 par défaut) à la meilleure qualité disponible. Options pour le dossier de sortie, le format, le mode playlist, un système d’archive anti-doublon, un aperçu sans téléchargement (dry-run) et un assistant interactif. Un installateur crée une commande disponible partout.',
      },
      {
        heading: 'Stack',
        body: 'Bash, yt-dlp et ffmpeg (vérification automatique des dépendances).',
      },
    ],
    detailEn: [
      {
        heading: 'The problem',
        body: 'Extracting a YouTube video’s audio at maximum quality normally means chaining several tools and commands.',
      },
      {
        heading: 'Approach',
        body: 'A single Bash script wrapping yt-dlp and ffmpeg: pass a URL, several URLs or a file of links and it produces audio files (MP3 by default) at the best available quality. Options for the output folder, format, playlist mode, an anti-duplicate archive, a no-download preview (dry-run) and an interactive assistant. An installer creates a command available anywhere.',
      },
      {
        heading: 'Stack',
        body: 'Bash, yt-dlp and ffmpeg (automatic dependency check).',
      },
    ],
  },
  {
    slug: 'coeurdelinh',
    repo: { owner: 'ksdok', name: 'coeurdelinh' },
    repoPublic: false,
    order: 3,
    featured: true,
    updatedAt: '2026-09-26',
    tags: ['Astro', 'CMS', 'Cloudflare'],
    titleFr: 'Site Cœur de Linh',
    titleEn: 'Cœur de Linh website',
    summaryFr:
      'Refonte du site vitrine cœurdelinh.com : sortie de WordPress vers un site statique Astro, éditable par la propriétaire via un CMS Git, hébergé sur Cloudflare.',
    summaryEn:
      'Rebuild of the cœurdelinh.com showcase site: moving off WordPress to a static Astro site, editable by the owner through a Git CMS, hosted on Cloudflare.',
    detailFr: [
      {
        heading: 'Le problème',
        body: 'Le site vitrine reposait sur WordPress : lourd à maintenir et difficile à faire évoluer simplement par sa propriétaire, non technicienne.',
      },
      {
        heading: 'Approche',
        body: 'Migration vers un site statique Astro, éditable par la propriétaire via un CMS Git : chaque édition devient un commit qui déclenche le déploiement automatique. L’hébergement passe sur Cloudflare Workers (fichiers statiques) et le formulaire de réservation est traité par un Worker. Le design reprend le style WordPress existant (polices auto-hébergées). 14 pages de contenu migrées, 42 images vérifiées par empreinte, 106 tests. La bascule DNS finale arrive en dernier, avec un rollback instantané tant que WordPress reste en place.',
      },
      {
        heading: 'Stack',
        body: 'Astro (site statique), Sveltia CMS, Cloudflare Workers (hébergement et formulaire).',
      },
    ],
    detailEn: [
      {
        heading: 'The problem',
        body: 'The showcase site ran on WordPress: heavy to maintain and hard for its non-technical owner to evolve simply.',
      },
      {
        heading: 'Approach',
        body: 'Migrated to a static Astro site, editable by the owner through a Git CMS: every edit becomes a commit that triggers the automatic deployment. Hosting moves to Cloudflare Workers (static assets) and the booking form is handled by a Worker. The design keeps the existing WordPress style (self-hosted fonts). 14 content pages migrated, 42 checksum-verified images, 106 tests. The final DNS switch comes last, with an instant rollback as long as WordPress remains in place.',
      },
      {
        heading: 'Stack',
        body: 'Astro (static site), Sveltia CMS, Cloudflare Workers (hosting and form).',
      },
    ],
  },
]

/**
 * INVARIANT M3 — détail complet dans les DEUX locales.
 * Utilisé partout (hub, page détail, sitemap) : la page détail n'existe QUE si
 * `hasDetail` est vrai, quel que soit le flag `featured`.
 */
export function hasDetail(project: Project): boolean {
  return Boolean(
    project.detailFr?.length && project.detailEn?.length,
  )
}

/** Liste affichée : non masqués, ordre éditorial (featured d'abord, puis `order`). */
export function visibleProjects(): Project[] {
  return PROJECTS.filter((p) => !p.hidden).sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return a.order - b.order
  })
}

/** Projets disposant d'une page détail (featured + invariant M3 satisfait). */
export function detailProjects(): Project[] {
  return visibleProjects().filter(hasDetail)
}

/** Résolution par slug — `undefined` si inconnu (→ notFound()). */
export function projectBySlug(slug: string): Project | undefined {
  return visibleProjects().find((p) => p.slug === slug)
}

/** Dernière mise à jour éditoriale (sitemap) — max des `updatedAt`, sans fetch. */
export function projectsLastModified(): Date {
  const times = visibleProjects().map((p) => new Date(p.updatedAt).getTime())
  return new Date(Math.max(...times))
}
