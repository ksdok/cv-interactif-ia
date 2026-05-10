# État du projet — cv-interactif-ia

> Source de vérité pour le suivi des tâches et de la backlog.
> Dernière mise à jour : 2026-05-10 — UX-001 validé, BUG-003 corrigé, Audit PI-Expert bis intégré

---

## Statut général

**Production** : [kimsandok.com](https://kimsandok.com)
**Stack** : Next.js 16 · TypeScript · Tailwind 4 · Supabase · Vercel
**Provider actif** : Gemini 2.5 Flash (fallback : OpenAI → Anthropic)

---

## En cours

---

## Backlog

### 🐛 Bugs — Audit 2026-05-10

- [ ] **BUG-001 — `rag.ts` : graceful degradation manquante** `MEDIUM`
  - `searchDocuments()` ligne 64 : `throw error` → propage une exception 500 si Supabase échoue
  - Correction : `return []` pour que le LLM réponde sans contexte RAG plutôt que de planter

- [ ] **BUG-002 — Message d'erreur 500 obsolète dans `/api/chat`** `MEDIUM`
  - Ligne 165 : `'Failed to communicate with Claude'` alors que le provider actif est Gemini
  - Correction : `'Failed to generate response. Please try again.'`
  - Nettoyer aussi le commentaire-bloc lignes 171-182 qui décrit l'ancien flux Anthropic

- [ ] **BUG-004 — Interface `ChatMessage` dupliquée** `LOW`
  - Définie deux fois : `lib/validation.ts` (locale) et `lib/modelProviders.ts` (exportée)
  - Correction : extraire dans `lib/types.ts` et importer depuis les deux fichiers

- [ ] **BUG-005 — Messages d'erreur CSRF incohérents** `LOW`
  - `/api/chat` retourne `'CSRF token validation failed'`, `/api/job-match` retourne `'Invalid request'`
  - Correction : uniformiser sur `'CSRF token validation failed'` dans les deux routes

- [ ] **BUG-006 — Commentaire inexact dans `layout.tsx`** `LOW`
  - Ligne 93 : dit "data attribute" alors que le token est dans l'attribut `content` d'une balise `<meta>`
  - Correction : décrire correctement le pattern double-submit cookie

- [ ] **BUG-007 — Paramètre `filter` non standard dans `match_documents`** `MEDIUM`
  - `lib/rag.ts` ligne 45 : passe `filter: {}` à la RPC Supabase — paramètre potentiellement non défini dans la fonction SQL
  - Context7 indique que la signature standard est `match_documents(query_embedding, match_threshold, match_count)` sans `filter`
  - À vérifier contre la définition réelle de `match_documents` dans Supabase
  - Si `filter` n'existe pas dans la DB : l'appel peut échouer silencieusement ou produire des résultats imprévisibles

### 🔒 Sécurité

- [ ] **SEC-001 — Content Security Policy (CSP)** `MEDIUM`
  - Ajouter une CSP stricte dans `next.config.ts` (headers) ou `middleware.ts`
  - Restricter les sources de scripts, styles, et images
  - Tester avec l'outil CSP Evaluator avant de merger

- [ ] **SEC-002 — Headers de sécurité standards** `LOW`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - À ajouter dans `next.config.ts` via `headers()`

- [ ] **SEC-003 — Rate limiting persistant** `LOW`
  - L'implémentation actuelle (`lib/rateLimit.ts`) est en mémoire — réinitialisée à chaque déploiement
  - Migration vers Vercel KV ou Upstash Redis si trafic augmente

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

- [x] **BUG-003 — Query RAG vide dans `/api/job-match`**
  - Corrigé dans `app/api/job-match/route.ts` en remplaçant `searchDocuments('', 30)` par `searchDocuments(trimmedJob, 10)`
  - Validé manuellement en local sur une vraie offre d'emploi
- [x] **UX-001 — Mobile — feedback visuel du chat**
  - Validé fonctionnellement sur le comportement actuel
  - Objectif atteint : scroll après envoi correct, état de chargement visible, pas de conflit clavier iOS bloquant
- [x] **Accessibilité WCAG AA** — `aria-label` sur boutons, ratios de contraste (`e2f3769`)
- [x] **SEO** — métadonnées, sitemap, robots.txt, JSON-LD structuré (`3c70e17`)
- [x] **Open Graph** — image OG générée (`cb296e2`)
- [x] **Validation des entrées** — `lib/validation.ts`, protection injection (`7cfacc9`)
- [x] **Supabase server-only** — clé service role inaccessible côté client (`7cfacc9`)
- [x] **CVE Next.js / React** — dépendances mises à jour (`288411f`)
- [x] **RAG** — retrieval limité à `topK=10` pour pertinence (`2ae3389`)
- [x] **Multi-provider AI** — fallback chain Gemini → OpenAI → Anthropic
- [x] **CSRF** — token httpOnly vérifié sur chaque requête POST
- [x] **Job Matcher** — analyse CV vs offre d'emploi avec scoring
- [x] **Design éditorial** — refonte "High-End Editorial Minimalism" (`348d9a2`)
