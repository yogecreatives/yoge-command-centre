import { useState } from 'react'
import { useData } from '../lib/data'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { useToast } from '../ui/toast'
import { todayISO } from '../lib/dates'
import { Segmented } from '../ui/Sheet'
import { getTheme, setTheme, ThemePref } from '../lib/theme'

const IMPORT_KEY = 'yoge_v2_imported'
const BIZ_SLUGS = ['white-label', 'yogeworks', 'yogecreatives', 'yogefolio', 'other']

export function Settings() {
  const { settings, updateSettings, email, signOut, online, businesses, createMany } = useData()
  const toast = useToast()
  const [raw, setRaw] = useState('')
  const [importing, setImporting] = useState(false)
  const [theme, setThemeState] = useState<ThemePref>(getTheme())
  const zones: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? ['Asia/Kuala_Lumpur', 'Asia/Kolkata', 'Asia/Singapore', 'UTC']
  const toggle = (k: keyof NonNullable<typeof settings>, label: string, sub?: string) => (
    <label className="row switch"><div className="row-main"><div className="row-title">{label}</div>{sub && <div className="row-sub">{sub}</div>}</div>
      <input type="checkbox" checked={Boolean(settings?.[k])} onChange={e => updateSettings({ [k]: e.target.checked })} /></label>
  )

  // Imports the V2 prototype's localStorage data (pasted as JSON) into the cloud database. Never deletes anything.
  const doImport = async () => {
    let data: any
    try { data = JSON.parse(raw) } catch { return toast('That is not valid JSON. Copy it again from the prototype.', 'error') }
    const tasks: any[] = Array.isArray(data?.tasks) ? data.tasks : []
    const ideas: any[] = Array.isArray(data?.ideas) ? data.ideas : []
    if (!tasks.length && !ideas.length) return toast('No tasks or ideas found in that data.', 'error')
    if (localStorage.getItem(IMPORT_KEY) && !confirm('You already imported once on this device. Importing again will create duplicates. Continue?')) return
    const idOf = (slug: string) => (businesses.find(b => b.slug === (BIZ_SLUGS.includes(slug) ? slug : 'other')) ?? businesses[4])?.id
    const statusMap: Record<string, string> = { Pending: 'pending', 'In progress': 'in_progress', Completed: 'completed' }
    const prioMap: Record<string, string> = { Normal: 'normal', High: 'high', Urgent: 'urgent' }
    const fuRows = tasks.filter(t => t.kind === 'Follow-up').map(t => ({
      business_id: idOf(t.business), person_name: String(t.notes || t.title).slice(0, 200), notes: t.notes ? String(t.title) : null,
      follow_up_date: t.due || todayISO(), status: t.status === 'Completed' ? 'completed' : 'open', completed_at: t.status === 'Completed' ? (t.created ?? null) : null,
    }))
    const taskRows = tasks.filter(t => t.kind !== 'Follow-up').map(t => ({
      business_id: idOf(t.business), title: String(t.title).slice(0, 300), task_type: 'general', priority: prioMap[t.priority] ?? 'normal',
      status: statusMap[t.status] ?? 'pending', due_date: t.due || null, notes: t.notes || null, completed_at: t.status === 'Completed' ? (t.created ?? null) : null,
    }))
    const ideaRows = ideas.map(i => ({ title: String(i.title).slice(0, 300) }))
    setImporting(true)
    const a = await createMany('tasks', taskRows), b = await createMany('follow_ups', fuRows), c = await createMany('ideas', ideaRows)
    setImporting(false)
    if (a + b + c === taskRows.length + fuRows.length + ideaRows.length) {
      localStorage.setItem(IMPORT_KEY, '1'); setRaw(''); toast(`Imported ${a} tasks, ${b} follow-ups, ${c} ideas`)
    }
  }

  return (
    <>
      <button className="backlink" onClick={() => go('/today')}><Icon name="back" size={18} />Today</button>
      <header className="large"><h1>Settings</h1></header>
      <section className="section"><div className="section-title"><span>Appearance</span></div>
        <Segmented value={theme} onChange={v => { setThemeState(v); setTheme(v) }} options={[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']]} />
      </section>
      <section className="section"><div className="section-title"><span>Reminders</span></div><div className="group">
        {toggle('remind_tasks', 'Task due dates')}
        {toggle('remind_followups', 'Follow-ups')}
        {toggle('remind_projects', 'Project deadlines', 'Always at least 3 days ahead')}
        {toggle('remind_overdue', 'Overdue alerts', 'Once per overdue item')}
        <label className="row"><div className="row-main"><div className="row-title">Remind me ahead by</div></div>
          <select className="pill" value={settings?.remind_days_before ?? 1} onChange={e => updateSettings({ remind_days_before: Number(e.target.value) })}>
            {[0, 1, 2, 3, 5, 7, 14].map(n => <option key={n} value={n}>{n === 0 ? 'On the day' : `${n} day${n > 1 ? 's' : ''}`}</option>)}
          </select></label>
        <label className="row"><div className="row-main"><div className="row-title">Time zone</div></div>
          <select className="pill" value={settings?.timezone ?? 'UTC'} onChange={e => updateSettings({ timezone: e.target.value })}>
            {[...new Set([settings?.timezone ?? 'UTC', ...zones])].map(z => <option key={z}>{z}</option>)}
          </select></label>
      </div><p className="foot">Reminders are created by the database every 15 minutes and appear in Notifications on every device.</p></section>

      <section className="section"><div className="section-title"><span>Import from the V2 prototype</span></div><div className="group pad">
        <p className="row-sub">Open the old file in the browser you used, press F12, run <code>copy(localStorage.getItem('yoge_command_centre_v2'))</code> in the Console, then paste here. Nothing is deleted from the old file.</p>
        <textarea className="input" rows={4} value={raw} onChange={e => setRaw(e.target.value)} placeholder='{"tasks":[…],"ideas":[…]}' />
        <button className="btn block" disabled={!raw.trim() || importing} onClick={doImport}>{importing ? 'Importing…' : 'Import data'}</button>
      </div></section>

      <section className="section"><div className="section-title"><span>Account</span></div><div className="group">
        <div className="row"><div className="row-main"><div className="row-title">{email}</div><div className="row-sub">{online ? 'Online · changes sync live across devices' : 'Offline · changes are not saved until you reconnect'}</div></div></div>
        <button className="row danger-row" onClick={signOut}>Sign out</button>
      </div></section>
    </>
  )
}
