# SEC-007 — Fiabilisation de l'identification du client IP dans le rate limit

> **Statut : PROPOSÉE** — pending validation utilisateur (2026-09-27)
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