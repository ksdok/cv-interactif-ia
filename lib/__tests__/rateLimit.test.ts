/**
 * SEC-007 — contrat de `getClientIP()` (identification du client dans le rate limit).
 * RATE-001 — plafond du rate limit : 50 requêtes/jour/IP (pool partagé).
 *
 * Le rate limit plafonne `/api/chat` et `/api/job-match` à 50 requêtes/jour/IP
 * (RATE-001, ex-200). Si l'IP choisie peut être fournie par le client, un
 * attaquant fait tourner l'IP à chaque requête et contourne le plafond. La
 * sonde prod du 2026-09-28 a établi que Vercel écrase `x-forwarded-for` (la
 * valeur injectée n'atteint jamais la fonction — scénario B de la spec
 * SEC-007) : le correctif retient donc le **dernier** maillon non vide de la
 * chaîne (le plus proche de la plateforme), durcissement de défense en
 * profondeur qui ne change rien sur un XFF mono-IP.
 *
 * Ces cas verrouillent aussi la forme du contrat d'API (plafond + headers) que
 * le correctif ne doit pas altérer (CONTEXT.md §6.5).
 */
import { describe, it, expect } from 'vitest'

import {
  getClientIP,
  checkRateLimit,
  getRateLimitHeaders,
  getRetryAfterSeconds,
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_MESSAGE,
} from '@/lib/rateLimit'

function reqWith(headers: Record<string, string> = {}): Request {
  return new Request('https://kimsandok.com/api/chat', { headers })
}

describe('getClientIP — sélection du maillon XFF (SEC-007)', () => {
  it('retient le dernier IP d’une chaîne x-forwarded-for multi-IP', () => {
    const req = reqWith({ 'x-forwarded-for': '203.0.113.7, 198.51.100.9, 90.3.165.152' })
    expect(getClientIP(req)).toBe('90.3.165.152')
  })

  it('ignore un premier maillon injecté par le client (tentative de spoof)', () => {
    // Le client prétend venir de 1.2.3.4 ; la plateforme a ajouté l'IP réelle en fin.
    const req = reqWith({ 'x-forwarded-for': '1.2.3.4, 90.3.165.152' })
    expect(getClientIP(req)).toBe('90.3.165.152')
  })

  it('retourne l’IP telle quelle pour un XFF mono-IP (comportement inchangé)', () => {
    const req = reqWith({ 'x-forwarded-for': '90.3.165.152' })
    expect(getClientIP(req)).toBe('90.3.165.152')
  })

  it('trime les espaces de la chaîne XFF', () => {
    const req = reqWith({ 'x-forwarded-for': '  203.0.113.7 ,  90.3.165.152  ' })
    expect(getClientIP(req)).toBe('90.3.165.152')
  })

  it('ignore les maillons vides d’une chaîne XFF malformée', () => {
    const req = reqWith({ 'x-forwarded-for': '90.3.165.152, ' })
    expect(getClientIP(req)).toBe('90.3.165.152')
  })

  it('retombe sur cf-connecting-ip quand x-forwarded-for est absent', () => {
    const req = reqWith({ 'cf-connecting-ip': '198.51.100.9' })
    expect(getClientIP(req)).toBe('198.51.100.9')
  })

  it('retombe sur cf-connecting-ip pour une XFF truthy mais vide après filtrage', () => {
    // Chemin neuf du correctif : la chaîne XFF est non vide côté header, mais ne
    // contient aucun maillon exploitable une fois découpée/trimée — on doit
    // relayer sur les headers suivants, pas retourner une IP vide.
    const req = reqWith({
      'x-forwarded-for': ' , , ',
      'cf-connecting-ip': '198.51.100.9',
    })
    expect(getClientIP(req)).toBe('198.51.100.9')
  })

  it('retombe sur x-real-ip quand XFF et cf-connecting-ip sont absents', () => {
    const req = reqWith({ 'x-real-ip': '203.0.113.7' })
    expect(getClientIP(req)).toBe('203.0.113.7')
  })

  it('conserve l’ordre de priorité XFF → cf-connecting-ip → x-real-ip', () => {
    const req = reqWith({
      'x-forwarded-for': '90.3.165.152',
      'cf-connecting-ip': '198.51.100.9',
      'x-real-ip': '203.0.113.7',
    })
    expect(getClientIP(req)).toBe('90.3.165.152')
  })

  it('retourne "unknown" en dev local (aucun header proxy)', () => {
    expect(getClientIP(reqWith())).toBe('unknown')
  })

  it('retourne "unknown" pour un x-forwarded-for vide', () => {
    expect(getClientIP(reqWith({ 'x-forwarded-for': '' }))).toBe('unknown')
  })
})

describe('contrat de rate limit inchangé (SEC-007 critère 2)', () => {
  it('conserve le plafond fixé par la décision RATE-001 (50 req/jour/IP)', () => {
    expect(RATE_LIMIT_CONFIG.maxRequestsPerDay).toBe(50)
  })

  it('conserve la forme des headers X-RateLimit-*', () => {
    const result = checkRateLimit('sec-007-contract-probe')
    const headers = getRateLimitHeaders(result)

    expect(Object.keys(headers).sort()).toEqual([
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ])
    expect(headers['X-RateLimit-Limit']).toBe(String(RATE_LIMIT_CONFIG.maxRequestsPerDay))
    expect(Number.isInteger(Number(headers['X-RateLimit-Remaining']))).toBe(true)
    // ISO 8601 UTC (reset à minuit UTC)
    expect(headers['X-RateLimit-Reset']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it("conserve la forme de Retry-After (entier positif, secondes jusqu'à minuit UTC)", () => {
    const seconds = getRetryAfterSeconds()

    expect(Number.isInteger(seconds)).toBe(true)
    expect(seconds).toBeGreaterThan(0)
    // Au plus 24 h : la fenêtre se referme à minuit UTC.
    expect(seconds).toBeLessThanOrEqual(24 * 3600)
  })
})

describe('RATE-001 — plafond à 50 requêtes/jour/IP (pool partagé chat + job-match)', () => {
  it('refuse le 51ᵉ appel d’une même IP dans la même journée', () => {
    // Clé unique : le store est en mémoire au niveau module — en watch mode, une
    // IP fixe accumulerait les compteurs d'un run à l'autre.
    const ip = `rate-001-ceiling-probe-${Date.now()}`
    const max = RATE_LIMIT_CONFIG.maxRequestsPerDay

    for (let i = 1; i <= max; i++) {
      const result = checkRateLimit(ip)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(max - i)
    }

    const refused = checkRateLimit(ip)
    expect(refused.allowed).toBe(false)
    expect(refused.remaining).toBe(0)
    expect(refused.resetTime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    // Garde anti-dérive : le refus cite le plafond réellement appliqué.
    expect(refused.message).toContain(String(max))
  })

  it('dérive le message 429 de la config (source unique — décision 2)', () => {
    expect(RATE_LIMIT_MESSAGE).toBe(
      `Rate limit exceeded: ${RATE_LIMIT_CONFIG.maxRequestsPerDay} requests per day maximum`,
    )
    // Wording unifié « requests » (arbitrage opérateur) : plus de « analyses ».
    expect(RATE_LIMIT_MESSAGE).not.toMatch(/analyses/)
  })

  it('expose le plafond dans X-RateLimit-Limit', () => {
    const result = checkRateLimit(`rate-001-header-probe-${Date.now()}`)
    const headers = getRateLimitHeaders(result)

    expect(headers['X-RateLimit-Limit']).toBe('50')
    expect(Number(headers['X-RateLimit-Remaining'])).toBe(49)
  })
})
