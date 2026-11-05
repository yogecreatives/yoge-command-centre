import { useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { Group } from '../../components/Rows'
import { IncomeForm } from '../../pages/Money'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/toast'
import { Icon } from '../../ui/Icon'
import { SubBack } from './More'
import { fmtDate, todayISO } from '../../lib/dates'
import { Expense, Income } from '../../lib/types'

const f = (n: number) => Math.round(n).toLocaleString()

function ExpenseForm({ item, bizId, onClose }: { item?: Expense; bizId: string; onClose: () => void }) {
  const { create, update, remove } = useData(); const toast = useToast()
  const [v, setV] = useState({ amount: item ? String(item.amount) : '', date: item?.expense_date ?? todayISO(), category: item?.category ?? '', vendor: item?.vendor ?? '', notes: item?.notes ?? '' })
  const [err, setErr] = useState(''); const [confirm, setConfirm] = useState(false)
  const set = (k: string, x: string) => setV(s => ({ ...s, [k]: x }))
  const save = async () => {
    if (!v.amount || isNaN(Number(v.amount)) || Number(v.amount) < 0) return setErr('Enter the amount as a number.')
    const row = { business_id: bizId, amount: Number(v.amount), expense_date: v.date, category: v.category.trim() || null, vendor: v.vendor.trim() || null, notes: v.notes.trim() || null }
    if (await (item ? update('expenses', item.id, row) : create('expenses', row))) { toast('Expense saved'); onClose() }
  }
  return (
    <Sheet title={item ? 'Edit expense' : 'New expense'} onClose={onClose}>
      <div className="two"><label className="fld"><span>Amount</span><input className="input" inputMode="decimal" autoFocus value={v.amount} onChange={e => set('amount', e.target.value)} /></label>
        <label className="fld"><span>Date</span><input className="input" type="date" value={v.date} onChange={e => set('date', e.target.value)} /></label></div>
      <div className="two"><label className="fld"><span>Category</span><input className="input" list="ecat" value={v.category} onChange={e => set('category', e.target.value)} /><datalist id="ecat"><option value="Wix plans" /><option value="Domains" /><option value="Software" /><option value="Freelancers" /><option value="Ads" /></datalist></label>
        <label className="fld"><span>Paid to</span><input className="input" value={v.vendor} onChange={e => set('vendor', e.target.value)} /></label></div>
      <label className="fld"><span>Notes</span><textarea className="input" rows={2} value={v.notes} onChange={e => set('notes', e.target.value)} /></label>
      {err && <p className="err">{err}</p>}
      <div className="savebar"><button className="btn primary block" onClick={save}>Save</button>
        {item && !confirm && <button className="btn danger block" onClick={() => setConfirm(true)}>Delete</button>}
        {item && confirm && <div className="confirm"><span>Delete this expense?</span><button className="btn danger" onClick={async () => { if (await remove('expenses', item.id)) onClose() }}>Delete</button><button className="btn" onClick={() => setConfirm(false)}>Keep</button></div>}</div>
    </Sheet>
  )
}

export function YcFinance({ bizId }: { bizId: string }) {
  const { projects, income, expenses } = useData(); const open = useEditor()
  const [ex, setEx] = useState<Expense | 'new' | null>(null); const [inc, setInc] = useState<Income | 'new' | null>(null)
  const P = projects.filter(p => p.business_id === bizId)
  const years = [...new Set([...P.map(p => (p.start_date || '').slice(0, 4)), String(new Date().getFullYear())].filter(Boolean))].sort().reverse()
  const [year, setYear] = useState(years[0])
  const yp = P.filter(p => (p.start_date || '').startsWith(year))
  const received = yp.reduce((a, p) => a + Number(p.paid_amount), 0)
  const I = income.filter(i => i.entry_date.startsWith(year) && (!i.business_id || i.business_id === bizId)).sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  const other = I.filter(i => i.status === 'received').reduce((a, i) => a + Number(i.amount), 0), expect = I.filter(i => i.status === 'expected').reduce((a, i) => a + Number(i.amount), 0)
  const E = expenses.filter(e => e.expense_date.startsWith(year)).sort((a, b) => b.expense_date.localeCompare(a.expense_date))
  const spent = E.reduce((a, e) => a + Number(e.amount), 0)
  const pending = P.filter(p => p.status !== 'dropped' && Number(p.balance_amount) > 0).sort((a, b) => Number(b.balance_amount) - Number(a.balance_amount))
  const pendSum = pending.reduce((a, p) => a + Number(p.balance_amount), 0)
  return (
    <>
      <SubBack title="Finance" sub="Income, expenses and pending payments." />
      <div className="tabrow">{years.map(y => <button key={y} className={year === y ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}</div>
      <div className="kstats four">
        <div><b>{f(received)}</b><span>Project payments received</span></div><div><b>{f(other)}</b><span>Other income</span></div>
        <div><b>{f(spent)}</b><span>Expenses</span></div><div><b>{f(received + other - spent)}</b><span>Net · {year}</span></div>
      </div>
      <p className="groupnote">Project payments count in the year of the project date. Past months stay approximate because the sheets have no payment dates.</p>
      <Group title={`Pending payments · ${f(pendSum)}`} items={pending.slice(0, 30).map(p => <button key={p.id} className="row" onClick={() => open('project', p)}><div className="row-main"><div className="row-title">{p.name}</div><div className="row-sub">{p.invoice_status === 'not_sent' ? 'Invoice not sent' : 'Invoice sent'} · {fmtDate(p.start_date)}</div></div><span className="chip red">{f(Number(p.balance_amount))}</span></button>)} empty="Nothing pending." />
      <Group title={`Other income · ${f(other)}${expect ? ` · expected ${f(expect)}` : ''}`} action={<button className="link" onClick={() => setInc('new')} aria-label="Add income"><Icon name="plus" size={18} /></button>}
        items={I.map(i => <button key={i.id} className="row" onClick={() => setInc(i)}><div className="row-main"><div className="row-title">{i.source}</div><div className="row-sub">{fmtDate(i.entry_date)}{i.status === 'expected' ? ' · expected' : ''}</div></div><span className={`chip ${i.status === 'expected' ? 'amber' : ''}`}>{f(Number(i.amount))}</span></button>)} empty="No other income this year." />
      <Group title={`Expenses · ${f(spent)}`} action={<button className="link" onClick={() => setEx('new')} aria-label="Add expense"><Icon name="plus" size={18} /></button>}
        items={E.map(e => <button key={e.id} className="row" onClick={() => setEx(e)}><div className="row-main"><div className="row-title">{e.category || 'Expense'}{e.vendor ? ` · ${e.vendor}` : ''}</div><div className="row-sub">{fmtDate(e.expense_date)}</div></div><span className="chip">{f(Number(e.amount))}</span></button>)} empty="No expenses recorded. Tap + to add one." />
      {ex && <ExpenseForm item={ex === 'new' ? undefined : ex} bizId={bizId} onClose={() => setEx(null)} />}
      {inc && <IncomeForm item={inc === 'new' ? undefined : inc} onClose={() => setInc(null)} />}
    </>
  )
}
