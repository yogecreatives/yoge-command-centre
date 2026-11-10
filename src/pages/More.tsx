import { useData } from '../lib/data'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'

export function More() {
  const { notifications, ideas, signOut } = useData()
  const unread = notifications.filter(n => !n.read_at).length
  const newIdeas = ideas.filter(i => i.status === 'new').length

  const link = (to: string, label: string, icon: string, chip?: string | number) => (
    <button className="row" onClick={() => go(to)}>
      <span className="tile sm"><Icon name={icon} size={18} /></span>
      <div className="row-main"><div className="row-title">{label}</div></div>
      {chip ? <span className="chip lime">{chip}</span> : null}
      <Icon name="chevron" size={16} />
    </button>
  )

  return (
    <>
      <header className="large">
        <p className="date">Tools & settings</p>
        <h1>More</h1>
      </header>

      <section className="section">
        <div className="section-title"><span>Tools</span></div>
        <div className="group">
          {link('/projects', 'Projects', 'folder')}
          {link('/partners', 'Partners', 'users')}
          {link('/money', 'Money', 'money')}
          {link('/followups', 'Follow-ups', 'follow')}
          {link('/ideas', 'Ideas', 'idea', newIdeas || '')}
          {link('/inbox', 'Notifications', 'bell', unread || '')}
        </div>
      </section>

      <section className="section">
        <div className="section-title"><span>Settings</span></div>
        <div className="group">
          {link('/settings', 'Settings', 'gear')}
        </div>
      </section>

      <section className="section">
        <div className="group">
          <button className="row danger-row" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </>
  )
}
