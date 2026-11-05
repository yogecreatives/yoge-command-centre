import { ReactNode, useCallback, useState } from 'react'
import { useRoute } from '../lib/route'
import { EditorCtx, EditorKind, useEditor } from './editorContext'
import { ProspectSheet } from './ProspectSheet'
import { RepliedSheet } from './RepliedSheet'
import { LeadSheet } from './LeadSheet'
import { ReferrerForm, ReferrerPicker } from './Referrers'
import { Segmented, Sheet } from '../ui/Sheet'
import { useData } from '../lib/data'
import { useToast } from '../ui/toast'
import { CATEGORIES, IDEA_STATUS, INVOICE, PRIORITY, PROJECT_STATUS, STATUS, TASK_TYPE } from '../lib/labels'
import { moneyRows, starterRows } from '../lib/projectTasks'
import { addDays, fmtStamp, todayISO } from '../lib/dates'
import { FollowUp, Idea, InvoiceStatus, Priority, Project, ProjectStatus, Status, Task, TaskType } from '../lib/types'

export { useEditor }
export type { EditorKind }
interface Open { kind: EditorKind; item?: any; defaults?: Record<string, any> }

export function EditorProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<Open | null>(null)
  const route = useRoute()
  const { bizBySlug } = useData()
  const parts = route.split('?')[0].split('/').filter(Boolean)
  const workspaceSlug = parts[0] === 'w' ? parts[1] : undefined
  const workspaceBusiness = workspaceSlug ? bizBySlug(workspaceSlug) : undefined
  const open = useCallback((kind: EditorKind, item?: any, defaults?: Record<string, any>) => {
    const scopedDefaults = workspaceBusiness
      ? { ...defaults, business_id: defaults?.business_id ?? workspaceBusiness.id, lockedBusinessId: workspaceBusiness.id }
      : defaults
    setCur({ kind, item, defaults: scopedDefaults })
  }, [workspaceBusiness])
  const close = useCallback(() => setCur(null), [])
  return (
    <EditorCtx.Provider value={open}>
      {children}
      {cur?.kind === 'new' && <NewMenu onClose={close} defaults={cur.defaults} onPick={k => setCur({ kind: k, defaults: cur.defaults })} />}
      {cur?.kind === 'task' && <TaskForm key={cur.item?.id ?? 'new'} item={cur.item} defaults={cur.defaults} onClose={close} />}
      {cur?.kind === 'followup' && <FollowUpForm key={cur.item?.id ?? 'new'} item={cur.item} defaults={cur.defaults} onClose={close} />}
      {cur?.kind === 'project' && <ProjectForm key={cur.item?.id ?? 'new'} item={cur.item} defaults={cur.defaults} onClose={close} />}
      {cur?.kind === 'prospect' && <ProspectSheet key={cur.item?.id ?? 'new'} item={cur.item} defaults={cur.defaults} onClose={close} />}
      {cur?.kind === 'lead' && <LeadSheet key={cur.item?.id ?? 'new'} item={cur.item} defaults={cur.defaults} onClose={close} />}
      {cur?.kind === 'referrer' && <ReferrerForm key={cur.item?.id ?? 'new'} item={cur.item} onClose={close} />}
      {cur?.kind === 'replied' && <RepliedSheet item={cur.item} onClose={close} />}
      {cur?.kind === 'idea' && <IdeaForm key={cur.item?.id ?? 'new'} item={cur.item} defaults={cur.defaults} onClose={close} />}
    </EditorCtx.Provider>
  )
}

function NewMenu({ onClose, onPick }: { onClose: () => void; onPick: (k: EditorKind) => void; defaults?: any }) {
  const items: [EditorKind, string, string][] = [
    ['task', 'Task', 'Something to do'], ['followup', 'Follow-up', 'Someone to contact'],
    ['project', 'Project', 'Client work, payment and referrer'], ['lead', 'Lead', 'Yogecreatives sales pipeline'], ['prospect', 'Agency prospect', 'White Label outreach'], ['idea', 'Idea', 'Capture it, sort it later'],
  ]
  return (
    <Sheet title="New" onClose={onClose}>
      <div className="group">
        {items.map(([k, t, s]) => (
          <button key={k} className="row" onClick={() => onPick(k)}>
            <div className="row-main"><div className="row-title">{t}</div><div className="row-sub">{s}</div></div>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function F({ label, children }: { label: string; children: ReactNode }) {
  return <label className="fld"><span>{label}</span>{children}</label>
}
function BusinessSelect({ value, onChange, allowNone }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) {
  const { businesses } = useData()
  return (
    <select className="input" value={value} onChange={e => onChange(e.target.value)}>
      {allowNone && <option value="">None</option>}
      {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  )
}
const nz = (s: string) => (s.trim() ? s.trim() : null)

function SaveBar({ onSave, saving, onDelete, label = 'Save', children }: { onSave: () => void; saving: boolean; onDelete?: () => void; label?: string; children?: ReactNode }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="savebar">
      {children}
      <button className="btn primary block" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : label}</button>
      {onDelete && !confirm && <button className="btn danger block" onClick={() => setConfirm(true)}>Delete</button>}
      {onDelete && confirm && (
        <div className="confirm">
          <span>Delete this permanently?</span>
          <button className="btn danger" onClick={onDelete}>Delete</button>
          <button className="btn" onClick={() => setConfirm(false)}>Keep</button>
        </div>
      )}
    </div>
  )
}

function TaskForm({ item, defaults, onClose }: { item?: Task; defaults?: any; onClose: () => void }) {
  const { businesses, projects, bizById, create, update, remove } = useData()
  const toast = useToast()
  const [f, setF] = useState({
    title: item?.title ?? defaults?.title ?? '', business_id: item?.business_id ?? defaults?.business_id ?? businesses[0]?.id ?? '',
    category: item?.category ?? '', task_type: (item?.task_type ?? defaults?.task_type ?? 'general') as TaskType,
    priority: (item?.priority ?? 'normal') as Priority, status: (item?.status ?? 'pending') as Status,
    due_date: item?.due_date ?? defaults?.due_date ?? '', notes: item?.notes ?? defaults?.notes ?? '', project_id: item?.project_id ?? defaults?.project_id ?? '',
  })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setF(s => ({ ...s, [k]: v }))
  const slug = bizById(f.business_id)?.slug ?? ''
  const projOpts = projects.filter(p => p.business_id === f.business_id && p.status !== 'completed')
  const save = async () => {
    if (!f.title.trim()) return setErr('Give the task a name.')
    setSaving(true)
    const row = {
      title: f.title.trim(), business_id: f.business_id, category: nz(f.category), task_type: f.task_type, priority: f.priority, status: f.status,
      due_date: f.due_date || null, notes: nz(f.notes), project_id: f.project_id || null,
      completed_at: f.status === 'completed' ? (item?.completed_at ?? new Date().toISOString()) : null,
    }
    const res = item ? await update('tasks', item.id, row) : await create('tasks', row)
    setSaving(false)
    if (res) { toast(item ? 'Task saved' : 'Task added'); defaults?.afterSave?.(res); onClose() }
  }
  return (
    <Sheet title={item ? 'Edit task' : 'New task'} onClose={onClose}>
      <F label="Task"><input className="input" autoFocus={!item} value={f.title} onChange={e => set('title', e.target.value)} placeholder="What needs doing?" /></F>
      {!defaults?.lockedBusinessId && <F label="Business"><BusinessSelect value={f.business_id} onChange={v => { set('business_id', v); set('project_id', '') }} /></F>}
      <div className="two">
        <F label="Due date"><input className="input" type="date" value={f.due_date} onChange={e => set('due_date', e.target.value)} /></F>
        <F label="Type"><select className="input" value={f.task_type} onChange={e => set('task_type', e.target.value)}>{Object.entries(TASK_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
      </div>
      <F label="Priority"><Segmented value={f.priority} options={Object.entries(PRIORITY) as [Priority, string][]} onChange={v => set('priority', v)} /></F>
      <F label="Status"><Segmented value={f.status} options={Object.entries(STATUS) as [Status, string][]} onChange={v => set('status', v)} /></F>
      <F label="Category">
        <input className="input" list="cats" value={f.category} onChange={e => set('category', e.target.value)} placeholder={slug === 'other' ? 'Your own category' : 'Optional'} />
        <datalist id="cats">{(CATEGORIES[slug] ?? []).map(c => <option key={c} value={c} />)}</datalist>
      </F>
      {projOpts.length > 0 && <F label="Project"><select className="input" value={f.project_id} onChange={e => set('project_id', e.target.value)}><option value="">None</option>{projOpts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>}
      <F label="Notes"><textarea className="input" rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} /></F>
      {item && <p className="meta">Created {fmtStamp(item.created_at)} · Updated {fmtStamp(item.updated_at)}{item.completed_at ? ` · Completed ${fmtStamp(item.completed_at)}` : ''}</p>}
      {err && <p className="err">{err}</p>}
      <SaveBar onSave={save} saving={saving} onDelete={item ? async () => { if (await remove('tasks', item.id)) { toast('Task deleted'); onClose() } } : undefined} />
    </Sheet>
  )
}

function FollowUpForm({ item, defaults, onClose }: { item?: FollowUp; defaults?: any; onClose: () => void }) {
  const { businesses, create, update, remove, completeFollowUp, rescheduleFollowUp, reopenFollowUp } = useData()
  const toast = useToast()
  const [f, setF] = useState({
    person_name: item?.person_name ?? defaults?.person_name ?? '', company: item?.company ?? '', email: item?.email ?? '', phone: item?.phone ?? '',
    business_id: item?.business_id ?? defaults?.business_id ?? businesses[0]?.id ?? '', follow_up_date: item?.follow_up_date ?? defaults?.follow_up_date ?? todayISO(),
    notes: item?.notes ?? defaults?.notes ?? '',
  })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setF(s => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.person_name.trim()) return setErr('Add the person’s name.')
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('That email address does not look right.')
    if (!f.follow_up_date) return setErr('Pick a follow-up date.')
    setSaving(true)
    const row = { person_name: f.person_name.trim(), company: nz(f.company), email: nz(f.email), phone: nz(f.phone), business_id: f.business_id, follow_up_date: f.follow_up_date, notes: nz(f.notes) }
    const res = item ? await update('follow_ups', item.id, row) : await create('follow_ups', row)
    setSaving(false)
    if (res) { toast(item ? 'Follow-up saved' : 'Follow-up added'); onClose() }
  }
  const next = async (days: number) => { if (!item) return; await rescheduleFollowUp(item, addDays(todayISO(), days)); toast('Follow-up rescheduled'); onClose() }
  return (
    <Sheet title={item ? 'Edit follow-up' : 'New follow-up'} onClose={onClose}>
      <F label="Person"><input className="input" autoFocus={!item} value={f.person_name} onChange={e => set('person_name', e.target.value)} /></F>
      <F label="Company"><input className="input" value={f.company} onChange={e => set('company', e.target.value)} /></F>
      <div className="two">
        <F label="Email"><input className="input" type="email" inputMode="email" value={f.email} onChange={e => set('email', e.target.value)} /></F>
        <F label="Phone"><input className="input" type="tel" inputMode="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></F>
      </div>
      {!defaults?.lockedBusinessId && <F label="Business"><BusinessSelect value={f.business_id} onChange={v => set('business_id', v)} /></F>}
      <F label="Follow-up date"><input className="input" type="date" value={f.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} /></F>
      <F label="Notes"><textarea className="input" rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} /></F>
      {item && item.status === 'open' && (
        <div className="quick">
          <span className="meta">Next follow-up</span>
          <button className="chip-btn" onClick={() => next(2)}>2 days</button>
          <button className="chip-btn" onClick={() => next(7)}>1 week</button>
          <button className="chip-btn" onClick={() => next(14)}>2 weeks</button>
          <button className="chip-btn" onClick={() => next(30)}>1 month</button>
        </div>
      )}
      {item && <p className="meta">{item.status === 'completed' ? `Completed ${fmtStamp(item.completed_at)}` : `Created ${fmtStamp(item.created_at)}`}</p>}
      {err && <p className="err">{err}</p>}
      <SaveBar onSave={save} saving={saving} onDelete={item ? async () => { if (await remove('follow_ups', item.id)) { toast('Follow-up deleted'); onClose() } } : undefined}>
        {item && item.status === 'open' && <button className="btn block" onClick={async () => { await completeFollowUp(item); toast('Follow-up completed'); onClose() }}>Mark as done</button>}
        {item && item.status === 'completed' && <button className="btn block" onClick={async () => { await reopenFollowUp(item); toast('Follow-up reopened'); onClose() }}>Reopen</button>}
      </SaveBar>
    </Sheet>
  )
}

function ProjectForm({ item, defaults, onClose }: { item?: Project; defaults?: any; onClose: () => void }) {
  const { businesses, tasks, settings, create, createMany, update, remove } = useData()
  const open = useEditor()
  const toast = useToast()
  const home = businesses.find(b => b.slug === 'yogecreatives') ?? businesses[0]
  const [f, setF] = useState({
    name: item?.name ?? defaults?.name ?? '', client_name: item?.client_name ?? defaults?.client_name ?? '', client_email: item?.client_email ?? defaults?.client_email ?? '', client_phone: item?.client_phone ?? defaults?.client_phone ?? '', description: item?.description ?? defaults?.description ?? '',
    business_id: item?.business_id ?? defaults?.business_id ?? home?.id ?? '', start_date: item?.start_date ?? todayISO(), due_date: item?.due_date ?? '',
    status: (item?.status ?? 'in_progress') as ProjectStatus, priority: (item?.priority ?? 'normal') as Priority, notes: item?.notes ?? '',
    total: item ? String(item.total_amount ?? 0) : '', paid: item ? String(item.paid_amount ?? 0) : '', referrer_id: item?.referrer_id ?? '',
    invoice_status: (item?.invoice_status ?? 'not_sent') as InvoiceStatus, starter: true,
  })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setF(s => ({ ...s, [k]: v }))
  const total = Number(f.total) || 0, paid = Number(f.paid) || 0, balance = total - paid
  const related = item ? tasks.filter(t => t.project_id === item.id) : []
  const template = settings?.project_task_template ?? []
  const save = async () => {
    if (!f.name.trim()) return setErr('Give the project a name.')
    if (f.total && (isNaN(Number(f.total)) || total < 0)) return setErr('Total must be a number.')
    if (f.paid && (isNaN(Number(f.paid)) || paid < 0)) return setErr('Paid must be a number.')
    if (paid > total) return setErr('Paid is more than the total.')
    if (f.start_date && f.due_date && f.due_date < f.start_date) return setErr('The due date is before the start date.')
    setSaving(true)
    const invoice_status: InvoiceStatus = total > 0 && paid >= total ? 'paid' : f.invoice_status === 'paid' ? 'sent' : f.invoice_status
    const row = {
      name: f.name.trim(), client_name: nz(f.client_name), client_email: nz(f.client_email), client_phone: nz(f.client_phone), description: nz(f.description), business_id: f.business_id,
      start_date: f.start_date || null, due_date: f.due_date || null, status: f.status, priority: f.priority, notes: nz(f.notes),
      total_amount: total, paid_amount: paid, referrer_id: f.referrer_id || null, invoice_status,
      completed_at: f.status === 'completed' ? (item?.completed_at ?? new Date().toISOString()) : null,
    }
    const res: Project | null = item ? await update('projects', item.id, row) : await create('projects', row)
    if (res) {
      let added = 0
      if (!item && f.starter && template.length) added += await createMany('tasks', starterRows(res, template, tasks))
      const money = moneyRows(res, tasks)
      if (money.length) added += await createMany('tasks', money)
      toast(`${item ? 'Project saved' : 'Project added'}${added ? ` · ${added} task${added > 1 ? 's' : ''} created` : ''}`)
      defaults?.afterSave?.(res); onClose()
    }
    setSaving(false)
  }
  return (
    <Sheet title={item ? 'Edit project' : 'New project'} onClose={onClose}>
      <F label="Project"><input className="input" autoFocus={!item} value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. HARRY_DENTAL CLINIC" /></F>
      <div className="two">
        {!defaults?.lockedBusinessId && <F label="Business"><BusinessSelect value={f.business_id} onChange={v => set('business_id', v)} /></F>}
        <F label="Date"><input className="input" type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)} /></F>
      </div>
      <F label="Status"><select className="input" value={f.status} onChange={e => set('status', e.target.value)}>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
      <div className="three">
        <F label="Total"><input className="input" inputMode="decimal" value={f.total} onChange={e => set('total', e.target.value)} placeholder="0" /></F>
        <F label="Paid"><input className="input" inputMode="decimal" value={f.paid} onChange={e => set('paid', e.target.value)} placeholder="0" /></F>
        <F label="Balance"><div className={`input bal ${balance > 0 ? 'owed' : ''}`}>{balance.toLocaleString()}</div></F>
      </div>
      <div className="two">
        <F label="Referred by"><ReferrerPicker value={f.referrer_id} onChange={v => set('referrer_id', v)} /></F>
        <F label="Invoice"><select className="input" value={f.invoice_status} onChange={e => set('invoice_status', e.target.value)}>{Object.entries(INVOICE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
      </div>
      <div className="two">
        <F label="Client"><input className="input" value={f.client_name} onChange={e => set('client_name', e.target.value)} /></F>
        <F label="Client phone"><input className="input" type="tel" value={f.client_phone} onChange={e => set('client_phone', e.target.value)} /></F>
      </div>
      <div className="two">
        <F label="Client email"><input className="input" type="email" value={f.client_email} onChange={e => set('client_email', e.target.value)} /></F>
        <F label="Deadline"><input className="input" type="date" value={f.due_date} onChange={e => set('due_date', e.target.value)} /></F>
      </div>
      <F label="Remarks"><textarea className="input" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></F>
      {!item && template.length > 0 && (
        <label className="row switch grp"><div className="row-main"><div className="row-title">Create starter tasks</div><div className="row-sub">{template.length} tasks with due dates, linked to this project</div></div>
          <input type="checkbox" checked={f.starter} onChange={e => set('starter', e.target.checked)} /></label>
      )}
      {item && (
        <div className="group">
          <div className="grouphead">Related tasks · {related.filter(t => t.status === 'completed').length}/{related.length} done</div>
          {related.map(t => <button key={t.id} className="row" onClick={() => open('task', t)}><div className="row-main"><div className="row-title">{t.title}</div><div className="row-sub">{STATUS[t.status]}</div></div></button>)}
          <button className="row accent" onClick={() => open('task', undefined, { business_id: item.business_id, project_id: item.id, task_type: 'project_task' })}>Add task to this project</button>
        </div>
      )}
      {err && <p className="err">{err}</p>}
      <SaveBar onSave={save} saving={saving} onDelete={item ? async () => { if (await remove('projects', item.id)) { toast('Project deleted. Its tasks were kept.'); onClose() } } : undefined} />
    </Sheet>
  )
}

function IdeaForm({ item, defaults, onClose }: { item?: Idea; defaults?: any; onClose: () => void }) {
  const { create, update, remove, businesses } = useData()
  const open = useEditor()
  const toast = useToast()
  const [f, setF] = useState({ title: item?.title ?? defaults?.title ?? '', description: item?.description ?? '', business_id: item?.business_id ?? defaults?.business_id ?? '', category: item?.category ?? '', status: (item?.status ?? 'new') as Idea['status'] })
  const [err, setErr] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setF(s => ({ ...s, [k]: v }))
  const row = () => ({ title: f.title.trim(), description: nz(f.description), business_id: f.business_id || null, category: nz(f.category), status: f.status })
  const save = async () => {
    if (!f.title.trim()) return setErr('Write the idea first.')
    setSaving(true)
    const res = item ? await update('ideas', item.id, row()) : await create('ideas', row())
    setSaving(false)
    if (res) { toast(item ? 'Idea saved' : 'Idea saved'); onClose() }
  }
  // Converting opens the task/project form pre-filled; the idea is marked converted only once that is saved.
  const convert = (kind: 'task' | 'project') => {
    if (!item) return
    const base = { business_id: f.business_id || businesses[0]?.id, afterSave: () => update('ideas', item.id, { status: 'converted' }) }
    onClose()
    open(kind, undefined, kind === 'task' ? { ...base, title: item.title, notes: item.description } : { ...base, name: item.title, description: item.description })
  }
  return (
    <Sheet title={item ? 'Edit idea' : 'New idea'} onClose={onClose}>
      <F label="Idea"><input className="input" autoFocus={!item} value={f.title} onChange={e => set('title', e.target.value)} /></F>
      <F label="Description"><textarea className="input" rows={3} value={f.description} onChange={e => set('description', e.target.value)} /></F>
      <div className="two">
        <F label="Business"><BusinessSelect value={f.business_id} onChange={v => set('business_id', v)} allowNone /></F>
        <F label="Category"><input className="input" value={f.category} onChange={e => set('category', e.target.value)} /></F>
      </div>
      <F label="Status"><Segmented value={f.status} options={Object.entries(IDEA_STATUS) as [Idea['status'], string][]} onChange={v => set('status', v)} /></F>
      {err && <p className="err">{err}</p>}
      <SaveBar onSave={save} saving={saving} onDelete={item ? async () => { if (await remove('ideas', item.id)) { toast('Idea deleted'); onClose() } } : undefined}>
        {item && item.status !== 'converted' && (
          <div className="two">
            <button className="btn block" onClick={() => convert('task')}>Make a task</button>
            <button className="btn block" onClick={() => convert('project')}>Make a project</button>
          </div>
        )}
      </SaveBar>
    </Sheet>
  )
}
