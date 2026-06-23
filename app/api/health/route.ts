/**
 * GET /api/health
 *
 * Lightweight health check endpoint for external monitoring.
 * Returns 200 with a JSON body — no auth, no rate limit, no side effects.
 */

export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}