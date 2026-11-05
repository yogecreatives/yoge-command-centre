import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

type Mode = 'login' | 'signup' | 'reset'
export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null); const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use at least 8 characters for the password.')
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }); if (error) throw error
        if (!data.session) setMsg({ t: 'Check your email to confirm your account, then sign in.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); if (error) throw error
        setMsg({ t: 'If that email has an account, a reset link is on its way.' })
      }
    } catch (err: any) { setMsg({ t: err.message, err: true }) }
    setBusy(false)
  }
  return (
    <div className="auth">
      <form onSubmit={submit}>
        <div className="mark">YOGE</div>
        <h1>{mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}</h1>
        <p className="date">Business Command Centre</p>
        <input className="input" type="email" autoComplete="email" inputMode="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        {mode !== 'reset' && <input className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />}
        {msg && <p className={msg.err ? 'err' : 'okmsg'}>{msg.t}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button>
        <div className="authlinks">
          {mode !== 'login' && <button type="button" className="link" onClick={() => { setMode('login'); setMsg(null) }}>Sign in</button>}
          {mode === 'login' && <button type="button" className="link" onClick={() => { setMode('signup'); setMsg(null) }}>Create account</button>}
          {mode === 'login' && <button type="button" className="link" onClick={() => { setMode('reset'); setMsg(null) }}>Forgot password?</button>}
        </div>
      </form>
    </div>
  )
}

export function NewPassword() {
  const { clearRecovery } = useAuth()
  const [password, setPassword] = useState(''); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setMsg('Use at least 8 characters.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setMsg(error.message); else clearRecovery()
  }
  return (
    <div className="auth"><form onSubmit={submit}>
      <div className="mark">YOGE</div><h1>New password</h1>
      <input className="input" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required />
      {msg && <p className="err">{msg}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
    </form></div>
  )
}
