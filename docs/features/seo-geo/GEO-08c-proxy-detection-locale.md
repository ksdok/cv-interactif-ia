# GEO-08c — Détection de locale + redirect dans `proxy.ts`

- **Priorité** : P2 · **Effort** : S · **Statut** : ⬜
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
   `Accept-Language` préfixe `en-*` → `en`, sinon `fr` (fallback marché cible). Consommé
   par le root layout pour `<html lang>` (option A).
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