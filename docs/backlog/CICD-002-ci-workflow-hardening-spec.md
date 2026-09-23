# CICD-002 — CI Workflow Hardening Spec

**Priorité** : `MEDIUM`
**Effort estimé** : S (< 30 min de code, plus un run de vérification)
**Révision** : 2026-09-23 — créé à partir des signaux du premier run CI réel

## Goal
Moderniser le workflow CI pour qu'il cesse d'émettre des avertissements de dépréciation,
qu'il ne brûle plus de minutes de runner sur des runs supplantés, et qu'il reste
déterministe face aux migrations d'images de runner.

## Why this ticket exists
Observé sur le premier run CI réel (`35862478119`, push sur `main`, 2026-09-23, job vert
en 40 s) — trois signaux, dont un avec une échéance ferme :

| Signal | Preuve | Impact |
|---|---|---|
| `Node.js 20 is deprecated` — `actions/checkout@v4` et `actions/setup-node@v4` ciblent Node 20 et sont forcés sur Node 24 | annotation du run + ligne de log `Run actions/checkout@v4` | avertissement sur chaque job ; échec dur le jour où le support Node 20 disparaît |
| `ubuntu-latest` migrera vers Ubuntu 26 à partir du **2026-10-19** | notice du run | non-déterminisme : l'image du runner change sans aucun commit |
| les runs supplantés ne sont pas annulés | `concurrency` absent de `.github/workflows/ci.yml` | minutes de runner brûlées sur des pushes obsolètes |

Signal secondaire, même cause racine : `(node:2173) [DEP0040] DeprecationWarning: The `punycode` module is deprecated` émis par le runtime des actions v4 (Node 20). Il disparaît avec le passage aux majors en `node24` — aucun changement de code applicatif n'est requis.

Faits vérifiés (registry GitHub, 2026-09-23) :
- `actions/checkout` dernier tag `v7.0.1`, `actions/setup-node` dernier tag `v7.0.0` ;
  les deux déclarent `runs.using: node24` — ce qui supprime l'avertissement.
- checkout v5 exigeait déjà le runner `v2.327.1` (les runners GitHub-hosted le
  satisfont) ; v6 a déplacé la persistance des credentials dans un fichier séparé ;
  v7 bloque le checkout de PR de fork pour `pull_request_target`/`workflow_run`
  (ce workflow utilise `pull_request` — non concerné).
- setup-node v6 breaking change : le cache automatique est limité à npm (ce workflow
  utilise déjà `cache: npm`) ; v7 migre en ESM, ajoute des outputs de cache et
  supprime un export factice `NODE_AUTH_TOKEN`.

## Dependencies
- **Succède** à la liste « hors périmètre » de CICD-001 pour `concurrency` et la
  maintenance des versions d'actions. CICD-001 reste le ticket qui a créé le pipeline ;
  celui-ci le durcit.
- Aucune dépendance à un autre ticket ouvert.

## Scope
In scope :
- mettre à jour `actions/checkout` et `actions/setup-node` vers leurs majors courants
- trancher et documenter la stratégie d'épinglage (tag majeur mouvant vs SHA de commit)
- ajouter `concurrency` avec `cancel-in-progress`
- rendre l'image du runner explicite au lieu de `ubuntu-latest`
- re-vérifier le workflow de bout en bout sur un run réel

Out of scope :
- déploiement depuis GitHub Actions
- upload de couverture / d'artefacts
- matrice de versions Node
- modification des étapes du job ou du contrat de build sans secret

## Files to inspect first
- `.github/workflows/ci.yml`
- `package.json` (`engines.node`)
- `docs/backlog/CICD-001-minimal-ci-pipeline-spec.md` (contrats hérités)
- `project-state.md` (section CI/CD)

## Required changes

### 1. Mettre à jour les actions
- `actions/checkout@v7`
- `actions/setup-node@v7`

Résultat attendu : l'annotation `Node.js 20 is deprecated` disparaît du run.

Re-vérifier les majors avant d'éditer — les majors d'actions bougent, et ce n'est pas
cette spec qui fait foi :
```bash
gh api repos/actions/checkout/releases/latest --jq .tag_name
gh api repos/actions/setup-node/releases/latest --jq .tag_name
```

### 2. Stratégie d'épinglage — trancher, ne pas dériver
Les tags majeurs mouvants (`@v7`) reçoivent les correctifs de sécurité automatiquement
mais sont mutables. Épingler à un SHA de commit est l'option durcie supply-chain, au prix
d'une mise à jour délibérée à chaque fois.

La décision doit être écrite dans le corps du commit. Recommandation : tags majeurs pour
un dépôt mono-mainteneur (faible cérémonie), avec l'épinglage SHA documenté comme
alternative si le dépôt gagne des contributeurs. Ne pas mélanger : une seule stratégie
pour les deux actions.

### 3. `concurrency`
```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
Rationale : un push supplanté sur la même ref ne doit pas continuer à consommer un runner.
Noter explicitement le compromis : `cancel-in-progress: true` annule aussi un run dont on
aurait voulu lire l'échec — acceptable ici, le dernier commit étant celui qui compte.

### 4. Image du runner
Épingler `runs-on: ubuntu-24.04` (l'image réellement utilisée aujourd'hui, d'après le log
du run) au lieu du `ubuntu-latest` flottant, et ajouter un commentaire signalant que la
migration Ubuntu 26 commence le **2026-10-19**. Passer à `ubuntu-26.04` est une décision
ultérieure qui exige un nouveau run de vérification — ne pas le faire à l'aveugle ici.

### 5. Préserver les contrats CICD-001
Ne pas modifier : le jeu de déclencheurs, l'ordre des étapes
(`npm ci` → `type-check` → `lint` → `test` → `build`), `timeout-minutes`,
`permissions: contents: read`, le build sans secret, `node-version: '22'`.

## Implementation notes
- Exactement quatre changements (deux refs d'actions, `concurrency`, `runs-on`). Rester
  à cette taille.
- `cache: npm` reste valide sur setup-node v7.
- Ne pas ajouter de matrice, d'artefacts ni de hooks de déploiement.

## Pitfalls
- **Non-déterminisme de `ubuntu-latest`.** La notice est datée : après le 2026-10-19, le
  même commit peut résoudre vers une image différente. Épingler maintenant.
- **`cancel-in-progress` sur `main`.** Annuler un run de `main` peut laisser un push non
  vérifié alors que Vercel a déjà déployé. Si cela compte, utiliser
  `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` — trancher et documenter.
- **Copier un `ci.yml` plus récent trouvé ailleurs.** L'ordre des étapes et
  `timeout-minutes` existent pour une raison (voir CICD-001) ; ne pas les régresser.
- **Sauter à `ubuntu-26.04`.** Non validé ; la fenêtre de migration est annoncée, pas
  imposée.

## Acceptance criteria
- `actions/checkout` et `actions/setup-node` référencent les majors les plus récents
  retenus (ou des SHA épinglés)
- l'annotation `Node.js 20 is deprecated` est absente d'un nouveau run
- `concurrency` est configuré et un run supplanté est bien annulé
- `runs-on` est épinglé à une image datée
- le job exécute toujours `npm ci` → `type-check` → `lint` → `test` → `build`, vert,
  non-watch, dans `timeout-minutes`

## Verification
Local :
- `npm run type-check`, `npm run lint`, `npm run test`, `npm run build`

Remote (obligatoire — ce ticket porte sur la CI) :
- pousser et suivre le run : confirmer l'absence d'annotation Node 20 et de lignes de
  dépréciation
- pousser deux fois coup sur coup et confirmer que le premier run est annulé par
  `concurrency`
- consigner l'id de run et la conclusion dans `project-state.md`

## Handoff notes for the implementing LLM
- Ne pas toucher aux étapes du job : ce ticket porte sur les versions d'actions et
  l'hygiène des runs.
- Re-vérifier les majors au moment de l'implémentation — les majors d'actions bougent, et
  `gh api` fait foi, pas cette spec.
- La cible Node du **job** reste 22 (`setup-node`), distincte de la version de Node sur
  laquelle tournent les **actions** (node24).
