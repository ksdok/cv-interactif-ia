# RATE-001 — Baisse du plafond du rate limit : 200 → 50 requêtes/jour/IP

> **Statut : VALIDÉE** — opérateur 2026-09-28 (livrée et close ; critère §6.4 smoke prod atteint)
>
> **Livraison** : branche `rate-001-rate-limit-ceiling` (commits `fafa5a7` `feat(rate-001)` : implémentation + tests + README, puis `3c2ac7b` `fix(review)` : messages i18n sans chiffre — arbitrage opérateur ; créée depuis `main` @ `ff6a9fd`), **fusionnée sur `main` et poussée sur `origin/main`** (merge commit `cd77031`, 2026-09-28, déploiement Vercel effectif), branche locale conservée. 7 fichiers (+90/−29) — `lib/rateLimit.ts` (+24/−4 : `maxRequestsPerDay: 200 → 50`, export `RATE_LIMIT_MESSAGE` dérivé de `RATE_LIMIT_CONFIG`, décision 2 ; commentaires d'en-tête à 50, trace de décision conservée en commentaire, arbitrée non-finding), `app/api/chat/route.ts` (+3/−3) + `app/api/job-match/route.ts` (+5/−5) (corps 429 branchés sur `RATE_LIMIT_MESSAGE`, wording « requests » unifié — abandon « analyses » —, contrat 429 §6.5 intact : forme du corps, `Retry-After`, `X-RateLimit-*`), `README.md` (+5/−5 : les 5 mentions → 50), `lib/__tests__/rateLimit.test.ts` (+52/−9 : 2 assertions SEC-007 verrouillant 200 réalignées en canari `.toBe(50)` documenté + anti-dérive dérivationnelle, + 3 nouveaux cas RATE-001 — 51ᵉ appel refusé, message dérivé, isolation store par clés uniques), `lib/i18n/fr.ts` / `lib/i18n/en.ts` (+6/−2 : `apiErrors.RATE_LIMIT` **sans chiffre**). Revue glm-reviewer 2 cycles → **PROPRE** (cycle 1 : 1 bloquant — défaut de la spec, pas du code : « aucun impact i18n » était faux, le message affiché au client vient du dictionnaire `apiErrors.RATE_LIMIT` qui contenait encore « 200 » → arbitrage opérateur = retirer le chiffre ; + 2 suggestions ; cycle 2 : fidélité + 0 régression). Tests mesurés : lint 0/0, type-check exit 0, `npm test` **108/108 (7 fichiers)** (105 baseline + 3 nouveaux), build secret-free exit 0 (16 pages) ; runtime local 51 POST réels sur `next start` → 429 `x-ratelimit-limit: 50` + `retry-after` + reset minuit UTC, pool partagé confirmé (épuisement chat → job-match 429 immédiat). Smoke prod post-merge (2026-09-28) : GET `/fr` 200 (cookie CSRF), POST `/api/chat` **200** streaming NDJSON (`x-ratelimit-limit: 50`, remaining 49), POST `/api/job-match` **200** analyse complète (même pool, limit 50), 0 × 429 sous le plafond — **critère §6.4 ✅**. Suggestion reportée NON appliquée (test « message dérivé » tautologique — reconstruit la template au lieu de verrouiller les routes ; import des routes dans Vitest = pattern nouveau + effets de bord → report TEST-001 P2). Validée opérateur le 2026-09-28. Trace de livraison dans `project-state.md`.
>
> **Amendements a posteriori (corps conservé) — arbitrages opérateur 2026-09-28** : (1) les 2 lignes `apiErrors.RATE_LIMIT` (`lib/i18n/fr.ts` / `lib/i18n/en.ts`) sont entrées **in-scope** (chiffre retiré : « Limite de requêtes atteinte. Réessayez demain. » / « Rate limit exceeded. Please try again tomorrow. ») — le §2 « aucun impact i18n » était faux, la dérivation serveur ne pouvait corriger un dictionnaire client incapable de lire `RATE_LIMIT_CONFIG` server-only ; (2) critère **§5.5 périmé** — sa borne « ≥ 87/87 » datait d'avant SEC-007 : la baseline réelle avant RATE-001 était **105** (7 fichiers), portée à **108** après livraison.
>
> **Ticket proposé** : RATE-001 · **Date** : 2026-09-27 · **Backlog** : Coûts API / anti-abus · **Base de code** : `main` @ `fbfa4ca`
> Taille S · Priorité : 🟡 Moyenne · Source : décision opérateur (2026-09-27)

---

## 1. Problème

`lib/rateLimit.ts` plafonne le pool partagé `/api/chat` + `/api/job-match` à
**200 requêtes/jour/IP** (`RATE_LIMIT_CONFIG.maxRequestsPerDay`, ligne 42).
Ce plafond est jugé trop élevé par l'opérateur au regard des trois motivations
tranchées au cadrage : **coût API** (GPT-6 Luna), **anti-abus/spam**, et
**usage légitime rarement > 50** (un recruteur pose quelques questions, il ne
remplit pas 200 messages). Objectif : abaisser le plafond à **50 requêtes/jour/IP**,
pool partagé inchangé.

## 2. Analyse (vérifiée dans le code)

- **Un seul point de config** : `lib/rateLimit.ts:42` (`maxRequestsPerDay: 200`,
  `as const`). Les headers `X-RateLimit-Limit` (`getRateLimitHeaders`,
  `lib/rateLimit.ts:159`) et la logique de refus lisent déjà cette constante —
  le plafond lui-même est donc un changement d'une ligne.
- **Pool partagé** : `/api/chat` et `/api/job-match` appellent tous deux
  `checkRateLimit(ip)` sur la même map en mémoire → le budget de 50/j/IP est
  **cumulé** sur les deux endpoints. Arbitré ainsi au cadrage (changement minimal).
- **Le chiffre 200 est dupliqué en dur dans les messages d'erreur** :
  - `lib/rateLimit.ts:153` — message de `checkRateLimit()` (`…200 requests per day maximum.`)
  - `app/api/chat/route.ts:87` — corps 429 (`…200 requests per day maximum`)
  - `app/api/job-match/route.ts:93` — corps 429 (`…200 analyses per day maximum`,
    wording différent : « analyses »)
  Risque de décalage connu : si seul `maxRequestsPerDay` change, les messages
  mentent (429 affichant « 200 » alors que le plafond est 50).
- **Commentaires périmés** : `lib/rateLimit.ts:5` et `:10`,
  `app/api/chat/route.ts:76`, `app/api/job-match/route.ts:11` et `:83`.
- **Doc README** : 5 mentions « 200 req/day/IP » ou du message 429
  (`README.md:22`, `:237`, `:361`, `:398`, `:408`).
- **Contrat 429 préservé** (convention §6.5 de `CONTEXT.md`) : `Retry-After`,
  `X-RateLimit-Limit/Remaining/Reset`, corps `{ error, errorCode: 'RATE_LIMIT' }`
  — seule la valeur du plafond change, la forme reste identique. Côté client, le
  message affiché est le message **localisé** du dictionnaire (`errorCode` →
  `dictionary.apiErrors`), pas le texte serveur : aucun impact i18n.
- **Aucun test** ne référence `maxRequestsPerDay` ni la valeur 200 (vérifié par
  grep sur `lib/__tests__/`).

## 3. Décisions (arbitrées avec l'opérateur le 2026-09-27)

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | **Plafond = 50/j/IP, pool partagé inchangé** (un seul `maxRequestsPerDay`) | Changement minimal ; cohérent avec l'architecture actuelle ; chat + job-match cumulent leurs appels dans le même budget |
| 2 | **Message 429 dérivé dynamiquement** de la config : `lib/rateLimit.ts` exporte `RATE_LIMIT_MESSAGE` = `Rate limit exceeded: ${RATE_LIMIT_CONFIG.maxRequestsPerDay} requests per day maximum` ; les 2 routes l'utilisent | Le décalage chiffre/message ne peut plus se reproduire ; wording unifié (« requests », abandon du « analyses » de job-match — texte serveur non affiché au client) |
| 3 | **Contrat 429 intact** : même forme de corps, mêmes headers, même `errorCode` | Convention non négociable §6.5 (`CONTEXT.md`) |
| 4 | **Doc mise à jour** : les 5 mentions README passent à 50 ; le rapport d'audit (`docs/security/SECURITY_AUDIT_2026-09-27.md`) n'est **pas** retouché (capture d'un instant) | README = source de vérité opératoire ; l'audit est un document historique |
| 5 | **Pas de valeur intermédiaire ni de burst limit** : un seul plafond journalier, comme aujourd'hui | Hors périmètre ; la granularité horaire est un autre ticket si besoin |

## 4. Scope

**In scope**
- `lib/rateLimit.ts` : `maxRequestsPerDay: 200` → `50` ; message dérivé exporté ; commentaires d'en-tête (lignes 5, 10) corrigés
- `app/api/chat/route.ts` : commentaire (ligne 76) + corps 429 branché sur la constante exportée
- `app/api/job-match/route.ts` : commentaires (lignes 11, 83) + corps 429 branché sur la constante exportée
- `README.md` : 5 mentions mises à jour (22, 237, 361, 398, 408)
- Test unitaire minimal `lib/__tests__/rateLimit.test.ts` : 51ᵉ appel d'une même IP dans la même journée refusé + message contenant la valeur de la config (garde anti-dérive, cf. question ouverte Q1)

**Out of scope**
- Toute migration de stockage (SEC-003, conditionnée à un déclencheur)
- Toute modification de `getClientIP()` (SEC-007, PROPOSÉE)
- Plafonds séparés chat/job-match, burst rate, authentification, captcha
- Wording des messages localisés côté client (inchangés)

## 5. Critères d'acceptation (numérotés, vérifiables)

1. `RATE_LIMIT_CONFIG.maxRequestsPerDay` vaut `50` ; `grep -rn '200' lib/rateLimit.ts app/api/chat/route.ts app/api/job-match/route.ts` ne retourne plus aucune mention du plafond (les `status: 200` HTTP restent, eux, légitimes).
2. Aucun chiffre de plafond en dur dans les messages d'erreur : les 3 sites (rateLimit.ts, chat, job-match) dérivent de `RATE_LIMIT_CONFIG.maxRequestsPerDay`.
3. En local (`next dev` ou `next start`) : `curl -i` sur un POST valide montre `X-RateLimit-Limit: 50` sur les deux endpoints.
4. Un test Vitest vérifie : après 51 appels `checkRateLimit('ip-test')` dans la même journée, le 51ᵉ renvoie `allowed: false` avec un `message` contenant `String(RATE_LIMIT_CONFIG.maxRequestsPerDay)`.
5. `npm run lint`, `npm run type-check`, `npm run test` (≥ 87/87 + nouveau test), `npm run build` verts.
6. README : `grep -n '200 req\|200 requests\|200/day\|200 analyses' README.md` → 0 occurrence ; 5 mentions à 50.

## 6. Verification (manuelles)

1. `npm run dev` → POST `/api/chat` et POST `/api/job-match` valides : headers `X-RateLimit-Limit: 50`, `X-RateLimit-Remaining` décrémenté.
2. Forcer un 429 (51ᵉ appel via le test unitaire §5.4, ou boucle locale) : corps `{"error":"Rate limit exceeded: 50 requests per day maximum","errorCode":"RATE_LIMIT"}`, `Retry-After` présent.
3. Client chat en FR/EN : le message d'erreur affiché reste le message **localisé** du dictionnaire (aucune régression d'affichage).
4. Smoke prod après déploiement : 1 POST par endpoint, headers à 50, page d'accueil 200.

## 7. Non-goals

- Corriger le spoofing d'IP ou la fiabilité du plafond multi-instance (SEC-007, SEC-003).
- Toute modification du pipeline CSRF/validation en amont du rate limit.
- Toute modification du contrat d'API (§6.5 de `CONTEXT.md`).

## 8. Risques

| Risque | Mitigation |
|--------|------------|
| Recruteur légitime dépassant 50/j (chat + job-match cumulés) | Accepté : motivation 3 du cadrage (usage réel ≪ 50) ; le 429 reste clair et le reset est quotidien (minuit UTC) |
| Perception « limite cassée » si les messages serveur mentaient encore | Décision 2 élimine la cause racine (dérivation dynamique) |
| Régression du contrat 429 | Critères 3/6 + convention §6.5 ; aucun changement de forme |

## 9. Mesures et limites de conception

- **Coût théorique au plafond** : 50 × $0,0000593/appel ≈ **$0,003/jour/IP** (coût/appel mesuré au banc MODEL-004, `project-state.md` → « Terminé ✅ → MODEL-004 »). C'est une borne arithmétique sur une mesure interne, **pas un plafond de facture garanti** : en in-memory multi-instance (SEC-003), la limite effective reste ≈ 50 × N instances et les compteurs sont réinitialisés à chaque déploiement.
- La mesure `$0,0000593/appel` date du 2026-09-25 ; ne pas la re-citer après un changement de modèle sans re-mesurer (`scripts/bench-models.mjs`).

## 10. Questions ouvertes — à trancher avant validation

1. **Test unitaire rateLimit** : inclure le test minimal décrit §4/§5.4 (recommandé — première couverture de `lib/rateLimit.ts`, listée P1 dans TEST-001) ou le reporter à un ticket de couverture dédié ?
2. **Wording unifié « requests »** dans le 429 de job-match (aujourd'hui « analyses ») : appliqué avec la décision 2, ou conserver « analyses » (dérivé dynamiquement quand même) ?
3. **Commit** : un commit unique `feat(rate-001): baisse du plafond du rate limit à 50/j/IP` (code + README + spec cochée), conforme à l'usage « un ticket = un commit cohérent » de `CONTEXT.md` §7 ?

## Sources

- `lib/rateLimit.ts` (lignes 5, 10, 42, 153, 159) — plafond, message, headers
- `app/api/chat/route.ts` (lignes 76, 87) — commentaire et corps 429 chat
- `app/api/job-match/route.ts` (lignes 11, 83, 93) — commentaires et corps 429 job-match
- `README.md` (lignes 22, 237, 361, 398, 408) — mentions documentaires du plafond
- `CONTEXT.md` §6.5 (contrats d'API), §9 (pièges) — conventions
- `project-state.md` — « Terminé ✅ → MODEL-004 » (coût/appel mesuré $0,0000593)
- `docs/backlog/SEC-007-client-ip-rate-limit-spec.md:79` — exclusion explicite de « modification du plafond 200/j » (justifie un ticket distinct)
- Cadrage opérateur 2026-09-27 (pool partagé, motivations, message dérivé, ticket RATE-001)