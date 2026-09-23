# QUAL-004 — Tracked `.claude/` Artifacts and Orphan Gitlink Spec

**Priorité** : `LOW`
**Effort estimé** : S (< 20 min)
**Révision** : 2026-09-23 — créé à partir d'un warning du premier run CI réel

## Goal
Supprimer une dette d'hygiène du dépôt qui fait échouer toute opération `git submodule`
et maintient sous contrôle de version des artefacts d'éditeur/agent pourtant déclarés
ignorés.

## Why this ticket exists
Observé sur le run CI `35862478119` (2026-09-23), dans l'étape
`Post Run actions/checkout@v4` :

```
[command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && ..."
fatal: No url found for submodule path '.claude/worktrees/crazy-lederberg' in .gitmodules
##[warning]The process '/usr/bin/git' failed with exit code 128
```

Cause racine, vérifiée localement le 2026-09-23 :
- `.gitignore:47` contient déjà `.claude/`, mais des fichiers `.claude/**` sont
  **suivis** (ajoutés avant la règle d'ignore — une règle `.gitignore` ne désuit pas) :
```
$ git ls-files .claude | head
.claude/agent-memory/project-orchestrator/MEMORY.md
.claude/agents/project-orchestrator.md
.claude/settings.local.json
...
```
- Pire : `.claude/worktrees/crazy-lederberg` est committé comme **gitlink** (mode d'index
  `160000`, c'est-à-dire un pointeur de sous-module) alors qu'aucun fichier `.gitmodules`
  n'existe :
```
$ git ls-files -s | awk '$1=="160000"{print}'
160000 2ae3389e... 0  .claude/worktrees/crazy-lederberg
$ cat .gitmodules
cat: .gitmodules: No such file or directory
```
Conséquences : `git submodule foreach --recursive` échoue (exit 128) pour tout le monde,
CI comprise ; le dépôt annonce un sous-module non résoluble ; un worktree local d'agent se
retrouve immortalisé dans l'index.

## Dependencies
- Aucune. Indépendant de QUAL-001/002/003.

## Scope
In scope :
- retirer le gitlink orphelin de l'index
- désuivre les fichiers `.claude/**` que `.gitignore` déclare déjà ignorés
- confirmer que la couverture `.gitignore` est suffisante (aucune règle manquante)
- laisser les fichiers présents sur le disque strictement intacts

Out of scope :
- supprimer le répertoire local `.claude/`
- modifier l'outillage ou la configuration d'agent `.claude/`
- réécrire l'historique git (le gitlink reste dans les commits passés ; seul le tip
  courant est nettoyé)
- un audit global du `.gitignore`

## Files to inspect first
- `.gitignore`
- `git ls-files -s` (modes d'index — `160000` = gitlink)
- `git ls-files .claude`
- `.github/workflows/ci.yml` (l'étape CI qui révèle l'erreur)

## Required changes

### 1. Trancher ce que `.claude/` doit être
À partir de `git ls-files .claude`, décider explicitement : certains de ces fichiers
sont-ils versionnés **volontairement** (définitions d'agents partagées ?) ou tous
accidentels ? Le `.gitignore` dit que `.claude/` est ignoré — c'est l'intention déclarée.
Deux options cohérentes :
- **Option 1 — aligner sur la déclaration** : désuivre tout ce qui est sous `.claude/`
- **Option 2 — aligner sur la réalité** : restreindre les règles d'ignore (p. ex. ignorer
  seulement `.claude/worktrees/` et `.claude/settings.local.json`) et garder suivies les
  définitions d'agents partagées

Trancher et l'écrire dans le corps du commit. Ne pas laisser la contradiction en place.

### 2. Retirer le gitlink orphelin
```
git rm --cached .claude/worktrees/crazy-lederberg
```
Vérifier d'abord qu'il s'agit bien d'un gitlink (mode `160000`) ; `git rm --cached` sur un
gitlink ne touche que l'index, le répertoire local reste sur le disque. Si
`.claude/worktrees/` ne doit jamais être suivi, s'assurer qu'une règle
`.claude/worktrees/` existe (couverte par `.claude/` en option 1).

### 3. Désuivre (ou re-cadrer) les fichiers `.claude/**` restants
- Option 1 : `git rm -r --cached .claude`
- Option 2 : suivre exactement les fichiers voulus et ajouter les règles d'ignore plus
  étroites

### 4. Garder l'arbre de travail fonctionnel
Rien ne doit être supprimé du disque : un état `.claude/` local (mémoire d'agent,
worktrees) continue de fonctionner.

## Pitfalls
- **`git rm -r` sans `--cached`** supprime les fichiers du disque. Toujours `--cached` ici.
- **Croire que `.gitignore` désuit.** Il ne le fait jamais. Les chemins déjà suivis le
  restent — c'est exactement ainsi que cette dette s'est accumulée.
- **`.claude/settings.local.json`** est couvert deux fois en intention (ligne 47
  `.claude/` et ligne 48 explicite) — si l'option 2 est choisie, résoudre cette
  redondance.
- **Un gitlink n'est pas un répertoire.** `git rm` s'y comporte différemment d'un fichier ;
  confirmer avec `git ls-files -s` avant et après.
- **Ne pas tenter de réécrire l'historique.** Non requis et hors périmètre.

## Acceptance criteria
- `git ls-files -s | awk '$1=="160000"'` ne retourne rien
- `git ls-files .claude` est vide (option 1) ou ne contient que les fichiers explicitement
  voulus (option 2), en cohérence avec `.gitignore`
- `git submodule foreach --recursive true` sort en 0 localement
- le run CI n'émet plus `fatal: No url found for submodule path` ni
  `The process '/usr/bin/git' failed with exit code 128`
- aucun fichier `.claude/` présent localement n'est supprimé du disque
- `npm run lint`, `npm run type-check`, `npm run build` passent toujours

## Verification
Local :
```bash
git ls-files -s | awk '$1=="160000"'      # attendu : vide
git ls-files .claude                      # attendu : vide (option 1)
git submodule foreach --recursive true    # attendu : exit 0, aucun fatal
git status --short                        # attendu : aucune suppression inattendue
```
Remote :
- pousser et confirmer que le warning `exit code 128` a disparu du run suivant

## Handoff notes for the implementing LLM
- C'est de l'hygiène d'index, pas un changement de code. Attendre un diff fait uniquement
  de suppressions de chemins suivis.
- La décision `.claude/` (option 1 vs 2) doit être documentée dans le corps du commit —
  un futur lecteur ne doit pas avoir à la deviner.
- Si un état `.claude/` local est nécessaire à l'outillage d'agent, c'est précisément
  l'argument pour l'option 1 : le garder local, le garder non suivi.
