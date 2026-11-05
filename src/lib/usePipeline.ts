import { useData } from './data'
import { useToast } from '../ui/toast'
import { NEXT_STEP, sentPatch } from './pipeline'
import { Prospect, Stage } from './types'
import { todayISO } from './dates'

export function usePipelineActions() {
  const { update, create, settings } = useData()
  const toast = useToast()
  const log = (p: Prospect, kind: string, note: string) => create('prospect_activities', { prospect_id: p.id, kind, note })

  const markSent = async (p: Prospect) => {
    if (!settings) return
    const patch = sentPatch(p, settings, todayISO()); const step = NEXT_STEP[p.stage]
    if (!patch || !step) return
    const res = await update('prospects', p.id, patch as Record<string, unknown>)
    if (res) { await log(p, 'email_sent', `${step.label} sent`); toast(`${step.label} sent to ${p.agency_name}`) }
  }
  const setStage = async (p: Prospect, stage: Stage, extra: Record<string, unknown> = {}, note?: string) => {
    const res = await update('prospects', p.id, { stage, ...extra })
    if (res) await log(p, stage === 'replied' ? 'replied' : 'stage_change', note || `Moved to ${stage.replace(/_/g, ' ')}`)
    return res
  }
  return { markSent, setStage, log }
}
