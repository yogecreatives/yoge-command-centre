import { CalendarView } from '../components/Calendar'
import { useEditor } from '../components/editorContext'
import { Icon } from '../ui/Icon'
export function CalendarPage() {
  const open = useEditor()
  return (
    <>
      <header className="large"><div><p className="date">Universal</p><h1>Calendar</h1></div><div className="toolbar"><button className="iconbtn" onClick={() => open('new')} aria-label="Add"><Icon name="plus" /></button></div></header>
      <CalendarView />
    </>
  )
}
