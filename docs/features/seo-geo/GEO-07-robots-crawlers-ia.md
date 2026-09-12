# GEO-07 — Règles explicites crawlers IA dans robots.txt

- **Priorité** : P2 · **Effort** : S (< 1 h) · **Statut** : 🟡 en cours (2026-09-12 — code livré, critères 1/2/4 vérifiés en local ; critère 3 post-déploiement)
- **Dépendances** : aucune

## Pourquoi

Le robots.txt actuel (`User-Agent: * / Allow: /`) autorise techniquement tout le monde —
vérifié en production : GPTBot, ClaudeBot, PerplexityBot reçoivent bien HTTP 200 avec le HTML
complet. Mais les règles explicites sont la pratique recommandée 2026 : elles documentent
l'intention (autoriser les bots de **recherche** IA, distinguer les bots de **training**) et
évitent toute ambiguïté si des règles restrictives sont ajoutées un jour.

## Comment

`app/robots.ts` — passer à un tableau de règles (Next.js : `rules: [...]`, une entrée par
user-agent). **Répartition cohérente avec l'arbitrage « Allow search / Disallow training »** :

```text
User-agent: *              → Allow: /   (défaut — la règle Disallow: /private/ morte a été
                                              retirée au review F5 : aucune route /private/)
User-agent: OAI-SearchBot, Claude-SearchBot, PerplexityBot,
            Googlebot, Bingbot, Applebot → Allow: /        (search / retrieval)
User-agent: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended,
            CCBot, Bytespider, anthropic-ai (legacy),
            meta-externalagent, Amazonbot → Disallow: /    (training)
Sitemap: https://kimsandok.com/sitemap.xml
```

> **Correction importante** : `Google-Extended` et `Applebot-Extended` sont des **policy
> tokens** (pas des crawlers) qui gouvernent l'usage des contenus crawlés — **entraînement
> + grounding** (Gemini Apps / Vertex AI pour le premier, Apple Intelligence pour le
> second). Ils n'émettent **aucune requête** et n'apparaissent jamais dans les logs. Ils
> ne touchent **pas** à la recherche Google (`Googlebot`) ni à Siri/Spotlight (`Applebot`).
> Les placer en `Allow` signifierait **consentement explicite à l'entraînement** — l'inverse
> exact de l'arbitrage annoncé. Sources vérifiées via Firecrawl (agentswelcome.dev,
> support.apple.com/119829, developers.google.com/crawling — Google's common crawlers,
> MAJ 2026-07-14). Trade-off assumé : leur Disallow est aussi un opt-out du **grounding**
> Gemini Apps / Vertex AI — arbitrage écrit noir sur blanc dans `app/robots.ts`.
>
> Conséquence pratique : une ligne `Allow: Google-Extended` étant redondante (le défaut est
> allow), sa **présence en `Disallow`** est l'action utile (opt-out training). La ligne
> `Allow` pour les search bots est elle aussi déclarative (le défaut est allow) mais documente
> l'intention — à commenter comme tel dans le fichier.
>
> Point d'arbitrage à documenter en commentaire du fichier : bloquer CCBot/Bytespider/
> Google-Extended/Applebot-Extended (training) vs tout autoriser pour maximiser la présence
> dans les corpus d'entraînement. Choix par défaut retenu : **bloquer le training-only,
> autoriser la search/retrieval**.

## Fichiers impactés

- `app/robots.ts`

## Résultat attendu

robots.txt explicite, auditable, aligné avec la stratégie de visibilité IA.

## Critères d'acceptation

1. **Par l'intention (review F2)** : aucun token/crawler de **training** (`GPTBot`,
   `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Bytespider`,
   `anthropic-ai`, `meta-externalagent`, `Amazonbot`) n'apparaît dans un groupe **Allow** ;
   les bots **search** (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Googlebot`,
   `Bingbot`, `Applebot`) sont en **Allow**.
2. Le sitemap est toujours référencé.
3. Test post-déploiement (validation **indépendante** du ticket — absence de blocage
   WAF/CDN au bord) : `curl -A "OAI-SearchBot" https://kimsandok.com` → HTTP 200.
   ⚠️ Ne pas présenter ce test comme validation de GEO-07 : robots.txt est déclaratif,
   Next sert le même HTML quel que soit l'UA.
4. Un commentaire dans `app/robots.ts` documente que `Google-Extended` /
   `Applebot-Extended` sont des policy tokens (entraînement + grounding, pas des
   crawlers), que `GPTBot` / `ClaudeBot` sont des crawlers de training, et justifie
   l'arbitrage search/training.

## Résultat livré (2026-09-12)

- `app/robots.ts` réécrit : 2 groupes (search Allow / training Disallow) + sitemap,
  lignes User-Agent distinctes (conforme RFC 9309 §2.2.1 — expansion par Next.js).
- Review 2026-09-12 (commit 47990e0) intégrée :
  - **F1 (majeur)** : `GPTBot` / `ClaudeBot` déplacés en Disallow (docs officielles
    OpenAI/Anthropic vérifiées : ce sont des crawlers de training), `Claude-SearchBot`
    ajouté en Allow ; `meta-externalagent` + `Amazonbot` ajoutés en Disallow (opt-out
    training réel) ; `anthropic-ai` annoté legacy.
  - **F2** : critères 1 et 3 reformulés (le critère initial validait l'implémentation
    par elle-même ; le `curl -A` ne teste pas robots.txt mais l'absence de blocage au bord).
  - **F3** : wording Google-Extended corrigé (entraînement **+ grounding**, pas « que
    l'entraînement ») — vérifié sur la doc officielle Google (Firecrawl, MAJ 2026-07-14) ;
    trade-off grounding écrit noir sur blanc.
  - **F5** : règle morte `Disallow: /private/` retirée (aucune route `/private/`).
  - **F6** : `
` final rétabli en fin de fichier.
- Vérifié en local (build prod + `next start`) : robots.txt conforme aux critères 1/2/4,
  `curl -A GPTBot` → 200. Critère 3 post-déploiement restant.
- Suivi (hors périmètre) : Google expose un opt-out dédié AI Overviews / AI Mode dans
  Search Console, distinct de Google-Extended — candidat à un ticket dédié.
