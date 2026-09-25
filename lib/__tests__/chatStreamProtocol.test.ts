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
  computeRevealChars,
  encodeChatStreamEvent,
  resolveApiErrorMessage,
  REVEAL_CATCHUP_THRESHOLD_CHARS,
  REVEAL_MAX_LAG_CHARS,
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

describe('computeRevealChars — lissage de révélation (PERF-002 post-spec)', () => {
  // Rythme nominal : 60 caractères/s tant que le tampon reste court.
  it('révèle au rythme nominal quand le tampon est court', () => {
    // 0,5 s à 60 c/s → 30 caractères (tampon de 90 insuffisant pour saturer).
    expect(computeRevealChars(90, 500)).toEqual({ chars: 30, remainder: 0 })
    // 1 frame ~60 fps → 1 caractère.
    expect(computeRevealChars(90, 1000 / 60)).toEqual({
      chars: 1,
      remainder: expect.any(Number),
    })
  })

  it('ne révèle jamais plus que le tampon disponible', () => {
    const budget = computeRevealChars(5, 1000, 0, true)
    expect(budget.chars).toBe(5)
    expect(budget.remainder).toBe(0)
  })

  it('ne révèle rien sans tampon ou sans temps écoulé', () => {
    expect(computeRevealChars(0, 16)).toEqual({ chars: 0, remainder: 0 })
    expect(computeRevealChars(50, 0)).toEqual({ chars: 0, remainder: 0 })
    expect(computeRevealChars(-3, 16)).toEqual({ chars: 0, remainder: 0 })
  })

  // Rattrapage : au-delà du seuil, le débit dépasse le nominal.
  it('accélère progressivement au-delà du seuil de retard', () => {
    const nominal = computeRevealChars(REVEAL_CATCHUP_THRESHOLD_CHARS, 100).chars
    const ramp = computeRevealChars(120, 100).chars // mi-pente vers le plafond
    const capped = computeRevealChars(REVEAL_MAX_LAG_CHARS, 100).chars

    expect(nominal).toBe(6) // 60 c/s × 0,1 s
    expect(ramp).toBeGreaterThan(nominal)
    expect(capped).toBeGreaterThan(ramp)
    // Au plafond : ×4 le nominal.
    expect(capped).toBe(24)
  })

  // Borne de retard : le débit croît avec le retard → drainage toujours < 2,5 s.
  it('borne le retard sous ~2,5 s, même pour un très gros tampon', () => {
    const elapsed = 50
    for (const backlog of [10, 50, 90, 91, 120, 150, 300, 1000]) {
      const { chars } = computeRevealChars(backlog, elapsed)
      expect(chars).toBeGreaterThan(0)
      const charsPerSecond = (chars / elapsed) * 1000
      const secondsToDrain = backlog / charsPerSecond
      expect(secondsToDrain).toBeLessThan(2.5)
    }
  })

  it('forceCatchUp (fin de flux) vide le reliquat au débit maximal', () => {
    const normal = computeRevealChars(50, 100).chars
    const forced = computeRevealChars(50, 100, 0, true).chars
    expect(forced).toBeGreaterThan(normal)
    expect(forced).toBe(24) // 60 × 4 × 0,1 s
  })

  // Anti-stutter : la fraction non révélée est reportée à la frame suivante.
  it('reporte la fraction non révélée (pas de blocage à 0 caractère)', () => {
    const first = computeRevealChars(60, 10)
    expect(first.chars).toBe(0)
    expect(first.remainder).toBeCloseTo(0.6, 5)

    const second = computeRevealChars(60, 10, first.remainder)
    expect(second.chars).toBe(1)
    expect(second.remainder).toBeCloseTo(0.2, 5)
  })
})
