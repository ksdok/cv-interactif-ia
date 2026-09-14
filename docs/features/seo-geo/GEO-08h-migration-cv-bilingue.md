# GEO-08h — Migration `/cv` bilingue (`/fr/cv`, `/en/cv`) + 301

- **Priorité** : P2 · **Effort** : S · **Statut** : ⬜
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08a (routing), GEO-08b (dictionnaires), GEO-08d (pattern
  hreflang/canonical) · **Retire** l'exclusion `/cv` de GEO-08c

## Pourquoi

`/cv` est live (SEO-03, fast-path EN) et indexée : listée dans `app/sitemap.ts` et servie
en prod. Le corpus exige les deux versions (`/fr/cv`, `/en/cv` — critère 4 du parent).
Sous l'option A (root layout conservé, review B1), `/cv` peut tourner tel quel — mais tant
qu'il n'est pas migré : une seule langue, pas de hreflang, exclusion du redirect, et le
wording « Product Designer » à remplacer par le positionnement BA freelance (convention
corpus, note 🔗 SEO-03).

## Comment

1. Déplacer `app/cv/**` sous `app/[lang]/cv/**` (root layout commun conservé — option A ;
   plus d'erreur « root layout » possible).
2. Metadata de la page CV re-déclinées par dictionnaire (GEO-08b) : wording BA freelance
   dans les 2 langues (le keyword cible « Product Designer » du backlog n°10 est
   remplacé, cf. convention corpus).
3. **Redirect `301 /cv → /fr/cv`** dans `proxy.ts` (review B1 : l'URL est indexée — pas de
   404, pas de 302/308, sinon perte de l'URL déjà indexée, ce qui contredit SEO-03).
   Retirer l'exclusion `/cv` de GEO-08c.
4. `alternates.languages` + canonical par page CV (pattern GEO-08d).
5. Sitemap (GEO-08e) : ajouter `/fr/cv`, `/en/cv` avec `alternates.languages` ; retirer
   `/cv` de `app/sitemap.ts`.
6. Contenu : le contenu CV EN figé (fast-path SEO-03) devient le contenu de `/en/cv` ;
   le FR provient de `data/cv.md` / dictionnaire.

## Fichiers impactés

- `app/[lang]/cv/page.tsx` (déplacé depuis `app/cv/`), `app/cv/` (supprimé)
- `proxy.ts` (301 `/cv` → `/fr/cv`, retrait de l'exclusion)
- `app/sitemap.ts` (entrées CV bilingues)
- `lib/i18n/*` (contenu CV localisé)

> 🔄 **Ajout 2026-09-12 (review Lot 0, M5)** : `/cv` lit encore
> `process.env.NEXT_PUBLIC_SITE_URL` (préexistant sur main, exception à la
> source unique `lib/site.ts`) — résorber ici lors de la migration.

## Résultat attendu

`/fr/cv` et `/en/cv` indexables, liées par hreflang ; l'URL `/cv` déjà indexée est
préservée par un 301 permanent.

## Critères d'acceptation

1. `/fr/cv` et `/en/cv` → 200 avec contenu localisé (et `<html lang>` conforme, via
   `x-locale`).
2. `/cv` → **301** `Location: /fr/cv` (pas 404, pas 302/308).
3. Les 2 pages CV portent `hreflang` fr/en/x-default et un canonical absolu
   (`metadataBase` — prérequis 08a).
4. `sitemap.xml` contient `/fr/cv` et `/en/cv` (avec alternates) et **ne liste plus** `/cv`.
5. `npm run lint` + `npm run build` propres.
## Notes tracées à la review du Lot 1 (GEO-08d, 2026-09-12)

- **N3** : sur /cv (pré-existant), `og:title`/`og:description` sont EN (page) mais
  `twitter:title`/`twitter:description` restent FR (root layout), et `og:locale`
  vaut `fr_FR` — à aligner sur EN lors de la migration (ou à remplacer par le
  metadata du segment [lang] une fois `/cv` sous `[lang]`).
- La page `/cv` redéclare `openGraph` sans images jusqu'à maintenant : corrigé au
  passage de la review M3 (images explicites) ; après migration, le metadata
  `[lang]`/page reprendra la main (og:image alt traduit, alternateLocale).
