# Project State — cv-interactif-ia

> Source de vérité pour le suivi des tâches, des priorités et de la backlog.
> Fichier renommé depuis `projet-state.md`.
> Dernière mise à jour : 2026-09-23 — 3 tickets créés à partir des signaux du run CI (CICD-002 durcissement workflow, QUAL-004 gitlink orphelin `.claude/`, TEST-002 `resolve.tsconfigPaths` natif) ; CICD-001 (workflow CI minimal) livré ; TEST-001 (infrastructure Vitest + 37 cas migrés) livré ; GEO-08g (chat Nicky multilingue + job-match localisé) livré et revu ; UX-003 (header navigable) livré ; spec PROJ-001 (projets GitHub) rédigée puis révisée (revue M1-M5) ; spec MODEL-003 (migration SDK Gemini) rédigée depuis la revue M4 de PERF-002 ; spec PERF-002 durcie (revue M11-M17) et son ticket de suivi désormais tracé dans MODEL-003 ; spec MODEL-004 créée (durcissement du garde-fou hors-sujet) avec la décision de rester sur `gpt-5.4-mini` et les mesures du banc A/B local ; spec PERF-002 (streaming) révisée après revue croisée Context7/web — décisions tranchées : NDJSON, fallback option A (commit au 1er octet écrit), suppression TypingEffect, `stream_options.include_usage` exigé

---

## Maturité — Synthèse globale (juillet 2026)

| Dimension | Score | Niveau |
|-----------|-------|--------|
| 🧪 Tests | **3/10** | INCOMPLET |
| 📐 Qualité de code | **4/10** | INCOMPLET |
| 🔒 Sécurité | **7/10** | BONNE BASE |
| 🏗️ Architecture | **7/10** | SOLIDE |
| ⚡ Performance | **4/10** | SOUS-EXPLOITÉ |
| 📊 Observabilité | **1/10** | INEXISTANTE |
| 🔄 CI/CD | **4/10** | INCOMPLET |
| 📚 Documentation | **7/10** | BONNE |

**Score global : 4.6/10** — Produit fonctionnel et deployable, mais encore immature sur les fondamentaux d’ingénierie logicielle.

### Points forts
- Multi-provider IA avec fallback (OpenAI → Gemini)
- Configuration centralisée (`modelConfig.ts`) — changement de provider/context en un point
- Sécurité au-dessus de la moyenne : CSRF, rate limiting, input validation, `server-only`
- Architecture CAG/RAG hybride effectivement branchée dans le code
- Documentation sécurité et backlog détaillées
- Architecture claire : `lib/` / `components/` / `app/`

### Points critiques
- **Couverture de tests embryonnaire** — Vitest installé (TEST-001) avec 37 cas sur `lib/validation.ts` ; `csrf`/`linkify`/`rateLimit` restent à couvrir, pas de seuil de couverture
- **CI minimale en place** (type-check + lint + test + build sur PR et push `main`) — pas de déploiement automatisé depuis GitHub Actions, pas de couverture de tests publiée
- **Observabilité inexistante** — logs `console.*` seulement, pas de health check, pas d’alerting
- **Performance sous-exploitée** — pas de streaming LLM, pas de code splitting sur les composants non critiques

---

## Statut général

**Production** : [kimsandok.com](https://kimsandok.com)
**Stack** : Next.js 16 · TypeScript · Tailwind 4 · Supabase · Vercel
**Provider actif** : OpenAI GPT-5.4 mini (fallback : Gemini 3.5 Flash)
**Décision modèle (2026-09-23)** : **rester sur `gpt-5.4-mini`** — banc A/B local (`scripts/bench-models.mjs`, 19 questions × 2 langues, cache chaud) : GPT-6 Luna gagne les évals publiques (Intelligence Index AA 37 vs 24) mais **perd le critère produit** — garde-fou hors-sujet 3/4 à `reasoning_effort: none` (météo FR : propose de répondre) et 2/4 au défaut `medium` (raconte les blagues, FR et EN), contre **4/4** pour 5.4-mini ; latence équivalente à `none`, +74 % de TTFT à `medium` ; gain de coût ×11.6 réel mais inopérant au plafond de 200 req/j/IP. **Réexamen** : dépréciation de `gpt-5.4-mini`, ou modèle moins cher passant le jeu hors-sujet élargi (MODEL-004)
**Source de contexte chat** : CAG par défaut (`CV_CONTEXT_SOURCE = 'cag'`), RAG conservé pour le fallback configurable et `job-match`
**Langue de réponse** : suit la locale demandée (`lang` sur `/api/chat`, `language` sur `/api/job-match` ; valeur absente ou invalide → `fr`) — le préfixe persona + CV reste partagé fr/en pour le cache de prompt (GEO-08g)

---

## En cours

Le durcissement d’ingénierie est largement livré (CSP + headers SEC-001/SEC-002, fail-fast Supabase SEC-005, health check OBS-002, infrastructure de tests TEST-001, pipeline CI minimal CICD-001, specs de délégation rédigées). Reste, par ordre de priorité :

- monitoring Sentry (OBS-001) et streaming des réponses IA (PERF-002)
- durcissement du garde-fou hors-sujet du chat (MODEL-004) — suite directe du banc du 2026-09-23 : persona + jeu hors-sujet élargi + détecteur réparé ; décision modèle déjà enregistrée ci-dessus
- migration du SDK Gemini (MODEL-003, après PERF-002)
- page Projets GitHub (PROJ-001, spec prête depuis le 2026-09-23)
- finitions du corpus SEO/GEO (GEO-09, TECH-10, INFRA-11 — voir la synthèse ci-dessous)

---

## Specs prêtes pour délégation

Les tickets suivants disposent désormais d’une spec dédiée dans `docs/backlog/` :

- `TEST-001` → `docs/backlog/TEST-001-automated-test-infrastructure-spec.md`
- `CICD-001` → `docs/backlog/CICD-001-minimal-ci-pipeline-spec.md`
- `SEC-002` → `docs/backlog/SEC-002-standard-security-headers-spec.md`
- `SEC-005` → `docs/backlog/SEC-005-supabase-service-key-fail-fast-spec.md`
- `SEC-001` → `docs/backlog/SEC-001-content-security-policy-spec.md`
- `PERF-001` → `docs/backlog/PERF-001-jobmatcher-dynamic-import-spec.md`
- `SEC-004` → `docs/backlog/SEC-004-rate-limit-cleanup-spec.md`
- `OBS-002` → `docs/backlog/OBS-002-health-check-endpoint-spec.md`
- `PERF-002` → `docs/backlog/PERF-002-ai-response-streaming-spec.md`
- `OBS-001` → `docs/backlog/OBS-001-error-monitoring-sentry-spec.md`
- `QUAL-001` → `docs/backlog/QUAL-001-prettier-pre-commit-hooks-spec.md`
- `QUAL-002` → `docs/backlog/QUAL-002-structured-logging-spec.md`
- `QUAL-003` → `docs/backlog/QUAL-003-eslint-strict-rules-spec.md`
- `SEC-003` → `docs/backlog/SEC-003-persistent-rate-limiting-spec.md`
- `PROJ-001` → `docs/backlog/PROJ-001-projets-github-spec.md`
- `CICD-002` → `docs/backlog/CICD-002-ci-workflow-hardening-spec.md`
- `QUAL-004` → `docs/backlog/QUAL-004-tracked-claude-artifacts-spec.md`
- `TEST-002` → `docs/backlog/TEST-002-native-tsconfig-paths-spec.md`
- `MODEL-003` → `docs/backlog/MODEL-003-google-genai-migration-spec.md`
- `MODEL-004` → `docs/backlog/MODEL-004-chat-guardrail-hardening-spec.md`

Ces fichiers sont prêts à être donnés à un autre LLM comme brief d’implémentation. Tout ticket ouvert de la backlog dispose désormais d’une spec dédiée.

---

## Backlog

### 🆕 Feature — CAG (Cache-Augmented Generation) pour le chat

#### Objectif
Remplacer le RAG par CAG pour `/api/chat` : le CV complet est chargé depuis un fichier local (`data/cv.md`) et injecté dans le system prompt, avec prompt caching provider-side pour éviter de retraiter les tokens du CV à chaque requête (réduction coût ~90%, latence divisée par 2-10x).

Le mode RAG est conservé comme fallback configurable pour le cas où le corpus grossirait (portfolio, projets détaillés, publications).

#### Contexte technique — Prompt caching par provider

| Provider  | Mécanisme                 | Seuil minimal | Réduction coût | latence |
|-----------|---------------------------|---------------|----------------|---------|
| OpenAI    | automatique (prefix cache) | 1024 tokens   | 50-90%         | ~80%    |
| Gemini    | `cachedContent` API       | 2048 tokens   | ~75%           | variable|

#### Découpage

- [x] **FEAT-CAG-001 — Définir l'architecture de source de contexte** `MEDIUM`
  - Config explicite présente : `CV_CONTEXT_SOURCE = 'cag' | 'rag'` dans `lib/modelConfig.ts`
  - Périmètre V1 limité à `app/api/chat/route.ts`
  - Critère atteint : un switch unique permet de choisir la source de contexte sans modifier la logique provider

- [x] **FEAT-CAG-002 — Créer le fichier source CV et son loader serveur** `MEDIUM`
  - `data/cv.md` est présent comme source de vérité éditable
  - `lib/cvContext.ts` charge le fichier et le garde en mémoire
  - Le loader gère les cas fichier absent / vide avec erreur explicite

- [x] **FEAT-CAG-003 — Brancher la route `/api/chat` sur la source CAG + prompt caching** `MEDIUM`
  - `getChatContext(...)` route vers CAG ou RAG dans `app/api/chat/route.ts`
  - En mode `cag`, le contenu complet du CV est injecté dans le prompt système
  - En mode `rag`, le flux actuel est conservé
  - OpenAI prefix cache validé ; Gemini explicite non confirmé mais dégradation normale observée
  - Aucune régression évidente sur CSRF, rate limit, validation, fallback providers

- [x] **FEAT-CAG-004 — Validation qualité et mesure cache hit rate** `MEDIUM`
  - Script de validation fonctionnelle : `scripts/validate-cag.mjs`
  - Script de mesure cache hit rate : `scripts/measure-cache.mjs`
  - Script de mesure tokens : `scripts/measure-cv-tokens.mjs`
  - Comparaison CAG vs RAG : `scripts/compare-results.mjs`
  - Limites documentées : `docs/cag-limits.md`
  - Taille actuelle : `data/cv.md` ≈ 7 391 chars, 1 848 tokens ; préfixe stable ≈ 2 069 tokens
  - Mesure live CAG Gemini : 9/9 réponses non vides, latence moyenne 8,0s ; garde-fou hors-sujet correct manuellement en CAG (2/2)
  - Mesure live RAG : 9/9 réponses non vides, latence moyenne 5,4s ; garde-fou RAG à améliorer sur `Tell me a joke`
  - Cache Gemini : 0/5 hit explicite, `promptTokenCount` ≈ 1 951 (< seuil réel observé)
  - Cache OpenAI : 5/5 hits, 1 280 tokens cachés, latence moyenne ≈ 1,4s
  - Décision : CAG validé côté taille/architecture/qualité de base ; Gemini cache explicite non confirmé, OpenAI cache validé

- [x] **FEAT-CAG-005 — Documentation et mode opératoire** `LOW`
  - `README.md` documente comment mettre à jour `data/cv.md`
  - `README.md` explique quand utiliser `cag` vs `rag`
  - `README.md` pointe vers `docs/cag-limits.md` pour les limites : coût tokens, précision, fenêtre contexte
  - Prompt caching documenté par provider (OpenAI automatique, Gemini usage/cache metadata)

#### Statut
La migration CAG est désormais considérée comme livrée pour le périmètre chat.
Le RAG reste maintenu pour `job-match` et comme stratégie de repli si le corpus grossit.

#### Notes produit / technique
- Le mode CAG est pertinent tant que le CV reste compact et stable (< fenêtre contexte, ~128K+ tokens)
- Le mode RAG reste préférable si le corpus grossit (portfolio, projets détaillés, publications, études de cas)
- CAG avec prompt caching = coût tokens réduit ~90% + latence réduite + précision 100% (aucun retrieval miss)
- Le RAG est conservé comme fallback configurable, pas supprimé

### 🐛 Bugs — Audit 2026-05-10

_Tous les bugs identifiés lors de l'audit ont été corrigés. Voir la section "Terminé" ci-dessous._

### 🔄 Configuration modèles — Mise à jour

_MODEL-001 et MODEL-002 sont traités (voir la section "Terminé" ci-dessous)._

- [ ] **MODEL-003 — Migration `@google/generative-ai` → `@google/genai`** `LOW`
  - Le SDK Gemini en place est **déprécié** : README npm titré « [Deprecated] Google AI JavaScript SDK for the Gemini API », dernière publication `0.24.1` le **2025-04-29** (~17 mois sans release)
  - Successeur actif : `@google/genai@2.24.0`, publié le **2026-09-22**, `engines.node >= 20` (compatible avec la cible `>= 22.12` du projet)
  - Un seul point d'usage dans le code : `lib/modelProviders.ts` (import, constructeur, `getGenerativeModel`)
  - Enjeu réel : Gemini est le **seul fallback** (`FALLBACK_ORDER = ['gemini']`) — la seule voie de secours d'une panne OpenAI repose sur un SDK abandonné
  - Pièges identifiés dans la spec : retry implicite du nouveau SDK (`p-retry`) qui changerait la latence d'échec en silence, et la ligne de log `[modelProviders] Gemini usage: {…}` qui est un contrat machine pour `scripts/measure-cache.mjs`
  - Issu de la revue M4 de PERF-002 ; à traiter **après** PERF-002 (qui ajoute `callGeminiStream` au même seam)
  - Spec : `docs/backlog/MODEL-003-google-genai-migration-spec.md`

- [ ] **MODEL-004 — Durcissement du garde-fou hors-sujet du chat (Nicky)** `MEDIUM`
  - Issu du banc A/B du 2026-09-23 (`scripts/bench-models.mjs`, 19 questions × 2 langues, cache chaud) : GPT-6 Luna gagne largement sur les évals publiques (Intelligence Index AA 37 vs 24) mais **perd sur le critère produit**
  - Mesures : `gpt-5.4-mini` 4/4 refus hors-sujet corrects · `gpt-6-luna` (`none`) 3/4 (météo FR → propose de répondre) · `gpt-6-luna` (défaut `medium`) 2/4 (**raconte des blagues**, FR et EN) — latence équivalente à `none`, +74 % de TTFT à `medium`
  - Coût : 11,6× moins cher avec Luna mais ~$0,19/jour → ~$0,017/jour au pire cas (plafond 200 req/j/IP) — argument budgétaire inopérant à ce trafic
  - **Décision enregistrée : rester sur `gpt-5.4-mini`**, avec critère de réexamen explicite (dépréciation, ou modèle moins cher passant le jeu élargi)
  - **Travail réel** : durcir le contrat de refus dans la persona (`lib/systemPrompt.mjs`, zone ①, donc sans casser le préfixe de cache partagé fr/en de GEO-08g), élargir le jeu hors-sujet (injection d'instructions, pièges de prémisses, quasi-manque à ne PAS refuser), et **réparer le détecteur** — le pré-filtre mécanique avait annoncé 0/4 suspects sur le bras qui racontait deux blagues
  - Décision annexe à trancher : épingler explicitement `reasoning_effort: 'none'` (aujourd'hui hérité du défaut provider, qui bascule à `medium` sur les familles 5.6/6)
  - Prérequis : commiter `scripts/bench-models.mjs` (non suivi à ce jour) dans un commit dédié avant le travail de durcissement
  - Spec : `docs/backlog/MODEL-004-chat-guardrail-hardening-spec.md`

### 🧪 Tests — Maturité 3/10 (INCOMPLET)

- [x] **TEST-001 — Zéro infrastructure de test** `CRITICAL`
  - Vitest 5 installé (+ `vite-tsconfig-paths`), `vitest.config.mts` (environnement `node`, alias `@/*` lu depuis `tsconfig.json`)
  - Scripts : `test` (`vitest run`, non-watch — contrainte CI), `test:watch`, `type-check` (renommage de `typecheck`)
  - 37 cas migrés de `lib/test-validation.ts` vers `lib/__tests__/validation.test.ts`, dont 24 assertions `expectedError` désormais bloquantes (elles n'étaient que `console.log`-warnées auparavant)
  - `assertValidChatMessages()` couvert (throw sur invalide, narrowing sur valide) ; `lib/test-validation.ts` supprimé (code mort, jamais exécutable)
  - Cible Node `>=22.12.0` (`engines`) — contrainte d'installation de Vitest 5 ; `@types/node` bumpé de `^20` à `^22` en conséquence
  - Détail : `docs/backlog/TEST-001-automated-test-infrastructure-spec.md`
  - Restent ouverts (P1/P2) : tests unitaires `lib/csrf.ts`, `lib/linkify.ts`, `lib/rateLimit.ts` ; tests d'intégration API avec MSW ; e2e Playwright

- [ ] **TEST-002 — Retirer `vite-tsconfig-paths` au profit de `resolve.tsconfigPaths` natif** `LOW`
  - Chaque `npm run test` émet un warning « plugin detected » (Vite résout désormais nativement les chemins du tsconfig)
  - `npm ci` émet `npm warn deprecated tsconfck@3.1.6: unmaintained`, atteignable uniquement via `vite-tsconfig-paths`
  - Suppléé TEST-001 §1/§3 sur le mécanisme de résolution d'alias uniquement ; l'import `@/*` doit rester comme preuve
  - Spec : `docs/backlog/TEST-002-native-tsconfig-paths-spec.md`

### 📐 Qualité de code

- [ ] **QUAL-001 — Prettier + hooks pre-commit manquants** `LOW`
  - Pas de Prettier — formatage non standardisé, risque de diffs sales
  - Pas de `husky` + `lint-staged` — le lint peut ne pas s'exécuter avant commit
  - Ajouter scripts `format` et `format:check` dans `package.json`
  - `npm install --save-dev prettier husky lint-staged`
  - Spec : `docs/backlog/QUAL-001-prettier-pre-commit-hooks-spec.md`

- [ ] **QUAL-002 — Console.log en production** `LOW`
  - Les API routes contiennent de nombreux `console.log`/`console.warn` de debug
  - Remplacer par un logger structuré (Pino) ou supprimer en production
  - Impact : bruit dans les logs Vercel, pas de niveau de sévérité
  - Spec : `docs/backlog/QUAL-002-structured-logging-spec.md` — à traiter avant QUAL-003

- [ ] **QUAL-003 — ESLint config minimale** `LOW`
  - `eslint.config.mjs` utilise `eslint-config-next` sans règles strictes supplémentaires
  - Ajouter des règles : `no-console`, `prefer-const`, `no-unused-vars`
  - Envisager `eslint-plugin-security` pour les patterns dangereux
  - Spec : `docs/backlog/QUAL-003-eslint-strict-rules-spec.md` — dépend de QUAL-002

- [ ] **QUAL-004 — Artefacts `.claude/` suivis par git + gitlink orphelin** `LOW`
  - `.gitignore:47` déclare `.claude/` ignoré, mais des fichiers `.claude/**` sont **suivis** (une règle d'ignore ne désuit pas)
  - `.claude/worktrees/crazy-lederberg` est committé comme **gitlink** (mode d'index `160000`) alors qu'aucun `.gitmodules` n'existe
  - Conséquence : `fatal: No url found for submodule path` + `The process '/usr/bin/git' failed with exit code 128` dans le post-step de `actions/checkout` à chaque run CI
  - Spec : `docs/backlog/QUAL-004-tracked-claude-artifacts-spec.md`

### 🔒 Sécurité

- [x] **SEC-001 — Content Security Policy (CSP)** `MEDIUM`
  - Implémentée dans `proxy.ts` avec nonce dynamique par requête (`x-nonce`) et CSP en header de réponse
  - Production : pas de `script-src 'unsafe-inline'`, pas de `unsafe-eval`, `strict-dynamic`, `script-src-attr 'none'`
  - Report-only supporté via `CSP_REPORT_ONLY=true` + endpoint `/api/csp-report` limité à 10 KB et 100 req/min/IP
  - `report-uri /api/csp-report` actif en report-only et en enforcing
  - Validé : `npm run lint`, `npm run build`, build/start production Node 22, HTML avec scripts Next + JSON-LD noncés, CSP Evaluator (2 findings info liés à `strict-dynamic`)
  - Spec : `docs/backlog/SEC-001-content-security-policy-spec.md`

- [x] **SEC-002 — Configuration sécurité `next.config.ts` + headers HTTP** `MEDIUM`
  - `next.config.ts` : `poweredByHeader: false`; `reactStrictMode: true` activé pour la qualité de code en développement (pas une mesure de sécurité runtime)
  - Headers HTTP de sécurité posés dans `proxy.ts` : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Powered-By` absent en validation HTTP production
  - _(Fusionné depuis l'ancien SEC-002 + SEC-006 qui chevauchaient)_
  - Spec : `docs/backlog/SEC-002-standard-security-headers-spec.md`

- [ ] **SEC-003 — Rate limiting persistant** `LOW`
  - L'implémentation actuelle (`lib/rateLimit.ts`) est en mémoire — réinitialisée à chaque déploiement
  - Migration vers Vercel KV ou Upstash Redis si trafic augmente
  - Spec : `docs/backlog/SEC-003-persistent-rate-limiting-spec.md` — implémentation conditionnée à un déclencheur (abus constaté, coûts API, multi-région)

- [x] **SEC-004 — `cleanupOldRecords()` jamais appelée dans `rateLimit.ts`** `LOW`
  - Appel throttled (max 1x/heure) dans `checkRateLimit()` via `lastCleanup` + `CLEANUP_INTERVAL_MS`
  - Spec : `docs/backlog/SEC-004-rate-limit-cleanup-spec.md`

- [x] **SEC-005 — Supabase key fallback silencieux** `MEDIUM`
  - Fail-fast en production si `SUPABASE_SERVICE_ROLE_KEY` absente ; fallback anon key en dev avec warning console
  - Spec : `docs/backlog/SEC-005-supabase-service-key-fail-fast-spec.md`

### ⚡ Performance

- [x] **PERF-001 — Code splitting — import dynamique de `JobMatcher`** `LOW`
  - `next/dynamic(() => import('@/components/JobMatcher'), { ssr: false })` + rendu conditionnel (`jobMatcherOpen &&`)
  - Spec : `docs/backlog/PERF-001-jobmatcher-dynamic-import-spec.md`

- [ ] **PERF-002 — Streaming des réponses AI** `MEDIUM`
  - `/api/chat` bloque pendant toute la durée de génération (latence perceptible)
  - Implémenter SSE (Server-Sent Events) ou `ReadableStream` pour afficher la réponse progressivement
  - Implique de réécrire `ChatPreview.tsx` pour consommer un stream
  - Spec : `docs/backlog/PERF-002-ai-response-streaming-spec.md`

- [ ] **PERF-003 — Cache API pour requêtes fréquentes** `LOW`
  - Mettre en cache les réponses aux questions récurrentes ("quelle est ton expérience ?")
  - Option 1 : `unstable_cache` Next.js (simple, sans infra supplémentaire)
  - Option 2 : Vercel KV (persist entre déploiements)

- [x] **PERF-004 — Image OpenGraph non optimisée** `LOW`
  - PNG optimisé avec sharp (palette + compression 9) : 431 KB → 215 KB (−49%)
  - Dimensions corrigées dans `layout.tsx` : 1200×630 → 1024×1024 (réelles)

- [x] **PERF-005 — Optimisations `next.config.ts`** `LOW`
  - `compress: true` ajouté
  - _(Les configs `poweredByHeader` et `reactStrictMode` ont été déplacés vers SEC-002)_

### 📊 Observabilité — Maturité 1/10 (CRITIQUE)

- [ ] **OBS-001 — Aucun monitoring ni alerting** `MEDIUM`
  - Tous les logs sont `console.log/warn/error` — bruyant en production, non structuré
  - Intégrer **Sentry** (`@sentry/nextjs`) — setup ~30 min, alerting 500 immédiat
  - Ou Logtail / Vercel Logs pour structured logging JSON
  - Spec : `docs/backlog/OBS-001-error-monitoring-sentry-spec.md` — attention à la compatibilité CSP (nonce, `proxy.ts`)

- [x] **OBS-002 — Pas de health check endpoint** `LOW`
  - `GET /api/health` créé — retourne `{ status: 'ok', timestamp }`, sans auth ni rate limit
  - Spec : `docs/backlog/OBS-002-health-check-endpoint-spec.md`

### 🔄 CI/CD — Maturité 4/10 (INCOMPLET)

- [x] **CICD-001 — Pipeline CI minimal** `MEDIUM`
  - `.github/workflows/ci.yml` : déclenché sur `push` vers `main` et sur `pull_request`
  - Ordre : `npm ci` → `type-check` → `lint` → `test` → `build`, sur **Node 22** (`actions/setup-node`, `cache: npm`)
  - `timeout-minutes: 15` : un `test` en watch-mode doit échouer en minutes, pas après les 6 h du runner
  - `permissions: contents: read` ; aucun secret requis — le build est devenu secret-free (voir la note ci-dessous)
  - Restent hors périmètre : déploiement depuis GitHub Actions, previews, upload de couverture, matrice multi-Node
  - ✅ **Vérification remote (partielle)** : le trigger `push` sur `main` est confirmé — run GitHub Actions `35862478119`, job `type-check · lint · test · build` vert en 40 s (2026-09-23). Le trigger `pull_request` n'est pas encore exercé (l'historique du dépôt est en commits directs sur `main`) : à valider au premier ticket passé par une branche + PR.

#### Note — build secret-free (finding CICD-001)

`next build` échouait sans variables d'environnement : `lib/supabase.ts` levait son
fail-fast **au niveau module** (SEC-005), or Next évalue les modules des API routes
pendant `Collecting page data`, et `lib/rag.ts` construisait `new OpenAI({apiKey: undefined})`
(qui lève à la construction). Un build n'a pas besoin d'accéder à la base ni au provider :

- `lib/supabase.ts` expose désormais `getSupabase()` — client construit au premier usage ;
  le throw de production SEC-005 est conservé, simplement déplacé au runtime.
- `lib/rag.ts` utilise `apiKey: process.env.OPENAI_API_KEY || ''` (même garde que
  `lib/modelProviders.ts`, BUG-008).

Conséquence : la CI tourne sans aucun secret, et le fail-fast de production reste effectif
au premier appel réel. Le détail (et le compromis assumé vis-à-vis de SEC-005 §3) est dans
le corps du commit.

- [ ] **CICD-002 — Durcissement du workflow CI** `MEDIUM`
  - Signaux du premier run réel (`35862478119`) : `Node.js 20 is deprecated` — `actions/checkout@v4` et `actions/setup-node@v4` ciblent Node 20 et sont forcés sur Node 24
  - `ubuntu-latest` migrera vers Ubuntu 26 à partir du **2026-10-19** (non-déterminisme : l'image change sans commit)
  - `concurrency` absent : les runs supplantés ne sont pas annulés (minutes de runner brûlées)
  - Cibles vérifiées : `actions/checkout` dernier tag `v7.0.1`, `actions/setup-node` `v7.0.0`, les deux en `runs.using: node24`
  - Spec : `docs/backlog/CICD-002-ci-workflow-hardening-spec.md`

### 🆕 Feature — Projets GitHub

- [ ] **PROJ-001 — Page Projets GitHub (hub + pages détail)** `MEDIUM` · effort L
  - Hub bilingue `/fr/projets` + `/en/projets` (grille SSR sans carrousel) + page détail par projet `featured` avec contenu rédigé FR/EN complet (invariant `featured ⟹ detailFr && detailEn`)
  - Source éditoriale bilingue `content/projects.ts` (liste, ordre et filtrage éditoriaux) + enrichissement GitHub REST API server-side (Data Cache `revalidate` + mémo négatif anti-spam, fallback gracieux)
  - Rendu dynamique assumé (layout `[lang]` lit headers/cookies — nonce JSON-LD) ; JSON-LD `SoftwareSourceCode` noncé référencé à `#person`
  - Décision SEO/GEO tranchée et sourcée dans la spec : hub + pages détail sélectives (anti thin content), carrousel écarté ; lien Projets dans le footer seul, header et home inchangés
  - Spec : `docs/backlog/PROJ-001-projets-github-spec.md` (révision 2026-09-23 : M1-M5 traités)

### 🎨 UI / UX

- [x] **UX-003 — Header navigable : lien CV + logo cliquable** `LOW`
  - Lien « CV » dans le sticky header vers la page CV de la locale courante (+ lien interne site-wide vers `/cv`, gain SEO-03/GEO-08h)
  - Logo (nom + tagline) cliquable vers la home de la locale courante ; aria-label composé contenant le libellé visible (WCAG 2.5.3 Label in Name)
  - Responsive vérifié par mesures CDP (Chrome headless) : header 80 px de 320 à 520 px (tagline masquée sous `sm`), 99 px ≥ 640 px, zéro débordement 320-1280 px
  - Wording dans les dictionnaires FR/EN (`header.cvLink`, `cvLinkAria`, `homeLinkAria`)
  - Spec : `docs/features/seo-geo/GEO-08f-switcher-langue-header.md` (itération 3, 2026-09-23) — commits `c150986`, `411db33`

- [ ] **UX-002 — Dark mode natif** `LOW`
  - Configurer Tailwind pour `prefers-color-scheme: dark`
  - Définir les variables CSS dark dans `globals.css`
  - Tester les contrastes WCAG AA en mode sombre

### 🔍 SEO

- [ ] **SEO-001 — Contenu statique indexable enrichi** `LOW`
  - Les moteurs de recherche ne peuvent pas indexer les réponses dynamiques de Nicky
  - Ajouter des mots-clés pertinents dans Hero/ExperienceGrid (ex : "Product Designer", "Paris", "IA")
  - Ou ajouter une section "À propos" statique pour les crawlers

### 🧭 Corpus SEO/GEO — synthèse

> Le statut **par ticket** fait foi dans [`docs/features/seo-geo/INDEX.md`](docs/features/seo-geo/INDEX.md) ;
> section volontairement non dupliquée ticket par ticket ici.

- ✅ Livrés : SEO-01→SEO-04, GEO-06, GEO-07, GEO-08a→GEO-08h (routing i18n, dictionnaires, metadata/hreflang, sitemap, switcher de langue, header navigable, chat multilingue, CV bilingue)
- 📄 GEO-08e : ticket de docs corrigé le 2026-09-23 (état final = 4 entrées `<loc>`, la note prévisionnelle « total à 5 » était fausse)
- ⛔ SEO-05 (FAQ + schema FAQPage) abandonné — rich result déprécié par Google (mai 2026)
- ⬜ Ouverts : GEO-09 (off-page, continu), TECH-10 (vérifs device iOS + Lighthouse), INFRA-11 (contact@kimsandok.com)

---

## Terminé ✅

### Bugs corrigés
- [x] **BUG-001** — `rag.ts` : graceful degradation — `return []` dans le catch (`a3764df`)
- [x] **BUG-002** — Message d'erreur 500 obsolète dans `/api/chat` — mis à jour (`9f744af`)
- [x] **BUG-003** — Query RAG vide dans `/api/job-match` — `searchDocuments(trimmedJob, 10)` validé
- [x] **BUG-004** — Interface `ChatMessage` dupliquée — extraite dans `lib/types.ts` (`e3e1faf`)
- [x] **BUG-005** — Messages d'erreur CSRF incohérents — uniformisés sur `'CSRF token validation failed'` (`e3e1faf`)
- [x] **BUG-006** — Commentaire inexact dans `layout.tsx` — corrigé, décrit le double-submit cookie pattern (`e3e1faf`)
- [x] **BUG-007** — Paramètre `filter` dans `match_documents` — faux positif confirmé
- [x] **BUG-008** — Fallback OpenAI GPT-5.4 mini — `max_completion_tokens`, README embeddings OpenAI obligatoire, logs provider génériques (`46494ff`)
- [x] **BUG-009** — Lint local — dépendances React hook stabilisées dans `JobMatcher.tsx`, exemples standalone exclus d'ESLint

### Features livrées
- [x] **Multi-provider AI** — fallback chain Gemini → OpenAI (Anthropic retiré)
- [x] **MODEL-001** — Retrait d'Anthropic du fallback chain, suppression `@anthropic-ai/sdk`
- [x] **MODEL-002** — Mise à jour modèles : Gemini 2.5 Flash → 3.5 Flash, gpt-4o-mini → gpt-5.4-mini
- [x] **CSRF** — token httpOnly vérifié sur chaque requête POST
- [x] **Job Matcher** — analyse CV vs offre d'emploi avec scoring
- [x] **Design éditorial** — refonte "High-End Editorial Minimalism" (`348d9a2`)
- [x] **RAG** — retrieval limité à `topK=10` pour pertinence (`2ae3389`)
- [x] **FEAT-CAG-001** — architecture de source de contexte configurable (`lib/modelConfig.ts`)
- [x] **FEAT-CAG-002** — source CV locale + loader serveur (`data/cv.md`, `lib/cvContext.ts`)
- [x] **FEAT-CAG-003** — intégration CAG/RAG dans `/api/chat` (`app/api/chat/route.ts`)
- [x] **FEAT-CAG-004** — outillage de validation CAG/cache + limites de taille (`scripts/*.mjs`, `docs/cag-limits.md`)
- [x] **FEAT-CAG-005** — documentation README du mode opératoire CAG/RAG, mise à jour CV, prompt caching
- [x] **GEO-08g** — chat Nicky multilingue (consigne de langue en fin de prompt : le préfixe persona + CV reste partagé fr/en, cache mesuré 6/6 hits) + analyse job-match localisée ; fidélité EN vérifiée en revue manuelle ; fallback `fr` sans 400 (`0d7bf66`, `c010db2`)

### Sécurité & qualité
- [x] **CICD-001 — Pipeline CI minimal** — `.github/workflows/ci.yml` (Node 22, `npm ci` → `type-check` → `lint` → `test` → `build`, `timeout-minutes: 15`, `permissions: contents: read`) ; pour rendre la CI sans secret, `lib/supabase.ts` expose un client paresseux `getSupabase()` (fail-fast SEC-005 conservé au runtime) et `lib/rag.ts` tolère une clé OpenAI absente (`|| ''`)
- [x] **TEST-001 — Infrastructure de tests automatisés** — Vitest 5 + `vite-tsconfig-paths`, scripts `test` (`vitest run`, non-watch), `test:watch`, `type-check` (renommage de `typecheck`), cible Node `>=22.12.0` ; 37 cas de validation migrés vers `lib/__tests__/validation.test.ts` (24 assertions d'erreur désormais bloquantes) + couverture d'`assertValidChatMessages()` ; `lib/test-validation.ts` (code mort) supprimé et docs sécurité corrigées (« 40+ cas / all passing » → 37 cas réellement exécutés)
- [x] **Validation des entrées** — `lib/validation.ts`, protection injection (`7cfacc9`)
- [x] **Supabase server-only** — clé service role inaccessible côté client (`7cfacc9`)
- [x] **CVE Next.js / React** — dépendances mises à jour (`288411f`)
- [x] **SEC-001 — CSP stricte avec nonce** — `proxy.ts` nonce dynamique, `script-src` sans `unsafe-inline`, `strict-dynamic`, `script-src-attr 'none'`, report-only supporté, endpoint `/api/csp-report` (6359845, 45a5286). Validé en revue externe : lint, build Node 22, 18 scripts Next noncés, JSON-LD noncé, aucun handler inline, headers HTTP confirmés.
- [x] **SEC-002 — Headers sécurité next.config.ts** — `poweredByHeader: false`, `reactStrictMode: true`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (6359845). Validé en revue externe.

### Accessibilité & SEO
- [x] **Accessibilité WCAG AA** — `aria-label`, ratios de contraste (`e2f3769`)
- [x] **SEO** — métadonnées, sitemap, robots.txt, JSON-LD structuré (`3c70e17`)
- [x] **Open Graph** — image OG générée (`cb296e2`)

### UI / UX
- [x] **UX-001** — Mobile — feedback visuel du chat, scroll après envoi, état de chargement
