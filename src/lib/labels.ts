import { IdeaStatus, InvoiceStatus, Priority, ProjectStatus, ReferrerType, Stage, Status, TaskType } from './types'
export const STATUS: Record<Status, string> = { pending: 'Pending', in_progress: 'In progress', completed: 'Completed' }
export const PRIORITY: Record<Priority, string> = { normal: 'Normal', high: 'High', urgent: 'Urgent' }
export const TASK_TYPE: Record<TaskType, string> = {
  general: 'General task', follow_up: 'Follow-up', client_work: 'Client work',
  project_task: 'Project task', marketing: 'Marketing', administration: 'Administration',
}
export const PROJECT_STATUS: Record<ProjectStatus, string> = { planning: 'Planning', in_progress: 'In progress', on_hold: 'On hold', completed: 'Completed', dropped: 'Dropped' }
export const INVOICE: Record<InvoiceStatus, string> = { not_sent: 'Not sent', sent: 'Sent, unpaid', paid: 'Paid' }
export const REFERRER_TYPE: Record<ReferrerType, string> = { agency: 'Agency', individual: 'Individual', direct: 'Direct', marketplace: 'Marketplace' }
export const STAGE: Record<Stage, string> = {
  prospect: 'Prospect', email_1: 'Email 1', follow_up_1: 'Follow-up 1', follow_up_2: 'Follow-up 2', replied: 'Replied', call_booked: 'Call booked',
  test_project: 'Test project', partner: 'Partner', not_now: 'Not now', not_interested: 'Not interested', invalid: 'Invalid email',
  new: 'New', contacted: 'Contacted', interested: 'Interested', proposal_sent: 'Proposal sent', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
}
export const IDEA_STATUS: Record<IdeaStatus, string> = { new: 'New', exploring: 'Exploring', converted: 'Converted', archived: 'Archived' }

// Suggested categories per workspace (free text is also allowed).
export const CATEGORIES: Record<string, string[]> = {
  'white-label': ['Agency leads', 'Prospect research', 'Cold email outreach', 'Agency follow-ups', 'Partnership discussions', 'Website projects', 'Client delivery', 'Payments', 'Marketing'],
  yogeworks: ['Business leads', 'Sales partner management', 'Lead follow-ups', 'Client enquiries', 'Website projects', 'Website delivery', 'Payments', 'Marketing campaigns'],
  yogecreatives: ['Client projects', 'Website development', 'Wix Studio', 'Website maintenance', 'SEO', 'Client communication', 'Payments', 'Marketing', 'Agency operations'],
  yogefolio: ['Potential clients', 'Sales enquiries', 'Follow-ups', 'Portfolio website projects', 'Website delivery', 'Marketing', 'Payments'],
  other: [],
}
