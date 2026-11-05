import { useState } from 'react'
import { useData } from '../lib/data'
import { go } from '../lib/route'
import { businessRoute, visibleBusinesses } from '../lib/workspaces'
import { Icon } from './Icon'

export function BizSwitcher({ slug, label, current }: { slug?: string; label?: string; current?: 'home' | 'yogecreatives' | 'yogeworks' | 'white-label' | 'sales-machine' }) {
  const { businesses } = useData()
  const [open, setOpen] = useState(false)
  const cur = businesses.find(b => b.slug === slug)
  const name = label ?? cur?.name ?? 'YOGE'
  const items = [
    { id: 'home', label: 'Home', path: '/home', sub: 'Command Centre' },
    ...visibleBusinesses(businesses).map(b => ({ id: b.slug, label: b.name, path: businessRoute(b.slug), sub: 'Open workspace' })),
    { id: 'sales-machine', label: 'Sales Machine', path: '/sales-machine', sub: 'Find, research, approve and sell' },
  ]
  return (
    <div style={{ position: 'relative' }}>
      <button className="chip-sw" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="menu">
        <span className="av">{name[0]}</span>{name}<span className="sw-chevron"><Icon name="chevron" size={14} /></span>
      </button>
      {open && <>
        <button aria-label="Close menu" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'transparent', border: 0 }} />
        <div className="listcard" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: 300, zIndex: 30, padding: 6, boxShadow: '0 18px 45px rgba(0,0,0,.18)' }}>
          {items.map(item => {
            const isCurrent = item.id === current
            return <button key={item.id} className="row" style={{ width: '100%', border: 0, background: 'transparent', borderRadius: 10 }} onClick={() => { setOpen(false); if (!isCurrent) go(item.path) }}>
              <span className="row-main">
                <span className="row-title">{item.label}</span>
                <span className="row-sub">{isCurrent ? 'Open' : item.sub}</span>
              </span>
              {isCurrent ? <span className="chip lime">Open</span> : <Icon name="chevron" size={15} />}
            </button>
          })}
        </div>
      </>}
    </div>
  )
}
