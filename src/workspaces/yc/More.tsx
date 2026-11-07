import { go } from '../../lib/route'
import { Icon } from '../../ui/Icon'
export function YcMore({ slug = 'yogecreatives', name = 'Yogecreatives' }: { slug?: string; name?: string }) {
  const item = (to: string, label: string, sub: string, icon: string) => (
    <button className="row" onClick={() => go('/w/' + slug + '/more/' + to)}><span className="tile sm"><Icon name={icon} size={18} /></span><div className="row-main"><div className="row-title">{label}</div><div className="row-sub">{sub}</div></div><Icon name="chevron" size={16} /></button>)
  return (
    <>
      <h1 className="pagetitle">More</h1><p className="pagesub">{name} finance, reports, contacts and settings.</p>
      <div className="group">
        {item('finance', 'Finance', 'Income, expenses and pending payments', 'money')}
        {item('reports', 'Reports', 'Daily, weekly, monthly and yearly', 'tasks')}
        {item('contacts', 'Contacts', 'Clients and contacts in one list', 'users')}
        {item('settings', 'Settings', 'Appearance, reminders and imports', 'gear')}
      </div>
    </>
  )
}
export function SubBack({ title, sub, slug = 'yogecreatives' }: { title: string; sub?: string; slug?: string }) {
  return <><button className="backlink" onClick={() => go('/w/' + slug + '/more')}><Icon name="back" size={18} />More</button><h1 className="pagetitle">{title}</h1>{sub && <p className="pagesub">{sub}</p>}</>
}
