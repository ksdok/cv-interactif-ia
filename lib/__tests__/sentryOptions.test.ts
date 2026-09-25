/**
 * OBS-001 — tests du durcissement vie privée de Sentry.
 *
 * Les deux scrubbers sont la seule barrière vérifiable localement contre la
 * fuite de contenu utilisateur (le chat et le job-match loguent des extraits de
 * 200 caractères via `console.*`, que Sentry capture en breadcrumbs par défaut).
 * Le critère d'acceptation « no chat content leaks into Sentry events » ne peut
 * pas être vérifié sans DSN : ces cas le rendent testable côté payload.
 */
import { describe, it, expect } from 'vitest'
import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs'
import { buildSentryOptions, isSentryEnabled, scrubBreadcrumb, scrubEvent } from '@/lib/sentryOptions'

describe('scrubEvent — aucun contenu de requête ne part vers Sentry', () => {
  it('supprime body, cookies, query string et en-têtes sensibles', () => {
    const event = {
      request: {
        data: { messages: [{ role: 'user', content: 'SECRET CHAT MESSAGE' }] },
        cookies: { session: 'abc' },
        query_string: 'q=SECRET',
        headers: {
          cookie: 'session=abc',
          Cookie: 'session=abc',
          authorization: 'Bearer SECRET',
          Authorization: 'Bearer SECRET',
          'user-agent': 'vitest',
        },
      },
    } as unknown as ErrorEvent

    const scrubbed = scrubEvent(event)

    expect(scrubbed.request?.data).toBeUndefined()
    expect(scrubbed.request?.cookies).toBeUndefined()
    expect(scrubbed.request?.query_string).toBeUndefined()
    expect(scrubbed.request?.headers).toEqual({ 'user-agent': 'vitest' })
  })

  it('tolère un événement sans requête', () => {
    const event = { message: 'boom' } as ErrorEvent
    expect(scrubEvent(event)).toEqual({ message: 'boom' })
  })
})

describe('scrubBreadcrumb — pas d’arguments console ni de corps HTTP', () => {
  it('supprime les arguments d’un breadcrumb console (extraits de chat)', () => {
    const breadcrumb = {
      category: 'console',
      level: 'log',
      message: 'Last user message extracted:',
      data: { arguments: ['SECRET CHAT MESSAGE'], logger: 'console' },
    } as Breadcrumb

    expect(scrubBreadcrumb(breadcrumb).data).toEqual({ logger: 'console' })
  })

  it('supprime le corps d’un breadcrumb fetch mais garde l’URL et le statut', () => {
    const breadcrumb = {
      category: 'fetch',
      data: { url: '/api/chat', method: 'POST', status_code: 500, body: 'SECRET' },
    } as Breadcrumb

    expect(scrubBreadcrumb(breadcrumb).data).toEqual({
      url: '/api/chat',
      method: 'POST',
      status_code: 500,
    })
  })

  it('laisse intact un breadcrumb sans données', () => {
    const breadcrumb = { category: 'navigation', message: '/fr' } as Breadcrumb
    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb)
  })
})

describe('buildSentryOptions — garde DSN et échantillonnage explicite', () => {
  it('reste inerte sans NEXT_PUBLIC_SENTRY_DSN (dev / build secret-free)', () => {
    expect(process.env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined()
    expect(isSentryEnabled).toBe(false)
  })

  it('désactive la collecte PII et n’active le tracing qu’en production', () => {
    const options = buildSentryOptions()

    expect(options.sendDefaultPii).toBe(false)
    expect(options.tracesSampleRate).toBe(process.env.NODE_ENV === 'production' ? 0.1 : 0)
  })
})
