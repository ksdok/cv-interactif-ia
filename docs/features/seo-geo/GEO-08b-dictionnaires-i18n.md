# GEO-08b — Dictionnaires i18n `lib/i18n/` + composants en props

- **Priorité** : P2 · **Effort** : M · **Statut** : ✅ (2026-09-12, branche
  `feat/geo-08-i18n` ; déviations documentées ci-dessous)
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

## Notes d'implémentation (2026-09-12)

- **`as const` non utilisé dans `fr.ts`** : avec `as const`, `typeof fr` donnerait
  des types littéraux et `const en: Dictionary = {...}` exigerait des chaînes
  strictement identiques au FR — l'intention review N4 (clé manquante en `en.ts`
  = erreur de compilation) est préservée par le match structurel sur valeurs
  élargies `string`. Testé : retrait de la clé `notFound.back` en `en.ts` →
  `error TS2741`, puis restauration.
- **`lib/i18n/dictionaries.ts` ajouté** (hors liste « Fichiers impactés » de la
  spec) : `getDictionary(lang)` — évite d'importer `fr`/`en` dans `config.ts`
  (qui est aussi bundle edge via `proxy.ts`). Usage serveur uniquement ; les
  composants client reçoivent le dict en props.
- **Wording metadata/JSON-LD non déplacé dans le dictionnaire** (spec point 2) :
  il vit dans `lib/site.ts` (source unique, leçon M1 de la review 08a) — sa
  déclinaison par locale est GEO-08d. Dupliquer dans le dictionnaire créerait
  deux sources de vérité.
- **`/cv`** reçoit le dictionnaire EN en import serveur direct (`import en from
  '@/lib/i18n/en'`) — page EN fast-path jusqu'à GEO-08h.
- **Règle ESLint `react/jsx-no-literals`** activée sur `app/` + `components/`
  (children texte uniquement, `ignoreProps: true`), allow-list : `—`, `%`,
  `404`, `*`. Probe de validation : un composant temporaire avec texte en dur
  a bien été flaggé, puis supprimé.
- **Critère 4 — rendu client** : la partie serveur est mesurée (429 →
  `errorCode: "RATE_LIMIT"`) ; le rendu FR côté navigateur (mapping
  `dictionary.apiErrors`) est vérifié par lecture du code — la vérification
  navigateur complète attend un déclenchement réel côté prod.
- **Mailto « Contact Me »** (JobMatcher) : corps d'e-mail EN conservé tel quel
  (template literal dans href, non visible en UI) — à réévaluer à GEO-08h.
- **`language: locale`** envoyé par JobMatcher mais ignoré par la route
  job-match : l'analyse IA reste EN — à traiter avec GEO-08g (chat multilingue).