/**
 * TEST-001 — tests automatisés de la validation des entrées de chat.
 *
 * Migration à parité complète des 37 cas de l'ancien runner manuel
 * `lib/test-validation.ts` (13 valides / 24 invalides), avec une différence
 * structurante : les 24 sous-chaînes `expectedError` sont désormais des
 * assertions **bloquantes** (`expect(...).toContain(...)`), là où l'ancien
 * runner se contentait d'un `console.log('⚠️ Error message mismatch')` jamais
 * vérifié par quoi que ce soit.
 *
 * Import via l'alias `@/*` : c'est la preuve que `vite-tsconfig-paths` résout
 * bien les chemins de `tsconfig.json` depuis un fichier de test.
 */
import { describe, it, expect } from 'vitest'
import { validateChatMessages, assertValidChatMessages } from '@/lib/validation'

// ============================================================
// VALID INPUTS — 13 cas
// ============================================================
describe('validateChatMessages — entrées valides (13 cas)', () => {
  it('accepte un message unique valide', () => {
    expect(validateChatMessages([{ role: 'user', content: 'Hello' }])).toEqual({
      isValid: true,
    })
  })

  it('accepte une conversation multi-messages valide', () => {
    const result = validateChatMessages([
      { role: 'user', content: 'What is your name?' },
      { role: 'assistant', content: 'My name is Claude' },
      { role: 'user', content: 'Nice to meet you' },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte la longueur maximale autorisée (5000 caractères)', () => {
    const result = validateChatMessages([
      { role: 'user', content: 'a'.repeat(5000) },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte les caractères spéciaux', () => {
    const result = validateChatMessages([
      {
        role: 'user',
        content: 'Hello! @#$%^&*() <script>alert("xss")</script>',
      },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte les retours à la ligne', () => {
    const result = validateChatMessages([
      { role: 'user', content: 'Line 1\nLine 2\nLine 3' },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte les caractères unicode', () => {
    const result = validateChatMessages([
      { role: 'user', content: 'Hello 世界 مرحبا мир' },
    ])
    expect(result.isValid).toBe(true)
  })

  it("accepte les espaces en début/fin de contenu", () => {
    const result = validateChatMessages([
      { role: 'user', content: '   Hello world   ' },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte une tentative XSS — autorisée par design (React échappe au rendu)', () => {
    const result = validateChatMessages([
      { role: 'user', content: '<script>alert("XSS")</script>' },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte une tentative d’injection SQL — autorisée par design (contenu envoyé au LLM, pas à une DB)', () => {
    const result = validateChatMessages([
      { role: 'user', content: "'; DROP TABLE users; --" },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte un objet profondément imbriqué — les champs inattendus sont tolérés', () => {
    // Ce cas traverse un `console.warn` dans `validateChatMessages()` : on
    // n'asserte que la valeur de retour. QUAL-002 remplacera ce warn par un
    // logger structuré ; un espion sur `console` casserait pour une mauvaise
    // raison.
    const result = validateChatMessages([
      {
        role: 'user',
        content: 'test',
        nested: { deep: { object: { structure: 'attack' } } },
      },
    ])
    expect(result.isValid).toBe(true)
  })

  it('accepte 50 messages — dans la limite de 100', () => {
    const result = validateChatMessages(
      Array(50)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        }))
    )
    expect(result.isValid).toBe(true)
  })

  it('accepte un contenu uniquement numérique', () => {
    const result = validateChatMessages([{ role: 'user', content: '123456' }])
    expect(result.isValid).toBe(true)
  })

  it('accepte un contenu emoji', () => {
    const result = validateChatMessages([{ role: 'user', content: '😀 👍 🚀' }])
    expect(result.isValid).toBe(true)
  })
})

// ============================================================
// INVALID INPUTS — 24 cas, chacun avec sa sous-chaîne d'erreur attendue
// ============================================================
describe('validateChatMessages — entrées invalides (24 cas)', () => {
  // ---- Entrée qui n'est pas un tableau (5 cas) ----
  it('rejette une entrée string au lieu d’un tableau', () => {
    const result = validateChatMessages('not an array')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('messages must be an array')
  })

  it('rejette une entrée number au lieu d’un tableau', () => {
    const result = validateChatMessages(123)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('messages must be an array')
  })

  it('rejette une entrée object au lieu d’un tableau', () => {
    const result = validateChatMessages({
      messages: [{ role: 'user', content: 'test' }],
    })
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('messages must be an array')
  })

  it('rejette une entrée null', () => {
    const result = validateChatMessages(null)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('messages must be an array')
  })

  it('rejette une entrée undefined', () => {
    const result = validateChatMessages(undefined)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('messages must be an array')
  })

  // ---- Tableau vide / trop grand (2 cas) ----
  it('rejette un tableau vide', () => {
    const result = validateChatMessages([])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('messages array cannot be empty')
  })

  it('rejette un tableau de 101 messages', () => {
    const result = validateChatMessages(
      Array(101)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        }))
    )
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('messages array cannot exceed 100 messages')
  })

  // ---- Structure de message invalide (3 cas) ----
  it('rejette un message qui n’est pas un objet', () => {
    const result = validateChatMessages(['not an object'])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Message at index 0 must be an object')
  })

  it('rejette un message null', () => {
    const result = validateChatMessages([null])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Message at index 0 must be an object')
  })

  it('rejette un message qui est un tableau', () => {
    const result = validateChatMessages([['role', 'user', 'content', 'test']])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      'Message at index 0 must be an object, not an array'
    )
  })

  // ---- Champ manquant (2 cas) ----
  it('rejette un message sans champ role', () => {
    const result = validateChatMessages([{ content: 'Hello' }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      "Message at index 0 must have a string 'role' field"
    )
  })

  it('rejette un message sans champ content', () => {
    const result = validateChatMessages([{ role: 'user' }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      "Message at index 0 must have a string 'content' field"
    )
  })

  // ---- Rôle invalide (2 cas) ----
  it('rejette un rôle « admin »', () => {
    const result = validateChatMessages([
      { role: 'admin', content: 'Hack the system' },
    ])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Message at index 0 has invalid role')
  })

  it('rejette un rôle vide', () => {
    const result = validateChatMessages([{ role: '', content: 'test' }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Message at index 0 has invalid role')
  })

  // ---- Rôle mal typé (2 cas) ----
  it('rejette un rôle de type number', () => {
    const result = validateChatMessages([{ role: 123, content: 'test' }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      "Message at index 0 must have a string 'role' field"
    )
  })

  it('rejette un rôle null', () => {
    const result = validateChatMessages([{ role: null, content: 'test' }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      "Message at index 0 must have a string 'role' field"
    )
  })

  // ---- Contenu invalide (2 cas) ----
  it('rejette un contenu vide', () => {
    const result = validateChatMessages([{ role: 'user', content: '' }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      'Message at index 0 content cannot be empty'
    )
  })

  it('rejette un contenu composé uniquement d’espaces', () => {
    const result = validateChatMessages([
      { role: 'user', content: '   \n\t   ' },
    ])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      'Message at index 0 content cannot be empty'
    )
  })

  // ---- Contenu surdimensionné (2 cas) ----
  it('rejette un contenu de 5001 caractères', () => {
    const result = validateChatMessages([
      { role: 'user', content: 'a'.repeat(5001) },
    ])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      'Message at index 0 content exceeds maximum length'
    )
  })

  it('rejette un payload DoS de 100 000 caractères', () => {
    const result = validateChatMessages([
      { role: 'user', content: 'a'.repeat(100000) },
    ])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('exceeds maximum length')
  })

  // ---- Contenu mal typé (3 cas) ----
  it('rejette un contenu de type number', () => {
    const result = validateChatMessages([{ role: 'user', content: 123 }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      "Message at index 0 must have a string 'content' field"
    )
  })

  it('rejette un contenu null', () => {
    const result = validateChatMessages([{ role: 'user', content: null }])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      "Message at index 0 must have a string 'content' field"
    )
  })

  it('rejette un contenu de type object', () => {
    const result = validateChatMessages([
      { role: 'user', content: { nested: 'object' } },
    ])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain(
      "Message at index 0 must have a string 'content' field"
    )
  })

  // ---- Rôle invalide à l'index 1 (1 cas) ----
  it('rejette un rôle invalide à l’index 1 d’un tableau de 2 messages', () => {
    const result = validateChatMessages([
      { role: 'user', content: 'First' },
      { role: 'invalid', content: 'Second' },
    ])
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Message at index 1 has invalid role')
  })
})

// ============================================================
// assertValidChatMessages — non couvert par l'ancien runner
// ============================================================
describe('assertValidChatMessages', () => {
  it('ne lève pas sur une entrée valide et la narrow en ChatMessage[]', () => {
    const messages: unknown = [{ role: 'user', content: 'Hello' }]
    expect(() => assertValidChatMessages(messages)).not.toThrow()
    // Après l'assertion, TypeScript doit accepter l'accès typé (narrowing).
    if (Array.isArray(messages)) {
      expect(messages[0].content).toBe('Hello')
    }
  })

  it('lève sur une entrée invalide avec la raison du validateur dans le message', () => {
    expect(() => assertValidChatMessages([])).toThrow(
      'Invalid chat messages: messages array cannot be empty'
    )
  })

  it('lève sur une entrée non-tableau avec la raison du validateur', () => {
    expect(() => assertValidChatMessages(null)).toThrow(
      'Invalid chat messages: messages must be an array'
    )
  })
})
