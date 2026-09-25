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
export type CVContextSource = 'rag' | 'cag'

// ─── Chat context source (interactive CV assistant) ────────────────────────
export const CV_CONTEXT_SOURCE: CVContextSource = 'cag'

// ─── Chat provider (interactive CV assistant) ──────────────────────────────
export const ACTIVE_PROVIDER: Provider = 'openai'
export const FALLBACK_ORDER: Provider[] = ['gemini']

// ─── Job match provider (CV analysis) ─────────────────────────────────────
export const ACTIVE_PROVIDER_JOB_MATCH: Provider = 'openai'
export const FALLBACK_ORDER_JOB_MATCH: Provider[] = ['gemini']

// ─── Per-provider model settings ───────────────────────────────────────────
// MODEL-004 : `gpt-6-luna` remplace `gpt-5.4-mini` (≈ ×11,6 moins cher par appel :
// $0,000058 contre $0,00087 mesurés au banc du 2026-09-25, 36 questions × 2 langues,
// cache chaud). La bascule est **conditionnée** au garde-fou hors-sujet : 17/17 refus
// sur le jeu élargi (verdicts humains), 4/4 quasi-manques répondus, 0 token de fidélité
// manquant — cf. `docs/backlog/MODEL-004-chat-guardrail-hardening-spec.md`.
//
// ROLLBACK (une ligne, décision 5) : repasser `model` à `'gpt-5.4-mini'` ci-dessous,
// redéployer. Référence de comparaison au banc du 2026-09-25 : TTFT moy 641 ms /
// latence totale 1216 ms / $0,000871 par appel, 36/36 hits de cache.
//
// `maxTokens` reste à 1024 : avec `reasoning_effort: 'none'` épinglé (décision 2,
// `lib/modelProviders.ts`), aucun token de raisonnement ne consomme le budget —
// vérifié au banc (0 réponse vide sur 36 questions, `reasoning_tokens` à 0).
export const MODEL_CONFIG: Record<Provider, { model: string; maxTokens: number }> = {
  openai: {
    model: 'gpt-6-luna',
    maxTokens: 1024,
  },
  gemini: {
    model: 'gemini-3.5-flash',
    maxTokens: 1024,
  },
}
