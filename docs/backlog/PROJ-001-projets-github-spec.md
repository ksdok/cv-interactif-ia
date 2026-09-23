# PROJ-001 — Page Projets GitHub Spec

> Statut : **spec prête, non implémentée** (délégation ultérieure).
> Dépendances : aucune bloquante. Lire `CONTEXT.md` avant toute intervention.

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

Sources (recherche 2026-09-23, Firecrawl local → fallback web_search) :
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

Garde-fou thin content : la page détail n'est créée QUE pour les projets
marqués `featured` dans la source éditoriale et enrichis d'un contenu rédigé
(problème, rôle, décisions, stack). Les autres projets restent des cartes sur le
hub avec un lien externe direct vers GitHub. Un hub qui ne contiendrait que des
cartes + des pages détail vides serait pire qu'une seule page.

## Scope

### In scope
- `app/[lang]/projets/page.tsx` — hub bilingue, server-rendered, grille de cartes.
- `app/[lang]/projets/[slug]/page.tsx` — page détail par projet `featured`, SSR/SSG.
- Source de données éditoriale bilingue `data/projects.ts` (slug, repo, titre,
  description FR/EN, tags, `featured`, lien démo éventuel).
- Enrichissement GitHub REST API côté serveur (`stars`, `language`, `topics`,
  `pushed_at`) avec `fetch` + `next.revalidate` — **pas de nouvelle dépendance**.
- Métadonnées par locale (title/description/canonical/hreflang, GEO-08d),
  JSON-LD par projet, entrées sitemap avec alternates (GEO-08e).
- Lien « Projets » : dans le footer + une entrée de navigation depuis la home ;
  pas de modification du header (UX-003 vient de le livrer — itération séparée
  si besoin).
- Wording 100 % via dictionnaires FR/EN (GEO-08b, `react/jsx-no-literals`).

### Out of scope
- Carrousel/slider quelconque.
- Auth GitHub, mise en cache cross-déploiement persistante, webhooks.
- Badges Shields.io ou tout script/image tierce (CSP — à réévaluer séparément).
- Chat Nicky / RAG : les projets n'entrent PAS dans `data/cv.md` dans ce ticket
  (surveillance de la taille CAG, cf. `docs/cag-limits.md`) — ticket séparé si
  Nicky doit parler des projets.
- Header (nouveau lien), dark mode, animations.

## Files to inspect first
- `app/[lang]/cv/page.tsx` — le pattern page secondaire bilingue le plus proche
  (metadata, alternates, JSON-LD, fast-path).
- `app/[lang]/page.tsx` + `Home.tsx` — passage du dictionnaire en props.
- `lib/i18n/types.ts`, `fr.ts`, `en.ts` — `Dictionary = typeof fr` : toute clé
  manque côté EN = erreur de compilation.
- `app/sitemap.ts` — structure des entrées avec alternates (GEO-08e).
- `lib/jsonLd.ts` — builder partagé, convention `@id` stable.
- `proxy.ts` — CSP : vérifier `img-src` si images GitHub
  (`avatars.githubusercontent.com`, `opengraph.githubassets.com`) ; ne pas
  affaiblir la politique, passer par `next/image` + `remotePatterns` si images.
- `scripts/check-locale.mjs` — le garde statique échouera si un wording utilisé
  comme sentinelle change ; pas de nouvelle sentinelle requise ici.

## Design decisions to make (document in the commit)

### 1. Source de vérité du contenu — locale éditoriale vs GitHub API seule ✅ tranchée
`data/projects.ts` est la source de vérité éditoriale (bilingue, triée, avec
`featured`). GitHub API n'apporte que des métadonnées vivantes (stars, language,
topics, last push) — jamais la description (README mono-langue, ton non contrôlé).
Raison : descriptions bilingues contrôlées (GEO-08b) + résilience : si l'API est
indisponible ou rate-limitée (60 req/h sans token, 5 000 avec `GITHUB_TOKEN`
server-only optionnel), le hub et les pages détail restent servis avec les
données locales, champs GitHub simplement omis.

### 2. Rendu — statique avec revalidation ✅ tranché
Server components + `fetch(..., { next: { revalidate: 3600 } })` sur l'appel
GitHub. Pas de route API dédiée. `generateStaticParams` pour les pages détail
(liste fermée issue de `data/projects.ts`). Pas de `unstable_cache` ni de KV.

### 3. URL des pages détail ✅ tranché
`/[lang]/projets/[slug]` avec `slug` défini dans `data/projects.ts` (pas le nom
de repo brut : indépendance URL/repo renommage). 404 via `notFound()` si slug
inconnu (boundary existante `app/not-found.tsx`).

### 4. Bilinguisme du contenu projet ✅ tranché
Titre + description + contenu détail rédigés FR/EN dans `data/projects.ts`.
`hreflang` alternates hub et détail, même slug dans les deux locales.
Le README GitHub n'est PAS importé (mono-langue, images non maîtrisées).

### 5. JSON-LD ✅ tranché (à confirmer à l'implémentation)
Pages détail : `SoftwareApplication` (ou `CreativeWork` si le projet n'est pas
une application) avec `author` → `Person` `@id` existant de `lib/jsonLd.ts`.
Hub : `ItemList` des projets. Vérifier la cohérence `@id` avec le graphe existant.

### 6. Images des projets — OUVERT
Option A (recommandée) : aucune image, cartes typographiques dans le style
éditorial existant — zéro risque CSP, zéro poids. Option B : og-image générées
plus tard. Ne pas importer les avatars GitHub sans vérifier la CSP `img-src` de
`proxy.ts` (contrainte non négociable : ne pas affaiblir).

### 7. Nombre de projets affichés — OUVERT
Recommandation : tous les repos `featured` + top N (≈ 6) repos actifs triés par
`pushed_at`, champ `hidden` disponible dans `data/projects.ts` pour exclure.
À trancher selon le volume réel du compte GitHub au moment de l'implémentation.

## Required changes (provisional)

1. **`data/projects.ts`** — type `Project` (slug, repo owner/name, titleFr/En,
   summaryFr/En, detailFr/En optionnel, tags, featured, demoUrl?, hidden),
   tableau exporté. 2-3 projets réels pour démarrer.
2. **`lib/github.ts`** (nouveau, server-only) — `fetchRepoMeta(owner, repo)` :
   GET `https://api.github.com/repos/{owner}/{repo}`, parse stars/language/
   topics/pushed_at, timeout court + try/catch → `null` (graceful, cf. leçon
   BUG-001 : pas de `return []` silencieux sans log). `GITHUB_TOKEN` optionnel,
   server-only si présent.
3. **`app/[lang]/projets/page.tsx`** — metadata par locale, grille SSR des
   projets (cartes : titre, summary localisé, tags, stars si dispo, lien
   détail ou lien GitHub externe avec `rel="noopener"`), JSON-LD `ItemList`.
4. **`app/[lang]/projets/[slug]/page.tsx`** — `generateStaticParams` +
   `generateMetadata` bilingue (title/description/canonical/hreflang), contenu
   détail rédigé, JSON-LD projet, lien retour hub.
5. **Dictionnaires** — section `projects` (titre page, sous-titre, libellés
   cartes : « Voir sur GitHub », « stars », « En cours », etc.) FR/EN strictement
   parallèles.
6. **`app/sitemap.ts`** — entrées `/fr/projets` + `/en/projets` + pages détail
   featured avec alternates hreflang.
7. **`Footer.tsx`** — lien Projets (dictionnaire), cohérent avec le lien CV.
8. **README.md** — structure (nouveaux fichiers), section SEO/GEO mise à jour.

## Implementation notes
- Next 16 : `params` est **asynchrone** dans les pages/layouts (`await params`).
- Conventions non négociables (CONTEXT.md §6) : zéro chaîne en dur dans le JSX
  (y compris libellés cartés — passer par le dictionnaire) ; erreurs — pas
  d'API route ici, donc pas de nouveau contrat `{ error, errorCode }` ;
  secrets server-only (`GITHUB_TOKEN` ne doit jamais fuiter côté client —
  l'appel GitHub vit dans un server component, `lib/github.ts` marqué
  `server-only` si le pattern `lib/supabase.ts` le permet) ; CSP intacte.
- Pas de test automatisé encore (TEST-001) : la section Verification ci-dessous
  est la seule preuve de comportement.
- `check-locale.mjs` doit rester vert (exit 0) après l'ajout des clés.

## Acceptance criteria
- `/fr/projets` et `/en/projets` servent une grille SSR identique en contenu,
  traduite (vérifiable curl, sans JS).
- Chaque projet `featured` a une page détail servie aux deux locales avec
  title/description/canonical/hreflang par locale et JSON-LD valide (test
  https://validator.schema.org ou extraction manuelle).
- Un slug inconnu → 404 propre (boundary existante).
- GitHub API down / rate-limitée → pages quand même servies avec les données
  locales (aucun crash, pas de blank), constat en logs console côté serveur.
- Sitemap contient hub + pages détail avec alternates ; `robots.txt` inchangé.
- Footer porte le lien Projets ; header inchangé.
- `npm run lint`, `npm run typecheck`, `npm run build` verts ;
  `node scripts/check-locale.mjs` exit 0.

## Verification
1. `npm run build` — vérifier que les pages détail apparaissent en statique
   (○) ou dynamique assumé (ƒ) et que `generateStaticParams` les couvre.
2. `npm run build && npm run start` puis curl :
   - `/fr/projets` et `/en/projets` → 200, contenu traduit, lien sitemap OK ;
   - `/fr/projets/<slug>` → 200, `<link rel="canonical">` + hreflang fr/en ;
   - `/fr/projets/inconnu` → 404.
3. Simuler l'indisponibilité GitHub (BASE_URL erronée dans `lib/github.ts` en
   local, ou blocage réseau) → hub et détail toujours 200, métadonnées GitHub
   absentes, erreur loggée une fois (pas de spam de logs).
4. `node scripts/check-locale.mjs` → exit 0.
5. CSP : si des images GitHub ont été ajoutées, vérifier `/api/csp-report`
   vide après navigation ; sinon confirmer qu'aucune image tierce n'a été
   introduite.
6. Mesures responsive type UX-003 (CDP à 320/375/768/1280 px) : grille
   1 colonne mobile, zéro débordement horizontal.

## Handoff notes for the implementing LLM
- Ne crée PAS de page détail pour un projet sans contenu rédigé : c'est le
  critère anti-thin-content de cette spec. En cas de doute, la carte du hub
  suffit (et le critère d'acceptation s'ajuste : « chaque page détail a un
  contenu détail rédigé »).
- Ne touche ni `proxy.ts`, ni `lib/modelConfig.ts`, ni le chat : aucun
  rapatriement de contenu projet dans le système prompt Nicky.
- Le fallback GitHub doit être explicite (log unique) — pas de dégradation
  silencieuse (leçon BUG-001/SEC-005).
- Si l'arbitrage images (décision 6) s'oriente vers les og-images GitHub
  (`opengraph.githubassets.com`), STOP : vérifier d'abord la CSP `img-src` de
  `proxy.ts` et documenter l'ajout de domaine dans le commit, sinon rester
  sans image.
- Un ticket = un commit cohérent (`feat(PROJ-001):`), corps justifiant les
  décisions 6 (images) et 7 (volume) tranchées à l'implémentation.