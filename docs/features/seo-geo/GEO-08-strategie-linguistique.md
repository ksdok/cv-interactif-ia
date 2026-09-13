# GEO-08 — Stratégie linguistique FR / bilingue

- **Priorité** : P2 · **Effort** : L · **Statut** : ✅ **DÉCIDÉ — Option B (bilingue `/fr` + `/en`)**, 2026-09-10 · **Découpé** le 2026-09-12 en 8 sous-tickets : [GEO-08a](GEO-08a-fondation-routing-i18n.md) · [GEO-08b](GEO-08b-dictionnaires-i18n.md) · [GEO-08c](GEO-08c-proxy-detection-locale.md) · [GEO-08d](GEO-08d-metadata-jsonld-hreflang-bilingue.md) · [GEO-08e](GEO-08e-sitemap-bilingue.md) · [GEO-08f](GEO-08f-switcher-langue-header.md) · [GEO-08g](GEO-08g-chat-nicky-multilingue.md) · [GEO-08h](GEO-08h-migration-cv-bilingue.md)
- **Débloque** : le wording de SEO-01, SEO-02, SEO-03, SEO-05, GEO-06
- **Implémentation** : suivre les sous-tickets 08a→08h ci-dessus (chaîne critique 08a → 08b → 08c ∥ 08d ∥ 08f → 08e ∥ 08g ∥ 08h) ; ce fichier reste la référence décisionnelle (pourquoi / arbitrage) · revue specs du 2026-09-12 intégrée (B1 option A, B2 307+Vary, B3 ordre proxy, B4 checklist layout, M1–M8, N1–N7)

## Pourquoi

La prod sert `<html lang="fr">` avec un contenu 100 % anglais (revue M1, mesuré
2026-09-12 : `app/layout.tsx` → `lang="fr"`) : **mismatch intra-page** — chaque page
déclare FR en servant EN, ce qui est plus grave qu'un mismatch déclaré en EN. Or :

- le CV source (`data/cv.md`) est en français,
- la cible (missions AMOA en banques françaises via Malt/LinkedIn/ESN) recherche en français :
  « business analyst freelance finance », « AMOA finance de marché », « consultant indépendant
  titres ».

Mismatch complet requête ↔ contenu : plafond de visibilité sur le marché visé.
L'option bilingue couvre à la fois le marché FR (revenus) et la dimension
« experimental / international » de la vitrine EN.

## Décision

| Option | Verdict |
|---|---|
| A. FR only | ❌ écartée |
| **B. Bilingue `/fr` + `/en`** | ✅ **retenue (2026-09-10)** |
| C. EN + pages FR ciblées | ❌ écartée (trop hybride, cohérence d'entité fragile) |

## Comment (plan d'implémentation retenu)

> ⛔ Ce plan est historique — l'implémentation détaillée vit dans les sous-tickets
> 08a→08h ; les points ci-dessous ont été révisés par la revue specs du 2026-09-12
> (mentions « review »).

1. **Routing App Router i18n** : déplacer `app/page.tsx` et le contenu dans `app/[lang]/`
   (`fr` et `en` uniquement — `generateStaticParams` + 404 pour les autres locales).
   **Root layout conservé (option A, review B1)** : la locale est injectée au root layout
   via le header `x-locale` posé par `proxy.ts` (pattern `x-nonce` existant) — le root
   layout ne migre PAS sous `[lang]`, sinon `app/cv/page.tsx` perd son root layout et le
   build casse.
2. **`proxy.ts`** : ordre explicite (review B3) — (1) redirect host SEO-04 (existant,
   inchangé), (2) pose du header `x-locale` + détection/redirect de locale, (3) nonce/CSP,
   (4) CSRF. Redirection **307** `/` → `/<locale>` + `Vary: Accept-Language` (review B2 —
   pas de 308/301 : cible non permanente, cacheable par défaut) ; pas de branche cookie
   (review M3 — code mort) ; préserver les redirections d'API (`/api/*` exclues).
   - **Routes statiques exclues du redirect** : `/robots.txt`, `/sitemap.xml`, `/llms.txt`,
     `llms-full.txt`, OG image / `opengraph-image*`, `/_vercel/*`, et tout asset sous
     `/_next/` — ne **pas** les préfixer par locale. Détail complet dans GEO-08c.
3. **Dictionnaires** : `lib/i18n/fr.ts` et `lib/i18n/en.ts` (objets typés — type dérivé du
   dictionnaire FR, review N4) ; les composants reçoivent les chaînes via props depuis le
   Server Component.
4. **Hreflang** : dans `app/[lang]/layout.tsx`, `alternates.languages` = `{ fr: '/fr',
   en: '/en', 'x-default': '/fr' }` + `alternates.canonical` (cf. SEO-04).
   > **Justification `x-default: '/fr'`** : Google recommande `x-default` → locale la plus
   > universellement appropriée (souvent EN). Pour un marché cible FR (missions AMOA en
   > banques françaises via Malt/LinkedIn/ESN), `fr` est défendable ; à **documenter en
   > commentaire** du layout. Reconsidérer si la part de trafic EN devient significative.
5. **`<html lang>` dynamique** selon la locale demandée (via le header `x-locale` —
   option A).
6. **Metadata par langue** : title/description traduits (le wording BA freelance de SEO-01
   doit exister dans les deux langues avec les mêmes entités).
7. **JSON-LD** : une entité `Person` unique, mais `description`/`knowsAbout` traduits par
   page ; les mêmes `@id` et `sameAs` sur les deux locales (cohérence d'entité).
8. **Sitemap bilingue** : les 2 locales dans `app/sitemap.ts` avec `alternates.languages`
   (incluant `x-default`, review N3).
9. **Switcher de langue** dans le Header (lien FR ↔ EN, pas de sélecteur JS complexe —
   crawlable).
10. **Chatbot Nicky** : la consigne de langue de réponse est pilotée par le champ `lang`
    du corps de la requête (review M7 — `/api/chat` est hors `[lang]`, `params.lang` y est
    inaccessible ; fallback `fr`) et insérée **après** le bloc CV pour préserver le cache
    CAG (review M5).
    - **Risque qualité EN** : la traduction à la volée par le LLM à partir d'un CV source FR
      peut altérer la fidélité (chiffres, entités métier). À valider par un test de
      non-régression sur les réponses EN (cf. critère d'acceptation 7).

## Fichiers impactés (prévisionnel)

- `app/[lang]/page.tsx`, `app/[lang]/layout.tsx`, `app/[lang]/not-found.tsx` (déplacés/nouveaux) ;
  `app/page.tsx` racine supprimé ; **`app/layout.tsx` conservé minimal** (option A —
  `<html lang>` via header `x-locale`, review B1/M7)
- `proxy.ts` (pose `x-locale`, détection locale + redirect 307 — s'ajoute à la CSP/CSRF
  existante, ordre B3)
- `lib/i18n/fr.ts`, `lib/i18n/en.ts`, `lib/i18n/types.ts` (nouveaux)
- `components/*` (props de dictionnaire au lieu de chaînes en dur)
- `app/sitemap.ts`
- `app/api/chat/route.ts` + `components/ChatPreview.tsx` + `lib/validation.ts` (champ
  `lang` dans le corps de la requête — review M7)
- `app/cv/**` (migration bilingue — **GEO-08h**)

## Résultat attendu

Deux versions indexables `/fr` et `/en` correctement liées par hreflang, même entité,
même wording métier — chaque marché requête dans sa langue.

## Critères d'acceptation

1. `/fr` et `/en` répondent 200 avec un `<html lang>` correct **suivant la locale
   demandée** (`/fr`→`fr` **et** `/en`→`en` — review M1 : la prod sert déjà `lang="fr"`,
   le critère seul est faible) et des metadata traduites.
2. Le HTML contient les annotations `<link rel="alternate" hreflang="fr|en|x-default">`.
3. `/` redirige (**307**, + `Vary: Accept-Language` — review B2) selon `Accept-Language`
   (fr par défaut, en si en-*).
4. `/fr/cv` et `/en/cv` existent quand **GEO-08h** est livré ; l'URL `/cv` indexée est
   préservée par un **301** (pas de 404).
5. Search Console : aucune erreur hreflang après indexation — signal à postériori, ne pas
   bloquer la livraison.
6. Le chat répond dans la langue de la page.
7. **Fidélité EN** : un échantillon de questions EN (métier, chiffres clés, entités nommées
   Securities Lending / Broadridge) renvoie des réponses fidèles au CV source FR (pas de
   déformation des chiffres ni des entités métier) — cf. GEO-08g.