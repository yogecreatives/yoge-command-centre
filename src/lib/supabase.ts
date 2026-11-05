import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)
// Only the public URL + anon/publishable key are ever used here. Access is enforced by Row Level Security.
export const supabase: SupabaseClient = configured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } })
  : (null as unknown as SupabaseClient)
