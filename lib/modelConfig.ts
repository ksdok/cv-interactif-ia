/**
 * MODEL CONFIGURATION
 *
 * This is the only file you need to edit to switch AI providers.
 *
 * 1. Change ACTIVE_PROVIDER to switch the primary model.
 * 2. FALLBACK_ORDER defines which providers to try if the active one fails.
 * 3. Adjust model names or maxTokens per provider below.
 *
 * Available providers: 'openai' | 'gemini'
 */

export type Provider = 'openai' | 'gemini'

// ─── Chat provider (interactive CV assistant) ──────────────────────────────
export const ACTIVE_PROVIDER: Provider = 'gemini'
export const FALLBACK_ORDER: Provider[] = ['openai']

// ─── Job match provider (CV analysis) ─────────────────────────────────────
export const ACTIVE_PROVIDER_JOB_MATCH: Provider = 'gemini'
export const FALLBACK_ORDER_JOB_MATCH: Provider[] = ['openai']

// ─── Per-provider model settings ───────────────────────────────────────────
export const MODEL_CONFIG: Record<Provider, { model: string; maxTokens: number }> = {
  openai: {
    model: 'gpt-5.4-mini',
    maxTokens: 1024,
  },
  gemini: {
    model: 'gemini-3.5-flash',
    maxTokens: 1024,
  },
}
