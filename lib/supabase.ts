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
 */

import 'server-only'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use service_role for server-side operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)