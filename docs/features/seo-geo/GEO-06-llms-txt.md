# GEO-06 — Ajouter `/llms.txt`

- **Priorité** : P2 · **Effort** : S (< 1 h) · **Statut** : ✅ (2026-09-14, Lot 2)
- **Dépendances** : GEO-08 (langue du fichier)

## Pourquoi

`https://kimsandok.com/llms.txt` → **404**. Étude seoscore.tools (10 000 sites, mars 2026) :
96,8 % des sites n'ont pas de llms.txt → avantage first-mover pour guider les agents IA qui
consultent le site (résumé structuré, liens prioritaires). Coût : un fichier statique.

> **Caveat** : la norme `llms.txt` est **informelle** (pas de statut officiel, adoption
> débattue). La statistique « 96,8 % » provient d'une étude éditeur (seoscore.tools) — à
> présenter comme **directionnelle**, pas comme référence établie. Le ticket se justifie par
> son coût quasi nul et l'absence de downside, non par une norme garantie.

## Comment

1. Créer `public/llms.txt` au format standard (Markdown) :
   - `# Kim-san DOK` + citation de positionnement (une phrase).
   - `## À propos` : 3-5 phrases (métier, expertise, chiffres clés, localisation).
   - `## Pages` : liens vers `/`, `/cv`, LinkedIn, Malt, GitHub avec une ligne de description
     chacun.
   - Mention explicite : « ce site propose un chatbot IA (Nicky) capable de répondre aux
     questions sur le parcours ».
2. (Optionnel) `public/llms-full.txt` avec le contenu intégral du CV en markdown
   (= quasi gratuit puisque `data/cv.md` existe — copie au build via script npm `prebuild`).
3. Découvrabilité par convention (chemin racine) — pas besoin de lien visible.
4. **Bilingue (cf. GEO-08)** : arbitrage à documenter dans le fichier — soit un seul
   `llms.txt` contenant deux sections linguistiques (`## FR` / `## EN`), soit un fichier par
   langue (`/llms.txt` FR par défaut + `/en/llms.txt`). La convention émergente penche plutôt
   vers un fichier par langue ; choisir et le **justifier en commentaire** du fichier.
5. S'assurer que `llms.txt` reste atteignable compte tenu des règles GEO-07 (les bots IA
   autorisés en search doivent pouvoir le fetcher — OK par défaut, à valider après les règles
   restrictives de training-only).

## Fichiers impactés

- `public/llms.txt` (nouveau)
- optionnel : `public/llms-full.txt`, script `prebuild` dans `package.json`

## Résultat attendu

`GET /llms.txt` → 200 avec un résumé précis et à jour du profil.

## Critères d'acceptation

1. `curl https://kimsandok.com/llms.txt` → 200, contient métier, chiffres clés, liens.
2. Le contenu est régénéré depuis `data/cv.md` au build (pas de dérive de contenu).
3. Version FR et EN couvertes selon l'arbitrage du point 4 (un fichier bilingue ou un fichier
   par langue — la décision GEO-08 « bilingue B » impose la couverture des deux langues).

## Livraison (2026-09-14, Lot 2)

- **Arbitrage du point 4 : fichier UNIQUE bilingue** `/llms.txt` (sections FR puis
  « EN — English summary ») — justification documentée en commentaire en tête de
  fichier : point de découverte racine unique, site trop petit pour justifier deux
  fichiers à tenir synchronisés, sections auto-décrites.
- `public/llms.txt` : métier, chiffres clés (10 ans, 14 M transactions/an, ×4,
  500 000€/an, PSM I), pages `/fr`, `/en`, `/fr/cv`, `/en/cv`, LinkedIn, GitHub,
  mention explicite du chatbot IA Nicky (FR et EN).
- `public/llms-full.txt` : **généré au build depuis `data/cv.md`** par
  `scripts/generate-llms-full.mjs`, branché sur le hook npm `prebuild`
  (critère 2 — pas de dérive de contenu ; fichier committé pour rester servi en dev).
- Point 5 : vérifié — les bots search autorisés (GEO-07 : OAI-SearchBot,
  PerplexityBot…) peuvent fetcher `/llms.txt` (allow `/`) ; les crawlers training
  en Disallow ne le voient pas, ce qui est l'arbitrage GEO-07 assumé.
- Vérifié localement : `/llms.txt` et `/llms-full.txt` → 200.

## Review Lot 2 (2026-09-14) — ✅ approuvée, findings traités

- **N3 corrigé** : le chiffre 500 000 €/an est désormais double-attribué comme
  dans `data/cv.md` (licences/support Kondor+/K+TP **et** exploitation Solaris →
  Red Hat), en FR et EN.
- **N2 tracé (déviation)** : Malt n'est pas listé — aucune URL Malt n'existe
  dans le repo (le `sameAs` JSON-LD n'a que LinkedIn/GitHub). À ajouter avec
  GEO-09 (présence off-page). Amélioration assumée : `/` et `/cv` remplacés par
  les 4 URLs localisées (`/fr`, `/en`, `/fr/cv`, `/en/cv`) — pas de saut via
  redirect.
- **N8 noté** : le `prebuild` ne se déclenche que via `npm run build` (pas via
  `npx next build` direct) ; Vercel est couvert. Le fichier généré est committé :
  après toute modification de `data/cv.md`, régénérer (`npm run build`) et
  committer — l'écart serait sinon invisible au build de prod.
