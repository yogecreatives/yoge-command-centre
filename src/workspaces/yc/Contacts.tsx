import { useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { SubBack } from './More'
import { Icon } from '../../ui/Icon'
import { STAGE } from '../../lib/labels'
import { buildContacts } from '../../lib/contacts'

export function YcContacts({ bizId }: { bizId: string }) {
  const { prospects, projects } = useData(); const open = useEditor()
  const [q, setQ] = useState(''); const [tab, setTab] = useState<'all' | 'clients' | 'leads'>('all')
  const all = useMemo(() => buildContacts(prospects.filter(p => p.business_id === bizId), projects.filter(p => p.business_id === bizId)), [prospects, projects, bizId])
  const list = all.filter(c => (tab === 'all' || (tab === 'clients' ? c.projects.length > 0 : !!c.lead && c.projects.length === 0)) && (!q.trim() || `${c.name} ${c.person ?? ''} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())))
  const tabs: [typeof tab, string][] = [['all', 'All'], ['clients', 'Clients'], ['leads', 'Leads']]
  return (
    <>
      <SubBack title="Contacts" sub="Clients and prospects, without duplicates." />
      <div className="search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or phone" /></div>
      <div className="tabrow">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="group">{list.length ? list.slice(0, 200).map(c => (
        <button key={c.key} className="row" onClick={() => (c.projects.length ? open('project', c.projects[0]) : open('lead', c.lead))}>
          <div className="row-main"><div className="row-title">{c.name}</div><div className="row-sub">{[c.person, c.email, c.phone, c.place].filter(Boolean).join(' · ') || 'No contact details yet'}</div></div>
          {c.projects.length > 0 && <span className="chip lime">{c.projects.length} project{c.projects.length > 1 ? 's' : ''}</span>}
          {c.lead && <span className="chip">{STAGE[c.lead.stage]}</span>}
        </button>)) : <div className="empty">{all.length ? 'No contacts match.' : 'Contacts appear here from your leads and from the client name on each project.'}</div>}</div>
      {all.length > 0 && !all.some(c => c.email || c.phone) && <p className="groupnote">Add a client email or phone on a project to fill in contact details.</p>}
    </>
  )
}
