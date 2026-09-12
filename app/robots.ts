import { MetadataRoute } from 'next'

// GEO-07 : règles explicites crawlers IA — arbitrage « Allow search / Disallow training ».
//
// ⚠️ Google-Extended et Applebot-Extended sont des *policy tokens* (pas des crawlers) :
// ils n'émettent aucune requête et n'apparaissent jamais dans les logs. Ils ne contrôlent
// QUE l'entraînement (Gemini/Vertex pour Google, Apple Intelligence pour Apple) et ne
// touchent ni la recherche Google (Googlebot) ni Siri/Spotlight (Applebot). Le défaut
// robots.txt étant « allow », les placer en Allow serait un consentement explicite à
// l'entraînement — d'où leur présence en Disallow (opt-out training).
// Sources : agentswelcome.dev, support.apple.com/119829, developers.google.com.
//
// Arbitrage assumé : bloquer les bots training-only (CCBot, Bytespider, Google-Extended,
// Applebot-Extended, anthropic-ai) plutôt que tout autoriser pour maximiser la présence
// dans les futurs corpus d'entraînement. Les lignes Allow pour les bots search sont
// déclaratives (le défaut est allow) : elles documentent l'intention — être cité par
// les moteurs de recherche IA (ChatGPT, Perplexity, AI Overviews).
export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://kimsandok.com'

    return {
        rules: [
            {
                // Comportement par défaut inchangé (GEO-07 ne modifie pas l'accès effectif).
                userAgent: '*',
                allow: '/',
                disallow: '/private/',
            },
            {
                // Bots search / retrieval : visibilité et citabilité dans les réponses IA.
                userAgent: [
                    'GPTBot',
                    'OAI-SearchBot',
                    'ClaudeBot',
                    'PerplexityBot',
                    'Googlebot',
                    'Bingbot',
                    'Applebot',
                ],
                allow: '/',
            },
            {
                // Bots training-only : opt-out de l'entraînement des futurs modèles.
                userAgent: [
                    'Google-Extended',
                    'Applebot-Extended',
                    'CCBot',
                    'Bytespider',
                    'anthropic-ai',
                ],
                disallow: '/',
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}