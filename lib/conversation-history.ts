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

// Rechercher dans conversation_history
export async function searchConversationHistory(
  query: string,
  matchThreshold: number = 0.5,
  matchCount: number = 5
) {
  try {
    // Créer l'embedding de la question
    const queryEmbedding = await createEmbedding(query)

    // Rechercher dans l'historique des conversations
    const { data, error } = await supabase.rpc('match_conversation_history', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    })

    if (error) {
      console.error('Erreur recherche conversation_history:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Erreur searchConversationHistory:', error)
    throw error
  }
}
