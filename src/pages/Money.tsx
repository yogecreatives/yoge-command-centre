import { useState } from 'react'
import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { Group } from '../components/Rows'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/toast'
import { Icon } from '../ui/Icon'
import { fmtDate, todayISO } from '../lib/dates'
import { Income } from '../lib/types'

const f = (n: number) => Math.round(n).toLocaleString()

export function IncomeForm({ item, bizId, onClose }: { item?: Income; bizId?: string; onClose: () => void }) {
  const { create, update, remove, bizById, businesses } = useData(); const toast = useToast()
  const [v, setV] = useState({ source: item?.source ?? 'Wix partner commission', amount: item ? String(item.amount) : '', date: item?.entry_date ?? todayISO(), status: item?.status ?? 'received', notes: item?.notes ?? '' })
  const [err, setErr] = useState(''); const [confirm, setConfirm] = useState(false)
  const set = (k: string, x: string) => setV(s => ({ ...s, [k]: x }))
  const save = async () => {
    if (!v.source.trim()) return setErr('Add a source.'); if (!v.amount || isNaN(Number(v.amount)) || Number(v.amount) < 0) return setErr('Enter the amount as a number.')
    const row = { source: v.source.trim(), amount: Number(v.amount), entry_date: v.date, status: v.status, notes: v.notes.trim() || null, business_id: item?.business_id ?? bizId ?? businesses.find(b => b.slug === 'yogecreatives')?.id ?? null }
    if (await (item ? update('income_entries', item.id, row) : create('income_entries', row))) { toast('Saved'); onClose() }
  }
  void bizById
  return (
    <Sheet title={item ? 'Edit income' : 'New income'} onClose={onClose}>
      <label className="fld"><span>Source</span><input className="input" value={v.source} onChange={e => set('source', e.target.value)} /></label>
      <div className="two">
        <label className="fld"><span>Amount</span><input className="input" inputMode="decimal" value={v.amount} onChange={e => set('amount', e.target.value)} /></label>
        <label className="fld"><span>Date</span><input className="input" type="date" value={v.date} onChange={e => set('date', e.target.value)} /></label>
      </div>
      <label className="fld"><span>Status</span><select className="input" value={v.status} onChange={e => set('status', e.target.value)}><option value="received">Received</option><option value="expected">Expected</option></select></label>
      <label className="fld"><span>Notes</span><textarea className="input" rows={2} value={v.notes} onChange={e => set('notes', e.target.value)} /></label>
      {err && <p className="err">{err}</p>}
      <div className="savebar"><button className="btn primary block" onClick={save}>Save</button>
        {item && !confirm && <button className="btn danger block" onClick={() => setConfirm(true)}>Delete</button>}
        {item && confirm && <div className="confirm"><span>Delete this entry?</span><button className="btn danger" onClick={async () => { if (await remove('income_entries', item.id)) onClose() }}>Delete</button><button className="btn" onClick={() => setConfirm(false)}>Keep</button></div>}</div>
    </Sheet>
  )
}

export function Money() {
  const { projects, income } = useData()
  const open = useEditor()
  const [edit, setEdit] = useState<Income | 'new' | null>(null)
  const years = [...new Set(projects.map(p => (p.start_date || '').slice(0, 4)).filter(Boolean))].sort().reverse()
  const unpaid = projects.filter(p => p.status !== 'dropped' && Number(p.balance_amount) > 0).sort((a, b) => Number(b.balance_amount) - Number(a.balance_amount))
  const unpaidTotal = unpaid.reduce((a, p) => a + Number(p.balance_amount), 0)
  const inc = [...income].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  const got = inc.filter(i => i.status === 'received').reduce((a, i) => a + Number(i.amount), 0), exp = inc.filter(i => i.status === 'expected').reduce((a, i) => a + Number(i.amount), 0)
  const today = todayISO()
  return (
    <>
      <header className="large"><div><p className="date">Projects and commission</p><h1>Money</h1></div></header>
      <div className="stats two-up">
        <div className="stat"><strong>{f(unpaidTotal)}</strong><span>Unpaid across {unpaid.length} projects</span></div>
        <div className="stat"><strong>{f(got)}</strong><span>Wix commission received</span></div>
      </div>
      <Group title="By year" items={years.map(y => {
        const l = projects.filter(p => (p.start_date || '').startsWith(y))
        const t = l.reduce((a, p) => a + Number(p.total_amount), 0), pd = l.reduce((a, p) => a + Number(p.paid_amount), 0), b = l.reduce((a, p) => a + (p.status === 'dropped' ? 0 : Number(p.balance_amount)), 0)
        return <div key={y} className="row col"><div className="rt"><div className="row-title">{y}</div><div className="v">{l.length} projects</div></div><div className="m"><span>Billed <b>{f(t)}</b></span><span>Paid <b>{f(pd)}</b></span>{b > 0 && <span className="warn">Unpaid <b>{f(b)}</b></span>}</div></div>
      })} empty="No projects yet." />
      <Group title="Who owes you" items={unpaid.slice(0, 25).map(p => (
        <button key={p.id} className="row" onClick={() => open('project', p)}><div className="row-main"><div className="row-title">{p.name}</div><div className="row-sub">{p.invoice_status === 'not_sent' ? 'Invoice not sent' : 'Invoice sent'} · {fmtDate(p.start_date)}</div></div><span className="chip red">{f(Number(p.balance_amount))}</span></button>))} empty="Nothing unpaid. Well done." />
      <Group title={`Wix partner commission · received ${f(got)}${exp ? ` · expected ${f(exp)}` : ''}`} action={<button className="link" onClick={() => setEdit('new')}><Icon name="plus" size={18} /></button>}
        items={inc.map(i => <button key={i.id} className="row" onClick={() => setEdit(i)}><div className="row-main"><div className="row-title">{i.source}</div><div className="row-sub">{fmtDate(i.entry_date)}{i.status === 'expected' || i.entry_date > today ? ' · expected' : ''}</div></div><span className={`chip ${i.status === 'expected' ? 'amber' : ''}`}>{f(Number(i.amount))}</span></button>)} empty="No income entries yet." />
      {edit && <IncomeForm item={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
    </>
  )
}
