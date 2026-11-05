import { useMemo, useRef, useState } from 'react'
import { useData } from '../lib/data'
import { useEditor } from '../components/editorContext'
import { Group } from '../components/Rows'
import { Segmented } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { useToast } from '../ui/toast'
import { usePipelineActions } from '../lib/usePipeline'
import { ACTIVE, BOARD_COLUMNS, CLOSED, NEXT_STEP, WAITING, download, findDuplicate, hostOf, mailtoFor, normUrl, parseCsv, toCsv } from '../lib/pipeline'
import { STAGE } from '../lib/labels'
import { dueLabel, fmtDate, iso, todayISO } from '../lib/dates'
import { Prospect, Stage } from '../lib/types'

const stars = (n: number) => '★'.repeat(n)
const byFit = (a: Prospect, b: Prospect) => b.fit - a.fit || a.created_at.localeCompare(b.created_at)

function ActionRow({ p }: { p: Prospect }) {
  const { settings } = useData()
  const open = useEditor()
  const { markSent } = usePipelineActions()
  const step = NEXT_STEP[p.stage]
  const mail = step && settings ? mailtoFor(p, step.key, settings.outreach_templates, settings.sender_name) : null
  const today = todayISO()
  return (
    <div className="row col">
      <div className="rt">
        <button className="row-main" onClick={() => open('prospect', p)}>
          <div className="row-title">{p.agency_name}{p.country ? ` · ${p.country}` : ''}</div>
          <div className="row-sub">{step?.label}{p.stage !== 'prospect' && p.next_action_date ? ` · due ${dueLabel(p.next_action_date, today).toLowerCase()}` : ''}{p.source ? ` · ${p.source}` : ''}</div>
        </button>
        <span className="stars">{stars(p.fit)}</span>
      </div>
      <div className="act">
        {mail ? <a className="mini" href={mail}>Open email</a> : <button className="mini" disabled>No email</button>}
        <button className="mini go" onClick={() => markSent(p)}>Sent</button>
        <button className="mini rep" onClick={() => open('replied', p)}>Replied</button>
      </div>
    </div>
  )
}

function Plain({ p }: { p: Prospect }) {
  const open = useEditor(); const today = todayISO()
  const due = p.next_action_date && WAITING.includes(p.stage) && p.next_action_date <= today
  return (
    <button className="row" onClick={() => open('prospect', p)}>
      <div className="row-main"><div className="row-title">{p.agency_name}</div>
        <div className="row-sub">{[p.country, p.next_action_date && WAITING.includes(p.stage) ? `next ${fmtDate(p.next_action_date)}` : p.stage === 'not_now' && p.snooze_until ? `back ${fmtDate(p.snooze_until)}` : p.email ? '' : 'needs email'].filter(Boolean).join(' · ')}</div></div>
      <span className="stars">{stars(p.fit)}</span>
      <span className={`chip ${due ? 'red' : ACTIVE.includes(p.stage) ? 'lime' : ''}`}>{STAGE[p.stage]}</span>
    </button>
  )
}

export function Pipeline({ embedded = false }: { embedded?: boolean }) {
  const { prospects: allProspects, activities: allActivities, settings, businesses, create, createMany, update } = useData()
  const open = useEditor(); const toast = useToast(); const { setStage } = usePipelineActions()
  const [view, setView] = useState<'today' | 'all' | 'board'>('today')
  const [extra, setExtra] = useState(0)
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [sort, setSort] = useState<'next' | 'contacted' | 'newest' | 'name'>('next')
  const fileRef = useRef<HTMLInputElement>(null)
  const today = todayISO()
  const wl = businesses.find(b => b.slug === 'white-label') ?? businesses[0]
  const prospects = useMemo(() => allProspects.filter(p => p.business_id === wl.id), [allProspects, wl.id])
  const ids = useMemo(() => new Set(prospects.map(p => p.id)), [prospects])
  const activities = useMemo(() => allActivities.filter(a => ids.has(a.prospect_id)), [allActivities, ids])
  const limit = settings?.daily_new_limit ?? 10

  const sentToday = activities.filter(a => a.kind === 'email_sent' && iso(new Date(a.created_at)) === today).length
  const due = prospects.filter(p => WAITING.includes(p.stage) && p.next_action_date && p.next_action_date <= today).sort((a, b) => (a.next_action_date! < b.next_action_date! ? -1 : 1) || b.fit - a.fit)
  const snoozed = prospects.filter(p => p.stage === 'not_now' && p.snooze_until && p.snooze_until <= today)
  const fresh = prospects.filter(p => p.stage === 'prospect' && p.email).sort(byFit)
  const quota = Math.max(limit - sentToday - due.length, 0) + extra
  const noEmail = prospects.filter(p => p.stage === 'prospect' && !p.email).length

  const c = (st: Stage[]) => prospects.filter(p => st.includes(p.stage)).length
  const contacted = prospects.filter(p => p.stage !== 'prospect').length
  const filtered = useMemo(() => {
    const f: Record<string, (p: Prospect) => boolean> = {
      all: () => true, prospect: p => p.stage === 'prospect', sequence: p => WAITING.includes(p.stage), replied: p => p.stage === 'replied',
      call_booked: p => p.stage === 'call_booked', test_project: p => p.stage === 'test_project', partner: p => p.stage === 'partner', closed: p => CLOSED.includes(p.stage),
    }
    const q = search.trim().toLowerCase()
    const l = prospects.filter(p => f[filter](p) && (!q || `${p.agency_name} ${p.email ?? ''} ${p.country ?? ''} ${p.contact_name ?? ''}`.toLowerCase().includes(q)))
    if (sort === 'next') l.sort((a, b) => (a.next_action_date || '9999').localeCompare(b.next_action_date || '9999') || b.fit - a.fit)
    if (sort === 'contacted') l.sort((a, b) => (b.last_contacted_at || '').localeCompare(a.last_contacted_at || ''))
    if (sort === 'newest') l.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (sort === 'name') l.sort((a, b) => a.agency_name.localeCompare(b.agency_name))
    return l
  }, [prospects, search, filter, sort])

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault(); if (!name.trim()) return
    const dup = findDuplicate(prospects, email, null)
    if (dup && !confirm(`“${dup.agency_name}” already has this email. Add anyway?`)) return
    if (await create('prospects', { business_id: wl.id, agency_name: name.trim(), email: email.trim() || null })) { setName(''); setEmail(''); toast('Agency added') }
  }

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text()); if (rows.length < 2) return toast('That file has no rows.', 'error')
    const head = rows[0].map(h => h.trim().toLowerCase()); const col = (...k: string[]) => head.findIndex(h => k.some(x => h.includes(x)))
    const ci = { name: col('agency', 'business', 'company', 'name'), site: col('website', 'url', 'site'), contact: col('contact', 'email'), person: col('person'), phone: col('phone'), country: col('country'), source: col('source'), notes: col('note') }
    if (ci.name < 0 && ci.contact < 0) return toast('Could not find an Agency or Email column in the first row.', 'error')
    const seen = [...prospects]; const out: Record<string, unknown>[] = []; let skipped = 0
    for (const r of rows.slice(1)) {
      const g = (i: number) => (i >= 0 ? (r[i] || '').trim() : '')
      const em = (g(ci.contact).match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [''])[0]; const site = g(ci.site)
      const nm = g(ci.name) || hostOf(site) || em.split('@')[1] || ''
      if (!nm) { skipped++; continue }
      if (findDuplicate(seen, em, site)) { skipped++; continue }
      const row = { business_id: wl.id, agency_name: nm.slice(0, 200), email: em || null, website: site && !site.includes('@') ? normUrl(site) : null, contact_name: g(ci.person) || null, phone: g(ci.phone) || null, country: g(ci.country) || null, source: g(ci.source) || null, notes: g(ci.notes) || null }
      out.push(row); seen.push({ ...(row as unknown as Prospect), id: 'x' + out.length })
    }
    const n = await createMany('prospects', out); toast(`Imported ${n}${skipped ? `, skipped ${skipped} duplicates or empty rows` : ''}`)
  }
  const exportCsv = () => download('white-label-pipeline.csv', toCsv([['Agency', 'Contact', 'Email', 'Phone', 'Website', 'Country', 'Source', 'Fit', 'Step', 'Next date', 'Last contacted', 'Notes'],
    ...prospects.map(p => [p.agency_name, p.contact_name, p.email, p.phone, p.website, p.country, p.source, p.fit, STAGE[p.stage], p.next_action_date, p.last_contacted_at?.slice(0, 10), p.notes])]))
  const restart = (p: Prospect) => setStage(p, 'prospect', { snooze_until: null, next_action_date: null }, 'Back from snooze')

  const dragId = useRef<string | null>(null)
  const drop = async (stage: Stage) => {
    const p = prospects.find(x => x.id === dragId.current); dragId.current = null
    if (p && p.stage !== stage) await update('prospects', p.id, { stage, next_action_date: WAITING.includes(stage) ? today : null })
  }

  return (
    <>
      <header className="large"><div><p className="date">Agency partnerships</p><h1>Pipeline</h1></div>
        <div className="toolbar"><button className="iconbtn" onClick={() => open('prospect')} aria-label="Add agency"><Icon name="plus" /></button></div></header>
      <Segmented value={view} onChange={setView} options={[['today', 'Today'], ['all', 'All agencies'], ['board', 'Board']]} />

      {view === 'today' && (
        <>
          <div className="pr"><div className="a"><strong>{sentToday} of {limit} sent today</strong><span>{Math.max(limit - sentToday, 0)} to go</span></div><div className="br"><i style={{ width: `${Math.min(100, (sentToday / limit) * 100)}%` }} /></div></div>
          <Group title={`Follow-ups due · ${due.length}`} items={due.map(p => <ActionRow key={p.id} p={p} />)} />
          {snoozed.length > 0 && <Group title="Snooze ended" items={snoozed.map(p => <div key={p.id} className="row"><button className="row-main" onClick={() => open('prospect', p)}><div className="row-title">{p.agency_name}</div><div className="row-sub">Said not now · {p.country ?? ''}</div></button><button className="mini go" onClick={() => restart(p)}>Restart</button></div>)} />}
          <Group title={`New agencies to email · ${Math.min(quota, fresh.length)} of ${fresh.length}`} items={fresh.slice(0, quota).map(p => <ActionRow key={p.id} p={p} />)}
            empty={fresh.length ? undefined : prospects.length ? 'No new agencies with an email. Add more or import a list.' : 'No agencies yet. Add one below or import your list.'} />
          {fresh.length > quota && <button className="btn block" style={{ marginBottom: 16 }} onClick={() => setExtra(extra + 5)}>Show 5 more</button>}
          {quota === 0 && fresh.length > 0 && <p className="foot" style={{ marginTop: -8 }}>Today’s limit of {limit} is reached. Change it in Settings.</p>}
          {noEmail > 0 && <p className="foot">{noEmail} agenc{noEmail === 1 ? 'y has' : 'ies have'} no email yet. Find them under All agencies, filter Prospect.</p>}
          <form className="capture" onSubmit={quickAdd}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Agency name" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" inputMode="email" />
            <button className="btn primary" disabled={!name.trim()}>Add</button>
          </form>
        </>
      )}

      {view === 'all' && (
        <>
          <p className="sts"><b>{prospects.length}</b> total · <b>{contacted}</b> contacted · <b>{c(['replied', 'call_booked', 'test_project', 'partner'])}</b> replied or further · <b>{c(['partner'])}</b> partners</p>
          <div className="search"><Icon name="search" size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or country" /></div>
          <div className="pills">
            {[['all', 'All'], ['prospect', 'Prospect'], ['sequence', 'In sequence'], ['replied', 'Replied'], ['call_booked', 'Call booked'], ['test_project', 'Test project'], ['partner', 'Partner'], ['closed', 'Closed']].map(([k, l]) => <button key={k} className={`pill ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          <div className="pills">
            <select className="pill" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="next">Sort: next date</option><option value="contacted">Sort: last contacted</option><option value="newest">Sort: newest</option><option value="name">Sort: name</option></select>
            <button className="pill" onClick={() => fileRef.current?.click()}>Import CSV</button><button className="pill" onClick={exportCsv}>Export CSV</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = '' }} />
          </div>
          <Group items={filtered.map(p => <Plain key={p.id} p={p} />)} empty="No agencies match." />
        </>
      )}

      {view === 'board' && (
        <>
          <p className="foot" style={{ padding: '0 2px 8px' }}>Swipe sideways. Tap an agency to move it{' '}(on a computer you can also drag).</p>
          <div className="board">
            {BOARD_COLUMNS.map(st => {
              const list = prospects.filter(p => p.stage === st).sort(byFit)
              return (
                <div key={st} className="bcol" onDragOver={e => e.preventDefault()} onDrop={() => drop(st)}>
                  <div className="ch">{STAGE[st]}<span>{list.length}</span></div>
                  {list.slice(0, 30).map(p => (
                    <button key={p.id} className="bcard" draggable onDragStart={() => (dragId.current = p.id)} onClick={() => open('prospect', p)}>
                      <div className="t">{p.agency_name}</div><div className="s">{[p.country, p.source].filter(Boolean).join(' · ')}</div>
                      <div className="f"><span className="stars">{stars(p.fit)}</span>{p.next_action_date && WAITING.includes(p.stage) && <span className={`chip ${p.next_action_date <= today ? 'red' : ''}`}>{dueLabel(p.next_action_date, today)}</span>}</div>
                    </button>))}
                  {list.length > 30 && <div className="foot">+{list.length - 30} more in All agencies</div>}
                </div>)
            })}
          </div>
        </>
      )}
    </>
  )
}
