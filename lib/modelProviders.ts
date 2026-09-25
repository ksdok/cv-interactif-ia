/**
 * Model Providers
 *
 * Wraps OpenAI and Gemini behind a unified interface.
 * Call generateResponse() — it handles provider selection and fallback.
 */

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ACTIVE_PROVIDER, FALLBACK_ORDER, ACTIVE_PROVIDER_JOB_MATCH, FALLBACK_ORDER_JOB_MATCH, MODEL_CONFIG, type Provider } from './modelConfig'

// ─── SDK clients (initialized once at module level) ────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ─── Message type shared across providers ──────────────────────────────────

import type { ChatMessage } from './types'
export type { ChatMessage }

// ─── MODEL-004 (décision 2) — `reasoning_effort` épinglé ───────────────────
// Ne jamais laisser ce paramètre hériter du défaut provider : il vaut `none`
// pour `gpt-5.4-mini` mais **`medium`** pour la famille GPT-6, donc la bascule
// vers `gpt-6-luna` changerait le comportement sans qu'aucune ligne de code ne
// bouge. Mesuré au banc : +74 % de TTFT et +34 % de coût, et c'est le bras
// `medium` qui cédait sur le garde-fou hors-sujet (2026-09-23). Confirmé le
// 2026-09-25 — `gpt-6-luna` défaut provider : 32 tokens de raisonnement,
// TTFT 1325 ms, $0,000085/appel ; avec `'none'` : 0 token, 773 ms, $0,000058.
//
// `'none'` est accepté par l'API pour ces modèles mais absent de l'union
// `ReasoningEffort` du SDK (openai@6.7.0 : `'minimal' | 'low' | 'medium' |
// 'high' | null`). Le cast est confiné à cette constante : substituer
// `'minimal'` serait une autre valeur, jamais mesurée ici.
type ChatReasoningEffort = Parameters<typeof openai.chat.completions.create>[0]['reasoning_effort']
const CHAT_REASONING_EFFORT = 'none' as unknown as ChatReasoningEffort

// ─── Per-provider call functions ────────────────────────────────────────────

async function callOpenAI(messages: ChatMessage[], system: string): Promise<string> {
  const config = MODEL_CONFIG.openai
  const response = await openai.chat.completions.create({
    model: config.model,
    max_completion_tokens: config.maxTokens,
    // MODEL-004 décision 2 — épinglé, jamais hérité (voir la constante en tête).
    reasoning_effort: CHAT_REASONING_EFFORT,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
  })

  const cachedTokens = response.usage?.prompt_tokens_details?.cached_tokens
  if (cachedTokens) {
    console.log(`[modelProviders] OpenAI cache hit: ${cachedTokens} cached tokens`)
  }

  return response.choices[0]?.message?.content || ''
}

async function callGemini(messages: ChatMessage[], system: string): Promise<string> {
  const config = MODEL_CONFIG.gemini
  const model = gemini.getGenerativeModel({
    model: config.model,
    systemInstruction: system,
  })

  // Convert to Gemini history format (all messages except the last user message)
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1].content

  const chat = model.startChat({ history })
  const result = await chat.sendMessage(lastMessage)

  const usage = result.response.usageMetadata
  if (usage) {
    console.log(`[modelProviders] Gemini usage: ${JSON.stringify(usage)}`)
  }

  return result.response.text()
}

// ─── Per-provider streaming call functions (PERF-002) ───────────────────────
// Mirrors the structure above; the only change is the transport. The Gemini
// code stays behind this seam so MODEL-003 (SDK migration) will only touch
// `callGemini*` (spec §1, review M4).

async function* callOpenAIStream(
  messages: ChatMessage[],
  system: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const config = MODEL_CONFIG.openai
  const stream = await openai.chat.completions.create(
    {
      model: config.model,
      max_completion_tokens: config.maxTokens,
      // MODEL-004 décision 2 — épinglé, jamais hérité (voir la constante en tête).
      reasoning_effort: CHAT_REASONING_EFFORT,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
      stream: true,
      // M3 (review): `include_usage` is REQUIRED, not optional — without it
      // `usage` is null on every chunk and the final chunk loses
      // `prompt_tokens_details.cached_tokens`, silently breaking the cache-hit
      // logging relied on by FEAT-CAG/GEO-08g.
      stream_options: { include_usage: true },
    },
    { signal }
  )

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta

    const cachedTokens = chunk.usage?.prompt_tokens_details?.cached_tokens
    if (cachedTokens) {
      console.log(`[modelProviders] OpenAI cache hit (stream): ${cachedTokens} cached tokens`)
    }
  }
}

async function* callGeminiStream(
  messages: ChatMessage[],
  system: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const config = MODEL_CONFIG.gemini
  const model = gemini.getGenerativeModel({
    model: config.model,
    systemInstruction: system,
  })

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1].content

  const chat = model.startChat({ history })
  // M2 (review): `sendMessageStream` is the minimal-diff counterpart of
  // `sendMessage`; `generateContentStream` would drop the chat session.
  const result = await chat.sendMessageStream(lastMessage, { signal })

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }

  // `result.response` resolves with the aggregated result — usage logging in
  // streaming mode is therefore trivial (spec §1, review M2).
  const usage = (await result.response).usageMetadata
  if (usage) {
    console.log(`[modelProviders] Gemini usage (stream): ${JSON.stringify(usage)}`)
  }
}

// ─── Provider dispatcher ────────────────────────────────────────────────────

const PROVIDERS: Record<Provider, (messages: ChatMessage[], system: string) => Promise<string>> = {
  openai: callOpenAI,
  gemini: callGemini,
}

const STREAM_PROVIDERS: Record<
  Provider,
  (messages: ChatMessage[], system: string, signal?: AbortSignal) => AsyncGenerator<string>
> = {
  openai: callOpenAIStream,
  gemini: callGeminiStream,
}

// ─── Main entry point with fallback ─────────────────────────────────────────

export async function generateResponse(messages: ChatMessage[], system: string): Promise<string> {
  const chain: Provider[] = [
    ACTIVE_PROVIDER,
    ...FALLBACK_ORDER.filter((p) => p !== ACTIVE_PROVIDER),
  ]

  let lastError: unknown

  for (const provider of chain) {
    try {
      console.log(`[modelProviders] Trying provider: ${provider} (model: ${MODEL_CONFIG[provider].model})`)
      const text = await PROVIDERS[provider](messages, system)
      if (provider !== ACTIVE_PROVIDER) {
        console.warn(`[modelProviders] Active provider '${ACTIVE_PROVIDER}' failed. Used fallback: '${provider}'`)
      }
      return text
    } catch (err) {
      console.error(`[modelProviders] Provider '${provider}' failed:`, err)
      lastError = err
    }
  }

  throw lastError
}

// ─── Streaming entry point with first-byte-commit fallback (PERF-002) ───────
// Design Decision 2 (review M9), Option A: the provider choice is committed at
// the first byte written downstream. If a provider fails before it has yielded
// any content, the chain falls back silently (today's behaviour). If it fails
// after, the error is re-thrown so the route can emit an `error` event — there
// is deliberately NO mid-stream provider switch (it would stitch two models).
//
// Note (spec §1, review M14): the non-streaming loops were intentionally NOT
// refactored into a shared dispatcher — duplicating only the streaming loop is
// the accepted fallback and keeps the /api/job-match diff at zero.

export async function* streamResponse(
  messages: ChatMessage[],
  system: string,
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<string> {
  const chain: Provider[] = [
    ACTIVE_PROVIDER,
    ...FALLBACK_ORDER.filter((p) => p !== ACTIVE_PROVIDER),
  ]

  let lastError: unknown

  for (const provider of chain) {
    let committed = false

    try {
      console.log(`[modelProviders] Streaming with provider: ${provider} (model: ${MODEL_CONFIG[provider].model})`)

      for await (const delta of STREAM_PROVIDERS[provider](messages, system, options.signal)) {
        if (delta) committed = true
        yield delta
      }

      if (provider !== ACTIVE_PROVIDER) {
        console.warn(`[modelProviders] Active provider '${ACTIVE_PROVIDER}' failed. Used streaming fallback: '${provider}'`)
      }
      return
    } catch (err) {
      lastError = err
      if (committed) {
        console.error(`[modelProviders] Provider '${provider}' failed mid-stream after first byte — no fallback:`, err)
        throw err
      }
      console.error(`[modelProviders] Provider '${provider}' failed before first byte:`, err)
    }
  }

  throw lastError
}

// ─── Job match entry point with fallback ────────────────────────────────────
// Uses a single prompt (no conversation history) — each provider wraps it correctly.
// MODEL-004 décision 2 : `/api/job-match` partage `MODEL_CONFIG.openai.model`
// (décision 4) et donc `callOpenAI`, où `reasoning_effort` est épinglé à `'none'` :
// la sortie attendue est un JSON court et rapide, la même valeur est retenue pour
// cet endpoint (recommandation de la spec, tranchée ici).

export async function generateJobMatchResponse(prompt: string): Promise<string> {
  const chain: Provider[] = [
    ACTIVE_PROVIDER_JOB_MATCH,
    ...FALLBACK_ORDER_JOB_MATCH.filter((p) => p !== ACTIVE_PROVIDER_JOB_MATCH),
  ]

  let lastError: unknown

  for (const provider of chain) {
    try {
      console.log(`[modelProviders:jobMatch] Trying provider: ${provider} (model: ${MODEL_CONFIG[provider].model})`)
      const text = await PROVIDERS[provider]([{ role: 'user', content: prompt }], '')
      if (provider !== ACTIVE_PROVIDER_JOB_MATCH) {
        console.warn(`[modelProviders:jobMatch] Active provider '${ACTIVE_PROVIDER_JOB_MATCH}' failed. Used fallback: '${provider}'`)
      }
      return text
    } catch (err) {
      console.error(`[modelProviders:jobMatch] Provider '${provider}' failed:`, err)
      lastError = err
    }
  }

  throw lastError
}
