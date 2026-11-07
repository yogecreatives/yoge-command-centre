import { useData } from '../lib/data'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'

export function More() {
  const { businesses, notifications, ideas, signOut } = useData()
  const unread = notifications.filter(n => !n.read_at).length
  const link = (to: string, label: string, icon: string, chip?: string | number) => (
    <button className="row" onClick={() => go(to)}><span className="tile sm"><Icon name={icon} size={18} /></span><div className="row-main"><div className="row-title">{label}</div></div>{chip ? <span className="chip lime">{chip}</span> : null}<Icon name="chevron" size={16} /></button>
  )
  return (
    <>
      <header className="large"><h1>More</h1></header>
      <section className="section"><div className="section-title"><span>Businesses</span></div><div className="group">
        {businesses.map(b => <button key={b.id} className="row" onClick={() => go('/b/' + b.slug)}><span className="tile">{b.symbol}</span><div className="row-main"><div className="row-title">{b.name}</div></div><Icon name="chevron" size={16} /></button>)}
      </div></section>
      <section className="section"><div className="group">
        {link('/calendar', 'Calendar', 'calendar')}
        {link('/notes', 'Notes', 'notes')}
        {link('/projects', 'Projects', 'folder')}
        {link('/partners', 'Partners', 'users')}
        {link('/money', 'Money', 'money')}
        {link('/followups', 'Follow-ups', 'follow')}
        {link('/ideas', 'Ideas', 'idea', ideas.filter(i => i.status === 'new').length || '')}
        {link('/inbox', 'Notifications', 'bell', unread || '')}
        {link('/settings', 'Settings', 'gear')}
      </div></section>
      <section className="section"><div className="group"><button className="row danger-row" onClick={signOut}>Sign out</button></div></section>
    </>
  )
}
