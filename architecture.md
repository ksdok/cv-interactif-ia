# architecture.md — Architecture & conventions techniques

> Complément de [`CONTEXT.md`](CONTEXT.md) (commandes, pièges, état des tickets) et de
> [`project-state.md`](project-state.md) (source de vérité des statuts).
> Ce fichier décrit la **structure durable** du projet : techos, zones de code, flux de données,
> conventions non négociables. Les détails opérationnels (commandes, pièges, workflow tickets)
> restent dans `CONTEXT.md`.
>
> Dernière mise à jour : 2026-09-25

---

## 1. Vue d'ensemble

CV interactif bilingue (FR/EN) avec chat IA (« Nicky ») et job matcher, déployé sur Vercel
([kimsandok.com](https://kimsandok.com)).

- **Framework** : Next.js 16 (App Router, Turbopack), React 19, TypeScript strict
- **Styling** : Tailwind CSS 4, design éditorial monochrome (tokens dans `app/globals.css`)
- **IA** : multi-provider avec fallback — OpenAI (actif, GPT-6 Luna, `reasoning_effort: none`) → Gemini 3.5 Flash
- **Contexte chat** : CAG par défaut (CV complet injecté depuis `data/cv.md`), RAG optionnel
- **RAG / embeddings** : Supabase (pgvector) + OpenAI `text-embedding-3-small`
- **i18n** : routing `app/[lang]/` + dictionnaires maison `lib/i18n/` (pas de next-intl)
- **Tests** : Vitest 5 (Node environment, `vite-tsconfig-paths`)
- **CI** : GitHub Actions — `type-check` · `lint` · `test` · `build` (`.github/workflows/ci.yml`)
- **Node** : >= 22.12.0

## 2. Structure des dossiers

```
cv-interactif-ia/
├── app/
│   ├── [lang]/                  # Pages bilingues /fr et /en
│   │   ├── layout.tsx           # Métadonnées par locale, hreflang, JSON-LD (GEO-08d)
│   │   ├── page.tsx             # Wrapper server (validation locale, dictionnaire)
│   │   ├── Home.tsx             # Contenu homepage (client, dictionnaire en props)
│   │   └── cv/page.tsx          # CV statique indexable (SEO-03 + GEO-08h)
│   ├── api/
│   │   ├── chat/route.ts        # Chat IA (pipeline CAG/RAG + provider + fallback)
│   │   ├── job-match/route.ts   # Analyse CV ↔ offre d'emploi (toujours en RAG)
│   │   ├── csp-report/route.ts  # Collecte des rapports de violation CSP
│   │   └── health/route.ts      # Health check
│   ├── layout.tsx               # Layout racine : token CSRF, métadonnées FR fallback
│   ├── not-found.tsx            # Boundary 404 (couvre aussi les [lang] invalides)
│   ├── globals.css              # Design tokens + animations
│   ├── sitemap.ts / robots.ts   # Sitemap bilingue + règles crawlers IA
│   └── opengraph-image.png      # Carte OG (1024×1024)
├── components/                  # Composants UI (Header, Hero, ExperienceGrid, ChatPreview…)
├── lib/                         # Logique métier réutilisable (voir §3)
├── data/cv.md                   # Source de vérité du CV (CAG)
├── content/cv/                  # Contenus éditoriaux
├── proxy.ts                     # Ex-middleware (Next 16, runtime Node) — voir §4
├── scripts/
│   ├── generate-llms-full.mjs   # Prébuild : génère llms.txt / llms-full.txt
│   └── bench-models.mjs         # Banc A/B local de modèles
├── docs/backlog/                # Specs et plans des tickets
├── agents/                      # Profils d'agents (performance, sécurité, pi-expert)
└── .github/workflows/ci.yml     # CI minimale
```

## 3. Zones de code `lib/`

| Zone | Fichiers | Rôle |
|---|---|---|
| Config IA / contexte | `modelConfig.ts` | **Point unique de routing** : `ACTIVE_PROVIDER`, `FALLBACK_ORDER`, `CV_CONTEXT_SOURCE` (`'cag' \| 'rag'`) |
| Providers IA | `modelProviders.ts` | `generateResponse()` avec chaîne de fallback ; `PROVIDERS` partagé avec `/api/job-match` — ne pas casser |
| Contexte CAG | `cvContext.ts` + `data/cv.md` | Cache en mémoire : **redémarrer le serveur après édition du CV** |
| RAG | `rag.ts`, `supabase.ts` | Recherche vectorielle pgvector via Supabase |
| Sécurité API | `csrf.ts`, `rateLimit.ts`, `validation.ts` | Pipeline obligatoire sur chaque POST (voir §5) |
| i18n | `i18n/` (`fr.ts`, `en.ts`, `types.ts`) | Dictionnaires typés, locale validée côté serveur |
| Utilitaires | `linkify.ts`, `jsonLd.ts`, `site.ts`, `types.ts`, `systemPrompt.mjs` | — |
| Tests | `__tests__/` | Vitest ; 37 cas sur `validation.ts` (TEST-001) ; `csrf`/`linkify`/`rateLimit` à couvrir |

## 4. Flux clés

### Chat (`/api/chat`)
```
POST → rateLimit (200/j/IP, mémoire) → CSRF → validation input
     → CV_CONTEXT_SOURCE : 'cag' → cvContext (data/cv.md, cache mémoire)
                           'rag' → rag.ts (Supabase pgvector)
     → modelProviders.generateResponse (ACTIVE_PROVIDER → FALLBACK_ORDER)
     ← réponse ; erreurs mappées `errorCode` → `dictionary.apiErrors` côté client
```

### Job matcher (`/api/job-match`)
Toujours en RAG (Supabase) ; partage `PROVIDERS` de `modelProviders.ts`.
Composant `JobMatcher` en import dynamique `next/dynamic` (PERF-001).

### Requête entrante (`proxy.ts`)
Ex-middleware Next 16 (runtime Node), à la racine :
- 301/308 `vercel.app` → domaine canonique ; `/` → 307 `/fr` ou `/en` (Accept-Language)
- **CSP nonce** : `x-nonce`, `strict-dynamic`, **sans `unsafe-inline`**
- Cookie CSRF + headers de sécurité

## 5. Conventions non négociables

1. **Tout wording visible passe par le dictionnaire** (`lib/i18n/`) — rien en dur dans les composants.
2. **Tout POST API passe le pipeline complet** : rate limit → CSRF → validation (`lib/`).
3. **Secrets côté serveur uniquement** (`server-only`) — jamais de clé en `NEXT_PUBLIC_*`.
4. **Routing provider/contexte uniquement dans `modelConfig.ts`** — un seul point de bascule.
5. Ne pas modifier `project-state.md`, `CONTEXT.md`, `architecture.md` sans validation explicite de l'utilisateur.
6. Spécifications taille S max ; toute spec démarre en statut PROPOSÉE.

## 6. Environnement & déploiement

Variables requises (`.env.local`) :
- `OPENAI_API_KEY`, `GEMINI_API_KEY` (fallback recommandé)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CSP_REPORT_ONLY` (optionnel : CSP en report-only avant enforcement)

Déploiement : **Vercel** (push `main`). Pas de déploiement automatisé depuis GitHub Actions à ce jour.
Décision modèle (MODEL-004, livrée le 2026-09-25) : OpenAI bascule sur `gpt-6-luna` avec
`reasoning_effort: none` épinglé ; **rollback** en une ligne (`lib/modelConfig.ts`, `model` → `'gpt-5.4-mini'`).