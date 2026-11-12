import { BizSwitcher } from '../ui/BizSwitcher'

export function PlannerWorkspace() {
  return (
    <div className="shell2 ws-planner">
      <div className="page">
        <div className="wshead">
          <BizSwitcher label="My Day Planner" current="planner" />
        </div>
        <iframe
          title="My Day Planner"
          src="/my-day-planner.html"
          style={{ width: '100%', height: 'calc(100vh - 92px)', minHeight: 620, border: 0, borderRadius: 16, display: 'block' }}
        />
      </div>
    </div>
  )
}
