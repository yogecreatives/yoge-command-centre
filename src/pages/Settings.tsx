import { useState } from 'react'
import { useData } from '../lib/data'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { useToast } from '../ui/toast'
import { todayISO } from '../lib/dates'
import { Segmented } from '../ui/Sheet'
import { getTheme, setTheme, ThemePref } from '../lib/theme'
import { runImport, ImportFile } from '../lib/importer'
import { parseStarter, starterText } from '../lib/projectTasks'
import { Templates } from '../lib/types'

const IMPORT_KEY = 'yoge_v2_imported'
const BIZ_SLUGS = ['white-label', 'yogeworks', 'yogecreatives', 'yogefolio', 'other']

export function Settings({ scope }: { scope?: string } = {}) {
  const { settings, updateSettings, email, signOut, online, businesses, createMany, referrers, prospects, projects, income, reload } = useData()
  const toast = useToast()
  const [raw, setRaw] = useState('')
  const [importing, setImporting] = useState(false)
  const [theme, setThemeState] = useState<ThemePref>(getTheme())
  const [sender, setSender] = useState(settings?.sender_name ?? '')
  const [tplKey, setTplKey] = useState<keyof Templates>('email_1')
  const [tpl, setTpl] = useState(settings?.outreach_templates ?? null)
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
      const r = await runImport(bulk, { businesses, referrers, prospects, projects, income })
      await reload(); setBulk(null)
      toast(`Imported ${r.projects} projects, ${r.prospects} agencies, ${r.income} income entries, ${r.referrers} referrers${r.skipped ? ` (${r.skipped} duplicates skipped)` : ''}`)
    } catch (e: any) { toast(e.message || 'Import failed', 'error') }
    setBulkBusy(false)
  }
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
          <select className="pill" value={settings?.remind_days_before ?? 1} onChange={e => updateSettings({ remind_days_before: Number(e.target.value) })}>
            {[0, 1, 2, 3, 5, 7, 14].map(n => <option key={n} value={n}>{n === 0 ? 'On the day' : `${n} day${n > 1 ? 's' : ''}`}</option>)}
          </select></label>
        <label className="row"><div className="row-main"><div className="row-title">Time zone</div></div>
          <select className="pill" value={settings?.timezone ?? 'UTC'} onChange={e => updateSettings({ timezone: e.target.value })}>
            {[...new Set([settings?.timezone ?? 'UTC', ...zones])].map(z => <option key={z}>{z}</option>)}
          </select></label>
      </div><p className="foot">Reminders are created by the database every 15 minutes and appear in Notifications on every device.</p></section>

      {!scope && (<>
      <section className="section"><div className="section-title"><span>Agency outreach</span></div><div className="group pad">
        <div className="two">
          <label className="fld"><span>Your name (email signature)</span><input className="input" value={sender} onChange={e => setSender(e.target.value)} onBlur={() => sender !== settings?.sender_name && updateSettings({ sender_name: sender })} /></label>
          <label className="fld"><span>Emails per day</span><input className="input" type="number" min={1} max={100} defaultValue={settings?.daily_new_limit ?? 10} onBlur={e => { const n = Math.min(100, Math.max(1, Number(e.target.value) || 10)); if (n !== settings?.daily_new_limit) updateSettings({ daily_new_limit: n }) }} /></label>
        </div>
        <div className="row-sub">Follow-up days after Email 1 (Follow-up 1, Follow-up 2, last nudge)</div>
        <div className="three">{[0, 1, 2].map(i => <input key={i} className="input" type="number" min={1} max={90} defaultValue={settings?.outreach_gaps?.[i] ?? [3, 7, 14][i]} onBlur={e => { const g = [...(settings?.outreach_gaps ?? [3, 7, 14])]; g[i] = Math.max(1, Number(e.target.value) || g[i]); const ok = g[0] < g[1] && g[1] < g[2]; if (!ok) return toast('Each follow-up must come after the one before.', 'error'); updateSettings({ outreach_gaps: g }) }} />)}</div>
        <label className="row switch" style={{ padding: 0, minHeight: 40 }}><div className="row-main"><div className="row-title">Skip weekends</div></div><input type="checkbox" checked={Boolean(settings?.skip_weekends)} onChange={e => updateSettings({ skip_weekends: e.target.checked })} /></label>
        {tpl && <>
          <select className="input" value={tplKey} onChange={e => setTplKey(e.target.value as keyof Templates)}><option value="email_1">Email 1</option><option value="follow_up_1">Follow-up 1</option><option value="follow_up_2">Follow-up 2</option><option value="last_nudge">Last nudge</option></select>
          <input className="input" value={tpl[tplKey].subject} onChange={e => setTpl({ ...tpl, [tplKey]: { ...tpl[tplKey], subject: e.target.value } })} placeholder="Subject" />
          <textarea className="input" rows={9} value={tpl[tplKey].body} onChange={e => setTpl({ ...tpl, [tplKey]: { ...tpl[tplKey], body: e.target.value } })} />
          <div className="row-sub">Placeholders: {'{agency}'} {'{contact}'} {'{sender}'}</div>
          <button className="btn block" onClick={async () => { await updateSettings({ outreach_templates: tpl }); toast('Templates saved') }}>Save templates</button>
        </>}
      </div></section>

      </>)}

      <section className="section"><div className="section-title"><span>Starter tasks for new projects</span></div><div className="group pad">
        <div className="row-sub">One per line: task | days after the project date</div>
        <textarea className="input" rows={7} value={starter} onChange={e => setStarter(e.target.value)} />
        <button className="btn block" onClick={async () => { await updateSettings({ project_task_template: parseStarter(starter) }); toast('Starter tasks saved') }}>Save starter tasks</button>
      </div></section>

      <section className="section"><div className="section-title"><span>Import prepared data file</span></div><div className="group pad">
        <p className="row-sub">Upload <code>yoge-import-data.json</code> to add your projects, referrers, agencies and Wix commission. Existing records are never changed, and duplicates are skipped.</p>
        {!bulk ? <label className="btn block">Choose file<input type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readBulk(f); e.target.value = '' }} /></label>
          : <><p className="row-sub">Ready: <b>{bulk.projects.length}</b> projects · <b>{bulk.prospects.length}</b> agencies · <b>{bulk.referrers.length}</b> referrers · <b>{bulk.income.length}</b> income entries</p>
            <button className="btn primary block" disabled={bulkBusy} onClick={doBulk}>{bulkBusy ? 'Importing…' : 'Import now'}</button><button className="btn block" onClick={() => setBulk(null)}>Cancel</button></>}
      </div></section>

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

