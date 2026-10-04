# UX-007 — Tableau « Impact sélectionné » de la page CV : scroll horizontal sur petit écran

> **Statut : VALIDÉE — livrée (opérateur 2026-10-04)**
>
> **Livraison** : branche `ux-007-cv-table-horizontal-scroll` (1 commit `9b94239` `feat(UX-007)` : 1 classe + 1 attribut par fichier ; créée depuis `main` @ `b76b8ec`), **fusionnée sur `main` et poussée sur `origin/main`** (merge commit `0b9e5d2`, 2026-10-04, déploiement Vercel automatique au push), branche locale conservée. 2 fichiers (+2/−2, symétrie FR/EN) — `content/cv-fr.tsx:62` (section `chiffres`) et `content/cv-en.tsx:62` (section `key-figures`) : wrapper `overflow-hidden` → `overflow-x-auto` + `tabIndex={0}` **inconditionnel** (décision 4, prescription axe-core `scrollable-region-focusable`, WCAG 2.1.1) ; `Figure`, la grille `#expertises` (garde son `overflow-hidden` légitime), les tests, les scripts et le wording restent intacts. Revue glm-reviewer (contexte frais) **PROPRE** (0 bloquant / 0 majeur / 0 mineur / 0 suggestion ; symétrie bit à bit, zéro occurrence parasite d'`overflow-x-auto`, non-goals respectés — re-vérifiés en lecture). Tests mesurés : lint 0/0, type-check exit 0 (piège §9 `.next/` non déclenché), `npm test` **108/108 (7 fichiers, 177 ms)** (baseline inchangée, 0 nouveau test), build secret-free exit 0 (16 pages), check-locale 6 pages, measure-viewports (320/375/768/1280) sans débordement document. Vérifications CDP locales (port dédié ; le 9222 par défaut étant occupé par un Chrome local — quirk machine, aucun changement de code) : à 320 px le wrapper déborde (`scrollWidth` 499 > `clientWidth` 254 FR / 371 > 254 EN), scrollable, la valeur longue reste intégralement atteignable après défilement ; wrapper focusable (`document.activeElement`), aucune scrollbar verticale parasite ; à 1280 px `958 == 958`, rendu inchangé. Nuances assumées : axe-core formel non exécuté (absent du repo — le correctif prescrit est vérifié par la focusabilité CDP réelle) ; critère 3 vérifié par mesure (`scrollWidth == clientWidth`) plutôt que par screenshot ; à 320 px la colonne valeur (358 px) reste plus large que la zone visible (254 px) — lisible au pan, pas d'un coup d'œil (arbitrage cadrage, décisions 1/3 : pas de wrap, pas d'indicateur). Aucun drift de baseline. Validée opérateur le 2026-10-04 (« validé » + arbitrage merge/push). Spec sans cycle `spec-reviewer` (validation opérateur directe après cadrage). Trace de livraison dans `project-state.md` et `CONTEXT.md` §8.
>
> **Ticket proposé** : UX-007 · **Date** : 2026-09-28 · **Backlog** : UI / UX · **Base de code** : `main` @ `20c2d88`
> Taille S · Un seul changement CSS/attribut, appliqué en miroir dans 2 fichiers (`content/cv-fr.tsx`, `content/cv-en.tsx`). Aucune API, aucun wording i18n, aucune restructure.

---

## 1. Problème

Sur la page CV (`/fr/cv` et `/en/cv`), en écran étroit (~< 480 px), les valeurs de la
**2ᵉ colonne** du tableau « Impact sélectionné » sont **coupées et irrécupérables** :
la valeur « Simplification du SI & 500 000€/an d’économies » est tronquée
(exemple illustratif, constaté visuellement — cf. §11 : aucune mesure en amont),
et rien dans l'interface ne permet de la lire.

Sur desktop, le rendu est correct.

## 2. Analyse (vérifiée dans le code)

- Le tableau vit dans la section `id="chiffres"` (« Impact sélectionné ») de
  [`content/cv-fr.tsx:61-71`](.) et, en miroir, de [`content/cv-en.tsx:61-71`](.)
  (`id="key-figures"`, « Selected impact ») — les deux fichiers partagent la même
  mise en page (GEO-08h, seul le wording change) ; le composant `Figure` est
  **dupliqué** (ligne 241 FR / ligne 240 EN).
- **Chaîne de coupure**, toutes classes vérifiées :
  - la cellule valeur porte `text-right whitespace-nowrap w-[40%]` —
    le `whitespace-nowrap` impose une largeur **minimale** = largeur du texte le plus
    long, qui dépasse largement 40 % du conteneur sur mobile (le tableau passe
    plus large que son parent) ;
  - le wrapper au-dessus porte **`overflow-hidden`** : tout débordement est
    **silencieusement coupé** — la partie excédentaire de la colonne valeur est
    perdue, non scrollable.
- Largeur utile mobile : viewport 320 px − `px-8` (2 × 32 px du conteneur
  `max-w-5xl mx-auto px-8`, `content/cv-fr.tsx:31` — miroir `content/cv-en.tsx:28`) ≈ 256 px ; viewport 375 px ≈ 311 px.
- Desktop non affecté : à `max-w-5xl` (1024 px), « Simplification du SI & 500
  000€/an d'économies » tient dans 40 %.
- **Pourquoi les mesures existantes ne l'ont pas vue** : `scripts/measure-viewports`
  teste le `document.documentElement.scrollWidth` (`scripts/measure-viewports.mjs:16,155-162`) — avec `overflow-hidden`, le wrapper **clipe**
  sans jamais créer de débordement document, donc le contrôle passe en vert.
- Lint : `content/**` est hors du glob de la règle `react/jsx-no-literals`
  (`eslint.config.mjs:33` pour le glob, `:29-31` pour le commentaire — ajout
  promis à GEO-08h, pas encore fait) ; aucun
  risque même si la spec ne touche que des `className`/attributs, jamais des chaînes.
- `check-locale` (`scripts/check-locale.mjs`) ne vérifie que les chaînes du
  dictionnaire — aucune chaîne nouvelle ici, contrôle inchangé.

## 3. Décisions (arbitrées avec l'opérateur le 2026-09-28)

| n° | Décision | Arbitrage |
|----|----------|-----------|
| 1 | **Scroll horizontal** — le wrapper du tableau passe de `overflow-hidden` à `overflow-x-auto`. Sémantique `<table>` intacte, maquette desktop inchangée. | Choisi parmi 3 options (scroll / empilement vertical mobile / wrap de la colonne valeur). Le swipe est un geste standard ; les alternatives restructurerait le `Figure` ou donneraient un rendu dense illisible. |
| 2 | **Sélecteur de déclenchement : unconditionnel** — une seule classe `overflow-x-auto`, **aucun breakpoint** : la scrollbar n'apparaît que si le contenu déborde (Tailwind 4 : « shows a horizontal scrollbar **only if content overflows** », cf. Sources). Desktop n'a donc jamais de scrollbar puisqu'à `max-w-5xl` le tableau tient. | Zero maintenance responsive ; un conditionnement par breakpoint (`md:overflow-hidden`) n'achèterait rien. |
| 3 | **Pas d'indicateur visuel** de scroll (pas de dégradé, pas de micro-copie) | Conforme à l'esprit « High-End Editorial Minimalism » ; évite du wording i18n et garde la taille S. Limite acceptée et tracée en §9. |
| 4 | **`tabIndex={0}` inconditionnel sur le wrapper** — prescription technique dérivée de la règle axe-core `scrollable-region-focusable` (WCAG 2.1.1) : une zone scrollable doit être focusable au clavier, sinon le contenu coupé le reste pour les utilisateurs clavier. Inconditionnel (et non conditionnel au débordement, qui exigerait JS/observer — hors taille S) ; le surcoût d'un stop de tabulation desktop sans débordement est accepté. | La décision 3 n'est qu'affaire d'indicateur **visuel** ; la focusabilité est la condition pour que le scroll soit un correctif et pas un déplacement du problème. Question ouverte n° 1 **close par cette prescription** (défaut : inconditionnel). |

## 4. Scope

- **In scope** :
  - `content/cv-fr.tsx` — wrapper de la section `chiffres` : `overflow-hidden` →
    `overflow-x-auto` + `tabIndex={0}` ;
  - `content/cv-en.tsx` — le même changement sur la section `key-figures`, à
    l'identique (symétrie GEO-08h).
- **Out of scope** : restructuration de `Figure` (empilement mobile), retrait du
  `whitespace-nowrap`/`w-[40%]`, `scripts/measure-viewports` (détection des
  clips), tout autre tableau ou composant, wording i18n, dark mode (UX-002).

## 5. Changements requis

1. `content/cv-fr.tsx` (wrapper, ligne 62) :
   - `className="overflow-hidden border border-surface-variant rounded-lg"`
     → `className="overflow-x-auto border border-surface-variant rounded-lg"`
   - ajout `tabIndex={0}` sur le même `div`.
2. `content/cv-en.tsx` : les mêmes 2 changements, au `div` du wrapper (ligne 62
   dans les deux fichiers) ; composant `Figure` (241 FR / 240 EN) **non modifié** —
   le comportement de scroll vient du wrapper.
3. Rien d'autre : ni `lib/i18n/*`, ni `globals.css`, ni tests existants.

## 6. Notes d'implémentation / pièges

- **Quirk CSS `overflow-x`** : dès qu'une direction n'est plus `visible`, la valeur
  restante `visible` **calcule vers `auto`** (règle CSS Overflow). `overflow-x: auto`
  rend donc le wrapper aussi scrollable verticalement en théorie ; en pratique le
  tableau ne déborde jamais verticalement (sa hauteur = son contenu), donc aucune
  scrollbar verticale ne doit apparaître — à vérifier en §8 critère 5.
- Les coins arrondis et la bordure restent intacts : `overflow-x-auto` clippe
  toujours le contenu au rayon (`rounded-lg`) contrairement à `overflow-visible`.
- **Aucun ancêtre clippant** (vérifié) : le shell `app/[lang]/cv/page.tsx:104`
  (`<main className="w-full pt-16 flex-1"`) n'impose aucun `overflow` — le fix du
  seul wrapper suffit. **Aucun impact CSP** : ni style inline ni script ajouté,
  donc ni nonce ni politique `proxy.ts` touchés.
- iOS masque les scrollbars overlay pendant le repos : sans indicateur (décision 3),
  un utilisateur peut ne pas deviner le swipe — limite acceptée, voir §9.
- Un seul stop de tabulation **est ajouté pour tous les utilisateurs** (y compris
  desktop sans débordement), conséquence assumée du `tabIndex` inconditionnel —
  **close par la décision 4** (prescription axe-core ; cf. §10 Risques).

## 7. Critères d'acceptation (numérotés, vérifiables)

1. Sur `/fr/cv` ET `/en/cv`, le wrapper du tableau « Impact sélectionné » porte
   `overflow-x-auto` (et non `overflow-hidden`), symétrie FR/EN exacte.
2. À 320 px de large : le wrapper a `scrollWidth > clientWidth` ; en glissant
   horizontalement, la valeur complète « Simplification du SI & 500 000€/an
   d’économies » est lisible (aucun caractère définitivement perdu).
3. À 1280 px : aucun changement de rendu vs `main` (tableau tient, zéro scrollbar
   horizontale visible), et zéro débordement nouveau mesuré.
4. Le wrapper est focusable au clavier (tab) et le défilement se fait avec les
   touches fléchées quand il est focus ; axe-core `scrollable-region-focusable`
   non déclenché.
5. Aucune scrollbar verticale parasite n'apparaît (aucune hauteur fixée sur le
   wrapper, débordement vertical absent).
6. `npm run lint` 0/0, `npm run type-check` exit 0, `npm run test` **108/108
   (7 fichiers)**, `npm run build` secret-free (16 pages — baseline reportée
   UX-005, à vérifier en non-régression, pas re-mesurée par cette spec),
   `check-locale` 6 pages.
7. `measure-viewports` (320/375/768/1280) sans `document.documentElement.scrollWidth`
   nouveau (`scripts/measure-viewports.mjs:16`).

## 8. Verification (manuelles)

- `npm run dev`, CDP headless (Chrome, 320 px et 375 px émulés) : mesurer
  `wrapper.scrollWidth` / `wrapper.clientWidth` sur le div `overflow-x-auto` ;
  simuler un `wheel`/scroll horizontal et vérifier qu'aucune valeur n'est coupée
  après défilement complet.
- 1280 px : comparer un screenshot avant/après la section `chiffres`.
- audit Lighthouse axe sur `/fr/cv` à 320 px : `scrollable-region-focusable`
  absent des findings.
- Après déploiement : sur `/fr/cv` et `/en/cv`, le `<div>` englobant la `<table>`
  du bloc `#chiffres` / `#key-figures` porte `overflow-x-auto` et **pas**
  `overflow-hidden` (vérification par sélecteur DOM — la grille `#expertises`
  (`content/cv-fr.tsx:75`) conserve légitimement son `overflow-hidden`, donc un
  `grep` plein-texte donnerait des faux positifs sur le comptage).
- `curl -sL https://kimsandok.com/fr/cv` reste 200 et la section se rend sans
  régression visible à 1280 px.

## 9. Non-goals

- Empilement vertical responsive de `Figure` (alternative rejetée au cadrage).
- Retirer `whitespace-nowrap` / `w-[40%]` (le wrap donnerait un rendu dense ;
  valeur arbitrairie rejetée au cadrage).
- Indicateur visuel / affordance de scroll (rejété, décision 3 ; réouvrable).
- Changer `scripts/measure-viewports` pour détecter les clips (utile, mais
  déborde le ticket — à proposer en follow-up si l'opérateur le veut).
- Toute autre page / section que la section `chiffres` des 2 fichiers CV.

## 10. Risques

- **Stop de tabulation superflu** sur desktop (pas de débordement) — bruit clavier
  mineur, **accepté** (décision 4, prescription axe-core).
- **Découvrabilité faible** sur mobile sans indicateur : la colone coupée se lit
  au swipe mais rien ne l'annonce — limite assumée (décision 3).
- **Régression visuelle** quasi-nulle : 1 classe + 1 attribut, aucun JS, aucun
  nouveau style.

## 11. Mesures et limites de conception

- Aucun chiffre n'a encore été mesuré en amont de cette spec : l'écart entre
  la largeur min. du tableau et les ~256 px utiles à 320 px n'a été mesuré
  nulle part — le débordement est constaté qualitativement (valeur tronquée) et
  sa magnitude restera à relever, si besoin en détection, lors
  de l'implémentation (§8). Ce ticket ne prétend pas à des mesures de perf : le
  changement est du CSS pur.

## 12. Question ouverte — à trancher par l’opérateur

1. **Suivi `measure-viewports`** — faut-il créer un ticket distinct pour que le
   script signale les contenus clippés (`scrollWidth > clientWidth` sur les
   wrappers à `overflow-x-auto`) ? Défaut si pas d’arbitrage : hors scope, suivi
   tracé ici.

_Clauses closes_ : l’ex-question ouverte « `tabIndex={0}` inconditionnel ou
conditionnel » a été **close par la prescription de la décision 4** (défaut :
inconditionnel) — elle ne requiert pas d’arbitrage produit.

## Sources

- [`content/cv-fr.tsx`](../../content/cv-fr.tsx) lignes 61-71 (section `chiffres`) et 241-250 (`Figure`)
- [`content/cv-en.tsx`](../../content/cv-en.tsx) lignes 61-71 (miroir EN, `id="key-figures"`) et 240-249 (`Figure` EN)
- [`eslint.config.mjs`](../../eslint.config.mjs) lignes 29-31 (commentaire) et 33 (glob) — `content/**` hors glob `react/jsx-no-literals`
- Tailwind CSS — docs Overflow via Context7 (`/websites/tailwindcss`) : `overflow-x-auto` « shows a horizontal scrollbar only if content overflows » — https://tailwindcss.com/docs/overflow
- Deque axe-core, règle `scrollable-region-focusable` (« Ensure that scrollable region has keyboard access », fix = `tabindex="0"`) — https://dequeuniversity.com/rules/axe/4.0/scrollable-region-focusable (récupérer via Firecrawl local, 2026-09-28)
- Gabarit : `docs/backlog/UX-006-chat-contact-nudge-spec.md` (structure de sections)