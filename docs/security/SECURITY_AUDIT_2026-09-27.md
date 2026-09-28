# Audit de sécurité — 2026-09-27

> Audit statique du code de `main` (CV interactif bilingue, Next.js 16, Vercel).
> Périmètre : headers/CSP, pipeline API, gestion des secrets, dépendances, XSS,
> injection de prompt, CI. Hors périmètre : test d'intrusion en prod, config
> Vercel/Supabase (console), infra réseau.
>
> **Verdict global : posture saine, aucune faille active critique côté code
> applicatif.** Le risque principal vient des **dépendances non à jour**
> (Next.js en particulier) et du **rate limit contournable par usurpation
> d'IP**. Pas de fuite de secrets détectée dans le dépôt ni son historique.

## Synthèse des constats

| # | Sévérité | Constat | Zone |
|---|---|---|---|
| 1 | 🔴 Critique | Next.js 16.0.10 → vulnérabilités corrigées en 16.3.6 (DoS RSC, DoS Image Optimizer, PostCSS XSS, sharp/libvips CVE) | `package.json` |
| 2 | 🟠 Haute | Rate limit contournable : `getClientIP()` lit le **premier** élément de `x-forwarded-for`, spoofable par le client sur Vercel | `lib/rateLimit.ts` |
| 3 | 🟠 Haute | 8 vulnérabilités "high" transitives (ws, brace-expansion, flatted, js-yaml, minimatch, picomatch) + 1 critical Next | `npm audit` |
| 4 | 🟡 Moyenne | Absence de `Strict-Transport-Security` (pas de `vercel.json`, header non posé dans `proxy.ts`) | headers |
| 5 | 🟡 Moyenne | Rate limit en mémoire, par instance (reset au déploiement, multiplié par le nombre d'instances Vercel) — SEC-003 connu, reporté | `lib/rateLimit.ts` |
| 6 | 🟡 Moyenne | Injection de prompt possible sur `/api/chat` et `/api/job-match` — impact borné (coût, réponses hors-marque) mais pas de défense runtime mécanique | `app/api/*/route.ts` |
| 7 | 🔵 Basse | Liens `mailto:` : `strengths`/`improvements` (contenu IA) interpolés **sans** `encodeURIComponent` — injection de paramètres (`&cc=`, `&body=`) | `components/JobMatcher.tsx:273` |
| 8 | 🔵 Basse | `report-uri` déprécié (pas de `Reporting-Endpoints`/`report-to`) ; rapports CSP logués bruts via `console.warn` (log injection bornée par le rate limit) | `proxy.ts`, `app/api/csp-report/route.ts` |
| 9 | 🔵 Basse | Corps de requête parsé (`req.json()`) **avant** validation, sans taille max applicative (protégé en prod par la limite Vercel 4,5 Mo) | `app/api/chat`, `/api/job-match` |
| 10 | 🔵 Basse | Hygiène locale/repo : fichier ``.env 2.local`` (copie de conflit) présent, `.env.local` en 644, `.claude/settings.local.json` et `.mcp.json` trackés malgré `.gitignore` (QUAL-004) | dépôt |
| 11 | 🔵 Basse | Comparaison CSRF non constante en temps + cookie sans préfixe `__Host-` | `lib/csrf.ts` |

---

## 1. Headers & CSP — ✅ solide, 2 améliorations

`proxy.ts` (ex-middleware, runtime Node) :

**Points forts vérifiés**
- CSP avec **nonce par requête** (`x-nonce`, `crypto.getRandomValues`) + **`strict-dynamic`**, **sans `unsafe-inline`** pour les scripts ; `'unsafe-eval'` et `ws://localhost` confinés au dev.
- `script-src-attr 'none'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests` en prod.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `poweredByHeader: false`.
- CSP appliquée en mode **enforcing** par défaut (`CSP_REPORT_ONLY` opt-in).
- Scripts JSON-LD **noncés** (`x-nonce` relu dans les layouts/pages).
- Redirections vercel.app → canonique (301/308) avant consommation du nonce.

**Constats**
- **[#4] Pas de `Strict-Transport-Security`.** Aucun `vercel.json`, header non posé dans `proxy.ts`. Recommandation : `Strict-Transport-Security: max-age=31536000; includeSubDomains` en prod.
- **[#8] `report-uri` est déprécié.** Les navigateurs modernes honorent `Reporting-Endpoints` + directive `report-to`. Le collecteur `/api/csp-report` est bien borné (10 Ko, 100 rapports/min/IP) mais logue le rapport via `console.warn` — entrées contrôlées par un client tiers → risque de pollution de logs limité (rate limité), acceptable.
- Absence de `Permissions-Policy` — durcissement optionnel (`camera=(), microphone=(), geolocation=()`).

## 2. Pipeline API — ✅ conforme aux conventions, 1 faille

Pipeline **rate limit → CSRF → validation** correctement appliqué sur `/api/chat` et `/api/job-match` (contrats d'erreur respectés : 429/`Retry-After`, 403, 400, 500 générique).

**CSRF (`lib/csrf.ts`) — ✅ bon**
- Double-submit cookie : 32 octets aléatoires, `httpOnly`, `secure`, `sameSite: 'strict'` (mitigation seconde ligne), token miroité dans une meta côté serveur.
- Vérifié sur les deux POST métier. `/api/csp-report` non protégé : **intentionnel** (les rapports navigateur sont sans credentials).
- [#11] Durcissement cheap : comparaison constante en temps + préfixe `__Host-` + `path=/` explicite.

**Rate limiting (`lib/rateLimit.ts`) — ⚠️ contournable**
- **[#2] Spoofing d'IP.** `getClientIP()` prend le **premier** élément de `x-forwarded-for`. Sur Vercel, un client peut envoyer son propre `X-Forwarded-For` — l'IP réelle est ajoutée par la plateforme ; la première entrée reste la valeur fournie par le client, qui peut donc la **faire tourner à chaque requête** et ignorer la limite de 200/j.
  - Correctif : sur Vercel, préférer `x-real-ip` (posé par la plateforme) ou le **dernier** élément de `x-forwarded-for` ; le header client ne doit passer qu'en fallback dev.
- **[#5] In-memory par instance** : compteurs réinitialisés à chaque déploiement et par instance serverless — limite effective ≈ 200 × N instances. Connu et documenté (SEC-003, migration Vercel KV/Redis **conditionnée à un déclencheur** — ne pas implémenter sans accord). Ce constat renforce le déclencheur.
- `[#9]` `await req.json()` s'exécute avant `validateChatMessages` : un corps géant est décodé entièrement avant tout rejet. Impact borné en prod par la limite de payload Vercel (~4,5 Mo), mais une borne `Content-Length` au début du handler (pattern déjà présent dans `/api/csp-report`) serait cohérente.

**Validation — ✅ bonne**
- `/api/chat` : whitelist de rôles, bornes 100 messages × 5 000 car., rejet des types exotiques.
- `/api/job-match` : bornes 100–5 000 car., réponses bornées (clamp 0–100, 5 items max), erreurs 500 génériques (pas de fuite de stack).
- Le filtre « anti-injection » de `validateJobDescriptionContent` (rejet HTML/« SQL ») est un **filtre de prompt-injection artisanal**, pas une protection SQL (aucune requête SQL construite côté app — Supabase RPC paramétrée). Il peut rejeter des offres légitimes (`<` fréquent en C++/templated) : acceptable, pas un trou.

**Prompt injection — [#6] risque borné, réel**
- Le texte utilisateur (chat) et l'offre d'emploi (job-match) entrent tels quels dans les prompts. Mitigations présentes : persona durci (MODEL-004, gate 18/18 refus hors-sujet), validation de structure et clamping de la sortie job-match, rate limit.
- Impact maximal réaliste : réponses hors-marque, consommation de quota IA (le CV est public → pas d'exfiltration de données ; les clés sont des env server-only inaccessibles au modèle). Pas de défense mécanique runtime (le garde-fou `lib/guardrail.mjs` est un outil de banc, pas un filtre en ligne) — à considérer si des abus sont observés.
- **XSS en sortie : aucune.** Réponses chat et analyses rendues en texte React (échappé) ; `LinkifiedText` n'autorise que `http(s)://`, `ftp://`, `www.` (préfixé `https://`) — pas de `javascript:` ; `dangerouslySetInnerHTML` uniquement pour du JSON-LD issu de données **dev-contrôlées**. Durcissement optionnel : `.replace(/</g, '\\u003c')` sur le JSON-LD.

**[ #7] `mailto:` non encodé** — `result.strengths.join('%0A')` et `improvements.join('%0A')` injectent du contenu IA brut dans l'URL `mailto:` (`encodeURIComponent` appliqué à `analysis` mais pas aux listes). Un `&` permet d'ajouter des paramètres (`&cc=`, `&subject=`). Impact : lien mailto détourné au clic de l'utilisateur sur sa propre machine. Correctif : `encodeURIComponent` sur chaque item.

## 3. Secrets & données sensibles — ✅ propre

- `git ls-files` + scan regex (OpenAI `sk-*`, Google `AIza*`, GitHub `ghp_*`, Supabase `sbp_*`, PEM) sur tout le dépôt : **aucun secret committé**. Aucun `.env*` tracké ; `.gitignore` couvre `.env*`.
- Clients secrets **server-only** : `lib/supabase.ts` marqué `server-only`, fail-fast prod sur `SUPABASE_SERVICE_ROLE_KEY` (SEC-005) ; `lib/github.ts` `server-only`, `GITHUB_TOKEN` optionnel en `Authorization: Bearer` sortant uniquement ; clés OpenAI/Gemini exclusivement dans `process.env` côté serveur.
- **Sentry** : DSN public par nature (`NEXT_PUBLIC_SENTRY_DSN`, normal) ; `sendDefaultPii: false`, scrubbers `beforeSend`/`beforeBreadcrumb` (corps, cookies, query string, headers auth supprimés ; arguments console — qui contiennent des extraits de contenu utilisateur — droppés). `tunnelRoute: '/monitoring'` évite tout élargissement CSP. ✅ Bien conçu.
- Fuite d'info mineure : `.mcp.json` tracké expose le `project_ref` Supabase (identifiant non secret, ok) ; `.claude/settings.local.json` et mémoires d'agents trackées malgré `.gitignore` (QUAL-004 connu — à purger de l'index, `git rm --cached`).
- [#10] Hygiène locale : ``.env 2.local`` (copie de conflit de synchro, 600) contient des clés live — supprimer ; `.env.local` est en **644** (lisible par tout utilisateur de la machine) → `chmod 600 .env.local`.

## 4. Dépendances — 🔴 action requise

`npm audit` : **13 vulnérabilités (1 critique, 8 hautes, 3 modérées, 1 basse)**.

| Paquet | Sévérité | Détail | Correctif |
|---|---|---|---|
| `next` 16.0.10 | **critique** | DoS via désérialisation RSC ; DoS Image Optimizer (`remotePatterns`) | **`next@16.3.6`** |
| `postcss`, `sharp` | haute | XSS via `</style>` non échappé dans la stringify CSS ; lecture de fichier via `sourceMappingURL` ; sharp hérite de CVE libvips/libheif | livré avec `next@16.3.6` |
| `ws` | haute | divulgation de mémoire non initialisée ; DoS par fragments | `npm audit fix` |
| `brace-expansion`, `flatted`, `js-yaml`, `minimatch`, `picomatch` | haute | DoS/ReDoS, prototype pollution | `npm audit fix` |
| `ajv`, `@humanfs/node`, `uuid`, `@babel/core` | mod./basse | ReDoS, symlink copy, bounds check | `npm audit fix` |

**Recommandation : `npm audit fix` + montée de `next` vers `16.3.6`** (les CVE Next/PostCSS/sharp sont incluses), puis suite complète (`lint`, `type-check`, `test`, `build`). Les vulnérabilités `ws`/`flatted`/etc. sont majoritairement en chaîne dev/build (ESLint, Vitest) — impact prod limité, mais `next` est la brique runtime exposée.

Note : l'Image Optimizer DoS suppose `remotePatterns` — non configuré ici ; la CVE RSC reste applicable. Ne pas ignorer pour autant.

## 5. CI/CD & configuration — ✅ correct, durcissements connus

- Workflow minimal sain : `permissions: contents: read`, `npm ci`, build **secret-free** (prouvé, à préserver), timeout 15 min.
- Durcissements déjà tracés par **CICD-002** (🟠 ouvert) : actions épinglées par **tag** (`actions/checkout@v4`, `setup-node@v4`) au lieu de SHA, `runs-on: ubuntu-latest` non épinglé, pas de `concurrency`. Aucun secret dans le CI → risque modéré mais réel en cas d'action compromise.
- Vercel : pas de `vercel.json` (tout passe par `proxy.ts`) — cohérent, sauf HSTS ([#4]).

## 6. Plan d'action suggéré (ordre de priorité)

1. **Immédiat** : `npm audit fix` + `next@16.3.6` → lint/type-check/test/build + smoke prod. *(constats #1, #3)*
2. **Court terme** : fiabiliser `getClientIP()` (utiliser `x-real-ip` / dernier élément XFF sur Vercel) *(#2)* ; ajouter HSTS en prod *(#4)* ; `encodeURIComponent` sur les listes mailto *(#7)*.
3. **Moyen terme** : évaluer le déclencheur de **SEC-003** au vu de #2 (rate limit contournable) ; HSTS/Permissions-Policy ; exécuter **CICD-002** (SHA pinning) ; purge QUAL-004 (`git rm --cached .claude .mcp.json`) + `chmod 600 .env.local`, suppression de ``.env 2.local``.
4. **Veille** : surveiller les logs Sentry pour abus de prompt injection ([#6]) avant d'envisager un filtre runtime.

---

*Méthode : revue statique de `proxy.ts`, `app/api/**`, `lib/**` (csrf, rateLimit, validation, supabase, github, rag, modelProviders, sentryOptions, jsonLd, linkify, guardrail), layouts/composants (rendu des sorties IA), `.github/workflows/ci.yml`, `.gitignore` + scan de secrets sur les fichiers trackés, `npm audit`. Aucun test dynamique contre la production n'a été effectué.*
