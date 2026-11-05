import { ReactNode } from 'react'
import { PillNav } from '../ui/Stack'
import { BizSwitcher } from '../ui/BizSwitcher'
import { Icon } from '../ui/Icon'
import { useData } from '../lib/data'
import { go } from '../lib/route'

export const YC_TABS: [string, string][] = [['overview', 'Overview'], ['tasks', 'Tasks'], ['pipeline', 'Pipeline'], ['projects', 'Projects'], ['more', 'More']]

export function WorkspaceShell({ slug, tab, children }: { slug: string; tab: string; children: ReactNode }) {
  const { notifications } = useData()
  const unread = notifications.filter(n => !n.read_at).length
  return (
    <div className="shell2"><div className="page">
      <div className="wshead"><BizSwitcher slug={slug} />
        <button className="iconbtn badgeh" onClick={() => go('/inbox')} aria-label="Notifications"><Icon name="bell" />{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}</button></div>
      {children}
      <PillNav tabs={YC_TABS} active={tab} onGo={id => go(`/w/${slug}/${id}`)} />
    </div></div>
  )
}
