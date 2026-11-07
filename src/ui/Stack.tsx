import { ReactNode, useRef, useState } from 'react'
import { Icon } from './Icon'

export interface DeckItem { id: string; label: string; title: string; sub?: string; badge?: string; tone?: 'red' | '' }

/** Stacked cards: the top card is the next thing to do. Swipe right = done, swipe left = later. Buttons do the same. */
export function StackDeck({ items, doneLabel = 'Done', laterLabel = 'Later', onDone, onOpen, empty }: {
  items: DeckItem[]; doneLabel?: string; laterLabel?: string; onDone: (id: string) => void; onOpen: (id: string) => void; empty?: ReactNode
}) {
  const [skipped, setSkipped] = useState<string[]>([])
  const [dx, setDx] = useState(0)
  const start = useRef<number | null>(null)
  const ordered = [...items.filter(i => !skipped.includes(i.id)), ...skipped.map(id => items.find(i => i.id === id)).filter(Boolean) as DeckItem[]]
  const top = ordered[0]
  const later = () => { if (!top) return; setSkipped(s => [...s.filter(x => x !== top.id), top.id]); setDx(0) }
  const done = () => { if (!top) return; setDx(0); onDone(top.id) }
  if (!top) return <div className="deck-empty">{empty ?? 'All clear.'}</div>
  const down = (e: React.PointerEvent) => { start.current = e.clientX; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
  const move = (e: React.PointerEvent) => { if (start.current !== null) setDx(e.clientX - start.current) }
  const up = () => { const d = dx; start.current = null; if (d > 90) done(); else if (d < -90) later(); else setDx(0) }
  return (
    <div className="deckwrap">
      <div className="deck">
        {ordered.length > 2 && <div className="dk dk3" />}
        {ordered.length > 1 && <div className="dk dk2" />}
        <div className="dk dk1" style={{ transform: `translateX(${dx}px) rotate(${dx / 28}deg)`, transition: start.current === null ? 'transform .25s' : 'none', touchAction: 'pan-y' }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div>
            <div className="dk-k"><span className="eyebrow">{top.label}</span>{top.badge && <span className={`badge ${top.tone === 'red' ? 'red' : ''}`}>{top.badge}</span>}</div>
            <button className="dk-t" onClick={() => Math.abs(dx) < 5 && onOpen(top.id)}>{top.title}</button>
            {top.sub && <div className="dk-s">{top.sub}</div>}
          </div>
          <div className="dk-a"><button className="dk-y" onClick={done}>{doneLabel}</button><button className="dk-n" onClick={later}>{laterLabel}</button></div>
        </div>
      </div>
      <div className="dk-dots">{ordered.slice(0, 7).map((_, i) => <i key={i} className={i === 0 ? 'on' : ''} />)}<span>{items.length} in total</span></div>
    </div>
  )
}

export interface WalletCard { id: string; name: string; chip: string; info: string; hi?: boolean; alert?: string }
export function WalletStack({ cards, onOpen }: { cards: WalletCard[]; onOpen: (id: string) => void }) {
  const cardHeight = 136
  const gap = 12
  return (
    <div className="wall" style={{ height: cards.length ? cards.length * cardHeight + (cards.length - 1) * gap : 0 }}>
      {cards.map((c, i) => (
        <button key={c.id} className={`w ${c.hi ? 'hi' : ''}`} style={{ top: i * (cardHeight + gap), zIndex: 1 }} onClick={() => onOpen(c.id)}>
          <div className="nm">{c.name}<i className="w-arrow" aria-hidden="true"><Icon name="chevron" size={17} /></i></div>
          {c.alert && <div className="w-alert"><span></span>{c.alert}</div>}
          <div className="in">{c.info}</div>
        </button>
      ))}
    </div>
  )
}

export function PillNav({ tabs, active, onGo }: { tabs: [string, string][]; active: string; onGo: (id: string) => void }) {
  const icons: Record<string, string> = { home: 'today', overview: 'today', tasks: 'tasks', projects: 'folder', more: 'more', calendar: 'calendar', notes: 'notes', pipeline: 'pipeline', inbox: 'mail', followups: 'follow' }
  return (
    <nav className="pillnav" aria-label="Main navigation">
      {tabs.map(([id, label]) => <button key={id} className={id === active ? 'on' : ''} aria-current={id === active ? 'page' : undefined} onClick={() => onGo(id)}>
        <span className="pillnav-icon"><Icon name={icons[id] || 'folder'} size={19} /></span>
        <span className="pillnav-label">{label}</span>
      </button>)}
    </nav>
  )
}
