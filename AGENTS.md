# AGENTS.md

Agent IA / LLM : le contexte de ce dépôt vit dans [`CONTEXT.md`](CONTEXT.md).

**Ordre de lecture avant toute intervention :**

1. [`CONTEXT.md`](CONTEXT.md) — projet, commandes, conventions non négociables, outils de recherche, pièges, état des tickets
2. [`architecture.md`](architecture.md) — techos, zones de code, flux de données, conventions durables (pas besoin de le relire si tu connais déjà sa structure)
3. la spec du ticket visé : `docs/backlog/TICKET-ID-nom-spec.md`
4. [`project-state.md`](project-state.md) — source de vérité des statuts
5. [`README.md`](README.md) — seulement si tu touches un point documenté (env vars, mode CAG/RAG, API)

Ce fichier n'est qu'un **aiguillage** : toutes les règles et tout le détail sont dans `CONTEXT.md`.
Ne rien dupliquer ici — deux sources divergentes valent moins qu'une seule.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
