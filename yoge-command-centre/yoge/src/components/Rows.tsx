import { ReactNode } from 'react'
import { useData } from '../lib/data'
import { useEditor } from './Editors'
import { Icon } from '../ui/Icon'
import { dueLabel, fmtStamp, todayISO } from '../lib/dates'
import { followUpState, taskState } from '../lib/logic'
import { PROJECT_STATUS } from '../lib/labels'
import { FollowUp, Idea, Project, Task } from '../lib/types'

export function Group({ title, items, empty, action }: { title?: string; items: ReactNode[]; empty?: string; action?: ReactNode }) {
  if (!items.length && !empty) return null
  return (
    <section className="section">
      {title && <div className="section-title"><span>{title}</span>{action}</div>}
      <div className="group">{items.length ? items : <div className="empty">{empty}</div>}</div>
    </section>
  )
}

export function TaskRow({ t, showBusiness = true }: { t: Task; showBusiness?: boolean }) {
  const { toggleTask, bizById } = useData()
  const open = useEditor()
  const today = todayISO()
  const st = taskState(t, today)
  const done = t.status === 'completed'
  return (
    <div className={`row ${done ? 'done' : ''}`}>
      <button className={`check ${done ? 'on' : ''} p-${t.priority}`} aria-label={done ? 'Reopen task' : 'Mark task done'} onClick={() => toggleTask(t)}>{done && <Icon name="check" size={14} />}</button>
      <button className="row-main" onClick={() => open('task', t)}>
        <div className="row-title">{t.title}</div>
        <div className="row-sub">
          {[showBusiness && bizById(t.business_id)?.name, t.category, t.status === 'in_progress' && 'In progress', t.priority !== 'normal' && (t.priority === 'urgent' ? 'Urgent' : 'High')].filter(Boolean).join(' · ') || 'Task'}
        </div>
      </button>
      {done
        ? <span className="chip">{fmtStamp(t.completed_at)}</span>
        : t.due_date && <span className={`chip ${st === 'overdue' ? 'red' : st === 'today' ? 'amber' : ''}`}>{dueLabel(t.due_date, today)}</span>}
    </div>
  )
}

export function FollowUpRow({ f, showBusiness = true }: { f: FollowUp; showBusiness?: boolean }) {
  const { completeFollowUp, reopenFollowUp, bizById } = useData()
  const open = useEditor()
  const today = todayISO()
  const st = followUpState(f, today)
  const done = st === 'completed'
  return (
    <div className={`row ${done ? 'done' : ''}`}>
      <button className={`check ${done ? 'on' : ''}`} aria-label={done ? 'Reopen follow-up' : 'Mark follow-up done'} onClick={() => (done ? reopenFollowUp(f) : completeFollowUp(f))}>{done && <Icon name="check" size={14} />}</button>
      <button className="row-main" onClick={() => open('followup', f)}>
        <div className="row-title">{f.person_name}{f.company ? ` · ${f.company}` : ''}</div>
        <div className="row-sub">{[showBusiness && bizById(f.business_id)?.name, f.notes].filter(Boolean).join(' · ') || 'Follow-up'}</div>
      </button>
      {done ? <span className="chip">{fmtStamp(f.completed_at)}</span> : <span className={`chip ${st === 'overdue' ? 'red' : st === 'due' ? 'amber' : ''}`}>{dueLabel(f.follow_up_date, today)}</span>}
    </div>
  )
}

export function ProjectRow({ p, showBusiness = true }: { p: Project; showBusiness?: boolean }) {
  const { tasks, bizById } = useData()
  const open = useEditor()
  const rel = tasks.filter(t => t.project_id === p.id)
  const done = rel.filter(t => t.status === 'completed').length
  const today = todayISO()
  const late = p.status !== 'completed' && p.due_date && p.due_date < today
  return (
    <button className="row" onClick={() => open('project', p)}>
      <div className="row-main">
        <div className="row-title">{p.name}</div>
        <div className="row-sub">{[showBusiness && bizById(p.business_id)?.name, p.client_name, PROJECT_STATUS[p.status], rel.length ? `${done}/${rel.length} tasks` : ''].filter(Boolean).join(' · ')}</div>
        {rel.length > 0 && <div className="bar"><i style={{ width: `${(done / rel.length) * 100}%` }} /></div>}
      </div>
      {p.status === 'completed' ? <span className="chip">{fmtStamp(p.completed_at)}</span> : p.due_date && <span className={`chip ${late ? 'red' : ''}`}>{dueLabel(p.due_date, today)}</span>}
    </button>
  )
}

export function IdeaRow({ i }: { i: Idea }) {
  const { bizById } = useData()
  const open = useEditor()
  return (
    <button className="row" onClick={() => open('idea', i)}>
      <div className="row-main">
        <div className="row-title">{i.title}</div>
        <div className="row-sub">{[bizById(i.business_id)?.name, i.category, `Saved ${fmtStamp(i.created_at)}`].filter(Boolean).join(' · ')}</div>
      </div>
      {i.status !== 'new' && <span className="chip">{i.status === 'exploring' ? 'Exploring' : i.status === 'converted' ? 'Converted' : 'Archived'}</span>}
    </button>
  )
}
