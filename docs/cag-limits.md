# CAG Limits and Decision Rules

This document defines when `cv-interactif-ia` should stay in Cache-Augmented Generation (CAG) mode and when it should reconsider Retrieval-Augmented Generation (RAG).

## Current baseline

Measured with:

```bash
node scripts/measure-cv-tokens.mjs
```

Current `data/cv.md` size:

| Metric | Value |
|---|---:|
| Characters | 7,391 |
| Words | 1,048 |
| Lines | 93 |
| Estimated CV tokens | ~1,848 |
| Estimated stable prefix tokens (system prompt + CV) | ~2,069 |

Token estimate uses the conservative `chars / 4` approximation.

## Context windows

| Provider | Model | Context window | Current CV impact |
|---|---|---:|---:|
| Gemini | Gemini 3.5 Flash | ~1M tokens | negligible |
| OpenAI | GPT-5.4 mini | ~128K tokens | negligible |

The current CV is far below both model context windows.

## Prompt caching thresholds

| Provider | Cache behavior | Threshold | Current stable prefix |
|---|---|---:|---:|
| OpenAI | Automatic prefix caching | >= 1,024 tokens | eligible (~2,069) |
| Gemini | Provider-side context/cache metadata | >= 2,048 tokens | eligible by estimate (~2,069) |

Runtime validation showed Gemini `promptTokenCount` around 1,951 tokens for the current CAG prompt, with no `cachedContentTokenCount` reported over 5 repeated runs. CAG still works correctly; the Gemini cost/latency optimization is not confirmed for the current prompt size. OpenAI reported 1,280 cached tokens on repeated CAG requests.

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

- Results are written to `scripts/results/` and are gitignored.
- OpenAI cache hits are logged as:
  ```text
  [modelProviders] OpenAI cache hit: <n> cached tokens
  ```
  Current live measurement: 5/5 cache hits, 1,280 cached tokens, ~1.4s average latency.
- Gemini usage is logged as:
  ```text
  [modelProviders] Gemini usage: {...}
  ```
  Current live measurement: 0/5 explicit cache hits, `promptTokenCount` around 1,951 tokens, ~9.9s average latency.
- If cache tokens are not reported, use latency trends and provider dashboards as secondary signals.
