import { CalendarView } from '../components/Calendar'
import { useEditor } from '../components/Editors'
import { Icon } from '../ui/Icon'
export function CalendarPage() {
  const open = useEditor()
  return (
    <>
      <header className="large"><h1>Calendar</h1><div className="toolbar"><button className="iconbtn" onClick={() => open('new')} aria-label="Add"><Icon name="plus" /></button></div></header>
      <CalendarView />
    </>
  )
}
