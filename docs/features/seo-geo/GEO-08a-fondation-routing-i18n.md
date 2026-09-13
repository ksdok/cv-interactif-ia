# GEO-08a — Fondation routing i18n : `app/[lang]/` (option A : root layout conservé)

- **Priorité** : P2 · **Effort** : M · **Statut** : ✅ (2026-09-12, branche
  `feat/geo-08-i18n`, option A + x-locale par préfixe de chemin)
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) (décision
  Option B, 2026-09-10) · **Dépendances** : aucune (premier maillon de la chaîne)

## Pourquoi

GEO-08 est trop gros pour un seul PR (routing + dictionnaires + redirect + SEO + chat).
Ce ticket est la fondation sans laquelle aucun wording bilingue n'est visible : créer le
segment dynamique de locale qui sert les pages `/fr` et `/en` (et rien d'autre).

**Décision architecture (review specs B1, 2026-09-12) : option A — le root layout
`app/layout.tsx` est CONSERVÉ (minimal) et la locale lui est injectée via un header
`x-locale` posé par `proxy.ts`** (pattern du `x-nonce` existant). Raison : déplacer le
root layout sous `app/[lang]/` casse le build — `app/cv/page.tsx` (SEO-03, live) n'aurait
plus de root layout (« app/cv/page.tsx doesn't have a root layout » — erreur fatale
Next 16), et un layout nested ne peut pas porter `<html>`.

## Comment

1. Déplacer le contenu de `app/page.tsx` dans `app/[lang]/page.tsx`.
2. **`app/layout.tsx` reste le root layout** (`<html>/<body>`) — `<html lang>` dynamique :
   `const lang = (await headers()).get('x-locale') ?? 'fr'`. **Checklist d'inventaire des
   exports actuels du layout à préserver** (review B4 — tout ce qui manque ici est une
   régression silencieuse) :
   - `export const viewport` (TECH-10) — sortie identique par défaut, mais re-déclaré par
     explicitation (leçon review TECH-10 F5) ;
   - **`metadataBase` — prérequis DUR de GEO-08d** : sans lui, `alternates.languages` /
     `canonical` relatifs ne se résolvent pas en absolu → hreflang invalide pour Google ;
   - `keywords` (wording SEO-01) ;
   - `openGraph` / `twitter` (cartes sociales) ;
   - `robots: { index, follow, max-image-preview… }` (directives googleBot) ;
   - `alternates.canonical` (SEO-04) — délégué à GEO-08d pour la version par locale, mais
     **ne pas perdre** le canonical entre les deux tickets ;
   - JSON-LD Person / ProfessionalService (migré vers `[lang]` au GEO-08d, pas ici) ;
   - meta CSRF (double-submit) + fonts + `globals.css`.
3. `app/[lang]/layout.tsx` (nested, SANS `<html>`) : charge le dictionnaire (GEO-08b) et
   les metadata par locale.
4. `generateStaticParams` → `[{ lang: 'fr' }, { lang: 'en' }]` + `dynamicParams = false`.
5. Supprimer `app/page.tsx` racine.
6. **Page 404 localisée** (review M2) : `dynamicParams = false` produit des 404
   pour `/de`, `/es` — ⚠️ **mise à jour review 2026-09-12** : la frontière ne
   peut PAS vivre dans `app/[lang]/` (un param `[lang]` invalide rejette le
   segment entier avant rendu, sa frontière n'est jamais montée). Elle est
   implémentée à la racine : `app/not-found.tsx`, locale-aware via le header
   `x-locale` (couvre aussi `/fr/cv` avant GEO-08h, qui recevait sinon le 404
   par défaut anglais). (Note : `app/global-error.tsx` n'existe pas dans ce
   projet — review M2 ; rien à faire.)
7. **`app/cv/**` inchangé** : la page SEO-03 continue de tourner tel quel (elle garde le
   root layout). Sa migration bilingue est GEO-08h. À ce stade (avant GEO-08b), les deux
   locales affichent le même contenu EN en dur — assumé et temporaire, livré avec
   GEO-08b en un seul déploiement si possible (voir point de vigilance GEO-08).

## Fichiers impactés

- `app/[lang]/page.tsx` (wrapper server + validation), `app/[lang]/Home.tsx`
  (contenu client déplacé), `app/[lang]/layout.tsx` (nested, nouveau),
  `app/not-found.tsx` (racine — voir point 6 révisé)
- `app/page.tsx` (supprimé)
- `app/layout.tsx` (conservé, minimal — `<html lang>` via `x-locale` ; inventory checklist
  ci-dessus à cocher)
- `proxy.ts` (pose le header `x-locale` — coordonner avec GEO-08c, qui le spécifie)

## Résultat attendu

`/fr` et `/en` servent la page (contenu identique, provisoirement EN) avec un `<html lang>`
**suivant la locale demandée** (pas une constante) ; `/es` → 404 localisée ; `/cv` et les
API ne sont pas affectées.

## Critères d'acceptation

> 🔄 **Mise à jour review 2026-09-12 (B1, itérations 1→3)** — la note initiale
> (200 des 404 « préexistant sur main, cause : rewrite de headers du proxy »)
> était fausse sur la cause racine (mesure contaminée par un vieux serveur sur
> le port 3000) et a été retirée :
>
> - **Cause réelle du soft-404 (200 au lieu de 404)** : le rejet du param
>   `[lang]` — d'abord via `dynamicParams = false`, ensuite via `notFound()` —
>   est résolu par Next 16 APRÈS le flush du shell : le HTML brut contenait la
>   homepage (rendu `[lang]`) et le 404 n'arrivait qu'en payload RSC (swap
>   client). Le proxy n'était ni la cause ni le remède (rewrite 404 testé puis
>   retiré : statut correct mais corps dégradé, frontières custom bypassées).
> - **Correctif retenu** : wrapper server `app/[lang]/page.tsx` (contenu client
>   déplacé dans `Home.tsx`) + `notFound()` levé avant tout rendu → `/de`,
>   `/zzz`, `/fr/cv` → **404 avec un corps propre** (plus de homepage). Le HTML
>   brut des params invalides reste le document d'erreur minimal `__next_error__`
>   de Next 16 (sans root layout) ; la page localisée est livrée via RSC et
>   rendue par les navigateurs — comportement structurel documenté, statut HTTP
>   correct pour les crawlers.
> - `dynamicParams = false` **retiré** du layout (le rejet pré-rendu produisait
>   un shell sans meta CSRF ni `<html lang>`) ; `generateStaticParams` conservé
>   (critère 3). Testé : ce n'est pas lui le déclencheur du `__next_error__`.
> - **M5 (acté)** : `/fr` et `/en` restent dynamiques (ƒ — nonce/CSRF via root
>   layout, `Cache-Control: private, no-store` préexistant) ; pas de HTML
>   statique par locale. Les ambitions statiques de 08d/08e devront trancher.
> - **B2** : GEO-08c (redirect `/`) et GEO-08e (sitemap) livrés sur la même
>   branche — plus d'URL morte au déploiement.
> - **B3** : canonical + og:url par locale posés dès maintenant dans
>   `app/[lang]/layout.tsx` (`generateMetadata`), absorbera GEO-08d.
> - **M1** : `lib/i18n/config.ts` = source de vérité unique des locales
>   (importée par proxy, root layout, `[lang]`, not-found, sitemap).
> - **M4** : `/cv` → `x-locale: en` côté proxy (contenu EN fast-path) —
>   `<html lang>` aligné sur le contenu jusqu'à GEO-08h.

1. **Couple** (review M1 — la prod sert déjà `lang="fr"` aujourd'hui, le critère seul est
   faible) : `/fr` → 200 + `<html lang="fr">` **et** `/en` → 200 + `<html lang="en">`
   (grep -o sur le HTML servi). `lang` suit la locale de l'URL, pas une constante.
2. `curl -s -o /dev/null -w "%{http_code}" localhost:3000/de` → 404, avec page not-found
   localisée (⚠️ révisé : `app/not-found.tsx` à la racine, voir point 6).
3. `next build` ne génère que `fr` et `en` pour le segment `[lang]`, et le build reste
   vert **avec `app/cv` intact** (aucune erreur « root layout »).
4. Meta CSRF présente + **une seule** meta viewport + `metadataBase` résolu
   (`<meta property="og:url" content="https://kimsandok.com...">`) dans le HTML servi.
5. `curl -s localhost:3000/cv` → 200 inchangé (aucune régression SEO-03).
6. `npm run lint` + `npm run build` propres.