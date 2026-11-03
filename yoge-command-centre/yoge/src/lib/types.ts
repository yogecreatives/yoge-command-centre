export type Status = 'pending' | 'in_progress' | 'completed'
export type Priority = 'normal' | 'high' | 'urgent'
export type TaskType = 'general' | 'follow_up' | 'client_work' | 'project_task' | 'marketing' | 'administration'
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'dropped'
export type IdeaStatus = 'new' | 'exploring' | 'converted' | 'archived'

interface Base { id: string; user_id: string; created_at: string; updated_at: string }
export interface Business extends Base { slug: string; name: string; description: string | null; symbol: string | null; sort_order: number }
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
  total_amount: number; paid_amount: number; referred_by: string | null; invoice_status: 'not_sent' | 'sent' | 'paid'
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
  remind_days_before: number; remind_tasks: boolean; remind_followups: boolean; remind_projects: boolean; remind_overdue: boolean; starter_tasks: { title: string; offset: number }[]
}
