import { useState } from 'react'
import { useData } from '../lib/data'
import { FollowUpRow, Group, ProjectRow, TaskRow } from '../components/Rows'
import { useEditor } from '../components/Editors'
import { Segmented } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { Stat } from './Today'
import { go } from '../lib/route'
import { addDays, todayISO } from '../lib/dates'
import { byDue, summarize } from '../lib/logic'

type Tab = 'overview' | 'tasks' | 'followups' | 'projects' | 'done'

export function Business({ slug }: { slug: string }) {
  const { bizBySlug, tasks, followUps, projects, update } = useData()
  const open = useEditor()
  const [tab, setTab] = useState<Tab>('overview')
  const b = bizBySlug(slug)
  if (!b) return <div className="group"><div className="empty">This workspace was not found.</div></div>
  const today = todayISO()
  // A workspace only ever sees its own business_id.
  const bt = tasks.filter(t => t.business_id === b.id), bf = followUps.filter(f => f.business_id === b.id), bp = projects.filter(p => p.business_id === b.id)
  const s = summarize(bt, bf, bp, today)
  const openT = bt.filter(t => t.status !== 'completed').sort(byDue)
  const add = () => open(tab === 'followups' ? 'followup' : tab === 'projects' ? 'project' : 'task', undefined, { business_id: b.id })
  const horizon = addDays(today, 14)
  return (
    <>
      <button className="backlink" onClick={() => go('/today')}><Icon name="back" size={18} />Today</button>
      <header className="large"><div><h1>{b.name}</h1><p className="date">{b.description}</p></div><div className="toolbar"><button className="iconbtn" onClick={add} aria-label="Add"><Icon name="plus" /></button></div></header>
      <Segmented value={tab} onChange={setTab} options={[['overview', 'Overview'], ['tasks', 'Tasks'], ['followups', 'Follow-ups'], ['projects', 'Projects'], ['done', 'Done']]} />

      {tab === 'overview' && (
        <>
          <div className="stats">
            <Stat n={s.pending} label="Pending" /><Stat n={s.inProgress} label="In progress" />
            <Stat n={s.overdue} label="Overdue" tone={s.overdue ? 'red' : ''} /><Stat n={s.followUpsDue} label="Follow-ups due" tone={s.followUpsDue ? 'amber' : ''} />
            <Stat n={s.upcoming} label="Due in 7 days" /><Stat n={s.completed} label="Completed" />
          </div>
          <Group title="In progress" items={openT.filter(t => t.status === 'in_progress').map(t => <TaskRow key={t.id} t={t} showBusiness={false} />)} />
          <Group title="Upcoming deadlines" items={[
            ...openT.filter(t => t.due_date && t.due_date <= horizon).map(t => <TaskRow key={t.id} t={t} showBusiness={false} />),
            ...bp.filter(p => p.status !== 'completed' && p.due_date && p.due_date <= horizon).map(p => <ProjectRow key={p.id} p={p} showBusiness={false} />),
          ]} empty="No deadlines in the next two weeks." />
        </>
      )}
      {tab === 'tasks' && <Group items={openT.map(t => <TaskRow key={t.id} t={t} showBusiness={false} />)} empty={`No open tasks for ${b.name}. Tap + to add one.`} />}
      {tab === 'followups' && <Group items={bf.filter(f => f.status === 'open').sort((a, c) => a.follow_up_date.localeCompare(c.follow_up_date)).map(f => <FollowUpRow key={f.id} f={f} showBusiness={false} />)} empty="No open follow-ups." />}
      {tab === 'projects' && <Group items={bp.filter(p => p.status !== 'completed').map(p => <ProjectRow key={p.id} p={p} showBusiness={false} />)} empty="No active projects. Tap + to add one." />}
      {tab === 'done' && (
        <>
          <Group title="Tasks" items={bt.filter(t => t.status === 'completed').sort((a, c) => (c.completed_at ?? '').localeCompare(a.completed_at ?? '')).map(t => <TaskRow key={t.id} t={t} showBusiness={false} />)} empty="No completed tasks yet. Tick the circle on a task to finish it." />
          <Group title="Follow-ups" items={bf.filter(f => f.status === 'completed').map(f => <FollowUpRow key={f.id} f={f} showBusiness={false} />)} />
          <Group title="Projects" items={bp.filter(p => p.status === 'completed').map(p => (
            <div key={p.id} className="row"><div className="row-main" style={{ flex: 1 }}><ProjectRow p={p} showBusiness={false} /></div>
              <button className="btn small" onClick={() => update('projects', p.id, { status: 'in_progress', completed_at: null })}>Reopen</button></div>
          ))} />
        </>
      )}
    </>
  )
}
