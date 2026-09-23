# GEO-08e — Sitemap bilingue avec `alternates.languages`

- **Priorité** : P2 · **Effort** : XS · **Statut** : ✅ (2026-09-12, branche
  `feat/geo-08-i18n`, livré avec 08a + 08c — review B2 ; état final re-mesuré
  **2026-09-23** après GEO-08h → **4 entrées**, cf. « Vérification runtime » ci-dessous)
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08a (les routes `/fr`, `/en` doivent exister) ;
  GEO-08d recommandé (hreflang cohérent avec le sitemap)

## Pourquoi

Le sitemap actuel liste l'URL racine. Après migration bilingue, chaque page existe en 2
versions — le sitemap doit les déclarer avec leurs annotations `alternates.languages`
pour que Google découvre les paires hreflang directement depuis le sitemap.

## Comment

1. `app/sitemap.ts` : entrées `/fr` et `/en` (puis `/fr/cv`, `/en/cv` quand **GEO-08h**
   est migré — ✅ fait, GEO-08h livré le 2026-09-14), chacune avec
   `alternates: { languages: { fr: '...', en: '...', 'x-default': '...' } }`
   (review N3 — `x-default` inclus pour la parité avec le hreflang HTML).
2. Format Next : `url`, `lastModified`, `alternates.languages` — la sortie sitemap.xml
   expose alors `xhtml:link rel="alternate" hreflang=...` par entrée.
3. Garder le `SITE_URL` canonique (`https://kimsandok.com`) — pas d'URL vercel.app
   (cohérence SEO-04).

## Fichiers impactés

- `app/sitemap.ts`

## Résultat attendu

`/sitemap.xml` liste les 2 locales **et** les 2 pages CV (`/fr`, `/en`, `/fr/cv`,
`/en/cv`) avec hreflang par entrée — GEO-08h ayant retiré `/cv` au profit d'un 301
vers `/fr/cv`.

## Critères d'acceptation

> 🔄 **Note d'implémentation (2026-09-12, review Lot 0 M1)** : mesuré **3**
> entrées `<loc>` — `/fr`, `/en` **et `/cv`** (préexistante sur main, conservée
> tant que GEO-08h n'a pas migré la page CV : la retirer priverait d'indexation
> une page indexée). Le critère « 2 entrées » ci-dessous s'entendait pour les
> entrées localisées.
>
> ✅ **Note de clôture (2026-09-23)** : GEO-08h est livré (2026-09-14), l'état
> réel est de **4 entrées** (`/fr`, `/en`, `/fr/cv`, `/en/cv`). La prévision
> « total à 5 » écrite ci-dessus avant livraison était fausse : elle comptait
> l'ajout de `/fr/cv` + `/en/cv` **sans** le retrait de `/cv`, alors que les deux
> mouvements vont ensemble — 3 − 1 (retrait `/cv`) + 2 = **4**. Critère 1 reformulé
> en conséquence.

1. `curl -s localhost:3000/sitemap.xml` contient **4 entrées `<loc>`** : `/fr`,
   `/en`, `/fr/cv`, `/en/cv` — review N3 : compter les `<loc>` (grep -o '<loc>' | wc -l),
   pas `grep -o '/fr'` (qui compte aussi les entrées alternates).
2. Chaque entrée porte `xhtml:link rel="alternate"` avec `hreflang="fr"`,
   `hreflang="en"` **et** `hreflang="x-default"` (grep -o).
3. `sitemap.xml` reste non-redirigé par proxy (GEO-08c exclusions) et reste valide XML.

## Vérification runtime (2026-09-23)

Re-mesure locale `npm run dev` + `curl` — pas seulement `lint`/`typecheck` :
CONTEXT.md §3 rappelle qu'aucun test automatisé n'existe encore (TEST-001), donc
la preuve comportementale passe par la mesure.

```bash
curl -s http://localhost:3000/sitemap.xml -D /tmp/sm.headers -o /tmp/sitemap.xml -w 'HTTP %{http_code} redirects=%{num_redirects}\n'
grep -o '<loc>' /tmp/sitemap.xml | wc -l        # → 4
grep -o 'xhtml:link' /tmp/sitemap.xml | wc -l   # → 12 (= 4 entrées × 3 hreflang)
xmllint --noout /tmp/sitemap.xml                # → well-formed
grep -c 'vercel.app' /tmp/sitemap.xml           # → 0
```

| Point mesuré | Résultat | Critère |
|---|---|---|
| Statut HTTP | `200`, `redirects=0` | 3 ✅ |
| Entrées `<loc>` | **4** : `/fr`, `/en`, `/fr/cv`, `/en/cv` | 1 ✅ |
| `xhtml:link rel="alternate"` | **12**, soit 3 par entrée : `fr`, `en`, `x-default` | 2 ✅ |
| `x-default` cluster hubs / cluster CV | `/fr` et `/fr/cv` (marché cible) | 2 ✅ |
| XML | `xmllint --noout` → well-formed, `content-type: application/xml` | 3 ✅ |
| `SITE_URL` canonique | 0 occurrence de `vercel.app` | SEO-04 ✅ |

**Précision sur le critère 3** — le mécanisme n'est **pas** une exclusion dans
le matcher de `proxy.ts` (`matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']`
ne liste ni `/sitemap.xml` ni `/robots.txt`). `/sitemap.xml` traverse bien le
proxy, mais aucune branche de redirection ne le matche (pas de préfixe de locale,
`pathname !== '/'`, host ≠ vercel.app) : il tombe sur le `NextResponse.next()`
final. Conséquence mesurée : la réponse porte les headers de sécurité du proxy
(`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
CSP) — sans effet sur la validité du XML. Une itération future qui ajouterait une
branche de redirection **générique** dans `proxy.ts` devra exclure explicitement
`/sitemap.xml` et `/robots.txt`.

**Classe de route en production** — `npm run build` classe `/sitemap.xml` et
`/robots.txt` en `○ (Static)` (prérendu au build), contrairement aux routes
`[lang]` en `ƒ (Dynamic)` (elles lisent headers/cookies pour le nonce).
Conséquence : en production `<lastmod>` vaut l'instant du **build**, constante
d'une requête à l'autre (comportement sain pour Google) ; en dev la route est
réévaluée à chaque requête, donc `<lastmod>` y vaut l'instant de l'appel —
écart dev/prod attendu, pas une anomalie.
