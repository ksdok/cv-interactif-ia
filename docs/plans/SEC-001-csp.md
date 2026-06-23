# Plan : SEC-001 — Content Security Policy (CSP) stricte

> Ticket : SEC-001 · Complexité : MEDIUM/HIGH · Estimation : ~1h30–2h
> Cible : cv-interactif-ia (Next.js 16, App Router, Turbopack)
> Statut : implémenté et validé localement le 2026-06-23

## Objectif

Ajouter une CSP réellement stricte, sans `script-src 'unsafe-inline'`, en utilisant un nonce généré côté `proxy.ts` et transmis à Next.js. Restreindre les sources autorisées de scripts, styles, images, polices et connexions réseau, tout en conservant le rendu Next/App Router, le JSON-LD, le CSRF existant, le chat et le Job Matcher.

Cette approche est préférée à une CSP statique dans `next.config.ts`, car une application Next/App Router peut générer des scripts inline nécessaires à l'hydratation. Une CSP stricte compatible Next doit donc passer par un nonce par requête.

Le déploiement doit être progressif : idéalement une phase `Content-Security-Policy-Report-Only`, puis bascule en `Content-Security-Policy` enforcing après vérification des rapports et du HTML généré.

Note d'implémentation 2026-06-23 : le ticket a été implémenté en mode enforcing par défaut, avec support `CSP_REPORT_ONLY=true`, `report-uri /api/csp-report` en report-only et enforcing, endpoint `/api/csp-report` limité à 10 KB et 100 req/min/IP, validation `lint`, `build`, start production Node 22, nonces sur scripts Next/JSON-LD et CSP Evaluator.

## Contexte technique corrigé

- `next.config.ts` est actuellement vide.
- Il existe déjà un `proxy.ts` utilisé pour initialiser le cookie CSRF.
  - On ne crée donc pas de nouveau `middleware.ts`.
  - On étend `proxy.ts` pour générer un nonce CSP et poser les headers de sécurité.
- **Polices** : `Inter` via `next/font/google`, auto-hosted par Next.
- **Script inline applicatif** : JSON-LD dans `app/layout.tsx` via `dangerouslySetInnerHTML`.
- **Scripts inline Next** : possibles pour l'hydratation/App Router ; ils doivent recevoir un nonce via la mécanique CSP de Next.
- **Styles** : Tailwind CSS 4 + `next/font`. `style-src 'unsafe-inline'` reste accepté dans ce ticket, car le risque principal visé est l'exécution de scripts.
- **Images** : `opengraph-image.png` en same-origin ; pas de source image externe identifiée.
- **API browser** : appels `fetch()` same-origin vers `/api/chat` et `/api/job-match` uniquement.
- **Appels OpenAI/Gemini/Supabase** : côté serveur, non concernés par `connect-src` browser.
- **Analytics Vercel** : dépendances présentes dans `package.json`, mais aucune utilisation trouvée dans `app/`, `components/` ou `lib/`. Ne pas autoriser les domaines Vercel tant que les composants Analytics/SpeedInsights ne sont pas réellement montés.
- **Liens externes** : LinkedIn, GitHub et liens générés par `LinkifiedText` sont des navigations utilisateur ; ils ne nécessitent pas d'autorisation CSP particulière.

## Découpage

### Étape 1 — Inventorier les sources à autoriser

Vérifier avant implémentation :

```bash
rg -n "@vercel/(analytics|speed-insights)|Analytics|SpeedInsights" app components lib
rg -n "<script|dangerouslySetInnerHTML|next/script|<iframe|<img|next/image|https?://|fetch\(" app components lib public --glob '!**/*.png'
rg -n "NEXT_PUBLIC_|SUPABASE|OPENAI|GEMINI|fetch\(|new EventSource|WebSocket" app components lib next.config.ts proxy.ts
```

État attendu actuellement :

- pas d'Analytics/SpeedInsights montés côté client ;
- un seul script applicatif inline : JSON-LD dans `app/layout.tsx` ;
- fetch browser uniquement vers `/api/chat` et `/api/job-match` ;
- pas d'iframe, CDN, tag manager ou image externe.

### Étape 2 — Définir la policy cible

#### Production

Policy cible avec nonce dynamique :

```txt
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
script-src-attr 'none';
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' data:;
connect-src 'self';
manifest-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests;
```

Notes :

- Pas de `script-src 'unsafe-inline'`.
- Le nonce doit être généré à chaque requête.
- `'strict-dynamic'` est recommandé avec les nonces CSP Level 3 : les scripts approuvés par nonce peuvent charger leurs dépendances dynamiques. À valider explicitement, car cela change la sémantique de `script-src`.
- `script-src-attr 'none'` interdit les handlers inline de type `onclick="..."`. Vérifier le HTML généré pour confirmer qu'aucun handler inline n'est nécessaire.
- `style-src 'unsafe-inline'` est conservé pour compatibilité avec Next/font/Tailwind. À durcir dans un ticket séparé si nécessaire.
- `manifest-src 'self'` est ajouté par sécurité si un manifest web est introduit plus tard.
- `upgrade-insecure-requests` uniquement en production.
- Ne pas ajouter les domaines Vercel Analytics tant que l'app ne monte pas explicitement `<Analytics />` ou `<SpeedInsights />`.

#### Développement local

Le dev server Next/Turbopack peut nécessiter des règles plus permissives pour HMR et source maps :

```txt
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic' 'unsafe-eval';
script-src-attr 'none';
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' data: blob:;
connect-src 'self' ws://localhost:* http://localhost:*;
manifest-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```

Notes :

- Ne pas utiliser `upgrade-insecure-requests` en local.
- Ne pas valider la robustesse CSP uniquement avec `npm run dev` ; la validation principale doit se faire via `npm run build && npm start`.

### Étape 2 bis — Prévoir un mode Report-Only

Avant d'activer la CSP en mode bloquant, prévoir un mode de déploiement progressif.

Option recommandée : ajouter une variable d'environnement temporaire, par exemple `CSP_REPORT_ONLY=true`, qui fait poser le header :

```txt
Content-Security-Policy-Report-Only: <policy>; report-uri /api/csp-report
```

Puis :

1. déployer quelques heures en report-only ;
2. analyser les violations remontées ;
3. corriger la policy si nécessaire ;
4. désactiver `CSP_REPORT_ONLY` pour basculer vers :

```txt
Content-Security-Policy: <policy>; report-uri /api/csp-report
```

L'endpoint `/api/csp-report` doit rester volontairement simple mais protégé : limite de taille du body (10 KB), rate limit spécifique (100 req/min/IP), pas de CSRF car les rapports CSP navigateur ne portent pas `X-CSRF-Token`. En revanche, ne pas confondre `report-uri` et la protection elle-même : la CSP est appliquée par le navigateur uniquement depuis les headers de réponse.

### Étape 3 — Étendre `proxy.ts`

Objectif : conserver le comportement CSRF existant et ajouter :

1. génération d'un nonce ;
2. injection du nonce dans les request headers (`x-nonce`) ;
3. injection de la CSP et des headers HTTP de sécurité dans la réponse.

Pseudo-implémentation :

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateCSRFToken, CSRF_COOKIE_CONFIG } from './lib/csrf'

function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildCspHeader(nonce: string) {
  const isDev = process.env.NODE_ENV !== 'production'

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data:${isDev ? ' blob:' : ''}`,
    isDev ? "connect-src 'self' ws://localhost:* http://localhost:*" : "connect-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]

  if (!isDev) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = generateNonce()
  const cspHeader = buildCspHeader(nonce)
  const reportOnly = process.env.CSP_REPORT_ONLY === 'true'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const cspHeaderWithReporting = `${cspHeader}; report-uri /api/csp-report`

  response.headers.set(
    reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    cspHeaderWithReporting,
  )
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Set CSRF cookie if not already present
  if (!request.cookies.get(CSRF_COOKIE_CONFIG.name)) {
    const token = await generateCSRFToken()
    response.cookies.set({
      name: CSRF_COOKIE_CONFIG.name,
      value: token,
      httpOnly: CSRF_COOKIE_CONFIG.httpOnly,
      secure: CSRF_COOKIE_CONFIG.secure,
      sameSite: CSRF_COOKIE_CONFIG.sameSite,
      maxAge: CSRF_COOKIE_CONFIG.maxAge,
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Points de vigilance :

- Ne pas mettre `Content-Security-Policy` dans les request headers : c'est un header de réponse, lu par le navigateur uniquement sur la réponse HTTP.
- Le request header utile est seulement `x-nonce`, pour rendre le nonce accessible aux Server Components et à la mécanique interne de Next si elle le supporte.
- La CSP doit être posée dans les response headers (`Content-Security-Policy` ou `Content-Security-Policy-Report-Only`).
- Vérifier explicitement que Next nonce bien ses scripts internes dans le HTML généré. Si ce n'est pas le cas, l'approche nonce devra être ajustée.
- Le matcher actuel exclut `_next/static`, `_next/image` et `favicon.ico`, ce qui est acceptable pour une CSP destinée aux documents/routes applicatives. Les chunks JS servis depuis `_next/static` n'ont pas besoin d'un header CSP propre pour être autorisés par le document parent, mais cette exclusion doit rester documentée pour audit.

### Étape 4 — Passer le nonce au JSON-LD dans `app/layout.tsx`

Modifier `app/layout.tsx` pour lire `x-nonce` et l'ajouter au `<script type="application/ld+json">`.

Pseudo-implémentation :

```tsx
import { cookies, headers } from 'next/headers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const headersList = await headers()
  const csrfToken = cookieStore.get(CSRF_COOKIE_CONFIG.name)?.value || ''
  const nonce = headersList.get('x-nonce') || undefined

  // ... jsonLd

  return (
    <html lang="en">
      <head>
        {/* ... */}
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

### Étape 5 — Compléter `next.config.ts` pour SEC-002

Même si la CSP est gérée dans `proxy.ts`, compléter `next.config.ts` avec les options de sécurité Next attendues par SEC-002 :

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
```

Ne pas dupliquer la CSP dans `next.config.ts`, car elle dépend du nonce par requête.

### Étape 6 — Cas Vercel Analytics / Speed Insights

Ne rien ajouter pour l'instant, car les dépendances ne sont pas utilisées côté client.

Si plus tard on ajoute :

```tsx
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
```

alors il faudra :

1. refaire l'inventaire réseau en production ;
2. ajouter uniquement les domaines réellement observés dans `script-src` / `connect-src` ;
3. valider dans DevTools Network + Console.

Ne pas préautoriser `https://va.vercel-scripts.com` ou `https://vitals.vercel-insights.com` sans preuve qu'ils sont nécessaires.

### Étape 7 — Tester en local

1. `npm run dev`
2. Ouvrir `http://localhost:3000`
3. DevTools → Console : vérifier l'absence d'erreurs CSP bloquantes.
4. Vérifier le rendu : styles, police Inter, animations, chat, Job Matcher.
5. Tester `/api/chat` via l'UI.
6. Tester `/api/job-match` via l'UI.
7. Inspecter les headers :

```bash
curl -sI http://localhost:3000 | grep -Ei 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|x-powered-by'
curl -s http://localhost:3000 | grep -o '<script[^>]*>'
```

Résultat attendu :

- `Content-Security-Policy` ou `Content-Security-Policy-Report-Only` présent selon le mode ;
- `X-Frame-Options: DENY` présent ;
- `X-Content-Type-Options: nosniff` présent ;
- `Referrer-Policy: strict-origin-when-cross-origin` présent ;
- pas de `X-Powered-By` ;
- les scripts inline/applicatifs attendus portent un attribut `nonce="..."` ;
- vérifier qu'aucun handler inline de type `onclick=`, `onerror=`, etc. n'est présent dans le HTML généré.

### Étape 8 — Tester en build production

Validation principale :

```bash
npm run lint
npm run build
npm start
```

Puis, dans un autre terminal :

```bash
curl -sI http://localhost:3000 | grep -Ei 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|x-powered-by'
curl -sI http://localhost:3000/opengraph-image.png
curl -s http://localhost:3000 | grep -o '<script[^>]*>'
```

Vérifications spécifiques nonce :

- le script JSON-LD contient `nonce="..."` ;
- les scripts internes Next nécessaires à l'hydratation portent un nonce, ou aucune violation CSP ne bloque leur exécution ;
- si des scripts internes Next sans nonce sont bloqués, ne pas merger : définir un fallback documenté (`strict-dynamic` ajusté, hash-based si stable, ou CSP moins stricte explicitement acceptée).

Dans le navigateur :

- zéro violation CSP en console ;
- hydratation React fonctionnelle ;
- chat fonctionnel ;
- Job Matcher fonctionnel ;
- JSON-LD toujours présent dans le HTML ;
- police Inter et styles OK.

### Étape 9 — Validation CSP externe

Tester la policy finale avec CSP Evaluator ou équivalent.

Points attendus :

- pas de `script-src 'unsafe-inline'` ;
- pas de `unsafe-eval` en production ;
- `object-src 'none'` ;
- `base-uri 'self'` ;
- `frame-ancestors 'none'` ;
- `script-src-attr 'none'` ;
- `'strict-dynamic'` présent ou retrait justifié par les tests ;
- en mode enforcing final, pas de directive report-only seule oubliée.

## Critères de fin

- [ ] CSP avec nonce dynamique présente sur les routes applicatives.
- [ ] Pas de `script-src 'unsafe-inline'` en production.
- [ ] Pas de `script-src 'unsafe-eval'` en production.
- [ ] Phase report-only effectuée ou validation production locale approfondie documentée.
- [ ] `Content-Security-Policy` présent dans les headers de réponse en mode final enforcing.
- [ ] `X-Frame-Options: DENY` présent.
- [ ] `X-Content-Type-Options: nosniff` présent.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` présent.
- [ ] `X-Powered-By` absent.
- [ ] `poweredByHeader: false` configuré.
- [ ] `reactStrictMode: true` configuré.
- [ ] `x-nonce` propagé au layout et au JSON-LD.
- [ ] Scripts Next internes vérifiés : nonce présent ou absence prouvée de blocage CSP.
- [ ] Zéro violation CSP bloquante en production build.
- [ ] Chat `/api/chat` fonctionnel.
- [ ] Job Matcher `/api/job-match` fonctionnel.
- [ ] Polices Inter et styles chargés correctement.
- [ ] `npm run lint` passe.
- [ ] `npm run build` passe.
- [ ] Policy validée avec CSP Evaluator.

## À ne PAS faire

- Ne pas ajouter `script-src 'unsafe-inline'` en production sauf décision explicite de fallback.
- Ne pas ajouter `unsafe-eval` en production.
- Ne pas mettre `Content-Security-Policy` dans les request headers : seul `x-nonce` doit y être ajouté.
- Ne pas préautoriser les domaines Vercel Analytics tant que les composants ne sont pas montés et vérifiés.
- Ne pas créer de `middleware.ts` : le projet utilise déjà `proxy.ts`.
- Ne pas déplacer la logique CSRF existante hors de `proxy.ts`.
- Ne pas dupliquer une CSP statique dans `next.config.ts` si la CSP nonce est gérée dans `proxy.ts`.
- Ne pas passer en enforcing sans avoir vérifié les scripts générés par Next et/ou une phase report-only.
- Ne pas marquer SEC-002 terminé sans `poweredByHeader: false`, `reactStrictMode: true`, `X-Frame-Options`, `X-Content-Type-Options` et `Referrer-Policy`.

## Risques

- **Nonce mal propagé** : si `x-nonce` n'est pas injecté dans les request headers, `app/layout.tsx` ne pourra pas noncer le JSON-LD.
- **Scripts internes Next non noncés** : si Next 16 ne propage pas automatiquement le nonce aux scripts d'hydratation/RSC, l'application peut casser sous CSP enforcing. Vérifier le HTML généré avant merge et prévoir un fallback documenté.
- **Dev server** : `npm run dev` peut nécessiter `unsafe-eval` et WebSocket ; ne pas calquer ces permissions sur la production.
- **Styles inline** : `style-src 'unsafe-inline'` reste un compromis assumé. À durcir séparément si une validation sécurité l'exige.
- **Analytics futurs** : si Vercel Analytics/Speed Insights sont ajoutés plus tard, la CSP devra être ajustée après observation réelle des domaines utilisés.
- **Matcher proxy** : les assets `_next/static` n'auront pas forcément les mêmes headers ; c'est acceptable pour ce ticket, mais à documenter si un audit demande des headers uniformes sur absolument toutes les réponses.
- **Report-only** : sans endpoint `/api/csp-report`, les violations ne seront pas centralisées. À défaut, faire une validation navigateur/build plus stricte avant enforcing.

## Fichiers touchés

- `proxy.ts` — ajout nonce CSP + headers de sécurité, en conservant le CSRF.
- `app/layout.tsx` — lecture du nonce et ajout au JSON-LD inline.
- `next.config.ts` — `poweredByHeader: false`, `reactStrictMode: true`.
- `app/api/csp-report/route.ts` — optionnel, seulement si la phase report-only avec collecte serveur est retenue.
- `projet-state.md` — marquer SEC-001 ✅ après validation complète ; marquer SEC-002 ✅ seulement si tous les éléments listés sont bien implémentés.

## Vérification finale

```bash
npm run lint && npm run build
npm start
curl -sI http://localhost:3000 | grep -Ei 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|x-powered-by'
```

Validation attendue : CSP présente, sans `unsafe-inline` ni `unsafe-eval` dans `script-src` en production, et application fonctionnelle sans violation CSP bloquante.
