# GEO-08e — Sitemap bilingue avec `alternates.languages`

- **Priorité** : P2 · **Effort** : XS · **Statut** : ✅ (2026-09-12, branche
  `feat/geo-08-i18n`, livré avec 08a + 08c — review B2)
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08a (les routes `/fr`, `/en` doivent exister) ;
  GEO-08d recommandé (hreflang cohérent avec le sitemap)

## Pourquoi

Le sitemap actuel liste l'URL racine. Après migration bilingue, chaque page existe en 2
versions — le sitemap doit les déclarer avec leurs annotations `alternates.languages`
pour que Google découvre les paires hreflang directement depuis le sitemap.

## Comment

1. `app/sitemap.ts` : entrées `/fr` et `/en` (puis `/fr/cv`, `/en/cv` quand **GEO-08h**
   est migré), chacune avec
   `alternates: { languages: { fr: '...', en: '...', 'x-default': '...' } }`
   (review N3 — `x-default` inclus pour la parité avec le hreflang HTML).
2. Format Next : `url`, `lastModified`, `alternates.languages` — la sortie sitemap.xml
   expose alors `xhtml:link rel="alternate" hreflang=...` par entrée.
3. Garder le `SITE_URL` canonique (`https://kimsandok.com`) — pas d'URL vercel.app
   (cohérence SEO-04).

## Fichiers impactés

- `app/sitemap.ts`

## Résultat attendu

`/sitemap.xml` liste les 2 locales (et les pages CV quand migrées) avec hreflang par
entrée.

## Critères d'acceptation

> 🔄 **Note d'implémentation (2026-09-12, review Lot 0 M1)** : mesuré **3**
> entrées `<loc>` — `/fr`, `/en` **et `/cv`** (préexistante sur main, conservée
> tant que GEO-08h n'a pas migré la page CV : la retirer priverait d'indexation
> une page indexée). Le critère « 2 entrées » ci-dessous s'entend pour les
> entrées localisées ; GEO-08h portera le total à 5 (`/fr/cv`, `/en/cv` en plus,
> retrait de `/cv`).

1. `curl -s localhost:3000/sitemap.xml` contient 2 entrées `<loc>` (une `/fr`, une `/en`)
   — review N3 : compter les `<loc>` (grep -o '<loc>' | wc -l), pas `grep -o '/fr'`
   (qui compte aussi les entrées alternates).
2. Chaque entrée porte `xhtml:link rel="alternate"` avec `hreflang="fr"`,
   `hreflang="en"` **et** `hreflang="x-default"` (grep -o).
3. `sitemap.xml` reste non-redirigé par proxy (GEO-08c exclusions) et reste valide XML.