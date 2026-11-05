import { useEffect, useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { WalletStack, WalletCard } from '../ui/Stack'
import { BizSwitcher } from '../ui/BizSwitcher'
import { Icon } from '../ui/Icon'
import { go } from '../lib/route'
import { todayISO, dueLabel } from '../lib/dates'
import { WAITING } from '../lib/pipeline'
import { leadDue } from '../lib/clientPipeline'
import { businessRoute, visibleBusinesses } from '../lib/workspaces'
import { Task, FollowUp, Prospect } from '../lib/types'

type Attention = {
  id: string
  kind: 'task' | 'followup' | 'prospect'
  businessId: string
  title: string
  sub: string
  date: string | null
  overdue: boolean
  task?: Task
  followup?: FollowUp
  prospect?: Prospect
}

export function Home() {
  const { businesses, tasks, followUps, projects, prospects, notifications, profile } = useData()
  const today = todayISO()
  const list = visibleBusinesses(businesses)
  const ids = new Set(list.map(b => b.id))
  const T = tasks.filter(t => ids.has(t.business_id) && t.status !== 'completed')
  const F = followUps.filter(f => ids.has(f.business_id) && f.status === 'open')
  const wl = businesses.find(b => b.slug === 'white-label')?.id
  const yc = businesses.find(b => b.slug === 'yogecreatives')?.id
  const wlDue = prospects.filter(p => p.business_id === wl && WAITING.includes(p.stage) && p.next_action_date && p.next_action_date <= today).length
  const ycLeadDue = prospects.filter(p => p.business_id === yc && leadDue(p, today)).length
  const overdue = T.filter(t => t.due_date && t.due_date < today).length
  const dueToday = T.filter(t => t.due_date === today).length
  const fuDue = F.filter(f => f.follow_up_date <= today).length
  const need = overdue + dueToday + fuDue + wlDue + ycLeadDue
  const unpaid = projects.filter(p => ids.has(p.business_id) && p.status !== 'dropped').reduce((a, p) => a + Math.max(0, Number(p.balance_amount) || 0), 0)

  const salesProspects = prospects.filter(p => p.business_id === yc || p.business_id === wl)
  const salesReview = salesProspects.filter(p => (p.review_status || 'pending') === 'pending').length
  const salesApproved = salesProspects.filter(p => p.review_status === 'approved' && p.website_classification !== 'unreviewed').length
  const salesDue = salesProspects.filter(p => leadDue(p, today)).length

  const cards: WalletCard[] = list.map(b => {
    const bt = T.filter(t => t.business_id === b.id), bf = F.filter(f => f.business_id === b.id), bp = projects.filter(p => p.business_id === b.id)
    const due = bt.filter(t => t.due_date && t.due_date <= today).length
    const fu = bf.filter(f => f.follow_up_date <= today).length
    const active = bp.filter(p => p.status === 'in_progress').length
    const owed = bp.filter(p => p.status !== 'dropped').reduce((a, p) => a + Math.max(0, Number(p.balance_amount) || 0), 0)
    if (b.slug === 'yogecreatives') {
      const leads = prospects.filter(p => p.business_id === b.id && p.stage === 'new').length
      return { id: b.slug, name: b.name, hi: true, chip: due + ycLeadDue ? `${due + ycLeadDue} due` : 'All clear', info: `${active} active projects · ${leads} new leads · ${Math.round(owed).toLocaleString()} unpaid` }
    }
    if (b.slug === 'white-label') {
      const n = prospects.filter(p => p.business_id === b.id).length
      return { id: b.slug, name: b.name, chip: wlDue ? `${wlDue} to send` : 'Up to date', info: `${wlDue} follow-ups due · ${n} agencies` }
    }
    return { id: b.slug, name: b.name, chip: `${bt.length} pending`, info: `${fu} follow-ups due · ${active} projects in progress`,
      mini: [[String(bt.length), 'Pending'], [String(bt.filter(t => t.due_date && t.due_date < today).length), 'Overdue'], [String(fu), 'Follow-ups']] }
  })

  cards.push({ id: 'sales-machine', name: 'Sales Machine', chip: salesDue ? `${salesDue} due` : 'Ready', info: `${salesReview} to review · ${salesApproved} approved · one sales engine across all businesses`, hi: true })

  const attention = useMemo<Attention[]>(() => {
    const out: Attention[] = []
    for (const t of T.filter(t => t.due_date && t.due_date <= today).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))) {
      const b = businesses.find(x => x.id === t.business_id)
      out.push({ id: 't:' + t.id, kind: 'task', businessId: t.business_id, title: t.title, sub: `${b?.name ?? 'Business'} · ${t.priority === 'urgent' ? 'Urgent' : t.priority === 'high' ? 'High' : 'Task'}`, date: t.due_date, overdue: t.due_date! < today, task: t })
    }
    for (const f of F.filter(f => f.follow_up_date <= today).sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date))) {
      const b = businesses.find(x => x.id === f.business_id)
      out.push({ id: 'f:' + f.id, kind: 'followup', businessId: f.business_id, title: f.person_name, sub: `${b?.name ?? 'Business'} · ${f.company || 'Follow-up'}`, date: f.follow_up_date, overdue: f.follow_up_date < today, followup: f })
    }
    for (const p of prospects.filter(p => (p.business_id === wl || p.business_id === yc) && leadDue(p, today)).sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || ''))) {
      const b = businesses.find(x => x.id === p.business_id)
      out.push({ id: 'p:' + p.id, kind: 'prospect', businessId: p.business_id, title: p.agency_name, sub: `${b?.name ?? 'Business'} · ${p.next_action || 'Follow-up'}`, date: p.next_action_date, overdue: !!p.next_action_date && p.next_action_date < today, prospect: p })
    }
    return out.slice(0, 8)
  }, [T, F, prospects, businesses, wl, yc, today])

  const openAttention = (item: Attention) => {
    const b = businesses.find(x => x.id === item.businessId)
    if (!b) return
    if (item.kind === 'task' && item.task) {
      if (b.slug === 'yogecreatives' || b.slug === 'white-label' || b.slug === 'yogeworks') go(`/w/${b.slug}/tasks?task=${item.task.id}`)
      else go(`/b/${b.slug}?task=${item.task.id}`)
    } else if (item.kind === 'followup' && item.followup) {
      if (b.slug === 'yogecreatives' || b.slug === 'white-label' || b.slug === 'yogeworks') go(`/w/${b.slug}/tasks?followup=${item.followup.id}`)
      else go(`/b/${b.slug}?followup=${item.followup.id}`)
    } else if (item.kind === 'prospect' && item.prospect) {
      const route = b.slug === 'yogecreatives' ? 'lead' : 'prospect'
      if (b.slug === 'yogecreatives' || b.slug === 'white-label' || b.slug === 'yogeworks') go(`/w/${b.slug}/pipeline?prospect=${item.prospect.id}`)
      else go(`/b/${b.slug}?prospect=${item.prospect.id}`)
      void route
    }
  }

  const reminderCount = notifications.filter(n => !n.read_at && n.kind.includes('due')).length

  return (
    <div className="shell2 home-shell"><div className="page">
      <div className="wshead"><BizSwitcher label="Home" current="home" />
        <div style={{display:'flex',gap:8}}>
          <button className="iconbtn badgeh" onClick={() => go('/inbox')} aria-label="Notifications"><Icon name="bell" />{reminderCount > 0 && <b>{reminderCount > 9 ? '9+' : reminderCount}</b>}</button>
          <button className="iconbtn" onClick={() => go('/settings')} aria-label="Settings"><Icon name="gear" /></button>
        </div>
      </div>

      {profile?.role === 'member' && (
        <section className="partner-profile">
          <div className="partner-photo">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name || 'Partner'} /> : <span>{(profile.full_name || 'P').trim().slice(0,1).toUpperCase()}</span>}
          </div>
          <div className="partner-meta">
            <div className="partner-kicker">YOGEWORKS PARTNER</div>
            <h1>{profile.full_name || 'Partner'}</h1>
            <p>{profile.position || 'Partner'}</p>
          </div>
        </section>
      )}

      <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div className="hero-n">{need}</div>
      <p className="hero-s">{need === 1 ? 'thing needs you today' : 'things need you today'}</p>

      {cards.length ? <WalletStack cards={cards} onOpen={slug => slug === 'sales-machine' ? go('/sales-machine') : go(businessRoute(slug))} /> : <div className="deck-empty">Setting up your businesses…</div>}

      <div className="sectionlabel">Needs attention</div>
      <div className="listcard">
        {attention.length ? attention.map(item => (
          <button key={item.id} className="row" onClick={() => openAttention(item)}>
            <span className="tile sm">{item.kind === 'task' ? <Icon name="tasks" size={17} /> : item.kind === 'followup' ? <Icon name="follow" size={17} /> : <Icon name="send" size={17} />}</span>
            <div className="row-main"><div className="row-title">{item.title}</div><div className="row-sub">{item.sub}</div></div>
            <span className={`chip ${item.overdue ? 'red' : item.date === today ? 'amber' : ''}`}>{item.overdue ? 'Overdue' : item.date === today ? 'Today' : item.date ? dueLabel(item.date, today) : 'Pending'}</span>
          </button>
        )) : <div className="empty">Nothing urgent across your businesses.</div>}
      </div>

      <div className="kstats"><div><b>{overdue}</b><span>Overdue</span></div><div><b>{fuDue + wlDue + ycLeadDue + reminderCount}</b><span>Follow-ups & reminders</span></div><div><b>{Math.round(unpaid).toLocaleString()}</b><span>Unpaid</span></div></div>
    </div></div>
  )
}
