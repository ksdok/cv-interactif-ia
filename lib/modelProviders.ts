/**
 * Model Providers
 *
 * Wraps Anthropic, OpenAI, and Gemini behind a unified interface.
 * Call generateResponse() — it handles provider selection and fallback.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ACTIVE_PROVIDER, FALLBACK_ORDER, ACTIVE_PROVIDER_JOB_MATCH, FALLBACK_ORDER_JOB_MATCH, MODEL_CONFIG, type Provider } from './modelConfig'

// ─── SDK clients (initialized once at module level) ────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ─── Message type shared across providers ──────────────────────────────────

import type { ChatMessage } from './types'
export type { ChatMessage }

// ─── Per-provider call functions ────────────────────────────────────────────

async function callAnthropic(messages: ChatMessage[], system: string): Promise<string> {
  const config = MODEL_CONFIG.anthropic
  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system,
    messages,
  })
  const block = response.content.find((b) => b.type === 'text')
  return block && 'text' in block ? block.text : ''
}

async function callOpenAI(messages: ChatMessage[], system: string): Promise<string> {
  const config = MODEL_CONFIG.openai
  const response = await openai.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
  })
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
  return result.response.text()
}

// ─── Provider dispatcher ────────────────────────────────────────────────────

const PROVIDERS: Record<Provider, (messages: ChatMessage[], system: string) => Promise<string>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
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

// ─── Job match entry point with fallback ────────────────────────────────────
// Uses a single prompt (no conversation history) — each provider wraps it correctly.

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
