import { useEffect } from 'react'
import { useData } from '../lib/data'
import { go } from '../lib/route'
import { businessRoute } from '../lib/workspaces'
import { WorkspaceShell } from './Workspace'
import { YcOverview } from './yc/Overview'
import { YcTasks } from './yc/Tasks'
import { YcPipeline } from './yc/Pipeline'
import { YcProjects } from './yc/Projects'
import { YcMore } from './yc/More'
import { YcFinance } from './yc/Finance'
import { YcReports } from './yc/Reports'
import { YcContacts } from './yc/Contacts'
import { Settings } from '../pages/Settings'

export function WorkspaceRoute({ parts }: { parts: string[] }) {
  const { bizBySlug } = useData()
  const slug = parts[1]; const tab = parts[2] || 'overview'; const sub = parts[3]
  const biz = bizBySlug(slug)
  useEffect(() => { if (slug !== 'yogecreatives') go(businessRoute(slug || '')) }, [slug])
  if (slug !== 'yogecreatives') return null
  if (!biz) return <div className="shell2"><div className="deck-empty">Yogecreatives workspace not found. Reload the app.</div></div>
  let page
  if (tab === 'tasks') page = <YcTasks bizId={biz.id} />
  else if (tab === 'pipeline') page = <YcPipeline bizId={biz.id} />
  else if (tab === 'projects') page = <YcProjects bizId={biz.id} />
  else if (tab === 'more') page = sub === 'finance' ? <YcFinance bizId={biz.id} /> : sub === 'reports' ? <YcReports bizId={biz.id} /> : sub === 'contacts' ? <YcContacts bizId={biz.id} /> : sub === 'settings' ? <Settings scope="yc" /> : <YcMore />
  else page = <YcOverview bizId={biz.id} />
  return <WorkspaceShell slug={slug} tab={['overview', 'tasks', 'pipeline', 'projects', 'more'].includes(tab) ? tab : 'overview'}>{page}</WorkspaceShell>
}
