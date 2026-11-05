import { useMemo, useRef, useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { Group } from '../../components/Rows'
import { Icon } from '../../ui/Icon'
import { useToast } from '../../ui/toast'
import { STAGE } from '../../lib/labels'
import { CLIENT_STAGES, FOLLOW_UP_DAYS, isOpenLead, leadDue, outreachPatch } from '../../lib/clientPipeline'
import { download, findDuplicate, hostOf, normUrl, parseCsv, toCsv } from '../../lib/pipeline'
import { addDays, dueLabel, fmtDate, fmtStamp, todayISO } from '../../lib/dates'
import { Prospect, Stage } from '../../lib/types'

export function YcPipeline({ bizId }: { bizId: string }) {
  const { prospects: all, activities, create, createMany, update } = useData()
  const open = useEditor(); const toast = useToast(); const today = todayISO()
  const prospects = useMemo(() => all.filter(p => p.business_id === bizId), [all, bizId])
  const [view, setView] = useState<'find' | 'follow' | 'all' | 'board'>('find')
  const [findLocation, setFindLocation] = useState('')
  const [findCategory, setFindCategory] = useState('cleaning company')
  const [findCount, setFindCount] = useState(10)
  const [scraperUrl, setScraperUrl] = useState(() => localStorage.getItem('yoge_gmaps_scraper_url') || 'http://localhost:8080')
  const [scrapeBusy, setScrapeBusy] = useState(false)
  const [scrapeJobId, setScrapeJobId] = useState('')
  const [scrapeResults, setScrapeResults] = useState<Record<string, unknown>[]>([])
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [q, setQ] = useState(''); const [stage, setStage] = useState<'all' | Stage>('all'); const [sort, setSort] = useState<'follow' | 'recent' | 'name'>('follow')
  const fileRef = useRef<HTMLInputElement>(null); const drag = useRef<string | null>(null)

  const due = prospects.filter(p => leadDue(p, today)).sort((a, b) => (a.next_action_date! < b.next_action_date! ? -1 : 1))
  const fresh = prospects.filter(p => p.stage === 'new' && !leadDue(p, today))
  const lastContact = (p: Prospect) => p.last_contacted_at
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    const l = prospects.filter(p => (stage === 'all' || p.stage === stage) && (!t || `${p.agency_name} ${p.email ?? ''} ${p.contact_name ?? ''} ${p.city ?? ''} ${p.country ?? ''} ${p.category ?? ''} ${p.source ?? ''}`.toLowerCase().includes(t)))
    if (sort === 'follow') l.sort((a, b) => (a.next_action_date || '9999').localeCompare(b.next_action_date || '9999'))
    if (sort === 'recent') l.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (sort === 'name') l.sort((a, b) => a.agency_name.localeCompare(b.agency_name))
    return l
  }, [prospects, q, stage, sort])

  const logOut = async (p: Prospect, kind: 'email_sent' | 'dm_sent') => {
    const patch = outreachPatch(p, today, FOLLOW_UP_DAYS)
    if (await update('prospects', p.id, patch as Record<string, unknown>)) { await create('prospect_activities', { prospect_id: p.id, kind, note: kind === 'email_sent' ? 'Email sent' : 'DM sent' }); toast(`Logged. Next follow-up ${fmtDate(patch.next_action_date)}`) }
  }
  const replied = async (p: Prospect) => {
    if (await update('prospects', p.id, { stage: ['new', 'contacted'].includes(p.stage) ? 'replied' : p.stage, next_action_date: addDays(today, 2) })) { await create('prospect_activities', { prospect_id: p.id, kind: 'replied', note: 'Reply received' }); toast('Reply logged') }
  }
  const Action = ({ p }: { p: Prospect }) => (
    <div className="row col">
      <div className="rt"><button className="row-main" onClick={() => open('lead', p)}>
        <div className="row-title">{p.agency_name}</div>
        <div className="row-sub">{[p.next_action || (p.stage === 'new' ? 'First contact' : 'Follow up'), p.contact_name, p.city || p.country].filter(Boolean).join(' · ')}</div></button>
        <span className={`chip ${p.next_action_date && p.next_action_date < today ? 'red' : p.next_action_date ? 'amber' : ''}`}>{p.next_action_date ? dueLabel(p.next_action_date, today) : STAGE[p.stage]}</span></div>
      <div className="act"><button className="mini" onClick={() => logOut(p, 'email_sent')}>Email sent</button><button className="mini" onClick={() => logOut(p, 'dm_sent')}>DM sent</button><button className="mini rep" onClick={() => replied(p)}>Replied</button></div>
    </div>
  )
  const Plain = ({ p }: { p: Prospect }) => (
    <button className="row" onClick={() => open('lead', p)}>
      <div className="row-main"><div className="row-title">{p.agency_name}</div>
        <div className="row-sub">{[p.contact_name, p.email || p.phone, p.city || p.country, p.source].filter(Boolean).join(' · ') || 'No contact details yet'}</div>
        <div className="row-sub">{[lastContact(p) ? `Last contact ${fmtStamp(lastContact(p))}` : 'Not contacted', p.next_action && `Next: ${p.next_action}`, p.next_action_date && `Follow-up ${fmtDate(p.next_action_date)}`].filter(Boolean).join(' · ')}</div></div>
      <span className={`chip ${p.stage === 'won' ? 'lime' : leadDue(p, today) ? 'red' : ''}`}>{STAGE[p.stage]}</span>
    </button>
  )

  const scrapeKey = (r: Record<string, unknown>, i: number) => String(r.place_id || r.cid || r.data_id || r.link || r.website || r.title || i)
  const mapScrapeRow = (r: Record<string, unknown>) => ({
    business_id: bizId,
    agency_name: String(r.title || r.name || '').trim().slice(0, 200),
    email: Array.isArray(r.emails) ? String(r.emails[0] || '') || null : (typeof r.emails === 'string' ? r.emails.split(',')[0]?.trim() || null : null),
    website: r.website ? normUrl(String(r.website)) : null,
    contact_name: null,
    phone: r.phone ? String(r.phone) : null,
    country: r.country ? String(r.country) : null,
    city: r.city ? String(r.city) : (findLocation || null),
    category: r.category ? String(r.category) : findCategory,
    source: 'Google Maps',
    notes: r.address ? String(r.address) : null,
    stage: 'new',
  })
  const scrape = async () => {
    const base = scraperUrl.trim().replace(/\/$/, '')
    if (!base || !findLocation.trim() || !findCategory.trim()) return toast('Enter a location and business category.', 'error')
    localStorage.setItem('yoge_gmaps_scraper_url', base)
    setScrapeBusy(true); setScrapeResults([]); setSelectedResults(new Set()); setScrapeJobId('')
    try {
      const query = findCategory.trim() + ' in ' + findLocation.trim()
      const createRes = await fetch(base + '/api/v1/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'yoge-' + Date.now(), keywords: [query], lang: 'en', depth: 5, max_time: '5m', email: true }) })
      if (!createRes.ok) throw new Error('Scraper returned ' + createRes.status)
      const created = await createRes.json()
      const id = String(created.id || created.job_id || created.job?.id || '')
      if (!id) throw new Error('Scraper did not return a job id')
      setScrapeJobId(id); toast('Search started. Waiting for Google Maps results…')
      for (let i = 0; i < 36; i++) {
        await new Promise(res => setTimeout(res, 5000))
        const statusRes = await fetch(base + '/api/v1/jobs/' + encodeURIComponent(id))
        if (!statusRes.ok) continue
        const job = await statusRes.json()
        const rows = Array.isArray(job.results) ? job.results : Array.isArray(job.data?.results) ? job.data.results : Array.isArray(job.job?.results) ? job.job.results : []
        if (rows.length) {
          const clean = rows.filter((x: unknown) => x && typeof x === 'object') as Record<string, unknown>[]
          setScrapeResults(clean.slice(0, Math.max(findCount, 10)))
          setSelectedResults(new Set(clean.slice(0, findCount).map(scrapeKey)))
          setScrapeBusy(false); toast('Found ' + clean.length + ' places.')
          return
        }
        const status = String(job.status || job.state || job.job?.status || '').toLowerCase()
        if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) throw new Error('Scrape job ' + status)
      }
      const csvRes = await fetch(base + '/api/v1/jobs/' + encodeURIComponent(id) + '/download')
      if (csvRes.ok) {
        const rows = parseCsv(await csvRes.text())
        if (rows.length > 1) {
          const head = rows[0].map(h => h.trim())
          const jsonRows = rows.slice(1).map(row => Object.fromEntries(head.map((h, i) => [h, row[i] || ''])))
          setScrapeResults(jsonRows.slice(0, Math.max(findCount, 10))); setSelectedResults(new Set(jsonRows.slice(0, findCount).map(scrapeKey))); toast('Results ready.')
        } else toast('The scraper finished without results.', 'error')
      } else toast('No results returned yet. Check the scraper at ' + base + '.', 'error')
    } catch (e) {
      const msg = e instanceof TypeError ? 'Could not reach the local scraper. Make sure Docker is running on http://localhost:8080 and allow browser requests if prompted.' : (e as Error).message
      toast(msg, 'error')
    } finally { setScrapeBusy(false) }
  }
  const saveScraped = async () => {
    const chosen = scrapeResults.filter((r, i) => selectedResults.has(scrapeKey(r, i))).map(mapScrapeRow).filter(r => r.agency_name)
    if (!chosen.length) return toast('Select at least one lead.', 'error')
    const seen = [...prospects]; const out: Record<string, unknown>[] = []; let skipped = 0
    for (const row of chosen) {
      const p = row as unknown as Prospect
      if (findDuplicate(seen, p.email, p.website) || seen.some(x => x.agency_name.toLowerCase() === p.agency_name.toLowerCase())) { skipped++; continue }
      out.push(row); seen.push(p)
    }
    const count = await createMany('prospects', out)
    toast('Saved ' + count + ' leads to this business' + (skipped ? '; skipped ' + skipped + ' duplicates.' : '.'))
    if (count) { setScrapeResults([]); setSelectedResults(new Set()); setView('all') }
  }

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text()); if (rows.length < 2) return toast('That file has no rows.', 'error')
    const head = rows[0].map(h => h.trim().toLowerCase()); const col = (...k: string[]) => head.findIndex(h => k.some(x => h.includes(x)))
    const ci = { name: col('business', 'company', 'name'), site: col('website', 'url'), email: col('email'), person: col('contact', 'person'), phone: col('phone'), country: col('country'), city: col('city', 'location'), cat: col('categor'), src: col('source'), notes: col('note') }
    if (ci.name < 0) return toast('Add a “Business name” column in the first row.', 'error')
    const seen = [...prospects]; const out: Record<string, unknown>[] = []; let skipped = 0
    for (const r of rows.slice(1)) {
      const g = (i: number) => (i >= 0 ? (r[i] || '').trim() : ''); const nm = g(ci.name); if (!nm) { skipped++; continue }
      const em = g(ci.email), site = g(ci.site)
      if (findDuplicate(seen, em, site) || seen.some(x => !em && !site && x.agency_name.toLowerCase() === nm.toLowerCase())) { skipped++; continue }
      const row = { business_id: bizId, agency_name: nm.slice(0, 200), email: em || null, website: site ? normUrl(site) : null, contact_name: g(ci.person) || null, phone: g(ci.phone) || null, country: g(ci.country) || null, city: g(ci.city) || null, category: g(ci.cat) || null, source: g(ci.src) || null, notes: g(ci.notes) || null, stage: 'new' }
      out.push(row); seen.push({ ...(row as unknown as Prospect), id: 'x' + out.length })
    }
    toast(`Imported ${await createMany('prospects', out)}${skipped ? `, skipped ${skipped} duplicates or empty rows` : ''}`)
  }
  const exportCsv = () => download('yogecreatives-leads.csv', toCsv([['Business', 'Contact', 'Email', 'Phone', 'Website', 'Country', 'City', 'Category', 'Source', 'Stage', 'Last contact', 'Next action', 'Follow-up date', 'Notes'],
    ...prospects.map(p => [p.agency_name, p.contact_name, p.email, p.phone, p.website, p.country, p.city, p.category, p.source, STAGE[p.stage], p.last_contacted_at?.slice(0, 10), p.next_action, p.next_action_date, p.notes])]))
  const dropTo = async (st: Stage) => { const p = prospects.find(x => x.id === drag.current); drag.current = null; if (p && p.stage !== st) { await update('prospects', p.id, { stage: st }); await create('prospect_activities', { prospect_id: p.id, kind: 'stage_change', note: `Moved to ${STAGE[st]}` }) } }
  void hostOf

  return (
    <>
      <div className="wshead" style={{ marginBottom: 6 }}><div><h1 className="pagetitle">Pipeline</h1><p className="pagesub">From first contact to a won project.</p></div>
        <button className="btn primary" onClick={() => open('lead')}><Icon name="plus" size={18} /> Add Lead</button></div>
      <div className="tabrow"><button className={view === 'find' ? 'on' : ''} onClick={() => setView('find')}>Find Leads</button><button className={view === 'follow' ? 'on' : ''} onClick={() => setView('follow')}>Follow-ups{due.length ? ` · ${due.length}` : ''}</button><button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>All leads · {prospects.length}</button><button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button></div>

      {view === 'find' && <>
        <div className="listcard" style={{ padding: 16 }}>
          <div className="sectionlabel" style={{ marginTop: 0 }}>Google Maps lead finder</div>
          <div className="row" style={{ paddingLeft: 0, paddingRight: 0 }}><div className="row-main">
            <div className="row-title">Search your local scraper</div>
            <div className="row-sub">Runs against the Google Maps scraper on your computer. Nothing is saved until you choose the leads.</div>
          </div></div>
          <div className="formgrid">
            <label>Business category<input className="input" value={findCategory} onChange={e => setFindCategory(e.target.value)} placeholder="cleaning company" /></label>
            <label>Location<input className="input" value={findLocation} onChange={e => setFindLocation(e.target.value)} placeholder="Houston, TX" /></label>
            <label>Leads to keep<select className="input" value={findCount} onChange={e => setFindCount(Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label>
            <label>Scraper URL<input className="input" value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} placeholder="http://localhost:8080" /></label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} disabled={scrapeBusy} onClick={scrape}>{scrapeBusy ? 'Searching…' : 'Find leads'}</button>
          {scrapeJobId && <div className="row-sub" style={{ marginTop: 10 }}>Job {scrapeJobId} · results are being collected locally.</div>}
        </div>
        {scrapeResults.length > 0 && <div className="group">
          <div className="sectionlabel">Review results · {scrapeResults.length}</div>
          {scrapeResults.map((r, i) => {
            const key = scrapeKey(r, i); const checked = selectedResults.has(key)
            return <label key={key} className="row" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={checked} onChange={() => setSelectedResults(prev => { const n = new Set(prev); checked ? n.delete(key) : n.add(key); return n })} />
              <div className="row-main"><div className="row-title">{String(r.title || r.name || 'Unnamed business')}</div><div className="row-sub">{[r.category, r.city || r.address, r.phone, r.review_rating ? String(r.review_rating) + '★' : '', r.review_count ? String(r.review_count) + ' reviews' : ''].filter(Boolean).join(' · ')}</div><div className="row-sub">{String(r.website || r.link || '')}</div></div>
            </label>
          })}
          <div className="pills"><button className="pill" onClick={() => setSelectedResults(new Set(scrapeResults.map(scrapeKey)))}>Select all</button><button className="pill" onClick={() => setSelectedResults(new Set())}>Clear</button><button className="pill" onClick={saveScraped}>Save selected to this business</button></div>
        </div>}
      </>}

      {view === 'follow' && <>
        <Group title={`Follow-ups due · ${due.length}`} items={due.map(p => <Action key={p.id} p={p} />)} empty="No follow-ups due. Add a follow-up date on a lead to see it here." />
        <Group title={`New leads · ${fresh.length}`} items={fresh.slice(0, 15).map(p => <Action key={p.id} p={p} />)} />
        {!prospects.length && <div className="deck-empty">No leads yet. Tap Add Lead, or import a CSV from All leads.</div>}
      </>}

      {view === 'all' && <>
        <div className="search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search business, contact, city, source" /></div>
        <div className="tabrow"><button className={stage === 'all' ? 'on' : ''} onClick={() => setStage('all')}>All</button>{CLIENT_STAGES.map(s => <button key={s} className={stage === s ? 'on' : ''} onClick={() => setStage(s)}>{STAGE[s]} · {prospects.filter(p => p.stage === s).length}</button>)}</div>
        <div className="pills"><select className="pill" value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="follow">Sort: follow-up date</option><option value="recent">Sort: newest</option><option value="name">Sort: name</option></select>
          <button className="pill" onClick={() => fileRef.current?.click()}>Import CSV</button><button className="pill" onClick={exportCsv}>Export CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = '' }} /></div>
        <Group items={list.map(p => <Plain key={p.id} p={p} />)} empty={prospects.length ? 'No leads match.' : 'No leads yet. Tap Add Lead.'} />
      </>}

      {view === 'board' && <>
        <p className="groupnote">Swipe sideways. Tap a lead to move it (on a computer you can also drag).</p>
        <div className="board">{CLIENT_STAGES.map(st => {
          const l = prospects.filter(p => p.stage === st)
          return <div key={st} className="bcol" onDragOver={e => e.preventDefault()} onDrop={() => dropTo(st)}>
            <div className="ch">{STAGE[st]}<span>{l.length}</span></div>
            {l.slice(0, 30).map(p => <button key={p.id} className="bcard" draggable onDragStart={() => (drag.current = p.id)} onClick={() => open('lead', p)}>
              <div className="t">{p.agency_name}</div><div className="s">{[p.city || p.country, p.source].filter(Boolean).join(' · ')}</div>
              <div className="f"><span className="s">{p.contact_name ?? ''}</span>{p.next_action_date && isOpenLead(p) && <span className={`chip ${p.next_action_date <= today ? 'red' : ''}`}>{dueLabel(p.next_action_date, today)}</span>}</div></button>)}
          </div>
        })}</div>
      </>}
    </>
  )
}
