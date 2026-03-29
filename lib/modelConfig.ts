/**
 * MODEL CONFIGURATION
 *
 * This is the only file you need to edit to switch AI providers.
 *
 * 1. Change ACTIVE_PROVIDER to switch the primary model.
 * 2. FALLBACK_ORDER defines which providers to try if the active one fails.
 * 3. Adjust model names or maxTokens per provider below.
 *
 * Available providers: 'anthropic' | 'openai' | 'gemini'
 */

export type Provider = 'anthropic' | 'openai' | 'gemini'

// ─── Chat provider (interactive CV assistant) ──────────────────────────────
export const ACTIVE_PROVIDER: Provider = 'gemini'
export const FALLBACK_ORDER: Provider[] = ['openai', 'anthropic']

// ─── Job match provider (CV analysis) ─────────────────────────────────────
export const ACTIVE_PROVIDER_JOB_MATCH: Provider = 'gemini'
export const FALLBACK_ORDER_JOB_MATCH: Provider[] = ['openai', 'anthropic']

// ─── Per-provider model settings ───────────────────────────────────────────
export const MODEL_CONFIG: Record<Provider, { model: string; maxTokens: number }> = {
  anthropic: {
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
  },
  openai: {
    model: 'gpt-4o-mini',
    maxTokens: 1024,
  },
  gemini: {
    model: 'gemini-2.5-flash',
    maxTokens: 1024,
  },
}
