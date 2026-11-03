import { useData } from '../lib/data'
import { Group, FollowUpRow, ProjectRow, TaskRow } from '../components/Rows'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { addDays, todayISO } from '../lib/dates'
import { byDue, summarize } from '../lib/logic'

export function Stat({ n, label, tone, onClick }: { n: number; label: string; tone?: string; onClick?: () => void }) {
  return <button className={`stat ${tone ?? ''}`} onClick={onClick}><strong>{n}</strong><span>{label}</span></button>
}

export function Today() {
  const { tasks, followUps, projects, businesses, notifications } = useData()
  const today = todayISO()
  const s = summarize(tasks, followUps, projects, today)
  const open = tasks.filter(t => t.status !== 'completed')
  const overdueTasks = open.filter(t => t.due_date && t.due_date < today).sort(byDue)
  const overdueFU = followUps.filter(f => f.status === 'open' && f.follow_up_date < today).sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date))
  const dueFU = followUps.filter(f => f.status === 'open' && f.follow_up_date === today)
  const priorities = open.filter(t => t.due_date === today || (t.priority === 'urgent' && !(t.due_date && t.due_date < today))).sort(byDue)
  const horizon = addDays(today, 7)
  const upcomingT = open.filter(t => t.due_date && t.due_date > today && t.due_date <= horizon).sort(byDue)
  const upcomingP = projects.filter(p => p.status !== 'completed' && p.due_date && p.due_date >= today && p.due_date <= horizon)
  const recent = tasks.filter(t => t.status === 'completed').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')).slice(0, 5)
  const unread = notifications.filter(n => !n.read_at).length
  const nothing = !overdueTasks.length && !overdueFU.length && !dueFU.length && !priorities.length

  return (
    <>
      <header className="large">
        <div><p className="date">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>Today</h1></div>
        <div className="toolbar">
          <button className="iconbtn badgeh" onClick={() => go('/inbox')} aria-label="Notifications"><Icon name="bell" />{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}</button>
          <button className="iconbtn" onClick={() => go('/settings')} aria-label="Settings"><Icon name="gear" /></button>
        </div>
      </header>

      <div className="stats">
        <Stat n={s.pending} label="Pending" onClick={() => go('/tasks?scope=open')} />
        <Stat n={s.inProgress} label="In progress" onClick={() => go('/tasks?scope=open&status=in_progress')} />
        <Stat n={s.overdue} label="Overdue" tone={s.overdue ? 'red' : ''} onClick={() => go('/tasks?scope=overdue')} />
        <Stat n={s.followUpsDue} label="Follow-ups due" tone={s.followUpsDue ? 'amber' : ''} onClick={() => go('/followups')} />
        <Stat n={s.upcoming} label="Due in 7 days" onClick={() => go('/calendar')} />
        <Stat n={s.completed} label="Completed" onClick={() => go('/tasks?scope=done')} />
      </div>

      <section className="section">
        <div className="section-title"><span>Businesses</span></div>
        <div className="group">
          {businesses.map(b => {
            const bt = tasks.filter(t => t.business_id === b.id), bf = followUps.filter(f => f.business_id === b.id), bp = projects.filter(p => p.business_id === b.id)
            const x = summarize(bt, bf, bp, today)
            return (
              <button key={b.id} className="row biz" onClick={() => go('/b/' + b.slug)}>
                <span className="tile">{b.symbol}</span>
                <div className="row-main">
                  <div className="row-title">{b.name}</div>
                  <div className="row-sub">{x.pending} pending · {x.inProgress} in progress · {x.completed} done</div>
                </div>
                {x.followUpsDue > 0 && <span className="chip amber">{x.followUpsDue} follow-up{x.followUpsDue > 1 ? 's' : ''}</span>}
                {x.overdue > 0 && <span className="chip red">{x.overdue} overdue</span>}
                <Icon name="chevron" size={16} />
              </button>
            )
          })}
        </div>
      </section>

      {nothing && <Group items={[]} title="Today" empty="Nothing needs you today. Add a task with the + button." />}
      <Group title="Overdue" items={[...overdueTasks.map(t => <TaskRow key={t.id} t={t} />), ...overdueFU.map(f => <FollowUpRow key={f.id} f={f} />)]} />
      <Group title="Today's priorities" items={priorities.map(t => <TaskRow key={t.id} t={t} />)} />
      <Group title="Follow-ups to do today" items={dueFU.map(f => <FollowUpRow key={f.id} f={f} />)} />
      <Group title="Coming up this week" items={[...upcomingT.map(t => <TaskRow key={t.id} t={t} />), ...upcomingP.map(p => <ProjectRow key={p.id} p={p} />)]} />
      <Group title="Recently completed" items={recent.map(t => <TaskRow key={t.id} t={t} />)} />
    </>
  )
}
