# FEAT-CAG — Rétro-spec : bascule RAG → CAG pour le chat

**Priorité** : MEDIUM · **Effort estimé** : S · **Statut** : ✅ Livrée (2026-06-22) — rétro-spec rédigée le 2026-09-23
**Périmètre** : `/api/chat` uniquement · **Parent** : aucune · **Dépendances** : aucune (livrée avant le corpus de specs)

> **Qu'est-ce qu'une rétro-spec ?** Cette feature a été livrée le 2026-06-22
> (`b96183f`), avant que le dépôt n'adopte la convention des specs par ticket.
> Ce document ne pilote donc aucune implémentation à venir : il consolide le
> *pourquoi* de la bascule RAG → CAG, les décisions d'architecture et les
> résultats mesurés, pour qu'un futur agent retravaillant ce périmètre
> (`PERF-002` streaming, évolution du corpus, changement de provider) ait la
> trace de décision au bon endroit. Le statut de détail reste porté par
> `project-state.md` (convention de traçabilité, cf. revue TEST-001).

## Pourquoi quitter le RAG pour le chat

Trois raisons, dans l'ordre du poids :

1. **Le corpus est trop petit pour justifier du retrieval.** Le CV complet
   (`data/cv.md`) faisait ~1 848 tokens à la bascule, ~2 405 aujourd'hui —
   soit 1-2 % des fenêtres de contexte des modèles utilisés (GPT-6 Luna
   ~1,05 M, Gemini 3.5 Flash ~1 M ; le modèle OpenAI était GPT-5.4 mini
   ~128 K avant la bascule MODEL-004 du 2026-09-25). Découper en chunks puis en retrouver 10 par
   recherche vectorielle est une machine à résoudre un problème qui n'existe pas.
2. **Le RAG coûtait de la latence sans contrepartie.** Chaque requête chat
   déclenchait un aller-retour Supabase (embedding + RPC `match_documents`)
   avant l'appel provider : latence mesurée ≈ 5,4 s en RAG contre ≈ 1,4 s en
   CAG (OpenAI). Le retrieval peut aussi *manquer* des snippets pertinents,
   ce qui dégrade la fidélité des réponses sur un document unique.
3. **Le prompt caching provider-side rend le contexte complet quasi gratuit.**
   Le préfixe système (persona + CV) est stable d'une requête à l'autre, donc
   éligible au caching : OpenAI réduit coût et latence dès ~1 024 tokens cachés
   (mesuré : 5/5 hits), Gemini expose `cachedContent` dès ~2 048 tokens.
   L'argument historique « injecter le CV entier coûte cher à chaque requête »
   tombe dès lors.

## Décisions d'architecture

| Décision | Choix | Fichier |
|---|---|---|
| Source de contexte configurable en un point | `CV_CONTEXT_SOURCE = 'cag' \| 'rag'` — le switch ne touche ni la logique provider ni les routes | `lib/modelConfig.ts` |
| Source de vérité du CV éditable | `data/cv.md`, chargé une fois et gardé en mémoire (redémarrer le serveur après édition) | `data/cv.md` + `lib/cvContext.ts` (`server-only`) |
| Périmètre V1 | `/api/chat` seulement — `/api/job-match` reste en RAG (analyse ciblée sur une offre, le retrieval y a toujours du sens) | `app/api/chat/route.ts` |
| RAG conservé, pas supprimé | fallback configurable si le corpus grossit (portfolio, projets détaillés, publications) | `lib/rag.ts` |
| Composition du prompt | persona + bloc CV en **préfixe stable**, tout le reste (consigne de langue, GEO-08g) **après** — précondition du caching | `lib/systemPrompt.mjs` |

## Prompt caching par provider

| Provider | Mécanisme | Seuil minimal | Réduction coût | Latence |
|---|---|---|---|---|
| OpenAI | automatique (prefix cache) | 1 024 tokens | 50-90 % | ~-80 % |
| Gemini | `cachedContent` API / metadata | 2 048 tokens | ~75 % (annoncé) | variable |

## Résultats mesurés (FEAT-CAG-004, à la livraison)

- **Validation fonctionnelle** : `scripts/validate-cag.mjs` — 9/9 réponses non vides, garde-fou hors-sujet 2/2 en CAG (à la même date, le garde-fou RAG échouait sur « Tell me a joke » — argument de plus pour la bascule).
- **Comparaison CAG vs RAG** : `scripts/compare-results.mjs` — 9/9 des deux côtés, latence moyenne 8,0 s (Gemini) vs 5,4 s (RAG) ; le CAG OpenAI mesuré ≈ 1,4 s.
- **Cache OpenAI** : 5/5 hits, 1 280 tokens cachés (baseline 2026-06-22).
- **Cache Gemini** : 0/5 hit explicite, `promptTokenCount` ≈ 1 951 (< seuil) — **non confirmé** ; ne pas promettre d'économies Gemini sans re-mesurer (piège repris dans `CONTEXT.md` §9).

## Évolutions post-livraison (à connaître)

- **GEO-08g (2026-09-23)** : la consigne de langue du chat est ajoutée **en fin** de prompt, après le bloc CV, pour que le préfixe persona + CV reste byte-identique entre fr/en — sinon le cache se scinde en deux entrées et le hit rate est divisé. Ne pas déplacer cette consigne (`c010db2`, `0d7bf66`).
- **Mesures actuelles** (re-mesuré le 2026-09-25, `scripts/measure-cv-tokens.mjs`) : CV 9 620 chars ≈ **2 405 tokens**, préfixe stable ≈ **2 869 tokens** (2 643 avant le durcissement de la persona par MODEL-004), décision `stay-on-cag`. Le baseline chiffré de `docs/cag-limits.md` a été rafraîchi sur ces valeurs le même jour (l'ancien baseline 2026-06-22 y est conservé en note d'historique).
- **Banc de modèles** (`cfb1b8e`, 2026-09-23) : A/B de modèles sur le prompt CAG réel, à l'origine du choix GPT-5.4 mini alors actif. **Remplacé depuis** : MODEL-004 (2026-09-25) a basculé le modèle OpenAI sur **`gpt-6-luna`** (≈ ×11,6 moins cher par appel), après durcissement du garde-fou hors-sujet et vérification au banc — la référence GPT-5.4 mini de ce document décrit le modèle de l'époque, pas le modèle livré aujourd'hui.

## Limites et règles de décision

Détaillées dans [`docs/cag-limits.md`](../cag-limits.md) :

| Taille CV | Décision |
|---|---|
| ≤ ~10K tokens | rester en CAG par défaut |
| > ~10K tokens | re-bencher latence/coût/qualité (`validate-cag.mjs` + `measure-cache.mjs`), envisager RAG |
| > ~50K tokens | préférer RAG / retrieval sectionné |

Outils de mesure : `scripts/measure-cv-tokens.mjs` (taille + éligibilité cache), `scripts/measure-cache.mjs` (hit rate réel, `--lang both` pour le préfixe partagé fr/en), `scripts/validate-cag.mjs` (qualité, `--lang en` pour la fidélité).

## Sous-tâches (statut — détail dans `project-state.md`)

- [x] **FEAT-CAG-001** — architecture de source de contexte (`CV_CONTEXT_SOURCE`)
- [x] **FEAT-CAG-002** — `data/cv.md` + loader serveur `lib/cvContext.ts`
- [x] **FEAT-CAG-003** — branchement `/api/chat` sur CAG + prompt caching
- [x] **FEAT-CAG-004** — validation qualité + mesure cache hit rate (4 scripts + `docs/cag-limits.md`)
- [x] **FEAT-CAG-005** — documentation et mode opératoire (README)

## Commits

- `b96183f` (2026-06-22) — feat: enable CAG context for chat
- `1ae79f6` (2026-06-22) — docs: add CAG validation workflow (scripts de validation/mesure)
- `fd01202` (2026-06-23) — docs: fix CAG ticket statuses
- `cfb1b8e` (2026-09-23) — perf(bench): banc A/B de modèles sur le prompt CAG réel