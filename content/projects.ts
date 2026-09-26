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
    slug: 'youtube-audio-converter',
    repo: { owner: 'ksdok', name: 'youtube-audio-converter' },
    order: 2,
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
        body: 'Récupérer l’audio d’une vidéo pour l’écouter hors ligne demande normalement plusieurs outils et commandes manuelles.',
      },
      {
        heading: 'Approche',
        body: 'Un script unique qui enchaîne le téléchargement et la conversion avec un choix de format en paramètre, pensé pour rester simple à lancer depuis le terminal.',
      },
      {
        heading: 'Stack',
        body: 'Shell, outillage en ligne de commande.',
      },
    ],
    detailEn: [
      {
        heading: 'The problem',
        body: 'Grabbing a video’s audio to listen offline normally takes several tools and manual commands.',
      },
      {
        heading: 'Approach',
        body: 'A single script that chains download and conversion with a format parameter, kept simple to run from the terminal.',
      },
      {
        heading: 'Stack',
        body: 'Shell, command-line tooling.',
      },
    ],
  },
  {
    slug: 'zomboid-pvp',
    repo: { owner: 'ksdok', name: 'zomboidPVP' },
    order: 3,
    featured: false,
    updatedAt: '2026-09-03',
    tags: ['Lua', 'Jeu'],
    titleFr: 'Serveur Project Zomboid PVP',
    titleEn: 'Project Zomboid PVP server',
    summaryFr:
      'Configuration et scripts d’un serveur de jeu Project Zomboid orienté PVP (mods, règles, automatisation).',
    summaryEn:
      'Configuration and scripts for a PVP-oriented Project Zomboid game server (mods, rules, automation).',
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
