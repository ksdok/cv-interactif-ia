# SEC-007 — Fiabilisation de l'identification du client IP dans le rate limit

> **Statut : VALIDÉE** — opérateur 2026-09-28 (livrée et close ; critère §5.4 smoke prod atteint)
>
> **Livraison** : branche `sec-007-client-ip-rate-limit` (commits `0918128` `feat(sec-007)` : implémentation + 12 tests + retrait instrumentation, puis `291a39a` `fix(review)` : 2 tests mineurs ; créée depuis `main` @ `cf33169`), **fusionnée sur `main` et poussée sur `origin/main`** (merge commit `6599570`, 2026-09-28, déploiement Vercel effectif), branche locale conservée. **Sonde §3.1 (gate)** : canaux externes épuisés, instrumentation temporaire `[SEC-007 probe]` (`cf33169`) déployée puis retirée ; 3 GET `/api/health` (baseline, XFF `203.0.113.7`, XFF `8.8.8.8`) → les 3 loguent l'IP réelle `90.3.165.152` (FR/Meaux), valeur injectée jamais transmise → **scénario B tranché** (Vercel écrase le XFF, l'audit = **faux positif partiel**), correctif **defense-in-depth** = dernier maillon XFF non vide (décision n° 3) ; limite : pas de 2ᵉ réseau (4G indisponible), preuve sur 3 valeurs XFF distinctes toutes écrasées. 3 fichiers (+140/−17) : `lib/rateLimit.ts` (+19/−4), `lib/__tests__/rateLimit.test.ts` (nouveau, +123, 14 cas), `app/api/health/route.ts` (−15). Revue glm-reviewer 2 cycles → **PROPRE** (cycle 1 : 1 majeur documentaire reporté + 2 mineurs corrigés en `291a39a` ; cycle 2 : fidélité + 0 régression). Tests mesurés : lint 0/0, type-check exit 0 (après purge piège §9 `.next/`), `npm test` **105/105 (7 fichiers)** (91 baseline + 14 nouveaux), build secret-free exit 0 (16 pages), runtime local `/api/health` 200. Smoke prod post-merge (2026-09-28) : GET `/fr` 200 (cookie CSRF), POST `/api/chat` **200** streaming NDJSON ancré (flux CSRF complet), 0 × 429 sous le plafond — **critère §5.4 ✅**, instrumentation de sonde absente du déploiement. Suggestion reportée NON appliquée : micro-race théorique dans `getRetryAfterSeconds()` (double lecture d'horloge au franchissement minuit UTC, ~10⁻⁸, fenêtre ≈1 ms/jour) → report TEST-001 / traitement opportuniste. Validée opérateur le 2026-09-28. Trace de livraison dans `project-state.md`.
>
> **Ticket proposé** : SEC-007 · **Date** : 2026-09-27 · **Backlog** : Sécurité · **Base de code** : `main` @ `fbfa4ca`
> Taille S · Source : `docs/security/SECURITY_AUDIT_2026-09-27.md` (constat #2) · Priorité : 🟠 Haute

---

## 1. Problème

`lib/rateLimit.ts` plafonne `/api/chat` et `/api/job-match` à 200 requêtes/jour/IP,
mais l'IP est lue via `getClientIP()` (lignes 68-91) qui prend le **premier** élément
de `x-forwarded-for`. Si cette valeur peut être fournie par le client (contestation
de l'audit, voir §2), un attaquant peut faire tourner l'IP à chaque requête et
**ignorer le plafond** — ce qui expose le quota IA (coût) et affaiblit la seule
limite d'abus runtime.

## 2. Analyse (vérifiée — deux sources contradictoires)

- **Audit (statique)** : `getClientIP()` lit le premier élément de
  `x-forwarded-for` (spoofable par le client) ; correctif suggéré : `x-real-ip`
  ou **dernier** élément de XFF sur Vercel.
- **Doc Vercel actuelle** (vercel.com/docs/headers/request-headers, consultée le
  2026-09-27) : « *If you are trying to use Vercel behind a proxy, we currently
  overwrite the `X-Forwarded-For` header and do not forward external IPs. This
  restriction is in place to prevent IP spoofing.* » — et `x-real-ip` est décrit
  comme **identique** à `x-forwarded-for` sur Vercel.
- L'audit est une revue statique (« aucun test dynamique contre la production ») :
  le comportement réel du XFF sur ce déploiement n'est **pas établi**. Les deux
  affirmations peuvent être vraies selon le plan Vercel (Trusted Proxy
  Enterprise) et l'historique de la plateforme.
- **Conclusion : un fait dynamique manque avant de coder le correctif.** La spec
  prescrit donc une sonde en prod, puis le correctif conditionné au résultat.

## 3. Décisions (prescrites, à confirmer §10)

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | **Étape gate — sonde dynamique en prod** : envoyer `curl -H 'X-Forwarded-For: 1.2.3.4' https://kimsandok.com/api/health` (ou via un log temporaire) et comparer l'IP vue par le serveur avec l'IP réelle | Établir le ground truth avant tout changement ; l'audit lui-même n'a pas testé dynamiquement |
| 2 | **Scénario A** — si le XFF reçu contient la valeur fournie par le client (spoofable) : réordonner `getClientIP()` → `x-real-ip` d'abord (posé par la plateforme), puis **dernier** élément de XFF, fallback legacy conservé en dev | Correctif de l'audit ; le dernier élément d'une chaîne XFF est le plus proche de la plateforme |
| 3 | **Scénario B** — si Vercel écrase déjà le XFF (ip réelle seule) : ne pas changer l'ordre, **durcir quand même** en prenant le dernier élément (defense-in-depth, gratuit) et documenter le constat comme faux positif partiel dans `project-state.md` | Un changement d'ordre ne peut pas affaiblir le comportement actuel |
| 4 | Contrats d'API intacts : 429 + `Retry-After` + `X-RateLimit-*` inchangés | Convention §6.5 de CONTEXT.md |

## 4. Scope

**In scope** : `lib/rateLimit.ts` (`getClientIP()` uniquement), sonde dynamique
prod, documentation du résultat.
**Out of scope** : migration rate limit persistant (SEC-003, déclencheur non
réuni — le constat #5 de l'audit renforce le déclencheur mais ne l'active pas),
modification des routes API, ajout de tests unitaires rateLimit (restent ouverts
TEST-001 P2 — optionnels ici, voir §10).

## 5. Critères d'acceptation (numérotés, vérifiables)

1. Le résultat de la sonde dynamique (scénario A ou B) est documenté dans le
   corps du commit, avec la requête curl utilisée et la réponse observée.
2. `getClientIP()` applique la priorité du scénario tranché (A : `x-real-ip` →
   dernier XFF → fallback ; B : dernier XFF → fallback), sans changer la forme
   des réponses 429/headers.
3. En dev local (aucun header proxy), `getClientIP()` continue de retourner la
   valeur de fallback (localhost/unknown) — comportement inchangé vérifié.
4. Smoke prod : un POST `/api/chat` valide répond 200 ; un client sous le
   plafond ne reçoit pas de 429 (le plafond n'a pas été resserré par erreur).
5. `npm run lint`, `npm run type-check`, `npm run test` (87/87 min),
   `npm run build` verts.

## 6. Verification (manuelles)

- Sonde : `curl -s -H 'X-Forwarded-For: 203.0.113.7' https://kimsandok.com/api/health`
  + inspection de l'IP serveur (log temporaire ou endpoint d'inspection) —
  trace dans le commit.
- Re-vérifier les headers 429 après changement (forme inchangée).

## 7. Non-goals

- Migration SEC-003 (KV/Upstash) — déclencheur non activé.
- Blocage par empreinte client (fingerprint) ou par token.
- Modification du plafond 200/j.
- Tests unitaires `rateLimit` (ticket TEST-001 P2 distinct — option §10).

## 8. Risques

| Risque | Mitigation |
|--------|-----------|
| Mauvais scénario tranché (sonde biaisée par un proxy personnel) | Sonde depuis plusieurs réseaux (4G + box) ; documenter les deux observations |
| Casser le rate limit en dev (fallback modifié) | Critère 3 : comportement dev inchangé |
| Changer l'ordre et casser des clients légitimes derrière proxy d'entreprise | Le plafond est par IP, pas par agent ; seul le calcul d'IP change — smoke critère 4 |

## 9. Mesures et limites de conception

Le plafond reste en mémoire par instance (SEC-003) : la limite effective reste
≈ 200 × N instances au déploiement — non mesurable ici, hors périmètre. La sonde
produit un fait binaire (spoofable / non spoofable), pas un chiffre.

## 10. Questions ouvertes à trancher

1. Scénario A/B selon la sonde — l'opérateur tranche sur le résultat documenté
   (les deux correctifs sont pré-écrits, décision n° 2/3).
2. Faut-il ajouter les tests unitaires `lib/rateLimit.ts` dans ce ticket
   (couvrir les cas XFF multi-IP) ou les laisser au ticket TEST-001 P2 ?

## Sources

- `lib/rateLimit.ts:68-91` (`getClientIP()` : XFF premier élément → fallbacks)
- `docs/security/SECURITY_AUDIT_2026-09-27.md` §2 (constat #2) et §6 (plan n° 2)
- Doc Vercel — vercel.com/docs/headers/request-headers (X-Forwarded-For :
  « overwrite… to prevent IP spoofing » ; x-real-ip : « identical to the
  x-forwarded-for header »), consultée le 2026-09-27 via Firecrawl local
- `CONTEXT.md` §6.5 (contrats d'API à préserver)