import { useEffect } from 'react'
import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { go, useRoute } from '../lib/route'
import { businessRoute } from '../lib/workspaces'
import { WorkspaceShell, WL_TABS } from './Workspace'
import { YcOverview } from './yc/Overview'
import { YcTasks } from './yc/Tasks'
import { YcProjects } from './yc/Projects'
import { YcMore } from './yc/More'
import { YcFinance } from './yc/Finance'
import { YcReports } from './yc/Reports'
import { YcContacts } from './yc/Contacts'
import { Settings } from '../pages/Settings'
import { Inbox } from '../pages/Inbox'

export function WorkspaceRoute({ parts }: { parts: string[] }) {
  const { bizBySlug, tasks, followUps, projects } = useData()
  const open = useEditor()
  const route = useRoute()
  const slug = parts[1]
  const tab = parts[2] || 'overview'
  const sub = parts[3]
  const biz = bizBySlug(slug)
  const query = new URLSearchParams(route.split('?')[1] ?? '')

  useEffect(() => {
    if (slug !== 'yogecreatives' && slug !== 'white-label' && slug !== 'yogeworks') go(businessRoute(slug || ''))
  }, [slug])

  useEffect(() => {
    const taskId = query.get('task')
    const followupId = query.get('followup')
    const projectId = query.get('project')
    if (taskId) {
      const item = tasks.find(t => t.id === taskId)
      if (item && item.business_id === biz?.id) open('task', item)
    } else if (followupId) {
      const item = followUps.find(f => f.id === followupId)
      if (item && item.business_id === biz?.id) open('followup', item)
    } else if (projectId) {
      const item = projects.find(p => p.id === projectId)
      if (item && item.business_id === biz?.id) open('project', item)
    }
  }, [route, slug, tasks, followUps, projects, open])

  if (slug === 'white-label') {
    if (!biz) return <div className="shell2"><div className="deck-empty">White Label workspace not found. Reload the app.</div></div>
    if (tab === 'notifications') return <WorkspaceShell slug={slug} tab="overview" tabs={WL_TABS}><Inbox scope={slug} /></WorkspaceShell>
    const wlTab = tab === 'tasks' ? 'tasks' : 'overview'
    return <WorkspaceShell slug={slug} tab={wlTab} tabs={WL_TABS}>
      {wlTab === 'tasks' ? <YcTasks bizId={biz.id} /> : <YcOverview bizId={biz.id} businessName={biz.name} />}
    </WorkspaceShell>
  }

  if (slug !== 'yogecreatives' && slug !== 'yogeworks') return null
  if (!biz) return <div className="shell2"><div className="deck-empty">Workspace not found. Reload the app.</div></div>

  let page
  if (tab === 'notifications') page = <Inbox scope={slug} />
  else if (tab === 'tasks') page = <YcTasks bizId={biz.id} />
  else if (tab === 'projects') page = <YcProjects bizId={biz.id} />
  else if (tab === 'more') page = sub === 'finance' ? <YcFinance bizId={biz.id} slug={slug} /> : sub === 'reports' ? <YcReports bizId={biz.id} slug={slug} /> : sub === 'contacts' ? <YcContacts bizId={biz.id} slug={slug} /> : sub === 'settings' ? <Settings scope={slug} /> : <YcMore slug={slug} name={biz.name} />
  else page = <YcOverview bizId={biz.id} businessName={biz.name} />
  return <WorkspaceShell slug={slug} tab={['overview', 'tasks', 'projects', 'more'].includes(tab) ? tab : 'overview'}>{page}</WorkspaceShell>
}
