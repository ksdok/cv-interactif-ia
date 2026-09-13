# GEO-08d — Metadata, JSON-LD et hreflang bilingues (`[lang]/layout`)

- **Priorité** : P2 · **Effort** : S · **Statut** : ⬜
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08b (dictionnaires pour les traductions)
- **Absorbe** : le **Lot 1** du plan initial (re-déclinaison bilingue SEO-01 + SEO-02,
  hreflang de SEO-04 dans le layout)

## Pourquoi

Les metadata + JSON-LD de SEO-01 sont aujourd'hui FR-only dans le root layout. Après
migration `[lang]`, chaque locale doit servir ses metadata traduites avec la **même
entité** (mêmes `@id`, `sameAs`) et des annotations hreflang reliant les deux versions —
c'est ce qui permet à Google de les traiter comme une entité unique bilingue et non comme
du duplicate content.

## Comment

1. **Metadata par langue** (`generateMetadata({ params })`) : `title` / `description`
   issus du dictionnaire (wording BA freelance dans les 2 langues, mêmes entités :
   Kim-san DOK, AMOA, finance de marché) + template `%s | Kim-san DOK`.
2. **hreflang** : `alternates.languages = { fr: '/fr', en: '/en', 'x-default': '/fr' }`
   + `alternates.canonical` par locale (complète SEO-04).
   > `x-default: '/fr'` : Google recommande la locale la plus universellement
   > appropriée (souvent EN), mais pour un marché cible FR (missions AMOA en banques
   > françaises) `fr` est défendable — **documenter en commentaire** du layout et
   > reconsidérer si le trafic EN devient significatif.
3. **JSON-LD** : une entité `Person` unique (mêmes `@id`, `sameAs` sur les 2 locales),
   `description`/`knowsAbout` traduits par page via le dictionnaire ; `ProfessionalService`
   idem. Le JSON-LD sort du layout racine et devient fonction de `params.lang`.
4. **Prérequis dur (review B4)** : `metadataBase` doit être conservé par GEO-08a dans le
   root layout — sans lui, `alternates.languages` / `canonical` relatifs ne se résolvent
   pas en absolu (Next retombe sur localhost) et le hreflang émis est invalide pour Google.
5. Vérifier que le wording traduit reste **cohérent d'entité** : même nom, même métier,
   mêmes mots-clés métier (AMOA / business analysis) dans les deux langues.

## Fichiers impactés

- `app/[lang]/layout.tsx` (metadata, hreflang, JSON-LD)
- `lib/i18n/fr.ts`, `lib/i18n/en.ts` (clés metadata + jsonLd)
- `proxy.ts` — non, hors périmètre (redirect = GEO-08c)

## Résultat attendu

Chaque locale sert title/description/JSON-LD dans sa langue avec la même entité, et le
HTML porte les annotations hreflang fr/en/x-default.

## Critères d'acceptation

1. `/fr` et `/en` → metadata traduites (title/description différents, vérif grep).
2. Les deux HTML contiennent `<link rel="alternate" hreflang="fr">`, `hreflang="en"`,
   `hreflang="x-default"` (grep -o, pas `grep -c` — HTML minifié sur une ligne).
3. Les deux HTML contiennent les **mêmes** `@id` Person/ProfessionalService (grep).
4. `x-default` pointe vers `/fr` avec le commentaire de justification présent dans le code.
5. `curl -s https://kimsandok.com/cv` (SEO-03) : canonical non cassé par la migration —
   à re-vérifier après migration de `/cv` sous `[lang]` (**GEO-08h**, seul propriétaire de
   cette migration ; l'exclusion `/cv` de GEO-08c est retirée à ce moment-là).