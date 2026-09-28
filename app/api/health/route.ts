/**
 * GET /api/health
 *
 * Lightweight health check endpoint for external monitoring.
 * Returns 200 with a JSON body — no auth, no rate limit, no side effects.
 */

export async function GET(request: Request) {
  // [SEC-007 probe — TEMPORAIRE, à retirer] observation directe des headers IP
  // reçus par la fonction derrière l'edge Vercel (gate §3.1 de la spec).
  const h = request.headers
  console.log(
    '[SEC-007 probe]',
    JSON.stringify({
      xff: h.get('x-forwarded-for'),
      xrealip: h.get('x-real-ip'),
      vercelForwardedFor: h.get('x-vercel-forwarded-for'),
      vercelIpCountry: h.get('x-vercel-ip-country'),
      vercelIpCity: h.get('x-vercel-ip-city'),
    }),
  )
  return Response.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}