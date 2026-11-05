// All dates are local calendar dates (YYYY-MM-DD). Never use toISOString() for "today":
// it returns the UTC date, which is wrong for part of every day in Malaysia/India.
const p2 = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const todayISO = () => iso(new Date())
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
export const mondayOf = (s: string) => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d) }

export function fmtDate(s?: string | null) {
  if (!s) return ''
  return parse(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
export function fmtStamp(s?: string | null) {
  if (!s) return ''
  return new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
export function dueLabel(s: string | null, today = todayISO()) {
  if (!s) return 'No date'
  const n = daysBetween(today, s)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n < 0 && n > -7) return `${-n} days ago`
  return fmtDate(s)
}
