import { getSupabase } from './supabase'
import OpenAI from 'openai'
import { captureException, captureMessage } from '@sentry/nextjs'

// `|| ''` : même garde que `lib/modelProviders.ts` (BUG-008). Le SDK OpenAI
// lève à la construction si `apiKey` est `undefined`, ce qui faisait échouer
// `next build` sans clé provider ; une chaîne vide reporte l'échec à l'appel
// réel, où le `try/catch` de `searchDocuments` dégrade proprement.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

/*
  This module provides simple RAG (Retrieval-Augmented Generation) helpers:
  - createEmbedding(text): create a vector embedding for a given text using OpenAI embeddings.
  - searchDocuments(query, matchCount, filter): create an embedding for the query and
    call a Supabase RPC (match_documents) to retrieve the most similar document passages.

  The functions are thin wrappers around the OpenAI embeddings API and a Supabase
  stored procedure that performs vector similarity search.
*/

// Create an embedding for the provided text using OpenAI embeddings API.
export async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

// Search documents in the vector database (Supabase).
// - query: the user query to embed and match against stored document embeddings.
// - matchCount: number of nearest neighbors to return (default 5).
// - filter: optional additional filter passed to the RPC (structure depends on your DB schema).
export async function searchDocuments(query: string, matchCount: number = 5, filter: object = {}) {
  try {
    console.log('Searching for:', query)

    // Create the embedding for the query text.
    const queryEmbedding = await createEmbedding(query)
    console.log('Embedding created for the query.')

    // Call the Supabase RPC 'match_documents' which performs the vector similarity search.
    // Note: the stored procedure determines how match_threshold / filtering are applied.
    const { data, error } = await getSupabase().rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter: filter,
    })
    console.log('Supabase results:', {
      found: data?.length || 0,
      error: error?.message,
    })
    if (error) {
      console.error('Search error:', error)
      throw error
    }

    // BUG-010 — cas silencieux : aucun document sans erreur (table vide,
    // filtre trop strict). Jusqu'ici invisible en prod (aucun log d'erreur),
    // d'où le 500 « No CV data found » sans cause traçable. Une fois par appel,
    // pas de spam.
    if (!data || data.length === 0) {
      captureMessage('RAG search returned no documents', {
        level: 'info',
        tags: { phase: 'rag-search', reason: 'empty-result' },
      })
    }

    // Return the matched documents or an empty array if none found.
    return data || []
  } catch (error) {
    // Surface and log errors originating from embedding creation or the RPC call.
    // console.error conservé : d'autres outils (scripts, logs Vercel) greppent
    // cette ligne ; Sentry est ajouté par-dessus, pas à sa place.
    console.error('Error in searchDocuments:', error)
    // BUG-010 — le catch-tout (dégradation BUG-001) rendait la cause racine
    // invisible : toute erreur (clé Supabase absente, RPC/RLS, embedding) se
    // réduisait à `[]`, indistinguable d'une table vide côté route. On remonte
    // désormais l'erreur réelle à Sentry (garde DSN OBS-001 : no-op sans DSN).
    captureException(error, { tags: { phase: 'rag-search', reason: 'search-failed' } })
    return []
  }
}
