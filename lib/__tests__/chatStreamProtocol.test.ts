/**
 * PERF-002 — tests du protocole de streaming NDJSON de /api/chat.
 *
 * Le décodeur est la pièce déterministe non triviale du ticket (review M10) :
 * il doit supporter un frame coupé entre deux chunks réseau, un buffer de fin
 * incomplet, et ne jamais produire de texte localisé (il ne remonte qu'un
 * `errorCode` agnostique — review M11/M17).
 *
 * Le mapping `errorCode` → message localisé est couvert séparément via
 * `resolveApiErrorMessage()` pour fr et en.
 */
import { describe, it, expect } from 'vitest'
import {
  ChatStreamDecoder,
  encodeChatStreamEvent,
  resolveApiErrorMessage,
  type ChatStreamEvent,
} from '@/lib/chatStreamProtocol'
import fr from '@/lib/i18n/fr'
import en from '@/lib/i18n/en'

describe('encodeChatStreamEvent — encodage serveur', () => {
  it('sérialise un delta en une seule ligne NDJSON terminée par \\n', () => {
    expect(encodeChatStreamEvent({ type: 'delta', text: 'Bonjour' })).toBe(
      '{"type":"delta","text":"Bonjour"}\n'
    )
  })

  it('sérialise done et error', () => {
    expect(encodeChatStreamEvent({ type: 'done' })).toBe('{"type":"done"}\n')
    expect(encodeChatStreamEvent({ type: 'error', errorCode: 'SERVER' })).toBe(
      '{"type":"error","errorCode":"SERVER"}\n'
    )
  })
})

describe('ChatStreamDecoder — décodage incrémental', () => {
  it('décode plusieurs événements reçus dans un même chunk', () => {
    const decoder = new ChatStreamDecoder()
    const chunk =
      encodeChatStreamEvent({ type: 'delta', text: 'Hello' }) +
      encodeChatStreamEvent({ type: 'delta', text: ' world' }) +
      encodeChatStreamEvent({ type: 'done' })

    expect(decoder.push(chunk)).toEqual<ChatStreamEvent[]>([
      { type: 'delta', text: 'Hello' },
      { type: 'delta', text: ' world' },
      { type: 'done' },
    ])
    expect(decoder.pending).toBe('')
  })

  it('reconstitue un frame coupé entre deux chunks (critère d’acceptation)', () => {
    const decoder = new ChatStreamDecoder()
    const full = encodeChatStreamEvent({ type: 'delta', text: 'streaming' })
    const cut = Math.floor(full.length / 2)

    // Première moitié : rien de complet → aucun événement, une ligne en attente.
    expect(decoder.push(full.slice(0, cut))).toEqual<ChatStreamEvent[]>([])
    expect(decoder.pending.length).toBeGreaterThan(0)

    // Seconde moitié : le frame est complété et décodé une seule fois.
    expect(decoder.push(full.slice(cut))).toEqual<ChatStreamEvent[]>([
      { type: 'delta', text: 'streaming' },
    ])
    expect(decoder.pending).toBe('')
  })

  it('bufferise une ligne partielle finale jusqu’à réception du reste', () => {
    const decoder = new ChatStreamDecoder()
    const event = encodeChatStreamEvent({ type: 'delta', text: 'fin' })

    expect(decoder.push(event.slice(0, -1))).toEqual<ChatStreamEvent[]>([])
    expect(decoder.pending).toBe(event.slice(0, -1))

    expect(decoder.push('\n')).toEqual<ChatStreamEvent[]>([{ type: 'delta', text: 'fin' }])
    expect(decoder.pending).toBe('')
  })

  it('expose un événement error en cours de flux via son errorCode seul', () => {
    const decoder = new ChatStreamDecoder()
    const events = decoder.push(
      encodeChatStreamEvent({ type: 'delta', text: 'partiel' }) +
        encodeChatStreamEvent({ type: 'error', errorCode: 'SERVER' })
    )

    expect(events).toEqual<ChatStreamEvent[]>([
      { type: 'delta', text: 'partiel' },
      { type: 'error', errorCode: 'SERVER' },
    ])

    // Le décodeur ne localise jamais : aucun texte lisible dans l'événement.
    const errorEvent = events[1]
    expect(errorEvent.type).toBe('error')
    expect(Object.keys(errorEvent)).toEqual(['type', 'errorCode'])
  })

  it('ignore les lignes malformées ou inconnues sans lever', () => {
    const decoder = new ChatStreamDecoder()
    const events = decoder.push(
      'not json\n' +
        '{"type":"wat"}\n' +
        '{"type":"delta"}\n' +
        '{"type":"error"}\n' +
        '\n' +
        encodeChatStreamEvent({ type: 'delta', text: 'ok' })
    )
    expect(events).toEqual<ChatStreamEvent[]>([{ type: 'delta', text: 'ok' }])
  })
})

describe('resolveApiErrorMessage — mapping errorCode → message localisé (fr + en)', () => {
  it('mappe chaque code connu côté fr', () => {
    expect(resolveApiErrorMessage(fr, 'RATE_LIMIT')).toBe(fr.apiErrors.RATE_LIMIT)
    expect(resolveApiErrorMessage(fr, 'CSRF')).toBe(fr.apiErrors.CSRF)
    expect(resolveApiErrorMessage(fr, 'SERVER')).toBe(fr.apiErrors.SERVER)
    expect(resolveApiErrorMessage(fr, 'VALIDATION')).toBe(fr.apiErrors.VALIDATION)
  })

  it('mappe chaque code connu côté en', () => {
    expect(resolveApiErrorMessage(en, 'RATE_LIMIT')).toBe(en.apiErrors.RATE_LIMIT)
    expect(resolveApiErrorMessage(en, 'CSRF')).toBe(en.apiErrors.CSRF)
    expect(resolveApiErrorMessage(en, 'SERVER')).toBe(en.apiErrors.SERVER)
    expect(resolveApiErrorMessage(en, 'VALIDATION')).toBe(en.apiErrors.VALIDATION)
  })

  it('retourne undefined pour un code inconnu ou absent (jamais de message en dur)', () => {
    expect(resolveApiErrorMessage(fr, 'NOPE')).toBeUndefined()
    expect(resolveApiErrorMessage(fr, undefined)).toBeUndefined()
  })
})
