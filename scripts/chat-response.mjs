/**
 * Décodage du corps de réponse de `POST /api/chat` (PERF-002).
 *
 * Depuis PERF-002 le corps de **succès** n'est plus un objet JSON unique : c'est
 * un flux **NDJSON** (`application/x-ndjson`), une ligne = un événement
 * (`{"type":"delta","text":"…"}`, puis `{"type":"done"}` ou
 * `{"type":"error","errorCode":"…"}`). Les échecs de la phase 1 (429/403/400/500)
 * conservent la forme JSON historique `{ error, errorCode }`.
 *
 * Les scripts de mesure (`validate-cag.mjs`, `measure-cache.mjs`) faisaient un
 * `JSON.parse` du corps entier : sur une réponse réussie l'analyse échouait et le
 * script concluait « aucune réponse », mesurant un `hasAnswer: false` généralisé
 * et une fidélité vide. Constaté en préparant MODEL-004 (2026-09-25) ; ce module
 * rétablit la lecture des deux formes, sans dépendance.
 *
 * @param {string} rawBody - Corps brut de la réponse.
 * @returns {{status: 'ok'|'error', response: string, error: string|null, errorCode: string|null, done: boolean, events: number}}
 */
export function decodeChatResponse(rawBody) {
  const lines = String(rawBody ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  let response = ''
  let error = null
  let errorCode = null
  let done = false
  let events = 0

  for (const line of lines) {
    let event
    try {
      event = JSON.parse(line)
    } catch {
      // Ligne partielle ou non-JSON : on ignore, la dernière ligne d'un flux
      // interrompu peut être tronquée.
      continue
    }
    if (!event || typeof event !== 'object') continue
    events += 1

    if (event.type === 'delta') {
      response += typeof event.text === 'string' ? event.text : ''
    } else if (event.type === 'error') {
      errorCode = event.errorCode || 'SERVER'
      error = errorCode
    } else if (event.type === 'done') {
      done = true
    } else if (typeof event.error === 'string') {
      // Forme JSON historique (phase 1 : 429/403/400/500).
      error = event.error
      errorCode = event.errorCode || null
    }
  }

  return {
    status: error ? 'error' : 'ok',
    response,
    error,
    errorCode,
    done,
    events,
  }
}
