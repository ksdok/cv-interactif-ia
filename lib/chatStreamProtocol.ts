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
