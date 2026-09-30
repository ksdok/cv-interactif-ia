# PRIV-001 — Retrait du numéro de téléphone du CV (0602188740)

> **Statut : PROPOSÉE — pending validation utilisateur (2026-09-30)**
>
> **Ticket proposé** : PRIV-001 · **Date** : 2026-09-30 · **Backlog** : Vie privée / données personnelles · **Base de code** : `main` @ `209d2f6`
> Taille S · Priorité : 🟠 Haute (donnée personnelle exposée en prod) · Source : décision opérateur (2026-09-30, cadrage arbitré)
> **Trace de revue — cycle 1 (2026-09-30, spec-reviewer, contexte frais) : verdict « AMENDEMENTS PROPOSÉS »** — 2 majeurs (F1 : la claim d'exhaustivité de §2 était fausse, le numéro résidait aussi dans `project-state.md` et la présente spec ; F2 mesure erronée 67→49/−18), 2 mineurs (F3 : `lib/rag.ts:48` → `:50`, bornes de la section Contact), 1 suggestion (F5 : nom de table non résolvable) — **tous appliqués** (voir §2, §3, §4, §5, §6-§9).
> **Trace de revue — cycle 2 (2026-09-30, spec-reviewer, contexte frais) : verdict « VALIDÉE »** — 0 bloquant / 0 majeur ; 1 mineur (citation contextuelle `CONTEXT.md` §5/§9 dans Sources) **appliquée** ; point de non-vérifiabilité assumé : les SHA git (`main @ 209d2f6`, `458206b`) non contrôlés par le reviewer read-only (aucun outil VCS), références conservées. Statut de la spec : reste **PROPOSÉE — pending validation utilisateur** (la revue ne vaut pas validation d'implémentation).
> Arbitrages opérateur posés au cadrage : (1) la ligne Contact conserve **email + site**, seul le téléphone disparaît ; (2) la purge du corpus Supabase (RAG) est **in-scope** (action opérateur) ; (3) le numéro restant dans l'**historique git** est **accepté** (pas de rewrite) ; (4) préfixe de ticket `PRIV-001` (nouvelle série « vie privée », distincte de SEC — ce n'est pas une CVE mais une donnée personnelles exposée par choix éditorial).

---

## 1. Problème

Le numéro de téléphone mobile de l'opérateur (`06 02 18 87 40`, écrit aussi
`0602188740`) est exposé :
- en **clair** sur la source unique du CV, donc servi par le CAG du chat
  (`data/cv.md`, ligne 4) — il apparaît dans **public/llms-full.txt** (fichier
  committé, servi en statique, consommé par les agents IA — GEO-06) ;
- **probablement dans le corpus Supabase** (RAG, embeddings
  `text-embedding-3-small` consommés par `/api/job-match`, `lib/rag.ts`).

L'opérateur veut ce numéro retiré du CV et du contexte CAG. Les pages CV
(`/fr/cv`, `/en/cv`) n'exposent **déjà pas** le numéro (section Contact = email
+ site uniquement) : aucun rendu ne change, seul le contenu source et son
dérivé généré sont touchés.

## 2. Analyse (vérifiée dans le code)

- **Surfaces de contenu servi — deux occurrences** (grep `06 02 18 87 40` /
  `0602188740`) :
  1. `data/cv.md:4` — `Contact: 06 02 18 87 40 | dokkimsan@gmail.com | kimsandok.com` (source unique du CV)
  2. `public/llms-full.txt:10` — la même ligne, **générée au prebuild** depuis
     `data/cv.md` par `scripts/generate-llms-full.mjs` (hook `prebuild`
     `package.json:10`, GEO-06). La spec GEO-06 interdit l'édition à la main de
     ce fichier : il est régénéré par `node scripts/generate-llms-full.mjs`.
- **Artefacts d'ingénierie — traces résiduelles assumées** : `project-state.md`
  portait le numéro dans le titre de son entrée PRIV-001 (posée à la phase de
  cadrage) — **corrigé lors de cette revue** (titre sans chiffres) ; la présente
  spec conserve les motifs du numéro car les critères d'acceptation en
  dépendent (self-référence nécessaire, **acceptée au titre de la décision 3**,
  même statut que l'historique git). Toute autre surface est à zéro occurrence
  au moment de l'écriture.
- **Aucune autre surface** :
  - `content/cv-fr.tsx:218-234` et `content/cv-en.tsx` — sections Contact des
    pages CV : email (`mailto:`) + site uniquement, **sans numéro** ;
  - `public/llms.txt` — résumé éditorial maintenu à la main (GEO-06), **sans
    numéro** ;
  - dictionnaires i18n (`lib/i18n/fr.ts`/`en.ts`) — sans numéro.
- **CAG** : `lib/cvContext.ts:11-39` lit `data/cv.md` une fois à la première
  requête puis **garde le contenu en mémoire** (`cachedCV`) — une édition du
  fichier n'est effective qu'après **redémarrage du serveur** (piége connu,
  `CONTEXT.md` §5). Consommé par `/api/chat` (`app/api/chat/route.ts:69`).
- **RAG** : `/api/job-match` appelle `searchDocuments(trimmedJob, 10)`
  (`app/api/job-match/route.ts:174`) → RPC Supabase `match_documents`
  (`lib/rag.ts:50`, commentaire porte : 48). Il n'existe **aucun script
d'indexation versionné** dans
  le repo (`.sql`, scripts) : le corpus embeddings (chunks du CV) a été
  construit hors dépôt. Le numéro y figure donc probablement et sa purge est
  une **action opérateur SQL** (décision 2). Le repo ne peut ni la faire
  (pas de secret d'écriture de corpus versionné), ni ré-indexer : le critère
  de vérification SQL suffit.
- **Cache de prompt** : le préfixe persona + CV (CAG, fr/en partagé,
  GEO-08g, ≈ 2,6K tokens) est mis en cache côté OpenAI. L'édition de la ligne
  Contact **invalide le cache une fois** — re-warm automatique à l'usage,
  sans impact fonctionnel.
- **Historique git** : le numéro est présent dans les commits historiques
  (ex. `458206b feat(CAG): add data/cv.md`). Retiré du HEAD, il restera
  accessible via l'historique — **accepté** au cadrage (décision 3).
- **Baseline tests** : 108/108 (7 fichiers) — aucun test ne référence le
  numéro ni la ligne Contact (vérifié par grep `lib/__tests__/`,
  `scripts/*.mjs` : les banchs/smokes lisent `data/cv.md` dynamiquement,
  aucun n'assert sur le contact).

## 3. Décisions (arbitrées avec l'opérateur, 2026-09-30)

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | **Ligne Contact conservée, téléphone retiré** : `data/cv.md:4` devient `Contact: dokkimsan@gmail.com | kimsandok.com` | Le recruteur garde des canaux de contact (email + site) ; aligne le CV sur les pages `/cv` qui présentent déjà l'information ainsi (§2) |
| 2 | **Purge du corpus Supabase in-scope, sous forme d'action opérateur documentée** : DELETE/UPDATE ciblé du ou des chunks contenant le numéro + vérification SQL (critère 6). Aucun changement de code RAG (`lib/rag.ts`, `lib/supabase.ts` intacts) | Le corpus n'est pas versionné dans le repo (§2) ; c'est une opération de données, exécutable uniquement par l'opérateur avec ses accès Supabase |
| 3 | **Historique git non réécrit** ; la présente spec conserve les motifs du numéro comme **self-référence acceptée** (les critères de vérification en dépendent) | Pas de `filter-repo` ni force-push : réécrire les SHA de tout l'historique risquerait un redéploiement/rollback Vercel désordonnés pour un gain limité (le site déployé n'expose plus le numéro) ; réversible plus tard si la posture évolue. Les motifs cités dans la spec servent les grep des critères — les retirer rendrait la spécification non vérifiable ; statut identique à l'historique git |
| 4 | **`public/llms-full.txt` régénéré par le script officiel** (`node scripts/generate-llms-full.mjs` et/ou `npm run build`), jamais édité à la main | Convention GEO-06 : le contenu dérivé ne peut pas diverger de la source |
| 5 | **Toute trace du numéro est bannie des artefacts d'ingénierie autres que la présente spec** (l'entrée `project-state.md` PRIV-001 ne porte plus le numéro, corrigé à la revue cycle 1) | Les documents de contexte ne servent pas de contenu ; il n'y a aucune raison d'y dupliquer une PII que ce ticket retire |
| 6 | **Aucun durcissement code/CI-annexe dans ce ticket** (garde anti-régression type canari grep = question ouverte Q1) | Taille S : un seul objectif, retrait de la donnée ; la prévention est un ticket séparé si arbitrée |

## 4. Scope

**In scope**
- `data/cv.md` : ligne 4 → `Contact: dokkimsan@gmail.com | kimsandok.com`
- `public/llms-full.txt` : régénéré par `node scripts/generate-llms-full.mjs` (diff = la ligne Contact)
- `project-state.md` : l'entrée PRIV-001 est tenue **sans le numéro** (déjà corrigé à la revue cycle 1 ; maintien du critère lors de la mise à jour de clôture)
- Action opérateur (hors code, documentée ici) : purge du numéro dans le corpus Supabase (§3, décision 2)

**Out of scope**
- Toute modification du rendu des pages `/cv` / home / chat (rien à changer, §2)
- `lib/cvContext.ts`, `lib/rag.ts`, `lib/supabase.ts`, `proxy.ts`, CSP — intacts
- Purge de l'historique git (décision 3) et de la self-référence de la présente spec (idem — les critères de vérification dépendent des motifs, décision 3)
- Email, adresse, autres données personnelles de `data/cv.md`
- Garde CI anti-données-personnelles (Q1) et script d'indexation RAG versionné (Q2)
- `/public/llms.txt` (maintenu à la main, sans numéro — non-goal)
- Les benchmarks/smokes existants (`scripts/bench-models.mjs`, `smoke-*.mjs`) qui lisent `data/cv.md` dynamiquement (aucun assert sur le contact)

## 5. Critères d'acceptation (numérotés, vérifiables)

1. **Surfaces de contenu servi** : `grep -rn '06 02 18 87 40\|0602188740' data/ public/ lib/ app/ components/ content/ scripts/` retourne **0** occurrence.
2. **Artefacts d'ingénierie** : `project-state.md` ne contient plus **aucune** occurrence des motifs ; sur l'arbre suivi complet, la seule surface restante autorisée est la présente spec (self-référence, décision 3) — i.e. `grep -rln` ne retourne que `docs/backlog/PRIV-001-remove-phone-from-cv-spec.md` en plus des fichiers de contenu zéro.
3. `data/cv.md:4` vaut exactement `Contact: dokkimsan@gmail.com | kimsandok.com` (email et site conservés, format `Contact: … | …` inchangé).
4. `public/llms-full.txt` est régénéré (aucune édition manuelle) : la ligne Contact y est la nouvelle, sans numéro ; le reste du fichier est inchangé.
5. Après redémarrage d'un serveur local (`npm run build && next start` ou `npm run dev`), POST `/api/chat` (CAG) sur une question type « Comment te contacter ? » produit une réponse **sans numéro de téléphone** (email possible) — vérification humaine, comme les gates du projet.
6. Action opérateur Supabase : `select count(*) from <table du RPC match_documents — nom exact fourni par l'opérateur lors de la purge et consigné dans la trace de clôture, il n'est pas résolvable depuis le repo> where content ilike '%06 02 18 87 40%'` retourne **0** après purge (les chunks concernés sont re-purés ou mis à jour avec la version nettoyée). Sans cette vérification le ticket ne se coche pas entièrement (trace « livraison partielle », pattern BUG-010).
7. `npm run lint`, `npm run type-check`, `npm test` (baseline 108/108 / 7 fichiers, aucune régression) et `npm run build` (secret-free) passent.

## 6. Verification (manuelles)

1. Éditer la ligne 4 de `data/cv.md` selon le critère 3.
2. `node scripts/generate-llms-full.mjs` puis `git diff public/llms-full.txt` (diff minimal = ligne Contact).
3. Exécuter les commandes de vérification §5 (grep, lint, type-check, test, build).
4. Vérification runtime locale du chat CAG (critère 5) après un **redémarrage** du serveur (cache mémoire `lib/cvContext.ts`).
5. Purge + vérification SQL Supabase opérateur (critère 6) — nom de table exact fourni et consigné par l'opérateur dans la trace de clôture.
6. Clôture : cochage de PRIV-001 dans `project-state.md` en **remaintenant l'entrée sans numéro** (décision 5).
7. Commit `feat(PRIV-001):` en français, corps expliquant le pourquoi (retrait d'une donnée personnelle).

## 7. Non-goals

- Réécriture de l'historique git et push forcé (décision 3) ; retrait de la self-référence de la présente spec (décision 3)
- Modification des pages CV `content/cv-*.tsx` (déjà sans numéro)
- Tout durcissement de garde (CI, ESLint, scan de PII) — cf. question ouverte Q1
- Migration d'un script d'indexation RAG dans le repo — cf. question ouverte Q2
- Retrait d'autres données personnelles (email, site, ville…)

## 8. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Purge SQL Supabase trop large (DELETE sans filtre approprié) | Perte de chunks légitimes du corpus RAG | WHERE ciblé `content ilike '%06 02 18 87 40%'` (ou l'écriture exacte des chunks), vérification du COUNT avant/après suppression, pas de suppression du chunk entier si l'UPDATE suffit |
| Régénération `llms-full.txt` oubliée dans le déploiement (le fichier est committé) | Numéro encore servi en statique | Le hook `prebuild` de `npm run build` le régénère à chaque déploiement Vercel ; critères 1 et 4 verrouillent |
| Redémarrage non effectué en dev | Le chat continue de répondre avec l'ancien numéro (cache mémoire) | Critère 5 exige explicitement le redémarrage ; piège déjà documenté (`CONTEXT.md` §5) |
| Recruteurs entrés à partir d'un cache/recherche (Google, agents IA) | Le numéro peut subsister hors site quelques temps | Hors code — même remarque que pour l'historique git (accepté, décision 3) |

## 9. Mesures et limites de conception

- Changement de contenu maîtrisé : la ligne Contact passe de **61 à 44
  caractères (−17)** — impact négligeable sur les ≈ 2,4K tokens du CV ; le
  `stablePrefix` mesuré par `scripts/measure-cv-tokens.mjs` dévierait d'autant
  (re-mesure non requise, aucune règle d'alerte ne porte sur ce delta).
- **Cache prompt OpenAI** : préfixe persona + CV invalidé une fois par ce
  changement (premiers appels post-déploiement hors cache, re-warm
  automatique) — limite temporaire, sans action.
- **Limite de la purge RAG** : elle repose sur une vérification SQL
  (critère 6) exécutée par l'opérateur ; le repo n'a ni accès d'écriture au
  corpus ni moyen de la prouver depuis le code, et le nom de table n'est pas
  résolvable depuis le repo. La spec exige le dénombrement `= 0` comme
  clôture, pas une promesse.
- **Limite d'accessibilité** : le numéro reste dans l'historique git et dans
  la self-référence de la présente spec (tous deux acceptés, décision 3).
## 10. Questions ouvertes — à trancher avant validation

1. **Q1 — Garde anti-régression (données personnelles)** : faut-il un canari CI simple (grep de patterns type téléphone dans les fichiers suivis) dans ce ticket, ou un ticket séparé (proposition : `PRIV-002`) ? Hypothèse : hors périmètre ici (décision 6).
2. **Q2 — Indexation RAG** : aucun script d'indexation versionné n'existe dans le repo ; faut-il en créer un réutilisable (re-seed du corpus depuis `data/cv.md`) pour fiabiliser ce genre d'opération, ou s'en tenir à des actions opérateur SQL ponctuelles ? Hypothèse : ticket séparé, hors périmètre ici.

## Sources

- `data/cv.md:4` — occurrence 1 du numéro (source unique du CV)
- `public/llms-full.txt:10` — occurrence 2 ; `scripts/generate-llms-full.mjs:1-38` et `package.json:10` (hook `prebuild` — GEO-06)
- `lib/cvContext.ts:11-39` — cache mémoire du CV (redémarrage requis)
- `app/api/chat/route.ts:69` — consommation CAG du CV
- `app/api/job-match/route.ts:172-174`, `lib/rag.ts:50` (RPC `match_documents`, commentaire : 48) — RAG (job-match)
- `content/cv-fr.tsx:218-234`, `content/cv-en.tsx` — pages CV sans numéro (preuve §2)
- `public/llms.txt:1-13` — fichier maintenu à la main, sans numéro (GEO-06)
- `README.md:118,237-246,321-328` — documentation RAG/CAG
- `CONTEXT.md` §5 (architecture : cache CV en mémoire, redémarrage requis), §9 (pièges : `public/llms-full.txt` généré au build)
- `project-state.md` — baseline tests 108/108 (7 fichiers) ; entrée PRIV-001 tenue sans numéro (décision 5)
- Vérifications git : `git log --follow data/cv.md` (`458206b` initial) ; grep arbre suivi = 2 occurrences de contenu (§2) + traces d'ingénierie traitées (§2, décision 3/5)
- Gabarit section ordre : `docs/backlog/RATE-001-rate-limit-ceiling-spec.md` (§6-§10 + Sources)
