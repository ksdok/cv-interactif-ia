# SEO-03 — Rendre le contenu du CV visible en HTML

- **Priorité** : P1 · **Effort** : M (½ journée) · **Statut** : ✅ fait (2026-09-10, fast-path EN — bilingue `/fr/cv` + `/en/cv` reporté au Lot 0 / GEO-08)
- **Dépendances** : SEO-01 (positionnement figé), GEO-08 ✅ (bilingue B — la page CV existe en `/fr/cv` et `/en/cv`).

## Pourquoi

Le contenu différenciant (missions Société Générale, « 500 K€/an économisés », « 14 M
transactions/an », « scalabilité ×4 », SFCM Broadridge, Kondor+, PSM I…) n'existe que dans
`data/cv.md`, chargé côté serveur pour le chatbot. **Crawlers et LLM ne voient que ~1 600
caractères génériques.** Or le GEO 2026 récompense précisément : densité d'entités nommées,
statistiques chiffrées, données tabulaires, contenu « answer-first ».

> Absorbe le backlog n°10 (`docs/backlog/10-enrich-indexable-static-content-plan.md`) en le
> corrigeant (son keyword cible « Product Designer » est obsolète).

## Comment

1. Créer `app/[lang]/cv/page.tsx` : page **Server Component** qui importe `data/cv.md` et le
   rend en HTML (markdown → HTML via `marked`/`remark`, ou duplication éditoriale manuelle pour
   maîtriser les tableaux). Conformément à GEO-08 (bilingue B), la page vit sous `/fr/cv` et
   `/en/cv` (pas `app/cv/`).
   - Sections : Profil (paragraphe answer-first), Expertises (tableau), Expériences (un
     `<article>` par mission avec dates, contexte, réalisations chiffrées),
     Compétences/Certifications, Contact.
   - Son propre `metadata` (title/description ciblés BA freelance, par langue) + canonical
     (cf. SEO-04).
2. Enrichir `components/ExperienceGrid.tsx` : carte « Featured Role » avec 2-3 réalisations
   chiffrées + lien « Voir le CV complet » vers `/<lang>/cv`.
   > **Décision 2026-09-10 (fast-path)** : la partie « réalisations chiffrées » est **droppée**
   > sur demande produit — seul le lien « View full CV → » vers `/cv` est conservé.
3. `app/sitemap.ts` : ajouter les URLs `/fr/cv` et `/en/cv` (priority 0.9, changeFrequency
   monthly) avec `alternates.languages` (cf. GEO-08).
4. Lien « CV » dans le footer.

> **Note de cohérence source** : la chaîne chiffrée exacte dans `data/cv.md` est
> « 500 000€ » (espace insécable comme séparateur de milliers). Les critères
> d'acceptation utilisent cette orthographe exacte — ne pas la reformater (ni `500 K€`,
> ni `500000€`, ni `€500,000`) pour ne pas créer de dérive entre source et HTML rendu.
> Si `marked` est utilisé, vérifier qu'il préserve l'espace insécable et le `€`.

## Fichiers impactés

- `app/[lang]/cv/page.tsx` (nouveau) — `/fr/cv` + `/en/cv`
- `components/ExperienceGrid.tsx`, `components/Footer.tsx`
- `app/sitemap.ts`
- `package.json` (éventuellement `marked`)

## Résultat attendu

Le parcours complet est indexable ; les LLM disposent des entités et chiffres qui rendent le
profil citable ; les visiteurs qui n'utilisent pas le chat peuvent lire le CV.

## Critères d'acceptation

1. Le HTML SSR de `/fr/cv` (et `/en/cv`) contient « Société Générale », « 500 000€ » (orthographe
   exacte de `data/cv.md`), « Broadridge », « PSM I » (vérifié par `curl`, sans exécution JS).
2. `sitemap.xml` contient les URLs `/fr/cv` et `/en/cv` (avec hreflang).
3. Scrape Firecrawl de `/fr/cv` → markdown > 3 000 caractères structurés avec titres.
4. `npm run build` sans erreur ; pages `/fr/cv` et `/en/cv` statiques (○) dans le build output.

## KPI / Mesure

- Search Console : nombre de mots-clés positionnés, pages indexées = 2.
- Test LLM : « résume l'expérience de Kim-san DOK chez Société Générale ».
