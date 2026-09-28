# BUG-010 — `/api/job-match` 500 « No CV data found » en production (RAG muet)

> **Statut : VALIDÉE** — livrée le 2026-09-28 (trace : project-state.md)
>
> **Ticket proposé** : BUG-010 · **Date** : 2026-09-28 · **Backlog** : Bugs / observabilité · **Base de code** : `main` @ `29f91c8`
> Taille S · Source : smoke prod SEC-006 (2026-09-28) · Priorité : 🟠 Haute (fonctionnalité publique cassée en prod)

---

## 1. Problème

En production, un POST valide sur `/api/job-match` (pipeline rate limit + CSRF OK)
répond **HTTP 500** `{"error":"No CV data found. Please try again later."}`
de façon **persistante** (3 essais le 2026-09-28, cf. smoke SEC-006). La même
requête en local sur le code courant répond **200 avec une analyse complète** —
le chemin de code est sain ; c'est l'environnement prod (RAG/Supabase) qui échoue.
Le Job Matcher, fonctionnalité publique de la home, est donc **hors service en prod**
sans message actionnable ni capture d'erreur.

## 2. Analyse (vérifiée dans le code)

- Le 500 est émis par `app/api/job-match/route.ts:179` quand `searchDocuments()`
  renvoie un tableau vide (`route.ts:176-181`).
- **La cause racine est masquée** : `lib/rag.ts:69-73` (`catch` de `searchDocuments`,
  dégradation BUG-001) retourne `[]` pour **toute** erreur — l'échec d'embedding
  OpenAI, l'erreur du RPC `match_documents` et la table vide sont **indiscernables**
  côté route. Le seul indice est un `console.error('Error in searchDocuments:', …)`
  dans les logs Vercel.
- Causes candidates (à départager par la sonde, pas à deviner) :
  1. **Env Vercel manquante/fausse** : `NEXT_PUBLIC_SUPABASE_URL` ou
     `SUPABASE_SERVICE_ROLE_KEY` absente/incorrecte → `getSupabase()`
     (`lib/supabase.ts:41-49`) lève → attrapé → `[]`. Note : une clé service role
     absente en prod lève explicitement (« required in production ») — même issue.
  2. **Erreur RPC/RLS** : `match_documents` échoue (droits, fonction absente) →
     `error` → `throw` → `[]`.
  3. **Table embeddings vide/migrée** : `data = []` **sans erreur** → `[]` direct
     (aucun log d'erreur, cas silencieux).
- **Hypothèses écartées** : clé `OPENAI_API_KEY` prod valide (le chat CAG répond en
  prod, smoke SEC-006) ; régression Next 16.3.6 (non-régression prouvée en local,
  cf. trace SEC-006 dans `project-state.md`).
- **Préexistant** : documenté dès OBS-001 (2026-09-25) comme « finding 2 reporté —
  décision produit » ; le smoke SEC-006 a révélé qu'il est **actif en prod**.
- Le code ne contient **aucune instrumentation Sentry** sur ce chemin (finding 2
  d'OBS-001 : le 500 n'est pas capturé).

## 3. Décisions (prescrites, à confirmer §10)

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | **Étape gate — diagnostic avant tout correctif** : reproduire le POST en prod et lire le log `Error in searchDocuments` (Vercel Logs) — ou, si les logs ne suffisent pas, activer temporairement la capture Sentry sur le `catch` de `searchDocuments` puis relire | La dégradation BUG-001 masque la cause ; 3 scénarios possibles avec 3 correctifs différents (§2) — le pattern « sonde avant correctif » est celui de SEC-007 |
| 2 | **Instrumenter durablement le catch** (`lib/rag.ts`) : `Sentry.captureException` (garde DSN déjà en place, pattern OBS-001) sur l'erreur d'embedding/RPC, et `captureMessage` info si `data = []` sans erreur | Ferme le finding 2 reporté d'OBS-001 ; rend toute future panne visible dans Sentry sans dépendre des logs Vercel |
| 3 | **Le 500 « No CV data found » passe en 503 avec `errorCode` dédié** (`RAG_UNAVAILABLE`) côté route, message client localisé via `dictionary.apiErrors` | 500 = « bug serveur » est faux (c'est un état dégradé récupérable) ; le code actuel ment sur la nature de l'erreur. Contrat §6.5 préservé (même forme de corps) — **cette décision est réversible si la sonde révèle autre chose** |
| 4 | **Correctif conditionné au résultat de la sonde** : scénario env → ajouter/corriger les vars Vercel (action opérateur, re-déploiement) ; scénario RPC/RLS → correctif SQL/permissions documenté ; scénario table vide → peupler/ré-exécuter l'indexation embeddings (README documente le mode opératoire RAG) | Un correctif aveugle ne résoudrait pas les 2 autres scénarios |

## 4. Scope

**In scope**
- Sonde de diagnostic prod (logs Vercel ou instrumentation temporaire)
- Instrumentation Sentry permanente du `catch` de `lib/rag.ts` + cas `[]` silencieux (ferme OBS-001 finding 2)
- 503 + `errorCode: 'RAG_UNAVAILABLE'` sur `/api/job-match` quand le RAG est vide (contrat `errorCode` agnostique préservé)
- Correctif env/data selon scénario diagnostiqué (peut être une **action opérateur Vercel**, pas du code)
- `README.md` : mise à jour du mode opératoire RAG/job-match si un scénario env/data est confirmé

**Out of scope**
- Toute refactorisation du pipeline RAG, toute migration de table
- Le CAG du chat (non impacté : `data/cv.md`, aucune dépendance Supabase)
- `CV_CONTEXT_SOURCE = 'rag'` pour le chat (config actuelle `'cag'`)

## 5. Critères d'acceptation (numérotés, vérifiables)

1. La cause racine en prod est identifiée et tracée (log ou capture Sentry) — plus de « 500 sans cause connue ».
2. `lib/rag.ts` : toute erreur attrapée est remontée à Sentry (`captureException`) ; le cas « data vide sans erreur » émet un événement info — observable sur une panne simulée en local (DSN de dev) ou prod.
3. `/api/job-match` en état dégradé répond **503** avec `{error, errorCode: 'RAG_UNAVAILABLE'}` (au lieu de 500 sans `errorCode`) — contrats 429/403/400 inchangés.
4. Le client `JobMatcher` affiche un message localisé pour le nouveau `errorCode` (dictionnaires FR/EN).
5. POST `/api/job-match` en prod répond **200** avec une analyse complète après correctif (le 500 ne réapparaît pas).
6. `npm run lint` + `type-check` + `test` (87/87 minimum) + `build` secret-free verts si du code est modifié.

## 6. Verification (manuelles)

1. Reproduire en prod le POST job-match, lire le log Vercel correspondant (ou événement Sentry) → noter la cause exacte.
2. Après correctif : POST prod 200, réponse d'analyse cohérente.
3. Vérifier l'événement Sentry sur une simulation de panne (clé fausse en local, garde DSN : événement visible uniquement si DSN fourni).

## 7. Non-goals

- Modifier `CV_CONTEXT_SOURCE` ou le comportement CAG du chat.
- Instrumenter davantage les autres routes (déjà couvert OBS-001).
- Répondre au rate limit/IP (SEC-007) ou à tout autre constat de l'audit 2026-09-27.

## 8. Risques

| Risque | Mitigation |
|--------|------------|
| Le diagnostic exige un accès Vercel/logs (action opérateur, non exécutable par un LLM) | Sonde conçue pour un seul aller-retour : le parent fournit la commande exacte, l'opérateur colle la sortie |
| Changer le code de statut 500→503 casse un consommateur hypothétique de l'API | `errorCode` ajouté sans retirer `error` ; aucun client connu n'parse le statut (le front mappe par `errorCode`) |
| `data = []` silencieux (table vide) ne produit aucun log | Décision 2 : captureMessage sur le cas vide — le cas est traçable après instrumentation |

## 9. Mesures et limites de conception

Rien de mesurable côté perf/coût — la preuve attendue est la cause racine tracée + le POST prod 200 (critères 1 et 5).

## 10. Questions ouvertes — tranchées le 2026-09-28 (validation opérateur)

1. **Code de statut dégradé** → **503 + `errorCode: 'RAG_UNAVAILABLE'`** (décision 3 confirmée) ; client localisé via `dictionary.apiErrors`.
2. **Instrumentation Sentry du catch `lib/rag.ts`** → **permanente** (garde DSN existante, pattern OBS-001) — ferme le finding 2 reporté d'OBS-001.
3. **Correctif env Vercel si en cause** → l'**opérateur** applique le correctif dans l'UI Vercel ; le parent fournit la commande exacte / la liste des vars à vérifier, l'opérateur recolle la sortie. Le coder s'occupe du code (503 + Sentry).

## Sources

- Smoke prod SEC-006 (2026-09-28) : 3× HTTP 500, corps `{"error":"No CV data found. Please try again later."}` ; non-régression prouvée (POST local 200, `next` 16.3.6)
- `app/api/job-match/route.ts:176-181` — émission du 500 sur `cvSnippets.length === 0`
- `lib/rag.ts:44-74` — `searchDocuments()` : catch-tout → `[]` (dégradation BUG-001), masque la cause
- `lib/supabase.ts:31-52` — fail-fast production `SUPABASE_SERVICE_ROLE_KEY` (SEC-005, runtime)
- `project-state.md` — OBS-001 « finding 2 reporté (500 « No CV data found » de `/api/job-match` non instrumenté — décision produit) » ; trace SEC-006 (smoke 2026-09-28, diagnostic local 200)
- `CONTEXT.md` §6.5 (contrats d'API), §5 (erreurs API `{error, errorCode}`)