# SEC-008 — Headers : HSTS, Permissions-Policy et Reporting-Endpoints

> **Statut : PROPOSÉE** — pending validation utilisateur (2026-09-27)
>
> **Ticket proposé** : SEC-008 · **Date** : 2026-09-27 · **Backlog** : Sécurité · **Base de code** : `main` @ `fbfa4ca`
> Taille S · Source : `docs/security/SECURITY_AUDIT_2026-09-27.md` (constats #4 et #8) · Priorité : 🟡 Moyenne

---

## 1. Problème

Trois lacunes headers, toutes dans `proxy.ts` :

1. **Pas de `Strict-Transport-Security`** (constat #4) — un navigateur peut
   établir une première connexion en HTTP (MITM sur réseau ouvert) avant toute
   redirection ; aucun `vercel.json`, header non posé dans `proxy.ts`.
2. **`report-uri` est déprécié** (constat #8) — `proxy.ts:135` appose uniquement
   `; report-uri /api/csp-report` à la CSP ; les navigateurs modernes honorent
   `Reporting-Endpoints` (header) + directive `report-to`. Le collecteur
   `/api/csp-report` est déjà borné (10 Ko, 100 rapports/min/IP).
3. **Pas de `Permissions-Policy`** — durcissement optionnel (caméra, micro,
   géolocalisation) sans usage légitime sur ce site.

## 2. Analyse (vérifiée)

- `proxy.ts:141-143` pose déjà `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy` — le point d'apposition des headers de réponse existe.
- La CSP est prod-conditional par endroits (`upgrade-insecure-requests` en prod,
  `'unsafe-eval'`/`ws://localhost` en dev) — même pattern à suivre pour HSTS.
- Faits MDN (consultés le 2026-09-27 via Firecrawl local) :
  - HSTS : forme canonique `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
  - `Reporting-Endpoints` : « *This header replaces `Report-To` for declaring
    endpoints, and should be used in preference* » ; format `<endpoint-name>="<URL>"`,
    liste séparée par virgules, endpoints non-sécurisés ignorés.
  - La directive CSP `report-to` est la paire de ce header (remplace `report-uri`).
- **La CSP et le tunnel Sentry ne bougent pas** : `connect-src` inchangé
  (`/api/csp-report` est même-origine).

## 3. Décisions (prescrites, à confirmer §10)

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | **HSTS en prod** : `Strict-Transport-Security: max-age=31536000; includeSubDomains` posé dans `proxy.ts` derrière la même conditionnalité prod que `upgrade-insecure-requests` | En dev (HTTP local), le header est inutile ; le pattern prod-only existe déjà |
| 2 | **Reporting-Endpoints ajouté, `report-uri` conservé en transition** : header `Reporting-Endpoints: csp-endpoint="/api/csp-report"` + directive CSP `report-to csp-endpoint` ajoutée **en plus** de `report-uri` (pas à la place) | Période de compatibilité navigateurs ; retrait de `report-uri` reporté à une étape ultérieure, une fois les rapports confirmés reçus via la nouvelle voie |
| 3 | **Permissions-Policy** : `camera=(), microphone=(), geolocation=()` posé en prod (et dev, sans conséquence) | Aucun usage de ces APIs ; désactivation explicite = réduction de surface |
| 4 | Aucune autre directive CSP modifiée | Convention §6.3 : ne jamais affaiblir la CSP |

## 4. Scope

**In scope** : `proxy.ts` (3 headers + directive `report-to`), vérifications curl
prod. **Out of scope** : `app/api/csp-report/route.ts` (collecteur inchangé),
`vercel.json` (tout passe par `proxy.ts`, cohérence actuelle), `Permissions-Policy`
fine (interest-cohort, etc.), retrait de `report-uri`.

## 5. Critères d'acceptation (numérotés, vérifiables)

1. En prod : `curl -sI https://kimsandok.com/fr` contient
   `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
2. En prod : la réponse contient
   `Reporting-Endpoints: csp-endpoint="/api/csp-report"` et la CSP porte
   `report-to csp-endpoint` **et** `report-uri /api/csp-report` (transition).
3. La CSP n'est affaiblie nulle part (diff CSP : uniquement l'ajout de la
   directive `report-to`).
4. Un rapport CSP de test émis par un navigateur moderne est bien reçu par
   `/api/csp-report` (204, log visible) — la voie `report-to` fonctionne.
5. `/fr` et `/api/health` restent 200 en prod ; `npm run lint`, `type-check`,
   `test` (87/87 min), `build` verts.
6. En dev, aucun comportement régressé (la CSP dev reste fonctionnelle).

## 6. Verification (manuelles)

- `curl -sI https://kimsandok.com/fr | grep -iE 'strict-transport|reporting|report-to'`.
- Test de rapport : ouvrir la console d'un navigateur et provoquer une violation
  (ex. fetch cross-origin bloqué), vérifier le log `/api/csp-report`.
- Vérifier `Permissions-Policy` présent en prod.

## 7. Non-goals

- Soumission HSTS preload (décision irréversible — voir §10).
- Migration complète vers `Reporting-Endpoints` seule (retrait `report-uri`).
- Modification du collecteur `/api/csp-report` (le `console.warn` brut de l'audit
  reste acceptable — rate limité, constat #8 borné).
- Headers CSP existants, tunnel Sentry `/monitoring`.

## 8. Risques

| Risque | Mitigation |
|--------|-----------|
| HSTS casse un sous-domaine en HTTP (kimsandok.com et sous-domaines forcés HTTPS 1 an) | Vérifier qu'aucun sous-domaine ne sert du HTTP ; `includeSubDomains` tranché §10 avant activation |
| `report-to` duplique les rapports pendant la transition (2× volume) | Volume déjà rate-limité (100/min/IP) ; retrait `report-uri` après confirmation (décision n° 2) |
| Header mal formé casse le parsing CSP | Critère 3 : diff CSP minimal ; critère 5 : smoke prod |

## 9. Mesures et limites de conception

Rien de mesurable (pas de perf/coût) — la preuve attendue est l'état des headers
prod (critères 1-4, curls reproductibles).

## 10. Questions ouvertes à trancher

1. **`includeSubDomains`** : des sous-domaines de kimsandok.com servent-ils du
   HTTP quelque part ? Si oui, activer sans la directive ou renoncer.
2. **HSTS preload** : soumission à la liste preload (irréversible, engagement
   long terme) — recommandé seulement si la politique de domaine est stable.
3. Retrait de `report-uri` : après confirmation des rapports via la nouvelle
   voie — dans ce ticket ou un ticket de suivi ?

## Sources

- `proxy.ts:135` (`report-uri`), `proxy.ts:141-143` (headers posés)
- `app/api/csp-report/route.ts:4-5` (bornes collecteur : 10 Ko, 100/min/IP)
- MDN Strict-Transport-Security (forme `max-age=31536000; includeSubDomains`)
- MDN Reporting-Endpoints (« replaces Report-To… should be used in preference »)
- MDN Set-Cookie / prefixes (non utilisé ici, réf. croisée SEC-009)
- `docs/security/SECURITY_AUDIT_2026-09-27.md` §1 (constats #4, #8) et §6 (plan n° 2)