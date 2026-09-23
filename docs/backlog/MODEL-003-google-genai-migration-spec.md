# MODEL-003 — Migrate `@google/generative-ai` → `@google/genai` Spec

## Goal
Replace the deprecated Gemini SDK (`@google/generative-ai`) with its official successor
(`@google/genai`) behind the existing provider-layer seam, with no change of model,
prompt, behaviour or public contract. One file should move: `lib/modelProviders.ts`.

## Why this ticket exists

Facts verified at writing time (2026-09-23) — registry metadata and the published type
declarations of `@google/genai@2.24.0`:

| | `@google/generative-ai` (current) | `@google/genai` (target) |
|---|---|---|
| Status | **Deprecated** — npm README title: « [Deprecated] Google AI JavaScript SDK for the Gemini API » | Active, recommended successor |
| Latest version | `0.24.1` | `2.24.0` |
| Latest publish | **2025-04-29** (~17 months without a release) | **2026-09-22** (the day before this ticket) |
| Published versions | 40 | 101 |
| Engines | — | `node >= 20` (project requires `>= 22.12` per TEST-001 → compatible) |
| Runtime deps | — | `ws`, `p-retry`, `protobufjs`, `google-auth-library` |

Official migration guide: <https://ai.google.dev/gemini-api/docs/migrate>.

Why it matters for this project specifically: **Gemini is the fallback provider**
(`ACTIVE_PROVIDER = 'openai'`, `FALLBACK_ORDER = ['gemini']` in `lib/modelConfig.ts`).
The single recovery path for an OpenAI outage currently rests on an abandoned SDK. The
risk is not "it breaks tomorrow" — the risk is that a future Gemini API change, a Node
bump, or an auth/transport change is fixed only in the maintained SDK, and the fallback
silently rots. The follow-up was identified in PERF-002 review M4 and explicitly
deferred there ("Do **not** migrate in this ticket").

Current usage in the repo — a single file, three lines:
- `lib/modelProviders.ts:9` — `import { GoogleGenerativeAI } from '@google/generative-ai'`
- `lib/modelProviders.ts:15` — `const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')`
- `lib/modelProviders.ts:45` — `gemini.getGenerativeModel({ model, systemInstruction })`

`scripts/results/dev-validate.log` contains old `[GoogleGenerativeAI Error]` lines —
gitignored runtime artefacts, not code.

## Dependencies

- **PERF-002 (AI response streaming) should land first.** It introduces the
  `callGeminiStream()` variant in the same seam, and its handoff notes assign the SDK
  swap to this ticket. If MODEL-003 is implemented before PERF-002, it must absorb the
  streaming call as well (same mapping table below, `sendMessageStream` row) — do not
  ship a half-migrated provider layer where one of the two calls still uses the old SDK.
- No dependency on OBS-001, QUAL-002 or SEC-003.

## Scope

In scope:
- swap the SDK in `lib/modelProviders.ts` (`callGemini`, plus `callGeminiStream` if PERF-002 is delivered)
- remove `@google/generative-ai` from `package.json` and `package-lock.json`
- preserve the provider-layer contracts: fallback chain, usage/cache logging line format, error propagation
- run the existing cache/token measurement scripts and record whether anything moved

Out of scope:
- changing provider, model or `lib/modelConfig.ts` (`gemini-3.5-flash` stays)
- migrating to Vertex AI (the new SDK supports it via `vertexai: true`, but this project uses the Gemini API key path only)
- Live API, function calling, embeddings via Gemini (embeddings are OpenAI `text-embedding-3-small`)
- adopting an explicit Gemini `cachedContent` cache — Gemini cache remains **unconfirmed** (0/5 hits, see `project-state.md` / GEO-08g); this migration must not claim or promise a cache improvement
- touching `/api/job-match`, the chat route, the client, or the security pipeline

## Files to inspect first
- `lib/modelProviders.ts` (the only SDK consumer)
- `lib/modelConfig.ts` (`MODEL_CONFIG.gemini`, chain constants)
- `package.json` / `package-lock.json`
- `scripts/measure-cache.mjs` (log-line regexes — see Pitfalls)
- `scripts/validate-cag.mjs`, `scripts/measure-cv-tokens.mjs` (measurement harness to re-run)
- `docs/cag-limits.md` + README section "Prompt caching" (claims about Gemini usage/cache metadata)

## Design decisions to make (document in the commit body — this repo has no PR flow, `CONTEXT.md` §7)

### 1. Chat session vs direct model call — recommended: keep the chat session
`chats.create({ model, history, config })` + `sendMessage({ message })` is the direct
counterpart of today's `getGenerativeModel()` + `startChat()` + `sendMessage()`. It
preserves the history encoding already in place and keeps the diff to the seam. Using
`ai.models.generateContent()` with a flattened `contents` array would work too, but it
rewrites the message conversion — refuse that without a reason.

### 2. Retry behaviour — a decision, not a default
The new SDK ships retry logic (`p-retry`; `httpOptions.retryOptions` / `maxRetries` in
the published types) while the old one had none. Leaving it implicit **silently changes
failure latency**, which matters because `/api/chat` is synchronous and measured
(OpenAI ≈ 1.4 s, Gemini ≈ 8.0 s).
- Option A (recommended): set an explicit, small `maxRetries` (e.g. `1`). Rationale: the
  observed transient error in this repo is a `503 ... high demand` from Gemini
  (`scripts/results/dev-validate.log`), and Gemini is the **last** link of the chain in
  both paths (`FALLBACK_ORDER = ['gemini']`) — a retry is the only recovery there.
- Option B: `maxRetries: 0` — fully deterministic failure, matches the old SDK exactly,
  but turns a transient 503 into a user-visible failure when no provider is left.
Either way the value must be explicit in the code and justified in the commit body.

### 3. `maxOutputTokens` parity — do not "fix" it silently
`MODEL_CONFIG.gemini.maxTokens` (1024) is currently **not** passed to the SDK by
`callGemini` (only `callOpenai` uses `max_completion_tokens`). Wiring it up during the
migration would change response length/cost/latency and pollute the before/after
measurement. Keep parity in this ticket; if the inconsistency should be fixed, that is a
separate decision recorded in the commit body (or its own ticket).

### 4. Streaming usage metadata (only if PERF-002 is already delivered)
The old SDK's `sendMessageStream` returned `{ stream, response }` where awaiting
`response` yielded the aggregated result **including `usageMetadata`**. The new
`chat.sendMessageStream()` returns `Promise<AsyncGenerator<GenerateContentResponse>>` —
**there is no aggregated promise**. Usage must be read from the chunk(s) that carry
`usageMetadata` (typically the last one). Verify empirically before logging; if no chunk
carries it, logging becomes best-effort (which PERF-002 already allows for streaming).

## Required changes

### 1. Dependencies (`npm`, never pnpm/yarn — `CONTEXT.md` §1)
```bash
npm uninstall @google/generative-ai
npm install @google/genai@^2.24.0
```
Then confirm both the manifest and the lock are clean:
```bash
npm ls @google/generative-ai   # must report nothing
grep -rn "generative-ai" package.json package-lock.json   # no hit
```

### 2. `lib/modelProviders.ts` — the mapping table
Verified against `@google/genai@2.24.0` published types (`dist/genai.d.ts`):

| Today (`@google/generative-ai` 0.24.1) | Target (`@google/genai` 2.24.0) |
|---|---|
| `new GoogleGenerativeAI(process.env.GEMINI_API_KEY \|\| '')` | `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY \|\| '' })` |
| `gemini.getGenerativeModel({ model, systemInstruction: system })` | `ai.chats.create({ model, history, config: { systemInstruction: system } })` |
| `model.startChat({ history })` with `{ role: 'user' \| 'model', parts: [{ text }] }` | same `Content[]` shape passed as `create({ history })` |
| `chat.sendMessage(lastMessage)` → `result.response.text()` | `chat.sendMessage({ message: lastMessage })` → `response.text` (**property**, not a method) |
| `result.response.usageMetadata` | `response.usageMetadata` (`UsageMetadata`, keeps `cachedContentTokenCount`) |
| `chat.sendMessageStream(lastMessage)` → `{ stream, response }` | `chat.sendMessageStream({ message: lastMessage })` → `AsyncGenerator<GenerateContentResponse>` |
| — | `config.abortSignal?: AbortSignal` available if PERF-002 wired an abort signal (M13 there) |

Keep the message conversion **byte-identical** (same history order, same role names, same
last-message string): the persona + CV prefix feeds the provider prompt cache and must not
move (`CONTEXT.md` §9, GEO-08g). Only the client library changes.

Keep the logging lines **format-identical** (`lib/modelProviders.ts` is parsed by tooling):
- `[modelProviders] Trying provider: ${provider} (model: …)` — unchanged
- `[modelProviders] Gemini usage: ${JSON.stringify(usage)}` — unchanged shape
- `[modelProviders] OpenAI cache hit: …` — untouched
- the fallback warning `Active provider '…' failed. Used fallback: '…'` — untouched

Preserve `generateResponse()` / `generateJobMatchResponse()` signatures and the shared
`PROVIDERS` dispatch. `@google/genai` types must not leak past this file: expose the same
`(messages, system) => Promise<string>` contract as today.

### 3. Error surface
The new SDK throws `ApiError` (exported class) instead of the old
`[GoogleGenerativeAI Error]` wrapper. The dispatcher catches everything, so behaviour is
unchanged, but confirm the `console.error` context still identifies the provider, and that
a quota/503 error still triggers the fallback rather than an unhandled rejection.

### 4. Docs and measurements
- `README.md` names the providers but not the SDK; check whether any section needs the
  version bump (`CONTEXT.md` §2 makes README updates mandatory for documented points).
- Re-run and record (do not promise an improvement):
  `node scripts/measure-cv-tokens.mjs` (must be **unchanged** — the prompt did not move),
  `node scripts/validate-cag.mjs --mode cag`,
  `node scripts/measure-cache.mjs` (before/after latencies; Gemini cache stays unconfirmed).
- Add the follow-up line in `project-state.md` if the migration reveals a remaining gap.

## Implementation notes
- The diff is deliberately tiny: one import, one constructor, one call site (two after
  PERF-002). Treat anything beyond that as scope creep to justify explicitly.
- `npm run build` must stay secret-free (`CONTEXT.md` §9): the module-level client already
  tolerates an absent key (`|| ''`) — keep that guard, do not add a fail-fast at module load.
- New runtime deps (`protobufjs`, `google-auth-library`, `ws`) are **server-side only**;
  nothing may reach the client bundle. Verify `npm run build` output is unchanged in shape.
- The new SDK supports both `@google/genai` root and `./node` subpath exports; import from
  the root as the migration guide does, unless a Node-specific need appears.

## Pitfalls
- **`GEMINI_USAGE_RE` is a log-parsing contract.** `scripts/measure-cache.mjs` extracts
  Gemini cache metrics with `/\[modelProviders\] Gemini usage: ({.*})/` and reads
  `cachedContentTokenCount`. Reworking the log line or the JSON shape silently breaks the
  measurement harness (it degrades to `null`, not to an error).
- **`.text()` → `.text`.** It is a property in the new SDK; a leftover call is a type
  error, but the same trap exists in any ad-hoc script or snippet copied from docs.
- **Per-request config does not inherit from chat-level config.** The published doc for
  `SendMessageParameters.config` states it "does not change the chat level config, nor
  inherit from it". Since `systemInstruction` will live at chat level, do not pass a
  partial per-request config expecting the system instruction to be merged in.
- **Implicit retries change measured latency.** See Design Decision 2 — decide explicitly.
- **Do not migrate to Vertex AI or add `cachedContent`** while you are in the file; both
  change auth and cost surfaces and invalidate the measurements.
- Keep `npm ls` clean: a stale transitive pin in `package-lock.json` is the usual reason
  the deprecated SDK reappears.

## Acceptance criteria
- `npm ls @google/generative-ai` reports nothing; no occurrence of `generative-ai` in `package.json`, `package-lock.json`, `lib/`, `scripts/`.
- Chat works in both locales (`/fr`, `/en`) with the active provider (OpenAI) and with the fallback (**Gemini** forced by an invalid `OPENAI_API_KEY` locally).
- `/api/job-match` still works end-to-end (it shares `PROVIDERS`).
- The Gemini fallback warning log and the `[modelProviders] Gemini usage: {…}` line still appear in dev-server logs, with the same shape (`measure-cache.mjs` regexes still match).
- `node scripts/measure-cv-tokens.mjs` output is unchanged (prompt untouched).
- `npm run lint`, `npm run type-check`, `npm run test`, `npm run build` pass.
- The retry decision (Design Decision 2) and the `maxOutputTokens` parity decision are stated in the commit body.

## Verification
Run:
- `npm uninstall @google/generative-ai && npm install @google/genai@^2.24.0`, then `npm ls` / lock grep above
- `npm run lint && npm run type-check && npm run test && npm run build`
- `npm run dev`, exercise the chat on `/fr` and `/en`; confirm streamed (PERF-002) or non-streamed answers
- force the fallback: start the server with an invalid `OPENAI_API_KEY` and confirm Gemini answers and that the fallback warning is logged
- exercise `/api/job-match` (valid input) and confirm the JSON contract is intact
- `node scripts/validate-cag.mjs --mode cag` (non-empty answers) and `node scripts/measure-cache.mjs` — compare latencies/cache signals against the numbers recorded in `project-state.md` (OpenAI 5/5 hits ≈ 1.4 s; Gemini 0/5 ≈ 8.0 s)
- `node scripts/measure-cv-tokens.mjs` — must be byte-identical to the recorded value (≈ 2 400 tokens)
- if PERF-002 is delivered: `curl -N` a chat request locally and confirm NDJSON deltas still arrive progressively after the SDK swap

## Handoff notes for the implementing LLM
- One file, one seam. If your diff reaches the route, the client, or `lib/modelConfig.ts`, stop and re-read Scope.
- Copy the mapping table literally; the only two behavioural traps are the **implicit retry** (Design Decision 2) and the **`.text` property vs `.text()` method**.
- The usage/cache log line is a machine-readable contract, not decoration — `scripts/measure-cache.mjs` parses it.
- Do not promise a Gemini prompt-cache gain: it is unconfirmed (0/5) and was measured with the old SDK. Re-measuring is part of Verification; changing the conclusion is not.
- If PERF-002 has not landed yet, either wait for it or implement the streaming row of the table in the same commit — never leave the file half-migrated.
