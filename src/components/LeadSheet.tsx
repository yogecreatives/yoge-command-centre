import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { useEditor } from './editorContext'
import { useData } from '../lib/data'
import { useToast } from '../ui/toast'
import { STAGE } from '../lib/labels'
import { CLIENT_STAGES, FOLLOW_UP_DAYS, outreachPatch } from '../lib/clientPipeline'
import { findDuplicate, gmailSearch, normUrl } from '../lib/pipeline'
import { addDays, fmtDate, fmtStamp, todayISO } from '../lib/dates'
import { Prospect, Stage } from '../lib/types'

const nz = (s: string) => (s.trim() || null)

/** Yogecreatives lead: add/edit, log email or DM outreach, record replies, and turn a won lead into a project. */
export function LeadSheet({ item, defaults, onClose }: { item?: Prospect; defaults?: Record<string, any>; onClose: () => void }) {
  const { prospects, activities, businesses, bizById, create, update, remove } = useData()
  const open = useEditor(); const toast = useToast()
  // New leads inherit the active workspace. Existing leads keep their stored business.
  const workspaceBusiness = bizById(defaults?.business_id) ?? businesses.find(b => b.slug === 'yogecreatives')
  const leadBusinessId = item?.business_id ?? workspaceBusiness?.id
  if (!leadBusinessId) return null
  const [f, setF] = useState({
    agency_name: item?.agency_name ?? '', website: item?.website ?? '', contact_name: item?.contact_name ?? '', email: item?.email ?? '', phone: item?.phone ?? '',
    country: item?.country ?? '', city: item?.city ?? '', category: item?.category ?? '', source: item?.source ?? '', notes: item?.notes ?? '',
    stage: (item?.stage ?? 'new') as Stage, next_action: item?.next_action ?? '', next_action_date: item?.next_action_date ?? '', lost_reason: item?.lost_reason ?? '',
  })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false); const [confirm, setConfirm] = useState(false); const [dupOk, setDupOk] = useState(false)
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }))
  const mine = prospects.filter(p => p.business_id === leadBusinessId)
  const dup = findDuplicate(mine, f.email, f.website, item?.id) ?? mine.find(p => p.id !== item?.id && !f.email && !f.website && p.agency_name.trim().toLowerCase() === f.agency_name.trim().toLowerCase())
  const history = item ? activities.filter(a => a.prospect_id === item.id) : []
  const today = todayISO()

  const row = () => ({
    business_id: leadBusinessId, agency_name: f.agency_name.trim(), website: f.website.trim() ? normUrl(f.website.trim()) : null, contact_name: nz(f.contact_name), email: nz(f.email),
    phone: nz(f.phone), country: nz(f.country), city: nz(f.city), category: nz(f.category), source: nz(f.source), notes: nz(f.notes), stage: f.stage,
    next_action: nz(f.next_action), next_action_date: f.next_action_date || null, lost_reason: f.stage === 'lost' ? nz(f.lost_reason) : null,
  })
  const save = async () => {
    if (!f.agency_name.trim()) return setErr('Business name is required.')
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('That email address does not look right.')
    if (dup && !item && !dupOk) { setDupOk(true); return setErr(`“${dup.agency_name}” is already in your pipeline with this email or website. Tap Save again to add it anyway.`) }
    setSaving(true)
    const res = item ? await update('prospects', item.id, row()) : await create('prospects', row())
    setSaving(false)
    if (res) { if (item && item.stage !== f.stage) await create('prospect_activities', { prospect_id: item.id, kind: 'stage_change', note: `Moved to ${STAGE[f.stage]}` }); toast(item ? 'Lead saved' : 'Lead added'); onClose() }
  }
  const log = async (kind: 'email_sent' | 'dm_sent' | 'replied') => {
    if (!item) return
    const patch = kind === 'replied' ? { stage: (['new', 'contacted'].includes(item.stage) ? 'replied' : item.stage) as Stage, next_action_date: addDays(today, 2) } : outreachPatch(item, today, FOLLOW_UP_DAYS)
    const res = await update('prospects', item.id, patch as Record<string, unknown>)
    if (res) { await create('prospect_activities', { prospect_id: item.id, kind, note: kind === 'email_sent' ? 'Email sent' : kind === 'dm_sent' ? 'DM sent' : 'Reply received' }); toast(kind === 'replied' ? 'Reply logged' : `Logged. Follow-up set for ${fmtDate(patch.next_action_date as string)}`); onClose() }
  }
  const toProject = () => {
    if (!item) return
    onClose()
    open('project', undefined, { business_id: leadBusinessId, name: item.agency_name, client_name: item.contact_name || item.agency_name, client_email: item.email, client_phone: item.phone,
      afterSave: (pr: { id: string }) => update('prospects', item.id, { won_project_id: pr.id, stage: 'won' }) })
  }

  return (
    <Sheet title={item ? item.agency_name : 'Add lead'} onClose={onClose}>
      {item && (
        <div className="savebar" style={{ marginBottom: 14 }}>
          <div className="two">
            <button className="btn block" onClick={() => log('email_sent')}>Log email sent</button>
            <button className="btn block" onClick={() => log('dm_sent')}>Log DM sent</button>
          </div>
          <div className="two">
            <button className="btn block" onClick={() => log('replied')}>Reply received</button>
            {item.email ? <a className="btn block" href={gmailSearch(item.email)} target="_blank" rel="noreferrer">Check Gmail</a> : <button className="btn block" disabled>Check Gmail</button>}
          </div>
          {item.stage === 'won' && !item.won_project_id && <button className="btn primary block" onClick={toProject}>Create project from this lead</button>}
        </div>
      )}
      <label className="fld"><span>Business name *</span><input className="input" autoFocus={!item} value={f.agency_name} onChange={e => set('agency_name', e.target.value)} /></label>
      <div className="two">
        <label className="fld"><span>Contact person</span><input className="input" value={f.contact_name} onChange={e => set('contact_name', e.target.value)} /></label>
        <label className="fld"><span>Stage</span><select className="input" value={f.stage} onChange={e => set('stage', e.target.value)}>{CLIENT_STAGES.map(s => <option key={s} value={s}>{STAGE[s]}</option>)}</select></label>
      </div>
      <label className="fld"><span>Email</span><input className="input" type="email" inputMode="email" value={f.email} onChange={e => set('email', e.target.value)} /></label>
      <div className="two">
        <label className="fld"><span>Phone</span><input className="input" type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></label>
        <label className="fld"><span>Website</span><input className="input" value={f.website} onChange={e => set('website', e.target.value)} /></label>
      </div>
      <div className="two">
        <label className="fld"><span>Country</span><input className="input" value={f.country} onChange={e => set('country', e.target.value)} /></label>
        <label className="fld"><span>City / location</span><input className="input" value={f.city} onChange={e => set('city', e.target.value)} /></label>
      </div>
      <div className="two">
        <label className="fld"><span>Business category</span><input className="input" value={f.category} onChange={e => set('category', e.target.value)} placeholder="Clinic, law firm…" /></label>
        <label className="fld"><span>Lead source</span><input className="input" list="lsrc" value={f.source} onChange={e => set('source', e.target.value)} /><datalist id="lsrc"><option value="Instagram" /><option value="LinkedIn" /><option value="Google" /><option value="Referral" /><option value="WhatsApp" /></datalist></label>
      </div>
      <div className="two">
        <label className="fld"><span>Next action</span><input className="input" value={f.next_action} onChange={e => set('next_action', e.target.value)} placeholder="Send proposal" /></label>
        <label className="fld"><span>Follow-up date</span><input className="input" type="date" value={f.next_action_date} onChange={e => set('next_action_date', e.target.value)} /></label>
      </div>
      {f.stage === 'lost' && <label className="fld"><span>Why was it lost?</span><input className="input" value={f.lost_reason} onChange={e => set('lost_reason', e.target.value)} placeholder="Price, no reply, chose someone else" /></label>}
      <label className="fld"><span>Notes</span><textarea className="input" rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} /></label>
      {dup && <p className="warnmsg">Same email, website or name as “{dup.agency_name}”.</p>}
      {err && <p className="err">{err}</p>}
      {item && history.length > 0 && <div className="group"><div className="grouphead">Outreach history</div>{history.slice(0, 15).map(a => <div key={a.id} className="row"><div className="row-main"><div className="row-title" style={{ fontSize: 14 }}>{a.note || a.kind}</div></div><span className="chip">{fmtStamp(a.created_at)}</span></div>)}</div>}
      <div className="savebar" style={{ marginTop: 12 }}>
        <button className="btn primary block" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {item && !confirm && <button className="btn danger block" onClick={() => setConfirm(true)}>Delete</button>}
        {item && confirm && <div className="confirm"><span>Delete this lead and its history?</span><button className="btn danger" onClick={async () => { if (await remove('prospects', item.id)) { toast('Lead deleted'); onClose() } }}>Delete</button><button className="btn" onClick={() => setConfirm(false)}>Keep</button></div>}
      </div>
    </Sheet>
  )
}
