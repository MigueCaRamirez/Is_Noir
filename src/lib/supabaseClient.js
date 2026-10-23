import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    'IS NOIR: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa .env.local.',
  )
}

/**
 * Cliente público de Supabase. Solo usa la ANON KEY: la seguridad real vive en
 * las políticas RLS. La SERVICE_ROLE_KEY jamás se importa en el frontend.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-application-name': 'is-noir-storefront',
        },
      },
    })
  : null
