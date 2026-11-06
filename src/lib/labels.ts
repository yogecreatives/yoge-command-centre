import { IdeaStatus, InvoiceStatus, Priority, ProjectStatus, ReferrerType, Status, TaskType } from './types'
export const STATUS: Record<Status, string> = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed' }
export const PRIORITY: Record<Priority, string> = { normal: 'Normal', high: 'High', urgent: 'Urgent' }
export const TASK_TYPE: Record<TaskType, string> = {
  general: 'General task', follow_up: 'Follow-up', client_work: 'Client work',
  project_task: 'Project task', marketing: 'Marketing', administration: 'Administration',
}
export const PROJECT_STATUS: Record<ProjectStatus, string> = { planning: 'Planning', in_progress: 'In progress', on_hold: 'On hold', completed: 'Completed', dropped: 'Dropped' }
export const INVOICE: Record<InvoiceStatus, string> = { not_sent: 'Not sent', sent: 'Sent, unpaid', paid: 'Paid' }
export const REFERRER_TYPE: Record<ReferrerType, string> = { agency: 'Agency', individual: 'Individual', direct: 'Direct', marketplace: 'Marketplace' }
export const IDEA_STATUS: Record<IdeaStatus, string> = { new: 'New', exploring: 'Exploring', converted: 'Converted', archived: 'Archived' }

export const CATEGORIES: Record<string, string[]> = {
  'white-label': ['Website projects', 'Client delivery', 'Payments', 'Marketing'],
  yogeworks: ['Client enquiries', 'Website projects', 'Website delivery', 'Payments', 'Marketing campaigns'],
  yogecreatives: ['Client projects', 'Website development', 'Wix Studio', 'Website maintenance', 'SEO', 'Client communication', 'Payments', 'Marketing', 'Agency operations'],
  yogefolio: ['Portfolio website projects', 'Website delivery', 'Marketing', 'Payments'],
  other: [],
}
