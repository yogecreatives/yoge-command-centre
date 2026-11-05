import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { useEditor } from './editorContext'
import { Segmented } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { addDays, fmtDate, iso, mondayOf, parse, todayISO } from '../lib/dates'

export type EvKind = 'task' | 'followup' | 'project'
interface Ev { key: string; kind: EvKind; date: string; title: string; sub: string; open: () => void }
type Mode = 'month' | 'week' | 'day' | 'list'
const KIND_LABEL: Record<EvKind, string> = { task: 'Task', followup: 'Follow-up', project: 'Project deadline' }

export function CalendarView({ kinds = ['task', 'followup', 'project'] }: { kinds?: EvKind[] }) {
  const { tasks, followUps, projects, bizById } = useData()
  const open = useEditor()
  const today = todayISO()
  const [mode, setMode] = useState<Mode>('month')
  const [cursor, setCursor] = useState(today)
  const [sel, setSel] = useState(today)

  const events = useMemo(() => {
    const out: Ev[] = []
    if (kinds.includes('task')) tasks.filter(t => t.due_date && t.status !== 'completed').forEach(t => out.push({ key: 't' + t.id, kind: 'task', date: t.due_date!, title: t.title, sub: bizById(t.business_id)?.name ?? '', open: () => open('task', t) }))
    if (kinds.includes('followup')) followUps.filter(f => f.status === 'open').forEach(f => out.push({ key: 'f' + f.id, kind: 'followup', date: f.follow_up_date, title: f.person_name + (f.company ? ` · ${f.company}` : ''), sub: bizById(f.business_id)?.name ?? '', open: () => open('followup', f) }))
    if (kinds.includes('project')) projects.filter(p => p.due_date && p.status !== 'completed').forEach(p => out.push({ key: 'p' + p.id, kind: 'project', date: p.due_date!, title: p.name, sub: bizById(p.business_id)?.name ?? '', open: () => open('project', p) }))
    return out
  }, [tasks, followUps, projects, kinds.join(), bizById, open])
  const on = (d: string) => events.filter(e => e.date === d)

  const shift = (dir: number) => {
    const d = parse(cursor)
    if (mode === 'month') { d.setDate(1); d.setMonth(d.getMonth() + dir); setCursor(iso(d)) }
    else if (mode === 'week') setCursor(addDays(cursor, 7 * dir))
    else { const n = addDays(sel, dir); setSel(n); setCursor(n) }
  }
  const title = mode === 'month' ? parse(cursor).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : mode === 'week' ? `${fmtDate(mondayOf(cursor))} – ${fmtDate(addDays(mondayOf(cursor), 6))}`
    : mode === 'day' ? fmtDate(sel) : 'Upcoming'

  const EvRow = ({ e }: { e: Ev }) => (
    <button className="row" onClick={e.open}>
      <i className={`dot ${e.kind}`} />
      <div className="row-main"><div className="row-title">{e.title}</div><div className="row-sub">{KIND_LABEL[e.kind]}{e.sub ? ` · ${e.sub}` : ''}</div></div>
    </button>
  )
  const DayList = ({ d }: { d: string }) => {
    const list = on(d)
    return <div className="group">{list.length ? list.map(e => <EvRow key={e.key} e={e} />) : <div className="empty">Nothing on {fmtDate(d)}.</div>}</div>
  }

  const first = parse(cursor); first.setDate(1)
  const start = parse(mondayOf(iso(first)))
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return iso(d) })
  const month = parse(cursor).getMonth()

  return (
    <div>
      <Segmented value={mode} options={[['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['list', 'List']]} onChange={m => { setMode(m); if (m === 'day') setCursor(sel) }} />
      <div className="legend"><span><i className="dot task" />Task</span><span><i className="dot followup" />Follow-up</span><span><i className="dot project" />Project</span></div>
      {mode !== 'list' && (
        <div className="calhead">
          <button className="iconbtn" onClick={() => shift(-1)} aria-label="Previous"><Icon name="back" size={20} /></button>
          <strong>{title}</strong>
          <button className="iconbtn flip" onClick={() => shift(1)} aria-label="Next"><Icon name="back" size={20} /></button>
        </div>
      )}
      {mode === 'month' && (
        <>
          <div className="cal">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
            {cells.map(d => {
              const ev = on(d); const kinds_ = [...new Set(ev.map(e => e.kind))]
              return (
                <button key={d} className={`cal-day ${parse(d).getMonth() !== month ? 'dim' : ''} ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`} onClick={() => setSel(d)}>
                  <span>{parse(d).getDate()}</span>
                  <em>{kinds_.map(k => <i key={k} className={`dot ${k}`} />)}</em>
                </button>
              )
            })}
          </div>
          <div className="section-title"><span>{fmtDate(sel)}</span></div>
          <DayList d={sel} />
        </>
      )}
      {mode === 'week' && Array.from({ length: 7 }, (_, i) => addDays(mondayOf(cursor), i)).map(d => (
        <section key={d} className="section"><div className="section-title"><span>{d === today ? 'Today · ' : ''}{fmtDate(d)}</span></div><DayList d={d} /></section>
      ))}
      {mode === 'day' && <DayList d={sel} />}
      {mode === 'list' && <UpcomingList events={events} today={today} />}
    </div>
  )

  function UpcomingList({ events, today }: { events: Ev[]; today: string }) {
    const overdue = events.filter(e => e.date < today).sort((a, b) => a.date.localeCompare(b.date))
    const ahead = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))
    const days = [...new Set(ahead.map(e => e.date))]
    return (
      <>
        {overdue.length > 0 && <section className="section"><div className="section-title red"><span>Overdue</span></div><div className="group">{overdue.map(e => <EvRow key={e.key} e={e} />)}</div></section>}
        {days.map(d => <section key={d} className="section"><div className="section-title"><span>{d === today ? 'Today' : fmtDate(d)}</span></div><div className="group">{ahead.filter(e => e.date === d).map(e => <EvRow key={e.key} e={e} />)}</div></section>)}
        {!overdue.length && !days.length && <div className="group"><div className="empty">Nothing scheduled. Add due dates to tasks, follow-ups and projects.</div></div>}
      </>
    )
  }
}
