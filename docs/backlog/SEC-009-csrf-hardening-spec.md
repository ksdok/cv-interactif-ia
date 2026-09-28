# SEC-009 — Durcissement CSRF : comparaison constante en temps + cookie `__Host-`

> **Statut : PROPOSÉE** — pending validation utilisateur (2026-09-27)
>
> **Ticket proposé** : SEC-009 · **Date** : 2026-09-27 · **Backlog** : Sécurité · **Base de code** : `main` @ `fbfa4ca`
> Taille S · Source : `docs/security/SECURITY_AUDIT_2026-09-27.md` (constat #11) · Priorité : 🔵 Basse

---

## 1. Problème

La vérification CSRF (`lib/csrf.ts:49`) compare le token fourni au token du cookie
avec `===` — comparaison **non constante en temps**. Le cookie CSRF (ligne ~65-73)
est `httpOnly`, `secure`, `sameSite: 'strict'`, mais **sans préfixe `__Host-`**
ni `path` explicite : il pourrait être écrasé par un cookie frère d'un
sous-domaine (host-wide boundary affaiblie) ou sur un path différent.

## 2. Analyse (vérifiée dans le code)

- `lib/csrf.ts:49` : `return providedToken === storedToken` — cible du durcissement.
- `lib/csrf.ts:65-73` : config cookie (httpOnly/secure/sameSite/maxAge 24 h) —
  ni `path` ni préfixe `__Host-`.
- Le cookie est posé dans `proxy.ts:151` (`response.cookies.set(...)`) avec
  `CSRF_COOKIE_CONFIG` — **un seul point d'apposition**.
- Le token est miroité dans une meta côté serveur (double-submit) : le nom du
  cookie apparaît donc dans `proxy.ts` et dans la lecture du cookie côté routes —
  renommer le cookie touche **tous les sites qui lisent son nom** (grep `csrf`
  requis à l'implémentation).
- Faits MDN (Set-Cookie, consulté le 2026-09-27) : un nom `__Host-` exige
  `Secure`, **aucun attribut `Domain`**, et `Path=/` — garanti « host-only » et
  non écrasable par path.
- `crypto.timingSafeEqual` (Node stdlib) exige des buffers de **même longueur** :
  prévoir la garde de longueur avant la comparaison (pattern standard : comparer
  les longueurs d'abord, retourner false avant `timingSafeEqual` si différentes —
  la fuite de longueur seule n'expose pas le token, 32 octets aléatoires).

## 3. Décisions (prescrites, à confirmer §10)

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | Comparaison via `crypto.timingSafeEqual` sur buffers, avec garde de longueur préalable | Constat #11 ; la longueur du token est de toute façon publique (32 octets) |
| 2 | Renommer le cookie en `__Host-csrf-token` (ou `__Host-<nom-actuel>`) + `path: '/'`, sans attribut `Domain`, `secure` conservé | Exigences du préfixe MDN ; renommer = les vieux cookies sans préfixe deviennent inertes, chaque client repart propre |
| 3 | Renommer le nom **dans tous les sites qui le référencent** (pose proxy.ts, lecture routes, meta miroir si le nom y figure) — inventaire grep obligatoire avant commit | Un nom oublié = CSRF systématiquement en échec (fail visible, pas silencieux) |
| 4 | Contrats d'API intacts (403 CSRF, forme `{ error, errorCode }`) | Convention §6.5 de CONTEXT.md |

## 4. Scope

**In scope** : `lib/csrf.ts` (comparaison + config cookie + nom), `proxy.ts`
(pose du cookie — nom/attributs), les points de lecture du cookie (inventaire grep),
vérification prod.
**Out of scope** : `/api/csp-report` (non protégé CSRF — **intentionnel**,
rapports navigateur sans credentials, cf. audit), les autres headers (SEC-008),
rate limit (SEC-007).

## 5. Critères d'acceptation (numérotés, vérifiables)

1. `lib/csrf.ts` ne contient plus de comparaison `===` entre token fourni et
   token stocké ; la comparaison passe par `timingSafeEqual` avec garde de longueur.
2. Le cookie posé en prod est nommé `__Host-…`, avec `Secure`, `HttpOnly`,
   `SameSite=Strict`, `Path=/`, **sans** attribut `Domain` (vérifié via
   `curl -sI` sur `/fr` : ligne `Set-Cookie`).
3. Un POST valide `/api/chat` avec le nouveau cookie répond 200 (le pipeline
   CSRF fonctionne bout en bout).
4. Un POST avec token fourni ≠ token du cookie répond 403 (contrat inchangé).
5. Un POST avec token de longueur différente répond 403 **sans lever
   d'exception** (garde de longueur, pas de crash `timingSafeEqual`).
6. `npm run lint`, `type-check`, `test` (87/87 min), `build` verts.

## 6. Verification (manuelles)

- `curl -sI https://kimsandok.com/fr | grep -i set-cookie` → préfixe `__Host-`,
  attributs présents.
- CDP headless : charger la home, lire le cookie document (inaccessible —
  httpOnly ✓), soumettre une question chat → 200 ; modifier le token → 403.
- Recherche grep : `rg -n "csrf" lib proxy.ts app` — aucun nom de cookie legacy
  restant.

## 7. Non-goals

- Rotation du token par requête (le double-submit 24 h suffit à ce modèle).
- Protection CSRF de `/api/csp-report` (intentionnellement absente).
- Migration des cookies existants (aucune : renommage propre, §3 n° 2).

## 8. Risques

| Risque | Mitigation |
|--------|-----------|
| Un site référençant l'ancien nom est oublié → CSRF en échec visible | Inventaire grep §3 n° 3 + critères 3-4 (fail visible, pas silencieux) |
| `timingSafeEqual` lève sur longueurs différentes (crash → 500) | Garde de longueur avant comparaison (critère 5) |
| Dev local en HTTP : `Secure` + `__Host-` exige HTTPS | Le dev local tourne-t-il en HTTPS ? Sinon prévoir garde dev (comportement actuel inchangé en dev) — à trancher §10 |
| Renommage → tous les clients re-tokens au premier accès | Accepté : le flow d'obtention du token est sans état côté client |

## 9. Mesures et limites de conception

Rien de mesurable — le constat est qualitatif (nature de la comparaison, attributs
du cookie). La preuve attendue est l'inspection `Set-Cookie` prod + les critères
comportementaux (200/403).

## 10. Questions ouvertes à trancher

1. Nom final du cookie (`__Host-csrf-token` vs `__Host-<nom actuel>`).
2. Dev local : le garde `secure`/`__Host-` doit-il être assoupli en dev (comme
   `'unsafe-eval'` CSP l'est) ou le dev passe-t-il déjà en HTTPS ?
3. Tests unitaires `lib/csrf.ts` (restants ouverts TEST-001 P2) : dans ce ticket
   ou séparément ?

## Sources

- `lib/csrf.ts:49` (comparaison `===`), `lib/csrf.ts:65-73` (config cookie),
  `proxy.ts:151` (pose du cookie)
- MDN Set-Cookie — prefixes (`__Host-` : Secure + pas de Domain + Path=/),
  consulté le 2026-09-27 via Firecrawl local
- Node `crypto.timingSafeEqual` — stdlib, garde de longueur requise
- `docs/security/SECURITY_AUDIT_2026-09-27.md` §2 (constat #11) et §6 (plan n° 3)