import { MetadataRoute } from 'next'

// GEO-07 : règles explicites crawlers IA — arbitrage « Allow search / Disallow training ».
//
// ⚠️ Policy tokens vs crawlers :
// - Google-Extended et Applebot-Extended ne sont PAS des crawlers : ils n'émettent aucune
//   requête et n'apparaissent jamais dans les logs. Google-Extended gouverne l'usage
//   (entraînement + grounding) des contenus crawlés pour Gemini Apps et Vertex AI ; il
//   n'affecte NI l'inclusion dans Google Search NI le ranking (doc officielle, MAJ
//   2026-07-14). Applebot-Extended contrôle uniquement l'usage des données crawlées par
//   Applebot pour Apple Intelligence (« does not crawl webpages », support.apple.com/119829).
//   Le défaut robots.txt étant « allow », leur présence en Disallow est le seul opt-out
//   possible — les mettre en Allow serait un consentement explicite.
// - GPTBot (OpenAI) et ClaudeBot (Anthropic) sont les CRAWLERS de training : « used to
//   crawl content that may be used in training our generative AI foundation models » /
//   « collecting web content that could potentially contribute to their training ».
//   Leur Disallow n'affecte pas la recherche : OAI-SearchBot (ChatGPT search) et
//   Claude-SearchBot (recherche Claude) restent en Allow — c'est exactement la
//   configuration que la doc OpenAI recommande (allow search, disallow training).
//   Sources : developers.openai.com/api/docs/bots, support.claude.com/8896518,
//   developers.google.com/crawling (Google's common crawlers).
//
// Trade-off assumé (F3 review) : le Disallow de Google-Extended / Applebot-Extended est
// aussi un opt-out du GROUNDING (Gemini Apps, Vertex AI) — un bot peut donc citer le site
// via sa recherche mais pas via ces surfaces de grounding. Arbitrage retenu : ne pas
// consentir à l'entraînement prime sur le grounding Gemini/Vertex.
//
// Note (hors périmètre robots.txt) : ChatGPT-User, Claude-User et Perplexity-User sont
// user-initiated (fetch à la demande d'un utilisateur) et ignorent robots.txt selon leurs
// docs respectives — les lister ici serait purement cosmétique, ils sont volontairement
// omis. meta-externalagent (Meta AI) et Amazonbot (Amazon) sont ajoutés pour compléter
// l'opt-out training réel. anthropic-ai est un jeton legacy (absent de la doc Anthropic
// actuelle) — conservé par compatibilité avec les anciens crawlers.
export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://kimsandok.com'

    return {
        rules: [
            {
                // Bots search / retrieval : visibilité et citabilité dans les réponses IA.
                // (GEO-07 review F1 : uniquement des bots search — pas de crawler training ici.)
                userAgent: [
                    'OAI-SearchBot',
                    'Claude-SearchBot',
                    'PerplexityBot',
                    'Googlebot',
                    'Bingbot',
                    'Applebot',
                ],
                allow: '/',
            },
            {
                // Bots training (crawlers de training + policy tokens) : opt-out de
                // l'entraînement des futurs modèles (et du grounding Gemini/Vertex,
                // cf. trade-off ci-dessus).
                userAgent: [
                    'GPTBot',
                    'ClaudeBot',
                    'Google-Extended',
                    'Applebot-Extended',
                    'CCBot',
                    'Bytespider',
                    'anthropic-ai', // legacy — non documenté actuellement par Anthropic
                    'meta-externalagent',
                    'Amazonbot',
                ],
                disallow: '/',
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}