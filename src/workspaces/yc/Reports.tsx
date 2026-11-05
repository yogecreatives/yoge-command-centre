import { useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { SubBack } from './More'
import { Icon } from '../../ui/Icon'
import { buildReport, Period, rangeFor, shiftAnchor } from '../../lib/reports'
import { todayISO } from '../../lib/dates'

export function YcReports({ bizId, slug = 'yogecreatives' }: { bizId: string; slug?: string }) {
  const { prospects, activities, projects, tasks, followUps } = useData()
  const [period, setPeriod] = useState<Period>('week'); const [anchor, setAnchor] = useState(todayISO())
  const r = rangeFor(period, anchor)
  const x = useMemo(() => buildReport({ prospects: prospects.filter(p => p.business_id === bizId), activities, projects: projects.filter(p => p.business_id === bizId), tasks: tasks.filter(t => t.business_id === bizId), followUps: followUps.filter(f => f.business_id === bizId) }, r),
    [prospects, activities, projects, tasks, followUps, bizId, r.start, r.end])
  const pct = (n: number | null) => (n === null ? '—' : n + '%')
  const rows: [string, string | number, string?][] = [
    ['Leads discovered', x.discovered], ['Leads contacted', x.contacted], ['Replies received', x.replies], ['Follow-ups completed', x.followUpsCompleted],
    ['Projects won', x.won], ['Projects completed', x.projectsCompleted], ['Revenue (paid, by project date)', Math.round(x.revenue).toLocaleString()],
    ['Conversion (won ÷ contacted)', pct(x.conversion)], ['Tasks completed', x.tasksCompleted], ['Task completion (due in period)', pct(x.taskRate)],
  ]
  const labels: [Period, string][] = [['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']]
  return (
    <>
      <SubBack title="Reports" sub="Counted from your real records." slug={slug} />
      <div className="tabrow">{labels.map(([k, l]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => { setPeriod(k); setAnchor(todayISO()) }}>{l}</button>)}</div>
      <div className="calhead"><button className="iconbtn" onClick={() => setAnchor(shiftAnchor(period, anchor, -1))} aria-label="Previous"><Icon name="back" size={20} /></button><strong>{r.label}</strong>
        <button className="iconbtn flip" onClick={() => setAnchor(shiftAnchor(period, anchor, 1))} aria-label="Next"><Icon name="back" size={20} /></button></div>
      <div className="group">{rows.map(([l, v]) => <div key={l} className="row"><div className="row-main"><div className="row-title" style={{ fontSize: 15 }}>{l}</div></div><b style={{ fontSize: 20, fontWeight: 300, letterSpacing: '-.03em' }}>{v}</b></div>)}</div>
      <p className="groupnote">A dash means there is nothing to divide by yet. Outreach counts start from the day you begin logging emails and DMs in Pipeline.</p>
    </>
  )
}
