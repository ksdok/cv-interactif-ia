# SEO-03 — Rendre le contenu du CV visible en HTML

- **Priorité** : P1 · **Effort** : M (½ journée) · **Statut** : ✅ fait (2026-09-10, fast-path EN — bilingue `/fr/cv` + `/en/cv` reporté au Lot 0 / GEO-08)
- **Dépendances** : SEO-01 (positionnement figé ✅), GEO-08 🟧 (bilingue B **décidé, impl. à faire au Lot 0** — le fast-path est livré en `/cv` monolingue EN en attendant).

## Pourquoi

Le contenu différenciant (missions Société Générale, « 500 000€/an » d'économies, « 14 M
transactions/an », « scalabilité ×4 », SFCM Broadridge, Kondor+, PSM I…) n'existe que dans
`data/cv.md`, chargé côté serveur pour le chatbot. **Crawlers et LLM ne voient que ~1 600
caractères génériques.** Or le GEO 2026 récompense précisément : densité d'entités nommées,
statistiques chiffrées, données tabulaires, contenu « answer-first ».

> Absorbe le backlog n°10 (`docs/backlog/10-enrich-indexable-static-content-plan.md`) en le
> corrigeant (son keyword cible « Product Designer » est obsolète).

## Périmètre livré (fast-path EN, 2026-09-10)

> **Décision fast-path** : le site étant actuellement en anglais (ChatPreview,
> ExperienceGrid, Footer), la page CV est livrée en **EN monolingue à `/cv`** (structure
> `app/cv/`, pas de routing `[lang]/`). La cible bilingue `/fr/cv` + `/en/cv` décrite par
> GEO-08 est **reportée au Lot 0** (routing i18n `app/[lang]/` + dictionnaires `lib/i18n/`).
> Voir « Résidu bilingue (Lot 0) » ci-dessous.

1. `app/cv/page.tsx` : page **Server Component** avec son propre `metadata` EN ciblé BA
   freelance + `alternates.canonical: /cv`. Le contenu éditorial vit dans
   `content/cv-en.tsx` (duplication éditoriale manuelle, **distincte de `data/cv.md`** qui
   reste la source FR du chatbot) — choix éditorial manuel plutôt que `marked` pour
   maîtriser tableaux et composition.
   - Sections : Header (nom + titre + tagline + contact), Profile (answer-first), Selected
     Impact (tableau chiffres), Expertise (tableau 3 colonnes), Experience (un `<article>`
     par mission avec dates, contexte, réalisations chiffrées), Skills & Certifications,
     Education, Side projects, Interests, Contact.
2. `components/ExperienceGrid.tsx` : carte « Featured Role » — lien « View full CV → » vers
   `/cv`.
   > **Décision produit 2026-09-10** : la partie « 2-3 réalisations chiffrées » prévue au
   > spec est **droppée** — seul le lien est conservé.
3. `app/sitemap.ts` : URL `/cv` (priority 0.9, changeFrequency monthly). **Pas d'hreflang**
   en fast-path (monolingue) — ajouté au Lot 0.
4. `components/Footer.tsx` : lien « CV ».
5. Contact : email + site uniquement ; **téléphone retiré du HTML public** (vie privée).
   > ⚠️ Le téléphone reste dans `data/cv.md` (source du chatbot) — voir « Décision produit :
   > téléphone » ci-dessous.

> **Note de cohérence source** : la chaîne chiffrée exacte dans `data/cv.md` est
> « 500 000€ » (espace insécable comme séparateur de milliers). Le HTML rendu la préserve
> telle quelle (ni `500 K€`, ni `500000€`, ni `€500,000`). Les **2** occurrences de
> « 500 000€/an » correspondent à **2 économies distinctes** documentées dans la source :
> (a) remplacement Kondor+/K+TP (licences + support), (b) migration Solaris → Red Hat Linux
> (coûts d'exploitation) — soit ~1M€/an au total, pas de double-comptage.

## Fichiers impactés (livré)

- `app/cv/page.tsx` (nouveau) — route `/cv`, metadata + canonical
- `content/cv-en.tsx` (nouveau) — contenu éditorial EN
- `components/ExperienceGrid.tsx`, `components/Footer.tsx`
- `app/sitemap.ts`

## Résultat attendu

Le parcours complet est indexable ; les LLM disposent des entités et chiffres qui rendent le
profil citable ; les visiteurs qui n'utilisent pas le chat peuvent lire le CV.

## Critères d'acceptation — fast-path (✅ livré)

1. Le HTML SSR de `/cv` contient « Société Générale », « 500 000€ » (orthographe exacte de
   `data/cv.md`), « Broadridge », « PSM I » (vérifié par `curl`, sans exécution JS). ✅
2. `sitemap.xml` contient l'URL `/cv`. ✅ (hreflang FR/EN → Lot 0)
3. Scrape Firecrawl de `/cv` → markdown > 3 000 caractères structurés avec titres. ✅
   (page ~68 KB, sections + tableaux + articles)
4. `npm run build` sans erreur ; route `/cv` présente. ✅
   > La page est **ƒ (dynamique)** à cause du middleware CSP/nonce (la homepage l'est
   > aussi), non **○ (statique)** comme l'envisageait la cible bilingue. Accepté en
   > fast-path.

## Résidu bilingue (Lot 0 — GEO-08)

À livrer quand le routing i18n `app/[lang]/` + dictionnaires `lib/i18n/` seront en place :

- Migrer `app/cv/page.tsx` → `app/[lang]/cv/page.tsx` servant `/fr/cv` + `/en/cv`.
- Décliner le contenu éditorial en FR (`content/cv-fr.tsx`) avec les mêmes entités/chiffres.
- `app/sitemap.ts` : URLs `/fr/cv` + `/en/cv` avec `alternates.languages` (hreflang).
- Reprendre les critères d'acceptation 1, 2, 4 sur les deux locales.
- Aligner la langue du fast-path (EN visible) avec SEO-01 (metadata FR) — voir convention
  de langue dans `INDEX.md`.

## Décision produit : téléphone

Le téléphone est retiré du **HTML public** (`/cv` + header subtitle) pour ne pas l'exposer
aux crawlers/LLM. Il est **conservé dans `data/cv.md`** (source du chatbot) — décision
confirmée 2026-09-10 : Nicky peut donc toujours le donner en chat si on lui demande,
tout en restant invisible des crawlers/LLM. Cohérent avec l'usage recruteur via le chat.

## KPI / Mesure

- Search Console : nombre de mots-clés positionnés, pages indexées (cible Lot 0 : 2 —
  `/fr/cv` + `/en/cv` ; fast-path : 1 — `/cv`).
- Test LLM : « résume l'expérience de Kim-san DOK chez Société Générale ».