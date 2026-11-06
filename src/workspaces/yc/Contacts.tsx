import { useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { SubBack } from './More'

export function YcContacts({ bizId, slug = 'yogecreatives' }: { bizId: string; slug?: string }) {
  const { projects } = useData()
  const open = useEditor()
  const [q, setQ] = useState('')
  const rows = useMemo(() => projects
    .filter(p => p.business_id === bizId)
    .map(p => ({ id: p.id, name: p.client_name || p.name, email: p.client_email, phone: p.client_phone, project: p.name }))
    .filter(c => !q.trim() || `${c.name} ${c.email || ''} ${c.phone || ''} ${c.project}`.toLowerCase().includes(q.trim().toLowerCase())), [projects, bizId, q])

  return (
    <>
      <SubBack title="Contacts" sub="Clients from your projects" slug={slug} />
      <div className="listcard">
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients" />
        {rows.length ? rows.map(c => <button key={c.id} className="row" onClick={() => { const p = projects.find(x => x.id === c.id); if (p) open('project', p) }}>
          <div className="row-main"><div className="row-title">{c.name}</div><div className="row-sub">{[c.email, c.phone, c.project].filter(Boolean).join(' · ')}</div></div>
        </button>) : <div className="empty">No clients found.</div>}
      </div>
    </>
  )
}
