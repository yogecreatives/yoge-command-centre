import { useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { Prospect } from '../../lib/types'
import { fmtDate, todayISO } from '../../lib/dates'
import { go } from '../../lib/route'

type ReviewStatus = 'pending' | 'approved' | 'hold' | 'rejected'
type Classification = 'unreviewed' | 'good' | 'needs_improvement' | 'outdated'

const usCountries = ['us', 'usa', 'united states', 'united states of america']

function isUs(p: Prospect) {
  return usCountries.includes((p.country || '').trim().toLowerCase())
}

function researchScore(p: Prospect) {
  return [
    !!p.website,
    p.google_rating !== null,
    p.google_review_count !== null,
    p.wix_detected !== null,
    !!p.wix_evidence,
    !!p.website_screenshot_url,
    !!p.research_summary,
  ].filter(Boolean).length
}

export function YcFinder({ bizId }: { bizId: string }) {
  const { prospects, update, create } = useData()
  const open = useEditor()
  const today = todayISO()
  const [q, setQ] = useState('')
  const [queue, setQueue] = useState<'review' | 'research' | 'approved' | 'all'>('review')
  const [sort, setSort] = useState<'priority' | 'newest' | 'name'>('priority')

  const leads = useMemo(() => prospects.filter(p => p.business_id === bizId && isUs(p)), [prospects, bizId])

  const counts = useMemo(() => ({
    review: leads.filter(p => p.review_status === 'pending').length,
    research: leads.filter(p => researchScore(p) < 4 && p.review_status !== 'rejected').length,
    approved: leads.filter(p => p.review_status === 'approved').length,
  }), [leads])

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    let rows = leads.filter(p => {
      const matchesQueue =
        queue === 'review' ? p.review_status === 'pending' :
        queue === 'research' ? researchScore(p) < 4 && p.review_status !== 'rejected' :
        queue === 'approved' ? p.review_status === 'approved' :
        true
      const hay = [p.agency_name, p.city, p.category, p.website, p.source, p.research_summary].filter(Boolean).join(' ').toLowerCase()
      return matchesQueue && (!term || hay.includes(term))
    })

    rows = [...rows]
    if (sort === 'priority') {
      const rank = { high: 0, medium: 1, low: 2 }
      rows.sort((a, b) => (rank[a.priority] - rank[b.priority]) || b.created_at.localeCompare(a.created_at))
    } else if (sort === 'newest') rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    else rows.sort((a, b) => a.agency_name.localeCompare(b.agency_name))
    return rows
  }, [leads, q, queue, sort])

  const setClassification = async (p: Prospect, value: Classification) => {
    await update('prospects', p.id, { website_classification: value })
  }

  const setPriority = async (p: Prospect, value: 'low' | 'medium' | 'high') => {
    await update('prospects', p.id, { priority: value })
  }

  const review = async (p: Prospect, status: ReviewStatus) => {
    const ok = await update('prospects', p.id, { review_status: status })
    if (ok) {
      await create('prospect_activities', {
        prospect_id: p.id,
        kind: status === 'approved' ? 'approval' : status === 'rejected' ? 'rejection' : 'note',
        note: 'Finder review: ' + status,
      })
    }
  }

  return (
    <>
      <div className="wshead" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="pagetitle">YogeStudio Finder</h1>
          <p className="pagesub">Find small batches of quality US prospects. Research first. You decide the pitch.</p>
        </div>
        <button className="btn" onClick={() => go('/w/yogecreatives/pipeline')}>Import leads</button>
      </div>

      <div className="kstats four">
        <div><b>{leads.length}</b><span>US prospects</span></div>
        <div><b>{counts.review}</b><span>Waiting for review</span></div>
        <div><b>{counts.research}</b><span>Need research</span></div>
        <div><b>{counts.approved}</b><span>Approved</span></div>
      </div>

      <div className="listcard" style={{ marginTop: 14 }}>
        <div className="sectionlabel" style={{ marginTop: 0 }}>Finder workflow</div>
        <div className="row"><div className="row-main"><div className="row-title">1 · Bring in a small batch</div><div className="row-sub">Use your Google Maps scraper / CSV. Keep quality higher than volume.</div></div></div>
        <div className="row"><div className="row-main"><div className="row-title">2 · Research the evidence</div><div className="row-sub">Website, Google rating/reviews, Wix evidence, screenshot and notes.</div></div></div>
        <div className="row"><div className="row-main"><div className="row-title">3 · You classify the website</div><div className="row-sub">Good · Needs improvement · Outdated. Finder never makes this decision for you.</div></div></div>
        <div className="row"><div className="row-main"><div className="row-title">4 · Approve the prospects worth contacting</div><div className="row-sub">Only approved prospects move into the sales workflow.</div></div></div>
      </div>

      <div className="tabrow" style={{ marginTop: 14 }}>
        <button className={queue === 'review' ? 'on' : ''} onClick={() => setQueue('review')}>Review · {counts.review}</button>
        <button className={queue === 'research' ? 'on' : ''} onClick={() => setQueue('research')}>Need research · {counts.research}</button>
        <button className={queue === 'approved' ? 'on' : ''} onClick={() => setQueue('approved')}>Approved · {counts.approved}</button>
        <button className={queue === 'all' ? 'on' : ''} onClick={() => setQueue('all')}>All · {leads.length}</button>
      </div>

      <div className="search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search business, city, category, website" /></div>
      <div className="pills">
        <select className="pill" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="priority">Sort: priority</option>
          <option value="newest">Sort: newest</option>
          <option value="name">Sort: name</option>
        </select>
      </div>

      {!leads.length && (
        <div className="deck-empty">
          No US prospects yet. Import a small CSV batch from Pipeline.
          <div style={{ marginTop: 12 }}><button className="btn" onClick={() => go('/w/yogecreatives/pipeline')}>Open Pipeline → Import CSV</button></div>
        </div>
      )}

      <div className="group">
        {list.map(p => <FinderCard key={p.id} p={p} today={today} onOpen={() => open('lead', p)} onClassify={setClassification} onPriority={setPriority} onReview={review} />)}
      </div>

      {!!leads.length && !list.length && <div className="deck-empty">Nothing matches this Finder queue.</div>}

      <div className="sectionlabel">Evidence rule</div>
      <div className="listcard">
        <div className="row">
          <div className="row-main">
            <div className="row-title">No automatic “bad website” verdicts</div>
            <div className="row-sub">The Finder surfaces evidence. You make the Good / Needs improvement / Outdated decision and choose the pitch priority.</div>
          </div>
        </div>
      </div>
    </>
  )
}

function FinderCard({ p, today, onOpen, onClassify, onPriority, onReview }: {
  p: Prospect
  today: string
  onOpen: () => void
  onClassify: (p: Prospect, value: Classification) => void
  onPriority: (p: Prospect, value: 'low' | 'medium' | 'high') => void
  onReview: (p: Prospect, status: ReviewStatus) => void
}) {
  const score = researchScore(p)
  const classification = p.website_classification
  const website = p.website ? (p.website.startsWith('http') ? p.website : 'https://' + p.website) : null

  return (
    <div className="row col">
      <div className="rt">
        <button className="row-main" onClick={onOpen}>
          <div className="row-title">{p.agency_name}</div>
          <div className="row-sub">{[p.city, p.category, p.source].filter(Boolean).join(' · ') || 'US prospect'}</div>
          <div className="row-sub">
            {[p.google_rating !== null ? p.google_rating + '★' : null, p.google_review_count !== null ? p.google_review_count + ' reviews' : null, p.wix_detected === true ? 'Wix detected' : p.wix_detected === false ? 'Not Wix' : null].filter(Boolean).join(' · ') || 'Research not added yet'}
          </div>
        </button>
        <span className={'chip ' + (p.priority === 'high' ? 'red' : p.review_status === 'approved' ? 'lime' : '')}>{p.review_status}</span>
      </div>

      {p.website_screenshot_url && (
        <a href={p.website_screenshot_url} target="_blank" rel="noreferrer" className="row-sub" style={{ padding: '0 8px 8px' }}>View website screenshot →</a>
      )}

      {p.research_summary && <div className="row-sub" style={{ padding: '0 8px 8px' }}>{p.research_summary}</div>}

      <div className="row-sub" style={{ padding: '0 8px 8px' }}>
        Research evidence {score}/7 · {score >= 6 ? 'Strong' : score >= 4 ? 'Enough to review' : 'Incomplete'}
        {p.next_action_date && p.next_action_date <= today ? ' · Follow-up due' : ''}
        {p.outreach_draft ? ' · Outreach draft ready' : ''}
      </div>

      <div className="act">
        {website && <a className="mini" href={website} target="_blank" rel="noreferrer">Website</a>}
        <button className={'mini ' + (classification === 'good' ? 'rep' : '')} onClick={() => onClassify(p, 'good')}>Good</button>
        <button className={'mini ' + (classification === 'needs_improvement' ? 'rep' : '')} onClick={() => onClassify(p, 'needs_improvement')}>Needs improvement</button>
        <button className={'mini ' + (classification === 'outdated' ? 'rep' : '')} onClick={() => onClassify(p, 'outdated')}>Outdated</button>
      </div>

      <div className="act">
        <button className={'mini ' + (p.priority === 'high' ? 'rep' : '')} onClick={() => onPriority(p, 'high')}>High</button>
        <button className={'mini ' + (p.priority === 'medium' ? 'rep' : '')} onClick={() => onPriority(p, 'medium')}>Medium</button>
        <button className={'mini ' + (p.priority === 'low' ? 'rep' : '')} onClick={() => onPriority(p, 'low')}>Low</button>
        {p.review_status !== 'approved' && <button className="mini rep" onClick={() => onReview(p, 'approved')}>Approve</button>}
        {p.review_status !== 'hold' && <button className="mini" onClick={() => onReview(p, 'hold')}>Hold</button>}
        {p.review_status !== 'rejected' && <button className="mini" onClick={() => onReview(p, 'rejected')}>Reject</button>}
      </div>

      <div className="row-sub" style={{ padding: '0 8px 8px' }}>
        {classification === 'unreviewed' ? 'Website not classified yet' : classification === 'needs_improvement' ? 'Needs improvement' : classification === 'outdated' ? 'Outdated' : 'Good'}
        {p.priority ? ' · Priority ' + p.priority : ''}
        {p.next_action_date ? ' · Next action ' + fmtDate(p.next_action_date) : ''}
      </div>
    </div>
  )
}
