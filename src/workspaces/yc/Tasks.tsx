import { useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { Group, TaskRow } from '../../components/Rows'
import { Icon } from '../../ui/Icon'
import { todayISO } from '../../lib/dates'
import { byDue } from '../../lib/logic'

type Scope = 'ongoing' | 'completed'
export function YcTasks({ bizId }: { bizId: string }) {
  const { tasks } = useData(); const open = useEditor(); const today = todayISO()
  const [scope, setScope] = useState<Scope>('ongoing'); const [q, setQ] = useState('')
  const mine = tasks.filter(t => t.business_id === bizId)
  const f: Record<Scope, (t: typeof mine[number]) => boolean> = {
    ongoing: t => t.status !== 'completed',
    completed: t => t.status === 'completed',
  }
  const count = (s: Scope) => mine.filter(f[s]).length
  const term = q.trim().toLowerCase()
  const list = mine.filter(f[scope]).filter(t => !term || `${t.title} ${t.notes ?? ''}`.toLowerCase().includes(term))
    .sort(scope === 'completed' ? (a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '') : byDue)
  const labels: [Scope, string][] = [['ongoing', 'Ongoing'], ['completed', 'Completed']]
  return (
    <>
      <div className="wshead" style={{ marginBottom: 6 }}><div><h1 className="pagetitle">Tasks</h1><p className="pagesub">Keep daily agency work moving.</p></div>
        <button className="iconbtn" onClick={() => open('task', undefined, { business_id: bizId })} aria-label="Add task"><Icon name="plus" size={21} /></button></div>
      <div className="search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tasks" /></div>
      <div className="tabrow">{labels.map(([k, l]) => <button key={k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>{l}{count(k) ? ` · ${count(k)}` : ''}</button>)}</div>
      <Group items={list.map(t => <TaskRow key={t.id} t={t} showBusiness={false} />)}
        empty={scope === 'completed' ? 'No completed tasks yet.' : 'No ongoing tasks.'} />
    </>
  )
}
