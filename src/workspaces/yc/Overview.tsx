import { useMemo } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { StackDeck, DeckItem } from '../../ui/Stack'
import { TaskRow, ProjectRow } from '../../components/Rows'
import { go } from '../../lib/route'
import { fmtStamp, todayISO } from '../../lib/dates'
import { byDue } from '../../lib/logic'

export function YcOverview({ bizId, businessName = 'Yogecreatives' }: { bizId: string; businessName?: string }) {
  const { tasks, projects, setTaskStatus } = useData()
  const open = useEditor(); const today = todayISO()
  const T = tasks.filter(t => t.business_id === bizId)
  const P = projects.filter(p => p.business_id === bizId)
  const openT = T.filter(t => t.status !== 'completed')
  const dueNow = openT.filter(t => t.due_date && t.due_date <= today).sort(byDue)
  const active = P.filter(p => p.status === 'in_progress').length
  const done = P.filter(p => p.status === 'completed').length
  const year = String(new Date().getFullYear())
  const yp = P.filter(p => (p.start_date || '').startsWith(year))
  const billed = yp.reduce((a, p) => a + Number(p.total_amount), 0)
  const paid = yp.reduce((a, p) => a + Number(p.paid_amount), 0)
  const owed = P.filter(p => p.status !== 'dropped' && Number(p.balance_amount) > 0)
  const owedSum = owed.reduce((a, p) => a + Number(p.balance_amount), 0)

  const items: DeckItem[] = useMemo(() => dueNow.map(t => ({
    id: 't:' + t.id,
    label: t.due_date! < today ? 'Overdue task' : 'Due today',
    title: t.title,
    sub: [t.category, t.priority !== 'normal' && t.priority].filter(Boolean).join(' · ') || 'Task',
    badge: t.priority === 'urgent' ? 'Urgent' : t.priority === 'high' ? 'High' : t.due_date! < today ? 'Overdue' : undefined,
    tone: (t.due_date! < today || t.priority !== 'normal' ? 'red' : '') as 'red' | ''
  })), [dueNow, today])

  const feed = [
    ...T.filter(t => t.completed_at).map(t => ({ at: t.completed_at!, text: `Task completed · ${t.title}` })),
    ...P.map(p => ({ at: p.created_at, text: `Project added · ${p.name}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)

  const onDone = (id: string) => {
    const t = tasks.find(x => x.id === id.slice(2))
    if (t) void setTaskStatus(t, 'completed')
  }
  const onOpen = (id: string) => {
    const t = tasks.find(x => x.id === id.slice(2))
    if (t) open('task', t)
  }

  return (
    <>
      <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long' })} · {businessName}</div>
      <div className="hero-n">{items.length}</div>
      <p className="hero-s">{items.length === 1 ? 'thing needs you now' : 'things need you now'}</p>
      <StackDeck items={items} onDone={onDone} onOpen={onOpen} doneLabel="Done" empty="Nothing is due. Add a task or follow up with a client." />

      <div className="kstats four">
        <div><b>{active}</b><span>Active projects</span></div>
        <div><b>{openT.length}</b><span>Open tasks</span></div>
        <div><b>{owed.length}</b><span>Unpaid projects</span></div>
        <div><b>{done}</b><span>Completed projects</span></div>
      </div>

      <div className="sectionlabel">Revenue overview · {year}</div>
      <div className="listcard"><div className="kstats" style={{ margin: '12px 0' }}>
        <div><b>{Math.round(billed).toLocaleString()}</b><span>Billed</span></div>
        <div><b>{Math.round(paid).toLocaleString()}</b><span>Paid</span></div>
        <div><b>{Math.round(owedSum).toLocaleString()}</b><span>Unpaid (all years)</span></div>
      </div></div>

      <div className="sectionlabel">Important pending actions</div>
      <div className="listcard">
        {[...dueNow.filter(t => t.due_date! < today).slice(0, 3).map(t => <TaskRow key={t.id} t={t} showBusiness={false} />),
          ...owed.filter(p => p.status === 'completed').slice(0, 3).map(p => <ProjectRow key={p.id} p={p} showBusiness={false} />)].length
          ? [...dueNow.filter(t => t.due_date! < today).slice(0, 3).map(t => <TaskRow key={t.id} t={t} showBusiness={false} />),
            ...owed.filter(p => p.status === 'completed').slice(0, 3).map(p => <ProjectRow key={p.id} p={p} showBusiness={false} />)]
          : <div className="empty">No overdue tasks and no unpaid finished projects.</div>}
      </div>

      <div className="sectionlabel">Recent activity</div>
      <div className="listcard">{feed.length ? feed.map((f, i) => <div key={i} className="row"><div className="row-main"><div className="row-title" style={{ fontSize: 14 }}>{f.text}</div></div><span className="chip">{fmtStamp(f.at)}</span></div>) : <div className="empty">Activity appears here as you work.</div>}</div>
      <button className="link" onClick={() => go('/w/' + (businessName === 'Yogeworks' ? 'yogeworks' : businessName === 'White Label' ? 'white-label' : 'yogecreatives') + '/tasks')} style={{ margin: '0 6px' }}>View all tasks</button>
    </>
  )
}
