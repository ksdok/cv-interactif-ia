# CONTEXT.md — Contexte pour LLM implémentant une spec

> Fichier d'entrée destiné à un agent/LLM qui s'apprête à travailler sur un ticket de
> `docs/backlog/`. Lis ce fichier AVANT la spec, puis la spec elle-même.
> Dernière mise à jour : 2026-09-23 — CICD-001 livré ; 3 tickets ouverts créés depuis les signaux du run CI (CICD-002, QUAL-004, TEST-002)

---

## 1. Le projet en 30 secondes

CV interactif bilingue (FR/EN) déployé sur [kimsandok.com](https://kimsandok.com) (Vercel).
Un recruteur peut discuter avec **Nicky**, un assistant IA dont les réponses sont ancrées
dans les données réelles du CV (CAG par défaut, RAG Supabase en fallback configurable).

- **Stack** : Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · Supabase (pgvector) · Vercel
- **IA** : OpenAI GPT-5.4 mini (actif) + Gemini 3.5 Flash (fallback) — commutateur dans `lib/modelConfig.ts`
- **Chat** : `/api/chat` — contexte CAG depuis `data/cv.md` (défaut) ou RAG Supabase
- **Job Matcher** : `/api/job-match` — reste sur RAG/Supabase quel que soit `CV_CONTEXT_SOURCE`
- **Package manager** : **npm** (pas pnpm/yarn)

## 2. Fichiers à lire dans cet ordre

1. Ce fichier (`CONTEXT.md`)
2. La spec du ticket dans `docs/backlog/` (naming : `TICKET-ID-nom-spec.md`, ex. `QUAL-002-structured-logging-spec.md`)
3. `project-state.md` — source de vérité des statuts : coche `[x]` le ticket quand terminé et mets à jour la date d'en-tête
4. `README.md` — si tu touches un point documenté (env vars, mode opératoire CAG, API)

Ne modifie jamais `project-state.md` en dehors de : cochage du ticket, ajout de la ligne
« Spec : … » si absente, entrée de livraison dans « Terminé ✅ » (ou dans la synthèse
corpus SEO/GEO), et date de mise à jour d'en-tête. Le statut **par ticket** du corpus
SEO/GEO vit dans `docs/features/seo-geo/INDEX.md` : `project-state.md` n'en porte qu'un
résumé.

**Où vit la trace de livraison — convention tranchée :**
- Specs du **backlog ingénierie** (`docs/backlog/*-spec.md`) : la spec est un brief
  d'implémentation et **ne reçoit pas** de section « Livraison » — elle reste stable après
  coup. La trace (statut, mesures, décisions) vit dans `project-state.md`.
- Tickets du corpus **SEO/GEO** (`docs/features/seo-geo/*.md`) : chaque ticket porte en plus
  sa propre section « Livraison » (mesures, commits), et son statut par ticket vit dans
  `docs/features/seo-geo/INDEX.md`.

## 3. Commandes

```bash
npm run dev        # http://localhost:3000 — / redirige (307) vers /fr ou /en
npm run lint       # eslint — doit passer avant tout commit
npm run type-check # tsc --noEmit (renommé depuis `typecheck` par TEST-001)
npm run test       # vitest run — non-watch, destiné à la CI
npm run test:watch # vitest — mode watch (développement uniquement)
npm run build      # next build (génère aussi public/llms-full.txt via prebuild)
```

Environnement : `.env.local` requis (voir README) — `OPENAI_API_KEY`, `GEMINI_API_KEY`,
clés Supabase ; `CSP_REPORT_ONLY` est **optionnelle** (déploie la CSP en report-only).
Secrets **server-only** : ne jamais exposer côté client.

**Tests automatisés : Vitest 5 est en place** (`TEST-001`) — `npm run test` (non-watch)
comme cible CI, `npm run test:watch` en dev ; la suite actuelle est
`lib/__tests__/validation.test.ts` (37 cas migrés de l'ancien runner mort).
`npm run lint` + `npm run type-check` ne prouvent **rien** sur le comportement runtime : il
faut vérifier à la main les points de la section « Verification » de la spec. Deux transitions
à connaître : le script `typecheck` est devenu `type-check` (`TEST-001`), et la cible Node est
passée à **≥ 22.12** (`engines` — ceux de Vitest 5 sont plus stricts que ceux de Next 16 : un
runner Node 20 échoue à `npm ci`).

## 4. Outils de recherche — à utiliser pendant l'implémentation

### Firecrawl local (PRÉFÉRÉ pour toute recherche web / scraping)

Instance auto-hébergée sur `http://localhost:3002` — passerelle par défaut pour :
- **scraping d'une URL** : `POST /v1/scrape` `{"url":"...","formats":["markdown"]}` (gère le JS rendu, contourne les blocages bots) — préférer à `fetch_content` par défaut
- **recherche web** : `POST /v1/search` `{"query":"...","limit":5}` — alternative par défaut à `web_search`
- **plan d'un site** : `POST /v1/map` · **crawl asynchrone** : `POST /v1/crawl` + polling `GET /v1/crawl/{id}`

Règles d'usage :
- Vérifier que l'instance tourne : `docker ps --filter name=firecrawl-api` doit montrer `firecrawl-api-1 Up` (sinon `docker start firecrawl-api-1` ou fallback `fetch_content`/`web_search`)
- **Toujours en curl silencieux vers un fichier** (jamais d'output inline — les JSON font des centaines de Ko) : `curl -s -o /tmp/fc.json -X POST http://localhost:3002/v1/... -H 'Content-Type: application/json' -d '<json>' --max-time 60 -w 'HTTP %{http_code}\n'`, puis parser le fichier
- Pas d'authentification sur cette instance : **ne pas envoyer** d'`Authorization` ni d'`api_key`
- `/v1/search` peut être lent (10-40s) ; si résultats vides, fallback `web_search`
- Citer les URLs de `data.metadata.sourceURL` / `data[].url` comme sources

### Context7 MCP (si nécessaire — docs de bibliothèques)

Pour les docs à jour des librairies du projet (Next.js 16, Tailwind 4, Sentry `@sentry/nextjs`, `@upstash/ratelimit`, etc.) :
1. `context7_resolve-library-id` avec le nom officiel de la lib (ex. « Next.js ») → obtient un ID `/org/project`
2. `context7_query-docs` avec l'ID + une question précise → docs + exemples de code

À utiliser **si nécessaire** : quand la spec touche une API d'une lib dont la version en `package.json` a pu évoluer (les SDK Sentry/OpenAI bougent vite) — ne pas deviner à partir de vieux souvenirs.

## 5. Architecture — points clés

| Zone | Fichiers | À savoir |
|---|---|---|
| Config IA/contexte | `lib/modelConfig.ts` | Point unique : `ACTIVE_PROVIDER`, `FALLBACK_ORDER`, `CV_CONTEXT_SOURCE` ('cag' \| 'rag') |
| Providers IA | `lib/modelProviders.ts` | `generateResponse()` avec fallback chain ; ne pas casser `/api/job-match` qui partage `PROVIDERS` |
| Contexte CAG | `data/cv.md` + `lib/cvContext.ts` | Cache en mémoire — redémarrer le serveur après édition du CV. Consigne de langue (`lang` du corps, fallback `fr`) ajoutée **en fin** de prompt (`lib/systemPrompt.mjs`) : le préfixe persona + CV doit rester commun fr/en, sinon le cache de prompt est divisé (GEO-08g) |
| Sécurité | `proxy.ts` | Ex-middleware (Next 16, runtime Node) : 301/308 vercel.app→canonique, négociation locale, **CSP nonce (`x-nonce`, `strict-dynamic`, sans `unsafe-inline`)**, cookie CSRF, headers sécurité |
| Sécurité API | `lib/csrf.ts`, `lib/rateLimit.ts`, `lib/validation.ts` | Pipeline obligatoire sur chaque POST : rate limit (200/j/IP, mémoire) → CSRF → validation |
| i18n | `app/[lang]/`, `lib/i18n/` | Dictionnaires FR/EN maison (`fr.ts`, `en.ts`, `types.ts`), locale validée côté serveur |
| Pages | `app/[lang]/Home.tsx` (client), `page.tsx` (server), `cv/page.tsx` | Tout le wording visible passe par le dictionnaire en props |
| Composants chat | `components/ChatPreview.tsx` | Consomme `/api/chat` ; erreurs mappées via `errorCode` → `dictionary.apiErrors` |

## 6. Conventions non négociables

1. **Aucune chaîne visible en dur dans le JSX** — règle ESLint `react/jsx-no-literals`
   active (`eslint.config.mjs`, contexte GEO-08b). Tout texte passe par le dictionnaire.
   Vérification complète : `scripts/check-locale.mjs`.
2. **Erreurs API** : corps `{ error, errorCode }` où `errorCode` est agnostique de la
   langue (`RATE_LIMIT`, `CSRF`, `VALIDATION`, `SERVER`) ; le client mappe vers le
   message localisé. Exception : `VALIDATION` renvoie le message serveur actionnable.
3. **CSP** : ne jamais affaiblir (`unsafe-inline`, `unsafe-eval` interdits). Tout script
   tiers doit passer la politique nonce de `proxy.ts` — vérifier `/api/csp-report` après
   tout ajout de script.
4. **Secrets** : `server-only` sur le client Supabase ; fail-fast en prod si
   `SUPABASE_SERVICE_ROLE_KEY` absente (SEC-005).
5. **Contrats d'API à préserver** : 429 (`Retry-After`, `X-RateLimit-*`), 403 CSRF,
   400 validation, 500 générique. Ne change pas ces formes sans mention explicite dans
   la spec.
6. **`proxy.ts`** : runtime **Node.js** en Next 16 — c'est le défaut et il n'est **pas
   configurable** (déclarer `runtime` dans ce fichier lève une erreur). Pas de dépendance
   lourde : ce fichier s'exécute à **chaque** requête. 301 (GET) / 308 (autres méthodes)
   pour la déduplication vercel.app, 307 pour la négociation de locale.

## 7. Workflow d'implémentation d'une spec

1. Lis la spec **en entier** — les sections « Design decisions » et « Handoff notes »
   sont contraignantes ; les décisions ouvertes doivent être tranchées **et documentées
   dans le corps du commit** (il n'y a pas de flux PR dans ce dépôt : commits directs sur
   `main`, déploiement Vercel automatique au push).
2. Respecte le périmètre (In scope / Out of scope) — ne saute pas sur les tickets voisins.
3. Les specs contiennent des **dépendances d'ordre** (ex. QUAL-002 avant QUAL-003,
   TEST-001 avant CICD-001). Vérifie dans `project-state.md` que les dépendances sont livrées.
4. Après implémentation : `npm run lint`, `npm run type-check`, `npm run test`, `npm run build` + les
   vérifications spécifiques de la section « Verification » de la spec.
5. Coche le ticket dans `project-state.md` uniquement si les critères d'acceptation
   (« Acceptance criteria ») sont tous remplis.
6. Commit à la manière du dépôt : sujet `docs:` / `feat(<TICKET>):` / `fix(review):`, en
   français, avec un corps qui explique le *pourquoi*. Un ticket = un commit cohérent,
   pas un commit fourre-tout.

## 8. État des tickets (résumé — vérifier `project-state.md` pour le détail)

**Corpus seo-geo** (`docs/features/seo-geo/INDEX.md`) : quasi terminé. Restes ouverts :
GEO-09 (off-page, continu), TECH-10 (vérifs restantes), INFRA-11. Le statut par ticket
fait foi dans `INDEX.md` ; `project-state.md` n'en porte qu'une synthèse.

**Backlog ingénierie** — la plupart ont une spec dédiée dans `docs/backlog/`
(`TICKET-ID-…-spec.md`) ; les exceptions sont signalées ci-dessous :
- ✅ `TEST-001` (infrastructure Vitest + 37 cas de validation migrés) → débloque `CICD-001`
- ✅ `CICD-001` (workflow CI minimal : `type-check` + `lint` + `test` + `build` sur PR et push `main`)
- 🟠 `CICD-002` (durcissement CI : actions v4 → v7, `concurrency`, image de runner épinglée) — signaux du premier run réel
- 🟠 `PERF-002` (streaming), `OBS-001` (Sentry)
- 🟡 `QUAL-002` (logger) → puis `QUAL-003` (ESLint) ; `QUAL-001` (Prettier/husky) indépendant
- ⚪ `QUAL-004` (gitlink orphelin `.claude/worktrees/*` + `.claude/**` suivis malgré `.gitignore` — cause du warning `git exit 128` en CI), `TEST-002` (`vite-tsconfig-paths` → `resolve.tsconfigPaths` natif, supprime `tsconfck` non maintenu), `PERF-003` (cache API, ancien plan sans spec dédiée), `UX-002` (dark mode, ancien plan),
  `SEC-003` (rate limit persistant — conditionné à un déclencheur, ne pas implémenter sans accord),
  `SEO-001` (probablement absorbé par SEO-03 ✅ — à confirmer avant de travailler dessus)

## 9. Pièges connus

- **`lib/rateLimit.ts` est en mémoire** : les compteurs réinitialisent à chaque déploiement — comportement connu, documenté (SEC-003 couvre la migration, reportée).
- **`next build` est secret-free, ne pas le casser** : `lib/supabase.ts` expose `getSupabase()` (client construit au premier usage) et `lib/rag.ts` utilise `apiKey: … || ''`. Le fail-fast de production SEC-005 est volontairement au **runtime**, pas au niveau module — Next évalue les modules des API routes pendant `Collecting page data`, donc un `throw` au chargement ferait échouer la CI (qui tourne sans aucun secret). Ne pas revenir à un client construit au niveau module.
- **Gemini cache non confirmé** : OpenAI prefix cache validé (5/5 hits en mono-langue, 6/6 en alternance fr/en — préfixe persona + CV partagé, 2 304 tokens), Gemini 0/5 — ne pas promettre d'économies Gemini sans re-mesurer (`scripts/measure-cache.mjs`).
- **`data/cv.md` ≈ 2 400 tokens estimés** (9 620 caractères ; préfixe stable persona + CV ≈ 2 640 tokens — `scripts/measure-cv-tokens.mjs`) : rester en CAG en dessous de ~10K tokens ; au-delà, voir `docs/cag-limits.md`.
- **Ne pas déplacer la consigne de langue du chat** : elle est ajoutée en **fin** de prompt, après le bloc CV. La placer avant le CV donnerait deux préfixes distincts fr/en et diviserait le taux de hit du cache (GEO-08g).
- **`npm run type-check` peut échouer sur `.next/`** : le `include` de `tsconfig.json` prend `**/*.ts` sans exclure `.next`, donc une copie parasite (ex. `.next/types/routes.d 2.ts`) déclenche un `TS2300 Duplicate identifier`. Supprimer les `* 2.ts` sous `.next` (ou `.next` entier) et relancer : ce n'est jamais le code en cours d'édition.
- **Rapports runtime** (`scripts/results/`) : gitignorés intentionnellement.
- **`public/llms-full.txt` est généré au build** (prebuild) — ne jamais l'éditer à la main.
- **Latences mesurées** : OpenAI ≈ 1,4s, Gemini ≈ 8,0s — toute feature qui augmente la latence perçue du chat doit passer par PERF-002 (streaming), pas par un contournement.