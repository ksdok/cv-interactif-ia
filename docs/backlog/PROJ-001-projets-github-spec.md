# PROJ-001 — Page Projets GitHub Spec

> **Statut** : spec prête, non implémentée (délégation ultérieure).
> **Priorité** : MEDIUM · **Effort estimé** : L (nouvelle section du site : hub + pages détail + données + script de mesure).
> **Bloque** : aucun · **Bloqué par** : aucun.
> **Dépendances** : aucune bloquante. Lire `CONTEXT.md` avant toute intervention.
> **Révision** : 2026-09-23 — revue post-rédaction contre le code réel : M1 (liste éditoriale), M2 (rendu dynamique assumé + mémo négatif), M3 (invariant `featured`), M4 (JSON-LD `SoftwareSourceCode` + nonce), M5 (lien footer seul) traités ; nits N1-N9 intégrés.

## Goal

Ajouter une page **Projets** bilingue (`/fr/projets`, `/en/projets`) qui liste les
projets GitHub en cours de kim-san, avec une **page détail par projet mis en
avant** (`/[lang]/projets/[slug]`). Objectif double :

1. **Produit** — un recruteur voit le travail réel au-delà du CV (preuve de code).
2. **SEO/GEO** — le hub ET les pages détail sont des URL distinctes, indexables,
   server-rendered, bilingues, reliées au graphe existant (sitemap, hreflang,
   JSON-LD) — conformément à la stratégie du corpus `docs/features/seo-geo/`.

## Why this ticket exists

### La question SEO/GEO : une page par projet ou une seule page avec carrousel ?

**Décision tranchée : hub + pages détail par projet, SANS carrousel.**

Sources (recherche 2026-09-23, Firecrawl local → fallback web_search, toutes en
200 au 2026-09-23) :
- https://vazagency.com/guides/seo-for-portfolio-and-gallery-pages/ — un hub qui
  lie des pages détail permet de cibler des intentions distinctes par projet ;
  une seule page peut suffire pour un petit portfolio sans objectif de
  positionnement par projet.
- https://blog.hubspot.com/website/single-page-vs-multiple-page-website — pages
  multiples = signal par sujet, mais seulement si chacune apporte du contenu
  unique substantiel.
- https://webaim.org/techniques/carousels/ — les carrousels posent des problèmes
  d'accessibilité connus (contenu masqué hors viewport, navigation clavier,
  annonces lecteur d'écran, rotation automatique).
- https://developer.chrome.com/blog/accessible-carousel/ — un carrousel
  accessible coûte cher en complexité ; une grille statique est plus simple à
  crawler, utiliser et maintenir.
- https://seoplugin.ai/blog/programmatic-seo-without-doorway-pages/ — ne créer
  des pages programmatiques que si chaque page apporte une valeur unique ;
  sinon thin content / risque de doorway pages.

Synthèse de l'arbitrage :

| Option | SEO/GEO | UX/A11y | Verdict |
|---|---|---|---|
| Une seule page + carrousel | Contenu majoritairement hors viewport à tout instant, une seule URL pour tout le signal, métadonnées génériques | Rotation/clavier/lecteurs d'écran fragiles, JS supplémentaire | ❌ écartée |
| Une seule page + grille (sans carrousel) | Une URL, mais signal plat ; impossible de cibler « projet X » | Bonne | Acceptable en V0 si ≤ 3-4 projets sans matière |
| **Hub + page détail par projet mis en avant** | URL + title/description/JSON-LD par projet, maillage interne hub↔détail, entrées sitemap dédiées | Navigation native par liens `<a>`, zéro JS requis | ✅ retenu |

Garde-fou thin content : la page détail n'existe QUE pour les projets dont le
contenu rédigé est complet dans les DEUX locales (invariant M3, cf. décision 4).
Les autres projets restent des cartes sur le hub avec un lien externe direct
vers GitHub. Un hub qui ne contiendrait que des cartes + des pages détail vides
serait pire qu'une seule page.

## Scope

### In scope
- `app/[lang]/projets/page.tsx` — hub bilingue, server-rendered, grille de cartes.
- `app/[lang]/projets/[slug]/page.tsx` — page détail par projet `featured`, rendu
  dynamique assumé (cf. décision 2).
- Source de données éditoriale bilingue `content/projects.ts` (slug, repo, titre,
  descriptions FR/EN, contenu détail FR/EN pour les `featured`, tags, `order`,
  `featured`, `hidden`, lien démo éventuel) — emplacement `content/` car il
  s'agit de contenu éditorial traduit (convention `cv-fr.tsx`/`cv-en.tsx`), PAS
  de la source du chat CAG qui vit dans `data/` (les projets n'entrent pas dans
  le CAG, cf. out-of-scope).
- Enrichissement GitHub REST API côté serveur (`stars`, `language`, `topics`,
  `pushed_at`) avec `fetch` + `next.revalidate` — **pas de nouvelle dépendance**.
- Métadonnées par locale (title/description/canonical/hreflang **avec
  `x-default`**, GEO-08d), JSON-LD par page, entrées sitemap avec alternates
  (GEO-08e), mise à jour de `public/llms.txt` (GEO-06, maintenu à la main).
- Lien « Projets » **uniquement dans le footer** (pattern du lien CV). PAS de
  modification du header ni de la home — itération UX séparée si besoin après
  recul d'usage (le header vient d'être livré avec UX-003).
- Wording 100 % via dictionnaires FR/EN (GEO-08b, `react/jsx-no-literals`).
- `scripts/measure-viewports.mjs` — port du script CDP utilisé pour la revue
  UX-003 (Chrome headless, `Emulation.setDeviceMetricsOverride`, assertion
  `scrollWidth === innerWidth`) pour rendre la vérification responsive
  reproductible (N7).

### Out of scope
- Carrousel/slider quelconque.
- Lien « Projets » dans le header ou entrée de navigation dans la home
  (itération UX séparée, type UX-003 — ne pas improviser dans ce ticket).
- Auth GitHub, mise en cache cross-déploiement persistante, webhooks.
- Badges Shields.io ou tout script/image tierce (CSP — à réévaluer séparément).
- Chat Nicky / RAG : les projets n'entrent PAS dans `data/cv.md` dans ce ticket
  (surveillance de la taille CAG, cf. `docs/cag-limits.md`) — ticket séparé si
  Nicky doit parler des projets. Corollaire : `llms-full.txt` (généré depuis
  `data/cv.md`) reste inchangé.
- Header (nouveau lien), dark mode, animations.

## Files to inspect first
- `app/[lang]/cv/page.tsx` — le pattern page secondaire bilingue le plus proche
  (metadata, alternates, JSON-LD, fast-path).
- `app/[lang]/layout.tsx:30` (`generateStaticParams`) et **`:103-104` + `:164-179`**
  — le root layout lit `await headers()` + `await cookies()` (CSRF, `x-locale`,
  `x-nonce`) : **toute page sous `[lang]` est rendue dynamiquement** (`ƒ` au
  build, cf. décision 2) et c'est là que vit l'émetteur JSON-LD actuel avec
  `nonce={(await headers()).get('x-nonce')}`.
- `lib/jsonLd.ts:26` — `@id = ${SITE_URL}/#person` : entité `Person` +
  `ProfessionalService` émise une fois par le layout `[lang]` ; ne PAS
  ré-émettre, seulement référencer.
- `lib/i18n/types.ts`, `fr.ts`, `en.ts` — `Dictionary = typeof fr` : toute clé
  manque côté EN = erreur de compilation.
- `app/sitemap.ts:6-9, 26-31` — convention verrouillée : `changeFrequency` +
  `priority` + `alternates.languages` **avec `x-default`** (deux `x-default`
  divergents dans un cluster ⇒ annotation rejetée par Google, review N3).
- `proxy.ts` — CSP : vérifier `img-src` si images GitHub
  (`avatars.githubusercontent.com`, `opengraph.githubassets.com`) ; ne pas
  affaiblir la politique, passer par `next/image` + `remotePatterns` si images.
- `scripts/check-locale.mjs` — garde statique (exit 2) + runtime limité à
  `/${locale}` (homepage) ; ce ticket étend `SENTINELS` aux pages projets (N6).
- `lib/rateLimit.ts` — pattern `lastCleanup` + `CLEANUP_INTERVAL_MS` : le mémo
  négatif anti-spam de `lib/github.ts` s'en inspire (M2.3).

## Design decisions to make (document in the commit)

### 1. Source de vérité du contenu — locale éditoriale vs GitHub API seule ✅ tranchée
`content/projects.ts` est la source de vérité éditoriale : **la liste affichée,
son ordre (`order`) et son filtrage (`hidden`) sont éditoriaux**. GitHub API
n'apporte que des métadonnées vivantes (stars, language, topics, pushed_at)
d'un repo **déjà listé** — jamais la sélection, jamais la description (README
mono-langue, ton non contrôlé). Raison : descriptions bilingues contrôlées
(GEO-08b) + résilience : si l'API est indisponible ou rate-limitée (60 req/h
par IP non authentifiée, 5 000 avec `GITHUB_TOKEN` server-only optionnel), le
hub et les pages détail restent servis avec les données locales, champs GitHub
simplement omis.

### 2. Rendu — dynamique assumé + Data Cache ✅ tranchée (revue M2)
**Le rendu est et restera dynamique (`ƒ`)** : le layout `[lang]` lit
`headers()`/`cookies()` à chaque requête (CSRF, nonce CSP) et le JSON-LD de page
a besoin du nonce → `await headers()` verrouille le dynamique. Ne pas chercher
à rendre ces pages statiques (○) : on perdrait le JSON-LD noncé.

Le bénéfice réel visé est le **Data Cache** : `fetch(..., { next: { revalidate:
3600 } })` sur l'appel GitHub → les requêtes de la fenêtre de revalidation sont
servies sans rappel réseau. En cas d'échec, le fetch n'est PAS mis en cache en
rendu dynamique : **mémo négatif in-process obligatoire** dans `lib/github.ts`
(timestamp du dernier échec + TTL court, 5 min, même esprit que `lastCleanup`
de `lib/rateLimit.ts`) — pendant le TTL, aucun nouvel appel GitHub et aucune
nouvelle ligne de log. Choix conscient : in-process (réinitialisé à chaque
déploiement, comme `rateLimit.ts`, comportement accepté) plutôt que
`unstable_cache`/KV — ne pas ajouter d'infra pour ce ticket. `generateStaticParams`
est inutile ici : la validation des slugs passe par `notFound()`.

### 3. URL des pages détail ✅ tranchée
`/[lang]/projets/[slug]` avec `slug` défini dans `content/projects.ts` (pas le
nom de repo brut : indépendance URL/repo renommage). 404 via `notFound()` si
slug inconnu (boundary existante `app/not-found.tsx`, localisée via `x-locale`).
Option (non bloquante) : un `app/[lang]/projets/not-found.tsx` pour un retour
vers le hub plutôt que la 404 racine.

### 4. Bilinguisme du contenu projet + invariant ✅ tranchée (revue M3)
Titre + description + contenu détail rédigés FR/EN dans `content/projects.ts`.
`hreflang` alternates hub et détail, même slug dans les deux locales, avec
`x-default` pointant vers la FR (convention `cvLanguages` du sitemap).
**Invariant de données : `featured ⟹ (detailFr && detailEn)`.** Implémentation
pratique : `hasDetail = Boolean(project.detailFr && project.detailEn)` — la page
détail est générée ssi `hasDetail`, quel que soit le flag `featured`. Un détail
présent dans une seule langue ⇒ **pas** de page détail et **pas** d'alternate
hreflang vers une page inexistante (erreur d'annotation Google documentée).
Le README GitHub n'est PAS importé (mono-langue, images non maîtrisées).

### 5. JSON-LD ✅ tranchée définitivement (revue M4)
Premier JSON-LD de page du dépôt (le layout `[lang]` est aujourd'hui l'unique
émetteur) — à documenter dans le corps du commit :
- **Nonce** : tout script JSON-LD porte `nonce={(await headers()).get('x-nonce')}`
  (pattern `proxy.ts`) — un script sans nonce est bloqué en silence (CSP non
  négociable, CONTEXT §6.3).
- **`@id`** : référencer `author: { '@id': `${SITE_URL}/#person` }` sans
  ré-émettre `Person`/`ProfessionalService` (entité déjà émise par le layout —
  une ré-émission dupliquerait l'entité dans un même cluster).
- **Type : `SoftwareSourceCode`**, pas `SoftwareApplication` — schema.org cible
  les dépôts de code (`codeRepository`, `programmingLanguage`, `author`) ;
  `SoftwareApplication` vise les apps avec offre/notes. Hub : `ItemList`.
- Vérifier le rendu avec https://validator.schema.org.

### 6. Images des projets — OUVERT
Option A (recommandée) : aucune image, cartes typographiques dans le style
éditorial existant — zéro risque CSP, zéro poids. Option B : og-image générées
plus tard. Ne pas importer les avatars GitHub (`avatars.githubusercontent.com`,
`opengraph.githubassets.com`) sans vérifier la CSP `img-src` de `proxy.ts`
(contrainte non négociable : ne pas affaiblir). En cas d'orientation B : STOP,
vérifier la CSP d'abord et documenter l'ajout de domaine dans le commit.

### 7. Sélection des projets affichés ✅ tranchée (revue M1)
**La liste affichée = `content/projects.ts` filtrée sur `!hidden`, dans l'ordre
éditorial `order` (featured d'abord).** GitHub ne fournit jamais la sélection ni
le tri — un repo absent de la source éditoriale n'a ni slug, ni titre, ni
descriptions, il ne peut donc pas produire de carte ni de page détail. Un
`limit` éditorial est acceptable si la liste grandit. `pushed_at` (GitHub) sert
uniquement d'affichage (« dernière activité »), pas de tri primaire.

## Required changes (provisional)

1. **`content/projects.ts`** — type `Project` (slug, repo owner/name, order,
   titleFr/En, summaryFr/En, detailFr/En optionnel, tags, featured, hidden,
   demoUrl?). **Invariant M3 : `featured` sans `detailFr && detailEn` est une
   donnée invalide** — le code dérive `hasDetail` et ignore `featured` à la
   rendu si l'invariant n'est pas respecté (plus un commentaire d'invariant
   qu'une validation bloquante). 2-3 projets réels pour démarrer.
2. **`lib/github.ts`** (nouveau, `server-only`) — `fetchRepoMeta(owner, repo)` :
   - GET `https://api.github.com/repos/{owner}/{repo}`,
     `Accept: application/vnd.github+json` (champs `stargazers_count`,
     `language`, `topics`, `pushed_at` présents dans la réponse par défaut —
     vérifié live 2026-09-23, pas de preview header),
   - `AbortSignal.timeout(1500)` — timeout court, la page ne doit jamais
     attendre GitHub pour être servie,
   - parse minimal + try/catch → `null` (graceful, leçon BUG-001 : pas de
     dégradation silencieuse **sans log**),
   - **mémo négatif in-process** (M2) : après un échec, aucun nouvel appel
     pendant 5 min (module-level `lastFailureAt` + `NEGATIVE_TTL_MS`),
   - agrégation par `Promise.allSettled` (isolation : l'échec d'un repo
     n'affecte pas les autres),
   - `GITHUB_TOKEN` optionnel, server-only si présent ; documenté dans le
     README (section env vars **et** liste Vercel du déploiement) — optionnel
     seulement : sans token, 60 req/h/IP, couvert par le Data Cache + mémo
     négatif.
3. **`app/[lang]/projets/page.tsx`** — metadata par locale (canonical + hreflang
   fr/en/**x-default**), grille SSR des projets (cartes : titre, summary
   localisé, tags, stars si dispo, dernière activité formatée
   `Intl.DateTimeFormat(lang)`, lien détail si `hasDetail` sinon lien GitHub
   externe avec `rel="noopener noreferrer"` et aria-label annonçant la sortie
   du site), JSON-LD `ItemList` noncé, h1 unique.
4. **`app/[lang]/projets/[slug]/page.tsx`** — `generateMetadata` bilingue
   (title sans suffixe « | Kim-san DOK » — le template du layout l'ajoute déjà ;
   description, canonical, hreflang fr/en/x-default), contenu détail rédigé,
   JSON-LD `SoftwareSourceCode` noncé (`codeRepository`, `programmingLanguage`,
   `author → @id #person` référencé, jamais ré-émis), lien retour hub,
   extraits éventuels dans l'autre langue portés par `lang={...}`.
5. **Dictionnaires** — section `projects` (titre page, sous-titre, libellés
   cartes : « Voir sur GitHub », « stars », « En cours », « dernière activité »,
   annonce lien externe, etc.) FR/EN strictement parallèles.
6. **`app/sitemap.ts`** — entrées `/fr/projets` + `/en/projets` + pages détail
   `hasDetail` avec alternates fr/en/**x-default**. **`lastModified` dérivé de
   `content/projects.ts` (champ éditorial), AUCUN fetch GitHub** → le sitemap
   reste statique (○) et le build reste hors réseau (N5).
7. **`Footer.tsx`** — lien Projets (dictionnaire), cohérent avec le lien CV.
   **Header et home inchangés.**
8. **`public/llms.txt`** (maintenu à la main, GEO-06) — ajouter le hub Projets
   (+ pages détail) avec une ligne descriptive bilingue. `llms-full.txt` ne
   bouge pas (généré au build depuis `data/cv.md`).
9. **`scripts/measure-viewports.mjs`** (nouveau) — port du script CDP de la
   revue UX-003 : Chrome headless + `--remote-debugging-port`,
   `Emulation.setDeviceMetricsOverride` avec garde-fou `window.innerWidth ===
   width`, mesure `nav.getBoundingClientRect().height` + assertion
   `documentElement.scrollWidth === innerWidth`, viewports en argument.
10. **README.md** — structure (nouveaux fichiers), section SEO/GEO, env vars
    (`GITHUB_TOKEN` optionnel) + liste Vercel.

## Implementation notes
- Next 16 : `params` est **asynchrone** dans les pages/layouts (`await params`).
- Rendu dynamique assumé : ne pas ajouter `export const dynamic = 'force-static'`
  ni chercher le ○ au build — le JSON-LD noncé exige `headers()` (décision 2).
- Conventions non négociables (CONTEXT.md §6) : zéro chaîne en dur dans le JSX
  (y compris libellés cartés — passer par le dictionnaire) ; secrets server-only
  (`GITHUB_TOKEN` jamais côté client) ; CSP intacte (nonce sur tout script
  JSON-LD) ; pas de route API → pas de nouveau contrat `{ error, errorCode }`.
- A11y (suite UX-003) : h1 unique par page, `lang` sur les extraits EN, focus
  visible sur les liens, lien externe annoncé.
- Pas de test automatisé encore (TEST-001) : la section Verification ci-dessous
  est la seule preuve de comportement.
- Le switcher FR/EN du header fonctionne **gratuitement** sur les nouvelles
  routes (`rest` dérivé du pathname : `/fr/projets/x` → `/en/projets/x`) — ne
  pas toucher au header pour ça, juste le vérifier.

## Acceptance criteria
- `/fr/projets` et `/en/projets` servent une grille SSR identique en contenu,
  traduite (vérifiable curl, sans JS), h1 unique, canonical + hreflang
  fr/en/x-default par locale.
- Chaque projet `featured` a un contenu détail **FR et EN** (invariant M3), donc
  une page détail servie aux deux locales avec title/description/canonical/
  hreflang par locale et JSON-LD `SoftwareSourceCode` noncé valide (validation
  schema.org). Un détail incomplet dans une locale ⇒ pas de page détail, pas
  d'alternate.
- Un slug inconnu → 404 propre (boundary existante).
- **Charge GitHub maîtrisée (M2)** : deux requêtes successives dans la fenêtre
  de revalidate ne déclenchent qu'un appel GitHub (Data Cache) ; en cas
  d'échec, le mémo négatif borne l'appel et le log à 1 par fenêtre de TTL —
  vérifiable par observation des logs serveur.
- GitHub API down / rate-limitée → pages quand même servies avec les données
  locales (aucun crash, pas de blank), un log unique par fenêtre TTL.
- Sitemap contient hub + pages détail avec alternates fr/en/x-default,
  `lastModified` sans fetch, sitemap toujours statique au build ;
  `robots.txt` inchangé.
- `public/llms.txt` référence le hub Projets.
- Footer porte le lien Projets ; **header et home inchangés**.
- A11y : h1 unique par page, focus visible, `lang` correct sur les extraits,
  liens externes `rel="noopener noreferrer"` + annonce vocale.
- `npm run lint`, `npm run type-check`, `npm run build` verts ;
  `node scripts/check-locale.mjs` exit 0 avec les sentinelles étendues aux
  pages projets (N6 — extension assumée dans le même commit).

## Verification
1. **Rendu** : `npm run build` → les nouvelles routes sortent `ƒ` (dynamique
   assumé, cf. décision 2) — l'absence de `○` n'est PAS un échec ; vérifier
   plutôt au `npm run start` que la 2ᵉ requête sur `/fr/projets` ne génère pas
   de nouvel appel GitHub dans la fenêtre de revalidate (logs serveur).
2. **Pages servies** : `npm run build && npm run start` puis curl :
   - `/fr/projets` et `/en/projets` → 200, contenu traduit, JSON-LD `ItemList`
     noncé présent (attribut `nonce` non vide) ;
   - `/fr/projets/<slug>` → 200, `<link rel="canonical">` + hreflang fr/en +
     `x-default`, JSON-LD `SoftwareSourceCode` noncé, `@id #person` référencé ;
   - `/en/projets/<slug>` → même vérification côté EN ;
   - `/fr/projets/inconnu` → 404.
3. **Résilience GitHub** : bloquer le réseau de l'appel (proxy erroné ou domaine
   injoignable dans `lib/github.ts` en local) → hub et détail toujours 200,
   métadonnées GitHub absentes, **1 seule ligne de log par fenêtre de 5 min**
   (mémo négatif), seconde requête dans la fenêtre sans nouveau log.
4. **Sentinelles** : `SENTINELS` de `scripts/check-locale.mjs` étendues aux
   pages projets (une sentinelle FR et une EN par page hub et détail, garde
   statique couverte) → `node scripts/check-locale.mjs` exit 0 ; simuler une
   sentinelle obsolète → exit 2.
5. **Sitemap** : `/sitemap.xml` contient les nouvelles URL avec
   `x-default`, et le build n'émet aucun appel réseau pour le générer.
6. **Responsive reproductible (N7)** : `node scripts/measure-viewports.mjs
   http://localhost:3000/fr/projets 320 375 768 1280` → grille 1 colonne
   mobile, `scrollWidth === innerWidth` à chaque viewport.
7. **CSP** : si des images GitHub ont été ajoutées, vérifier `/api/csp-report`
   vide après navigation ; sinon confirmer qu'aucune image tierce n'a été
   introduite.
8. **Switcher** : depuis `/fr/projets/<slug>`, le lien EN du header pointe vers
   `/en/projets/<slug>` (et inversement) — sans modification du header.

## Handoff notes for the implementing LLM
- Ne crée PAS de page détail pour un projet sans contenu rédigé **complet dans
  les deux locales** (invariant M3) : c'est le critère anti-thin-content. En cas
  de doute, la carte du hub suffit.
- Ne touche ni `proxy.ts`, ni `lib/modelConfig.ts`, ni le chat : aucun
  rapatriement de contenu projet dans le système prompt Nicky.
- Le fallback GitHub doit être explicite (log unique par fenêtre TTL via mémo
  négatif) — pas de dégradation silencieuse (leçon BUG-001/SEC-005), mais pas
  de spam proportionnel au trafic non plus (revue M2).
- Rendu dynamique assumé : ne perds pas de temps à chasser le ○ au build, le
  nonce du JSON-LD l'interdit ; le gain de charge vient du Data Cache + mémo
  négatif.
- Si l'arbitrage images (décision 6) s'oriente vers les og-images GitHub
  (`opengraph.githubassets.com`), STOP : vérifier d'abord la CSP `img-src` de
  `proxy.ts` et documenter l'ajout de domaine dans le commit, sinon rester
  sans image.
- JSON-LD : référencer `#person`, ne JAMAIS ré-émettre l'entité du layout ;
  `SoftwareSourceCode` pour les dépôts, pas `SoftwareApplication` (revue M4).
- Un ticket = un commit cohérent (`feat(PROJ-001):`), corps justifiant les
  décisions 6 (images) et 7 (volume final) tranchées à l'implémentation, et
  notant l'introduction du premier JSON-LD de page.