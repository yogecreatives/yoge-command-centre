import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { Group } from '../components/Rows'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { supabase } from '../lib/supabase'
import { fmtStamp } from '../lib/dates'
import { useToast } from '../ui/toast'

export function Inbox() {
  const { notifications, tasks, followUps, projects, prospects, update } = useData()
  const open = useEditor()
  const toast = useToast()
  const unread = notifications.filter(n => !n.read_at)
  const markAll = async () => {
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
    if (error) return toast(error.message, 'error')
    unread.forEach(n => update('notifications', n.id, { read_at: new Date().toISOString() }))
  }
  const tap = async (n: typeof notifications[number]) => {
    if (!n.read_at) await update('notifications', n.id, { read_at: new Date().toISOString() })
    const item = n.ref_table === 'tasks' ? tasks.find(t => t.id === n.ref_id) : n.ref_table === 'follow_ups' ? followUps.find(f => f.id === n.ref_id) : n.ref_table === 'prospects' ? prospects.find(p => p.id === n.ref_id) : projects.find(p => p.id === n.ref_id)
    if (item) open(n.ref_table === 'tasks' ? 'task' : n.ref_table === 'follow_ups' ? 'followup' : n.ref_table === 'prospects' ? 'prospect' : 'project', item)
    else toast('That item no longer exists.', 'error')
  }
  return (
    <>
      <button className="backlink" onClick={() => go('/home')}><Icon name="back" size={18} />Today</button>
      <header className="large"><h1>Notifications</h1>{unread.length > 0 && <div className="toolbar"><button className="link" onClick={markAll}>Mark all read</button></div>}</header>
      <Group items={notifications.map(n => (
        <button key={n.id} className="row" onClick={() => tap(n)}>
          <i className={`unread ${n.read_at ? 'off' : ''}`} />
          <div className="row-main"><div className="row-title">{n.title}</div><div className="row-sub">{n.body}</div></div>
          <span className="chip">{fmtStamp(n.created_at)}</span>
        </button>
      ))} empty="No notifications yet. Reminders are created automatically when tasks, follow-ups and projects are coming due." />
    </>
  )
}
