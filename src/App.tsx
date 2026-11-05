import { useEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { DataProvider, useData } from './lib/data'
import { configured } from './lib/supabase'
import { useRoute, go } from './lib/route'
import { ToastProvider } from './ui/toast'
import { Icon } from './ui/Icon'
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
import { Pipeline } from './pages/Pipeline'
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

const TABS: [string, string, string][] = [['/home', 'Home', 'today'], ['/tasks', 'Tasks', 'tasks'], ['/pipeline', 'Pipeline', 'send'], ['/calendar', 'Calendar', 'calendar'], ['/more', 'More', 'more']]
const MORE_ROUTES = ['/more', '/ideas', '/inbox', '/settings', '/followups', '/projects', '/partners', '/money']

function Shell() {
  const { state, error, online, busy, notifications, businesses, reload } = useData()
  const open = useEditor()
  const route = useRoute()
  const path = route.split('?')[0]
  useEffect(() => { if (!location.hash) go('/home') }, [])

  if (state === 'loading') return <div className="splash"><div className="mark">YOGE</div><p className="date">Loading your workspace…</p></div>
  if (state === 'error') return (
    <div className="auth"><div className="setup"><div className="mark">YOGE</div><h1>Could not load</h1><p className="err">{error}</p><button className="btn primary block" onClick={() => { location.reload() }}>Try again</button></div></div>
  )

  const unread = notifications.filter(n => !n.read_at).length
  const activeTab = (p: string) => (p === '/more' ? MORE_ROUTES.includes(path) || path.startsWith('/b/') : path === p)
  const parts = path.split('/').filter(Boolean)
  if (path === '/home' || path === '/') return <Home />
  if (parts[0] === 'w') return <WorkspaceRoute parts={parts} />
  let page
  if (path.startsWith('/b/')) page = <Business key={path} slug={path.slice(3)} />
  else if (path === '/tasks') page = <Tasks />
  else if (path === '/followups') page = <FollowUps />
  else if (path === '/pipeline') page = <Pipeline />
  else if (path === '/projects') page = <Projects />
  else if (path === '/partners') page = <Partners />
  else if (path === '/money') page = <Money />
  else if (path === '/calendar') page = <CalendarPage />
  else if (path === '/ideas') page = <Ideas />
  else if (path === '/inbox') page = <Inbox />
  else if (path === '/more') page = <More />
  else if (path === '/settings') page = <Settings />
  else page = <Today />

  return (
    <div className="shell">
      <aside className="side">
        <div className="mark">YOGE</div>
        <button className="btn primary block" onClick={() => open('new')}><Icon name="plus" size={18} /> New</button>
        <nav>
          {([['/home', 'Home', 'today'], ['/tasks', 'Tasks', 'tasks'], ['/pipeline', 'Pipeline', 'send'], ['/projects', 'Projects', 'folder'], ['/followups', 'Follow-ups', 'follow'], ['/calendar', 'Calendar', 'calendar'], ['/money', 'Money', 'money'], ['/partners', 'Partners', 'users'], ['/ideas', 'Ideas', 'idea']] as [string, string, string][]).map(([to, label, icon]) => <button key={to} className={path === to ? 'on' : ''} onClick={() => go(to)}><Icon name={icon} size={20} />{label}</button>)}
          <button className={path === '/inbox' ? 'on' : ''} onClick={() => go('/inbox')}><Icon name="bell" size={20} />Notifications{unread > 0 && <b>{unread}</b>}</button>
          <div className="side-label">Businesses</div>
          {businesses.map(b => <button key={b.id} className={path === '/b/' + b.slug ? 'on' : ''} onClick={() => go('/b/' + b.slug)}><span className="glyph">{b.symbol}</span>{b.name}</button>)}
          <button className={path === '/settings' ? 'on' : ''} onClick={() => go('/settings')} style={{ marginTop: 'auto' }}><Icon name="gear" size={20} />Settings</button>
        </nav>
      </aside>
      <main className="main">
        {!online && <div className="banner">You are offline. Showing the last loaded data; changes cannot be saved.</div>}
        <div className="page">{page}</div>
        <div className={`sync ${busy ? 'on' : ''}`} aria-live="polite">{busy ? 'Saving…' : ''}</div>
      </main>
      <button className="fab" onClick={() => open('new')} aria-label="Add new"><Icon name="plus" size={26} /></button>
      <nav className="tabbar">
        {TABS.map(([to, label, icon]) => (
          <button key={to} className={activeTab(to) ? 'on' : ''} onClick={() => go(to)}>
            <Icon name={icon} size={24} /><span>{label}</span>{to === '/more' && unread > 0 && <b />}
          </button>
        ))}
      </nav>
      <button hidden onClick={reload} />
    </div>
  )
}
