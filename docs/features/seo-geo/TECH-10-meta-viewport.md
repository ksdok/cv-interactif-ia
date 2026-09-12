# TECH-10 — Dédoublonner la meta viewport

- **Priorité** : P3 · **Effort** : XS (< 15 min) · **Statut** : 🟡 en cours (2026-09-12 — code livré local, commit 6e856cb : viewport via export Next.js, maximumScale retiré, JobMatcher textarea à 16px plancher garanti ; vérification prod des critères 2/3 à faire après déploiement)
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
- `components/JobMatcher.tsx` — seul champ sous le seuil iOS 16px à la relecture
  (textarea `text-sm` → `text-base`)
- `components/ChatPreview.tsx` — **déjà conforme** (input `text-xl` = 20px), aucune
  modif nécessaire ; conservé ici pour tracer le périmètre « tout champ de saisie »
  et le plancher `max()` ajouté en review

## Résultat attendu

Une seule meta viewport dans le HTML servi ; zoom utilisateur préservé (a11y) ; pas de zoom
iOS involontaire sur focus input (via font-size 16px).

## Critères d'acceptation

1. `curl -s https://kimsandok.com | grep -o 'name="viewport"' | wc -l` → **1**.
   ⚠️ Ne pas utiliser `grep -c` : il compte les **lignes**, pas les occurrences — le HTML
   Next est minifié sur une seule ligne, donc le critère initial passait à 1 même avec
   2 metas (défaut détecté en review).
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
- **État prod au 2026-09-12 (après deploy 5fb593a)** : ✅ critère n°1 vérifié —
  `grep -o 'name="viewport"' | wc -l` → 1, `maximum-scale` absent. Critères 2/3
  restent à vérifier (device iOS + Lighthouse).
- Review 2026-09-12 (commit initial e5600d2, amendé en 6e856cb) :
  - critère n°1 réécrit (`grep -c` comptait les lignes, pas les occurrences) ;
  - statut ✅ → 🟡 : 2 critères sur 3 non vérifiés en prod au moment du statut initial ;
  - durcissement F6 : plancher `text-[max(Npx,Mrem)]` sur les 2 champs (ChatPreview
    `text-[max(20px,1.25rem)]`, JobMatcher `text-[max(16px,1rem)]`) — remplace la
    proposition `input, textarea { font-size: max(16px, 1rem) }` qui, non layée dans
    globals.css, aurait **écrasé** les utilitaires Tailwind (`text-xl` du chat serait
    passé de 20px à 16px), et dans `@layer base` aurait été silencieusement battue par
    les utilitaires (cascade layers). Les valeurs arbitraires garantissent le plancher
    sans toucher à la spécificité.
- Reste à vérifier manuellement : zoom iOS au focus des champs sur device réel
  (critère 2) et score Lighthouse Accessibility (critère 3) — après déploiement.
