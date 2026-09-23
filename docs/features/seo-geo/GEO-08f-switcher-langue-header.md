# GEO-08f — Switcher de langue dans le Header (lien crawlable)

- **Priorité** : P2 · **Effort** : XS · **Statut** : ✅ (2026-09-14, Lot 2)
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08b (le composant reçoit les chaînes par dictionnaire)

## Pourquoi

Sans switcher, un visiteur atterri sur `/fr` ne peut pas atteindre `/en` sans éditer
l'URL. Le plan GEO-08 (point 9) impose un **lien** FR ↔ EN — pas un sélecteur JS complexe
— pour rester crawlable (Google suit les liens, pas les widgets).

## Comment

1. `Header.tsx` reçoit `lang` et un label via props (dictionnaire : « EN » / « FR »).
2. Le lien pointe vers **la même page dans l'autre locale** (pas toujours `/en` depuis
   `/fr`) : déterminer le chemin courant côté serveur (passé depuis le Server Component
   ou via `usePathname` + dérivation de locale côté client — rester simple, un seul path
   de page aujourd'hui).
3. `<a>` natif (pas de onClick JS) — crawlable, prefetch Next ok. En JSX, l'attribut est
   **`hrefLang`** (camelCase, review N6).
4. Accessibilité (review N6) : ce qui compte pour les lecteurs d'écran c'est **`lang`**
   sur le lien — `<a href="/en" hrefLang="en" lang="en" aria-label="Switch to English">`.
5. Le switcher **ne pose pas** de cookie `NEXT_LOCALE` (pas de JS) — la préférence reste
   déduite de l'URL ; cohérent avec GEO-08c qui n'implémente pas de branche cookie
   (review M3 — si un jour un composant pose ce cookie, réintroduire la branche dans 08c
   avec `Vary: Cookie`).

## Fichiers impactés

- `components/Header.tsx`
- `app/[lang]/page.tsx` (passe la locale/chemin au Header)
- `lib/i18n/*` (clé de label si wording)

## Résultat attendu

Un lien visible FR ↔ EN dans le Header, crawlable, qui préserve la page courante.

## Critères d'acceptation

1. `/fr` contient `<a href="/en"` (et inversement) — grep -o.
2. Le lien a `hrefLang`, `lang` et un `aria-label` non vides (review N6).
3. Suivre le lien (`curl -L`) aboutit à la page de l'autre locale (200).
4. Pas de JS requis pour le switch (fonctionne avec JS désactivé).

## Livraison (2026-09-14, Lot 2)

- `Header.tsx` reçoit `lang` (nouveau prop) + dictionnaire (`header.switcherLabel`
  « EN »/« FR », `header.switcherAria` dans la langue **cible** — le lien porte
  `lang={altLang}`, les lecteurs d'écran l'annoncent avec la voix correspondante).
- Chemin courant dérivé côté client via `usePathname` (simple : on retire le
  préfixe de locale et on le remplace) ; href rendu en SSR → fonctionne sans JS.
- Call-sites mis à jour : `app/[lang]/Home.tsx` (locale), `app/[lang]/cv/page.tsx`.
- Vérifié localement : `/fr` contient `<a href="/en" hrefLang="en" lang="en"
  aria-label="Switch to English">` (et inversement), `curl -L` → 200, aucun JS requis.

## Itération 2 (2026-09-14, préférence utilisateur)

- **Switcher FR / EN avec highlight** sur la langue active (préférence
  utilisateur : les deux locales affichées, séparées par « / »), en remplacement
  du lien unique vers l'autre locale.
- Deux `<a>` natifs, tous les deux crawlables (Google découvre les deux locales
  depuis chaque page — améliore le critère 1). La locale active porte
  `aria-current="page"` et reste un lien ; highlight = `font-semibold
  text-on-surface` vs `text-secondary` pour l'inactive.
- Labels FR/EN : codes ISO posés dans le composant (pas du wording) — seuls les
  `aria-label` restent dans le dictionnaire (`header.switcherAriaFr` /
  `switcherAriaEn`, annonce dans la langue cible via `lang`).
- Critères 1-4 inchangés et revérifiés (FR/EN présents sur les deux pages et
  les pages CV, hrefLang/lang/aria-label non vides, curl -L → 200, sans JS).

## Itération 3 (2026-09-23, demande utilisateur — hors corpus d'origine)

- **Lien « CV » dans le header** (vers `/fr/cv` / `/en/cv`, GEO-08h) + **logo
  cliquable vers la home de la locale courante**. Le `<nav>` porte désormais la
  home, le CV et le switcher — gain SEO-03/GEO-08h : `/fr/cv` reçoit un lien
  interne site-wide (avant : footer seul).
- Lien CV : `aria-label` localisé (`header.cvLinkAria`), highlight
  `aria-current="page"` quand la page courante EST `/cv`. Invariant documenté
  dans le composant : Next 16 ne sert pas de trailing slash, donc l'égalité
  stricte `rest === '/cv'` est sûre.
- Logo : `aria-label` composé `name + homeLinkAria` (« Kim-san DOK — Retour à
  l'accueil ») — conforme WCAG 2.5.3 Label in Name (le nom accessible contient
  le libellé visible, review c150986 M1).
- Responsive (review c150986 B1) : tagline `hidden sm:block` + `px-4 sm:px-8`
  + `gap-3 sm:gap-6`. Mesures CDP (Chrome headless, dsf 1) : header 80 px de
  320 à 520 px (avant : 114-146 px, tagline/nom sur 2 lignes), 99 px ≥ 640 px
  (baseline desktop inchangée), zéro débordement horizontal à 320-1280.
- Arbitrage M2 (review c150986) : sur `/fr/cv`, le lien CV et le lien FR du
  switcher portent tous deux `aria-current="page"` vers le même href — assumé
  et documenté dans le composant : le switcher désigne la page courante dans
  l'ensemble des locales (convention itération 2), le lien CV désigne la page
  courante du site.
- Critères 1-4 revérifiés + lint/typecheck/build verts.