/**
 * SEC-007 — contrat de `getClientIP()` (identification du client dans le rate limit).
 *
 * Le rate limit plafonne `/api/chat` et `/api/job-match` à 200 requêtes/jour/IP.
 * Si l'IP choisie peut être fournie par le client, un attaquant fait tourner l'IP
 * à chaque requête et contourne le plafond. La sonde prod du 2026-09-28 a établi
 * que Vercel écrase `x-forwarded-for` (la valeur injectée n'atteint jamais la
 * fonction — scénario B de la spec) : le correctif retient donc le **dernier**
 * maillon non vide de la chaîne (le plus proche de la plateforme), durcissement
 * de défense en profondeur qui ne change rien sur un XFF mono-IP.
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
  it('conserve le plafond 200 req/jour/IP', () => {
    expect(RATE_LIMIT_CONFIG.maxRequestsPerDay).toBe(200)
  })

  it('conserve la forme des headers X-RateLimit-*', () => {
    const result = checkRateLimit('sec-007-contract-probe')
    const headers = getRateLimitHeaders(result)

    expect(Object.keys(headers).sort()).toEqual([
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ])
    expect(headers['X-RateLimit-Limit']).toBe('200')
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
