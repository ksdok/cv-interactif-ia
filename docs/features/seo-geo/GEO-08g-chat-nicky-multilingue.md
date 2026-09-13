# GEO-08g — Chat Nicky multilingue + fidélité EN

- **Priorité** : P2 · **Effort** : S · **Statut** : ⬜
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

- `app/api/chat/route.ts` (consigne de langue après le bloc CV)
- `components/ChatPreview.tsx` (envoie `lang` à l'API)
- `lib/validation.ts` (validation du champ `lang`, fallback `fr`)
- `scripts/validate-cag.mjs` (mode EN), `scripts/measure-cache.mjs` (mesure EN)

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