# GEO-07 — Règles explicites crawlers IA dans robots.txt

- **Priorité** : P2 · **Effort** : S (< 1 h) · **Statut** : ⬜
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
User-agent: *              → Allow: / ; Disallow: /private/   (comportement actuel conservé)
User-agent: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot,
            Googlebot, Bingbot, Applebot → Allow: /        (search / retrieval)
User-agent: Google-Extended, Applebot-Extended,
            CCBot, Bytespider, anthropic-ai → Disallow: /  (training-only)
Sitemap: https://kimsandok.com/sitemap.xml
```

> **Correction important** : `Google-Extended` et `Applebot-Extended` sont des **policy
> tokens** (pas des crawlers) qui ne contrôlent **que** l'entraînement (Gemini/Vertex pour
> le premier, Apple Intelligence pour le second). Ils n'émettent **aucune requête** et
> n'apparaissent jamais dans les logs. Ils ne touchent **pas** à la recherche Google
> (`Googlebot`) ni à Siri/Spotlight (`Applebot`). Les placer en `Allow` signifierait
> **consentement explicite à l'entraînement** — l'inverse exact de l'arbitrage annoncé.
> Sources vérifiées via Firecrawl (agentswelcome.dev, support.apple.com/119829,
> developers.google.com).
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

1. `GET /robots.txt` liste `GPTBot`, `ClaudeBot`, `PerplexityBot`, `OAI-SearchBot`,
   `Googlebot`, `Bingbot`, `Applebot` en **Allow**, et `Google-Extended`, `Applebot-Extended`,
   `CCBot`, `Bytespider`, `anthropic-ai` en **Disallow**.
2. Le sitemap est toujours référencé.
3. Test post-déploiement : `curl -A "GPTBot" https://kimsandok.com` → HTTP 200.
4. Un commentaire dans `app/robots.ts` documente que `Google-Extended` / `Applebot-Extended`
   sont des policy tokens de training (pas des crawlers) et justifie l'arbitrage search/training.
