import { useState } from 'react'
import { Sheet } from './Sheet'
import { useData } from '../lib/data'
import { go } from '../lib/route'
import { businessRoute, visibleBusinesses } from '../lib/workspaces'

export function BizSwitcher({ slug, label }: { slug?: string; label?: string }) {
  const { businesses, bizBySlug } = useData()
  const [open, setOpen] = useState(false)
  const cur = slug ? bizBySlug(slug) : undefined
  const name = label ?? cur?.name ?? 'YOGE'
  return (
    <>
      <button className="chip-sw" onClick={() => setOpen(true)} aria-haspopup="dialog"><span className="av">{name[0]}</span>{name}<i>⌄</i></button>
      {open && (
        <Sheet title="Switch business" onClose={() => setOpen(false)}>
          <div className="group">
            <button className="row" onClick={() => { setOpen(false); go('/home') }}><div className="row-main"><div className="row-title">YOGE home</div><div className="row-sub">All businesses</div></div></button>
            {visibleBusinesses(businesses).map(b => (
              <button key={b.id} className="row" onClick={() => { setOpen(false); go(businessRoute(b.slug)) }}>
                <div className="row-main"><div className="row-title">{b.name}</div></div>{b.slug === slug && <span className="chip lime">Open</span>}
              </button>))}
          </div>
        </Sheet>
      )}
    </>
  )
}
