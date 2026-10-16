import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true

    // Sessão atual (também trata o retorno do OAuth do Google)
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSession(data.session)
      setLoading(false)
    })

    // Escuta login, logout e renovação de token
    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao)
      setLoading(false)
    })

    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(
    (email, password, nome) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name: nome, name: nome } } }),
    []
  )
  const signIn = useCallback(
    (email, password) => supabase.auth.signInWithPassword({ email, password }),
    []
  )
  const signInWithGoogle = useCallback(
    () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }),
    []
  )
  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo(() => {
    const user = session?.user ?? null
    const m = user?.user_metadata ?? {}
    return {
      session,
      user,
      loading,
      profile: user
        ? {
            name: m.full_name || m.name || user.email?.split('@')[0] || 'Usuário',
            email: user.email,
            avatar: m.avatar_url || m.picture || null,
          }
        : null,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
    }
  }, [session, loading, signUp, signIn, signInWithGoogle, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
