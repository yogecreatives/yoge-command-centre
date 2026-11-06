import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { useToast } from '../ui/toast'
import { todayISO } from '../lib/dates'
import { Segmented } from '../ui/Sheet'
import { getTheme, setTheme, ThemePref } from '../lib/theme'
import { runImport, ImportFile } from '../lib/importer'
import { parseStarter, starterText } from '../lib/projectTasks'

const IMPORT_KEY = 'yoge_v2_imported'
const BIZ_SLUGS = ['white-label', 'yogeworks', 'yogecreatives', 'yogefolio', 'other']

export function Settings({ scope }: { scope?: string } = {}) {
  const { settings, updateSettings, email, signOut, online, businesses, createMany, referrers, projects, income, reload, isAdmin } = useData()
  const toast = useToast()
  const [raw, setRaw] = useState('')
  const [importing, setImporting] = useState(false)
  const [theme, setThemeState] = useState<ThemePref>(getTheme())
  const [starter, setStarter] = useState(starterText(settings?.project_task_template ?? []))
  const [bulk, setBulk] = useState<ImportFile | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  const readBulk = async (f: File) => {
    try { const d = JSON.parse(await f.text()) as ImportFile; if (!d || d.version !== 1) throw new Error('bad'); setBulk(d) }
    catch { toast('That is not a YOGE import file.', 'error') }
  }

  const doBulk = async () => {
    if (!bulk) return; setBulkBusy(true)
    try {
      const r = await runImport(bulk, { businesses, referrers, projects, income })
      await reload(); setBulk(null)
      toast(`Imported ${r.projects} projects, ${r.income} income entries, ${r.referrers} referrers${r.skipped ? ` (${r.skipped} duplicates skipped)` : ''}`)
    } catch (e: any) { toast(e.message || 'Import failed', 'error') }
    setBulkBusy(false)
  }

  const zones: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? ['Asia/Kuala_Lumpur', 'Asia/Kolkata', 'Asia/Singapore', 'UTC']
  const toggle = (k: keyof NonNullable<typeof settings>, label: string, sub?: string) => (
    <label className="row switch"><div className="row-main"><div className="row-title">{label}</div>{sub && <div className="row-sub">{sub}</div>}</div>
      <input type="checkbox" checked={Boolean(settings?.[k])} onChange={e => updateSettings({ [k]: e.target.checked })} /></label>
  )

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
      <button className="backlink" onClick={() => go(scope ? '/w/' + scope + '/more' : '/home')}><Icon name="back" size={18} />Today</button>
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
          <select className="pill" value={settings?.remind_days_before ?? 1} onChange={e => updateSettings({ remind_days_before: Number(e.target.value) })}>{[0,1,2,3,5,7,14].map(n => <option key={n} value={n}>{n === 0 ? 'On the day' : `${n} day${n > 1 ? 's' : ''}`}</option>)}</select></label>
        <label className="row"><div className="row-main"><div className="row-title">Time zone</div></div>
          <select className="pill" value={settings?.timezone ?? 'UTC'} onChange={e => updateSettings({ timezone: e.target.value })}>{[...new Set([settings?.timezone ?? 'UTC', ...zones])].map(z => <option key={z}>{z}</option>)}</select></label>
      </div><p className="foot">Reminders are created by the database every 15 minutes and appear in Notifications on every device.</p></section>

      <section className="section"><div className="section-title"><span>Starter tasks for new projects</span></div><div className="group pad">
        <div className="row-sub">One per line: task | days after the project date</div>
        <textarea className="input" rows={7} value={starter} onChange={e => setStarter(e.target.value)} />
        <button className="btn block" onClick={async () => { await updateSettings({ project_task_template: parseStarter(starter) }); toast('Starter tasks saved') }}>Save starter tasks</button>
      </div></section>

      <section className="section"><div className="section-title"><span>Import prepared data file</span></div><div className="group pad">
        <p className="row-sub">Upload <code>yoge-import-data.json</code> to add your projects, referrers and Wix commission. Existing records are never changed, and duplicates are skipped.</p>
        {!bulk ? <label className="btn block">Choose file<input type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readBulk(f); e.target.value = '' }} /></label>
          : <><p className="row-sub">Ready: <b>{bulk.projects.length}</b> projects · <b>{bulk.referrers.length}</b> referrers · <b>{bulk.income.length}</b> income entries</p>
            <button className="btn primary block" disabled={bulkBusy} onClick={doBulk}>{bulkBusy ? 'Importing…' : 'Import now'}</button><button className="btn block" onClick={() => setBulk(null)}>Cancel</button></>}
      </div></section>

      <section className="section"><div className="section-title"><span>Import from the V2 prototype</span></div><div className="group pad">
        <p className="row-sub">Open the old file in the browser you used, press F12, run <code>copy(localStorage.getItem('yoge_command_centre_v2'))</code> in the Console, then paste here. Nothing is deleted from the old file.</p>
        <textarea className="input" rows={4} value={raw} onChange={e => setRaw(e.target.value)} placeholder='{"tasks":[…],"ideas":[…]}' />
        <button className="btn block" disabled={!raw.trim() || importing} onClick={doImport}>{importing ? 'Importing…' : 'Import data'}</button>
      </div></section>

      {!scope && isAdmin && <AdminDashboard />}

      <section className="section"><div className="section-title"><span>Account</span></div><div className="group">
        <div className="row"><div className="row-main"><div className="row-title">{email}</div><div className="row-sub">{online ? 'Online · changes sync live across devices' : 'Offline'}</div></div></div>
        <button className="btn block" onClick={() => signOut()}>Sign out</button>
      </div></section>
    </>
  )
}

function AdminDashboard() {
  const { teamProfiles, businesses, memberships, setMembership } = useData()
  return (
    <section className="section"><div className="section-title"><span>Partner access</span></div><div className="group">
      {teamProfiles.filter(p => p.role === 'member').map(p => (
        <div key={p.user_id} className="row"><div className="row-main"><div className="row-title">{p.full_name || p.email}</div>
          <div className="row-sub">{businesses.map(b => <label key={b.id} style={{ marginRight: 10 }}><input type="checkbox" checked={memberships.some(m => m.user_id === p.user_id && m.business_id === b.id)} onChange={e => setMembership(p.user_id, b.id, e.target.checked)} /> {b.name}</label>)}</div>
        </div></div>
      ))}
    </div></section>
  )
}
