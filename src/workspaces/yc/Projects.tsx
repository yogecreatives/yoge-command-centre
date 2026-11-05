import { useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { ProjectRow } from '../../components/Rows'
import { Icon } from '../../ui/Icon'
import { Project } from '../../lib/types'

type Tab = 'all' | 'active' | 'hold' | 'completed'
type Group = 'none' | 'year' | 'vendor'
const f = (n: number) => Math.round(n).toLocaleString()

export function YcProjects({ bizId }: { bizId: string }) {
  const { projects, referrers } = useData(); const open = useEditor()
  const [tab, setTab] = useState<Tab>('active'); const [year, setYear] = useState('all'); const [vendor, setVendor] = useState('all'); const [group, setGroup] = useState<Group>('none'); const [q, setQ] = useState('')
  const mine = projects.filter(p => p.business_id === bizId)
  const years = [...new Set(mine.map(p => (p.start_date || '').slice(0, 4)).filter(Boolean))].sort().reverse()
  const inTab: Record<Tab, (p: Project) => boolean> = { all: () => true, active: p => p.status === 'in_progress' || p.status === 'planning', hold: p => p.status === 'on_hold', completed: p => p.status === 'completed' }
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return mine.filter(p => inTab[tab](p) && (year === 'all' || (p.start_date || '').startsWith(year)) && (vendor === 'all' || (vendor === 'none' ? !p.referrer_id : p.referrer_id === vendor))
      && (!t || `${p.name} ${p.client_name ?? ''} ${p.notes ?? ''}`.toLowerCase().includes(t))).sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
  }, [mine, tab, year, vendor, q])
  const groups = useMemo(() => {
    if (group === 'none') return [['', list]] as [string, Project[]][]
    const m = new Map<string, Project[]>()
    for (const p of list) { const k = group === 'year' ? (p.start_date || '').slice(0, 4) || 'No date' : referrers.find(r => r.id === p.referrer_id)?.name ?? 'Not set'; m.set(k, [...(m.get(k) ?? []), p]) }
    return [...m.entries()].sort((a, b) => (group === 'year' ? b[0].localeCompare(a[0]) : b[1].length - a[1].length))
  }, [list, group, referrers])
  const count = (t: Tab) => mine.filter(inTab[t]).length
  const tabs: [Tab, string][] = [['active', 'Active'], ['all', 'All'], ['hold', 'On hold'], ['completed', 'Completed']]
  return (
    <>
      <div className="wshead" style={{ marginBottom: 6 }}><div><h1 className="pagetitle">Projects</h1><p className="pagesub">All agency projects in one place.</p></div>
        <button className="btn primary" onClick={() => open('project', undefined, { business_id: bizId })}><Icon name="plus" size={18} /> Add</button></div>
      <div className="search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects or clients" /></div>
      <div className="tabrow">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} · {count(k)}</button>)}</div>
      <div className="pills">
        <select className="pill" value={year} onChange={e => setYear(e.target.value)}><option value="all">All years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
        <select className="pill" value={vendor} onChange={e => setVendor(e.target.value)}><option value="all">All vendors</option><option value="none">Not set</option>{[...referrers].sort((a, b) => a.name.localeCompare(b.name)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select className="pill" value={group} onChange={e => setGroup(e.target.value as Group)}><option value="none">No grouping</option><option value="year">Group by year</option><option value="vendor">Group by vendor</option></select>
      </div>
      {groups.map(([name, ps]) => (
        <section key={name || 'all'}>
          {name && <div className="grouphd"><b>{name}</b><span>{ps.length} project{ps.length === 1 ? '' : 's'} · {f(ps.reduce((a, p) => a + Number(p.total_amount), 0))} total{ps.some(p => p.status !== 'dropped' && Number(p.balance_amount) > 0) ? ` · ${f(ps.reduce((a, p) => a + (p.status === 'dropped' ? 0 : Number(p.balance_amount)), 0))} unpaid` : ''}</span></div>}
          <div className="group">{ps.length ? ps.slice(0, 150).map(p => <ProjectRow key={p.id} p={p} showBusiness={false} />) : null}</div>
        </section>))}
      {!list.length && <div className="group"><div className="empty">{mine.length ? 'No projects match these filters.' : 'No projects yet. Tap Add, or import your sheet in Settings.'}</div></div>}
      {list.length > 150 && group === 'none' && <p className="groupnote">Showing the first 150. Use year or vendor filters to narrow down.</p>}
    </>
  )
}
