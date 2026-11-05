import { useEffect } from 'react'
import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { go, useRoute } from '../lib/route'
import { businessRoute } from '../lib/workspaces'
import { WorkspaceShell, WL_TABS } from './Workspace'
import { YcOverview } from './yc/Overview'
import { YcTasks } from './yc/Tasks'
import { YcPipeline } from './yc/Pipeline'
import { YcProjects } from './yc/Projects'
import { YcMore } from './yc/More'
import { YcFinance } from './yc/Finance'
import { YcReports } from './yc/Reports'
import { YcContacts } from './yc/Contacts'
import { Settings } from '../pages/Settings'
import { Pipeline } from '../pages/Pipeline'
import { Inbox } from '../pages/Inbox'

export function WorkspaceRoute({ parts }: { parts: string[] }) {
  const { bizBySlug, tasks, followUps, prospects, projects } = useData()
  const open = useEditor()
  const route = useRoute()
  const slug = parts[1]
  const tab = parts[2] || (slug === 'white-label' ? 'pipeline' : 'overview')
  const sub = parts[3]
  const biz = bizBySlug(slug)
  const query = new URLSearchParams(route.split('?')[1] ?? '')

  useEffect(() => {
    if (slug !== 'yogecreatives' && slug !== 'white-label' && slug !== 'yogeworks') go(businessRoute(slug || ''))
  }, [slug])

  useEffect(() => {
    const taskId = query.get('task')
    const followupId = query.get('followup')
    const prospectId = query.get('prospect')
    const projectId = query.get('project')
    if (taskId) {
      const item = tasks.find(t => t.id === taskId)
      if (item) open('task', item)
    } else if (followupId) {
      const item = followUps.find(f => f.id === followupId)
      if (item) open('followup', item)
    } else if (prospectId) {
      const item = prospects.find(p => p.id === prospectId)
      if (item) open(slug === 'yogecreatives' ? 'lead' : 'prospect', item)
    } else if (projectId) {
      const item = projects.find(p => p.id === projectId)
      if (item) open('project', item)
    }
  }, [route, slug, tasks, followUps, prospects, projects, open, query.get('task'), query.get('followup'), query.get('prospect'), query.get('project')])

  if (slug === 'white-label') {
    if (!biz) return <div className="shell2"><div className="deck-empty">White Label workspace not found. Reload the app.</div></div>
    const wlTab = tab === 'tasks' ? 'tasks' : 'pipeline'
    if (tab === 'notifications') {
      return <WorkspaceShell slug={slug} tab={wlTab} tabs={WL_TABS}><Inbox scope={slug} /></WorkspaceShell>
    }
    return <WorkspaceShell slug={slug} tab={wlTab} tabs={WL_TABS}>
      {wlTab === 'tasks' ? <YcTasks bizId={biz.id} /> : <Pipeline />}
    </WorkspaceShell>
  }

  if (slug !== 'yogecreatives' && slug !== 'yogeworks') return null
  if (!biz) return <div className="shell2"><div className="deck-empty">Yogecreatives workspace not found. Reload the app.</div></div>

  let page
  if (tab === 'notifications') page = <Inbox scope={slug} />
  else if (tab === 'tasks') page = <YcTasks bizId={biz.id} />
  else if (tab === 'pipeline') page = <YcPipeline bizId={biz.id} />
  else if (tab === 'projects') page = <YcProjects bizId={biz.id} />
  else if (tab === 'more') page = sub === 'finance' ? <YcFinance bizId={biz.id} slug={slug} /> : sub === 'reports' ? <YcReports bizId={biz.id} slug={slug} /> : sub === 'contacts' ? <YcContacts bizId={biz.id} slug={slug} /> : sub === 'settings' ? <Settings scope={slug} /> : <YcMore slug={slug} name={biz.name} />
  else page = <YcOverview bizId={biz.id} businessName={biz.name} />
  return <WorkspaceShell slug={slug} tab={['overview', 'tasks', 'pipeline', 'projects', 'more'].includes(tab) ? tab : 'overview'}>{page}</WorkspaceShell>
}
