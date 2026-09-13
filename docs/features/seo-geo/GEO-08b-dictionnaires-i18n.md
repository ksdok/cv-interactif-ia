# GEO-08b — Dictionnaires i18n `lib/i18n/` + composants en props

- **Priorité** : P2 · **Effort** : M · **Statut** : ⬜
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08a (le routing doit exister pour consommer le dictionnaire)

## Pourquoi

Toutes les chaînes visibles sont actuellement en dur (EN) dans les composants
(Header, Hero, ChatPreview, ExperienceGrid, Footer, JobMatcher) et le wording FR de
SEO-01 vit dans `app/layout.tsx` (metadata + JSON-LD). Sans couche dictionnaire, aucun
ticket de wording bilingue (08d/08f, SEO-05, GEO-06) n'est possible.

## Comment

1. `lib/i18n/types.ts` : type dérivé du dictionnaire source — `const fr = {...} as const;`
   puis `type Dictionary = typeof fr`, et `const en: Dictionary = {...}` (review N4 : un
   `interface` écrit à la main laisserait passer une clé absente des deux fichiers ; avec
   la dérivation, une clé manquante en `en.ts` = erreur de compilation).
2. `lib/i18n/fr.ts` + `lib/i18n/en.ts` : objets conformes à `Dictionary`.
   - Source EN : les chaînes actuelles des composants (prod).
   - Source FR : le wording FR de SEO-01 (metadata, JSON-LD, `<html lang>`) + traduction
     des chaînes visibles (Hero, sections, footer, chat placeholder, JobMatcher).
3. `app/[lang]/page.tsx` charge le dictionnaire via `params.lang` et **passe les chaînes
   en props** aux composants client (pattern du plan GEO-08, point 3 — pas de
   `next-intl`, pas de hook contextuel global : rester minimal).
4. Résorber au passage l'incohérence notée à l'INDEX : SEO-01 livré FR / contenu visible
   livré EN — après ce ticket, les deux langues sont alignées par construction.
5. **Messages d'erreur serveur** (review M4) : `lib/rateLimit.ts` / `lib/validation.ts`
   renvoient des messages EN affichés tel quel par `ChatPreview` (`throw new
   Error(data.error)`) → un utilisateur `/fr` verrait « Rate limit exceeded… ». L'API
   renvoie un **`errorCode`** (`'RATE_LIMIT'`, `'VALIDATION'`…) et le **client** mappe le
   code via le dictionnaire — l'API reste agnostique de la langue.

## Fichiers impactés

- `lib/i18n/types.ts`, `lib/i18n/fr.ts`, `lib/i18n/en.ts` (nouveaux)
- `app/[lang]/page.tsx`, `app/[lang]/layout.tsx`
- `components/Header.tsx`, `Hero.tsx`, `ChatPreview.tsx`, `ExperienceGrid.tsx`,
  `Footer.tsx`, `JobMatcher.tsx` (props au lieu de chaînes en dur)
- `lib/validation.ts` + `lib/rateLimit.ts` (retour `errorCode` — M4)

## Résultat attendu

Aucune chaîne visible en dur dans les composants : tout passe par le dictionnaire de la
locale active, y compris les messages d'erreur (mappés côté client depuis un `errorCode`).
`/fr` s'affiche entièrement en français, `/en` en anglais.

## Critères d'acceptation

1. **Aucune chaîne visible en dur** (review N5 — un grep « Ask Nicky\|Experience » donne
   des faux positifs garantis : imports, className, noms propres) : vérifier par lecture
   des composants listés ci-dessus + activer/évaluer une règle ESLint
   (`react/jsx-no-literals` ou équivalent) avec allow-list explicite (noms propres,
   « Nicky »). Le grep simple ne fait pas foi.
2. `/fr` : les textes du Hero/Footer/chat sont en FR ; `/en` : en EN.
3. `npx tsc --noEmit` (review N4 — pas de script `typecheck` dans `package.json`, à
   ajouter ou appeler via npx) échoue si une clé manque dans un des deux dictionnaires
   (test manuel : retirer une clé de `en.ts` → erreur, puis restaurer).
4. Une erreur API (`429` rate limit) affichée côté client dans `/fr` est rendue en
   français via le mapping `errorCode` → dictionnaire (review M4).