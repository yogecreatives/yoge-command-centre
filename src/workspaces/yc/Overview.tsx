import { useMemo } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { StackDeck, DeckItem } from '../../ui/Stack'
import { TaskRow, ProjectRow } from '../../components/Rows'
import { go } from '../../lib/route'
import { dueLabel, fmtStamp, todayISO } from '../../lib/dates'
import { leadDue } from '../../lib/clientPipeline'
import { byDue } from '../../lib/logic'

export function YcOverview({ bizId }: { bizId: string }) {
  const { tasks, projects, prospects, activities, setTaskStatus } = useData()
  const open = useEditor(); const today = todayISO()
  const T = tasks.filter((t: any) => t.business_id === bizId), P = projects.filter((p: any) => p.business_id === bizId), L = prospects.filter((p: any) => p.business_id === bizId)
  const openT = T.filter((t: any) => t.status !== 'completed')
  const dueNow = openT.filter((t: any) => t.due_date && t.due_date <= today).sort(byDue)
  const leadsDue = L.filter((p: any) => leadDue(p, today))
  const active = P.filter((p: any) => p.status === 'in_progress').length
  const newLeads = L.filter((p: any) => p.stage === 'new').length
  const done = P.filter((p: any) => p.status === 'completed').length
  const year = String(new Date().getFullYear())
  const yp = P.filter((p: any) => (p.start_date || '').startsWith(year))
  const billed = yp.reduce((a: number, p: any) => a + Number(p.total_amount), 0), paid = yp.reduce((a: number, p: any) => a + Number(p.paid_amount), 0)
  const owed = P.filter((p: any) => p.status !== 'dropped' && Number(p.balance_amount) > 0)
  const owedSum = owed.reduce((a: number, p: any) => a + Number(p.balance_amount), 0)

  const items: DeckItem[] = useMemo(() => [
    ...dueNow.map((t: any) => ({ id: 't:' + t.id, label: t.due_date < today ? 'Overdue task' : 'Due today', title: t.title, sub: [t.category, t.priority !== 'normal' && t.priority].filter(Boolean).join(' · ') || 'Task', badge: t.priority === 'urgent' ? 'Urgent' : t.priority === 'high' ? 'High' : t.due_date < today ? 'Overdue' : undefined, tone: (t.due_date < today || t.priority !== 'normal' ? 'red' : '') as 'red' | '' })),
    ...leadsDue.map((p: any) => ({ id: 'l:' + p.id, label: 'Lead follow-up', title: p.agency_name, sub: p.next_action || 'Follow up with this lead', badge: dueLabel(p.next_action_date, today), tone: (p.next_action_date < today ? 'red' : '') as 'red' | '' })),
  ], [dueNow.map((t: any) => t.id).join(), leadsDue.map((p: any) => p.id).join(), today])

  const feed = [
    ...T.filter((t: any) => t.completed_at).map((t: any) => ({ at: t.completed_at, text: `Task completed · ${t.title}` })),
    ...P.map((p: any) => ({ at: p.created_at, text: `Project added · ${p.name}` })),
    ...activities.filter((a: any) => L.some((p: any) => p.id === a.prospect_id)).map((a: any) => ({ at: a.created_at, text: `${L.find((p: any) => p.id === a.prospect_id)?.agency_name} · ${a.note || a.kind}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)

  const onDone = (id: string) => { const [k, rid] = [id.slice(0, 1), id.slice(2)]; if (k === 't') { const t = tasks.find((x: any) => x.id === rid); if (t) setTaskStatus(t, 'completed') } else open('lead', prospects.find((x: any) => x.id === rid)) }
  const onOpen = (id: string) => { const rid = id.slice(2); id.startsWith('t') ? open('task', tasks.find((x: any) => x.id === rid)) : open('lead', prospects.find((x: any) => x.id === rid)) }

  return (
    <>
      <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long' })} · Yogecreatives</div>
      <div className="hero-n">{items.length}</div>
      <p className="hero-s">{items.length === 1 ? 'thing needs you now' : 'things need you now'}</p>
      <StackDeck items={items} onDone={onDone} onOpen={onOpen} doneLabel="Done" empty="Nothing is due. Add a task or follow up a lead." />

      <div className="kstats four">
        <div><b>{active}</b><span>Active projects</span></div><div><b>{newLeads}</b><span>New leads</span></div>
        <div><b>{leadsDue.length}</b><span>Pending follow-ups</span></div><div><b>{done}</b><span>Completed projects</span></div>
      </div>

      <div className="sectionlabel">Revenue overview · {year}</div>
      <div className="listcard"><div className="kstats" style={{ margin: '12px 0' }}>
        <div><b>{Math.round(billed).toLocaleString()}</b><span>Billed</span></div><div><b>{Math.round(paid).toLocaleString()}</b><span>Paid</span></div><div><b>{Math.round(owedSum).toLocaleString()}</b><span>Unpaid (all years)</span></div></div></div>

      <div className="sectionlabel">Important pending actions</div>
      <div className="listcard">
        {[...dueNow.filter((t: any) => t.due_date < today).slice(0, 3).map((t: any) => <TaskRow key={t.id} t={t} showBusiness={false} />),
          ...owed.filter((p: any) => p.status === 'completed').slice(0, 3).map((p: any) => <ProjectRow key={p.id} p={p} showBusiness={false} />)].length
          ? [...dueNow.filter((t: any) => t.due_date < today).slice(0, 3).map((t: any) => <TaskRow key={t.id} t={t} showBusiness={false} />),
            ...owed.filter((p: any) => p.status === 'completed').slice(0, 3).map((p: any) => <ProjectRow key={p.id} p={p} showBusiness={false} />)]
          : <div className="empty">No overdue tasks and no unpaid finished projects.</div>}
      </div>

      <div className="sectionlabel">Recent activity</div>
      <div className="listcard">{feed.length ? feed.map((f, i) => <div key={i} className="row"><div className="row-main"><div className="row-title" style={{ fontSize: 14 }}>{f.text}</div></div><span className="chip">{fmtStamp(f.at)}</span></div>) : <div className="empty">Activity appears here as you work.</div>}</div>
      <button className="link" onClick={() => go('/w/yogecreatives/tasks')} style={{ margin: '0 6px' }}>View all tasks</button>
    </>
  )
}
