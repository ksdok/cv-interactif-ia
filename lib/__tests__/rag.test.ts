/**
 * BUG-010 — contrat de dégradation de `searchDocuments()`.
 *
 * Le catch-tout de `lib/rag.ts` (dégradation BUG-001) transformait toute erreur
 * (clé Supabase absente, erreur RPC/RLS, échec d'embedding) en `[]`, que la route
 * `/api/job-match` traduisait en 500 sans cause traçable. Ces cas verrouillent le
 * contrat : `searchDocuments` ne throw jamais, et distingue désormais les deux
 * situations côté Sentry (erreur réelle → `captureException` ; table vide → info).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  embeddingsCreate: vi.fn(),
  rpc: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: mocks.embeddingsCreate }
  },
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ rpc: mocks.rpc }),
}))

// `@sentry/nextjs` est mocké : on n'exécute pas le SDK, on vérifie les appels.
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}))

import { searchDocuments } from '@/lib/rag'

describe('searchDocuments — dégradation sans throw (BUG-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Embedding nominal par défaut ; chaque cas peut le surcharger.
    mocks.embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] })
  })

  it('renvoie [] et remonte à Sentry quand l’embedding échoue', async () => {
    mocks.embeddingsCreate.mockRejectedValue(new Error('OPENAI_API_KEY missing'))

    await expect(searchDocuments('offre')).resolves.toEqual([])
    expect(mocks.captureException).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it('renvoie [] et remonte à Sentry quand le RPC Supabase échoue', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    await expect(searchDocuments('offre')).resolves.toEqual([])
    expect(mocks.captureException).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it('renvoie [] et émet un événement info quand le RAG est vide sans erreur', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null })

    await expect(searchDocuments('offre')).resolves.toEqual([])
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      'RAG search returned no documents',
      expect.objectContaining({ level: 'info' }),
    )
    expect(mocks.captureException).not.toHaveBeenCalled()
  })

  it('renvoie les documents nominaux sans émettre d’événement Sentry', async () => {
    const docs = [{ content: 'Extrait de CV' }]
    mocks.rpc.mockResolvedValue({ data: docs, error: null })

    await expect(searchDocuments('offre')).resolves.toEqual(docs)
    expect(mocks.captureException).not.toHaveBeenCalled()
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })
})
