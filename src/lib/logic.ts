import { FollowUp, Project, Task } from './types'
import { addDays } from './dates'

export type DueState = 'overdue' | 'today' | 'upcoming' | 'none' | 'done'

export function taskState(t: Task, today: string): DueState {
  if (t.status === 'completed') return 'done'
  if (!t.due_date) return 'none'
  if (t.due_date < today) return 'overdue'
  if (t.due_date === today) return 'today'
  return 'upcoming'
}
export function followUpState(f: FollowUp, today: string): 'overdue' | 'due' | 'upcoming' | 'completed' {
  if (f.status === 'completed') return 'completed'
  if (f.follow_up_date < today) return 'overdue'
  if (f.follow_up_date === today) return 'due'
  return 'upcoming'
}

// One definition of every dashboard number, used by the overview and each business workspace.
export function summarize(tasks: Task[], followUps: FollowUp[], projects: Project[], today: string) {
  const horizon = addDays(today, 7)
  const openTasks = tasks.filter(t => t.status !== 'completed')
  return {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    followUpsDue: followUps.filter(f => f.status === 'open' && f.follow_up_date <= today).length,
    overdue: openTasks.filter(t => t.due_date && t.due_date < today).length,
    upcoming:
      openTasks.filter(t => t.due_date && t.due_date >= today && t.due_date <= horizon).length +
      projects.filter(p => p.status !== 'completed' && p.due_date && p.due_date >= today && p.due_date <= horizon).length,
  }
}

const prioRank = { urgent: 0, high: 1, normal: 2 } as const
export const byDue = (a: Task, b: Task) =>
  (a.due_date || '9999').localeCompare(b.due_date || '9999') || prioRank[a.priority] - prioRank[b.priority]
