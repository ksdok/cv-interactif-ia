# GEO-08c — Détection de locale + redirect dans `proxy.ts`

- **Priorité** : P2 · **Effort** : S · **Statut** : ✅ (2026-09-12, branche
  `feat/geo-08-i18n`, livré avec GEO-08a + 08e en un seul déploiement — review B2 ;
  étape 2 corrigée review M2, voir ci-dessous)
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08a (les cibles `/fr`, `/en` doivent exister)

## Pourquoi

Sans redirect, `/` est un 404 après la migration GEO-08a (la page racine a disparu) et les
visiteurs doivent taper la locale à la main. La détection doit aussi poser le header
`x-locale` consommé par le root layout (option A de GEO-08a).

## Comment

**Ordre explicite dans `proxy.ts`** (review B3 — « en amont de la CSP » seul est ambigu ;
le redirect host SEO-04 est déjà le premier bloc, `proxy.ts:44-52`) :

1. **Redirect host SEO-04** (existant, inchangé) : `vercel.app` → `kimsandok.com` (301/308
   par méthode). DOIT rester premier, sinon chaîne de 2 sauts
   (`vercel.app/ →308→ vercel.app/fr →301→ kimsandok.com/fr`).
2. **Pose du header `x-locale`** (pour les requêtes de pages non redirigées) :
   🔄 **corrigé review M2 (2026-09-12)** : le **préfixe de chemin gagne
   TOUJOURS** (`/en*` → `en`, fallback `fr`) — `Accept-Language` ne doit PAS
   nourrir `x-locale`, sinon `/fr` visité depuis un navigateur EN rendrait
   `<html lang="en">` (violerait le critère 1 de 08a et hreflang).
   `Accept-Language` sert uniquement à choisir la cible du redirect de /
   (étape 3). Cas `/cv` : `x-locale: en` tant que GEO-08h n'est pas livré
   (revue M4 — contenu EN fast-path). Consommé par le root layout pour
   `<html lang>` (option A).
3. **Détection/redirect de locale sur `/`** :
   - path déjà préfixé (`/fr/...`, `/en/...`) → laisser passer ;
   - sinon → **307** vers `/<locale>` + **`Vary: Accept-Language`**.
   - **Pas de 308/301** : la cible dépend d'un header de négociation, elle n'est pas
     permanente pour une URL donnée — les codes permanents sont cacheables par défaut
     (risque : un cache partagé sert la mauvaise locale à tout le monde). 307 préserve la
     méthode et n'est pas permanent (review B2 ; `NextResponse.redirect()` a 307 par défaut).
   - **Pas de branche cookie `NEXT_LOCALE`** (review M3 — code mort : aucune occurrence
     dans le code, et GEO-08f ne pose pas le cookie). Réintroduire seulement si un
     composant se met à poser ce cookie, avec alors `Vary: Cookie` +
     `Cache-Control: private, no-store`.
4. Génération nonce/CSP puis logique CSRF — inchangées, et seulement pour les requêtes
   non redirigées (return early sur redirect → pas de nonce gaspillé).

**Routes exclues du redirect** (≠ « exclues du proxy » — review N1 : ces routes continuent
de passer par `proxy.ts` pour CSP/CSRF, c'est voulu) : `/api/*`, `/robots.txt`,
`/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, `opengraph-image*`, `/_next/*`,
`/_vercel/*`, `favicon.ico` (déjà exclu par le matcher du proxy), et `/cv` tant que
GEO-08h n'est pas livré (sinon la page EN existante casse).

## Fichiers impactés

- `proxy.ts`

## Résultat attendu

`/` redirige (307) vers la locale de l'utilisateur (ou `fr` par défaut) ; aucun saut
intermédiaire sur le domaine vercel.app ; le nonce/CSP/CSRF restent intacts.

## Critères d'acceptation

1. `/` sans Accept-Language → 307, `Location: /fr`, et header `Vary: Accept-Language`
   présent (`curl -sI`).
2. `/` avec `Accept-Language: en-GB,en;q=0.9` → 307 `Location: /en`.
3. **Pas de chaîne** : `curl -sI -H "Host: xxx.vercel.app"` (ou depuis l'URL preview
   vercel.app) sur `/` → **un seul saut** (301/308) vers `kimsandok.com`, jamais
   `vercel.app/fr` en intermédiaire.
4. `/robots.txt`, `/sitemap.xml`, `/cv` → pas de redirect ; `/api/chat` en **POST** →
   code normal, en GET → 405 (review N2 — écrire 405, pas « 200 »).
5. Le HTML d'une page non redirigée contient toujours la meta CSRF (régression CSP/CSRF
   exclue) ; `/fr` et `/en` rendent `lang` conforme à l'URL (consommation du `x-locale`).
## Notes d'implémentation (2026-09-12)

- **Ordre réel dans `proxy.ts`** (conforme au review B3/M3) : ① redirect host
  SEO-04 → ② pose `x-locale` → ③ redirect 307 de `/` (return early — pas de
  nonce gaspillé) → ④ nonce/CSP + CSRF. L'étape 4 du « Comment » ci-dessus est
  respectée : les redirections retournent avant la génération du nonce.
- **Exclusions du redirect** : seul `/` est redirigé — les routes listées
  (N1) ne sont jamais redirigées de fait (`pathname !== '/'`) et continuent de
  passer par le proxy pour CSP/CSRF, comme spécifié.
- **Pas de rewrite 404 côté proxy** : testé pendant la review B1 puis retiré —
  `NextResponse.rewrite(url, { status: 404 })` donne le bon statut mais bypass
  les frontières not-found custom (404 par défaut servi) et le corps streamé
  contenait la homepage. La protection anti-soft-404 vit dans
  `app/[lang]/page.tsx` (voir GEO-08a, mise à jour review).
- Mesures : `/` sans AL → 307 `Location: /fr` + `Vary: Accept-Language` ;
  `/` avec `Accept-Language: en-GB` → 307 `/en` ; `/robots.txt`, `/sitemap.xml`,
  `/cv`, `/api/health` → pas de redirect ; `/api/chat` GET → 405 ; pas de
  chaîne de sauts sur vercel.app (redirect host inchangé, premier bloc).
