# État du projet — cv-interactif-ia

> Source de vérité pour le suivi des tâches et de la backlog.
> Dernière mise à jour : 2026-06-22 — FEAT-CAG-005 documentation CAG/RAG

---

## Maturité — Synthèse globale (juin 2026)

| Dimension | Score | Niveau |
|-----------|-------|--------|
| 🧪 Tests | **1/10** | CRITIQUE |
| 📐 Qualité de code | **4/10** | INCOMPLET |
| 🔒 Sécurité | **7/10** | BONNE BASE |
| 🏗️ Architecture | **7/10** | SOLIDE |
| ⚡ Performance | **4/10** | SOUS-EXPLOITÉ |
| 📊 Observabilité | **1/10** | INEXISTANTE |
| 🔄 CI/CD | **0/10** | AUCUN PIPELINE |
| 📚 Documentation | **6/10** | BONNE |

**Score global : 3.8/10** — Projet fonctionnel mais immature en ingénierie logicielle.

### Points forts
- Multi-provider IA avec fallback (Gemini → OpenAI)
- Configuration centralisée (`modelConfig.ts`) — changer de provider = 1 ligne
- Sécurité au-dessus de la moyenne : CSRF, rate limiting, input validation, server-only
- RAG intégré (Supabase vector search)
- Documentation sécurité détaillée (7 docs dans `docs/security/`)
- Architecture claire : `lib/` / `components/` / `app/`

### Points critiques
- **Zéro test automatisé** — pas de framework, pas de couverture
- **Aucun pipeline CI/CD** — pas de guardrail avant déploiement
- **Observabilité inexistante** — que des `console.log`, pas de monitoring
- **Performance sous-exploitée** — pas de streaming LLM, pas de code splitting

---

## Statut général

**Production** : [kimsandok.com](https://kimsandok.com)
**Stack** : Next.js 16 · TypeScript · Tailwind 4 · Supabase · Vercel
**Provider actif** : OpenAI GPT-5.4 mini (fallback : Gemini 3.5 Flash)

---

## En cours

- Feature CAG (Cache-Augmented Generation) — remplacer le RAG par un fichier CV local + prompt caching provider-side
- Architecture hybride configurable : `CV_CONTEXT_SOURCE = 'cag'` (défaut) | `rag`
- Périmètre V1 : **`/api/chat` uniquement** ; conserver le RAG actuel pour `job-match` tant qu'aucune validation fonctionnelle n'a été faite

---

## Backlog

### 🆕 Feature — CAG (Cache-Augmented Generation) pour le chat

#### Objectif
Remplacer le RAG par CAG pour `/api/chat` : le CV complet est chargé depuis un fichier local (`data/cv.md`) et injecté dans le system prompt, avec prompt caching provider-side pour éviter de retraiter les tokens du CV à chaque requête (réduction coût ~90%, latence divisée par 2-10x).

Le mode RAG est conservé comme fallback configurable pour le cas où le corpus grossirait (portfolio, projets détaillés, publications).

#### Contexte technique — Prompt caching par provider

| Provider  | Mécanisme                | Seuil minimal | Réduction coût | latence |
|-----------|--------------------------|---------------|----------------|---------|
| OpenAI    | automatique (prefix cache)| 1024 tokens   | 50-90%         | ~80%    |
| Gemini    | `cachedContent` API      | 2048 tokens   | ~75%           | variable|

#### Découpage

- [ ] **FEAT-CAG-001 — Définir l'architecture de source de contexte** `MEDIUM`
  - Introduire une config explicite : `CV_CONTEXT_SOURCE = 'cag'` (défaut) | `'rag'`
  - Périmètre V1 : `app/api/chat/route.ts` seulement
  - Conserver le RAG actuel par défaut tant que la version CAG n'est pas validée
  - Critère de fin : un switch unique permet de choisir la source de contexte sans modifier la logique du provider LLM

- [ ] **FEAT-CAG-002 — Créer le fichier source CV et son loader serveur** `MEDIUM`
  - Ajouter `data/cv.md` comme source de vérité éditable
  - Créer un helper serveur dédié (`lib/cvContext.ts`) qui lit le fichier une fois au démarrage (module-level), pas par requête
  - Gérer les erreurs proprement : fichier absent, vide, encodage invalide
  - Retourner une string normalisée prête à injecter dans le system prompt

- [ ] **FEAT-CAG-003 — Brancher la route `/api/chat` sur la source CAG + prompt caching** `MEDIUM`
  - Remplacer ou encapsuler l'appel `searchDocuments(...)` dans une couche `getChatContext(...)`
  - En mode `cag` : injecter le contenu complet du fichier dans le prompt système
  - En mode `rag` : conserver le flux actuel inchangé
  - Ajouter le prompt caching côté provider :
    - OpenAI : préfixe stable ≥1024 tokens (cache automatique, rien à coder)
    - Gemini : `cachedContent` API ou préfixe stable
  - Le fallback gère le cas où un provider ne supporte pas le cache (dégradation normale sans crash)
  - Critère de fin : aucune régression sur CSRF, rate limit, validation d'entrée, fallback providers

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

#### Ordre d'implémentation recommandé
1. `FEAT-CAG-001` — architecture et switch de config
2. `FEAT-CAG-002` — fichier source + loader en mémoire
3. `FEAT-CAG-003` — intégration `/api/chat` + prompt caching provider-side
4. `FEAT-CAG-004` — validation fonctionnelle et mesure cache hit rate
5. `FEAT-CAG-005` — documentation

#### Notes produit / technique
- Le mode CAG est pertinent tant que le CV reste compact et stable (< fenêtre contexte, ~128K+ tokens)
- Le mode RAG reste préférable si le corpus grossit (portfolio, projets détaillés, publications, études de cas)
- CAG avec prompt caching = coût tokens réduit ~90% + latence réduite + précision 100% (aucun retrieval miss)
- Le RAG est conservé comme fallback configurable, pas supprimé

### 🐛 Bugs — Audit 2026-05-10

_Tous les bugs identifiés lors de l'audit ont été corrigés. Voir la section "Terminé" ci-dessous._

### 🔄 Configuration modèles — Mise à jour

_Tous les tickets_MODEL ont été traités. Voir la section "Terminé" ci-dessous._

### 🧪 Tests — Maturité 1/10 (CRITIQUE)

- [ ] **TEST-001 — Zéro infrastructure de test** `CRITICAL`
  - Aucun framework installé (`vitest`, `jest`, `@testing-library/react`, `playwright`)
  - Pas de script `test` dans `package.json`
  - `lib/test-validation.ts` est un runner manuel non connecté à un framework — inutilisé
  - Actions P0 : installer **Vitest** + `@vitejs/plugin-react`, migrer `test-validation.ts` vers `lib/__tests__/validation.test.ts`
  - Actions P1 : tests unitaires pour `lib/csrf.ts`, `lib/linkify.ts`, `lib/rateLimit.ts`
  - Actions P2 : tests d'intégration API avec MSW, tests e2e Playwright

### 📐 Qualité de code

- [ ] **QUAL-001 — Prettier + hooks pre-commit manquants** `LOW`
  - Pas de Prettier — formatage non standardisé, risque de diffs sales
  - Pas de `husky` + `lint-staged` — le lint peut ne pas s'exécuter avant commit
  - Ajouter scripts `format` et `format:check` dans `package.json`
  - `npm install --save-dev prettier husky lint-staged`

- [ ] **QUAL-002 — Console.log en production** `LOW`
  - Les API routes contiennent de nombreux `console.log`/`console.warn` de debug
  - Remplacer par un logger structuré (Pino) ou supprimer en production
  - Impact : bruit dans les logs Vercel, pas de niveau de sévérité

- [ ] **QUAL-003 — ESLint config minimale** `LOW`
  - `eslint.config.mjs` utilise `eslint-config-next` sans règles strictes supplémentaires
  - Ajouter des règles : `no-console`, `prefer-const`, `no-unused-vars`
  - Envisager `eslint-plugin-security` pour les patterns dangereux

### 🔒 Sécurité

- [ ] **SEC-001 — Content Security Policy (CSP)** `MEDIUM`
  - Ajouter une CSP stricte dans `next.config.ts` (headers) ou `middleware.ts`
  - Restricter les sources de scripts, styles, et images
  - Tester avec l'outil CSP Evaluator avant de merger

- [ ] **SEC-002 — Configuration sécurité `next.config.ts` + headers HTTP** `MEDIUM`
  - Ajouter dans `next.config.ts` : `poweredByHeader: false`, `reactStrictMode: true`
  - Ajouter les headers HTTP de sécurité : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
  - Configurer via `headers()` dans `next.config.ts`
  - _(Fusionné depuis l'ancien SEC-002 + SEC-006 qui chevauchaient)_

- [ ] **SEC-003 — Rate limiting persistant** `LOW`
  - L'implémentation actuelle (`lib/rateLimit.ts`) est en mémoire — réinitialisée à chaque déploiement
  - Migration vers Vercel KV ou Upstash Redis si trafic augmente

- [ ] **SEC-004 — `cleanupOldRecords()` jamais appelée dans `rateLimit.ts`** `LOW`
  - La fonction de purge existe mais n'est nulle part appelée → fuite mémoire potentielle sur serveur long-running
  - Appeler périodiquement (ex : à chaque requête avec un intervalle, ou via un cron job)

- [ ] **SEC-005 — Supabase key fallback silencieux** `MEDIUM`
  - `lib/supabase.ts` fait `SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Si la clé service est absente en prod, l'app fallback silencieusement vers la clé anon
  - Risque : opérations privilégiées échouent sans avertissement ou avec des permissions insuffisantes
  - Correction : fail-fast si `SUPABASE_SERVICE_ROLE_KEY` est manquante en production

### ⚡ Performance

- [ ] **PERF-001 — Code splitting — import dynamique de `JobMatcher`** `LOW`
  - `JobMatcher.tsx` est chargé dans le bundle initial mais masqué par défaut
  - Migrer vers `next/dynamic` avec `{ ssr: false }` pour réduire le JS initial

- [ ] **PERF-002 — Streaming des réponses AI** `MEDIUM`
  - `/api/chat` bloque pendant toute la durée de génération (latence perceptible)
  - Implémenter SSE (Server-Sent Events) ou `ReadableStream` pour afficher la réponse progressivement
  - Implique de réécrire `ChatPreview.tsx` pour consommer un stream

- [ ] **PERF-003 — Cache API pour requêtes fréquentes** `LOW`
  - Mettre en cache les réponses aux questions récurrentes ("quelle est ton expérience ?")
  - Option 1 : `unstable_cache` Next.js (simple, sans infra supplémentaire)
  - Option 2 : Vercel KV (persist entre déploiements)

- [ ] **PERF-004 — Image OpenGraph non optimisée** `LOW`
  - `opengraph-image.png` pèse ~431 KB
  - Convertir en WebP ou générer dynamiquement avec `@vercel/og`

- [ ] **PERF-005 — Optimisations `next.config.ts`** `LOW`
  - Ajouter : `compress: true`
  - Envisager : `experimental.optimizePackageImports` pour `openai`
  - _(Les configs `poweredByHeader` et `reactStrictMode` ont été déplacés vers SEC-002)_

### 📊 Observabilité — Maturité 2/10 (CRITIQUE)

- [ ] **OBS-001 — Aucun monitoring ni alerting** `MEDIUM`
  - Tous les logs sont `console.log/warn/error` — bruyant en production, non structuré
  - Intégrer **Sentry** (`@sentry/nextjs`) — setup ~30 min, alerting 500 immédiat
  - Ou Logtail / Vercel Logs pour structured logging JSON

- [ ] **OBS-002 — Pas de health check endpoint** `LOW`
  - Créer `GET /api/health` retournant `{ status: 'ok', timestamp }` pour monitoring externe

### 🔄 CI/CD — Maturité 0/10 (CRITIQUE)

- [ ] **CICD-001 — Aucun pipeline CI** `MEDIUM`
  - Pas de `.github/workflows/` configuré
  - Créer un workflow CI minimal : `type-check` + `lint` + `test` (dès que TEST-001 est fait) + `build`
  - Déploiement via Vercel Git intégration (déjà en place), mais sans vérifications pré-merge

### 🎨 UI / UX

- [ ] **UX-002 — Dark mode natif** `LOW`
  - Configurer Tailwind pour `prefers-color-scheme: dark`
  - Définir les variables CSS dark dans `globals.css`
  - Tester les contrastes WCAG AA en mode sombre

### 🔍 SEO

- [ ] **SEO-001 — Contenu statique indexable enrichi** `LOW`
  - Les moteurs de recherche ne peuvent pas indexer les réponses dynamiques de Nicky
  - Ajouter des mots-clés pertinents dans Hero/ExperienceGrid (ex : "Product Designer", "Paris", "IA")
  - Ou ajouter une section "À propos" statique pour les crawlers

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
- [x] **FEAT-CAG-004** — outillage de validation CAG/cache + limites de taille (`scripts/*.mjs`, `docs/cag-limits.md`)
- [x] **FEAT-CAG-005** — documentation README du mode opératoire CAG/RAG, mise à jour CV, prompt caching

### Sécurité & qualité
- [x] **Validation des entrées** — `lib/validation.ts`, protection injection (`7cfacc9`)
- [x] **Supabase server-only** — clé service role inaccessible côté client (`7cfacc9`)
- [x] **CVE Next.js / React** — dépendances mises à jour (`288411f`)

### Accessibilité & SEO
- [x] **Accessibilité WCAG AA** — `aria-label`, ratios de contraste (`e2f3769`)
- [x] **SEO** — métadonnées, sitemap, robots.txt, JSON-LD structuré (`3c70e17`)
- [x] **Open Graph** — image OG générée (`cb296e2`)

### UI / UX
- [x] **UX-001** — Mobile — feedback visuel du chat, scroll après envoi, état de chargement