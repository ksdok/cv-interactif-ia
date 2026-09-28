# SEC-010 — Durcissements API : borne `Content-Length` + encodage `mailto:`

> **Statut : PROPOSÉE** — pending validation utilisateur (2026-09-27)
>
> **Ticket proposé** : SEC-010 · **Date** : 2026-09-27 · **Backlog** : Sécurité · **Base de code** : `main` @ `fbfa4ca`
> Taille S · Source : `docs/security/SECURITY_AUDIT_2026-09-27.md` (constats #7 et #9) · Priorité : 🔵 Basse

---

## 1. Problème

Deux durcissements basse sévérité indépendants, groupés car chacun est minuscule :

1. **(#9) Corps parsé avant toute borne** : `/api/chat` (`app/api/chat/route.ts:126`)
   et `/api/job-match` (`app/api/job-match/route.ts:127`) exécutent `await req.json()`
   **avant** validation — un corps géant est décodé entièrement avant tout rejet.
   En prod, la limite Vercel (~4,5 Mo) borne l'impact, mais le pattern de borne
   applicative existe déjà (`/api/csp-report` : `MAX_CSP_REPORT_BODY_BYTES = 10_000`,
   check `content-length` ligne 77-78).
2. **(#7) `mailto:` non encodé** : `components/JobMatcher.tsx:273` interpole
   `result.strengths.join('%0A')` et `result.improvements.join('%0A')` (contenu IA)
   **sans** `encodeURIComponent` — alors que `result.analysis` l'a. Un `&` dans un
   item permet d'injecter des paramètres dans l'URL (`&cc=`, `&subject=`) : lien
   mailto détourné au clic de l'utilisateur sur sa propre machine.

## 2. Analyse (vérifiée dans le code)

- Bornes de validation existantes : `/api/job-match` borne la description à
  5 000 caractères (`route.ts:35,154`) ; `/api/chat` via `validateChatMessages`
  (100 messages × 5 000 car. — cf. audit). Une borne `Content-Length` cohérente
  doit donc couvrir le pire cas légitime (~500 Ko pour 100 × 5 000 car. + JSON
  overhead) — une borne trop basse rejetterait des requêtes valides.
- `app/api/csp-report/route.ts:62-78` : le pattern à répliquer (check
  `content-length` + lecture bornée). NB : le pattern de lecture bornée (stream
  avec compteur) est nécessaire seulement si on se méfie d'un `Content-Length`
  absent/menteur — sur les POST de ce site, les deux routes lisent `req.json()`
  directement ; la décision §3 tranche la portée.
- `JobMatcher.tsx:273` : `encodeURIComponent(result.analysis)` appliqué une fois,
  mais pas aux deux `.join('%0A')` — correctif : encoder **chaque item** avant
  le join (encoder le join échapperait aussi les `%0A` voulus).

## 3. Décisions (prescrites, à confirmer §10)

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | Borne `MAX_BODY_BYTES = 600_000` sur les deux routes, check du header `content-length` **avant** `req.json()` (pattern csp-report) | Couvre le pire cas légitime (~500 Ko de contenu + overhead JSON) avec marge ; cohérent avec les bornes de validation existantes |
| 2 | Réponse en cas de dépassement : **400 avec `errorCode: 'VALIDATION'`** (message actionnable) plutôt que 413 | Préserve le contrat d'erreurs existant (§6.5 : 400 validation / pas de nouveau `errorCode`) — 413 serait une forme de réponse nouvelle, à éviter sans nécessité |
| 3 | Pas de lecture bornée du stream (le check `content-length` seul) : si le header est absent/menteur, la validation structurelle existante (`validateChatMessages`, bornes 5 000 car.) reste la deuxième ligne | Éviter de dupliquer la mécanique de lecture streamée de csp-report pour un gain marginal ; le constat #9 reste borné par Vercel en prod |
| 4 | `encodeURIComponent` sur **chaque item** de `strengths` et `improvements` avant `.join('%0A')` | Encoder après le join casserait les séparateurs `%0A` |

## 4. Scope

**In scope** : `app/api/chat/route.ts` + `app/api/job-match/route.ts` (borne
pré-parse + 400 VALIDATION), `components/JobMatcher.tsx` (encodage des items mailto).
**Out of scope** : `lib/validation.ts` (bornes inchangées), tout changement du
protocole NDJSON ou des réponses de succès, `/api/csp-report` (référence pattern
seulement).

## 5. Critères d'acceptation (numérotés, vérifiables)

1. Un POST `/api/chat` avec header `content-length: 700000` (ou corps >
   600 000 octets) répond **400 `{ error, errorCode: 'VALIDATION' }`** sans
   atteindre `req.json()` (check avant parse).
2. Idem sur `/api/job-match`.
3. Une requête légitime au plafond actuel de validation (100 messages ×
   5 000 car.) passe toujours (la borne 600 Ko n'exclut pas le pire cas
   valide — test au plafond).
4. Le lien mailto du JobMatcher : chaque item de `strengths`/`improvements`
   contenant `&`, `?`, `%`, `+` est encodé — un item « a&b=c » n'injecte plus
   de paramètre dans l'URL (inspection de l'`href` rendu).
5. `npm run lint`, `type-check`, `test` (87/87 min), `build` verts ;
   `node scripts/check-locale.mjs` passe (aucun wording nouveau).

## 6. Verification (manuelles)

- `curl -X POST https://kimsandok.com/api/chat -H 'content-length: 700000' …`
  → 400 VALIDATION (headers CSRF/rate limit requis — passer par CDP headless si
  curl est trop verbeux).
- CDP headless : lancer le JobMatcher avec une offre contenant `&` et `<`,
  cliquer le lien mailto, vérifier l'URL générée (aucun `&cc=` injectable).
- Vérifier la borne au plafond (critère 3) via CDP (job-match avec 5 000 car.).

## 7. Non-goals

- Ajouter un `errorCode` nouveau (413/BODY_TOO_LARGE) — contrat préservé (§3 n° 2).
- Borne de lecture streamée du corps (pattern csp-report complet).
- Modification des bornes de validation métier (100 × 5 000 car. inchangées).
- Retrait du filtre anti-injection de `validateJobDescriptionContent`
  (audit : « acceptable, pas un trou »).

## 8. Risques

| Risque | Mitigation |
|--------|-----------|
| Borne trop basse rejette des requêtes légitimes | 600 Ko > pire cas valide ~500 Ko + overhead ; critère 3 teste le plafond |
| 400 au lieu de 413 sémantiquement discutable | Arbitrage explicite §3 n° 2 (contrat préservé) — réversible si §10 tranche autrement |
| Double encodage (item déjà encodé par le modèle) | Encoder les items bruts seulement ; inspection visuelle de l'URL (critère 4) |

## 9. Mesures et limites de conception

La borne est un choix prescrit (600 Ko), dérivé des bornes de validation
existantes (100 × 5 000 car. ≈ 500 Ko) — pas une mesure de prod. Rien d'autre
n'est mesurable : la preuve attendue est comportementale (critères 1-4).

## 10. Questions ouvertes à trancher

1. Valeur de la borne (600 Ko proposé) — la dériver arithmétiquement des bornes
   de validation suffit-elle, ou l'opérateur veut-il une autre valeur ?
2. Code HTTP 400 (VALIDATION, contrat préservé) vs 413 (sémantique HTTP) — §3 n° 2
   propose 400, à confirmer.
3. Le constat #7 touche le seul `mailto:` du codebase (grep à confirmer à
   l'implémentation : aucun autre `mailto:` non encodé).

## Sources

- `app/api/chat/route.ts:126` (`await req.json()` sans borne préalable)
- `app/api/job-match/route.ts:127` (idem), `route.ts:35` (borne 5 000 car.)
- `app/api/csp-report/route.ts:4-5,62-78` (pattern de borne à répliquer)
- `components/JobMatcher.tsx:273` (`strengths.join('%0A')` / `improvements.join('%0A')`
  sans `encodeURIComponent` ; `analysis` encodé)
- `docs/security/SECURITY_AUDIT_2026-09-27.md` §2 (constats #7, #9) et §6 (plan n° 2)
- `CONTEXT.md` §6.5 (contrats d'API à préserver)