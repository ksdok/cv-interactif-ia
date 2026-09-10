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
| SEO-01 | Corriger le positionnement (metadata + JSON-LD) | P0 | S | — | ⬜ | [SEO-01-positionnement-metadata-jsonld.md](SEO-01-positionnement-metadata-jsonld.md) |
| SEO-02 | Restructurer le Hero (H1 = nom + métier) | P0 | S | SEO-01, GEO-08 | ⬜ | [SEO-02-hero-h1.md](SEO-02-hero-h1.md) |
| SEO-03 | Rendre le contenu du CV visible en HTML (`/cv` + homepage) | P1 | M | SEO-01, GEO-08 | ⬜ | [SEO-03-contenu-cv-html.md](SEO-03-contenu-cv-html.md) |
| SEO-04 | Canonical + déduplication du domaine vercel.app | P1 | S | — | ⬜ | [SEO-04-canonical-dedup-vercel.md](SEO-04-canonical-dedup-vercel.md) |
| SEO-05 | Section FAQ + schema FAQPage | P1 | M | SEO-01, GEO-08 | ⬜ | [SEO-05-faq-faqpage.md](SEO-05-faq-faqpage.md) |
| GEO-06 | Ajouter `/llms.txt` | P2 | S | GEO-08 | ⬜ | [GEO-06-llms-txt.md](GEO-06-llms-txt.md) |
| GEO-07 | Règles explicites crawlers IA dans robots.txt | P2 | S | — | ⬜ | [GEO-07-robots-crawlers-ia.md](GEO-07-robots-crawlers-ia.md) |
| GEO-08 | Stratégie linguistique FR / bilingue (décision) | P2 | L | décision produit | 🟧 DÉCIDÉ — bilingue B (impl. à faire) | [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) |
| GEO-09 | Présence off-page (Malt, LinkedIn, citations) | P3 | continu | SEO-01 | ⬜ | [GEO-09-presence-off-page.md](GEO-09-presence-off-page.md) |
| TECH-10 | Dédoublonner la meta viewport | P3 | XS | — | ⬜ | [TECH-10-meta-viewport.md](TECH-10-meta-viewport.md) |

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

## Conventions du corpus

- Format de ticket : Pourquoi / Comment / Fichiers impactés / Résultat attendu / Critères
  d'acceptation / Dépendances / KPI (quand mesurable).
- Quand un ticket est terminé : passer son statut à ✅ dans ce fichier **et** dans son propre
  front-matter, et noter la date.
- 🔗 SEO-03 absorbe et précise l'item backlog existant n°10
  (`docs/backlog/10-enrich-indexable-static-content-plan.md`), dont le keyword cible
  (« Product Designer ») est à remplacer par le positionnement BA freelance.
