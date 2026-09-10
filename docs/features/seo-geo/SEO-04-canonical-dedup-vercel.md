# SEO-04 — Canonical + déduplication du domaine vercel.app

- **Priorité** : P1 · **Effort** : S (< 1 h) · **Statut** : ⬜
- **Dépendances** : aucune

## Pourquoi

`kimsandok.com` et `cv-interactif-ia.vercel.app` servent un contenu quasi identique
(HTTP 200, ~23 KB) **sans `rel="canonical"`**. Les deux domaines peuvent être indexés en
double → dilution des signaux et risque de duplicate content. Le `metadataBase` pointe déjà
vers kimsandok.com, mais rien n'empêche l'indexation du domaine vercel.app.

## Comment

1. `app/layout.tsx` : ajouter `alternates: { canonical: 'https://kimsandok.com' }`
   (par page si besoin : `app/[lang]/cv/page.tsx` → canonical `/fr/cv` ou `/en/cv` selon la
   langue).
2. Empêcher l'indexation du domaine preview :
   - **Option A** : `X-Robots-Tag: noindex` via `next.config.ts` headers, conditionné sur
     l'host (`*.vercel.app` ou `VERCEL_ENV !== 'production'`).
   - **Option B (recommandée)** : redirect **301** `cv-interactif-ia.vercel.app/*` →
     `kimsandok.com` dans `proxy.ts`. Plus propre que noindex et consolide le jus de lien.
     > **301 vs 308** : pour des redirects de pages GET, **301 est le standard SEO** et Google
     > le traite identiquement à 308 (permanent). 308 (preserve method) n'apporte rien pour
     > des GET et est moins attendu côté monitoring/outils. On retient donc 301.
   - **Portée du redirect** : combiner `host` **et** `VERCEL_ENV` plutôt que le host seul,
     pour (a) ne pas rediriger `kimsandok.com` lui-même (pas de boucle) et (b) couvrir aussi
     les Vercel branch previews (`*.vercel.app` hors prod) — ces dernières étant ainsi
     implicitement noindexées par redirect. S'assurer que l'environnement de revue interne
     reste accessible aux reviewers (ex. whitelist d'un sous-domaine si besoin).
3. Soumettre uniquement kimsandok.com dans Search Console.

## Fichiers impactés

- `app/layout.tsx`
- `proxy.ts` (option B) ou `next.config.ts` (option A)

## Résultat attendu

Une seule URL canonique par page ; le domaine vercel.app redirige (ou est noindex).

## Critères d'acceptation

1. Le HTML contient `<link rel="canonical" href="https://kimsandok.com">` (et par page,
   ex. `https://kimsandok.com/fr/cv`).
2. `curl -I https://cv-interactif-ia.vercel.app` → **301** vers `kimsandok.com`
   (ou en-tête `X-Robots-Tag: noindex` avec l'option A). **Ne s'applique pas au host
   `kimsandok.com` lui-même** (pas de boucle de redirect).
3. Search Console : 0 page du domaine vercel.app indexée après quelques semaines — signal à
   postériori, ne pas bloquer la livraison.
