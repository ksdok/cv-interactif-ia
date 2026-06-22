# CV Interactif IA

An interactive resume website with a "High-End Editorial Minimalism" design. Recruiters can chat with **Nicky**, an AI assistant, to ask questions about the candidate's background. Answers are grounded in actual CV data through a configurable CAG/RAG context system.

Live: [cv-interactif-ia.vercel.app](https://cv-interactif-ia.vercel.app)

---

## Features

- **AI Chat (Nicky)** — Collapsible chat section powered by CAG by default, with RAG fallback available. Expands inline on first message.
- **Configurable CV Context** — Switch `/api/chat` between local CV file CAG and Supabase RAG via `CV_CONTEXT_SOURCE` in `lib/modelConfig.ts`.
- **Multi-Provider AI** — Supports OpenAI and Gemini with automatic fallback. Switch providers by editing one line in `lib/modelConfig.ts`.
- **Job Matcher** — Paste any job description to get an AI-powered CV match analysis (overall %, skills %, experience %, strengths, improvements).
- **Editorial Design** — Monochromatic palette, Bento-style experience grid, generous whitespace.
- **Security** — CSRF protection, rate limiting (200 req/day/IP), input validation, server-only secrets.
- **Mobile-First** — Fully responsive, no iOS Safari input zoom.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| AI Providers | OpenAI GPT-5.4 mini, Google Gemini 3.5 Flash |
| Chat context | CAG from `data/cv.md` by default; RAG fallback via Supabase |
| Embeddings | OpenAI `text-embedding-3-small` for RAG/job-match |
| Vector DB | Supabase (pgvector) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with pgvector extension enabled
- At least one AI provider API key (Gemini for chat, OpenAI required for embeddings)

### Environment Variables

Create `.env.local`:
```bash
# AI Providers (both recommended for fallback)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Install & Run

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run lint      # lint check
```

---

## Switching AI Provider and Context Source

Edit `lib/modelConfig.ts` — this is the only file you need to touch for provider/context routing:

```ts
export const CV_CONTEXT_SOURCE: CVContextSource = 'cag'  // 'cag' | 'rag'
export const ACTIVE_PROVIDER: Provider = 'gemini'        // 'openai' | 'gemini'
export const FALLBACK_ORDER: Provider[] = ['openai']
```

The fallback chain is applied automatically — if the active provider fails, the next in the list is tried.

`CV_CONTEXT_SOURCE` only affects `/api/chat`:
- `cag` (default): loads the full CV from `data/cv.md` and injects it into the system prompt.
- `rag`: retrieves the top CV snippets from Supabase using embeddings.

`/api/job-match` continues to use RAG/Supabase retrieval.

---

## Project Structure

```
cv-interactif-ia/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Chat endpoint (CAG/RAG + AI)
│   │   └── job-match/route.ts     # Job matching endpoint
│   ├── layout.tsx                 # Root layout, CSRF token, SEO metadata
│   ├── page.tsx                   # Main page
│   ├── globals.css                # Design tokens + animations
│   ├── sitemap.ts                 # SEO sitemap
│   └── robots.ts                  # SEO robots.txt
├── components/
│   ├── Header.tsx                 # Sticky header, logo only
│   ├── Hero.tsx                   # Editorial hero section
│   ├── ChatPreview.tsx            # Collapsible AI chat interface
│   ├── ExperienceGrid.tsx         # Bento-style experience cards
│   ├── Footer.tsx                 # Copyright + social links
│   ├── JobMatcher.tsx             # Job match modal
│   ├── TypingEffect.tsx           # Typewriter animation
│   └── LinkifiedText.tsx          # URL → clickable link renderer
├── lib/
│   ├── modelConfig.ts             # ← Edit here to switch AI provider/context
│   ├── modelProviders.ts          # OpenAI / Gemini abstraction
│   ├── cvContext.ts               # Server-only CAG loader for data/cv.md
│   ├── rag.ts                     # Embedding + Supabase vector search
│   ├── supabase.ts                # Server-only Supabase client
│   ├── csrf.ts                    # CSRF token generation + verification
│   ├── rateLimit.ts               # IP-based rate limiting
│   ├── validation.ts              # Chat message input validation
│   └── linkify.ts                 # URL parser utility
├── data/
│   └── cv.md                      # Source CV used by CAG mode
├── docs/
│   └── cag-limits.md              # CAG/RAG size thresholds and decision rules
├── scripts/
│   ├── validate-cag.mjs           # CAG validation questionnaire
│   ├── measure-cache.mjs          # Provider cache hit measurement
│   ├── measure-cv-tokens.mjs      # CV token estimate report
│   └── compare-results.mjs        # CAG vs RAG comparison helper
└── lib/test-validation.ts         # Standalone validation test suite
```

---

## How Chat Works

```
User sends message
    ↓
Rate limit check (200 req/day/IP)
    ↓
CSRF token verification
    ↓
Input validation
    ↓
Context source dispatch (`CV_CONTEXT_SOURCE`)
    ↓
CAG: full `data/cv.md` loaded in memory
or RAG: top 10 CV snippets from Supabase
    ↓
System prompt built with CV context + Nicky persona
    ↓
generateResponse() → active provider (with fallback)
    ↓
{ response: text }
```

The Nicky persona is defined in `app/api/chat/route.ts` as `const systemPrompt`. Edit this to change the assistant's name, tone, or instructions.

---

## Updating CV Context

### CAG mode (`CV_CONTEXT_SOURCE = 'cag'`)

1. Edit `data/cv.md`.
2. Restart the dev/server process so the in-memory cache reloads the file.
3. Run:
   ```bash
   node scripts/measure-cv-tokens.mjs
   npm run lint
   ```
4. Optionally validate live responses with real provider keys:
   ```bash
   node scripts/validate-cag.mjs --mode cag
   node scripts/measure-cache.mjs
   ```

Runtime JSON reports are written to `scripts/results/` and are intentionally gitignored.

### When to use CAG vs RAG

| Mode | Use when | Trade-off |
|---|---|---|
| CAG | CV remains compact and stable | Best completeness; prompt caching can reduce repeated prompt cost/latency |
| RAG | Corpus grows with portfolio, projects, publications, or long case studies | Lower prompt size; retrieval can miss relevant context |

Current rule of thumb: stay in CAG below ~10K CV tokens, benchmark above 10K, and prefer RAG/sectioned retrieval above ~50K tokens. See `docs/cag-limits.md`.

### Prompt caching

- OpenAI: automatic prefix caching when the stable system prompt is at least ~1,024 tokens.
- Gemini: provider-side cache/usage metadata should be monitored; current stable prefix is estimated just above the ~2,048 token threshold.
- Cache metrics are logged server-side by `lib/modelProviders.ts` and can be collected with `scripts/measure-cache.mjs`.

---

## API Reference

### `POST /api/chat`

```json
// Request
{
  "messages": [
    { "role": "user", "content": "What is your experience with fintech?" }
  ]
}

// Response 200
{ "response": "..." }

// Response 429
{ "error": "Rate limit exceeded: 200 requests per day maximum", "retryAfter": 28800 }
```

Headers required: `X-CSRF-Token`, `Content-Type: application/json`

### `POST /api/job-match`

```json
// Request
{ "jobDescription": "Senior Product Designer, 5+ years..." }

// Response 200
{
  "overallMatch": 85,
  "skillsMatch": 90,
  "experienceMatch": 80,
  "analysis": "...",
  "strengths": ["..."],
  "improvements": ["..."]
}
```

Input: 100–5,000 characters. Rate limit: 200/day/IP.

---

## Security

| Layer | Implementation |
|---|---|
| CSRF | 64-char crypto token, httpOnly cookie, verified on every API request |
| Rate Limiting | In-memory, 200 req/day/IP, daily reset |
| Input Validation | Message structure, length, count limits (`lib/validation.ts`) |
| Injection Protection | HTML/XML/SQL pattern detection on job descriptions |
| Server Secrets | `server-only` marker on Supabase client |

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| 403 Forbidden | Missing/invalid CSRF token | Refresh page to get a new token |
| 429 Too Many Requests | Rate limit hit | Wait until midnight UTC |
| 500 from chat | AI provider down or CV context file missing | Check fallback order in `modelConfig.ts` and verify `data/cv.md` exists |
| Empty responses | Invalid API key | Check `.env.local` and Vercel env vars |
| DB errors | Supabase misconfigured | Verify `SUPABASE_SERVICE_ROLE_KEY` |

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables in project settings:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy — automatic on every push to `main`

---

**Last updated:** June 2026
