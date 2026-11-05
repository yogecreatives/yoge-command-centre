import { useData } from '../lib/data'
import { WalletStack, PillNav, WalletCard } from '../ui/Stack'
import { BizSwitcher } from '../ui/BizSwitcher'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { todayISO } from '../lib/dates'
import { WAITING } from '../lib/pipeline'
import { leadDue } from '../lib/clientPipeline'
import { businessRoute, visibleBusinesses } from '../lib/workspaces'

export const HOME_TABS: [string, string][] = [['home', 'Home'], ['tasks', 'Tasks'], ['inbox', 'Inbox'], ['more', 'More']]
export const goHomeTab = (id: string) => go(id === 'home' ? '/home' : '/' + id)

export function Home() {
  const { businesses, tasks, followUps, projects, prospects, notifications } = useData()
  const today = todayISO()
  const list = visibleBusinesses(businesses)
  const ids = new Set(list.map(b => b.id))
  const T = tasks.filter(t => ids.has(t.business_id) && t.status !== 'completed')
  const F = followUps.filter(f => ids.has(f.business_id) && f.status === 'open')
  const wl = businesses.find(b => b.slug === 'white-label')?.id, yc = businesses.find(b => b.slug === 'yogecreatives')?.id
  const wlDue = prospects.filter(p => p.business_id === wl && WAITING.includes(p.stage) && p.next_action_date && p.next_action_date <= today).length
  const ycLeadDue = prospects.filter(p => p.business_id === yc && leadDue(p, today)).length
  const overdue = T.filter(t => t.due_date && t.due_date < today).length
  const dueToday = T.filter(t => t.due_date === today).length
  const fuDue = F.filter(f => f.follow_up_date <= today).length
  const need = overdue + dueToday + fuDue + wlDue + ycLeadDue
  const unpaid = projects.filter(p => ids.has(p.business_id) && p.status !== 'dropped').reduce((a, p) => a + Math.max(0, Number(p.balance_amount) || 0), 0)
  const unread = notifications.filter(n => !n.read_at).length

  const cards: WalletCard[] = list.map(b => {
    const bt = T.filter(t => t.business_id === b.id), bf = F.filter(f => f.business_id === b.id), bp = projects.filter(p => p.business_id === b.id)
    const due = bt.filter(t => t.due_date && t.due_date <= today).length
    const fu = bf.filter(f => f.follow_up_date <= today).length
    const active = bp.filter(p => p.status === 'in_progress').length
    const owed = bp.filter(p => p.status !== 'dropped').reduce((a, p) => a + Math.max(0, Number(p.balance_amount) || 0), 0)
    if (b.slug === 'yogecreatives') {
      const leads = prospects.filter(p => p.business_id === b.id && p.stage === 'new').length
      return { id: b.slug, name: b.name, hi: true, chip: due + ycLeadDue ? `${due + ycLeadDue} due` : 'All clear', info: `${active} active projects · ${leads} new leads · ${Math.round(owed).toLocaleString()} unpaid` }
    }
    if (b.slug === 'white-label') {
      const n = prospects.filter(p => p.business_id === b.id).length
      return { id: b.slug, name: b.name, chip: wlDue ? `${wlDue} to send` : 'Up to date', info: `${wlDue} follow-ups due · ${n} agencies` }
    }
    return { id: b.slug, name: b.name, chip: `${bt.length} pending`, info: `${fu} follow-ups due · ${active} projects in progress`,
      mini: [[String(bt.length), 'Pending'], [String(bt.filter(t => t.due_date && t.due_date < today).length), 'Overdue'], [String(fu), 'Follow-ups']] }
  })
  // the last card is shown open, so give it its three counts
  const last = cards[cards.length - 1]
  if (last && !last.mini) { const bt = T.filter(t => t.business_id === list[list.length - 1].id); last.mini = [[String(bt.length), 'Pending'], [String(bt.filter(t => t.due_date && t.due_date < today).length), 'Overdue'], ['0', 'Follow-ups']] }

  return (
    <div className="shell2"><div className="page">
      <div className="wshead"><BizSwitcher label="YOGE" />
        <button className="iconbtn badgeh" onClick={() => go('/inbox')} aria-label="Notifications"><Icon name="bell" />{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}</button></div>
      <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div className="hero-n">{need}</div>
      <p className="hero-s">{need === 1 ? 'thing needs you today' : 'things need you today'}</p>
      {cards.length ? <WalletStack cards={cards} onOpen={slug => go(businessRoute(slug))} /> : <div className="deck-empty">Setting up your businesses…</div>}
      <div className="kstats"><div><b>{overdue}</b><span>Overdue</span></div><div><b>{fuDue + wlDue + ycLeadDue}</b><span>Follow-ups</span></div><div><b>{Math.round(unpaid).toLocaleString()}</b><span>Unpaid</span></div></div>
      <PillNav tabs={HOME_TABS} active="home" onGo={goHomeTab} />
    </div></div>
  )
}
