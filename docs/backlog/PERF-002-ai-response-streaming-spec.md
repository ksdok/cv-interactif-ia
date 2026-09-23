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

## Design decisions (settled by review M1–M10, then M11–M17 on the same date, 2026-09-23 — document any deviation in the commit body; this repo has no PR flow)

### 1. Transport: decided — NDJSON over a POST ReadableStream
**Decision (review M6): NDJSON** (`Content-Type: application/x-ndjson`), one JSON object per line, over a POST `ReadableStream` response, with typed events:
- `{"type":"delta","text":"..."}` — incremental tokens
- `{"type":"done"}` — stream complete
- `{"type":"error","errorCode":"..."}` — provider failure after stream started

Why NDJSON rather than SSE framing (`text/event-stream`): `EventSource` supports neither POST nor custom headers (the CSRF token rules it out), so the client is `fetch` + `getReader()` in every scenario. NDJSON is simpler to parse incrementally (split on `\n`, `JSON.parse` each complete line, handle trailing partial lines with a buffer) and simpler to unit-test than SSE frame parsing.

A typed protocol is preferred over a raw text dump because the client must distinguish provider errors from content and keep mapping `errorCode` → localized message (existing `dictionary.apiErrors` contract, review GEO-08b M4).

Extract the protocol into a small pure module (`lib/chatStreamProtocol.ts` — encoder for the server, incremental line-buffering decoder for the client). It is the new non-trivial deterministic piece of this ticket: **unit-test it with Vitest** (review M10).

Module constraints (review M12/M17):
- **No `server-only` marker** — the decoder is imported by `components/ChatPreview.tsx` (a `'use client'` module). Keep the module dependency-free and isomorphic; do not import `lib/modelProviders.ts` or anything server-side from it.
- Tests follow the existing convention `lib/__tests__/*.test.ts` (see `lib/__tests__/validation.test.ts`). `vitest.config.mts` deliberately leaves `test.include` unset, so `lib/__tests__/chatStreamProtocol.test.ts` is picked up with no config change.
- The decoder never produces localized text: it surfaces the language-agnostic `errorCode` only. Localization stays a client concern (see §3, review M11).

### 2. Fallback semantics with streaming — decided: Option A
`generateResponse()` currently retries the next provider on failure. With streaming, a provider can fail **after** content has been flushed. Decided (review M9):
- The provider choice is committed at the **first byte written to the client**. If the active provider fails before any byte is written, fall back silently to the next provider in the chain (same behavior as today). The OpenAI SDK raises 4xx/5xx at `await create()`, and a network cut while reading the first chunk also counts as "before the first byte" — as long as nothing was written downstream.
- If the provider fails after the first byte was written, emit an `error` event — **no mid-stream provider switch** (it would stitch content from two different models).
- Option B (buffer the first N tokens, then commit) is rejected: more code, and it delays time-to-first-content — the entire point of this ticket.
- **Client disconnect (review M13):** the upstream provider call must be abortable. Thread `request.signal` from the route handler down to the provider stream and abort it when the client goes away, so an abandoned chat does not leave a handler running to completion (the `reader.cancel()` described in §3 only closes the downstream leg). Both SDKs accept a per-request signal — OpenAI `RequestOptions.signal`, Gemini `SingleRequestOptions.signal`. **Caveat to state honestly in the commit body:** Gemini's own type docs say the signal is client-only and that the service may still charge for an aborted operation; the win is a bounded handler and a freed connection, not a guaranteed cost saving.

### 3. `TypingEffect` — decided: delete it (review M1)
Fact check against the original wording: the greeting message is rendered **statically** (no `isTyping` flag) — `TypingEffect` is used **only** on API answers. Once real streaming replaces the fake typewriter (the stream *is* the typing effect), `components/TypingEffect.tsx`, its import and the `isTyping` logic in `ChatPreview.tsx` become dead code.
Decision: **delete `TypingEffect.tsx` and the `isTyping` flag** in this ticket. Optionally keep a blinking cursor at the end of the in-progress streamed message as an affordance.

## Required changes

### 1. Provider layer (`lib/modelProviders.ts`)
- Add a streaming entry point (e.g. `streamResponse(messages, system, options)` returning an async iterator of text deltas, or an `onDelta` callback variant), with per-provider functions (`callOpenAIStream` / `callGeminiStream`) mirroring the existing structure. The entry point takes an `AbortSignal` (review M13) and forwards it to the SDK call.
- **OpenAI (review M3):** `openai.chat.completions.create({ ..., stream: true, stream_options: { include_usage: true } })`. `include_usage` is **required, not optional**: without it `usage` is null on every chunk; the final chunk carries `prompt_tokens_details.cached_tokens` — losing it would silently break the cache-hit logging that FEAT-CAG/GEO-08g rely on.
- **Gemini (review M2):** `chat.sendMessageStream(lastMessage)` — the minimal-diff counterpart of today's `chat.sendMessage(...)`, **not** `model.generateContentStream` (the current code holds a chat session). It returns `{ stream: AsyncGenerator, response: Promise }`; awaiting `response` at the end yields the aggregated result **with `usageMetadata`**, so usage logging in streaming mode is trivial.
- Preserve `generateResponse()` — job-match and any non-streaming callers keep working.
- Keep the fallback chain logic shared between streaming and non-streaming paths (avoid duplicating the dispatch loop). The streaming path needs its own first-byte-commit variant of the chain (Design Decision 2) built on the same `PROVIDERS`-style dispatch.
- **Scope of the shared-dispatch refactor (review M14):** extracting a common dispatcher is authorised, including the loop currently duplicated in `generateJobMatchResponse`. The refactor must stay behaviour-preserving for `/api/job-match`: it keeps the non-streaming path and its own chain (`ACTIVE_PROVIDER_JOB_MATCH` / `FALLBACK_ORDER_JOB_MATCH`). If a clean extraction would make the job-match diff non-trivial, duplicating only the streaming loop is the accepted fallback — pick one and say which in the commit body.

### 2. API route (`app/api/chat/route.ts`) — two phases (review M8)
Structure the handler as **two explicitly separated phases**:
- **Phase 1 — preparation (failures → today's JSON):** rate limit → CSRF → body parse → input validation → context build (CAG/RAG — it can fail too, e.g. Supabase down) → system prompt. Any failure here keeps returning today's JSON error shape (`{ error, errorCode }` with 429/403/400/500) — the client's existing error path stays functional.
- **Phase 2 — streaming (failures → NDJSON `error` event):** resolve the provider per Design Decision 2, then return `new Response(ndjsonStream, { headers })`. Anything failing after this point is an `error` event inside an already-`200` stream.
- Rate limit headers go in the streaming response's initial headers (they must be set before the body streams) — passing them to `new Response(stream, { headers })` does this.
- Wire `request.signal` into the abort path (review M13): on disconnect, abort the provider stream and return/close without writing a `done` event.
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
- **Make the error mapping unit-testable (review M11).** The localization lives in a component and the test runner is Node-only (`environment: 'node'`, no `@testing-library/react`, and this ticket adds no dependency). Extract the mapping into a pure helper — e.g. `resolveApiErrorMessage(dictionary, errorCode)` next to the protocol module — and cover it in `lib/__tests__/` for `fr` and `en`. `ChatPreview.tsx` then calls the helper, and the "error event → localized message" path is proven without a DOM.
- **Do not re-linkify on every delta (review M16).** `LinkifiedText` runs `parseUrlsFromText()` over the **whole growing text** on each render (full `matchAll` + segment array rebuild), i.e. O(n²) across a streamed answer, on the main thread. Render plain text (`whitespace-pre-wrap`) while streaming and switch to `LinkifiedText` once the `done` event arrives. Same reasoning for the `aria-live` region: batch state updates (e.g. flush on `requestAnimationFrame`, or coalesce deltas arriving within one frame) so a screen reader is not re-announced per token — a one-line comment in the code should record the batching choice.

### 4. Documentation (`README.md`, review M12)

`README.md` documents `/api/chat` as returning `{ "response": "..." }` and describes the flow in "How Chat Works" — both become wrong with a streamed transport. The same file lists every `lib/` module in "Project Structure". Update, in this ticket:
- the `/api/chat` API Reference (request unchanged; success response is now the NDJSON event stream, JSON errors still returned for pre-stream failures)
- the "How Chat Works" diagram/step that reads "returns one JSON body"
- the Project Structure entries for `lib/chatStreamProtocol.ts` and the removal of `components/TypingEffect.tsx`

`CONTEXT.md` §2/§4 makes the README update mandatory for any change to a documented contract; it is easy to forget because the spec's "Required changes" is otherwise code-only.

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
- **NDJSON protocol unit tests (review M10/M11/M17):** the decoder handles a frame split across two chunks as a single event, a trailing partial line is buffered until completed, and an `error` event mid-stream surfaces its language-agnostic `errorCode` (the decoder never emits localized text). The `errorCode` → localized message mapping is covered separately by the unit test of `resolveApiErrorMessage()` for both `fr` and `en`. `npm run test` passes.
- An abandoned client request aborts the upstream provider call instead of leaving the handler running to completion (review M13) — verified in the logs, not by token accounting (Gemini documents that abort is client-only).
- `README.md` describes the streamed `/api/chat` contract and the updated `lib/` module list (review M12).
- `npm run lint`, `npm run type-check` and `npm run build` pass.

## Verification
Run:
- `npm run build` and `npm run start`, exercise the chat in both locales (`/fr`, `/en`)
- confirm end-to-end streaming with `curl -N` (no buffering, chunks arrive progressively) — **locally AND against the production deployment** (review M5: Vercel streams route handlers natively, but check post-deploy anyway)
- trigger each error path (invalid input, tampered CSRF, exhausted rate limit) and confirm localized errors
- force a provider failure (invalid active key in a local env) and confirm fallback still works
- force a mid-stream failure if feasible (e.g. kill network/connectivity mid-answer) and confirm the `error` event path renders the localized message without a provider switch
- close the tab (or Ctrl-C a `curl -N`) mid-answer and confirm the server logs the abort instead of running to completion (review M13)

## Handoff notes for the implementing LLM
- The trickiest part is fallback + streaming semantics — implement Design Decision 2 explicitly (commit at first byte written to the client), don't hand-wave it.
- The two-phase route structure (review M8) is what guarantees the JSON error contract survives: errors that can happen before the stream opens (validation, CSRF, rate limit, **context build**) must never become NDJSON events.
- Do not break `/api/job-match`; it shares `PROVIDERS`.
- Do not touch `proxy.ts` — CSP does not apply to API responses and the streaming headers live on the route response. Vercel does not buffer streams (review M5); verify with `curl -N` in production.
- After delivery, create the follow-up ticket for the `@google/generative-ai` → `@google/genai` migration (review M4). **It does not exist yet** (checked: `docs/backlog/` contains no such spec; only this ticket mentions the migration). Create `docs/backlog/MODEL-003-google-genai-migration-spec.md` following the same structure as the other `docs/backlog/*-spec.md` briefs (Goal / Scope / Required changes / Acceptance criteria / Verification / Handoff), and register it in `project-state.md` ("Specs prêtes pour délégation" + a `MODEL-003` backlog entry with its `Spec :` line), otherwise the action dies with the commit. Scope of that future ticket: swap the SDK behind the `callGemini*` seam only, then delete `@google/generative-ai`; the streaming code written here must not leak `@google/generative-ai` types into the rest of the provider layer.