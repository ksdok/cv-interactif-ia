# CAG Limits and Decision Rules

This document defines when `cv-interactif-ia` should stay in Cache-Augmented Generation (CAG) mode and when it should reconsider Retrieval-Augmented Generation (RAG).

## Current baseline

Measured with:

```bash
node scripts/measure-cv-tokens.mjs
```

Current `data/cv.md` size (measured 2026-09-25):

| Metric | Value |
|---|---:|
| Characters | 9,620 |
| Words | 1,353 |
| Lines | 108 |
| Estimated CV tokens | ~2,405 |
| Estimated stable prefix tokens (system prompt + CV) | ~2,869 |

Token estimate uses the conservative `chars / 4` approximation.

> History: the baseline at the CAG switch (2026-06-22) was 7,391 chars /
> ~1,848 CV tokens / ~2,069 prefix tokens. The prefix grew to ~2,643 tokens by
> 2026-09-23, then to ~2,869 on 2026-09-25 with the MODEL-004 guardrail hardening
> (the CV itself is unchanged at 9,620 chars). Re-measure
> whenever `data/cv.md` or the persona changes.

## Context windows

| Provider | Model | Context window | Current CV impact |
|---|---|---:|---:|
| Gemini | Gemini 3.5 Flash | ~1M tokens | negligible |
| OpenAI | GPT-6 Luna | ~1.05M tokens (max input 922K) | negligible |

The current CV is far below both model context windows.

> History: this table listed `GPT-5.4 mini` (~128K tokens) until the MODEL-004
> switch to `gpt-6-luna` (2026-09-25).

## Prompt caching thresholds

| Provider | Cache behavior | Threshold | Current stable prefix |
|---|---|---:|---:|
| OpenAI | Automatic prefix caching | >= 1,024 tokens | eligible (~2,869) |
| Gemini | Provider-side context/cache metadata | >= 2,048 tokens | eligible by estimate (~2,869) |

Runtime validation on the 2026-06-22 baseline (CV ~1,848 tokens) showed Gemini
`promptTokenCount` around 1,951 tokens with no `cachedContentTokenCount` over 5
repeated runs. The prefix has since grown above the ~2,048 threshold
(~2,643 estimated), so Gemini caching may now engage — still **unconfirmed**;
re-run `node scripts/measure-cache.mjs` before promising Gemini savings. OpenAI
remains confirmed: 5/5 hits, 1,280 cached tokens (2026-06-22, mono-language),
6/6 hits, 2,304 cached tokens (2026-09-23, alternating fr/en — shared
persona + CV prefix, see GEO-08g), and 36/36 hits, ~2,739 cached tokens
(2026-09-25, `gpt-6-luna`, after the MODEL-004 persona hardening).

## Recommended limit

Stay in CAG while `data/cv.md` remains compact and stable.

| CV size | Decision |
|---:|---|
| <= 10K tokens (~40K chars) | Stay in CAG by default |
| > 10K tokens | Re-evaluate latency, cost, and answer quality with `scripts/validate-cag.mjs` and `scripts/measure-cache.mjs` |
| > 50K tokens (~200K chars) | Prefer RAG or split CAG context by sections |

## Decision formula

```text
if cvTokens > 50000:
  switch to RAG or sectioned retrieval
else if cvTokens > 10000:
  benchmark CAG cost/latency and compare to RAG
else:
  stay on CAG
```

## Validation workflow

1. Measure CV size:
   ```bash
   node scripts/measure-cv-tokens.mjs
   ```
2. Run CAG validation against a local dev server with real provider keys:
   ```bash
   npm run dev
   node scripts/validate-cag.mjs --mode cag
   ```
3. Measure cache hit rate:
   ```bash
   node scripts/measure-cache.mjs
   ```
4. Optional RAG comparison:
   - Temporarily set `CV_CONTEXT_SOURCE = 'rag'` in `lib/modelConfig.ts`.
   - Restart the dev server.
   - Run:
     ```bash
     node scripts/validate-cag.mjs --mode rag
     node scripts/compare-results.mjs
     ```
5. Review response quality manually. The scripts collect responses and latency, but they do not judge factual quality automatically.

## Operational notes

- Cost figures reported by `bench-models.mjs` and `smoke-job-match.mjs` count input,
  cached-input, **cache-write** and output tokens (`prompt_tokens_details`).
  `gpt-6-luna` bills cache writes at $0.125/M (absent from the 5.4-mini sheet), so a
  cold-prefix call is more expensive than a warm one — e.g. the provider-direct job
  match smoke on a cold prefix (2,584 write tokens) reports ~$0.00055 per call with writes
  billed, against ~$0.00048 if writes were ignored.
  The `$0.0000593/call` figure for the warm 36-question bench is unaffected (no writes).
- Results are written to `scripts/results/` and are gitignored.
- OpenAI cache hits are logged as (the `(stream)` suffix distinguishes the streaming path used by
  `/api/chat` since PERF-002 from the non-streaming path):
  ```text
  [modelProviders] OpenAI cache hit: <n> cached tokens            # non-streaming
  [modelProviders] OpenAI cache hit (stream): <n> cached tokens   # streaming (/api/chat)
  ```
  `scripts/measure-cache.mjs` parses both forms (optional `(stream)` suffix).
  Latest measurements (2026-09-25, `gpt-6-luna`, hardened persona): 36/36 cache
  hits, ~2,739 cached tokens, TTFT ~773 ms average (bench-models, 36 questions,
  warm cache, `reasoning_effort: none`). The prompt change invalidated the cache
  once, as expected — the counter was restored after re-warming. Earlier: 6/6
  hits, 2,304 cached tokens (2026-09-23, alternating fr/en).
- The FR injection probe added by MODEL-004 (revue M#6) is verified on the
  `gpt-6-luna` + `reasoning_effort: none` arm only; the 3-arm gate was not re-run
  with it, so its evidence does not extend to the other arms.
- Gemini usage is logged as (the `(stream)` suffix distinguishes the streaming path used by
  `/api/chat` since PERF-002 from the non-streaming path):
  ```text
  [modelProviders] Gemini usage: {...}          # non-streaming
  [modelProviders] Gemini usage (stream): {...}  # streaming (/api/chat)
  ```
  `scripts/measure-cache.mjs` parses both forms (optional `(stream)` suffix, MODEL-003).
  Latest measurement: 0/5 explicit cache hits, `promptTokenCount` around
  1,951 tokens, ~9.9s average latency (2026-06-22 baseline — predates CV
  growth to ~2,643 prefix tokens; re-measure before concluding on Gemini
  caching).
- If cache tokens are not reported, use latency trends and provider dashboards as secondary signals.
