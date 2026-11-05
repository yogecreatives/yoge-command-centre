import { Project, StarterTask, Task } from './types'
import { addDays, todayISO } from './dates'

export const parseStarter = (text: string): StarterTask[] =>
  text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [title, d] = l.split('|').map(x => x.trim())
    return { title, days: Math.max(0, parseInt(d || '0', 10) || 0) }
  }).filter(t => t.title)
export const starterText = (t: StarterTask[]) => t.map(x => `${x.title} | ${x.days}`).join('\n')

/** Rows to insert for a project's starter checklist, skipping titles that already exist for it. */
export function starterRows(project: Project, template: StarterTask[], existing: Task[]) {
  const have = new Set(existing.filter(t => t.project_id === project.id).map(t => t.title.toLowerCase()))
  const base = project.start_date && project.start_date > todayISO() ? project.start_date : todayISO()
  return template.filter(t => !have.has(t.title.toLowerCase())).map(t => ({
    title: t.title, business_id: project.business_id, project_id: project.id, task_type: 'project_task',
    priority: 'normal', status: 'pending', due_date: addDays(base, t.days), category: 'Client projects',
  }))
}

/** Money follow-through: a finished project with an unsent invoice or open balance gets the matching task. */
export function moneyRows(project: Project, existing: Task[]) {
  if (project.status !== 'completed') return []
  const open = (title: string) => existing.some(t => t.project_id === project.id && t.title.toLowerCase() === title.toLowerCase() && t.status !== 'completed')
  const rows: Record<string, unknown>[] = []
  const mk = (title: string) => ({ title, business_id: project.business_id, project_id: project.id, task_type: 'administration', priority: 'high', status: 'pending', due_date: todayISO(), category: 'Payments' })
  if (project.invoice_status === 'not_sent' && Number(project.total_amount) > 0 && !open('Send invoice')) rows.push(mk('Send invoice'))
  if (project.invoice_status !== 'paid' && Number(project.balance_amount) > 0 && project.invoice_status === 'sent' && !open('Collect balance')) rows.push(mk('Collect balance'))
  return rows
}
