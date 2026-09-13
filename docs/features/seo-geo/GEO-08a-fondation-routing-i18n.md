# GEO-08a — Fondation routing i18n : `app/[lang]/` (option A : root layout conservé)

- **Priorité** : P2 · **Effort** : M · **Statut** : ⬜
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
6. **`app/[lang]/not-found.tsx` localisé** (review M2) : `dynamicParams = false` produit
   des 404 pour `/de`, `/es` — sans ce fichier, la page 404 est non localisée.
   (Note : `app/global-error.tsx` n'existe pas dans ce projet — revue M2 ; rien à faire.)
7. **`app/cv/**` inchangé** : la page SEO-03 continue de tourner tel quel (elle garde le
   root layout). Sa migration bilingue est GEO-08h. À ce stade (avant GEO-08b), les deux
   locales affichent le même contenu EN en dur — assumé et temporaire, livré avec
   GEO-08b en un seul déploiement si possible (voir point de vigilance GEO-08).

## Fichiers impactés

- `app/[lang]/page.tsx` (déplacé), `app/[lang]/layout.tsx` (nested, nouveau),
  `app/[lang]/not-found.tsx` (nouveau)
- `app/page.tsx` (supprimé)
- `app/layout.tsx` (conservé, minimal — `<html lang>` via `x-locale` ; inventory checklist
  ci-dessus à cocher)
- `proxy.ts` (pose le header `x-locale` — coordonner avec GEO-08c, qui le spécifie)

## Résultat attendu

`/fr` et `/en` servent la page (contenu identique, provisoirement EN) avec un `<html lang>`
**suivant la locale demandée** (pas une constante) ; `/es` → 404 localisée ; `/cv` et les
API ne sont pas affectées.

## Critères d'acceptation

1. **Couple** (review M1 — la prod sert déjà `lang="fr"` aujourd'hui, le critère seul est
   faible) : `/fr` → 200 + `<html lang="fr">` **et** `/en` → 200 + `<html lang="en">`
   (grep -o sur le HTML servi). `lang` suit la locale de l'URL, pas une constante.
2. `curl -s -o /dev/null -w "%{http_code}" localhost:3000/de` → 404, avec page not-found
   localisée (`app/[lang]/not-found.tsx`).
3. `next build` ne génère que `fr` et `en` pour le segment `[lang]`, et le build reste
   vert **avec `app/cv` intact** (aucune erreur « root layout »).
4. Meta CSRF présente + **une seule** meta viewport + `metadataBase` résolu
   (`<meta property="og:url" content="https://kimsandok.com...">`) dans le HTML servi.
5. `curl -s localhost:3000/cv` → 200 inchangé (aucune régression SEO-03).
6. `npm run lint` + `npm run build` propres.