import { STAGES, type Stage } from '@/lib/leads/enums'

/* Stage details captured by the Move stage window (M2). Pure — shared by the wizard and the listing loader. */

export type ContactLog = {
  channel: string | null
  when: string
  outcome: string
  nextStepWhen: string
  nextStepMode: string
  files: string[]
  notes: string
  collapsed?: boolean
}

export type WizardData = {
  assignees: string[]
  logs: ContactLog[]                       // Contacted
  metWhere: string; metWhen: string; metFiles: string[]; metNotes: string
  quoteTab: 'system' | 'upload'
  quoteSelected: string | null             // From System quote name
  quoteUploaded: string | null             // Uploaded file name
  quoteAmount: string
  wonQuoteTab: 'system' | 'upload'
  wonQuote: string | null
  wonContractTab: 'system' | 'upload'
  wonContract: string | null
  milestones: { name: string; meta: string; pct: number }[]
  projectType: string
}

export const DEFAULT_MILESTONES = [
  { name: 'Deposit', meta: 'Upon signing', pct: 10 },
  { name: 'Commencement', meta: 'Works commence', pct: 30 },
  { name: 'Mid-Project', meta: '50% completion', pct: 30 },
  { name: 'Completion', meta: 'Handover', pct: 30 },
]

export function emptyLog(): ContactLog {
  return { channel: null, when: '', outcome: '', nextStepWhen: '', nextStepMode: '', files: [], notes: '' }
}

export function emptyWizardData(assignees: string[]): WizardData {
  return {
    assignees,
    logs: [emptyLog()],
    metWhere: '', metWhen: '', metFiles: [], metNotes: '',
    quoteTab: 'system', quoteSelected: null, quoteUploaded: null, quoteAmount: '',
    wonQuoteTab: 'system', wonQuote: null,
    wonContractTab: 'system', wonContract: null,
    milestones: DEFAULT_MILESTONES.map((m) => ({ ...m })),
    projectType: 'Whole-home renovation',
  }
}

/** Per-stage completeness — drives rail states and Save validation (A1). */
export function stageComplete(stage: Stage, d: WizardData): boolean {
  switch (stage) {
    case 'New': return true
    case 'Contacted': return d.logs.some((l) => l.channel && l.when)
    case 'Met': return !!(d.metWhere && d.metWhen)
    case 'Quote Sent':
      return d.quoteTab === 'system' ? !!d.quoteSelected : !!(d.quoteUploaded && d.quoteAmount)
    case 'Won': return !!(d.wonQuote && d.wonContract)
    default: return true
  }
}

/** Which WizardData fields belong to which stage — the journey reads a stage's details only from that stage's own log. */
export const STAGE_FIELDS: Record<(typeof STAGES)[number], (keyof WizardData)[]> = {
  'New': [],
  'Contacted': ['logs'],
  'Met': ['metWhere', 'metWhen', 'metFiles', 'metNotes'],
  'Quote Sent': ['quoteTab', 'quoteSelected', 'quoteUploaded', 'quoteAmount'],
  'Won': ['wonQuoteTab', 'wonQuote', 'wonContractTab', 'wonContract', 'milestones', 'projectType'],
}

/** A stage log written by the wizard (as opposed to a quick move, an On Hold/Lost reason, or an undo). */
export function isWizardPayload(p: unknown): p is WizardData {
  return !!p && typeof p === 'object' && Array.isArray((p as { logs?: unknown }).logs)
}

/**
 * Latest details per stage, folded into one WizardData-shaped patch. Logs are expected oldest → newest;
 * for each stage the newest wizard payload whose target is that stage wins.
 */
export function mergeStageData(logs: { toStage: string; payload: unknown }[]): Partial<WizardData> {
  const out: Partial<WizardData> = {}
  for (const log of logs) {
    if (!isWizardPayload(log.payload)) continue
    const fields = STAGE_FIELDS[log.toStage as keyof typeof STAGE_FIELDS]
    if (!fields) continue
    for (const f of fields) {
      const v = log.payload[f]
      if (v !== undefined) (out as Record<string, unknown>)[f] = v
    }
  }
  return out
}

/** Stages recorded on the lead: every stage the wizard has captured details for. */
export function recordedStages(d: Partial<WizardData>): Set<Stage> {
  const s = new Set<Stage>()
  for (const stage of STAGES) {
    const fields = STAGE_FIELDS[stage]
    if (fields.some((f) => d[f] !== undefined)) s.add(stage)
  }
  return s
}
