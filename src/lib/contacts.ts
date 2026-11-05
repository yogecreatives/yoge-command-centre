import { Project, Prospect } from './types'

export interface Contact { key: string; name: string; person?: string; email?: string; phone?: string; place?: string; lead?: Prospect; projects: Project[] }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
const keyOf = (email?: string | null, name?: string | null) => (email?.trim() ? 'e:' + email.trim().toLowerCase() : name?.trim() ? 'n:' + norm(name) : '')

/** One list of leads and clients with no duplicates: matched by email, then by name, and by the lead-to-project link. */
export function buildContacts(prospects: Prospect[], projects: Project[]): Contact[] {
  const map = new Map<string, Contact>(); const byProject = new Map<string, string>()
  for (const l of prospects) {
    const k = keyOf(l.email, l.agency_name); if (!k) continue
    const c = map.get(k) ?? { key: k, name: l.agency_name, projects: [] }
    c.lead = l; c.person = c.person || l.contact_name || undefined; c.email = c.email || l.email || undefined; c.phone = c.phone || l.phone || undefined; c.place = c.place || l.city || l.country || undefined
    map.set(k, c); if (l.won_project_id) byProject.set(l.won_project_id, k)
  }
  for (const p of projects) {
    const label = p.client_name?.trim()
    let k = byProject.get(p.id) || keyOf(p.client_email, label)
    if (!k) continue
    if (!map.has(k) && p.client_email) { const alt = keyOf(null, label); if (alt && map.has(alt)) k = alt }
    const c = map.get(k) ?? { key: k, name: label || p.name, projects: [] }
    c.projects.push(p); c.email = c.email || p.client_email || undefined; c.phone = c.phone || p.client_phone || undefined
    map.set(k, c)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}
