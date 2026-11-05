import { useState } from 'react'
import { useData } from '../lib/data'
import { visibleBusinesses } from '../lib/workspaces'
import { Icon } from '../ui/Icon'
import { BizSwitcher } from '../ui/BizSwitcher'
import { YcSales } from '../workspaces/yc/Sales'
import { YcFinder } from '../workspaces/yc/Finder'
import { YcAssistant } from '../workspaces/yc/Assistant'
import { YcPipeline } from '../workspaces/yc/Pipeline'
import { go } from '../lib/route'

type ToolTab = 'leads' | 'review' | 'assistant' | 'sales'

export function SalesMachine() {
  const { businesses } = useData()
  const list = visibleBusinesses(businesses)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [tab, setTab] = useState<ToolTab>('leads')
  const business = list.find(b => b.id === businessId) ?? null

  if (!business) {
    return (
      <div className="shell2 sales-machine-shell"><div className="page">
        <div className="wshead">
          <div>
            <BizSwitcher label="Sales Machine" current="sales-machine" />
            <p className="pagesub" style={{ marginTop: 8 }}>Sales Machine · one shared sales engine for every Yoge business.</p>
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

        <div className="sectionlabel">Sales Machine</div>
        <div className="listcard">
          <div className="row"><div className="row-main"><div className="row-title">Find → Research → Approve</div><div className="row-sub">Build a focused lead list and review the evidence before outreach.</div></div></div>
          <div className="row"><div className="row-main"><div className="row-title">AI assists, you decide</div><div className="row-sub">Research and outreach drafts are automated; classification, approval and sending stay with you.</div></div></div>
        </div>
      </div></div>
    )
  }

  return (
    <div className="shell2 sales-machine-shell"><div className="page">
      <div className="wshead">
        <div>
          <BizSwitcher label={`${business.name} — Sales Machine`} current="sales-machine" />
          <p className="pagesub" style={{ marginTop: 8 }}>Sales Machine · leads and outreach stay with {business.name}.</p>
        </div>
      </div>

      <div className="tabrow" style={{ marginTop: 8 }}>
        <button className={tab === 'leads' ? 'on' : ''} onClick={() => setTab('leads')}>Find Leads</button>
        <button className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>Research & Review</button>
        <button className={tab === 'assistant' ? 'on' : ''} onClick={() => setTab('assistant')}>AI Outreach</button>
        <button className={tab === 'sales' ? 'on' : ''} onClick={() => setTab('sales')}>Sales</button>
      </div>

      {tab === 'leads' && <YcPipeline bizId={business.id} />}
      {tab === 'review' && <YcFinder bizId={business.id} businessName={business.name} />}
      {tab === 'sales' && <YcSales bizId={business.id} businessName={business.name} businessSlug={business.slug} />}
      {tab === 'assistant' && <YcAssistant bizId={business.id} businessName={business.name} />}
    </div></div>
  )
}
