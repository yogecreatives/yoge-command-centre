import { useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { go } from '../../lib/route'
import { Prospect } from '../../lib/types'
import { todayISO, fmtDate } from '../../lib/dates'

type ReviewStatus = 'pending' | 'approved' | 'hold' | 'rejected'
type Classification = 'unreviewed' | 'good' | 'needs_improvement' | 'outdated'

const classificationLabel: Record<Classification, string> = {
  unreviewed: 'Not classified',
  good: 'Good',
  needs_improvement: 'Needs improvement',
  outdated: 'Outdated',
}

export function YcSales({ bizId, businessName = 'Yogecreatives', businessSlug = 'yogecreatives' }: { bizId: string; businessName?: string; businessSlug?: string }) {
  const { prospects, settings, update, create } = useData()
  const open = useEditor()
  const today = todayISO()
  const [filter, setFilter] = useState<'review' | 'approved' | 'all'>('review')
  const leads = useMemo(() => prospects.filter(p => p.business_id === bizId), [prospects, bizId])
  const us = leads
  const goal = businessName === 'Yogecreatives' ? (settings?.direct_us_goal ?? 3) : null
  const won = us.filter(p => p.stage === 'won').length
  const pending = us.filter(p => p.review_status === 'pending')
  const approved = us.filter(p => p.review_status === 'approved')
  const interested = us.filter(p => ['interested','call_booked','proposal_sent','negotiation'].includes(p.stage))
  const due = us.filter(p => p.next_action_date && p.next_action_date <= today && !['won','lost','not_interested'].includes(p.stage))
  const proposals = us.filter(p => ['proposal_sent','negotiation'].includes(p.stage))
  const list = filter === 'review' ? pending : filter === 'approved' ? approved : us

  const nextBest = useMemo(() => {
    const candidates = [
      ...due.map(p => ({ p, score: 100 })),
      ...interested.map(p => ({ p, score: 90 })),
      ...approved.filter(p => !p.outreach_draft).map(p => ({ p, score: 80 })),
      ...pending.filter(p => p.priority === 'high').map(p => ({ p, score: 70 })),
    ]
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0]?.p ?? null
  }, [due, interested, approved, pending])

  const review = async (p: Prospect, status: ReviewStatus) => {
    const ok = await update('prospects', p.id, { review_status: status })
    if (ok) {
      await create('prospect_activities', { prospect_id: p.id, kind: status === 'approved' ? 'approval' : status === 'rejected' ? 'rejection' : 'note', note: 'Review: ' + status })
    }
  }

  const classify = async (p: Prospect, value: Classification) => { await update('prospects', p.id, { website_classification: value }) }
  const setPriority = async (p: Prospect, value: 'low'|'medium'|'high') => { await update('prospects', p.id, { priority: value }) }

  return (
    <>
      <div className="wshead" style={{ marginBottom: 6 }}>
        <div><h1 className="pagetitle">{businessName} Sales</h1><p className="pagesub">Quality-first pipeline · {goal !== null ? `goal: ${goal} direct clients` : 'shared sales pipeline'}</p></div>
        <button className="btn primary" onClick={() => go('/w/' + businessSlug + '/pipeline')}>Open pipeline</button>
      </div>

      <div className="kstats four">
        <div><b>{won}{goal !== null ? '/' + goal : ''}</b><span>Clients won</span></div>
        <div><b>{pending.length}</b><span>Waiting for review</span></div>
        <div><b>{approved.length}</b><span>Approved prospects</span></div>
        <div><b>{proposals.length}</b><span>Proposal / negotiation</span></div>
      </div>

      {nextBest && (
        <div className="listcard" style={{ marginTop: 14 }}>
          <div className="sectionlabel" style={{ marginTop: 0 }}>Next best action</div>
          <button className="row" onClick={() => open('lead', nextBest)}>
            <div className="row-main">
              <div className="row-title">{nextBest.agency_name}</div>
              <div className="row-sub">{nextBest.next_action || (nextBest.next_action_date && nextBest.next_action_date <= today ? 'Follow up now' : 'Review and prepare outreach')}</div>
            </div>
            <span className="chip">{nextBest.priority}</span>
          </button>
        </div>
      )}

      <div className="tabrow" style={{ marginTop: 14 }}>
        <button className={filter === 'review' ? 'on' : ''} onClick={() => setFilter('review')}>Review · {pending.length}</button>
        <button className={filter === 'approved' ? 'on' : ''} onClick={() => setFilter('approved')}>Approved · {approved.length}</button>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All · {us.length}</button>
      </div>

      {!us.length && (
        <div className="deck-empty">
          No prospects are assigned to this business yet. Import your first small batch from the Pipeline.
          <div style={{ marginTop: 12 }}><button className="btn" onClick={() => go('/w/yogecreatives/pipeline')}>Go to Pipeline → Import CSV</button></div>
        </div>
      )}

      <div className="group">
        {list.map(p => <ReviewCard key={p.id} p={p} onOpen={() => open('lead', p)} onReview={review} onClassify={classify} onPriority={setPriority} />)}
      </div>

      <div className="sectionlabel">Sales rule</div>
      <div className="listcard">
        <div className="row">
          <div className="row-main">
            <div className="row-title">Human approval stays in control</div>
            <div className="row-sub">AI can research and draft. It does not automatically decide that a website is bad or send outreach without your approval.</div>
          </div>
        </div>
      </div>
    </>
  )
}

function ReviewCard({ p, onOpen, onReview, onClassify, onPriority }: {
  p: Prospect
  onOpen: () => void
  onReview: (p: Prospect, s: ReviewStatus) => void
  onClassify: (p: Prospect, s: Classification) => void
  onPriority: (p: Prospect, s: 'low'|'medium'|'high') => void
}) {
  return (
    <div className="row col">
      <div className="rt">
        <button className="row-main" onClick={onOpen}>
          <div className="row-title">{p.agency_name}</div>
          <div className="row-sub">{[p.city, p.category, p.website].filter(Boolean).join(' · ')}</div>
          <div className="row-sub">{[p.google_rating ? p.google_rating + '★' : null, p.google_review_count ? p.google_review_count + ' reviews' : null, p.wix_detected === true ? 'Wix detected' : p.wix_detected === false ? 'Not Wix' : null].filter(Boolean).join(' · ') || 'Research not added yet'}</div>
        </button>
        <span className={'chip ' + (p.priority === 'high' ? 'red' : p.review_status === 'approved' ? 'lime' : '')}>{p.review_status}</span>
      </div>

      {p.research_summary && <div className="row-sub" style={{ padding: '0 8px 8px' }}>{p.research_summary}</div>}

      <div className="act">
        <button className="mini" onClick={() => onClassify(p, 'good')}>Good</button>
        <button className="mini" onClick={() => onClassify(p, 'needs_improvement')}>Needs improvement</button>
        <button className="mini" onClick={() => onClassify(p, 'outdated')}>Outdated</button>
      </div>

      <div className="act">
        <button className="mini" onClick={() => onPriority(p, 'high')}>High</button>
        <button className="mini" onClick={() => onPriority(p, 'medium')}>Medium</button>
        <button className="mini" onClick={() => onPriority(p, 'low')}>Low</button>
        {p.review_status !== 'approved' && <button className="mini rep" onClick={() => onReview(p, 'approved')}>Approve</button>}
        {p.review_status !== 'hold' && <button className="mini" onClick={() => onReview(p, 'hold')}>Hold</button>}
        {p.review_status !== 'rejected' && <button className="mini" onClick={() => onReview(p, 'rejected')}>Reject</button>}
      </div>

      <div className="row-sub" style={{ padding: '0 8px 8px' }}>
        {classificationLabel[p.website_classification as Classification]} · Priority {p.priority}
        {p.next_action_date ? ' · Next action ' + fmtDate(p.next_action_date) : ''}
      </div>
    </div>
  )
}
