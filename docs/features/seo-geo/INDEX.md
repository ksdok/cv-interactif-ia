# Specs SEO & GEO — Index

> **Source** : Audit SEO/GEO réalisé le 2026-09-10 (code, HTML production, scrape Firecrawl de la
> homepage, best practices GEO 2026 : generativeengineoptimization.solutions, seoscore.tools).
>
> **Objectif global** : Rendre le site découvrable et citable pour les requêtes
> « Business Analyst freelance / AMOA / finance de marché » — sur Google **et** dans les réponses
> des moteurs génératifs (ChatGPT, Perplexity, Claude, Google AI Overviews).
>
> **Diagnostic racine** : le site se présente aujourd'hui comme « Product Designer / Interactive
> Resume » alors que le positionnement réel est « Business Analyst Senior freelance (AMOA), finance
> de marché ». Le contenu différenciant (chiffres, missions, entités nommées) n'existe que dans
> `data/cv.md` (consommé par le chatbot) et n'est **jamais rendu en HTML** — ~1 600 caractères
> visibles par les crawlers.

## Tickets

| ID | Titre | Priorité | Effort | Dépendances | Statut | Fichier |
|----|-------|----------|--------|-------------|--------|---------|
| SEO-01 | Corriger le positionnement (metadata + JSON-LD) | P0 | S | — | ✅ (2026-09-10, fast-path FR) | [SEO-01-positionnement-metadata-jsonld.md](SEO-01-positionnement-metadata-jsonld.md) |
| SEO-02 | Restructurer le Hero (H1 = nom + métier) | P0 | S | SEO-01, GEO-08 | ✅ (2026-09-10, fast-path EN) | [SEO-02-hero-h1.md](SEO-02-hero-h1.md) |
| SEO-03 | Rendre le contenu du CV visible en HTML (`/cv` + homepage) | P1 | M | SEO-01, GEO-08 | ✅ (2026-09-10, fast-path EN) | [SEO-03-contenu-cv-html.md](SEO-03-contenu-cv-html.md) |
| SEO-04 | Canonical + déduplication du domaine vercel.app | P1 | S | — | ✅ (2026-09-10, option B — redirect 301) | [SEO-04-canonical-dedup-vercel.md](SEO-04-canonical-dedup-vercel.md) |
| SEO-05 | Section FAQ + schema FAQPage | P1 | M | SEO-01, GEO-08 | ⬜ | [SEO-05-faq-faqpage.md](SEO-05-faq-faqpage.md) |
| GEO-06 | Ajouter `/llms.txt` | P2 | S | GEO-08 | ⬜ | [GEO-06-llms-txt.md](GEO-06-llms-txt.md) |
| GEO-07 | Règles explicites crawlers IA dans robots.txt | P2 | S | — | ✅ (2026-09-12, vérifié en prod) | [GEO-07-robots-crawlers-ia.md](GEO-07-robots-crawlers-ia.md) |
| GEO-08 | Stratégie linguistique FR / bilingue (décision) | P2 | L | décision produit | 🟧 DÉCIDÉ — bilingue B ; **découpé en 08a→08h** (2026-09-12) | [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) |
| GEO-08a | Fondation routing i18n : `app/[lang]/` | P2 | M | — | ✅ (2026-09-12, option A ; review B1 traitée — cause racine corrigée, cf. ticket) | [GEO-08a-fondation-routing-i18n.md](GEO-08a-fondation-routing-i18n.md) |
| GEO-08b | Dictionnaires `lib/i18n/` + composants en props | P2 | M | GEO-08a | ✅ (2026-09-12, livré avec 08a+08c+08e — review B2/B4 ; ligne INDEX oubliée, corrigée review Lot 1) | [GEO-08b-dictionnaires-i18n.md](GEO-08b-dictionnaires-i18n.md) |
| GEO-08c | Détection locale + redirect 307 + `x-locale` (`proxy.ts`) | P2 | S | GEO-08a | ✅ (2026-09-12, livré avec 08a+08e — review B2 ; étape 2 corrigée M2) | [GEO-08c-proxy-detection-locale.md](GEO-08c-proxy-detection-locale.md) |
| GEO-08d | Metadata + JSON-LD + hreflang bilingues | P2 | S | GEO-08b | ✅ (2026-09-12, branche feat/geo-08d-lot1 — voir livraison en fin de ticket) | [GEO-08d-metadata-jsonld-hreflang-bilingue.md](GEO-08d-metadata-jsonld-hreflang-bilingue.md) |
| GEO-08e | Sitemap bilingue + `alternates.languages` | P2 | XS | GEO-08a (08d reco) | ✅ (2026-09-12, livré avec 08a+08c — review B2) | [GEO-08e-sitemap-bilingue.md](GEO-08e-sitemap-bilingue.md) |
| GEO-08f | Switcher de langue Header (lien crawlable) | P2 | XS | GEO-08b | ⬜ | [GEO-08f-switcher-langue-header.md](GEO-08f-switcher-langue-header.md) |
| GEO-08g | Chat Nicky multilingue + fidélité EN | P2 | S | GEO-08b | ⬜ | [GEO-08g-chat-nicky-multilingue.md](GEO-08g-chat-nicky-multilingue.md) |
| GEO-08h | Migration `/cv` bilingue (`/fr/cv`, `/en/cv`) + 301 | P2 | S | GEO-08a, 08b, 08d | ⬜ | [GEO-08h-migration-cv-bilingue.md](GEO-08h-migration-cv-bilingue.md) |
| GEO-09 | Présence off-page (Malt, LinkedIn, citations) | P3 | continu | SEO-01 | ⬜ | [GEO-09-presence-off-page.md](GEO-09-presence-off-page.md) |
| TECH-10 | Dédoublonner la meta viewport | P3 | XS | — | 🟡 critère 1 ✅ en prod ; critères 2/3 (device iOS + Lighthouse) à vérifier (2026-09-12) | [TECH-10-meta-viewport.md](TECH-10-meta-viewport.md) |
| INFRA-11 | Adresse contact@kimsandok.com (transfert vers Gmail) | P3 | S | — | ⬜ | [INFRA-11-contact-email-forwarding.md](INFRA-11-contact-email-forwarding.md) |

Légende effort : XS < 15 min · S < 1 h · M ½ journée · L > 1 journée.
Statuts : ⬜ à faire · 🟡 en cours · 🟧 décidé (impl. à faire) · ✅ fait.

## Ordre d'exécution recommandé

> 🟧 GEO-08 tranché le 2026-09-10 : **option B — bilingue `/fr` + `/en`** (décision actée,
> implémentation à faire).
> Conséquence : la structure i18n (`app/[lang]/`, dictionnaires, `proxy.ts`) devient le
> **prérequis de tous les tickets de wording** (SEO-01/02/03/05, GEO-06). Les lots
> ci-dessous sont ré-ordonnancés en conséquence.

### Fast-path (recommandé) : ne pas bloquer les P0

SEO-01 et SEO-02 sont **P0** et constituent « le correctif à plus fort rapport impact/effort »
de l'audit. Les livrer en **FR-only sur la structure monolingue actuelle** avant le Lot 0
permet de capturer la correction d'entité en jours plutôt qu'en semaines ; le wording est
ensuite reporté tel quel dans les dictionnaires `lib/i18n/` lors du Lot 0. Ce fast-path ne
contredit pas la décision bilingue : il la pré-câble.

```
⛔ PÉRIMÉ depuis le découpage du 2026-09-12 — le diagramme et les Lots 0-3 ci-dessous
sont remplacés par le bloc « Mise à jour 2026-09-12 » en fin de section (revue M8 :
les deux plans coexistaient et se contredisaient). Conservé pour l'historique du
fast-path uniquement.
```

```
Fast-path (FR-only, structure actuelle) : SEO-01 + SEO-02 + TECH-10 + GEO-07 + SEO-04 (canonical)
                                              │
                                              ▼  (report du wording dans lib/i18n/)
GEO-08 🟧 (décidé) → implémentation i18n [lang] ─┐
                                                 ├─→ SEO-01 ─→ SEO-02 ─→ SEO-03 ─→ SEO-05
SEO-04 (hreflang, dans [lang]/layout) ───────────┘          └─→ GEO-06 (llms.txt bilingue)
GEO-09 (continu, dès SEO-01 terminé)
```

- **Fast-path** (FR-only, livrable immédiatement) : SEO-01 + SEO-02 + TECH-10 + GEO-07 +
  SEO-04 (canonical only ; hreflang ajouté au Lot 0)
- **Lot 0** (fondation) : routing i18n `app/[lang]/` + dictionnaires fr/en + détection
  locale dans `proxy.ts` + sitemap/hreflang (plan détaillé dans GEO-08) — report du wording
  fast-path dans les dictionnaires
- **Lot 1** : SEO-01 + SEO-02 (re-déclinaison bilingue) + SEO-04 (hreflang dans le layout)
- **Lot 2** : SEO-03 (`/fr/cv` + `/en/cv`) + GEO-06
- **Lot 3** : SEO-05 + GEO-09

> **Mise à jour 2026-09-12** : GEO-08 est découpé en 8 sous-tickets (08a→08h) —
> **Lot 0 = GEO-08a (routing, option A : root layout conservé + `x-locale`) + GEO-08b
> (dictionnaires)**, livrés ensemble si possible (sinon redirect temporaire `/` → `/fr`),
> puis GEO-08c (proxy) · **Lot 1 = GEO-08d**
> (metadata/hreflang, absorbe la re-déclinaison SEO-01/02 + SEO-04 hreflang) ·
> **Lot 2 = GEO-08e (sitemap) + GEO-08f (switcher) + GEO-08h (migration `/cv` bilingue,**
> **absorbe la re-déclinaison SEO-03)** + GEO-06 ·
> **Lot 3 = GEO-08g (chat EN)** + SEO-05 + GEO-09.
>
> **Complément 2026-09-12 (review post-implémentation)** : GEO-08a + GEO-08c +
> GEO-08e + **GEO-08b** sont livrés ensemble sur `feat/geo-08-i18n` (review B2 —
> un déploiement isolé de 08a seul aurait publié `/` en 404 sans point d'entrée).
> **Le Lot 0 est complet** : `/fr` s'affiche en français, `/en` en anglais, zéro
> chaîne visible en dur, canonical par locale (B3). Suite : Lot 1 = GEO-08d.
>
> **Review Lot 0 (2026-09-12) : ✅ APPROUVÉ** — typecheck/lint/build verts,
> critères revérifiés en conditions réelles. Findings M1–M6 tous non-bloquants,
> traités : M1 (note sitemap /cv conservé), M2 (`localeFromHeaders`), M3 (type
> `generateMetadata` honnête), M4 (commentaire nuancé `__next_error__`),
> M5 (tracé à GEO-08h), M6 (déjà tracé). Suite : Lot 1 = GEO-08d.
>
> **Livraison Lot 1 (2026-09-12)** : GEO-08d livré sur `feat/geo-08d-lot1`
> (metadata/dictionnaires/hreflang/JSON-LD bilingues — détail et vérification
> en fin de ticket). SEO-02 bilingue : déjà couvert par le Lot 0 (Hero via
> dictionnaire). Gap assumé : /cv sans JSON-LD jusqu'à GEO-08h (critère 5).
> **Suite : Lot 2 = GEO-08f (switcher) + GEO-08h (migration /cv) + GEO-06**
> (sitemap 08e déjà livré au Lot 0).
>
> **Review Lot 1 (2026-09-12) : ✅ APPROUVÉ, M1–M4 traités dans la branche** :
> M1 (x-default sitemap aligné sur `/fr` — la racine n'est qu'un redirect 307,
> jamais un candidat x-default) · M2 (JSON-LD mutualisé dans `lib/jsonLd.ts`,
> **restauré sur /cv** via le builder consommé par `app/cv/page.tsx` — gap
> fermé, pas seulement tracé) · M3 (`og:image`/`twitter:image` déclarés
> explicitement dans `[lang]/layout` **et** `/cv`, alt traduit — la convention
> fichier ne s'applique qu'aux segments qui ne redéclarent pas openGraph) ·
> M4 (keywords root dérivés du dictionnaire, `SITE_KEYWORDS`). Nits : N1
> (commentaire fr.ts corrigé) · N2 (`og:locale:alternate` ajouté) · N3/N4
> (pré-existants, tracés à GEO-08h / notes GEO-08d) · N5 (ligne GEO-08b de
> l'INDEX corrigée ✅).

## Conventions du corpus

- Format de ticket : Pourquoi / Comment / Fichiers impactés / Résultat attendu / Critères
  d'acceptation / Dépendances / KPI (quand mesurable).
- Quand un ticket est terminé : passer son statut à ✅ dans ce fichier **et** dans son propre
  front-matter, et noter la date.
- 🔗 SEO-03 absorbe et précise l'item backlog existant n°10
  (`docs/backlog/10-enrich-indexable-static-content-plan.md`), dont le keyword cible
  (« Product Designer ») est à remplacer par le positionnement BA freelance.
- 🌐 **Langue du fast-path** : le site étant actuellement en anglais (ChatPreview,
  ExperienceGrid, Footer), les tickets de wording **visible** livrés en fast-path le sont en
  **EN** pour préserver la cohérence visuelle avec la prod (SEO-02 Hero, SEO-03 page CV).
  SEO-01 (metadata + JSON-LD) a été livré en **FR** — c'est une incohérence latente à
  résorber au Lot 0 (GEO-08, dictionnaires `lib/i18n/` + routing `app/[lang]/`), où le
  wording FR/EN sera aligné dans les deux langues. Les tickets notent leur langue de
  fast-path dans leur statut.
