import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { useToast } from '../ui/toast'
import { Activity, AppNotification, Business, Expense, Prospect, FollowUp, Idea, Income, Project, Referrer, Settings, Status, Task, Profile, WorkspaceMembership } from './types'

type Tables = {
  tasks: Task[]; follow_ups: FollowUp[]; projects: Project[]; ideas: Idea[]; notifications: AppNotification[]
  referrers: Referrer[]; prospects: Prospect[]; prospect_activities: Activity[]; income_entries: Income[]; expenses: Expense[]
}
export type TableKey = keyof Tables
const TABLES: TableKey[] = ['tasks', 'follow_ups', 'projects', 'ideas', 'notifications', 'referrers', 'prospects', 'prospect_activities', 'income_entries', 'expenses']
const empty: Tables = { tasks: [], follow_ups: [], projects: [], ideas: [], notifications: [], referrers: [], prospects: [], prospect_activities: [], income_entries: [], expenses: [] }

interface DataCtx {
  state: 'loading' | 'ready' | 'error'
  error: string | null
  online: boolean
  busy: number
  email: string
  businesses: Business[]
  profile: Profile | null
  teamProfiles: Profile[]
  memberships: WorkspaceMembership[]
  isAdmin: boolean
  bizById: (id: string | null | undefined) => Business | undefined
  bizBySlug: (slug: string) => Business | undefined
  tasks: Task[]; followUps: FollowUp[]; projects: Project[]; ideas: Idea[]; notifications: AppNotification[]
  referrers: Referrer[]; prospects: Prospect[]; activities: Activity[]; income: Income[]; expenses: Expense[]
  settings: Settings | null
  create: (table: TableKey, values: Record<string, unknown>) => Promise<any | null>
  update: (table: TableKey, id: string, values: Record<string, unknown>) => Promise<any | null>
  remove: (table: TableKey, id: string) => Promise<boolean>
  createMany: (table: TableKey, rows: Record<string, unknown>[]) => Promise<number>
  setTaskStatus: (t: Task, s: Status) => Promise<void>
  toggleTask: (t: Task) => Promise<void>
  completeFollowUp: (f: FollowUp) => Promise<void>
  reopenFollowUp: (f: FollowUp) => Promise<void>
  rescheduleFollowUp: (f: FollowUp, date: string) => Promise<void>
  updateSettings: (v: Partial<Settings>) => Promise<void>
  updateProfile: (userId: string, values: Record<string, unknown>) => Promise<boolean>
  setMembership: (userId: string, businessId: string, enabled: boolean) => Promise<boolean>
  createBusiness: (values: Record<string, unknown>) => Promise<Business | null>
  createPartner: (values: { email: string; password: string; full_name: string; position?: string; avatar_url?: string; workspace_ids?: string[] }) => Promise<any | null>
  reload: () => Promise<void>
  signOut: () => Promise<void>
}
const Ctx = createContext<DataCtx>(null as unknown as DataCtx)
export const DataContext = Ctx
export const useData = () => useContext(Ctx)

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const toast = useToast()
  const uid = session!.user.id
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [busy, setBusy] = useState(0)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teamProfiles, setTeamProfiles] = useState<Profile[]>([])
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([])
  const [db, setDb] = useState<Tables>(empty)
  const [settings, setSettings] = useState<Settings | null>(null)
  const loaded = useRef(false)

  const load = useCallback(async () => {
    const [b, me, profs, memberships, t, f, p, i, n, s, rf, pr, pa, inc, ex] = await Promise.all([
      supabase.from('businesses').select('*').order('sort_order'),
      supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('workspace_memberships').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('follow_ups').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('ideas').select('*'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('user_settings').select('*').maybeSingle(),
      supabase.from('referrers').select('*'),
      supabase.from('prospects').select('*'),
      supabase.from('prospect_activities').select('*'),
      supabase.from('income_entries').select('*'),
      supabase.from('expenses').select('*'),
    ])
    const failed = [b, me, profs, memberships, t, f, p, i, n, s, rf, pr, pa, inc, ex].find(r => r.error)
    if (failed?.error) throw new Error(failed.error.message)

    const myProfile = (me.data ?? null) as Profile | null
    const allBusinesses = (b.data ?? []) as Business[]
    const myMemberships = (memberships.data ?? []) as WorkspaceMembership[]
    const allowedBusinessIds = myProfile?.role === 'owner'
      ? new Set(allBusinesses.filter(x => x.user_id === uid).map(x => x.id))
      : new Set(myMemberships.filter(x => x.user_id === uid).map(x => x.business_id))
    const scopedBusinesses = allBusinesses.filter(x => allowedBusinessIds.has(x.id))

    setBusinesses(scopedBusinesses)
    setProfile(myProfile)
    setTeamProfiles((profs.data ?? []) as Profile[])
    setMemberships(myMemberships)
    setDb({
      tasks: t.data as Task[], follow_ups: f.data as FollowUp[], projects: p.data as Project[], ideas: i.data as Idea[],
      notifications: n.data as AppNotification[], referrers: rf.data as Referrer[], prospects: pr.data as Prospect[], prospect_activities: pa.data as Activity[], income_entries: inc.data as Income[], expenses: ex.data as Expense[]
    })
    setSettings((s.data ?? null) as Settings | null)
  }, [uid])

  const reload = useCallback(async () => {
    try { await load(); setError(null); setState('ready') }
    catch (e: any) { if (!loaded.current) { setError(e.message); setState('error') } else toast('Could not refresh: ' + e.message, 'error') }
  }, [load, toast])

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const { data: me } = await supabase.from('profiles').select('role').eq('user_id', uid).maybeSingle()
        if (me?.role === 'owner') {
          const { error: e } = await supabase.rpc('bootstrap_user')
          if (e) throw new Error(e.message.includes('bootstrap_user') ? 'Database is not set up yet. Run supabase/schema.sql in the Supabase SQL Editor.' : e.message)
        }
        await load()
        if (!dead) { loaded.current = true; setState('ready') }
      } catch (e: any) { if (!dead) { setError(e.message); setState('error') } }
    })()
    return () => { dead = true }
  }, [load, uid])

  const upsertLocal = useCallback((table: TableKey, row: any) => {
    setDb(d => {
      const list = d[table] as any[]
      const i = list.findIndex(x => x.id === row.id)
      const next = i >= 0 ? list.map(x => (x.id === row.id ? row : x)) : [row, ...list]
      return { ...d, [table]: next }
    })
  }, [])
  const removeLocal = useCallback((table: TableKey, id: string) => {
    setDb(d => ({ ...d, [table]: (d[table] as any[]).filter(x => x.id !== id) }))
  }, [])

  useEffect(() => {
    if (state !== 'ready') return
    const ch = supabase.channel('yoge-sync-' + uid)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_memberships' }, () => { void load() })
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { void load() })
    for (const table of TABLES) ch.on('postgres_changes', { event: '*', schema: 'public', table }, (p: any) => {
      if (p.eventType === 'DELETE') removeLocal(table, p.old.id)
      else upsertLocal(table, p.new)
    })
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings' }, (p: any) => { if (p.new) setSettings(p.new) })
    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [state, uid, upsertLocal, removeLocal, load])

  useEffect(() => {
    const on = () => { setOnline(true); reload() }, off = () => setOnline(false)
    const vis = () => { if (document.visibilityState === 'visible' && loaded.current) reload() }
    window.addEventListener('online', on); window.addEventListener('offline', off); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); document.removeEventListener('visibilitychange', vis) }
  }, [reload])

  const guard = useCallback(async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    if (!navigator.onLine) { toast('You are offline. Changes are not saved until you reconnect.', 'error'); return fallback }
    setBusy(b => b + 1)
    try { return await fn() } catch (e: any) { toast(e.message || 'Something went wrong', 'error'); return fallback } finally { setBusy(b => b - 1) }
  }, [toast])

  const create: DataCtx['create'] = (table, values) => guard(async () => {
    const { data, error: e } = await supabase.from(table).insert({ ...values, user_id: uid }).select().single()
    if (e) throw new Error(e.message)
    upsertLocal(table, data); return data
  }, null)

  const createMany: DataCtx['createMany'] = (table, rows) => guard(async () => {
    if (!rows.length) return 0
    const { data, error: e } = await supabase.from(table).insert(rows.map(r => ({ ...r, user_id: uid }))).select()
    if (e) throw new Error(e.message)
    ;(data ?? []).forEach(r => upsertLocal(table, r)); return data?.length ?? 0
  }, 0)

  const update: DataCtx['update'] = (table, id, values) => guard(async () => {
    const { data, error: e } = await supabase.from(table).update(values).eq('id', id).select().single()
    if (e) throw new Error(e.message)
    upsertLocal(table, data); return data
  }, null)

  const remove: DataCtx['remove'] = (table, id) => guard(async () => {
    const { error: e } = await supabase.from(table).delete().eq('id', id)
    if (e) throw new Error(e.message)
    removeLocal(table, id); return true
  }, false)

  const setTaskStatus = async (t: Task, s: Status) => { await update('tasks', t.id, { status: s, completed_at: s === 'completed' ? new Date().toISOString() : null }) }
  const toggleTask = async (t: Task) => { if (t.status !== 'completed') return setTaskStatus(t, 'completed'); return setTaskStatus(t, 'pending') }
  const completeFollowUp = async (f: FollowUp) => { await update('follow_ups', f.id, { status: 'completed', completed_at: new Date().toISOString() }) }
  const reopenFollowUp = async (f: FollowUp) => { await update('follow_ups', f.id, { status: 'open', completed_at: null }) }
  const rescheduleFollowUp = async (f: FollowUp, date: string) => { await update('follow_ups', f.id, { follow_up_date: date, status: 'open', completed_at: null }) }
  const updateSettings = async (v: Partial<Settings>) => { if (settings) await update_settings(v) }
  const updateProfile = async (userId: string, values: Record<string, unknown>) => guard(async () => {
    const { data, error: e } = await supabase.from('profiles').update(values).eq('user_id', userId).select().single()
    if (e) throw new Error(e.message)
    setTeamProfiles(xs => xs.map(x => x.user_id === userId ? data as Profile : x)); if (userId === uid) setProfile(data as Profile)
    return true
  }, false)
  const createBusiness = async (values: Record<string, unknown>) => guard(async () => {
    const { data, error: e } = await supabase.from('businesses').insert({ ...values, user_id: uid }).select().single()
    if (e) throw new Error(e.message); setBusinesses(xs => [...xs, data as Business].sort((a,b) => a.sort_order - b.sort_order)); return data as Business
  }, null)
  const createPartner = async (values: { email: string; password: string; full_name: string; position?: string; avatar_url?: string; workspace_ids?: string[] }) => guard(async () => {
    const { data, error: e } = await supabase.functions.invoke('create-partner', { body: values })
    if (e) throw new Error(e.message)
    if (!data?.ok) throw new Error(data?.error || 'Could not create partner account')
    await load(); return data
  }, null)
  const setMembership = async (userId: string, businessId: string, enabled: boolean) => guard(async () => {
    if (enabled) {
      const { error: e } = await supabase.from('workspace_memberships').upsert({ user_id: userId, business_id: businessId, role: 'member' }, { onConflict: 'business_id,user_id' })
      if (e) throw new Error(e.message)
    } else {
      const { error: e } = await supabase.from('workspace_memberships').delete().eq('user_id', userId).eq('business_id', businessId)
      if (e) throw new Error(e.message)
    }
    const { data, error: e2 } = await supabase.from('workspace_memberships').select('*')
    if (e2) throw new Error(e2.message); setMemberships((data ?? []) as WorkspaceMembership[]); return true
  }, false)
  const update_settings = (v: Partial<Settings>) => guard(async () => {
    const { data, error: e } = await supabase.from('user_settings').update(v).eq('user_id', uid).select().single()
    if (e) throw new Error(e.message); setSettings(data as Settings)
  }, undefined)

  useEffect(() => {
    if (state === 'ready' && settings && !settings.timezone_confirmed) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) updateSettings({ timezone: tz, timezone_confirmed: true })
    }
  }, [state, settings?.timezone_confirmed])

  const bizMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses])
  const value: DataCtx = {
    state, error, online, busy, email: session!.user.email ?? '', businesses, profile, teamProfiles, memberships, isAdmin: profile?.role === 'owner',
    bizById: id => (id ? bizMap.get(id) : undefined), bizBySlug: slug => businesses.find(b => b.slug === slug),
    tasks: db.tasks, followUps: db.follow_ups, projects: db.projects, ideas: db.ideas, notifications: db.notifications,
    referrers: db.referrers, prospects: db.prospects, activities: db.prospect_activities, income: db.income_entries, expenses: db.expenses, settings, create, createMany, update, remove,
    setTaskStatus, toggleTask, completeFollowUp, reopenFollowUp, rescheduleFollowUp, updateSettings, updateProfile, setMembership,
    createBusiness, createPartner, reload, signOut: async () => { await supabase.auth.signOut() },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
