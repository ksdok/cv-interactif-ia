# GEO-08g — Chat Nicky multilingue + fidélité EN

- **Priorité** : P2 · **Effort** : S · **Statut** : ✅ (2026-09-23)
- **Parent** : [GEO-08-strategie-linguistique.md](GEO-08-strategie-linguistique.md) ·
  **Dépendances** : GEO-08b (la locale est connue du composant via props)

## Pourquoi

Le chat est le cœur du site : après migration bilingue, un visiteur de `/en` doit recevoir
des réponses en anglais. Le CV source reste **FR** (`data/cv.md`) — Nicky traduit à la
volée. C'est le seul sous-ticket de GEO-08 porteur d'un **risque qualité** : la
traduction LLM peut déformer chiffres et entités métier (plan GEO-08, point 10).
**Contrainte additionnelle (review M5) : ne pas casser le prompt caching CAG** — le préfixe
stable (CV + persona) doit rester identique entre les deux langues, sinon deux entrées de
cache et taux de hit divisé (README : caching OpenAI dès ~1 024 tokens).

## Comment

1. Le client passe la locale à `/api/chat` (champ `lang` validé — whitelist `fr`|`en` ;
   **valeur absente ou invalide → fallback `fr`, tranché** — review M6 : critère « au
   choix » invalide, et fallback fr cohérent avec GEO-08c ; mise à jour de
   `lib/validation.ts`).
2. `app/api/chat/route.ts` : **le bloc CV (préfixe CAG) reste en tête et identique** ;
   la consigne de langue (« réponds en anglais ») vient **APRÈS** le bloc CV dans le
   system prompt (review M5 — si elle est insérée avant le CV, `fr` et `en` n'ont plus de
   préfixe commun → hit de cache divisé).
3. Le persona FR du prompt Nicky reste FR — seule la consigne de langue de réponse change.
4. **Test de fidélité EN** (critère 7 du parent) : échantillon de questions EN (métier,
   chiffres clés, entités nommées Securities Lending / Broadridge) → réponses fidèles au
   CV FR. Étendre `scripts/validate-cag.mjs` avec un mode `--lang en` et **étendre
   `scripts/measure-cache.mjs` au mode EN** pour vérifier que le taux de hit du préfixe
   commun ne se dégrade pas (review M5).
5. Les placeholders du chat (input, messages) sont déjà traduits par GEO-08b.
6. Les erreurs serveur (`data.error` affiché tel quel par ChatPreview, review M4) sont
   mappées côté client via le dictionnaire quand l'API renvoie un `errorCode` — voir 08b.

## Fichiers impactés

- `lib/systemPrompt.mjs` (consigne de langue après le bloc CV, retrait du
  `Always respond in English` codé en dur — ajouté à la livraison)
- `app/api/chat/route.ts` (consigne de langue après le bloc CV)
- `components/ChatPreview.tsx` (envoie `lang` à l'API) · `app/[lang]/Home.tsx`
  (passe `locale` au composant — ajouté à la livraison)
- `lib/validation.ts` (validation du champ `lang`, fallback `fr`)
- `scripts/validate-cag.mjs` (mode EN), `scripts/measure-cache.mjs` (mesure EN)
- `scripts/measure-cv-tokens.mjs` (précise que le préfixe mesuré est le préfixe
  partagé fr/en — ajouté à la livraison)

> 🔄 **Étendu 2026-09-12 (review F9 GEO-08b)** : ce ticket couvre AUSSI la
> localisation de l'analyse job-match — sans lui, `/fr` afficherait une UI FR
> avec une sortie IA EN sans propriétaire :
> - `app/api/job-match/route.ts` (lire le champ `language` déjà envoyé par le
>   client — aujourd'hui ignoré — et consigner l'analyse dans la langue)
> - `components/JobMatcher.tsx` (envoie déjà `language: locale` depuis GEO-08b,
>   mais la route l'ignore)

## Résultat attendu

Le chat répond dans la langue de la page, sans déformation des données du CV, sans
dégrader le taux de hit du cache de prompt.

## Critères d'acceptation

1. Question posée depuis `/en` → réponse en anglais ; depuis `/fr` → réponse en français.
2. **Fidélité EN** : sur un échantillon ≥ 5 questions (chiffres d'expérience, entités
   Securities Lending / Broadridge / Repo), les réponses EN correspondent aux données FR
   du CV (pas de chiffre inventé ni d'entité métier traduite de façon erronée).
3. `lang` invalide (`"es"`) ou absent → **fallback `fr`** (tranché, review M6 — pas de
   « au choix »), sans erreur 400.
4. **Cache préservé** : `node scripts/measure-cache.mjs` (mode EN) montre que le préfixe
   CV reste en cache commun fr/en (pas de double entrée — comparer les métriques avant/
   après).
5. Pas de régression CSRF/rate-limit sur la nouvelle signature de requête.

## Livraison (2026-09-23)

### Implémentation

- `lib/systemPrompt.mjs` : `buildChatSystemPrompt(context, lang)` compose désormais
  persona + contexte + **consigne de langue** dans cet ordre. La ligne
  « Always respond in English » (fast-path EN de SEO-03) est **retirée** de la
  persona : elle y contredisait toute réponse FR et faisait partie du préfixe
  stable. Le préfixe partagé fr/en (persona + bloc CV) est donc inchangé dans sa
  forme — et `SYSTEM_PROMPT_WITHOUT_CONTEXT` reste mesuré tel quel par
  `scripts/measure-cv-tokens.mjs` (`stablePrefix.scope` précise la portée).
- `lib/validation.ts` : `resolveChatLanguage(value)` — whitelist `fr` | `en` via
  `isLocale` (strict, donc `'FR'`/`'fr-FR'`/`'es'`/`42`/absent → fr), fallback
  `DEFAULT_LOCALE`, **jamais** de 400 (review M6).
- `app/api/chat/route.ts` : lit `lang` du corps, le résout, le passe au prompt
  builder et le logge (`Response language: …`).
- `components/ChatPreview.tsx` + `app/[lang]/Home.tsx` : prop `locale: Lang`
  transmise à `/api/chat` (`/api/chat` est hors `[lang]`, review M7).
- `app/api/job-match/route.ts` (extension F9) : lit le champ `language` déjà
  envoyé par `JobMatcher.tsx` depuis GEO-08b, le résout avec le même helper et
  ajoute un bloc `RESPONSE LANGUAGE` au prompt d'analyse — les **valeurs**
  lisibles sont localisées, les **clés** JSON restent EN (contrat
  `MatchAnalysis`). Résolution tracée avant la recherche RAG pour rester
  observable même quand la récupération échoue.
- `scripts/validate-cag.mjs` : `--lang fr|en` (+ `--output` par défaut suffixé par
  langue), jeu de questions EN dédié au test de fidélité, `fidelityTokens`
  (pré-filtre), détection de langue des réponses, et signaux FR ajoutés au
  garde-fou hors-sujet (les questions EN produisent maintenant des réponses FR
  si `lang=fr`).
- `scripts/measure-cache.mjs` : `--lang fr|en|both` ; `both` alterne strictement
  fr/en, ce qui est la seule mesure qui teste réellement le préfixe partagé.
  Le résumé expose `perLanguage` (taux de hit + tokens cachés par langue).

### Vérification (tous les critères passés)

`npm run lint`, `npm run typecheck`, `npm run build` verts.

**Critères 1 et 3** — 7 requêtes `/api/chat` réelles (serveur dev + CSRF) :

| Cas | Statut | Langue détectée | Attendu |
|---|---|---|---|
| `lang=fr`, question FR | 200 | fr | fr ✅ |
| `lang=en`, question EN | 200 | en | en ✅ |
| `lang=fr`, question EN | 200 | fr | fr ✅ |
| `lang=en`, question FR | 200 | en | en ✅ |
| `lang='es'` | **200** (pas 400) | fr | fr ✅ |
| `lang='FR'` (casse mixte) | 200 | fr | fr ✅ |
| `lang` absent | 200 | fr | fr ✅ |

**Critère 2 (fidélité EN)** — `node scripts/validate-cag.mjs --lang en` :
10/10 réponses non vides, `answerLanguageMatches: 8/8`,
`fidelityPreScreen: 7/7 pass, 0 missing`. **Revue manuelle effectuée** sur les
7 réponses à tokens : rôle le plus récent, 10 ans d'expérience, périmètre
X-One Secloan (GTPM/Broadridge, workshops, spécifications Triparty TSL1 →
Euroclear, montée en charge ×4, monitoring, cartographie front-to-back/KPI),
Securities Lending/Repo, produits Broadridge (SFCM, GTPM, 4Sight Financial),
remplacement Kondor+/K+TP avec 500 000 €/an d'économies, 14 M de transactions
annuelles — **toutes conformes à `data/cv.md`, aucun chiffre ni entité inventé
ou altéré**. Le modèle signale même explicitement l'absence de produit Broadridge
sur un poste donné plutôt que de combler par invention.

**Critère 4 (cache préservé)** — `node scripts/measure-cache.mjs --lang both
--runs 6` (alternance fr/en stricte) : **6/6 hits, 2 304 tokens cachés
identiques pour les deux langues** (`perLanguage.fr` = 3/3, `perLanguage.en` =
3/3) — le préfixe persona+CV est bien partagé, aucune double entrée. Baseline
mono-langue du même runner le jour même (`--lang fr --runs 5`) : 5/5 hits,
2 304 tokens cachés. À comparer au baseline OpenAI historique du 2026-06-22
(5/5 hits, 1 280 tokens cachés) : le volume de préfixe a augmenté depuis, la
**forme** du cache est inchangée.

**Critère 5 (pas de régression CSRF/rate-limit)** — `POST /api/chat` sans
`X-CSRF-Token` → **403 `errorCode: CSRF`** ; `X-RateLimit-Remaining` décrémente
normalement (199 → 193 sur la série), aucune requête de la campagne n'a renvoyé
400/429 de manière inattendue.

**Extension F9 (job-match)** — le champ `language` est bien lu et résolu à
l'exécution (`Analysis language: en (requested: "en")` et `fr` dans les logs,
les deux valeurs). L'effet de la consigne a été vérifié sur le provider réel
(OpenAI `gpt-5.4-mini`, prompt reconstruit à l'identique, contexte = CV local) :
consigne « French » → valeurs FR, consigne « English » → valeurs EN, **clés JSON
EN préservées dans les deux cas**, entités (`Securities Lending`, `Repo`,
`Triparty`, `La Défense`) intactes.

### Limites assumées / résiduels

- **Job-match non vérifié de bout en bout** : `POST /api/job-match` renvoie 500
  localement parce que Supabase est **injoignable depuis cette machine**
  (`fetch failed`, `NEXT_PUBLIC_SUPABASE_URL` → HTTP 000) — panne
  d'environnement préexistante, sans lien avec ce ticket (la dégradation
  gracieuse de `lib/rag.ts` transforme l'échec en `[]`, puis 500 « No CV data
  found »). Le câblage du champ est prouvé par les logs, l'effet de la consigne
  par l'appel provider direct : l'intégration route+RAG reste à confirmer sur un
  environnement où Supabase répond.
- **Garde-fou hors-sujet : 1/2** (les deux langues). « What is the weather like
  today? » est décliné, « Tell me a joke. » ne l'est pas — faiblesse déjà tracée
  par FEAT-CAG-004 (constatée en RAG) et désormais aussi mesurée en CAG et en FR.
  Hors périmètre de ce ticket (aucun critère ne couvre le garde-fou).
- **Fluidité EN vs fidélité** : certaines réponses EN conservent des termes
  métier FR tels quels (« 10 years of experience in finance de marché »). C'est
  la conséquence directe de la consigne « never translate … job titles », qui
  privilégie la fidélité demandée par le critère 2 ; aucun chiffre ni entité
  n'est altéré. Durcir la consigne pour traduire les termes de domaine
  introduirait un risque de dérive sur des libellés métier (« Securities
  Lending » est aussi un nom d'activité) : laissé en l'état, à arbitrer si la
  fluidité devient un sujet.
