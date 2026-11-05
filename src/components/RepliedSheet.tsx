import { useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { useData } from '../lib/data'
import { useToast } from '../ui/toast'
import { usePipelineActions } from '../lib/usePipeline'
import { addDays, todayISO } from '../lib/dates'
import { SNOOZE_DAYS } from '../lib/pipeline'
import { Prospect } from '../lib/types'

type Out = 'interested' | 'call' | 'not_now' | 'no'
export function RepliedSheet({ item, onClose }: { item: Prospect; onClose: () => void }) {
  const { prospects } = useData()
  const { setStage } = usePipelineActions()
  const toast = useToast()
  const p = prospects.find(x => x.id === item.id) ?? item
  const [out, setOut] = useState<Out>('interested')
  const [date, setDate] = useState(addDays(todayISO(), 2))
  const pick = (o: Out) => { setOut(o); setDate(o === 'call' ? addDays(todayISO(), 3) : o === 'not_now' ? addDays(todayISO(), SNOOZE_DAYS) : addDays(todayISO(), 2)) }
  const save = async () => {
    const res = out === 'interested' ? await setStage(p, 'replied', { next_action_date: date, snooze_until: null }, 'Replied: interested')
      : out === 'call' ? await setStage(p, 'call_booked', { next_action_date: date, snooze_until: null }, 'Replied: call booked')
      : out === 'not_now' ? await setStage(p, 'not_now', { next_action_date: null, snooze_until: date }, 'Replied: not now')
      : await setStage(p, 'not_interested', { next_action_date: null, snooze_until: null }, 'Replied: not interested')
    if (res) { toast('Follow-ups stopped for ' + p.agency_name); onClose() }
  }
  const opts: [Out, string, string][] = [['interested', 'Interested', 'Reply to them soon'], ['call', 'Call booked', 'Pick the call date'], ['not_now', 'Not now', 'Come back on a date'], ['no', 'Not interested', 'Never email again']]
  return (
    <Sheet title={`${p.agency_name} replied`} onClose={onClose}>
      <div className="group">{opts.map(([k, t, s]) => (
        <button key={k} className="row" onClick={() => pick(k)}><div className="row-main"><div className="row-title">{t}</div><div className="row-sub">{s}</div></div>{out === k && <span className="chip lime">Selected</span>}</button>))}</div>
      {out !== 'no' && <label className="fld" style={{ marginTop: 14 }}><span>{out === 'not_now' ? 'Come back on' : out === 'call' ? 'Call date' : 'Reply by'}</span><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>}
      <div className="savebar"><button className="btn primary block" onClick={save}>Save outcome</button></div>
    </Sheet>
  )
}
