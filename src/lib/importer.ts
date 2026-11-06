import { supabase } from './supabase'
import { Business, Referrer, Project, Income } from './types'

export interface ImportFile {
  version: number
  referrers: { name: string; type: string }[]
  projects: { name: string; start_date: string | null; status: string; total: number; paid: number; invoice_status: string; notes: string | null; referrer: string | null }[]
  income: { source: string; amount: number; entry_date: string; status: string; notes: string | null }[]
}
export interface ImportResult { referrers: number; projects: number; income: number; skipped: number }

const chunks = <T,>(a: T[], n = 100) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))
async function insert(table: string, rows: Record<string, unknown>[]) {
  const out: any[] = []
  for (const c of chunks(rows)) {
    const { data, error } = await supabase.from(table).insert(c).select()
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
  }
  return out
}

export async function runImport(file: ImportFile, ctx: { businesses: Business[]; referrers: Referrer[]; projects: Project[]; income: Income[] }): Promise<ImportResult> {
  const { data: u } = await supabase.auth.getUser(); const uid = u.user?.id
  if (!uid) throw new Error('Not signed in')
  const yc = ctx.businesses.find(b => b.slug === 'yogecreatives')?.id
  if (!yc) throw new Error('Yogecreatives workspace is missing. Reload the app and try again.')
  const res: ImportResult = { referrers: 0, projects: 0, income: 0, skipped: 0 }

  const refId = new Map(ctx.referrers.map(r => [r.name.toLowerCase(), r.id]))
  const newRefs = (file.referrers ?? []).filter(r => !refId.has(r.name.toLowerCase()))
  for (const r of await insert('referrers', newRefs.map(r => ({ user_id: uid, name: r.name, type: r.type })))) refId.set(r.name.toLowerCase(), r.id)
  res.referrers = newRefs.length

  const have = new Set(ctx.projects.map(p => `${p.name.toLowerCase()}|${p.start_date}`))
  const projRows = (file.projects ?? []).filter(p => {
    const k = `${p.name.toLowerCase()}|${p.start_date}`
    if (have.has(k)) { res.skipped++; return false }
    have.add(k); return true
  }).map(p => ({
    user_id: uid, business_id: yc, name: p.name, start_date: p.start_date, status: p.status,
    total_amount: p.total, paid_amount: p.paid, invoice_status: p.invoice_status, notes: p.notes,
    referrer_id: p.referrer ? refId.get(p.referrer.toLowerCase()) ?? null : null,
    completed_at: p.status === 'completed' && p.start_date ? `${p.start_date}T12:00:00Z` : null
  }))
  res.projects = (await insert('projects', projRows)).length

  const haveInc = new Set(ctx.income.map(i => `${i.entry_date}|${Number(i.amount)}`))
  const incRows = (file.income ?? []).filter(i => {
    const k = `${i.entry_date}|${i.amount}`
    if (haveInc.has(k)) { res.skipped++; return false }
    haveInc.add(k); return true
  }).map(i => ({ user_id: uid, business_id: yc, source: i.source, amount: i.amount, entry_date: i.entry_date, status: i.status, notes: i.notes }))
  res.income = (await insert('income_entries', incRows)).length
  return res
}
