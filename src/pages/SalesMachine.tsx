import { useState } from 'react'
import { useData } from '../lib/data'
import { visibleBusinesses } from '../lib/workspaces'
import { Icon } from '../ui/Icon'
import { YcSales } from '../workspaces/yc/Sales'
import { YcFinder } from '../workspaces/yc/Finder'
import { YcAssistant } from '../workspaces/yc/Assistant'

type ToolTab = 'sales' | 'finder' | 'assistant'

export function SalesMachine() {
  const { businesses } = useData()
  const list = visibleBusinesses(businesses)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [tab, setTab] = useState<ToolTab>('sales')
  const business = list.find(b => b.id === businessId) ?? null

  if (!business) {
    return (
      <div className="shell2 sales-machine-shell"><div className="page">
        <div className="wshead">
          <div>
            <div className="eyebrow">YOGE COMMAND CENTRE</div>
            <h1 className="pagetitle">Sales Machine</h1>
            <p className="pagesub">One sales engine. Separate leads, pipelines and outreach for every business.</p>
          </div>
        </div>

        <div className="sectionlabel">Select business</div>
        <div className="group">
          {list.map(b => (
            <button key={b.id} className="row" onClick={() => setBusinessId(b.id)}>
              <span className="tile sm"><Icon name="briefcase" size={17} /></span>
              <div className="row-main">
                <div className="row-title">{b.name}</div>
                <div className="row-sub">Sales activity stays assigned to {b.name}.</div>
              </div>
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </div>

        {!list.length && <div className="deck-empty">No businesses are available for your account.</div>}

        <div className="sectionlabel">How it works</div>
        <div className="listcard">
          <div className="row"><div className="row-main"><div className="row-title">Select a business first</div><div className="row-sub">Every prospect belongs to the selected business through its business_id.</div></div></div>
          <div className="row"><div className="row-main"><div className="row-title">Research and review</div><div className="row-sub">The same Finder and evidence-first review workflow can be used across businesses.</div></div></div>
          <div className="row"><div className="row-main"><div className="row-title">Draft and follow up</div><div className="row-sub">AI assists with drafts, while you remain in control of decisions and sending.</div></div></div>
        </div>
      </div></div>
    )
  }

  return (
    <div className="shell2 sales-machine-shell"><div className="page">
      <div className="wshead">
        <div>
          <button className="chip-sw" onClick={() => setBusinessId(null)}>
            <span className="av">{business.name[0]}</span>{business.name}<span className="sw-chevron">Change</span>
          </button>
          <p className="pagesub" style={{ marginTop: 8 }}>Sales Machine · leads and outreach stay with this business.</p>
        </div>
      </div>

      <div className="tabrow" style={{ marginTop: 8 }}>
        <button className={tab === 'sales' ? 'on' : ''} onClick={() => setTab('sales')}>Sales</button>
        <button className={tab === 'finder' ? 'on' : ''} onClick={() => setTab('finder')}>Finder</button>
        <button className={tab === 'assistant' ? 'on' : ''} onClick={() => setTab('assistant')}>AI Assistant</button>
      </div>

      {tab === 'sales' && <YcSales bizId={business.id} businessName={business.name} />}
      {tab === 'finder' && <YcFinder bizId={business.id} businessName={business.name} />}
      {tab === 'assistant' && <YcAssistant bizId={business.id} businessName={business.name} />}
    </div></div>
  )
}
