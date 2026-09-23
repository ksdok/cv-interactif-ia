/**
 * SECURITY: Server-only Supabase client
 *
 * This module MUST ONLY be imported by server-side code.
 * It contains the SUPABASE_SERVICE_ROLE_KEY which is a sensitive secret
 * that gives full database access. The 'server-only' marker prevents
 * accidental imports in client-side code.
 *
 * If you see a build error about this being imported in client code,
 * DO NOT remove the 'server-only' import - instead, move the import
 * to a server-only function or API route.
 *
 * SEC-005 — le client est construit à la demande via `getSupabase()`, et non
 * au niveau module : Next.js évalue les modules des routes pendant
 * `Collecting page data`, donc un `throw` au chargement faisait échouer
 * `next build` en l'absence de clés. Un build n'a pas besoin d'accéder à la
 * base : le fail-fast de production est conservé, mais déplacé au **premier
 * usage réel** (runtime).
 */

import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

/**
 * Retourne le client Supabase serveur, en le construisant au premier appel.
 *
 * SEC-005 : en production, une `SUPABASE_SERVICE_ROLE_KEY` absente lève une
 * erreur explicite (aucun repli silencieux sur la clé anon). Hors production,
 * le repli anon est autorisé — c'est une commodité de développement locale.
 */
export function getSupabase(): SupabaseClient {
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production')
    }
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon key (dev only)'
    )
  }

  const resolvedKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !resolvedKey) {
    throw new Error(
      'Supabase configuration is incomplete: NEXT_PUBLIC_SUPABASE_URL, and either ' +
        'SUPABASE_SERVICE_ROLE_KEY (required in production) or ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY (dev fallback), must be set'
    )
  }

  cachedClient = createClient(supabaseUrl, resolvedKey)
  return cachedClient
}
