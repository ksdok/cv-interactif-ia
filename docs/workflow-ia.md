# Mon workflow de développement assisté par IA

> Orchestration multi-LLM dans une seule session : un modèle pilote, un code, un review, un documente — l'humain garde la validation.

## L'idée

Développer avec l'IA ne consiste pas à « demander du code » à un chatbot. J'ai construit un **workflow orchestré** où plusieurs modèles spécialisés collaborent sous mon arbitrage, avec une séparation stricte des responsabilités : celui qui écrit le code n'est pas celui qui le review, celui qui review ne corrige jamais lui-même, et rien n'atterrit dans le projet sans ma validation explicite.

L'orchestrateur est **[Pi](https://pi.dev)** (coding agent en terminal), étendu avec **pi-subagents** (délégation à des sous-agents épinglés sur des modèles distincts) et **Ollama Cloud** comme fournisseur de modèles.

## Les quatre rôles

| Rôle | Modèle | Périmètre |
|---|---|---|
| **Parent pilote** | GLM 5.3 Flash | Brainstorm, rédaction des specs, orchestration du cycle, arbitrage final. Ne code pas. |
| **Coder** | Deepseek V4.1 Flash | Lecture de la spec, branche git, implémentation, build + tests. Escalade les décisions au lieu de deviner. |
| **Reviewer** | GLM 5.3 Flash, *contexte frais* | Review indépendante : il ne voit ni le raisonnement du coder ni la conversation, seulement la spec et le diff. **Read-only** : il propose des corrections chiffrées, jamais les appliquer. |
| **Doc-writer** | Deepseek V4.1 Flash, *contexte frais* | Après validation : mise à jour des fichiers d'état du projet (historique, backlog, spec de livraison). Zéro fichier applicatif. |

Un cinquième rôle ponctuel, **analyste** (Kimi K3, read-only), intervient pour challenger une décision d'architecture risquée ou auditer une spec sensible.

## Le cycle

```
1. Brainstorm libre avec le pilote (aucun sous-agent lancé)
2. /spec <sujet>        → spec taille S, faits vérifiés web + doc technique (MCP context7)
3. Validation de la spec par l'opérateur
4. /dev <spec>          → le cycle orchestré :
      coder implémente sur une branche (build + tests)
      → reviewer en contexte frais PROPOSE des corrections
      → coder applique uniquement blocant/majeur, RE-LANCE les tests
      → reviewer re-vérifie le diff appliqué (max 2 re-cycles, sinon escalade)
      → STOP : présentation du diff, des verdicts de tests et des points reportés
5. Tests manuels de l'opérateur → « validé »
6. doc-writer consigne la livraison (fichiers d'état, journal de projet, spec § livraison)
```

## Les principes derrière les choix

- **Review en contexte frais.** Le reviewer ne peut pas être contaminé par le raisonnement de celui qui a écrit le code : il vérifie la conformité à la spec, pas la cohérence d'une intention. C'est le même réflexe qu'une vraie revue de code entre collègues.
- **Proposer ≠ appliquer.** Le reviewer est read-only par construction (liste d'outils verrouillée, pas seulement par consigne) ; l'application et le re-test appartiennent au coder. Une correction ne peut pas « passer » sans que les tests soient relancés après elle.
- **L'humain est le seul point de validation.** Le cycle s'arrête avant chaque écriture irréversible : implémentation d'une spec non validée = interdit ; mise à jour des fichiers de contexte = uniquement sur accord explicite. Les agents sont instruits d'escalader une décision non couverte plutôt que de la prendre.
- **Le contexte est une ressource.** Chaque rôle tourne dans le mode de contexte le moins coûteux qui reste sûr : le reviewer et le doc-writer partent d'un brief compact en contexte vierge plutôt que d'hériter de l'historique complet — environ 10× moins de tokens sur ces étapes, et une attention moins diluée.
- **Anti-oscillation.** La boucle review → correction → re-review est plafonnée (2 re-cycles) : au-delà, le conflit remonte à l'opérateur pour arbitrage plutôt que de tourner en rond.
- **Retirable par conception.** Tout le dispositif vit dans un dossier autonome enregistré par quelques clés de configuration ; le désinstaller revient à supprimer le dossier et à restaurer les valeurs par défaut.

## Ce que ça a donné

Premier cycle réel (retrait d'un modèle TTS déprécié d'une app iOS + son worker Cloudflare) : implémentation livrée sur branche (11 fichiers, 691 tests verts, lint zéro), review indépendante **propre du premier coup** (vérifiée : aucune correction nécessaire), tests manuels opérateur, documentation de livraison générée sans invention. Le dispositif a ensuite été audité par un LLM externe en contexte frais, qui a validé la conception et motivé cinq durcissements (épinglage des contextes, re-test obligatoire après corrections, garde-fous git, brief structuré du doc-writer, procédure de désinstallation).

## Ce que ça change en pratique

- **Zéro ressaisie** : les prompts d'amorçage et de review sont des templates réutilisables ; un ticket démarre par une commande, pas par un pavé de contexte recopié.
- **Une seule trace** : l'historique complet du cycle (décisions, review, tests) vit dans une session au lieu d'être éclaté entre plusieurs terminaux — le journal du projet est tenu par un agent dédié, sur validation.
- **Les modèles restent interchangeables** : les rôles sont des fichiers de configuration ; changer de modèle sous un rôle se fait en une ligne.