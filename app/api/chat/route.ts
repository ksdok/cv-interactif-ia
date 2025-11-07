/*
  API route: POST /api/chat

  Purpose:
  - Implements a small Retrieval-Augmented Generation (RAG) chat flow using:
    - a vector search (searchDocuments) to fetch relevant CV snippets,
    - Anthropic (Claude) to generate a chat response grounded in those snippets.

  High-level flow:
  1. Parse incoming JSON and extract `messages` (chat history).
  2. Use the last user message as the retrieval query.
  3. Fetch top-N relevant documents from the vector DB (RAG).
  4. Build a context string from retrieved snippets and append it to the system prompt.
  5. Call Anthropic's messages.create with the system prompt + chat history.
  6. Extract plain text from Anthropic's structured response and return it as JSON.
*/

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/rag'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  console.log('POST /api/chat - handler start')
  try {
    // Read the JSON payload and extract the conversation messages.
    console.log('Reading request body...')
    const { messages } = await req.json()
    console.log('Request body parsed. messages length:', Array.isArray(messages) ? messages.length : 'invalid')

    // Use the last message from the conversation as the retrieval query.
    const lastUserMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : ''
    console.log('Last user message extracted:', lastUserMessage ? lastUserMessage.slice(0, 200) : '<empty>')

    // Perform the RAG search: get the top 6 relevant document snippets for the query.
    console.log('Calling searchDocuments with query (truncated):', lastUserMessage ? lastUserMessage.slice(0, 200) : '<empty>', ' topK=6')
    const relevantDocs = await searchDocuments(lastUserMessage, 6)
    console.log('Search completed. Documents found:', Array.isArray(relevantDocs) ? relevantDocs.length : 'invalid', relevantDocs?.slice?.(0, 5) ?? relevantDocs)

    // Build a plain-text context from retrieved documents.
    console.log('Building context from retrieved documents...')
    let context = ''
    if (relevantDocs.length > 0) {
      context = '\n\nINFORMATIONS PERTINENTES DU CV:\n'
      relevantDocs.forEach((doc: any, index: number) => {
        // Each snippet is prefixed with an index to make references clearer in the prompt.
        const snippet = `\n[${index + 1}] ${doc.content}\n`
        context += snippet
        console.log(`Context snippet [${index + 1}]:`, (doc.content || '').slice(0, 200))
      })
    } else {
      console.log('No relevant documents returned by searchDocuments.')
    }

    // Call Anthropic (Claude) to generate a response.
    console.log('Preparing to call Anthropic.messages.create. Model: claude-sonnet-4-20250514')
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Tu es un assistant IA personnel qui représente du candidat dans son CV interactif. 

Tu as accès à des informations extraites du CV du candidat via un système RAG (Retrieval Augmented Generation).

INSTRUCTIONS:
- Utilise PRIORITAIREMENT les informations fournies dans le contexte RAG ci-dessous
- Si l'information n'est pas dans le contexte RAG, utilise tes connaissances générales sur le candidat
- Réponds de manière naturelle et conversationnelle
- Sois précis et factuel quand tu as les informations
- Si tu n'as pas l'information, dis-le honnêtement
- Ne réponds QU'aux questions concernant le candidat
- Réponds en français ou en anglais selon la langue de la question posée
- Tu proposes des exemples concrets quand c'est pertinent
- Tu peux suggérer au recruteur de poser des questions spécifiques pour en savoir plus
${context}`,
      messages: messages,
    })
    console.log('Anthropic response received. Raw response keys:', Object.keys(response || {}))

    // Anthropic's response is structured as an array of content blocks.
    // We look for a block with type === 'text' and return its `text` field.
    const textContent = response.content.find((block) => block.type === 'text')
    const text = textContent && 'text' in textContent ? textContent.text : ''
    console.log('Extracted text from Anthropic response (truncated):', text ? text.slice(0, 300) : '<empty>')

    // Return the extracted text to the client as JSON.
    console.log('Returning response to client.')
    return NextResponse.json({ response: text })
  } catch (error) {
    // Log the error server-side for debugging and return a generic 500 error to the client.
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la communication avec Claude' },
      { status: 500 }
    )
  }
}

// Handles POST requests to /api/chat.
// - Parses JSON payload and extracts `messages`.
// - Picks the last user message (`lastUserMessage`) to use as the retrieval query.
// - Calls `searchDocuments(lastUserMessage, 3)` to get the top 3 relevant CV snippets (RAG).
// - Builds a `context` string containing those snippets to give the model concrete facts.
// - Calls Anthropic's SDK (Claude) with:
//     - a descriptive system prompt (in French) that instructs the assistant to represent the candidate,
//     - the RAG-built `context` appended to the prompt,
//     - the conversation `messages` to maintain chat history.
// - Receives a structured response, finds the block with `type === 'text'` and extracts `text`.
// - Returns `{ response: text }` as JSON to the caller.
// - On error: logs details server-side and returns a 500 JSON error message.