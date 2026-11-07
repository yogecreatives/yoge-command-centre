import { Prospect, Stage } from './types'
import { addDays } from './dates'

export const CLIENT_STAGES: Stage[] = ['new', 'contacted', 'replied', 'interested', 'proposal_sent', 'negotiation', 'won', 'lost']
export const OPEN_STAGES: Stage[] = ['new', 'contacted', 'replied', 'interested', 'proposal_sent', 'negotiation']
export const isOpenLead = (p: Prospect) => OPEN_STAGES.includes(p.stage)
export const leadDue = (p: Prospect, today: string) => isOpenLead(p) && !!p.next_action_date && p.next_action_date <= today
export const FOLLOW_UP_DAYS = 3

/** What changes when you log outreach: a new lead becomes Contacted, and the next follow-up is scheduled. */
export function outreachPatch(p: Prospect, today: string, days = FOLLOW_UP_DAYS): Partial<Prospect> {
  return {
    stage: p.stage === 'new' ? 'contacted' : p.stage,
    last_contacted_at: new Date().toISOString(),
    next_action_date: addDays(today, days),
  }
}
