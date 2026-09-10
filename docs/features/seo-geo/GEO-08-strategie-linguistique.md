# GEO-08 — Stratégie linguistique FR / bilingue

- **Priorité** : P2 · **Effort** : L · **Statut** : ✅ **DÉCIDÉ — Option B (bilingue `/fr` + `/en`)**, 2026-09-10
- **Débloque** : le wording de SEO-01, SEO-02, SEO-03, SEO-05, GEO-06

## Pourquoi

Le HTML est servi en `lang="en"` avec un contenu 100 % anglais, alors que :

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

1. **Routing App Router i18n** : déplacer `app/page.tsx` et le contenu dans `app/[lang]/`
   (`fr` et `en` uniquement — `generateStaticParams` + 404 pour les autres locales).
2. **`proxy.ts`** : ajouter la détection de locale **en amont de la logique CSP/CSRF**
   existante (cookie `NEXT_LOCALE` si présent, sinon `Accept-Language`, fallback `fr` —
   marché cible) ; redirection 308 `/` → `/<locale>` ; préserver les redirections d'API
   (`/api/*` exclues).
   - **Ordre dans `proxy.ts`** : la détection/redirect de locale doit arriver **avant** la
     génération du nonce/CSP pour ne pas gaspiller un nonce sur une réponse de redirect et
     garder la logique CSRF intacte.
   - **Routes statiques exclues du redirect** : `/robots.txt`, `/sitemap.xml`, `/llms.txt`,
     `llms-full.txt`, OG image / `opengraph-image*`, et tout asset sous `/_next/` — ne **pas**
     les préfixer par locale.
3. **Dictionnaires** : `lib/i18n/fr.ts` et `lib/i18n/en.ts` (objets typés partagés via un type
   `Dictionary`) ; les composants reçoivent les chaînes via props depuis le Server Component.
4. **Hreflang** : dans `app/[lang]/layout.tsx`, `alternates.languages` = `{ fr: '/fr',
   en: '/en', 'x-default': '/fr' }` + `alternates.canonical` (cf. SEO-04).
   > **Justification `x-default: '/fr'`** : Google recommande `x-default` → locale la plus
   > universellement appropriée (souvent EN). Pour un marché cible FR (missions AMOA en
   > banques françaises via Malt/LinkedIn/ESN), `fr` est défendable ; à **documenter en
   > commentaire** du layout. Reconsidérer si la part de trafic EN devient significative.
5. **`<html lang>` dynamique** selon `params.lang`.
6. **Metadata par langue** : title/description traduits (le wording BA freelance de SEO-01
   doit exister dans les deux langues avec les mêmes entités).
7. **JSON-LD** : une entité `Person` unique, mais `description`/`knowsAbout` traduits par
   page ; les mêmes `@id` et `sameAs` sur les deux locales (cohérence d'entité).
8. **Sitemap bilingue** : les 2 locales dans `app/sitemap.ts` avec `alternates.languages`.
9. **Switcher de langue** dans le Header (lien FR ↔ EN, pas de sélecteur JS complexe —
   crawlable).
10. **Chatbot Nicky** : le system prompt choisit la langue de réponse selon `params.lang`
    (le CV source reste FR ; en EN, Nicky répond en anglais à partir du contenu FR).
    - **Risque qualité EN** : la traduction à la volée par le LLM à partir d'un CV source FR
      peut altérer la fidélité (chiffres, entités métier). À valider par un test de
      non-régression sur les réponses EN (cf. critère d'acceptation 7).

## Fichiers impactés (prévisionnel)

- `app/[lang]/layout.tsx`, `app/[lang]/page.tsx` (déplacés/nouveaux), suppression des anciens
  `app/layout.tsx`/`app/page.tsx` racine (le root layout minimal reste)
- `proxy.ts` (détection locale + redirect, s'ajoute à la CSP/CSRF existante)
- `lib/i18n/fr.ts`, `lib/i18n/en.ts`, `lib/i18n/types.ts` (nouveaux)
- `components/*` (props de dictionnaire au lieu de chaînes en dur)
- `app/sitemap.ts`
- `app/api/chat/route.ts` (system prompt selon la langue)

## Résultat attendu

Deux versions indexables `/fr` et `/en` correctement liées par hreflang, même entité,
même wording métier — chaque marché requête dans sa langue.

## Critères d'acceptation

1. `/fr` et `/en` répondent 200 avec un `<html lang>` correct et des metadata traduites.
2. Le HTML contient les annotations `<link rel="alternate" hreflang="fr|en|x-default">`.
3. `/` redirige (308) selon `Accept-Language` (fr par défaut, en si en-*).
4. `app/cv` existe dans les deux langues quand SEO-03 est implémenté (`/fr/cv`, `/en/cv`).
5. Search Console : aucune erreur hreflang après indexation — signal à postériori, ne pas
   bloquer la livraison.
6. Le chat répond dans la langue de la page.
7. **Fidélité EN** : un échantillon de questions EN (métier, chiffres clés, entités nommées
   Securities Lending / Broadridge) renvoie des réponses fidèles au CV source FR (pas de
   déformation des chiffres ni des entités métier).
