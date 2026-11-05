import { useState } from 'react'
import { useData } from '../lib/data'
import { FollowUpRow, Group } from '../components/Rows'
import { CalendarView } from '../components/Calendar'
import { useEditor } from '../components/editorContext'
import { Segmented } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { todayISO } from '../lib/dates'

export function FollowUps() {
  const { followUps, businesses } = useData()
  const open = useEditor()
  const today = todayISO()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [biz, setBiz] = useState('all')
  const all = followUps.filter(f => biz === 'all' || f.business_id === biz)
  const openF = all.filter(f => f.status === 'open').sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date))
  const row = (f: typeof all[number]) => <FollowUpRow key={f.id} f={f} />
  const done = all.filter(f => f.status === 'completed').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')).slice(0, 15)
  return (
    <>
      <header className="large"><h1>Follow-ups</h1><div className="toolbar"><button className="iconbtn" onClick={() => open('followup')} aria-label="Add follow-up"><Icon name="plus" /></button></div></header>
      <Segmented value={view} onChange={setView} options={[['list', 'List'], ['calendar', 'Calendar']]} />
      {view === 'calendar' ? <CalendarView kinds={['followup']} /> : (
        <>
          <div className="pills">
            <select className="pill" value={biz} onChange={e => setBiz(e.target.value)}>
              <option value="all">All businesses</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Group title="Overdue" items={openF.filter(f => f.follow_up_date < today).map(row)} />
          <Group title="Due today" items={openF.filter(f => f.follow_up_date === today).map(row)} />
          <Group title="Upcoming" items={openF.filter(f => f.follow_up_date > today).map(row)} />
          {!openF.length && <Group items={[]} empty="No open follow-ups. Add one after your next call or email." />}
          <Group title="Completed" items={done.map(row)} />
        </>
      )}
    </>
  )
}
