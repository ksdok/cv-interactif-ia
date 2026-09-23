# PERF-002 — AI Response Streaming Spec

## Goal
Stream AI responses from `/api/chat` to the browser so users see the answer progressively instead of staring at a loading indicator for 5–8 seconds.

## Why this ticket exists
Current state in the repo:
- `/api/chat` waits for the full provider response (`generateResponse()` returns a complete string) and returns one JSON body.
- `components/ChatPreview.tsx` displays a bouncing-dots loader, then renders the full text at once via `TypingEffect` (a fake typewriter animation applied after the fact).
- Measured live latencies: OpenAI ≈ 1.4s, Gemini ≈ 8.0s average (see `project-state.md`, FEAT-CAG-004).

Time-to-first-content is therefore equal to full generation time — the worst-case perceived latency.

## Scope

In scope:
- add a streaming-capable provider call for OpenAI and Gemini
- stream `/api/chat` responses to the client
- rewrite `ChatPreview.tsx` message rendering to consume the stream
- keep CSRF, rate limiting, input validation, and provider fallback working

Out of scope:
- streaming `/api/job-match` (single-shot analysis, lower perceived-latency pain)
- retry/resume of interrupted streams
- changing the model configuration system (`lib/modelConfig.ts`)

## Files to inspect first
- `app/api/chat/route.ts`
- `lib/modelProviders.ts`
- `lib/modelConfig.ts`
- `components/ChatPreview.tsx`
- `components/TypingEffect.tsx`
- `lib/i18n/types.ts` (error mapping via `errorCode`)

## Design decisions (settled by review M1–M10, 2026-09-23 — document any deviation in the commit body; this repo has no PR flow)

### 1. Transport: decided — NDJSON over a POST ReadableStream
**Decision (review M6): NDJSON** (`Content-Type: application/x-ndjson`), one JSON object per line, over a POST `ReadableStream` response, with typed events:
- `{"type":"delta","text":"..."}` — incremental tokens
- `{"type":"done"}` — stream complete
- `{"type":"error","errorCode":"..."}` — provider failure after stream started

Why NDJSON rather than SSE framing (`text/event-stream`): `EventSource` supports neither POST nor custom headers (the CSRF token rules it out), so the client is `fetch` + `getReader()` in every scenario. NDJSON is simpler to parse incrementally (split on `\n`, `JSON.parse` each complete line, handle trailing partial lines with a buffer) and simpler to unit-test than SSE frame parsing.

A typed protocol is preferred over a raw text dump because the client must distinguish provider errors from content and keep mapping `errorCode` → localized message (existing `dictionary.apiErrors` contract, review GEO-08b M4).

Extract the protocol into a small pure module (e.g. `lib/chatStreamProtocol.ts` — encoder for the server, incremental line-buffering decoder for the client). It is the new non-trivial deterministic piece of this ticket: **unit-test it with Vitest** (review M10).

### 2. Fallback semantics with streaming — decided: Option A
`generateResponse()` currently retries the next provider on failure. With streaming, a provider can fail **after** content has been flushed. Decided (review M9):
- The provider choice is committed at the **first byte written to the client**. If the active provider fails before any byte is written, fall back silently to the next provider in the chain (same behavior as today). The OpenAI SDK raises 4xx/5xx at `await create()`, and a network cut while reading the first chunk also counts as "before the first byte" — as long as nothing was written downstream.
- If the provider fails after the first byte was written, emit an `error` event — **no mid-stream provider switch** (it would stitch content from two different models).
- Option B (buffer the first N tokens, then commit) is rejected: more code, and it delays time-to-first-content — the entire point of this ticket.

### 3. `TypingEffect` — decided: delete it (review M1)
Fact check against the original wording: the greeting message is rendered **statically** (no `isTyping` flag) — `TypingEffect` is used **only** on API answers. Once real streaming replaces the fake typewriter (the stream *is* the typing effect), `components/TypingEffect.tsx`, its import and the `isTyping` logic in `ChatPreview.tsx` become dead code.
Decision: **delete `TypingEffect.tsx` and the `isTyping` flag** in this ticket. Optionally keep a blinking cursor at the end of the in-progress streamed message as an affordance.

## Required changes

### 1. Provider layer (`lib/modelProviders.ts`)
- Add a streaming entry point (e.g. `streamResponse(messages, system)` returning an async iterator of text deltas, or an `onDelta` callback variant), with per-provider functions (`callOpenAIStream` / `callGeminiStream`) mirroring the existing structure.
- **OpenAI (review M3):** `openai.chat.completions.create({ ..., stream: true, stream_options: { include_usage: true } })`. `include_usage` is **required, not optional**: without it `usage` is null on every chunk; the final chunk carries `prompt_tokens_details.cached_tokens` — losing it would silently break the cache-hit logging that FEAT-CAG/GEO-08g rely on.
- **Gemini (review M2):** `chat.sendMessageStream(lastMessage)` — the minimal-diff counterpart of today's `chat.sendMessage(...)`, **not** `model.generateContentStream` (the current code holds a chat session). It returns `{ stream: AsyncGenerator, response: Promise }`; awaiting `response` at the end yields the aggregated result **with `usageMetadata`**, so usage logging in streaming mode is trivial.
- Preserve `generateResponse()` — job-match and any non-streaming callers keep working.
- Keep the fallback chain logic shared between streaming and non-streaming paths (avoid duplicating the dispatch loop). The streaming path needs its own first-byte-commit variant of the chain (Design Decision 2) built on the same `PROVIDERS`-style dispatch.

### 2. API route (`app/api/chat/route.ts`) — two phases (review M8)
Structure the handler as **two explicitly separated phases**:
- **Phase 1 — preparation (failures → today's JSON):** rate limit → CSRF → body parse → input validation → context build (CAG/RAG — it can fail too, e.g. Supabase down) → system prompt. Any failure here keeps returning today's JSON error shape (`{ error, errorCode }` with 429/403/400/500) — the client's existing error path stays functional.
- **Phase 2 — streaming (failures → NDJSON `error` event):** resolve the provider per Design Decision 2, then return `new Response(ndjsonStream, { headers })`. Anything failing after this point is an `error` event inside an already-`200` stream.
- Rate limit headers go in the streaming response's initial headers (they must be set before the body streams) — passing them to `new Response(stream, { headers })` does this.
- Stream response headers (review M5): `Content-Type: application/x-ndjson`, `Cache-Control: no-cache, no-transform` (`no-transform` protects against buffering/transforming proxies), `X-Accel-Buffering: no` (harmless on Vercel; required by nginx-like proxies if the setup ever changes), plus `X-RateLimit-*`. Never set `Content-Length`.

### 3. Client (`components/ChatPreview.tsx`)
- Send the request as today (same headers, same body).
- Branch on `Content-Type` — adapt, do not remove, today's check: `application/json` → existing JSON error path, untouched; `application/x-ndjson` → read via `response.body.getReader()` + `TextDecoder` and append `delta` text to the in-progress assistant message. (`response.json()` would buffer the whole body and defeat streaming.)
- `error` event semantics (review M7): if deltas were already displayed, keep the partial text and append the localized error as a new assistant message; if none, show the localized error alone. Mapping via `errorCode` → `dictionary.apiErrors` unchanged.
- Lifecycle (review M7): hold an `AbortController` for the in-flight request — abort on component unmount and on a new send; call `reader.cancel()` on client-side abort/error paths so the server stream closes.
- Maintain the current UX contract:
  - `aria-live="polite"` container kept — verify streamed text updates announce reasonably (batched React state updates are acceptable; a screen reader must not be spammed once per token)
  - iOS scroll/blur behavior preserved
  - disabled states during streaming preserved (disable send while streaming)
- Delete `TypingEffect` and the `isTyping` logic (Design Decision 3); an optional cursor affordance on the in-progress message is fine.

## Implementation notes
- Do not add a dependency for the client side; `fetch` + `ReadableStream` + `TextDecoder` is enough.
- If a provider SDK change is needed, prefer the smallest diff to `callOpenAI` / `callGemini`.
- **Deprecated SDK warning (review M4):** `@google/generative-ai` is deprecated — Google recommends migrating to `@google/genai` (ai.google.dev/gemini-api/docs/migrate). Do **not** migrate in this ticket (out of scope); write the Gemini streaming code behind the provider-layer seam so a follow-up migration ticket only touches `callGemini*`.
- The system prompt / CAG context must remain identical — only the response transport changes (prompt caching is unaffected by streaming; OpenAI prefix cache still applies).
- Keep `/api/chat` response headers backward-compatible (`X-RateLimit-*`).
- Buffering facts (review M5): POST route handlers are never ISR-cached, so Next.js pipes the stream directly, and Vercel does not buffer streamed function responses. `compress: true` in `next.config.ts` (PERF-005) only affects local `next start`, not Vercel. Still verify end-to-end (see Verification).
- Watch out: Next.js App Router route handlers support streaming natively; do not enable any `runtime` changes unless required.

## Acceptance criteria
- A chat answer starts appearing in the UI well before generation completes (visually verified locally).
- All existing error paths (429, 403, 400, 500) still produce the localized error messages.
- Rate limit headers still arrive on streamed responses.
- Fallback still triggers when the active provider fails before any byte is written to the client; a mid-stream failure emits an `error` event and never switches provider (review M9).
- **NDJSON protocol unit tests (review M10):** the decoder handles a frame split across two chunks as a single event, a trailing partial line is buffered until completed, and an `error` event mid-stream maps to the localized message. `npm run test` passes.
- `npm run lint`, `npm run type-check` and `npm run build` pass.

## Verification
Run:
- `npm run build` and `npm run start`, exercise the chat in both locales (`/fr`, `/en`)
- confirm end-to-end streaming with `curl -N` (no buffering, chunks arrive progressively) — **locally AND against the production deployment** (review M5: Vercel streams route handlers natively, but check post-deploy anyway)
- trigger each error path (invalid input, tampered CSRF, exhausted rate limit) and confirm localized errors
- force a provider failure (invalid active key in a local env) and confirm fallback still works
- force a mid-stream failure if feasible (e.g. kill network/connectivity mid-answer) and confirm the `error` event path renders the localized message without a provider switch

## Handoff notes for the implementing LLM
- The trickiest part is fallback + streaming semantics — implement Design Decision 2 explicitly (commit at first byte written to the client), don't hand-wave it.
- The two-phase route structure (review M8) is what guarantees the JSON error contract survives: errors that can happen before the stream opens (validation, CSRF, rate limit, **context build**) must never become NDJSON events.
- Do not break `/api/job-match`; it shares `PROVIDERS`.
- Do not touch `proxy.ts` — CSP does not apply to API responses and the streaming headers live on the route response. Vercel does not buffer streams (review M5); verify with `curl -N` in production.
- After delivery, create the follow-up ticket for the `@google/generative-ai` → `@google/genai` migration (review M4) if it doesn't exist yet.