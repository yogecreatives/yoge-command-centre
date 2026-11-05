import { ReactNode } from 'react'
import { PillNav } from '../ui/Stack'
import { BizSwitcher } from '../ui/BizSwitcher'
import { Icon } from '../ui/Icon'
import { useData } from '../lib/data'
import { go } from '../lib/route'

export const YC_TABS: [string, string][] = [['overview', 'Overview'], ['sales', 'Sales'], ['finder', 'Finder'], ['tasks', 'Tasks'], ['pipeline', 'Pipeline'], ['projects', 'Projects'], ['more', 'More']]
export const WL_TABS: [string, string][] = [['pipeline', 'Pipeline'], ['tasks', 'Tasks']]

export function WorkspaceShell({ slug, tab, children, tabs = YC_TABS }: { slug: string; tab: string; children: ReactNode; tabs?: [string, string][] }) {
  const { notifications, tasks, followUps, projects, prospects, income, expenses, bizBySlug } = useData()
  const rows: Record<string, any[]> = { tasks, follow_ups: followUps, projects, prospects, income_entries: income, expenses }
  const bizId = bizBySlug(slug)?.id
  const unread = notifications.filter(n => {
    if (n.read_at || !n.ref_id || !n.ref_table) return false
    return rows[n.ref_table]?.find(x => x.id === n.ref_id)?.business_id === bizId
  }).length
  return (
    <div className={`shell2 ws-${slug}`}><div className="page">
      <div className="wshead"><BizSwitcher slug={slug} />
        <button className="iconbtn badgeh" onClick={() => go(`/w/${slug}/notifications`)} aria-label="Notifications"><Icon name="bell" />{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}</button>
      </div>
      {children}
      <PillNav tabs={tabs} active={tab} onGo={id => go(`/w/${slug}/${id}`)} />
    </div></div>
  )
}
