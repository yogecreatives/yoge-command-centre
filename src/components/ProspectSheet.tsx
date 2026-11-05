import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { useEditor } from './editorContext'
import { useData } from '../lib/data'
import { useToast } from '../ui/toast'
import { usePipelineActions } from '../lib/usePipeline'
import { NEXT_STEP, findDuplicate, gmailSearch, mailtoFor, normUrl } from '../lib/pipeline'
import { STAGE } from '../lib/labels'
import { fmtDate, fmtStamp } from '../lib/dates'
import { Prospect, Stage } from '../lib/types'

const nz = (s: string) => (s.trim() || null)

export function ProspectSheet({ item, defaults, onClose }: { item?: Prospect; defaults?: any; onClose: () => void }) {
  const { businesses, prospects, activities, settings, create, update, remove } = useData()
  const { markSent } = usePipelineActions()
  const openEditor = useEditor()
  const toast = useToast()
  const wl = businesses.find(b => b.slug === 'white-label') ?? businesses[0]
  const [f, setF] = useState({
    agency_name: item?.agency_name ?? defaults?.agency_name ?? '', contact_name: item?.contact_name ?? '', email: item?.email ?? defaults?.email ?? '',
    phone: item?.phone ?? '', website: item?.website ?? '', country: item?.country ?? '', source: item?.source ?? '', fit: item?.fit ?? 2,
    stage: (item?.stage ?? 'prospect') as Stage, next_action_date: item?.next_action_date ?? '', snooze_until: item?.snooze_until ?? '',
    test_project_value: item?.test_project_value != null ? String(item.test_project_value) : '', notes: item?.notes ?? '',
  })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false); const [confirm, setConfirm] = useState(false)
  const set = (k: string, v: any) => setF(s => ({ ...s, [k]: v }))
  const dup = findDuplicate(prospects, f.email, f.website, item?.id)
  const step = item ? NEXT_STEP[item.stage] : undefined
  const mail = item && step && settings ? mailtoFor(item, step.key, settings.outreach_templates, settings.sender_name) : null
  const history = item ? activities.filter(a => a.prospect_id === item.id) : []

  const save = async () => {
    if (!f.agency_name.trim()) return setErr('Add the agency name.')
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('That email address does not look right.')
    if (dup && !item && !confirm) { setConfirm(true); return setErr(`“${dup.agency_name}” already uses this email or website. Tap Save again to add it anyway.`) }
    setSaving(true)
    const row: Record<string, unknown> = {
      business_id: item?.business_id ?? wl.id, agency_name: f.agency_name.trim(), contact_name: nz(f.contact_name), email: nz(f.email), phone: nz(f.phone),
      website: f.website.trim() ? normUrl(f.website.trim()) : null, country: nz(f.country), source: nz(f.source), fit: f.fit, stage: f.stage,
      next_action_date: f.next_action_date || null, snooze_until: f.snooze_until || null,
      test_project_value: f.test_project_value ? Number(f.test_project_value) : null, notes: nz(f.notes),
    }
    const res = item ? await update('prospects', item.id, row) : await create('prospects', row)
    setSaving(false)
    if (res) { if (item && item.stage !== f.stage) await create('prospect_activities', { prospect_id: item.id, kind: 'stage_change', note: `Moved to ${STAGE[f.stage]}` }); toast(item ? 'Agency saved' : 'Agency added'); onClose() }
  }
  const replied = () => openEditor('replied', item)

  return (
    <Sheet title={item ? item.agency_name : 'New agency'} onClose={onClose}>
      {item && (
        <div className="savebar" style={{ marginBottom: 14 }}>
          {step && <div className="row-sub">Next: <b>{step.label}</b>{item.next_action_date ? ` · due ${fmtDate(item.next_action_date)}` : ''}</div>}
          <div className="two">
            {mail ? <a className="btn block" href={mail}>Open email</a> : <button className="btn block" disabled>{item.email ? 'No next email' : 'Add an email first'}</button>}
            {item.email ? <a className="btn block" href={gmailSearch(item.email)} target="_blank" rel="noreferrer">Check Gmail</a> : <button className="btn block" disabled>Check Gmail</button>}
          </div>
          <div className="two">
            <button className="btn primary block" disabled={!step} onClick={async () => { await markSent(item); onClose() }}>Sent</button>
            <button className="btn block" onClick={replied}>Replied</button>
          </div>
        </div>
      )}
      <label className="fld"><span>Agency</span><input className="input" autoFocus={!item} value={f.agency_name} onChange={e => set('agency_name', e.target.value)} /></label>
      <div className="two">
        <label className="fld"><span>Contact person</span><input className="input" value={f.contact_name} onChange={e => set('contact_name', e.target.value)} /></label>
        <label className="fld"><span>Country</span><input className="input" value={f.country} onChange={e => set('country', e.target.value)} /></label>
      </div>
      <label className="fld"><span>Email</span><input className="input" type="email" inputMode="email" value={f.email} onChange={e => set('email', e.target.value)} /></label>
      <div className="two">
        <label className="fld"><span>Phone</span><input className="input" type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></label>
        <label className="fld"><span>Source</span><input className="input" list="srcs" value={f.source} onChange={e => set('source', e.target.value)} /><datalist id="srcs"><option value="LinkedIn" /><option value="Google" /><option value="Referral" /><option value="Wix directory" /></datalist></label>
      </div>
      <label className="fld"><span>Website</span><input className="input" value={f.website} onChange={e => set('website', e.target.value)} /></label>
      <div className="two">
        <label className="fld"><span>Fit</span><select className="input" value={f.fit} onChange={e => set('fit', Number(e.target.value))}><option value={3}>★★★ Strong</option><option value={2}>★★ Good</option><option value={1}>★ Weak</option></select></label>
        <label className="fld"><span>Step</span><select className="input" value={f.stage} onChange={e => set('stage', e.target.value)}>{Object.entries(STAGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <div className="two">
        <label className="fld"><span>Next date</span><input className="input" type="date" value={f.next_action_date} onChange={e => set('next_action_date', e.target.value)} /></label>
        {f.stage === 'not_now' ? <label className="fld"><span>Come back on</span><input className="input" type="date" value={f.snooze_until} onChange={e => set('snooze_until', e.target.value)} /></label>
          : <label className="fld"><span>Trial project value</span><input className="input" inputMode="decimal" value={f.test_project_value} onChange={e => set('test_project_value', e.target.value)} /></label>}
      </div>
      <label className="fld"><span>Notes</span><textarea className="input" rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} /></label>
      {dup && <p className="warnmsg">Same email or website as “{dup.agency_name}”.</p>}
      {err && <p className="err">{err}</p>}
      {item && history.length > 0 && <div className="group"><div className="grouphead">History</div>{history.slice(0, 12).map(a => <div key={a.id} className="row"><div className="row-main"><div className="row-title">{a.note || a.kind}</div></div><span className="chip">{fmtStamp(a.created_at)}</span></div>)}</div>}
      <div className="savebar" style={{ marginTop: 12 }}>
        <button className="btn primary block" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        {item && !confirm && <button className="btn danger block" onClick={() => setConfirm(true)}>Delete</button>}
        {item && confirm && <div className="confirm"><span>Delete this agency and its history?</span>
          <button className="btn danger" onClick={async () => { if (await remove('prospects', item.id)) { toast('Agency deleted'); onClose() } }}>Delete</button>
          <button className="btn" onClick={() => setConfirm(false)}>Keep</button></div>}
      </div>
    </Sheet>
  )
}
