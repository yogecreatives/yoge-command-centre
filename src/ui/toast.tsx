import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
type Kind = 'ok' | 'error'
const Ctx = createContext<(m: string, k?: Kind) => void>(() => {})
export const useToast = () => useContext(Ctx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ m: string; k: Kind; id: number } | null>(null)
  const show = useCallback((m: string, k: Kind = 'ok') => {
    const id = Date.now(); setT({ m, k, id })
    setTimeout(() => setT(c => (c && c.id === id ? null : c)), k === 'error' ? 5000 : 2200)
  }, [])
  return <Ctx.Provider value={show}>{children}{t && <div className={`toast ${t.k}`} role="status">{t.m}</div>}</Ctx.Provider>
}
