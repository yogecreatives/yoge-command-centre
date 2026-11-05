import { Activity, FollowUp, Project, Prospect, Task } from './types'
import { addDays, iso, mondayOf, parse } from './dates'

export type Period = 'day' | 'week' | 'month' | 'year'
export interface Range { start: string; end: string; label: string }

export function rangeFor(period: Period, anchor: string): Range {
  const d = parse(anchor)
  if (period === 'day') return { start: anchor, end: anchor, label: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) }
  if (period === 'week') { const s = mondayOf(anchor), e = addDays(s, 6); return { start: s, end: e, label: `${parse(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${parse(e).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` } }
  if (period === 'month') { const s = iso(new Date(d.getFullYear(), d.getMonth(), 1)), e = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); return { start: s, end: e, label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) } }
  return { start: `${d.getFullYear()}-01-01`, end: `${d.getFullYear()}-12-31`, label: String(d.getFullYear()) }
}
export function shiftAnchor(period: Period, anchor: string, dir: number): string {
  const d = parse(anchor)
  if (period === 'day') return addDays(anchor, dir)
  if (period === 'week') return addDays(anchor, 7 * dir)
  if (period === 'month') { d.setDate(1); d.setMonth(d.getMonth() + dir); return iso(d) }
  d.setFullYear(d.getFullYear() + dir); return iso(d)
}

export interface ReportData { prospects: Prospect[]; activities: Activity[]; projects: Project[]; tasks: Task[]; followUps: FollowUp[] }

/** Every number is counted from real records in the date range. Nothing is estimated or filled in. */
export function buildReport(d: ReportData, r: Range) {
  const inTs = (ts: string | null | undefined) => !!ts && iso(new Date(ts)) >= r.start && iso(new Date(ts)) <= r.end
  const inDate = (s: string | null | undefined) => !!s && s >= r.start && s <= r.end
  const ids = new Set(d.prospects.map(p => p.id))
  const acts = d.activities.filter(a => ids.has(a.prospect_id) && inTs(a.created_at))
  const contacted = new Set(acts.filter(a => a.kind === 'email_sent' || a.kind === 'dm_sent').map(a => a.prospect_id)).size
  const won = new Set(acts.filter(a => a.kind === 'stage_change' && a.note === 'Moved to Won').map(a => a.prospect_id)).size
  const dueTasks = d.tasks.filter(t => inDate(t.due_date))
  return {
    discovered: d.prospects.filter(p => inTs(p.created_at)).length,
    contacted,
    replies: acts.filter(a => a.kind === 'replied').length,
    followUpsCompleted: d.followUps.filter(f => inTs(f.completed_at)).length,
    won,
    projectsCompleted: d.projects.filter(p => inTs(p.completed_at)).length,
    revenue: d.projects.filter(p => inDate(p.start_date)).reduce((a, p) => a + Number(p.paid_amount), 0),
    conversion: contacted > 0 ? Math.round((won / contacted) * 100) : null,
    tasksCompleted: d.tasks.filter(t => inTs(t.completed_at)).length,
    taskRate: dueTasks.length ? Math.round((dueTasks.filter(t => t.status === 'completed').length / dueTasks.length) * 100) : null,
  }
}
