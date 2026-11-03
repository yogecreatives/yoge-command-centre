import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { Group, TaskRow } from '../components/Rows'
import { useEditor } from '../components/Editors'
import { Segmented } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { addDays, todayISO } from '../lib/dates'
import { byDue } from '../lib/logic'
import { PRIORITY, STATUS, TASK_TYPE } from '../lib/labels'

type Scope = 'open' | 'today' | 'overdue' | 'upcoming' | 'done'
const prioRank: Record<string, number> = { urgent: 0, high: 1, normal: 2 }

export function Tasks() {
  const { tasks } = useData()
  const open = useEditor()
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
  const [scope, setScope] = useState<Scope>((q.get('scope') as Scope) || 'open')
  const [search, setSearch] = useState('')
  const [biz, setBiz] = useState('all'); const [status, setStatus] = useState(q.get('status') || 'all')
  const [prio, setPrio] = useState('all'); const [type, setType] = useState('all'); const [due, setDue] = useState('all')
  const [sort, setSort] = useState<'due' | 'priority' | 'newest'>('due')
  const { businesses } = useData()
  const today = todayISO()

  const list = useMemo(() => {
    let l = tasks.filter(t => {
      if (scope === 'done') { if (t.status !== 'completed') return false }
      else if (t.status === 'completed') return false
      if (scope === 'today' && t.due_date !== today) return false
      if (scope === 'overdue' && !(t.due_date && t.due_date < today)) return false
      if (scope === 'upcoming' && !(t.due_date && t.due_date > today)) return false
      if (biz !== 'all' && t.business_id !== biz) return false
      if (status !== 'all' && t.status !== status) return false
      if (prio !== 'all' && t.priority !== prio) return false
      if (type !== 'all' && t.task_type !== type) return false
      if (due === 'none' && t.due_date) return false
      if (due === 'week' && !(t.due_date && t.due_date >= today && t.due_date <= addDays(today, 7))) return false
      if (search && !`${t.title} ${t.notes ?? ''} ${t.category ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    if (sort === 'due') l = l.sort(scope === 'done' ? (a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '') : byDue)
    if (sort === 'priority') l = l.sort((a, b) => prioRank[a.priority] - prioRank[b.priority] || byDue(a, b))
    if (sort === 'newest') l = l.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return l
  }, [tasks, scope, search, biz, status, prio, type, due, sort, today])

  const counts = {
    overdue: tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date < today).length,
  }
  const sel = (value: string, set: (v: string) => void, all: string, opts: [string, string][]) => (
    <select className="pill" value={value} onChange={e => set(e.target.value)}>
      <option value="all">{all}</option>{opts.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  )
  return (
    <>
      <header className="large"><h1>Tasks</h1><div className="toolbar"><button className="iconbtn" onClick={() => open('task')} aria-label="Add task"><Icon name="plus" /></button></div></header>
      <div className="search"><Icon name="search" size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks" /></div>
      <Segmented value={scope} onChange={setScope} options={[['open', 'Open'], ['today', 'Today'], ['overdue', counts.overdue ? `Overdue ${counts.overdue}` : 'Overdue'], ['upcoming', 'Upcoming'], ['done', 'Done']]} />
      <div className="pills">
        {sel(biz, setBiz, 'All businesses', businesses.map(b => [b.id, b.name]))}
        {scope !== 'done' && sel(status, setStatus, 'Any status', [['pending', STATUS.pending], ['in_progress', STATUS.in_progress]])}
        {sel(prio, setPrio, 'Any priority', Object.entries(PRIORITY))}
        {sel(type, setType, 'Any type', Object.entries(TASK_TYPE))}
        {sel(due, setDue, 'Any date', [['week', 'Next 7 days'], ['none', 'No date']])}
        <select className="pill" value={sort} onChange={e => setSort(e.target.value as any)}>
          <option value="due">Sort: due date</option><option value="priority">Sort: priority</option><option value="newest">Sort: newest</option>
        </select>
      </div>
      <Group items={list.map(t => <TaskRow key={t.id} t={t} />)} empty={search || biz !== 'all' || status !== 'all' || prio !== 'all' || type !== 'all' || due !== 'all' ? 'No tasks match these filters.' : scope === 'done' ? 'Nothing completed yet.' : 'No tasks here. Tap + to add one.'} />
    </>
  )
}
