# CV Interactif IA

An interactive resume website with a "High-End Editorial Minimalism" design. Recruiters can chat with **Nicky**, an AI assistant, to ask questions about the candidate's background. Answers are grounded in actual CV data through a configurable CAG/RAG context system.

Live: [kimsandok.com](https://kimsandok.com) (canonical) · [cv-interactif-ia.vercel.app](https://cv-interactif-ia.vercel.app) (redirected in production, SEO-04)

---

> **Working on a ticket with an AI agent/LLM?** Read [`CONTEXT.md`](CONTEXT.md) first — it carries the
> commands, the non-negotiable conventions, the known traps and the research tooling for implementing a
> spec from `docs/backlog/`. [`AGENTS.md`](AGENTS.md) points there too.

## Features

- **AI Chat (Nicky)** — Collapsible chat section powered by CAG by default, with RAG fallback available. Expands inline on first message.
- **Configurable CV Context** — Switch `/api/chat` between local CV file CAG and Supabase RAG via `CV_CONTEXT_SOURCE` in `lib/modelConfig.ts`.
- **Multi-Provider AI** — Supports OpenAI and Gemini with automatic fallback. Switch providers by editing one line in `lib/modelConfig.ts`.
- **Job Matcher** — Paste any job description to get an AI-powered CV match analysis (overall %, skills %, experience %, strengths, improvements).
- **Bilingual FR/EN** — Locale routing under `/fr` and `/en` (`app/[lang]/`), in-house dictionaries (`lib/i18n/`), locale negotiation in `proxy.ts` (307 redirect of `/`), hreflang + per-locale canonical + bilingual JSON-LD entity.
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
| i18n | `app/[lang]/` routing + in-house dictionaries `lib/i18n/` (no next-intl), locale negotiation in `proxy.ts` |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with pgvector extension enabled
- At least one AI provider API key (OpenAI required for default chat + embeddings; Gemini recommended for fallback)

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

# Security (optional)
# Set to true to deploy CSP in report-only mode before enforcing.
CSP_REPORT_ONLY=false
```

### Install & Run

```bash
npm install
npm run dev       # http://localhost:3000 — / redirects (307) to /fr or /en (Accept-Language)
npm run build     # production build
npm run lint      # lint check
```

---

## Switching AI Provider and Context Source

Edit `lib/modelConfig.ts` — this is the only file you need to touch for provider/context routing:

```ts
export const CV_CONTEXT_SOURCE: CVContextSource = 'cag'  // 'cag' | 'rag'
export const ACTIVE_PROVIDER: Provider = 'openai'         // 'openai' | 'gemini'
export const FALLBACK_ORDER: Provider[] = ['gemini']
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
│   ├── [lang]/
│   │   ├── layout.tsx             # Per-locale metadata, hreflang, JSON-LD (GEO-08d)
│   │   ├── page.tsx               # Server wrapper (locale validation, dictionary)
│   │   ├── Home.tsx               # Homepage client content (dictionary via props)
│   │   └── cv/page.tsx            # Bilingual indexable CV (SEO-03 + GEO-08h)
│   ├── layout.tsx                 # Root layout: CSRF token, fallback FR metadata
│   ├── not-found.tsx              # 404 boundary (root — also covers invalid [lang] params, GEO-08a/B1)
│   ├── globals.css                # Design tokens + animations
│   ├── api/
│   │   ├── chat/route.ts          # Chat endpoint (CAG/RAG + AI)
│   │   ├── job-match/route.ts     # Job matching endpoint
│   │   ├── csp-report/route.ts    # CSP violation report collector
│   │   └── health/route.ts        # Health check
│   ├── sitemap.ts                 # Bilingual sitemap + hreflang alternates (GEO-08e)
│   ├── robots.ts                  # robots.txt incl. AI crawlers rules (GEO-07)
│   ├── opengraph-image.png        # OG card image + opengraph-image.alt.txt (alt per-locale since Lot 1)
│   └── favicon.ico
├── components/                    # All wording injected via dictionary props (GEO-08b)
│   ├── Header.tsx                 # Sticky header, logo cliquable, lien CV + language switcher (GEO-08f)
│   ├── Hero.tsx                   # Editorial hero — H1 = name + role (SEO-02)
│   ├── ChatPreview.tsx            # Collapsible AI chat interface
│   ├── ExperienceGrid.tsx         # Bento-style experience cards
│   ├── Footer.tsx                 # Copyright + social links
│   ├── JobMatcher.tsx             # Job match modal
│   ├── TypingEffect.tsx           # Typewriter animation
│   └── LinkifiedText.tsx          # URL → clickable link renderer
├── content/
│   ├── cv-en.tsx                  # EN editorial CV content served at /en/cv
│   └── cv-fr.tsx                  # FR editorial CV content served at /fr/cv (from data/cv.md)
├── lib/
│   ├── i18n/                      # config.ts (locales), dictionaries.ts, fr.ts, en.ts, types.ts
│   ├── modelConfig.ts             # ← Edit here to switch AI provider/context
│   ├── modelProviders.ts          # OpenAI / Gemini abstraction
│   ├── cvContext.ts               # Server-only CAG loader for data/cv.md
│   ├── rag.ts                     # Embedding + Supabase vector search
│   ├── supabase.ts                # Server-only Supabase client
│   ├── jsonLd.ts                  # Shared JSON-LD builder (Person + ProfessionalService)
│   ├── site.ts                    # SITE_URL + fallback FR metadata (derived from dictionary)
│   ├── csrf.ts                    # CSRF token generation + verification
│   ├── rateLimit.ts               # IP-based rate limiting
│   ├── validation.ts              # Chat message input validation
│   ├── linkify.ts                 # URL parser utility
│   ├── types.ts                   # Shared type definitions (cross-modules)
│   ├── systemPrompt.mjs           # Shared Nicky system prompt (server + validation scripts)
│   └── test-validation.ts         # Standalone validation test suite
├── data/
│   └── cv.md                      # Source CV used by CAG mode (FR — chatbot source)
├── docs/
│   ├── cag-limits.md              # CAG/RAG size thresholds and decision rules
│   └── features/seo-geo/          # Ticketed SEO/GEO corpus (INDEX.md + per-ticket specs)
├── proxy.ts                       # Proxy (runtime Node.js — ex-middleware, Next 16):
│                                  # 301 (GET) / 308 (other methods) vercel.app→canonical,
│                                  # locale negotiation (x-locale), nonce (x-nonce), CSP, CSRF cookie
├── scripts/
│   ├── validate-cag.mjs           # CAG validation questionnaire
│   ├── measure-cache.mjs          # Provider cache hit measurement
│   ├── measure-cv-tokens.mjs      # CV token estimate report
│   ├── compare-results.mjs        # CAG vs RAG comparison helper
│   ├── generate-llms-full.mjs     # Generates public/llms-full.txt from data/cv.md at build (GEO-06)
│   └── check-locale.mjs           # i18n dictionaries coverage check
└── public/
    ├── llms.txt                   # Bilingual llms.txt for AI agents (GEO-06)
    └── llms-full.txt              # Full CV in Markdown, generated at build from data/cv.md (GEO-06)
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

## Bilingual SEO & GEO

The site is served in two locales — `/fr` (target market) and `/en` — driven by the
SEO/GEO ticket corpus in [`docs/features/seo-geo/INDEX.md`](docs/features/seo-geo/INDEX.md):

- **Routing** — `/` negotiates the locale (307 + `Vary: Accept-Language`) via `proxy.ts`;
  `/fr` and `/en` serve the same page with translated dictionaries. Mixed-case prefixes
  (`/FR`) are 308-normalized.
- **Metadata per locale** — title/description/keywords/OpenGraph/Twitter from the
  dictionaries (GEO-08d); hreflang `fr` / `en` / `x-default → /fr`; per-locale canonical.
- **JSON-LD** — one bilingual entity (`Person` + `ProfessionalService`, same `@id` on all
  locales) built by `lib/jsonLd.ts`, wording translated per page.
- **Sitemap & robots** — bilingual sitemap with hreflang alternates (GEO-08e); robots.txt
  allows AI crawlers (GEO-07).
- **Switcher de langue** — both locales displayed as native crawlable links
  (`FR / EN`) in the sticky header, active locale highlighted (`aria-current="page"`),
  current page preserved (GEO-08f, itération 2 — préférence utilisateur).
- **Header navigable** — le logo et un lien « CV » (vers la page CV de la
  locale courante) complètent le header ; lien interne site-wide vers `/cv`
  (GEO-08f, itération 3 — responsive vérifié CDP, tagline masquée sous `sm`).
- **llms.txt** — bilingual `/llms.txt` for AI agents + `/llms-full.txt` generated
  at build from `data/cv.md` (GEO-06).
- **CV pages** — `/fr/cv` (from `data/cv.md`) + `/en/cv`, linked by hreflang;
  the legacy `/cv` URL issues a permanent 301 to `/fr/cv` (GEO-08h).
- Ticket statuses live in `docs/features/seo-geo/INDEX.md`.

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
| CSP | Nonce-based Content Security Policy in `proxy.ts`; `CSP_REPORT_ONLY=true` enables report-only mode |
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
   - `CSP_REPORT_ONLY` (optional; set to `true` only for CSP report-only rollout)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy — automatic on every push to `main`

---

**Last updated:** September 2026
