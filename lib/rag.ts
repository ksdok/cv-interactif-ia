import { supabase } from './supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Créer un embedding
export async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

// Rechercher dans la base vectorielle documents
export async function searchDocuments(
  query: string,
  matchCount: number = 5,
  filter: object = {}
) {
  try {
    // Créer l'embedding de la question
    const queryEmbedding = await createEmbedding(query)

    // Rechercher les documents similaires
    // Note: la fonction match_documents n'utilise pas match_threshold
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter: filter,
    })

    if (error) {
      console.error('Erreur recherche:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Erreur searchDocuments:', error)
    throw error
  }
}