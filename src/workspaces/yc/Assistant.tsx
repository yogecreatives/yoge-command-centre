import { useMemo, useState } from 'react'
import { useData } from '../../lib/data'
import { useEditor } from '../../components/editorContext'
import { Prospect } from '../../lib/types'

const DEFAULT_OLLAMA = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2:3b'

function buildPrompt(p: Prospect) {
  return [
    'You are the sales assistant for Yogecreatives, a Wix Studio web design agency.',
    'Write a short, human, non-pushy first outreach message to this US business.',
    'Do not claim the website is bad. Do not invent facts. Use only the evidence supplied.',
    'Mention one specific relevant observation. Keep it conversational. No generic marketing fluff.',
    'Do not mention AI. End with a simple question.',
    '',
    'BUSINESS: ' + p.agency_name,
    'CATEGORY: ' + (p.category || 'Unknown'),
    'CITY: ' + (p.city || 'Unknown'),
    'WEBSITE: ' + (p.website || 'None'),
    'GOOGLE RATING: ' + (p.google_rating ?? 'Unknown'),
    'GOOGLE REVIEWS: ' + (p.google_review_count ?? 'Unknown'),
    'WIX DETECTED: ' + (p.wix_detected === null ? 'Unknown' : p.wix_detected ? 'Yes' : 'No'),
    'WIX EVIDENCE: ' + (p.wix_evidence || 'None'),
    'WEBSITE CLASSIFICATION: ' + (p.website_classification || 'Unreviewed'),
    'RESEARCH SUMMARY: ' + (p.research_summary || 'None'),
    'DECISION NOTES: ' + (p.decision_notes || 'None'),
    '',
    'OUTPUT ONLY THE MESSAGE.'
  ].join('\n')
}

function fallbackDraft(p: Prospect) {
  const name = p.agency_name || 'there'
  const observation = p.research_summary || (p.wix_detected ? 'I noticed your site is built on Wix.' : 'I came across your website while looking at businesses in your area.')
  return 'Hi ' + name + ',\n\nI came across your business and had a look at your website. ' + observation + ' I work with Yogecreatives, designing and developing Wix Studio websites for businesses.\n\nWould you be open to a quick chat about the site?'
}

export function YcAssistant({ bizId }: { bizId: string }) {
  const { prospects, update, create } = useData()
  const open = useEditor()
  const [selectedId, setSelectedId] = useState('')
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem('yoge_ollama_url') || DEFAULT_OLLAMA)
  const [model, setModel] = useState(() => localStorage.getItem('yoge_ollama_model') || DEFAULT_MODEL)
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('')

  const approved = useMemo(() => prospects
    .filter(p => p.business_id === bizId && ['us', 'usa', 'united states'].includes((p.country || '').toLowerCase()) && p.review_status === 'approved')
    .sort((a, b) => a.agency_name.localeCompare(b.agency_name)), [prospects, bizId])

  const selected = approved.find(p => p.id === selectedId) || approved[0] || null

  const saveSettings = () => {
    localStorage.setItem('yoge_ollama_url', endpoint.replace(/\/$/, ''))
    localStorage.setItem('yoge_ollama_model', model)
    setStatus('Ollama settings saved locally.')
  }

  const generate = async () => {
    if (!selected) return
    setStatus('Generating with local Ollama…')
    const prompt = buildPrompt(selected)
    try {
      const response = await fetch(endpoint.replace(/\/$/, '') + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.4 } }),
      })
      if (!response.ok) throw new Error('Ollama returned ' + response.status)
      const data = await response.json()
      const text = String(data.response || '').trim()
      if (!text) throw new Error('Empty response')
      setDraft(text)
      await update('prospects', selected.id, { outreach_draft: text, outreach_channel: 'email' })
      await create('prospect_activities', { prospect_id: selected.id, kind: 'research', note: 'AI Sales Assistant generated an outreach draft.' })
      setStatus('Draft generated and saved to the prospect.')
    } catch (e) {
      setDraft(fallbackDraft(selected))
      setStatus('Local Ollama is not reachable. A safe fallback draft was created; connect Ollama to generate with AI.')
    }
  }

  const copyPrompt = async () => {
    if (!selected) return
    await navigator.clipboard?.writeText(buildPrompt(selected))
    setStatus('Prompt copied.')
  }

  const saveDraft = async () => {
    if (!selected || !draft.trim()) return
    await update('prospects', selected.id, { outreach_draft: draft.trim(), outreach_channel: 'email' })
    setStatus('Draft saved.')
  }

  return (
    <>
      <div className="wshead" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="pagetitle">AI Sales Assistant</h1>
          <p className="pagesub">Research → personalized draft → your approval → outreach.</p>
        </div>
      </div>

      <div className="listcard">
        <div className="sectionlabel" style={{ marginTop: 0 }}>1 · Choose an approved prospect</div>
        <select className="pill" value={selected?.id || ''} onChange={e => { setSelectedId(e.target.value); setDraft(''); setStatus('') }}>
          {!approved.length && <option value="">No approved US prospects</option>}
          {approved.map(p => <option key={p.id} value={p.id}>{p.agency_name} · {p.city || 'US'}</option>)}
        </select>
        {selected && (
          <button className="row" style={{ marginTop: 10 }} onClick={() => open('lead', selected)}>
            <div className="row-main">
              <div className="row-title">{selected.agency_name}</div>
              <div className="row-sub">{[selected.website, selected.google_rating ? selected.google_rating + '★' : null, selected.google_review_count ? selected.google_review_count + ' reviews' : null, selected.wix_detected === true ? 'Wix detected' : null].filter(Boolean).join(' · ')}</div>
              <div className="row-sub">{selected.research_summary || 'No research summary yet.'}</div>
            </div>
            <span className="chip lime">approved</span>
          </button>
        )}
      </div>

      <div className="listcard" style={{ marginTop: 14 }}>
        <div className="sectionlabel" style={{ marginTop: 0 }}>2 · Local AI</div>
        <div className="row">
          <div className="row-main">
            <div className="row-title">Ollama endpoint</div>
            <input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="http://localhost:11434" />
          </div>
        </div>
        <div className="row">
          <div className="row-main">
            <div className="row-title">Model</div>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="llama3.2:3b" />
          </div>
        </div>
        <div className="act">
          <button className="mini" onClick={saveSettings}>Save local settings</button>
          <button className="mini rep" disabled={!selected} onClick={generate}>Generate draft</button>
          <button className="mini" disabled={!selected} onClick={copyPrompt}>Copy AI prompt</button>
        </div>
      </div>

      {draft && (
        <div className="listcard" style={{ marginTop: 14 }}>
          <div className="sectionlabel" style={{ marginTop: 0 }}>3 · Review before sending</div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={9} />
          <div className="act">
            <button className="mini rep" onClick={saveDraft}>Save draft</button>
          </div>
          <div className="row-sub" style={{ padding: '8px 0 0' }}>Nothing is sent automatically. You decide whether the message is good enough to send.</div>
        </div>
      )}

      {status && <div className="row-sub" style={{ marginTop: 10 }}>{status}</div>}

      <div className="sectionlabel">Sales guardrail</div>
      <div className="listcard">
        <div className="row">
          <div className="row-main">
            <div className="row-title">AI drafts. You decide.</div>
            <div className="row-sub">The assistant uses the prospect evidence already collected. It never decides that a website needs a redesign and never sends outreach automatically.</div>
          </div>
        </div>
      </div>
    </>
  )
}
