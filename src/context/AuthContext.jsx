import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { normalizeEmail } from '../lib/format'

const ADMIN_ALLOWED_EMAILS = Object.freeze(
  String(import.meta.env.VITE_ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean),
)

const AuthContext = createContext(null)

function purgeLocalAuthStorage() {
  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (key.startsWith('sb-') || key.startsWith('isnoir-auth')) {
          storage.removeItem(key)
        }
      }
    }
  } catch {
    // Algunos navegadores restringen storage en modo incógnito estricto.
  }
}

function getRedirectUrl() {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState(
    isSupabaseConfigured
      ? ''
      : 'Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.',
  )
  const [deniedEmail, setDeniedEmail] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return undefined
    }

    let active = true

    const evaluateSession = async (nextSession) => {
      if (!active) return
      if (!nextSession?.user) {
        setSession(null)
        setLoading(false)
        return
      }

      const email = normalizeEmail(nextSession.user.email)
      if (!email || !ADMIN_ALLOWED_EMAILS.includes(email)) {
        setDeniedEmail(email || 'una cuenta sin correo verificado')
        setSession(null)
        try {
          // Cierre inmediato de la sesión de Supabase...
          await supabase.auth.signOut()
        } catch {
          // ...y limpieza local incluso si el proveedor no responde.
        }
        purgeLocalAuthStorage()
        setLoading(false)
        return
      }

      setSession(nextSession)
      setDeniedEmail('')
      setAuthError('')
      setLoading(false)
    }

    const initialize = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        await evaluateSession(data.session)
      } catch (error) {
        if (!active) return
        setAuthError(error.message || 'No se pudo recuperar la sesión.')
        setLoading(false)
      }
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Evita bloquear el callback interno de Supabase con llamadas de auth.
      queueMicrotask(() => {
        evaluateSession(nextSession)
      })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthError('Supabase no está configurado. Revisa .env.local.')
      return
    }

    setSigningIn(true)
    setAuthError('')
    setDeniedEmail('')
    sessionStorage.setItem('isnoir-admin-intent', '1')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      setSigningIn(false)
      sessionStorage.removeItem('isnoir-admin-intent')
      setAuthError(error.message || 'Google OAuth no está disponible en este momento.')
    }
  }, [])

  const signOut = useCallback(async () => {
    setSigningIn(false)
    try {
      if (supabase) await supabase.auth.signOut()
    } finally {
      purgeLocalAuthStorage()
      sessionStorage.removeItem('isnoir-admin-intent')
      setSession(null)
      setDeniedEmail('')
    }
  }, [])

  const isAdmin = useMemo(() => {
    const email = normalizeEmail(session?.user?.email)
    return Boolean(email && ADMIN_ALLOWED_EMAILS.includes(email))
  }, [session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signingIn,
      authError,
      isAdmin,
      allowedEmails: ADMIN_ALLOWED_EMAILS,
      deniedEmail,
      signInWithGoogle,
      signOut,
      clearDenied: () => setDeniedEmail(''),
      clearAuthError: () => setAuthError(''),
    }),
    [session, loading, signingIn, authError, isAdmin, deniedEmail, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return context
}
