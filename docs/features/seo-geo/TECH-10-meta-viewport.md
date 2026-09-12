# TECH-10 — Dédoublonner la meta viewport

- **Priorité** : P3 · **Effort** : XS (< 15 min) · **Statut** : ✅ (2026-09-12 — viewport via export Next.js, maximumScale retiré, JobMatcher textarea passé à text-base)
- **Dépendances** : aucune — groupable avec SEO-01 (même fichier)

## Pourquoi

Le HTML de production contient **deux** balises `<meta name="viewport">` : celle de
`app/layout.tsx` (avec `maximum-scale=1`) et celle injectée par Next.js. Duplication = signal
de qualité faible + comportement viewport imprévisible selon l'ordre de parsing.
(Accessibilité : `maximum-scale=1, user-scalable=no` bloque aussi le zoom — à discuter.)

## Comment

1. Supprimer la meta viewport manuelle du `<head>` dans `app/layout.tsx`.
2. Utiliser l'export `viewport` de Next.js 16 :
   ```ts
   export const viewport: Viewport = { width: 'device-width', initialScale: 1 }
   ```
   **Retirer `maximumScale: 1`** (recommandé pour l'accessibilité / WCAG 1.4.4 : ne pas
   bloquer le zoom utilisateur). Le `maximumScale: 1` servait à empêcher le zoom iOS sur focus
   input ; l'alternative a11y-friendly est une **`font-size ≥ 16px` sur tous les `<input>` /
   `<textarea>`** (notamment le champ chat) — sinon le retrait de `maximumScale` réintroduit
   le zoom iOS qu'on cherchait à éviter.
3. Appliquer `font-size: 16px` (ou `text-base` Tailwind) sur les inputs du chat
   (`components/ChatPreview.tsx`) et tout autre champ de saisie.
4. La meta CSRF reste telle quelle (hors périmètre).

## Fichiers impactés

- `app/layout.tsx`
- `components/ChatPreview.tsx` (et tout composant contenant un `<input>` / `<textarea>`)
  — passage à `font-size ≥ 16px` pour compenser le retrait de `maximumScale`

## Résultat attendu

Une seule meta viewport dans le HTML servi ; zoom utilisateur préservé (a11y) ; pas de zoom
iOS involontaire sur focus input (via font-size 16px).

## Critères d'acceptation

1. `curl -s https://kimsandok.com | grep -c 'name="viewport"'` → 1.
2. Pas de zoom iOS sur focus de l'input chat (test device réel ou simulateur) — **grâce à la
   `font-size ≥ 16px`** des inputs, non plus via `maximumScale`.
3. Lighthouse Accessibility ne signale plus `maximum-scale=1, user-scalable=no` comme
   blocage de zoom.

## Résultat livré (2026-09-12)

- `app/layout.tsx` : meta manuelle supprimée, export `export const viewport: Viewport =
  { width: 'device-width', initialScale: 1 }` ajouté (sans `maximumScale`).
- `components/JobMatcher.tsx` : textarea passé de `text-sm` (14px) à `text-base` (16px) —
  c'était le seul champ sous le seuil iOS 16px (l'input chat était déjà en `text-xl`).
- Vérifié en local (build prod + `next start`) : 1 seule meta viewport dans le HTML,
  ni `maximum-scale` ni `user-scalable`, meta CSRF intacte, `npm run lint` ✅.
- Reste à vérifier manuellement : zoom iOS au focus des champs sur device réel
  (critère 2) et score Lighthouse Accessibility (critère 3) — après déploiement.
