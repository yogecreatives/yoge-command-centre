import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthCtx { session: Session | null; loading: boolean; recovery: boolean; clearRecovery: () => void }
const Ctx = createContext<AuthCtx>({ session: null, loading: true, recovery: false, clearRecovery: () => {} })
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN') {
        // Always start a fresh login on Home instead of restoring an old hash route.
        location.hash = '/home'
      }
      if (event === 'SIGNED_OUT') {
        location.hash = '/home'
      }
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  return <Ctx.Provider value={{ session, loading, recovery, clearRecovery: () => setRecovery(false) }}>{children}</Ctx.Provider>
}
