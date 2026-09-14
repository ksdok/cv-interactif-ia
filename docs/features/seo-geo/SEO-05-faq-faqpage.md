# SEO-05 — Section FAQ + schema FAQPage

- **Priorité** : ~~P1~~ (réévaluée, cf. décision ci-dessous) · **Effort** : M (½ journée) ·
  **Statut** : ⛔ ABANDONNÉ (2026-09-14, décision utilisateur) — cf. section « Décision » en fin de ticket
- **Dépendances** : SEO-01 (wording), GEO-08 ✅ (bilingue B — FAQ dans les 2 langues, JSON-LD `FAQPage` dans la langue de la page).

## Pourquoi

Le format question/réponse est ce que les moteurs génératifs citent le plus facilement
(« answer-first »). Une FAQ bien écrite capte les requêtes longue traîne réelles des
recruteurs : « business analyst freelance finance de marché disponible », « AMOA securities
lending Paris », « quel TJM business analyst finance »… Aujourd'hui : aucune FAQ, aucun
contenu de ce type.

## Comment

1. Nouveau composant `components/Faq.tsx` (5-8 Q/R) intégré avant le footer, texte visible au
   chargement (accordion `<details>` natif = crawlable même replié). Placement : homepage **et**
   page `/cv` (cross-linking).
2. Questions orientées intention de recherche, ex. (FR) :
   - « Travaillez-vous en freelance ou en CDI ? » → consultant indépendant, disponibilité,
     modalités.
   - « Quelle est votre expertise en finance de marché ? » → entités : Securities Lending,
     Repo, Forex…
   - « Intervenez-vous sur Paris / en remote ? » → localisation.
   - « Avec quels outils travaillez-vous ? » → SFCM Broadridge, Kondor+, SQL…
   - « Comment analyser l'adéquation d'une offre avec votre profil ? » → met en avant le
     Job Matcher.
   **Déclinaison EN obligatoire** (cf. GEO-08) avec une intention de recherche adaptée au
   marché anglophone (ex. « freelance business analyst market finance Paris », « securities
   lending consultant availability »).
3. JSON-LD `FAQPage` généré depuis la **même source de données** que le composant, dans la
   langue de la page. Source unique bilingue : `data/faq/fr.ts` + `data/faq/en.ts` (ou entrées
   du dictionnaire `lib/i18n/`), typées partagées. Injecté dans le layout de la page.

## Fichiers impactés

- `components/Faq.tsx` (nouveau)
- `data/faq/fr.ts`, `data/faq/en.ts` (nouveaux) — ou entrées FAQ dans `lib/i18n/{fr,en}.ts`
- `app/[lang]/page.tsx`, `app/[lang]/cv/page.tsx` (intégration du composant)

## Résultat attendu

Rich result FAQ possible dans Google ; réponses prêtes à être citées par les LLM ; capture
de requêtes longue traîne dans les deux langues.

## Critères d'acceptation

1. Le HTML de `/fr` et `/en` contient les questions en texte clair dans la langue de la page
   (sans exécution JS).
2. Le JSON-LD `FAQPage` passe le test des résultats enrichis Google
   (https://search.google.com/test/rich-results), dans les deux langues.
3. Le contenu FAQ reflète exactement le positionnement SEO-01 et la langue décidée en GEO-08.
4. `data/faq/fr.ts` et `data/faq/en.ts` (ou le dictionnaire) sont la source unique partagée
   par le composant et le JSON-LD (pas de duplication de wording).

## Décision (2026-09-14) — ⛔ ABANDONNÉ

Le ticket n'est pas réalisé. Deux facteurs, par ordre de poids :

1. **Le principal bénéfice du ticket a disparu.** Le critère 2 (« le JSON-LD
   `FAQPage` passe le test des résultats enrichis Google ») est invérifiable :
   Google a restreint les rich results FAQ aux sites gouvernementaux et de santé
   reconnus dès **septembre 2023**, puis a **déprécié entièrement le rich result
   FAQ en mai 2026** (documentation retirée juin 2026, changelog Search Central :
   « The FAQ rich result feature is no longer shown in Google Search results »).
   Aucun site n'est éligible aujourd'hui — la promesse SERP sur laquelle le
   ticket était classé P1 n'existe plus.
2. **Coût/bénéfice défavorable à ce stade.** Le contenu Q/R visible reste un
   format citable par les moteurs génératifs (« answer-first »), mais le site
   dispose déjà des signaux essentiels (JSON-LD `Person` + `ProfessionalService`,
   `/llms.txt` + `/llms-full.txt`, CV intégral bilingue avec chiffres clés).
   GEO-09 (présence off-page) est jugé plus rentable pour la citabilité.

Si le sujet revient, la version allégée recommandée est : 3-5 Q/R visibles en
HTML (`<details>` natif) sur la home + `/cv`, JSON-LD en bonus gratuit — sans le
critère 2, devenu impossible.
