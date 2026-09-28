# SEC-006 — Montée Next.js 16.3.6 + correction des vulnérabilités npm audit

> **Statut : VALIDÉE** — livrée le 2026-09-28 (trace : project-state.md)
>
> **Ticket proposé** : SEC-006 · **Date** : 2026-09-27 · **Backlog** : Sécurité · **Base de code** : `main` @ `fbfa4ca`
> Taille S · Source : `docs/security/SECURITY_AUDIT_2026-09-27.md` (constats #1 et #3) · Priorité : 🔴 Critique

---

## 1. Problème

`package.json:24` épine `next` à **16.0.10**, vulnérable (range `9.3.4-canary.0 – 16.3.2`
vérifié via `npm audit` le 2026-09-27) : DoS par désérialisation HTTP de React Server
Components, HTTP request smuggling via rewrites, contournement CSRF de Server Actions
par origin nul, croissance non bornée du cache disque `next/image`, DoS Image Optimizer
(`remotePatterns` — non configuré ici, CVE quand même applicable). `npm audit` remonte
**13 vulnérabilités (1 critique, 8 hautes, 3 modérées, 1 basse)**, dont les transitives
`ws`, `brace-expansion`, `flatted`, `js-yaml`, `minimatch`, `picomatch` (majoritairement
en chaîne dev/build). Next est la brique runtime exposée — seul constat critique de l'audit.

## 2. Analyse (vérifiée)

- `npm view next dist-tags.latest` → **16.3.6** (les 16.4.x sont des canaries au
  2026-09-27) — la cible de l'audit est déjà la dernière stable 16.x.
- `package.json` épine les versions **exactement** (`"next": "16.0.10"`, pas de `^`) —
  convention à conserver.
- L'audit recommande `npm audit fix` (sans `--force`) pour les transitives
  (mod./basse : `ajv`, `@humanfs/node`, `uuid`, `@babel/core`).
- Contrainte repo : le `next build` est **secret-free** (CICD-001) — ne rien casser de
  ce contrat ; `proxy.ts` dépend du runtime Node de Next 16 (pas de `runtime` déclaré).

## 3. Décisions

| n° | Décision | Rationale |
|----|----------|-----------|
| 1 | Monter `next` à **exactement `16.3.6`** (convention de pin du repo) ; re-vérifier au jour J que 16.3.6 reste la dernière 16.x stable, sinon prendre le patch supérieur | La spec ne doit pas être périmée ; le fix minimal est 16.3.3+ |
| 2 | `npm audit fix` **sans `--force`** — revue manuelle du diff `package-lock.json` avant commit | `--force` peut monter des majors silencieusement ; tout bump transitif doit être listé dans le corps du commit |
| 3 | Suite complète + smoke prod obligatoires avant fusion | Une montée de Next peut changer des comportements runtime (proxy.ts, streaming) |

## 4. Scope

**In scope** : `package.json` (`next` → 16.3.6), `package-lock.json` (`npm audit fix`),
suite de vérifications complète, smoke prod.
**Out of scope** : toute refactorisation, tout bump majeur d'une autre dépendance,
CICD-002 (épinglage SHA des actions — ticket séparé).

## 5. Critères d'acceptation (numérotés, vérifiables)

1. `package.json` contient `"next": "16.3.6"` (ou patch 16.x supérieur, tracé).
2. `npm audit` ne remonte **plus aucune vulnérabilité critique ni haute** ; les
   résidus modérés/basses éventuels sont listés dans le corps du commit avec la
   raison du non-fix.
3. `npm run lint`, `npm run type-check`, `npm run test` (87/87 minimum),
   `npm run build` (secret-free, sans variables d'env) verts.
4. Smoke prod après déploiement Vercel : `/api/health` 200, `/fr` 200, un POST
   `/api/chat` répond, un POST `/api/job-match` répond, headers de sécurité intacts
   (CSP nonce présente).
5. Le diff `package-lock.json` est revu et les bumps transitifs sont documentés
   dans le corps du commit (`fix(security):`).

## 6. Verification (manuelles)

- `npm audit` → JSON : `critical: 0, high: 0`.
- `git diff package.json` → une ligne.
- Smoke : `curl -sI https://kimsandok.com/fr | head` (200 + CSP), health 200.

## 7. Non-goals

- Migration vers une version majeure/canary de Next (16.4.x canary exclu).
- Épinglage SHA des GitHub Actions (CICD-002).
- Modification de `next.config.ts` ou de `proxy.ts`.

## 8. Risques

| Risque | Mitigation |
|--------|-----------|
| Comportement runtime changé (streaming NDJSON, proxy.ts) | Critères 3-4 : suite complète + smoke prod obligatoires |
| `npm audit fix` remonte des majors transitives | Revue manuelle du lockfile, commit documentant chaque bump (décision n° 2) |
| 16.3.6 ne corrige pas tout (résidus modérés) | Critère 2 : résidus listés explicitement, pas de silence |

## 9. Mesures et limites de conception

Rien de mesurable côté perf/coût — la preuve attendue est l'état de `npm audit`
(avant/après dans le corps du commit, sans inventer de chiffre).

## 10. Questions ouvertes — tranchées le 2026-09-28 (validation opérateur)

1. **Pin exact `16.3.6` vs `^16.3.6`** → **pin exact conservé** : le repo épine
   exactement, convention de pin maintenue (décision n° 1 respectée).
2. **Vulnérabilités modérées/basses résiduelles après `npm audit fix`** → **aucun
   résidu** : 71 bumps transitifs dont **0 majeur**, `npm audit` ne remonte plus
   aucune vulnérabilité (0/0/0/0 toutes sévérités) — rien à documenter au critère 2.

## Sources

- `package.json:24` (pin `next` 16.0.10)
- `npm audit --json` (2026-09-27) : 13 vulns, next vulnérable `9.3.4-canary.0 – 16.3.2`
- `npm view next dist-tags.latest` → 16.3.6 (2026-09-27)
- `docs/security/SECURITY_AUDIT_2026-09-27.md` §4 (constats #1, #3) et §6 (plan n° 1)
- `CONTEXT.md` §9 (piège build secret-free)