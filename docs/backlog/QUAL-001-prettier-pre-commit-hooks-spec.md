# QUAL-001 — Prettier & Pre-commit Hooks Spec

> **Statut : VALIDÉE — livrée (opérateur 2026-10-05)**
>
> **Livraison** : branche `qual-001-prettier-pre-commit-hooks` (créée depuis `main` @ `832530e` ; `6a2c0a9` `feat(QUAL-001)` : config + hook, 7 fichiers +180/−1 — `.prettierrc`, `.prettierignore`, `.editorconfig`, `lint-staged.config.mjs`, `.husky/pre-commit`, `package.json`, `package-lock.json` ; puis `5f329b8` `style(QUAL-001)` : passe de formatage initiale, 61 fichiers code/config +1294/−689), **fusionnée sur `main` et poussée sur `origin/main`** (merge commit `6d94f7b`, 2026-10-05, déploiement Vercel automatique au push), branche locale conservée. Contenu : devDeps npm uniquement `prettier@3.9.9` / `husky@9.1.7` / `lint-staged@17.6.0` ; `.prettierrc` 4 clés (`singleQuote`, `semi: false`, `printWidth: 100`, `trailingComma: "all"`) ; `.prettierignore` (inclut `*.md` et `docs/`) ; `.editorconfig` ; `lint-staged.config.mjs` ; scripts `format` / `format:check` ; `prepare: husky` ; hook `pre-commit` → lint-staged (prettier --write puis eslint --fix sur `*.{ts,tsx,js,mjs}`, prettier --write seul sur `*.{json,css,yml,yaml}`) ; `eslint-config-prettier` NON ajouté (aucun conflit constaté). Hook testé : bloque (exit 1) sur format cassé + erreur lint, auto-corrige sur violation de format seule. Revue glm-reviewer (contexte frais) **CORRECTIONS PROPOSÉES** — 0 bloquant / 0 majeur / 1 mineur / 2 suggestions, **tous reportés sans application** (règle opérateur : n'appliquer que bloquant/majeur) : F1 mineur `.prettierignore`/`.vscode` — prémisse invalidée (Prettier 3.9.9 honore `.gitignore` par défaut, vérifié exit 0 + mtimes intacts ; nuance réelle `.mcp.json` tracked+gitignored à trancher hors ticket) ; F2 suggestion ancrer `docs/` → `/docs/` — sans effet (un seul `./docs` à la racine) ; F3 suggestion écart lint-staged — pas un écart (spec §4 « prettier --write to matched staged files ») et documenté dans le corps de `6a2c0a9`. Re-review sans objet (aucune correction appliquée, diff inchangé). Escalades/résolutions : ① écart §5 (`prettier --write .` littéral reformatait 95 `.md` dont `CONTEXT.md`/`project-state.md`/`architecture.md` + 90+ specs → `.prettierignore` inclut `*.md` et `docs/`, passe limitée au code/config) **ratifié par l'opérateur le 2026-10-05** (décision 2) ; ② `printWidth: 100` retenu vs défaut 80 (1 983 vs 3 087 lignes de diff, documenté dans le corps du commit) ; ③ piège §9 `.next/* [0-9].*` purgé pendant le type-check (non lié au diff). Tests mesurés (2026-10-05) : lint 0/0, type-check exit 0, `npm test` **108/108 (7 fichiers, 188 ms)** (baseline inchangée, 0 nouveau test), build secret-free exit 0 (16 pages), `npm run format:check` OK. Validée opérateur le 2026-10-05 (écart §5 ratifié). Trace de livraison dans `project-state.md` et `CONTEXT.md` §8.

---

## Goal
Standardize code formatting and guarantee lint/format checks run before every commit.

## Why this ticket exists
Current state in the repo:
- No Prettier — formatting relies on each contributor's editor settings; risk of noisy diffs and style debates in PRs.
- No `husky` / `lint-staged` — nothing prevents committing code that fails `npm run lint`.
- `package.json` has `lint` and `type-check` scripts but nothing enforces them locally.

## Scope

In scope:
- add Prettier with a committed config
- add `husky` + `lint-staged` pre-commit hook
- add `format` / `format:check` scripts
- one initial formatting pass over the repo (single commit)

Out of scope:
- CI pipeline (CICD-001 handles that)
- ESLint rule changes (QUAL-003)
- adding new formatters beyond Prettier

## Files to inspect first
- `package.json` (package manager is **npm** — do not use pnpm/yarn commands in hooks)
- `eslint.config.mjs` (avoid config conflicts between ESLint and Prettier)
- `.gitignore`
- `.editorconfig` (create if absent)

## Required changes

### 1. Add dev dependencies
- `prettier`
- `husky`
- `lint-staged`

### 2. Prettier configuration
- Add a minimal `.prettierrc` — explicit is better than implicit defaults; align with the existing codebase style (single quotes, no trailing commas changes beyond defaults, existing print width). Check a few core files (`lib/rateLimit.ts`, `components/ChatPreview.tsx`) to pick values that minimize the diff.
- Add `.prettierignore`: `.next/`, `out/`, `build/`, `node_modules/`, `public/llms-full.txt` (generated at build), `package-lock.json`, coverage dirs.
- Do not add `eslint-config-prettier` unless an actual rule conflict appears with the current `eslint.config.mjs` (note it in the PR if added).

### 3. Package scripts
Add to `package.json`:
- `format`: `prettier --write .`
- `format:check`: `prettier --check .`

### 4. Husky + lint-staged
- `npx husky init` (npm — creates `.husky/pre-commit`).
- `.husky/pre-commit` runs `npx lint-staged`.
- `lint-staged` config (in `package.json` or `lint-staged.config.js`) applying:
  - `prettier --write` to matched staged files
  - `eslint --fix` to `*.{ts,tsx,js,mjs}` files
- Hook must fail (non-zero exit) when lint-staged checks fail — that is the point.

### 5. Initial formatting pass
- Run `npm run format` once, in a dedicated commit, so the hook setup commit stays reviewable.
- Verify the diff contains only formatting changes: `npm run lint`, `npm run type-check`, and `npm run build` must all pass after formatting.

## Implementation notes
- Keep the Prettier config tiny — 3–5 keys max. Defaults are fine; consistency is the goal, not a house style.
- The pre-commit hook must be fast: lint-staged scoping ensures only staged files are processed.
- Existing ignore globs in `eslint.config.mjs` (`.claude/**`, `example-project*/**`) must also be covered by `.prettierignore`.

## Acceptance criteria
- `npm run format:check` passes on a clean checkout.
- Committing a badly formatted `.ts` file triggers lint-staged and either auto-fixes it or fails the commit.
- `npm run lint`, `npm run type-check`, `npm run build` all pass post-formatting.
- No behavioral diff in the formatting commit (build output unchanged).

## Verification
Run:
- `npm install`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Manual: stage a file with a formatting violation + a lint error, attempt to commit, confirm the hook blocks or fixes it.

## Handoff notes for the implementing LLM
- npm is the package manager — husky's `prepare` script and hook paths differ for pnpm/yarn; do not mix.
- Do not reorder or reformat config files beyond what Prettier produces.
- If `eslint --fix` and Prettier fight over a file, stop and document it rather than silently disabling one side.