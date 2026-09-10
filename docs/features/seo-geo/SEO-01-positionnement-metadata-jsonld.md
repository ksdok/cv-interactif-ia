# SEO-01 — Corriger le positionnement (metadata + JSON-LD)

- **Priorité** : P0 · **Effort** : S (< 1 h) · **Statut** : ⬜
- **Dépendances** : GEO-08 ✅ (bilingue B) — le wording doit exister **en FR et en EN** avec les mêmes entités, porté par `lib/i18n/`.

## Pourquoi

Le site déclare partout le mauvais métier :

| Élément | Aujourd'hui | Cible |
|---|---|---|
| JSON-LD `jobTitle` | Product Designer | Business Analyst Senior (AMOA) |
| JSON-LD `knowsAbout` | Product Design, UI/UX, React… | BA, AMOA, finance de marché… |
| Meta keywords | Product Design, UI/UX | freelance, AMOA, finance de marché… |
| Title | `Kim-san DOK \| Interactive Resume` (générique) | métier + mots-clés |

Aucune occurrence des mots « freelance », « AMOA », « finance de marché » dans le HTML servi.
Conséquence : Google et les LLM construisent une **mauvaise entité** — une requête
« business analyst freelance finance de marché » ne peut pas matcher.
C'est le correctif à plus fort rapport impact/effort de tout l'audit.

## Comment

1. `app/layout.tsx` — metadata :
   - `title.default` : `Kim-san DOK — Business Analyst Senior Freelance (AMOA) | Finance de marché`
   - `description`, ex. : « Kim-san DOK, Business Analyst Senior freelance en finance de marché
     (Paris). 10 ans d'expérience en transformation SI, Securities Lending, Forex. CV interactif
     avec assistant IA. »
   - `keywords` : `['Kim-san DOK', 'Business Analyst', 'freelance', 'consultant indépendant',
     'AMOA', 'finance de marché', 'Securities Lending', 'Forex', 'transformation SI', 'Paris']`
     (Google ignore la meta keywords, mais certains moteurs IA la lisent — coût quasi nul)
   - OpenGraph + Twitter : titre/description alignés sur le même wording.
2. `app/layout.tsx` — JSON-LD `Person` :
   - **`@id: "https://kimsandok.com/#person"`** (obligatoire pour le cross-référencement
     par le bloc `ProfessionalService` ci-dessous ; absent du JSON-LD actuel).
   - `jobTitle: "Business Analyst Senior (AMOA)"`
   - `description` : identique à la meta description
   - `knowsAbout: ["Business Analysis", "AMOA", "Finance de marché", "Securities Lending",
     "Repo", "Forex", "Collatéral", "Transformation SI", "SQL"]`
   - Ajouter `email`, `homeLocation` (`PostalAddress` Paris / Île-de-France), `areaServed: "France"`,
     `knowsLanguage: ["fr", "en"]`
   - Ajouter les profils freelance à `sameAs` dès qu'ils existent (cf. GEO-09)
3. Ajouter un second bloc JSON-LD `ProfessionalService` : `name`, `description`, `areaServed`,
   `priceRange` (TJM indicatif, optionnel), `url`, `founder` → référence au `Person` via
   `@id: "https://kimsandok.com/#person"`.
4. **OpenGraph image** : l'`opengraph-image.png` actuelle (alt « Interactive Resume ») reste
   générique. Mettre à jour l'image et surtout l'`alt` pour refléter le positionnement
   BA freelance (ex. alt « Kim-san DOK — Business Analyst Senior freelance, finance de marché »).
   Faire de même pour `twitter` images et `siteName`.

## Fichiers impactés

- `app/layout.tsx`
- `app/opengraph-image.png` (ou source de l'image) + alt/siteName associés

## Résultat attendu

Le titre Google / l'aperçu social affichent le bon métier ; les knowledge graphs des LLM
associent l'entité « Kim-san DOK » à « Business Analyst freelance finance de marché ».

## Critères d'acceptation

0. Le wording FR et EN coexistent (2 locales), mêmes entités dans les deux langues.
1. Le HTML de production contient le nouveau title avec « Business Analyst » et « freelance ».
2. Le JSON-LD passé sur https://validator.schema.org sans erreur, `jobTitle` correct, **et le
   bloc `Person` porte un `@id` référencé par `ProfessionalService.founder`**.
3. Le HTML contient au moins une occurrence de « AMOA », « finance de marché », « freelance ».
4. L'`alt` de l'OG image et le `siteName` OpenGraph reflètent le positionnement BA freelance.

## KPI / Mesure

- Search Console : apparition d'impressions sur les requêtes contenant « business analyst » /
  « AMOA » / « freelance » (baseline actuelle : 0) — **signal à postériori**, vérifier après
  re-indexation, ne pas bloquer la livraison.
- Test manuel : demander à ChatGPT/Perplexity « qui est Kim-san DOK » → la réponse doit
  mentionner Business Analyst.
