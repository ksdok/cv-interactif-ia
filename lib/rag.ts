import { supabase } from './supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
export async function searchDocuments(
  query: string,
  matchCount: number = 5,
  filter: object = {}
) {
  try {
    console.log('Recherche pour:', query)

    // Create the embedding for the query text.
    const queryEmbedding = await createEmbedding(query)
    console.log('Embedding créé pour la requête.')

    // Call the Supabase RPC 'match_documents' which performs the vector similarity search.
    // Note: the stored procedure determines how match_threshold / filtering are applied.
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter: filter,
    })
    console.log('Résultats Supabase:', { 
      found: data?.length || 0, 
      error: error?.message 
    })
    if (error) {
      console.error('Search error:', error)
      throw error
    }

    // Return the matched documents or an empty array if none found.
    return data || []
  } catch (error) {
    // Surface and log errors originating from embedding creation or the RPC call.
    console.error('Error in searchDocuments:', error)
    throw error
  }
}