/**
 * lib/chatStreamProtocol.ts — PERF-002 — NDJSON streaming protocol for /api/chat.
 *
 * Pure, dependency-free and isomorphic module: it is imported both by the
 * server route handler (`app/api/chat/route.ts`) and by the client component
 * (`components/ChatPreview.tsx`, a `'use client'` module). It therefore must
 * NEVER carry the `server-only` marker and must not import anything
 * server-side (spec §1, reviews M12/M17).
 *
 * Wire format (`Content-Type: application/x-ndjson`): one JSON object per line.
 * Typed events:
 *   {"type":"delta","text":"..."}       — incremental provider output
 *   {"type":"done"}                      — stream complete
 *   {"type":"error","errorCode":"..."}   — provider failure after the stream started
 *
 * The decoder never produces localized text: it surfaces the language-agnostic
 * `errorCode` only. Localization stays a client concern, via
 * `resolveApiErrorMessage()` (spec §1/§3, reviews M11).
 */

export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; errorCode: string }

/** Serialize one event as a single NDJSON line (trailing newline included). */
export function encodeChatStreamEvent(event: ChatStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}

/**
 * Incremental NDJSON decoder.
 *
 * Feed it raw text chunks as they arrive from the network; it returns the
 * complete events decoded so far and keeps any trailing partial line buffered
 * until the rest of the frame arrives — a network chunk can split a JSON line
 * anywhere (spec acceptance criteria).
 *
 * Malformed lines are ignored rather than thrown: a single corrupt frame must
 * not crash the UI.
 */
export class ChatStreamDecoder {
  private buffer = ''

  push(chunk: string): ChatStreamEvent[] {
    this.buffer += chunk
    const events: ChatStreamEvent[] = []

    let newlineIndex = this.buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim()
      this.buffer = this.buffer.slice(newlineIndex + 1)
      if (line) {
        const event = parseChatStreamEvent(line)
        if (event) events.push(event)
      }
      newlineIndex = this.buffer.indexOf('\n')
    }

    return events
  }

  /** Trailing partial line still awaiting its newline (usually empty). */
  get pending(): string {
    return this.buffer
  }
}

function parseChatStreamEvent(line: string): ChatStreamEvent | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null

  const candidate = parsed as { type?: unknown; text?: unknown; errorCode?: unknown }

  switch (candidate.type) {
    case 'delta':
      return typeof candidate.text === 'string'
        ? { type: 'delta', text: candidate.text }
        : null
    case 'done':
      return { type: 'done' }
    case 'error':
      return typeof candidate.errorCode === 'string'
        ? { type: 'error', errorCode: candidate.errorCode }
        : null
    default:
      return null
  }
}

/* -------------------------------------------------------------------------
 * Lissage de l'affichage côté client (PERF-002, décision produit opérateur
 * post-spec).
 *
 * Le serveur et le protocole NDJSON sont INTACTS : le TTFT reste le premier
 * octet réseau. Ces helpers ne font que calibrer le *rythme de révélation* du
 * texte déjà reçu, pour une lecture naturelle au lieu d'un déversement
 * instantané. Module pur et isomorphe (importé par `ChatPreview.tsx`).
 * ---------------------------------------------------------------------- */

/** Rythme nominal de révélation, en caractères par seconde (≈ lecture naturelle). */
export const REVEAL_CHARS_PER_SECOND = 60

/** Retard tamponné (≈ 1,5 s au rythme nominal) au-delà duquel on accélère. */
export const REVEAL_CATCHUP_THRESHOLD_CHARS = 90

/** Retard maximal ciblé (≈ 2,5 s au rythme nominal) : borne haute du rattrapage. */
export const REVEAL_MAX_LAG_CHARS = 150

/** Facteur de rattrapage atteint au seuil de retard ; au-delà, il croît avec le retard. */
export const REVEAL_CATCHUP_MAX_MULTIPLIER = 4

/** Budget de révélation d'une frame : caractères affichés + report fractionnaire. */
export interface RevealBudget {
  /** Caractères à révéler maintenant (entier, jamais > `backlog`). */
  chars: number
  /** Fraction de caractère reportée à la frame suivante (anti-stutter 0/1). */
  remainder: number
}

/**
 * Calcule combien de caractères révéler sur une frame, à partir du tampon en
 * attente (`backlog`), du temps écoulé (`elapsedMs`) et d'un éventuel report
 * fractionnaire.
 *
 * Politique (décision produit opérateur) :
 * - rythme nominal constant `REVEAL_CHARS_PER_SECOND` tant que le tampon reste
 *   court (affichage régulier, non nerveux) ;
 * - au-delà de `REVEAL_CATCHUP_THRESHOLD_CHARS`, accélération progressive
 *   jusqu'à `REVEAL_CATCHUP_MAX_MULTIPLIER` × au seuil `REVEAL_MAX_LAG_CHARS` ;
 * - au-delà de ce seuil, le débit croît proportionnellement au retard, ce qui
 *   garantit que le tampon se résorbe (retard borné) même si le réseau débite
 *   plus vite que le rattrapage maximal ;
 * - `forceCatchUp` (fin de flux) impose le rattrapage pour vider le reliquat
 *   sans traîner, avant finalisation.
 */
export function computeRevealChars(
  backlog: number,
  elapsedMs: number,
  remainder = 0,
  forceCatchUp = false
): RevealBudget {
  if (backlog <= 0 || elapsedMs <= 0) return { chars: 0, remainder: 0 }

  let multiplier = 1
  if (backlog >= REVEAL_MAX_LAG_CHARS) {
    multiplier = REVEAL_CATCHUP_MAX_MULTIPLIER * (backlog / REVEAL_MAX_LAG_CHARS)
  } else if (backlog > REVEAL_CATCHUP_THRESHOLD_CHARS) {
    const span = REVEAL_MAX_LAG_CHARS - REVEAL_CATCHUP_THRESHOLD_CHARS
    const progress = (backlog - REVEAL_CATCHUP_THRESHOLD_CHARS) / span
    multiplier = 1 + (REVEAL_CATCHUP_MAX_MULTIPLIER - 1) * progress
  }
  if (forceCatchUp) {
    multiplier = Math.max(multiplier, REVEAL_CATCHUP_MAX_MULTIPLIER)
  }

  const owed = (REVEAL_CHARS_PER_SECOND * multiplier * elapsedMs) / 1000 + remainder
  const target = Math.floor(owed)

  // Rien à révéler cette frame : on reporte la fraction accumulée.
  if (target <= 0) return { chars: 0, remainder: owed }
  // Le tampon est entièrement rattrapé : on le vide et on jette le surplus.
  if (target >= backlog) return { chars: backlog, remainder: 0 }
  return { chars: target, remainder: owed - target }
}

/**
 * Map a language-agnostic API `errorCode` to its localized message using the
 * page dictionary. Extracted from `ChatPreview.tsx` so the
 * "error event → localized message" path is unit-testable in the Node-only
 * Vitest environment (spec §3, review M11). Unknown/absent codes return
 * `undefined` so callers can fall back to their own message.
 */
export function resolveApiErrorMessage<C extends string>(
  dictionary: { apiErrors: Record<C, string> },
  errorCode: string | undefined
): string | undefined {
  if (!errorCode) return undefined
  return dictionary.apiErrors[errorCode as C]
}
