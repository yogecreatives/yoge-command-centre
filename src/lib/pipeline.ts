import { Prospect, Settings, Stage, Templates } from './types'
import { addDays, iso, parse } from './dates'

export type SendKey = 'email_1' | 'follow_up_1' | 'follow_up_2' | 'last_nudge'
export const NEXT_STEP: Partial<Record<Stage, { key: SendKey; label: string }>> = {
  prospect: { key: 'email_1', label: 'Email 1' },
  email_1: { key: 'follow_up_1', label: 'Follow-up 1' },
  follow_up_1: { key: 'follow_up_2', label: 'Follow-up 2' },
  follow_up_2: { key: 'last_nudge', label: 'Last nudge' },
}
export const WAITING: Stage[] = ['email_1', 'follow_up_1', 'follow_up_2']
export const ACTIVE: Stage[] = ['replied', 'call_booked', 'test_project', 'partner']
export const CLOSED: Stage[] = ['not_now', 'not_interested', 'invalid']
export const BOARD_COLUMNS: Stage[] = ['prospect', 'email_1', 'follow_up_1', 'follow_up_2', 'replied', 'call_booked', 'test_project', 'partner', 'not_now']
export const SNOOZE_DAYS = 90

export function afterWeekend(date: string, skip: boolean) {
  if (!skip) return date
  const d = parse(date); const wd = d.getDay()
  if (wd === 6) d.setDate(d.getDate() + 2); else if (wd === 0) d.setDate(d.getDate() + 1)
  return iso(d)
}

/** The change to save when the user taps "Sent" for the prospect's next step. */
export function sentPatch(p: Prospect, st: Settings, today: string): Partial<Prospect> | null {
  const step = NEXT_STEP[p.stage]
  if (!step) return null
  const g = st.outreach_gaps?.length === 3 ? st.outreach_gaps : [3, 7, 14]
  const now = new Date().toISOString()
  const wait = (days: number) => afterWeekend(addDays(today, Math.max(days, 1)), st.skip_weekends)
  switch (step.key) {
    case 'email_1': return { stage: 'email_1', next_action_date: wait(g[0]), last_contacted_at: now }
    case 'follow_up_1': return { stage: 'follow_up_1', next_action_date: wait(g[1] - g[0]), last_contacted_at: now }
    case 'follow_up_2': return { stage: 'follow_up_2', next_action_date: wait(g[2] - g[1]), last_contacted_at: now }
    case 'last_nudge': return { stage: 'not_now', next_action_date: null, snooze_until: addDays(today, SNOOZE_DAYS), last_contacted_at: now }
  }
}

export function fill(text: string, p: Prospect, sender: string) {
  const contact = (p.contact_name || '').trim().split(/\s+/)[0] || 'there'
  return text.replace(/\{agency\}/g, p.agency_name).replace(/\{contact\}/g, contact).replace(/\{sender\}/g, sender)
}
export function mailtoFor(p: Prospect, key: SendKey, t: Templates, sender: string) {
  const tpl = t[key]; if (!p.email) return null
  return `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(fill(tpl.subject, p, sender))}&body=${encodeURIComponent(fill(tpl.body, p, sender))}`
}
export const gmailSearch = (email: string) => `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(email)}`

export const hostOf = (url?: string | null) => {
  if (!url) return ''
  try { return new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url).hostname.replace(/^www\./, '').toLowerCase() } catch { return '' }
}
export const normUrl = (url: string) => (url && !/^https?:\/\//i.test(url) ? 'https://' + url : url)

export function findDuplicate(list: Prospect[], email?: string | null, website?: string | null, skipId?: string) {
  const e = (email || '').trim().toLowerCase(), h = hostOf(website)
  return list.find(x => x.id !== skipId && ((e && x.email?.toLowerCase() === e) || (h && hostOf(x.website) === h)))
}

/** Minimal CSV parser (quotes, commas, newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim()))
}
export const toCsv = (rows: (string | number | null | undefined)[][]) =>
  rows.map(r => r.map(c => { const v = c == null ? '' : String(c); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v }).join(',')).join('\n')
export function download(name: string, text: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click(); URL.revokeObjectURL(a.href)
}
