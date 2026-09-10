# SEO-02 — Restructurer le Hero (H1 = nom + métier)

- **Priorité** : P0 · **Effort** : S (< 1 h) · **Statut** : ✅ fait (2026-09-10, fast-path EN — wording FR reporté au Lot 0 / GEO-08)
- **Dépendances** : SEO-01 (mots-clés arrêtés), GEO-08 ✅ (bilingue B — H1 traduit FR/EN via dictionnaire).

## Pourquoi

- Le seul `<h1>` de la page est « Portfolio Showcase » (label décoratif) : aucune valeur sémantique.
- Le vrai titre est un `<h2>` stylé plus grand → hiérarchie inversée.
- Le nom « Kim-san DOK » n'apparaît dans **aucun** texte visible de la page (ni titre ni
  paragraphe) : il n'existe que dans le `<title>`, le footer et le JSON-LD. Pour un site
  personnel, nom + métier en H1 est le signal N°1 de l'entité.

## Comment

Dans `components/Hero.tsx` :

1. Le label « Portfolio Showcase » devient un `<p>` (garder le style actuel).
2. Le H1 devient le titre principal, ex. :
   `Kim-san DOK — Business Analyst Senior freelance en finance de marché`
   (sous-titre : « CV interactif propulsé par une IA — posez vos questions à Nicky »).
   **Version EN à définir symétriquement** (ex. `Kim-san DOK — Senior Business Analyst
   Freelance | Market Finance`) et portée par le dictionnaire `lib/i18n/` (cf. GEO-08). Le site
   étant actuellement en anglais, le fast-path est livré en **EN** pour préserver la cohérence
   visuelle avec la prod ; la déclinaison FR est tracée dans GEO-08 (Lot 0).
3. Dans le paragraphe d'intro, remplacer « the human behind » par du texte avec mots-clés
   naturels : nom, métier, spécialités, localisation.
4. Vérifier qu'il n'y a qu'**un seul** `<h1>` sur la page.
5. **Maquette préalable** : le H1 cible est long et modifie fortement la composition du hero
   « High-End Editorial ». Valider visuellement (maquette ou branch preview) avant de figer,
   sinon risque de rollback esthétique.

## Fichiers impactés

- `components/Hero.tsx`

## Résultat attendu

Le H1 porte nom + métier + mots-clés ; la hiérarchie h1 > h2 > h3 est correcte.

## Critères d'acceptation

1. `curl -s https://kimsandok.com | grep -c '<h1'` → exactement 1.
2. Le `<h1>` est le **premier heading** du document et contient « Kim-san DOK » et
   « Business Analyst » (vérifiable au scrape, sans exécution JS).
3. Le scrape Firecrawl de la homepage montre le nom en premier titre.
4. (Bilingue) Le H1 existe en FR et en EN avec les mêmes entités métier — en fast-path FR-only,
   ce critère est différé au Lot 0.
