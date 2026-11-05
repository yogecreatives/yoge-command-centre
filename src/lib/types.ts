export type Status = 'pending' | 'in_progress' | 'completed'
export type Priority = 'normal' | 'high' | 'urgent'
export type TaskType = 'general' | 'follow_up' | 'client_work' | 'project_task' | 'marketing' | 'administration'
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'dropped'
export type InvoiceStatus = 'not_sent' | 'sent' | 'paid'
export type ReferrerType = 'agency' | 'individual' | 'direct' | 'marketplace'
export type Stage = 'prospect' | 'email_1' | 'follow_up_1' | 'follow_up_2' | 'replied' | 'call_booked' | 'test_project' | 'partner' | 'not_now' | 'not_interested' | 'invalid' | 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
export type IdeaStatus = 'new' | 'exploring' | 'converted' | 'archived'

interface Base { id: string; user_id: string; created_at: string; updated_at: string }
export interface Business extends Base { slug: string; name: string; description: string | null; symbol: string | null; sort_order: number }
export interface Profile { id: string; user_id: string; full_name: string | null; email: string | null; avatar_url: string | null; position: string | null; role: 'owner' | 'member'; created_at: string; updated_at: string }
export interface WorkspaceMembership { id: string; business_id: string; user_id: string; role: 'member' | 'manager'; created_at: string }
export interface Task extends Base {
  business_id: string; project_id: string | null; title: string; category: string | null
  task_type: TaskType; priority: Priority; status: Status; due_date: string | null
  notes: string | null; completed_at: string | null
}
export interface FollowUp extends Base {
  business_id: string; person_name: string; company: string | null; email: string | null; phone: string | null
  follow_up_date: string; notes: string | null; status: 'open' | 'completed'; completed_at: string | null
}
export interface Project extends Base {
  business_id: string; name: string; client_name: string | null; description: string | null
  start_date: string | null; due_date: string | null; status: ProjectStatus; priority: Priority
  notes: string | null; completed_at: string | null
  total_amount: number; paid_amount: number; balance_amount: number; referrer_id: string | null
  invoice_status: InvoiceStatus; commission_amount: number | null; client_email: string | null; client_phone: string | null
}
export interface Idea extends Base {
  business_id: string | null; title: string; description: string | null; category: string | null; status: IdeaStatus
}
export interface AppNotification {
  id: string; user_id: string; kind: string; title: string; body: string | null
  ref_table: string | null; ref_id: string | null; ref_date: string | null; read_at: string | null; created_at: string
}
export interface Settings {
  id: string; user_id: string; timezone: string; timezone_confirmed: boolean
  remind_days_before: number; remind_tasks: boolean; remind_followups: boolean; remind_projects: boolean; remind_overdue: boolean
  sender_name: string; daily_new_limit: number; outreach_gaps: number[]; skip_weekends: boolean; direct_us_goal: number
  outreach_templates: Templates; project_task_template: StarterTask[]
}

export interface Referrer extends Base { name: string; type: ReferrerType; email: string | null; phone: string | null; notes: string | null }
export interface Prospect extends Base {
  business_id: string; agency_name: string; contact_name: string | null; email: string | null; phone: string | null
  website: string | null; country: string | null; source: string | null; fit: number; stage: Stage
  next_action_date: string | null; last_contacted_at: string | null; snooze_until: string | null
  test_project_value: number | null; notes: string | null
  city: string | null; category: string | null; next_action: string | null; lost_reason: string | null; won_project_id: string | null
  review_status: 'pending' | 'approved' | 'hold' | 'rejected'; website_classification: 'unreviewed' | 'good' | 'needs_improvement' | 'outdated'
  priority: 'low' | 'medium' | 'high'; google_rating: number | null; google_review_count: number | null; wix_detected: boolean | null
  wix_evidence: string | null; website_screenshot_url: string | null; research_summary: string | null; research_data: Record<string, unknown>
  outreach_draft: string | null; outreach_channel: 'email' | 'facebook' | 'instagram' | 'linkedin' | 'other' | null
  outreach_approved_at: string | null; decision_notes: string | null
}
export interface Activity { id: string; user_id: string; prospect_id: string; kind: 'email_sent' | 'dm_sent' | 'replied' | 'call' | 'note' | 'stage_change'; note: string | null; created_at: string }
export interface Income extends Base { business_id: string | null; source: string; amount: number; entry_date: string; status: 'received' | 'expected'; notes: string | null }
export interface MailTemplate { subject: string; body: string }
export type Templates = Record<'email_1' | 'follow_up_1' | 'follow_up_2' | 'last_nudge', MailTemplate>
export interface StarterTask { title: string; days: number }
export interface Expense extends Base { business_id: string | null; amount: number; expense_date: string; category: string | null; vendor: string | null; notes: string | null }
