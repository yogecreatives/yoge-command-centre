import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { Group, ProjectRow } from '../components/Rows'
import { Segmented } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { PROJECT_STATUS } from '../lib/labels'

export function Projects() {
  const { projects, businesses, referrers } = useData()
  const open = useEditor()
  const [tab, setTab] = useState<'active' | 'unpaid' | 'all'>('active')
  const [q, setQ] = useState(''); const [year, setYear] = useState('all'); const [biz, setBiz] = useState('all'); const [status, setStatus] = useState('all'); const [ref, setRef] = useState('all')
  const years = [...new Set(projects.map(p => (p.start_date || '').slice(0, 4)).filter(Boolean))].sort().reverse()
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return projects.filter(p => {
      if (tab === 'active' && ['completed', 'dropped'].includes(p.status) && Number(p.balance_amount) <= 0) return false
      if (tab === 'unpaid' && !(Number(p.balance_amount) > 0 && p.status !== 'dropped')) return false
      if (year !== 'all' && !(p.start_date || '').startsWith(year)) return false
      if (biz !== 'all' && p.business_id !== biz) return false
      if (status !== 'all' && p.status !== status) return false
      if (ref !== 'all' && (ref === 'none' ? p.referrer_id : p.referrer_id !== ref)) return false
      return !term || `${p.name} ${p.client_name ?? ''} ${p.notes ?? ''}`.toLowerCase().includes(term)
    }).sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
  }, [projects, tab, q, year, biz, status, ref])
  const sum = list.reduce((a, p) => ({ total: a.total + Number(p.total_amount), paid: a.paid + Number(p.paid_amount), bal: a.bal + (p.status === 'dropped' ? 0 : Number(p.balance_amount)) }), { total: 0, paid: 0, bal: 0 })
  const f = (n: number) => n.toLocaleString()
  return (
    <>
      <header className="large"><h1>Projects</h1><div className="toolbar"><button className="iconbtn" onClick={() => open('project')} aria-label="Add project"><Icon name="plus" /></button></div></header>
      <div className="search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects" /></div>
      <Segmented value={tab} onChange={setTab} options={[['active', 'Active'], ['unpaid', 'Unpaid'], ['all', 'All']]} />
      <div className="pills">
        <select className="pill" value={year} onChange={e => setYear(e.target.value)}><option value="all">All years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
        <select className="pill" value={biz} onChange={e => setBiz(e.target.value)}><option value="all">All businesses</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select className="pill" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Any status</option>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="pill" value={ref} onChange={e => setRef(e.target.value)}><option value="all">Any referrer</option><option value="none">Not set</option>{[...referrers].sort((a, b) => a.name.localeCompare(b.name)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </div>
      <p className="sts"><b>{list.length}</b> projects · total <b>{f(sum.total)}</b> · paid <b>{f(sum.paid)}</b> · unpaid <b>{f(sum.bal)}</b></p>
      <Group items={list.slice(0, 200).map(p => <ProjectRow key={p.id} p={p} />)} empty={projects.length ? 'No projects match.' : 'No projects yet. Tap + to add your first.'} />
      {list.length > 200 && <p className="foot">Showing the latest 200. Narrow the filters to see the rest.</p>}
    </>
  )
}
