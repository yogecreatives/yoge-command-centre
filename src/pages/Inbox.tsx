import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { Group } from '../components/Rows'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { businessRoute } from '../lib/workspaces'
import { supabase } from '../lib/supabase'
import { fmtStamp } from '../lib/dates'
import { useToast } from '../ui/toast'

export function Inbox({ scope }: { scope?: string } = {}) {
  const { notifications, tasks, followUps, projects, prospects, income, expenses, bizBySlug, update } = useData()
  const open = useEditor()
  const toast = useToast()
  const bizId = scope ? bizBySlug(scope)?.id : undefined

  const businessIdForNotification = (n: typeof notifications[number]) => {
    if (!n.ref_id || !n.ref_table) return undefined
    const rows: Record<string, any[]> = { tasks, follow_ups: followUps, projects, prospects, income_entries: income, expenses }
    return rows[n.ref_table]?.find(x => x.id === n.ref_id)?.business_id
  }

  const scopedNotifications = scope && bizId ? notifications.filter(n => businessIdForNotification(n) === bizId) : notifications
  const unread = scopedNotifications.filter(n => !n.read_at)

  const markAll = async () => {
    const ids = unread.map(n => n.id)
    if (!ids.length) return
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
    if (error) return toast(error.message, 'error')
    ids.forEach(id => update('notifications', id, { read_at: new Date().toISOString() }))
  }

  const tap = async (n: typeof notifications[number]) => {
    if (!n.read_at) await update('notifications', n.id, { read_at: new Date().toISOString() })
    if (scope) {
      const prefix = `/w/${scope}`
      if (n.ref_table === 'tasks' && n.ref_id) return go(`${prefix}/tasks?task=${n.ref_id}`)
      if (n.ref_table === 'follow_ups' && n.ref_id) return go(`${prefix}/tasks?followup=${n.ref_id}`)
      if (n.ref_table === 'prospects' && n.ref_id) return go(`${prefix}/pipeline?prospect=${n.ref_id}`)
      if (n.ref_table === 'projects' && n.ref_id) return go(`${prefix}/projects?project=${n.ref_id}`)
    }
    const item = n.ref_table === 'tasks' ? tasks.find(t => t.id === n.ref_id) : n.ref_table === 'follow_ups' ? followUps.find(f => f.id === n.ref_id) : n.ref_table === 'prospects' ? prospects.find(p => p.id === n.ref_id) : projects.find(p => p.id === n.ref_id)
    if (item) open(n.ref_table === 'tasks' ? 'task' : n.ref_table === 'follow_ups' ? 'followup' : n.ref_table === 'prospects' ? 'prospect' : 'project', item)
    else toast('That item no longer exists.', 'error')
  }

  return (
    <>
      <button className="backlink" onClick={() => go(scope ? businessRoute(scope) : '/home')}><Icon name="back" size={18} />{scope ? 'Back' : 'Home'}</button>
      <header className="large"><h1>Notifications</h1>{unread.length > 0 && <div className="toolbar"><button className="link" onClick={markAll}>Mark all read</button></div>}</header>
      <Group items={scopedNotifications.map(n => (
        <button key={n.id} className="row" onClick={() => tap(n)}>
          <i className={`unread ${n.read_at ? 'off' : ''}`} />
          <div className="row-main"><div className="row-title">{n.title}</div><div className="row-sub">{n.body}</div></div>
          <span className="chip">{fmtStamp(n.created_at)}</span>
        </button>
      ))} empty="No notifications yet. Reminders are created automatically when tasks, follow-ups and projects are coming due." />
    </>
  )
}
