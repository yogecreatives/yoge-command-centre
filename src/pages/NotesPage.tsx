import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'

export function NotesPage() {
  const { notes, businesses, create, update, remove } = useData()
  const [editing, setEditing] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...notes]
      .filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
      .sort((a,b) => b.updated_at.localeCompare(a.updated_at))
  }, [notes, search])

  const reset = () => { setEditing(null); setTitle(''); setBody(''); setBusinessId('') }
  const startEdit = (n: any) => { setEditing(n.id); setTitle(n.title); setBody(n.body); setBusinessId(n.business_id || '') }
  const save = async () => {
    if (!title.trim() && !body.trim()) return
    if (editing) await update('notes', editing, { title: title.trim() || 'Untitled note', body, business_id: businessId || null, updated_at: new Date().toISOString() })
    else await create('notes', { title: title.trim() || 'Untitled note', body, business_id: businessId || null })
    reset()
  }

  return (
    <>
      <header className="large">
        <div><p className="date">Universal</p><h1>Notes</h1></div>
        <div className="toolbar">
          <button className="iconbtn" onClick={() => editing ? reset() : setEditing('new')} aria-label={editing ? 'Close editor' : 'New note'}>
            <Icon name={editing ? 'back' : 'plus'} />
          </button>
        </div>
      </header>

      {editing && (
        <section className="section">
          <div className="group" style={{padding:16}}>
            <div className="fld"><span>Title</span><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title" autoFocus /></div>
            <div className="fld"><span>Workspace (optional)</span>
              <select className="input" value={businessId} onChange={e => setBusinessId(e.target.value)}>
                <option value="">All workspaces</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="fld"><span>Note</span><textarea className="input" rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Write anything…" /></div>
            <div className="two">
              <button className="btn" onClick={reset}>Cancel</button>
              <button className="btn primary" onClick={save}>Save note</button>
            </div>
          </div>
        </section>
      )}

      <div className="search"><Icon name="search" size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes" /></div>

      <section className="section">
        <div className="section-title"><span>{filtered.length} note{filtered.length === 1 ? '' : 's'}</span></div>
        {filtered.length ? <div className="group">
          {filtered.map(n => {
            const b = businesses.find(x => x.id === n.business_id)
            return <article key={n.id} className="row col" style={{padding:16}}>
              <div className="rt"><strong>{n.title}</strong><div className="act">
                <button className="mini" onClick={() => startEdit(n)}>Edit</button>
                <button className="mini" onClick={async () => { if (confirm('Delete this note?')) await remove('notes', n.id) }}>Delete</button>
              </div></div>
              {b && <div className="meta">{b.name}</div>}
              {n.body && <div style={{whiteSpace:'pre-wrap',lineHeight:1.55,fontSize:14}}>{n.body}</div>}
            </article>
          })}
        </div> : <div className="group"><div className="empty">No notes yet. Create one for anything you want to keep across Yoge.</div></div>}
      </section>
    </>
  )
}
