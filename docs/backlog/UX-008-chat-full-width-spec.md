# UX-008 — Chat IA « Nicky » : pleine largeur de la fenêtre

> **Statut : ABANDONNÉE** — décision opérateur du 2026-10-04 : le style « chat pleine largeur » **n'est pas retenu** au verdict de livraison ; **aucune implémentation fusionnée** (branche `ux-008-chat-full-width` — revue `PROPRE`, mesures CDP conformes — supprimée **avant** merge/push, rollback propre, `ChatPreview.tsx` inchangé vs UX-005). Spec conservée pour ses arbitrages et mesures, **réouvrable** : les décisions restent valides telles quelles, seul le style produit est rejeté.
>
> **Ticket proposé** : UX-008 · **Date** : 2026-10-04 · **Backlog** : UI / UX · **Base de code** : `main` @ `80f913e`
> Taille S · Un seul composant (`components/ChatPreview.tsx`), 3 sites de classes CSS, aucun wording i18n, aucune API, aucune restructure. Décisions arbitrées avec l'opérateur au cadrage du 2026-10-04.

---

## 1. Problème

Le bloc chat « Nicky » de la home est borné à **768 px** (`max-w-3xl`) quelle que soit
la fenêtre. Sur un écran large (1440–2560 px), le chat occupe une colonne étroite
entourée de vide : l'input pill (h 80 px, `rounded-full`) et la carte repliée paraissent
réduits, l'espace latéral est perdu.

L'opérateur veut que le chat occupe **toute la largeur de l'écran**.

## 2. Analyse (vérifiée dans le code)

- Le champ est **unique et centralisé** : [`components/ChatPreview.tsx:370`](.) porte
  `max-w-3xl mx-auto` sur le div wrapper — c'est le seul point qui borne le chat.
  La section au-dessus ([`ChatPreview.tsx:369`](.)) est **déjà** `w-full px-8` :
  elle occupe tout le viewport avec 32 px de padding de chaque côté.
- **Les deux états partagent ce wrapper** : à l'état replié (carte UX-005 : fond
  `bg-surface-container-low rounded-2xl border p-12`) comme à l'état déplié
  (`bg-surface p-0`), la contrainte vient du même div (`ChatPreview.tsx:370`).
  Un seul changement couvre donc les deux états.
- **Aucun ancêtre bornant** : `ChatPreview` est monté directement ([`Home.tsx:35`](.))
  dans `<main className="w-full pt-16 flex-1">` ([`Home.tsx:33`](.), A11Y-01) — le `<main>`
  n'impose aucune largeur. Le retrait de `max-w-3xl` suffit, aucun changement
  parent requis.
- **Mobile non affecté** : la borne ne mord que lorsque `viewport − 64 px (px-8) > 768 px`, soit **viewport > 832 px** (à 832 px, `viewport − 64 = max-w-3xl`, rendu inchangé) — à 375 px (utile 311 px) comme à 768 px (utile 704 px), le rendu est inchangé ; une tablette portrait ≥ 832 px est en revanche concernée. Ticket desktop par construction ; une non-régression est exigée (critère 4).
- **Messages** : chaque bulle porte `max-w-[85%]` ([`ChatPreview.tsx:454`](.)) au sein
  de la liste. Si la liste devient pleine largeur sans garde-fou, les bulles
  s'étirent à ~85 % de la largeur utile (**2 496 px** à 2560 px) — lignes de lecture
  très longues, d'où la décision 3.
- **Input** : `w-full h-20 rounded-full` ([`ChatPreview.tsx:501`](.)) suivra la
  pleine largeur du shell — conforme à ce que l'opérateur a arbitré.
- **Hors périmètre voisin, intact** : `Hero` et `ExperienceGrid` portent leurs
  propres bornes (aucun changement voulu) ; le modal `JobMatcher` reste
  `max-w-2xl` ([`components/JobMatcher.tsx:148`](.)). `app/[lang]/cv/page.tsx`
  n'a pas de chat.
- **Aucun wording nouveau, aucune API** : le changement est du CSS pur
  (classes Tailwind). `check-locale`, CSP/nonce (`proxy.ts`), CSRF et `/api/chat`
  sont intouchés. Vitest ne couvre pas ce composant (aucun test de composants
  dans le repo, cf. UX-005) — la baseline `npm test` ne bouge pas.

## 3. Décisions (arbitrées avec l'opérateur le 2026-10-04)

| n° | Décision | Arbitrage |
|----|----------|-----------|
| 1 | **Pleine largeur « bord à bord »** : le wrapper `ChatPreview.tsx:370` passe de `max-w-3xl mx-auto` à pleine largeur (retrait des 2 classes). Le shell du chat — carte repliée (fond + bordure + coins arrondis) et input en état déplié — s'étend sur `100vw − 64 px`. Le padding `px-8` de la section est le seul retrait. | Choisie parmi 3 options (100 % fenêtre / `max-w-7xl` ~1280 px / alignement sur Hero-ExperienceGrid). Choix opérateur : immersion maximale. |
| 2 | **Les deux états concernés** (replié + déplié) — même wrapper, aucune divergence d'état, pas de rework UX-005 (structure, puces, micro-copie, transitions intouchées). | À l'opérateur ; une divergence replié étroit / déplié large créerait un saut visuel à l'expansion. |
| 3 | **Lisibilité préservée : bulles plafonnées** — la contrainte `max-w-3xl mx-auto` actuelle est **déplacée** sur la liste de messages (colonne de lecture centrée) au lieu d'être supprimée. Les bulles gardent `max-w-[85%]` **de cette colonne** (≈ 653 px max par bulle — 85 % de la colonne de 768 px, statu quo de lisibilité), assistant à gauche / utilisateur à droite inchangés. L'input, lui, reste pleine largeur. | Compromis arbitré : bande chat immersive, colonne de lecture des messages à la largeur d'aujourd'hui. Écart possible de la colonne à `max-w-4xl` (896 px) : question ouverte §12 n° 1. |
| 4 | **Périmètre : le chat uniquement** — ni `Hero`, ni `ExperienceGrid`, ni le modal `JobMatcher`, ni les pages `/cv`, ni Header/Footer. Un seul composant modifié. | À l'opérateur ; un réalignement global de la home serait taille > S et déborderait le besoin exprimé. |
| 5 | **Contenu interne de la carte repliée plafonné** : header d'identité, bulle d'accueil et puces restent sur une colonne `max-w-3xl mx-auto` centrée **dans** la carte pleine largeur. | Défaut énoncé dans la v0 de la spec et maintenu — réouvrable par l'opérateur avant validation : la bande pleine largeur donne l'immersion, le contenu conserve la composition UX-005 ; un header `justify-between` écarté jusqu'à ~2 430 px à 2560 px serait illisible. |

## 4. Scope

- **In scope** :
  - `components/ChatPreview.tsx` — (a) wrapper principal : `max-w-3xl mx-auto`
    → pleine largeur ; (b) report de la colonne de lecture plafonnée (`max-w-3xl
    mx-auto`) sur la liste de messages (ou conteneur de transition qui l'entoure)
    pour l'état déplié ; contenu interne de la carte repliée selon la **décision 5**
  (plafonné).
- **Out of scope** : `Hero`, `ExperienceGrid`, `JobMatcher` (et son modal
  `max-w-2xl`), `app/[lang]/cv/page.tsx`, `Header`, `Footer`, `globals.css`
  (aucun nouveau token nécessaire), wording i18n (`fr.ts`/`en.ts`), API
  (`/api/chat`), UX-006 (rappel contact), UX-002 (dark mode), tout nouveau test
  automation (aucun framework de tests de composants dans le repo).

## 5. Changements requis

1. `components/ChatPreview.tsx` (wrapper, ligne 370) :
   - `className={`max-w-3xl mx-auto transition-all duration-500 ${…}`}`
     → `className={`w-full transition-all duration-500 ${…}`}`
   - la section parente `w-full px-8` (ligne 369) reste inchangée.
2. `components/ChatPreview.tsx` (bloc replié, ligne 380) : ajouter `max-w-3xl mx-auto`
   au `<div>` qui porte `max-h-[640px]`/`inert={expanded}` — en sus de ses classes
   `transition-all duration-500 overflow-hidden` existantes (ne pas les toucher).
   Le contenu replié (header d'identité, bulle d'accueil, puces) reste centré à
   768 px dans la carte pleine largeur (décision 5, critère 3).
3. `components/ChatPreview.tsx` (liste de messages, lignes ~443–450) : porter
   `max-w-3xl mx-auto` sur le conteneur de la liste (le div de transition
   `max-h-[500px]…` ou son enfant au ref `messagesContainerRef`, au choix de
   l'implémentation — sans toucher ni aux classes de transition, ni à
   `aria-live`/`aria-busy`, ni à la mécanique `messagesEndRef` du scroll auto).
4. Rien d'autre : ni `lib/i18n/*`, ni `globals.css`, ni tests existants, ni
   `Home.tsx`.

## 6. Notes d'implémentation / pièges

- **Ne pas déplacer la consigne vers un autre niveau** : le plafond de lecture
  doit s'appliquer aux **bulles**, pas au wrapper — le wrapper doit rester
  pleine largeur pour que la carte repliée et l'input s'étendent (décisions 1
  et 3 sont indépendantes).
- **Transitions UX-005 intouchées** : les classes `transition-all duration-500`,
  `max-h-[640px]` (replié) / `max-h-[500px]` (messages), `overflow-hidden`,
  `inert` portent les animations expand/collapse — ne pas les fusionner avec le
  changement de largeur. Le `transition-all` existant sur le wrapper s'accommodera
  du changement de largeur.
- **Scroll automatique des messages** : `messagesContainerRef` pilote le scroll
  en fin de réponse — si le plafond est posé sur l'enfant contenant le ref, ne pas
  casser la référence ; le plus sûr est de porter `max-w-3xl mx-auto` sur le div
  de **transition** qui l'entoure (ligne ~444).
- **Micro-copie** (« hint ») : `text-center` — reste valide sur la pleine largeur.
- **Header d'identité replié** (`flex justify-between`) : si son contenu n'est pas
  plafonné, avatar et badge s'écartent jusqu'à ~2 400 px à 2560 (carte repliée,
  padding `p-12`) — c'est l'objet de la décision 5.
- **Aucune incidence sécurité/contrats** : HTML/CSS pur — ni nonce (aucun script),
  ni CSP, ni CSRF, ni rate limit. `react/jsx-no-literals` non concerné (aucune
  chaîne).
- **CSP report** : vérifier `/api/csp-report` vide après déploiement comme
  toujours — aucune raison de violation ici, contrôle de routine.

## 7. Critères d'acceptation (numérotés, vérifiables)

1. `components/ChatPreview.tsx` : le wrapper principal ne porte plus
   `max-w-3xl`/`mx-auto` ; la section `w-full px-8` reste telle quelle ; aucun
   autre fichier du dépôt n'est modifié.
2. État **déplié** à 1280 / 1920 / 2560 px : les bulles de messages restent dans
   une colonne de lecture plafonnée centrée (largeur max d'une bulle ≈ 653 px —
   85 % d'une colonne de 768 px ; 896 px si §12 n° 1 est arbitré à `max-w-4xl`),
   assistant à gauche / utilisateur à droite ; l'input pill
   s'étend sur toute la largeur du shell (`100vw − 64 px`), bouton send collé à
   droite.
3. État **replié** à 1280 / 1920 / 2560 px : la carte (fond `bg-surface-container-low`,
   bordure, `rounded-2xl`) s'étend sur toute la largeur utile ; son contenu
   interne (header d'identité, bulle d'accueil, puces — **hors input**, qui reste
   pleine largeur) plafonné à `max-w-3xl mx-auto` centré (décision 5), jamais écarté.
4. À 320 / 375 / 768 px : rendu **à l'identique de `main`** (non-régression — la
   borne ne s'appliquait pas sous 832 px de viewport).
5. Expand/collapse : transitions 500 ms intactes, bloc replié masqué + `inert`
   non tabulable, puces ≥ 40 px, **1 seul POST `/api/chat` par clic de puce**,
   brouillon conservé sur Entrée pendant le streaming (non-régression UX-005
   CDP).
6. Suites vertes : `npm run lint` 0/0, `npm run type-check` exit 0, `npm test`
   **108/108 (7 fichiers)**, `npm run build` secret-free (16 pages),
   `check-locale` 6 pages, `measure-viewports` (320/375/768/1280) sans débordement
   document nouveau.
7. `/api/csp-report` sans violation nouvelle après déploiement.

## 8. Verification (manuelles)

- `npm run dev`, CDP headless : à 1920 et 2560 px, mesurer `clientWidth` du shell
  (carte repliée et wrapper déplié) ≈ `innerWidth − 64` ; état déplié : largeur
  max des bulles ≈ 653 px (85 % de la colonne de lecture), input ≈ pleine largeur.
- Screenshots avant/après à 1280 px pour l'alignement visuel vertical
  (Hero / chat / ExperienceGrid) — le chat sera désormais **plus large** que ses
  voisins : vérifier l'effet éditorial attendu (choix opérateur, décision 1).
- CDP 375 px : comparaison screenshot avant/après à l'identique (critère 4).
- Expand/collapse : les 6 points CDP de la baseline UX-005 (bloc 554 px @375,
  puces 40 px, 1 POST par clic, brouillon sous Entrée streaming, `inert`,
  focus desktop) rejoués.
- Post-déploiement : `curl -sL https://kimsandok.com/fr` 200, smoke chat
  (1 POST streaming ancré), `/api/csp-report` sans violation.

## 9. Non-goals

- Réaligner Hero / ExperienceGrid / Footer sur la nouvelle largeur du chat
  (décision 4 — réouvrable si l'opérateur veut un réalignement global, taille > S).
- Élargir le modal JobMatcher (`max-w-2xl` intact).
- Changer la largeur des bulles au-delà du report du plafond (question §12 n° 1
  borne le choix ; pas de nouvelle grille).
- Wording, tokens CSS nouveaux, animations, dark mode (UX-002), UX-006.
- Tests de composants automatisés (aucun framework — la couverture manuelle/CDP
  de §8 fait foi).

## 10. Risques

- **Esthétique de la carte repliée à très grand écran** si le contenu interne
  n'est pas plafonné (header d'identité écarté à ~2 400 px à 2560 px — carte
  repliée, `p-12`) — mitigé par la décision 5 (plafonné).
- **Lisibilité à 4K** : colonne de lecture des bulles portée de 768 px — un
  arbitrage §12 n° 1 vers `max-w-4xl` (896 px) dégraderait légèrement la lecture ;
  défaut conservé 3xl.
- **Régression visuelle mobile** : nulle par construction (borne jamais active sous
  768 px), mais non-régence exigée (critère 4) et vérifiée screenshot (§8).

## 11. Mesures et limites de conception

- Aucune mesure n'était nécessaire en amont : les largeurs relevant de valeurs
  conventionnelles Tailwind (`max-w-3xl` = `48rem` = 768 px — source en §Sources)
  et du seul calcul `viewport − 64 px`. Les mesures réelles (clientWidth shell,
  largeur bulles) sont à relever en CDP lors de l'implémentation (§8).
- Ticket CSS pur : aucun impact perf/latence attendu ; pas de section benchmark.

## 12. Questions ouvertes — à trancher par l'opérateur

1. **Largeur de la colonne de lecture des messages** — conserver `max-w-3xl`
   (768 px, statu quo de lisibilité) ou élargir à `max-w-4xl` (896 px) ? Défaut :
   **conserver 3xl**.

_Clauses closes_ : l'ex-question ouverte « contenu interne de la carte repliée :
plafonné ou étiré » a été **close par la décision 5** (défaut : plafonné) —
reouvrable par l'opérateur avant validation ; elle ne requiert pas d'arbitrage
séparé.

## Sources

- [`components/ChatPreview.tsx`](../../components/ChatPreview.tsx) lignes 369–370
  (section `w-full px-8`, wrapper `max-w-3xl mx-auto`), ~443–454 (liste de
  messages + bulles `max-w-[85%]`), 501 (input `w-full h-20 rounded-full`)
- [`app/[lang]/Home.tsx`](../../app/[lang]/Home.tsx) lignes 33–38 (`<main
  className="w-full pt-16 flex-1">`, montée de `ChatPreview` sans ancêtre bornant)
- [`components/JobMatcher.tsx`](../../components/JobMatcher.tsx) ligne 148
  (modal `max-w-2xl` — hors scope)
- Tailwind CSS — docs Max-Width : `max-w-3xl` = `var(--container-3xl)` =
  `48rem (768px)` — https://tailwindcss.com/docs/max-width (récupéré via
  Firecrawl local, 2026-10-04)
- Gabarit : `docs/backlog/UX-007-cv-table-horizontal-scroll-spec.md` (structure
  de sections)