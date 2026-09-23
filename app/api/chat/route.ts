/*
  API route: POST /api/chat

  Purpose:
  - Implements a context-grounded chat flow:
    - CAG mode loads the full CV from data/cv.md.
    - RAG mode fetches relevant CV snippets from Supabase.
    - generateResponse() calls the configured AI provider with fallback support.

  High-level flow:
  1. Parse incoming JSON and extract `messages` (chat history) and `lang`.
  2. Use the last user message as the context query when RAG is enabled.
  3. Build context from the configured source (`CV_CONTEXT_SOURCE`).
  4. Build the system prompt: persona + context + consigne de langue (GEO-08g).
  5. Call generateResponse() — uses ACTIVE_PROVIDER with automatic fallback.
  6. Return the response text as JSON.

  GEO-08g : `lang` (`'fr'` | `'en'`, tout le reste → `fr`, sans 400) n'altère ni
  le persona ni le bloc de contexte — il n'ajoute qu'une consigne de langue en
  **fin** de system prompt, après le bloc CV : le préfixe stable (persona + CV)
  reste identique entre les deux langues et le prompt caching provider-side
  reste partagé (review M5).

  To switch AI provider or context source: edit lib/modelConfig.ts
*/

import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/rag'
import { validateChatMessages, resolveChatLanguage } from '@/lib/validation'
import { getCSRFTokenFromRequest, verifyCSRFToken } from '@/lib/csrf'
import { cookies } from 'next/headers'
import { CSRF_COOKIE_CONFIG } from '@/lib/csrf'
import { getClientIP, checkRateLimit, getRateLimitHeaders, getRetryAfterSeconds } from '@/lib/rateLimit'
import { generateResponse } from '@/lib/modelProviders'
import { CV_CONTEXT_SOURCE } from '@/lib/modelConfig'
import { getCVContext } from '@/lib/cvContext'
import { buildChatSystemPrompt } from '@/lib/systemPrompt.mjs'

interface Document {
  content: string
}

async function getChatContext(userMessage: string): Promise<string> {
  if (CV_CONTEXT_SOURCE === 'rag') {
    console.log('Calling searchDocuments with query (truncated):', userMessage ? userMessage.slice(0, 200) : '<empty>', ' topK=10')
    const relevantDocs = await searchDocuments(userMessage, 10)
    console.log('Search completed. Documents found:', Array.isArray(relevantDocs) ? relevantDocs.length : 'invalid', relevantDocs?.slice?.(0, 5) ?? relevantDocs)

    let context = ''
    if (relevantDocs.length > 0) {
      context = '\n\nRELEVANT RESUME INFORMATION:\n'
      relevantDocs.forEach((doc: Document, index: number) => {
        context += `\n[${index + 1}] ${doc.content}\n`
        console.log(`Context snippet [${index + 1}]:`, (doc.content || '').slice(0, 200))
      })
    } else {
      console.log('No relevant documents returned by searchDocuments.')
    }
    return context
  }

  console.log('Loading full CV context from data/cv.md (CAG mode).')
  const cvContent = getCVContext()
  return `\n\nCANDIDATE CV:\n${cvContent}\n`
}

export async function POST(req: Request) {
  console.log('POST /api/chat - handler start')
  try {
    // SECURITY: Check rate limit to prevent API abuse
    // Limits: 200 requests per day per IP address
    // Protects against: spam, DoS attacks, quota exhaustion
    console.log('Checking rate limit...')
    const clientIP = getClientIP(req)
    const rateLimit = checkRateLimit(clientIP)

    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded:', { clientIP, resetTime: rateLimit.resetTime })
      const retryAfterSeconds = getRetryAfterSeconds()
      return NextResponse.json(
        {
          error: 'Rate limit exceeded: 200 requests per day maximum',
          // GEO-08b (review M4) : code agnostique de la langue, mappé côté client.
          errorCode: 'RATE_LIMIT',
          retryAfter: retryAfterSeconds,
          resetTime: rateLimit.resetTime,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            ...getRateLimitHeaders(rateLimit),
          },
        }
      )
    }
    console.log(`Rate limit OK: ${rateLimit.remaining} requests remaining today`)

    // SECURITY: Verify CSRF token to prevent Cross-Site Request Forgery attacks
    // This ensures the request comes from a legitimate user on our site,
    // not from a malicious attacker's website
    console.log('Verifying CSRF token...')
    const csrfTokenFromRequest = getCSRFTokenFromRequest(req)
    const cookieStore = await cookies()
    const csrfTokenFromCookie = cookieStore.get(CSRF_COOKIE_CONFIG.name)?.value

    if (!verifyCSRFToken(csrfTokenFromRequest, csrfTokenFromCookie)) {
      console.warn('CSRF token validation failed:', {
        hasToken: !!csrfTokenFromRequest,
        tokenLength: csrfTokenFromRequest?.length || 0,
      })
      return NextResponse.json(
        { error: 'CSRF token validation failed', errorCode: 'CSRF' },
        { status: 403 }
      )
    }
    console.log('CSRF token verified ✓')

    // Read the JSON payload and extract the conversation messages.
    console.log('Reading request body...')
    const { messages, lang } = await req.json()
    console.log('Request body parsed. messages length:', Array.isArray(messages) ? messages.length : 'invalid')

    // SECURITY: Validate input structure and content to prevent:
    // - Memory exhaustion from huge payloads
    // - Type confusion attacks
    // - Invalid message structures
    const validation = validateChatMessages(messages)
    if (!validation.isValid) {
      console.warn('Invalid message format:', validation.error)
      return NextResponse.json(
        { error: `Invalid request: ${validation.error}`, errorCode: 'VALIDATION' },
        { status: 400 }
      )
    }

    // Use the last message from the conversation as the retrieval query.
    // Safe to access after validation confirms messages is non-empty array with valid structure
    const lastUserMessage = messages[messages.length - 1].content.trim()
    console.log('Last user message extracted:', lastUserMessage ? lastUserMessage.slice(0, 200) : '<empty>')

    const context = await getChatContext(lastUserMessage)

    // GEO-08g : valeur absente/invalide → fr (review M6), jamais un 400.
    const responseLanguage = resolveChatLanguage(lang)
    console.log('Response language:', responseLanguage, '(requested:', JSON.stringify(lang) + ')')

    const systemPrompt = buildChatSystemPrompt(context, responseLanguage)

    // Call the configured AI provider (with automatic fallback).
    // To change provider or model: edit lib/modelConfig.ts
    console.log('Calling generateResponse...')
    const text = await generateResponse(messages, systemPrompt)
    console.log('Response received (truncated):', text ? text.slice(0, 300) : '<empty>')

    // Return the extracted text to the client as JSON.
    console.log('Returning response to client.')
    // Include rate limit headers so client knows how many requests remain
    return NextResponse.json(
      { response: text },
      {
        headers: getRateLimitHeaders(rateLimit),
      }
    )
  } catch (error) {
    // Log the error server-side for debugging and return a generic 500 error to the client.
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.', errorCode: 'SERVER' },
      { status: 500 }
    )
  }
}
