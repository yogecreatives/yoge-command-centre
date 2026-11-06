import { useEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { DataProvider, useData } from './lib/data'
import { configured } from './lib/supabase'
import { useRoute, go } from './lib/route'
import { ToastProvider } from './ui/toast'
import { Icon } from './ui/Icon'
import { PillNav } from './ui/Stack'
import { EditorProvider } from './components/Editors'
import { useEditor } from './components/editorContext'
import { AuthPage, NewPassword } from './pages/AuthPage'
import { Setup } from './pages/Setup'
import { Today } from './pages/Today'
import { Tasks } from './pages/Tasks'
import { FollowUps } from './pages/FollowUps'
import { CalendarPage } from './pages/CalendarPage'
import { Business } from './pages/Business'
import { Ideas } from './pages/Ideas'
import { Inbox } from './pages/Inbox'
import { More } from './pages/More'
import { Settings } from './pages/Settings'
import { Projects } from './pages/Projects'
import { Partners } from './pages/Partners'
import { Money } from './pages/Money'
import { Home } from './pages/Home'
import { WorkspaceRoute } from './workspaces/Route'

export default function App() {
  if (!configured) return <Setup />
  return <ToastProvider><AuthProvider><Gate /></AuthProvider></ToastProvider>
}

function Gate() {
  const { session, loading, recovery } = useAuth()
  if (loading) return <div className="splash"><div className="mark">YOGE</div></div>
  if (recovery) return <NewPassword />
  if (!session) return <AuthPage />
  return <DataProvider><EditorProvider><Shell /></EditorProvider></DataProvider>
}

function Shell() {
  const { state, error, online, busy, reload } = useData()
  const open = useEditor()
  const route = useRoute()
  const path = route.split('?')[0]
  useEffect(() => { if (!location.hash) go('/home') }, [])

  if (state === 'loading') return <div className="splash"><div className="mark">YOGE</div><p className="date">Loading your workspace…</p></div>
  if (state === 'error') return (
    <div className="auth"><div className="setup"><div className="mark">YOGE</div><h1>Could not load</h1><p className="err">{error}</p><button className="btn primary block" onClick={() => location.reload()}>Try again</button></div></div>
  )

  const parts = path.split('/').filter(Boolean)
  if (path === '/home' || path === '/') return <Home />
  if (path === '/inbox') return <div className="shell2"><div className="page"><Inbox /></div></div>
  if (parts[0] === 'w') return <WorkspaceRoute parts={parts} />

  let page
  if (path.startsWith('/b/')) page = <Business key={path} slug={path.slice(3)} />
  else if (path === '/tasks') page = <Tasks />
  else if (path === '/followups') page = <FollowUps />
  else if (path === '/projects') page = <Projects />
  else if (path === '/partners') page = <Partners />
  else if (path === '/money') page = <Money />
  else if (path === '/calendar') page = <CalendarPage />
  else if (path === '/ideas') page = <Ideas />
  else if (path === '/more') page = <More />
  else if (path === '/settings') page = <Settings />
  else page = <Today />

  const activeNav = path === '/home' || path === '/' ? 'home'
    : path.startsWith('/tasks') ? 'tasks'
    : path.startsWith('/projects') ? 'projects'
    : 'more'

  return (
    <div className="shell">
      <main className="main">
        {!online && <div className="banner">You are offline. Showing the last loaded data; changes cannot be saved.</div>}
        <div className="page">{page}</div>
        <div className={`sync ${busy ? 'on' : ''}`} aria-live="polite">{busy ? 'Saving…' : ''}</div>
      </main>
      <PillNav
        tabs={[['home', 'Home'], ['tasks', 'Tasks'], ['projects', 'Projects'], ['more', 'More']]}
        active={activeNav}
        onGo={id => go(id === 'home' ? '/home' : '/' + id)}
      />
      <button className="fab" onClick={() => open('new')} aria-label="Add new"><Icon name="plus" size={26} /></button>
      <button hidden onClick={reload} />
    </div>
  )
}
