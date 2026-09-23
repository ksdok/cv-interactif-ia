# TEST-002 — Drop `vite-tsconfig-paths` for Native tsconfig Path Resolution Spec

**Priorité** : `LOW`
**Effort estimé** : XS (< 15 min)
**Révision** : 2026-09-23 — créé à partir des signaux d'installation/run CI

## Goal
Retirer la dépendance `vite-tsconfig-paths` au profit de la résolution native de Vite
(`resolve.tsconfigPaths`), supprimant une dépendance transitive non maintenue et le
warning de détection de plugin émis à chaque exécution des tests.

## Why this ticket exists
Signaux observés pendant TEST-001 et son run CI :
- sortie de `npm ci` (run CI `35862478119`) :
  `npm warn deprecated tsconfck@3.1.6: unmaintained`
- chaque `npm run test` imprime :
  `The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.`
- le commentaire ajouté dans `vitest.config.mts` lors de la revue de TEST-001 enregistre
  déjà ceci comme « un candidat naturel pour un futur ticket dédié ».

Provenance vérifiée :
```
$ npm ls tsconfck
cv-interactif-ia@0.1.0
└─┬ vite-tsconfig-paths@6.1.1
  └── tsconfck@3.1.6
```
`tsconfck` n'est atteignable **que** via `vite-tsconfig-paths` ; retirer le plugin retire
la dépendance non maintenue de l'arbre.

Le plugin a été conservé dans TEST-001 volontairement — la spec l'exigeait explicitement
(§1/§3). Ce ticket supplée ce choix maintenant que Vite résout lui-même les chemins du
tsconfig.

## Dependencies
- Dépend de TEST-001 (livré) : la config Vitest et le test utilisant l'alias doivent déjà
  exister.
- Suppléé TEST-001 §1/§3 sur le **mécanisme de résolution d'alias uniquement**. Le script
  `test` (non-watch), `type-check`, la cible Node et les choix `environment: 'node'` /
  absence de `globals` ne sont pas affectés.

## Scope
In scope :
- activer `resolve.tsconfigPaths: true` dans `vitest.config.mts`
- retirer l'enregistrement du plugin `vite-tsconfig-paths`
- désinstaller `vite-tsconfig-paths` des `devDependencies`
- vérifier que l'alias `@/*` résout toujours dans les tests

Out of scope :
- ajouter du test de composants React/jsdom
- modifier le contenu de la suite de tests
- seuils de couverture
- tout autre nettoyage de config (notamment le choix de l'extension `.mts` — toujours requis)

## Files to inspect first
- `vitest.config.mts`
- `package.json`
- `lib/__tests__/validation.test.ts` (importe `@/lib/validation` — la preuve de l'alias)

## Required changes

### 1. Config
`vitest.config.mts` devient approximativement :
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
  },
})
```
Retirer l'import et l'entrée de plugin `vite-tsconfig-paths`, et mettre à jour le
commentaire environnant pour qu'il explique l'option native et non le plugin.

### 2. Retrait de la dépendance
```
npm uninstall vite-tsconfig-paths
```
Confirmer que `package-lock.json` ne contient plus ni `vite-tsconfig-paths` ni `tsconfck`
(`grep tsconfck package-lock.json` → aucun hit).

### 3. Préserver la preuve de l'alias
`lib/__tests__/validation.test.ts` doit continuer d'importer via `@/lib/...`. Si l'alias
cesse silencieusement de résoudre, cet import échoue — c'est précisément l'objet du
critère d'acceptation. Ne pas le convertir en import relatif.

### 4. Préserver les autres choix de TEST-001
Ne pas activer `test.globals`, ne pas restreindre `test.include`, ne pas renommer la
config en `.ts`, ne pas modifier les scripts `test` / `test:watch` / `type-check`.

## Implementation notes
- Deux lignes de config plus un retrait de dépendance. Rester à cette taille.
- `resolve.tsconfigPaths` est une option Vite ; `vitest/config` réexporte le type de config
  Vite, l'option est donc disponible sans types supplémentaires.
- Vérifier que l'orthographe de l'option correspond bien au major de Vite installé
  (`vitest --version` / `vite --version`) avant de committer : cette spec cite un message
  d'avertissement, pas la documentation d'API.

## Pitfalls
- **Supprimer la preuve de l'alias.** Si le seul import `@/*` est converti en chemin
  relatif pendant la migration, le critère d'acceptation devient invérifiable.
- **Croire le plugin inoffensif.** Il traîne une dépendance transitive non maintenue
  (`tsconfck`) et un warning dans chaque run.
- **Toucher au défaut de `test.include`.** Non concerné ici ; ne pas le « corriger » au
  passage.
- **Confondre majors d'actions et majors de paquets.** `vite-tsconfig-paths@^6` n'a rien à
  voir avec le major de Vite ; vérifier la version de Vite réellement installée avant de
  supposer que `resolve.tsconfigPaths` existe.

## Acceptance criteria
- `vitest.config.mts` utilise `resolve.tsconfigPaths: true` et n'importe plus
  `vite-tsconfig-paths`
- `vite-tsconfig-paths` est absent de `package.json` et de `package-lock.json`
- `grep -rn "tsconfck" package-lock.json` ne retourne aucun hit
- `npm run test` passe (les mêmes 40 tests, 0 skipped) **sans** warning de détection de
  plugin
- `@/*` résout toujours — prouvé par l'import `@/lib/validation` existant, toujours vert
- `npm run type-check`, `npm run lint`, `npm run build` passent

## Verification
```bash
npm ci
npm run test          # attendu : 40 passed, aucun warning de plugin
npm run type-check
npm run lint
npm run build
grep -rn "vite-tsconfig-paths\|tsconfck" package.json package-lock.json vitest.config.mts   # attendu : aucun hit
```
Confirmer aussi que le run CI cesse d'imprimer le `npm warn deprecated tsconfck` pendant
`npm ci`.

## Handoff notes for the implementing LLM
- Petit et mécanique ; ne pas empaqueter de travail d'infrastructure de test non lié.
- Si l'option native ne se comporte pas exactement pareil (p. ex. un chemin de
  `tsconfig.json` ne résout plus), rapporter la divergence plutôt que de réinstaller le
  plugin en silence.
- Consigner dans le corps du commit que ceci supplée l'exigence explicite de plugin de
  TEST-001.
