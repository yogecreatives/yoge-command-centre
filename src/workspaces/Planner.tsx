import { useRef, useState } from 'react'
import { PillNav } from '../ui/Stack'
import { BizSwitcher } from '../ui/BizSwitcher'

const TABS: [string, string][] = [
  ['today', 'Today'],
  ['focus', 'Focus'],
  ['track', 'Track'],
  ['more', 'More'],
]

export function PlannerWorkspace() {
  const [tab, setTab] = useState('today')
  const frame = useRef<HTMLIFrameElement>(null)

  const selectTab = (id: string) => {
    setTab(id)
    frame.current?.contentWindow?.postMessage({ type: 'planner-view', view: id }, '*')
  }

  const syncFrame = () => {
    frame.current?.contentWindow?.postMessage({ type: 'planner-view', view: tab }, '*')
  }

  return (
    <div className="shell2 ws-planner">
      <div className="page">
        <div className="wshead">
          <BizSwitcher label="My Day Planner" current="planner" />
        </div>
        <iframe
          ref={frame}
          title="My Day Planner"
          src="/my-day-planner.html"
          onLoad={syncFrame}
          style={{ width: '100%', height: 'calc(100vh - 92px)', minHeight: 620, border: 0, borderRadius: 16, display: 'block' }}
        />
        <PillNav tabs={TABS} active={tab} onGo={selectTab} />
      </div>
    </div>
  )
}
