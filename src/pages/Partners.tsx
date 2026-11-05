import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { Segmented } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { REFERRER_TYPE } from '../lib/labels'

export function Partners() {
  const { projects, referrers } = useData()
  const open = useEditor()
  const years = [...new Set(projects.map(p => (p.start_date || '').slice(0, 4)).filter(Boolean))].sort().reverse()
  const [year, setYear] = useState('all'); const [by, setBy] = useState<'n' | 'rev'>('n')
  const rows = useMemo(() => {
    const scoped = projects.filter(p => year === 'all' || (p.start_date || '').startsWith(year))
    const mk = (key: string | null) => {
      const mine = scoped.filter(p => p.referrer_id === key); const all = projects.filter(p => p.referrer_id === key)
      const rev = mine.reduce((a, p) => a + Number(p.total_amount), 0)
      return { key, n: mine.length, rev, avg: mine.length ? rev / mine.length : 0, unpaid: mine.reduce((a, p) => a + (p.status === 'dropped' ? 0 : Number(p.balance_amount)), 0), allTime: all.length }
    }
    const l = referrers.map(r => ({ ...mk(r.id), r })); const none = mk(null)
    const sorted = l.filter(x => x.n > 0 || year === 'all').sort((a, b) => (by === 'n' ? b.n - a.n || b.rev - a.rev : b.rev - a.rev))
    return { sorted, none }
  }, [projects, referrers, year, by])
  const max = Math.max(1, ...rows.sorted.map(x => (by === 'n' ? x.n : x.rev)), by === 'n' ? rows.none.n : rows.none.rev)
  const bar = (v: number) => `${Math.max(2, (v / max) * 100)}%`
  return (
    <>
      <header className="large"><div><p className="date">Who sends you projects</p><h1>Partners</h1></div><div className="toolbar"><button className="iconbtn" onClick={() => open('referrer')} aria-label="Add referrer"><Icon name="plus" /></button></div></header>
      <Segmented value={year} onChange={setYear} options={[['all', 'All years'], ...years.map(y => [y, y] as [string, string])]} />
      <Segmented value={by} onChange={setBy} options={[['n', 'By projects'], ['rev', 'By revenue']]} />
      <div className="group">
        {rows.sorted.map(x => (
          <button key={x.key} className="row col" onClick={() => open('referrer', x.r)}>
            <div className="rt"><div className="row-title">{x.r.name}<small className="tag">{REFERRER_TYPE[x.r.type]}</small></div><div className="v">{x.n} project{x.n === 1 ? '' : 's'}</div></div>
            <div className="bar"><i style={{ width: bar(by === 'n' ? x.n : x.rev) }} /></div>
            <div className="m"><span>Revenue <b>{x.rev.toLocaleString()}</b></span><span>Avg <b>{Math.round(x.avg).toLocaleString()}</b></span>{year !== 'all' && <span>All time <b>{x.allTime}</b></span>}{x.unpaid > 0 && <span className="warn">Unpaid <b>{x.unpaid.toLocaleString()}</b></span>}</div>
          </button>))}
        {rows.none.n > 0 && (
          <div className="row col"><div className="rt"><div className="row-title">Not set</div><div className="v">{rows.none.n} projects</div></div>
            <div className="bar"><i style={{ width: bar(by === 'n' ? rows.none.n : rows.none.rev), background: '#d9a441' }} /></div>
            <div className="m"><span>Revenue <b>{rows.none.rev.toLocaleString()}</b></span>{rows.none.unpaid > 0 && <span className="warn">Unpaid <b>{rows.none.unpaid.toLocaleString()}</b></span>}<span>Open the project and pick a referrer</span></div></div>)}
        {!rows.sorted.length && !rows.none.n && <div className="empty">No referrers yet. Add one with + or while filling in a project.</div>}
      </div>
    </>
  )
}
