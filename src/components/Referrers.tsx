import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { useData } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useToast } from '../ui/toast'
import { REFERRER_TYPE } from '../lib/labels'
import { Referrer, ReferrerType } from '../lib/types'

export function ReferrerPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { referrers, projects, create } = useData()
  const toast = useToast()
  const [q, setQ] = useState(''); const [focus, setFocus] = useState(false)
  const cur = referrers.find(r => r.id === value)
  const term = q.trim().toLowerCase()
  const matches = referrers.filter(r => !term || r.name.toLowerCase().includes(term)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 6)
  const exact = referrers.some(r => r.name.toLowerCase() === term)
  const count = (id: string) => projects.filter(p => p.referrer_id === id).length
  const add = async () => {
    const name = q.trim(); if (!name) return
    const r = await create('referrers', { name, type: 'individual' })
    if (r) { onChange(r.id); setQ(''); setFocus(false); toast(`${name} added as a referrer`) }
  }
  if (cur && !focus) return (
    <div className="input pickd"><span>{cur.name}<small> · {REFERRER_TYPE[cur.type]}</small></span>
      <button type="button" className="link" onClick={() => { onChange(''); setFocus(true) }}>Change</button></div>
  )
  return (
    <div className="picker">
      <input className="input" value={q} placeholder="Type a name, or leave empty" onChange={e => { setQ(e.target.value); setFocus(true) }} onFocus={() => setFocus(true)} autoComplete="off" />
      {focus && (term || matches.length > 0) && (
        <div className="suggest">
          {matches.map(r => <button type="button" key={r.id} className="opt" onClick={() => { onChange(r.id); setQ(''); setFocus(false) }}><span>{r.name}</span><small>{REFERRER_TYPE[r.type]} · {count(r.id)} projects</small></button>)}
          {term && !exact && <button type="button" className="opt add" onClick={add}>+ Add “{q.trim()}” as a new referrer</button>}
        </div>
      )}
    </div>
  )
}

export function ReferrerForm({ item, onClose }: { item?: Referrer; onClose: () => void }) {
  const { referrers, projects, create, update, remove, reload } = useData()
  const toast = useToast()
  const [f, setF] = useState({ name: item?.name ?? '', type: (item?.type ?? 'individual') as ReferrerType, email: item?.email ?? '', phone: item?.phone ?? '', notes: item?.notes ?? '' })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false); const [confirm, setConfirm] = useState(false); const [mergeTo, setMergeTo] = useState('')
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }))
  const nz = (s: string) => (s.trim() || null)
  const used = item ? projects.filter(p => p.referrer_id === item.id).length : 0
  const save = async () => {
    if (!f.name.trim()) return setErr('Add a name.')
    if (referrers.some(r => r.id !== item?.id && r.name.toLowerCase() === f.name.trim().toLowerCase())) return setErr('That name already exists. Use Merge to combine them.')
    setSaving(true)
    const row = { name: f.name.trim(), type: f.type, email: nz(f.email), phone: nz(f.phone), notes: nz(f.notes) }
    const res = item ? await update('referrers', item.id, row) : await create('referrers', row)
    setSaving(false); if (res) { toast(item ? 'Referrer saved' : 'Referrer added'); onClose() }
  }
  const merge = async () => {
    if (!item || !mergeTo) return
    const { error } = await supabase.from('projects').update({ referrer_id: mergeTo }).eq('referrer_id', item.id)
    if (error) return toast(error.message, 'error')
    if (await remove('referrers', item.id)) { await reload(); toast(`Merged into ${referrers.find(r => r.id === mergeTo)?.name}`); onClose() }
  }
  return (
    <Sheet title={item ? 'Edit referrer' : 'New referrer'} onClose={onClose}>
      <label className="fld"><span>Name</span><input className="input" autoFocus={!item} value={f.name} onChange={e => set('name', e.target.value)} /></label>
      <label className="fld"><span>Type</span><select className="input" value={f.type} onChange={e => set('type', e.target.value)}>{Object.entries(REFERRER_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <div className="two">
        <label className="fld"><span>Email</span><input className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} /></label>
        <label className="fld"><span>Phone</span><input className="input" type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></label>
      </div>
      <label className="fld"><span>Notes</span><textarea className="input" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></label>
      {err && <p className="err">{err}</p>}
      <div className="savebar">
        <button className="btn primary block" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {item && referrers.length > 1 && (
          <div className="group pad"><div className="row-sub">Merge into another referrer ({used} project{used === 1 ? '' : 's'} move across)</div>
            <select className="input" value={mergeTo} onChange={e => setMergeTo(e.target.value)}><option value="">Choose…</option>{referrers.filter(r => r.id !== item.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
            <button className="btn block" disabled={!mergeTo} onClick={merge}>Merge</button></div>)}
        {item && !confirm && <button className="btn danger block" onClick={() => setConfirm(true)}>Delete</button>}
        {item && confirm && <div className="confirm"><span>Projects keep existing but show “Not set”.</span>
          <button className="btn danger" onClick={async () => { if (await remove('referrers', item.id)) { await reload(); toast('Referrer deleted'); onClose() } }}>Delete</button>
          <button className="btn" onClick={() => setConfirm(false)}>Keep</button></div>}
      </div>
    </Sheet>
  )
}
