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

## Design decisions to make (document in the PR)

### 1. Transport: SSE vs raw ReadableStream
Recommended: **SSE-style plain-text event stream** (`text/event-stream` or NDJSON) over a POST `ReadableStream` response, with typed events:
- `{"type":"delta","text":"..."}` — incremental tokens
- `{"type":"done"}` — stream complete
- `{"type":"error","errorCode":"..."}` — provider failure after stream started

A typed protocol is preferred over a raw text dump because the client must distinguish provider errors from content and keep mapping `errorCode` → localized message (existing `dictionary.apiErrors` contract, review M4).

### 2. Fallback semantics with streaming
`generateResponse()` currently retries the next provider on failure. With streaming, a provider can fail **after** the first token is flushed. Decision required:
- Option A (recommended): resolve the provider choice on the *first chunk*; if the active provider fails before the first token, fall back silently (same behavior as today). If it fails mid-stream, emit an `error` event — no mid-stream provider switch.
- Option B: buffer the first N tokens, then commit. More robust, more code.

Pick A unless review shows otherwise. Document the choice.

### 3. What happens to `TypingEffect`
Once real streaming exists, the fake typewriter on streamed messages should be removed (the stream *is* the typing effect). The greeting message may keep `TypingEffect`. Do not delete the component if the greeting still uses it.

## Required changes

### 1. Provider layer (`lib/modelProviders.ts`)
- Add `streamResponse(messages, system, onDelta)` (or an async-iterator-returning variant) for OpenAI (`stream: true`) and Gemini (`generateContentStream`).
- Preserve `generateResponse()` — job-match and any non-streaming callers keep working.
- Keep the fallback chain logic shared between streaming and non-streaming paths (avoid duplicating the dispatch loop).
- Existing cache-hit logging must keep working for non-streaming calls; streaming usage metadata logging is best-effort.

### 2. API route (`app/api/chat/route.ts`)
- Keep the full security pipeline unchanged and BEFORE any streaming starts: rate limit → CSRF → validation → context build.
- Send rate limit headers in the streaming response's initial headers (they must be set before the body streams).
- On errors detected before the first token, keep returning today's JSON error shape (`{ error, errorCode }` with 429/403/400/500) — the client's existing error path must stay functional.

### 3. Client (`components/ChatPreview.tsx`)
- Send the request as today (same headers, same body).
- Read the response stream, appending deltas to the in-progress assistant message.
- Maintain the current UX contract:
  - error mapping via `dictionary.apiErrors` and `errorCode` unchanged
  - `aria-live="polite"` container kept — verify streamed text updates announce reasonably (batching state updates is acceptable)
  - iOS scroll/blur behavior preserved
  - disabled states during streaming preserved (disable send while streaming)
- Handle `content-type` detection: JSON error responses vs streamed success (today's check `application/json` must be adapted, not removed).

## Implementation notes
- Do not add a dependency for the client side; `fetch` + `ReadableStream` + `TextDecoder` is enough.
- If a provider SDK change is needed, prefer the smallest diff to `callOpenAI` / `callGemini`.
- The system prompt / CAG context must remain identical — only the response transport changes.
- Keep `/api/chat` response headers backward-compatible (`X-RateLimit-*`).
- Watch out: Next.js App Router route handlers support streaming natively; do not enable any `runtime` changes unless required.

## Acceptance criteria
- A chat answer starts appearing in the UI well before generation completes (visually verified locally).
- All existing error paths (429, 403, 400, 500) still produce the localized error messages.
- Rate limit headers still arrive on streamed responses.
- Fallback still triggers when the active provider fails before the first token.
- `npm run lint` and `npm run build` pass.

## Verification
Run:
- `npm run build` and `npm run start`, exercise the chat in both locales (`/fr`, `/en`)
- trigger each error path (invalid input, tampered CSRF, exhausted rate limit) and confirm localized errors
- force a provider failure (invalid active key in a local env) and confirm fallback still works

## Handoff notes for the implementing LLM
- The trickiest part is fallback + streaming semantics — implement Design Decision 2 explicitly, don't hand-wave it.
- Do not break `/api/job-match`; it shares `PROVIDERS`.
- Do not touch `proxy.ts` unless the CSP or buffering interferes with the stream (compression may need checking on Vercel).
- If you must change `TypingEffect`, justify it in the PR.