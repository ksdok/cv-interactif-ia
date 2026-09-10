# GEO-09 — Présence off-page (Malt, LinkedIn, citations)

- **Priorité** : P3 · **Effort** : continu · **Statut** : ⬜
- **Dépendances** : SEO-01 (wording de référence)

## Pourquoi

Le GEO repose autant sur le **off-site** que le on-site : les LLM établissent la confiance
d'une entité par la cohérence des mentions sur le web (NAP : nom, métier, localisation
identiques partout). Un site seul, même parfait, a peu de poids sans citations externes.
Aujourd'hui `sameAs` ne contient que LinkedIn + GitHub.

## Comment

1. **Plateformes freelance** : créer/aligner les profils **Malt** (essentiel marché FR),
   LeHibou, Comet — même wording métier que SEO-01, lien retour vers kimsandok.com.
2. **LinkedIn** : headline alignée (« Business Analyst Senior freelance | Finance de
   marché… »), champ « Site web » renseigné, about avec les mots-clés ; publier
   occasionnellement (les LLM ingèrent LinkedIn).
3. Ajouter les URLs des profils dans `sameAs` (SEO-01) et dans `llms.txt` (GEO-06).
4. **Reddit / Quora / forums métier** : réponses utiles signées du profil (seeding mesuré,
   pas de spam).
5. (Optionnel) Un article / case study publié (Medium, LinkedIn) : ex. « migration Kondor+ →
   solutions internes, 500 K€/an économisés » — contenu chiffré = très citable.

## Fichiers impactés

- `app/layout.tsx` (`sameAs`), `public/llms.txt` — le reste est hors repo.

## Résultat attendu

Écosystème de mentions cohérentes ; les LLM croisent plusieurs sources concordantes sur
l'entité « Kim-san DOK ».

## Critères d'acceptation

1. ≥ 3 profils externes actifs avec wording identique + lien vers le site.
2. Test LLM trimestriel : « business analyst freelance finance de marché Paris » → le profil
   apparaît ou des mentions cohérentes remontent.
3. Search Console : premiers backlinks référencés.

## KPI / Mesure

- Nombre de citations/backlinks (Search Console > Liens).
- Taux de mention correcte de l'entité dans les réponses LLM (test manuel trimestriel).
