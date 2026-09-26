/**
 * lib/github.ts — enrichissement GitHub REST côté serveur (PROJ-001).
 *
 * Décision 1 (spec) : GitHub n'apporte QUE des métadonnées vivantes (étoiles,
 * langage, topics, dernière activité) d'un repo DÉJÀ listé dans
 * `content/projects.ts` — jamais la sélection, jamais la description.
 *
 * Décision 2 (spec, revue M2) — résilience :
 * - `AbortSignal.timeout(1500)` : la page ne doit JAMAIS attendre GitHub pour
 *   être servie.
 * - `fetch(..., { next: { revalidate: 3600 } })` : Data Cache — les requêtes de
 *   la fenêtre de revalidation sont servies sans rappel réseau.
 * - Échec → `null`, graceful (leçon BUG-001 : pas de dégradation silencieuse
 *   SANS log), MAIS pas de spam : un MÉMO NÉGATIF in-process borne l'appel et
 *   le log à 1 par fenêtre de TTL (5 min) — même esprit que `lastCleanup` de
 *   `lib/rateLimit.ts`. In-process (réinitialisé à chaque déploiement, comme le
 *   rate limiter) plutôt que KV : comportement accepté, pas d'infra ajoutée.
 * - Agrégation par `Promise.allSettled` : l'échec d'un repo n'affecte pas les autres.
 *
 * `GITHUB_TOKEN` est OPTIONNEL et SERVER-ONLY : présent, il relève la limite de
 * 60 req/h/IP à 5 000 ; absent, le Data Cache + le mémo négatif suffisent.
 *
 * server-only : jamais importé côté client (SEC).
 */

import 'server-only'

export interface RepoMeta {
  /** Nombre d'étoiles. */
  stars: number
  /** Langage principal (null si absent). */
  language: string | null
  /** Topics du dépôt (vide si aucun). */
  topics: string[]
  /** Date ISO de dernière activité. */
  pushedAt: string
}

/** Fenêtre du mémo négatif (M2) : aucune nouvelle tentative pendant 5 min. */
const NEGATIVE_TTL_MS = 5 * 60 * 1000

// État module-level du mémo négatif : réinitialisé au (re)déploiement, comme le
// rate limiter (comportement accepté, décision 2).
let lastFailureAt = 0
let lastFailureLogAt = 0

/** Vrai si une tentative est encore dans la fenêtre de silence post-échec. */
function inNegativeWindow(): boolean {
  return Date.now() - lastFailureAt < NEGATIVE_TTL_MS
}

/**
 * Enregistre un échec : ouvre/rafraîchit la fenêtre et n'émet QU'UNE ligne de
 * log par fenêtre de TTL (pas de spam proportionnel au trafic, revue M2).
 */
function noteFailure(owner: string, name: string, reason: string): void {
  const now = Date.now()
  lastFailureAt = now
  if (now - lastFailureLogAt >= NEGATIVE_TTL_MS) {
    lastFailureLogAt = now
    console.warn(
      `[github] métadonnées indisponibles pour ${owner}/${name} (${reason}) — ` +
        `mémo négatif actif ${NEGATIVE_TTL_MS / 60000} min, pages servies avec les données locales.`,
    )
  }
}

/**
 * Récupère les métadonnées d'un dépôt. Renvoie `null` en cas d'échec ou pendant
 * la fenêtre du mémo négatif (jamais d'exception — la page reste servie).
 */
export async function fetchRepoMeta(owner: string, name: string): Promise<RepoMeta | null> {
  if (inNegativeWindow()) return null

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'cv-interactif-ia',
    }
    const token = process.env.GITHUB_TOKEN
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers,
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      noteFailure(owner, name, `HTTP ${res.status}`)
      return null
    }

    const data = (await res.json()) as {
      stargazers_count?: number
      language?: string | null
      topics?: string[]
      pushed_at?: string
    }
    if (typeof data.pushed_at !== 'string') {
      noteFailure(owner, name, 'réponse inattendue')
      return null
    }
    return {
      stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : 0,
      language: data.language ?? null,
      topics: Array.isArray(data.topics) ? data.topics : [],
      pushedAt: data.pushed_at,
    }
  } catch (error) {
    noteFailure(owner, name, error instanceof Error ? error.message : 'erreur inconnue')
    return null
  }
}

/**
 * Résout les métadonnées de plusieurs dépôts en parallèle, indexées par slug.
 * Isolation `Promise.allSettled` : un dépôt en échec ne bloque pas les autres.
 */
export async function fetchRepoMetas(
  repos: { slug: string; owner: string; name: string }[],
): Promise<Map<string, RepoMeta>> {
  const results = await Promise.allSettled(
    repos.map(async (r) => ({ slug: r.slug, meta: await fetchRepoMeta(r.owner, r.name) })),
  )
  const map = new Map<string, RepoMeta>()
  for (const settled of results) {
    if (settled.status === 'fulfilled' && settled.value.meta) {
      map.set(settled.value.slug, settled.value.meta)
    }
  }
  return map
}
