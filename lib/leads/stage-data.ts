import { STAGES, type Stage } from '@/lib/leads/enums'
import { MSG } from '@/lib/forms'
import { parseInputDateTime } from '@/lib/format'

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

export type MeetingLog = {
  where: string
  when: string
  files: string[]
  notes: string
  collapsed?: boolean
}

export type WizardData = {
  assignees: string[]
  logs: ContactLog[]                       // Contacted
  meetings: MeetingLog[]                   // Met (780:90234 — a log list like Contacted)
  quoteTab: 'system' | 'upload'
  quoteSelected: string | null             // From System quote name
  quoteUploaded: string | null             // Uploaded file name
  quoteAmount: string
  wonQuoteTab: 'system' | 'upload'
  wonQuote: string | null                  // From System signed quote
  wonQuoteUploaded: string | null          // Uploaded signed quote (780:92744)
  wonQuoteAmount: string                   // Only asked in the upload flow — the file can't tell us the amount
  wonContractTab: 'system' | 'upload'
  wonContract: string | null
  wonContractUploaded: string | null
  milestones: { name: string; meta: string; pct: number }[]
  projectType: string
}

/** The system's own files (780:91468 / 780:92744) — first in every From System list and selected by default (user 2026-08-29). */
export const SYSTEM_QUOTE = 'Whole-home renovation'
export const SYSTEM_CONTRACT = 'Contract_OliviaM_signed.pdf'

export const DEFAULT_MILESTONES = [
  { name: 'Deposit', meta: 'Upon signing', pct: 10 },
  { name: 'Commencement', meta: 'Works commence', pct: 30 },
  { name: 'Mid-Project', meta: '50% completion', pct: 30 },
  { name: 'Completion', meta: 'Handover', pct: 30 },
]

/** The split recorded in the system for a system-issued quote (780:92744 default rows). */
export function defaultMilestones(): WizardData['milestones'] {
  return DEFAULT_MILESTONES.map((m) => ({ ...m }))
}

/** Upload flow (780:92744): a signed quote we didn't issue carries no payment split — every milestone starts at 0%. */
export function zeroMilestones(): WizardData['milestones'] {
  return DEFAULT_MILESTONES.map((m) => ({ ...m, pct: 0 }))
}

/** "70,500" → minor units (7050000); anything unparsable → 0. */
export function amountMinor(s: string): number {
  const n = Number(s.replace(/,/g, '').trim())
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0
}

const AMOUNT_RE = /^\d[\d,]*$/
function amountError(s: string): string | undefined {
  if (!s.trim()) return MSG.required
  return AMOUNT_RE.test(s.trim()) ? undefined : MSG.amount
}

export function emptyLog(): ContactLog {
  return { channel: null, when: '', outcome: '', nextStepWhen: '', nextStepMode: '', files: [], notes: '' }
}
export function emptyMeeting(): MeetingLog {
  return { where: '', when: '', files: [], notes: '' }
}

export function emptyWizardData(assignees: string[]): WizardData {
  return {
    assignees,
    logs: [emptyLog()],
    meetings: [emptyMeeting()],
    quoteTab: 'system', quoteSelected: SYSTEM_QUOTE, quoteUploaded: null, quoteAmount: '',
    wonQuoteTab: 'system', wonQuote: SYSTEM_QUOTE, wonQuoteUploaded: null, wonQuoteAmount: '',
    wonContractTab: 'system', wonContract: SYSTEM_CONTRACT, wonContractUploaded: null,
    milestones: defaultMilestones(),
    projectType: 'Whole-home renovation',
  }
}

/**
 * Per-stage validation — every field except notes is mandatory (user 2026-08-29); dates must be real
 * dates. Keys are the field names the panels render errors under; `stageComplete` derives from it.
 */
export type StageErrors = Partial<Record<string, string>>
export function validateStage(stage: Stage, d: WizardData): StageErrors {
  const e: StageErrors = {}
  switch (stage) {
    case 'New': if (d.assignees.length === 0) e.assignees = MSG.assignee; break   // New is complete only once someone owns the lead (user 2026-08-29)
    case 'Contacted': {
      d.logs.forEach((l, i) => {
        const k = (f: string) => `logs.${i}.${f}`
        if (!l.channel) e[k('channel')] = MSG.choose
        if (!l.when) e[k('when')] = MSG.required; else if (!parseInputDateTime(l.when)) e[k('when')] = MSG.dateTime
        if (!l.outcome) e[k('outcome')] = MSG.required
        // (REG-319, mock 781:58313) The schedule pair is optional for every outcome; a date that IS entered must parse.
        if (l.nextStepWhen && !parseInputDateTime(l.nextStepWhen)) e[k('nextStepWhen')] = MSG.dateTime
        if (l.files.length === 0) e[k('files')] = MSG.attach
      })
      break
    }
    case 'Met':
      d.meetings.forEach((m, i) => {
        const k = (f: string) => `meetings.${i}.${f}`
        if (!m.where) e[k('where')] = MSG.required
        if (!m.when) e[k('when')] = MSG.required; else if (!parseInputDateTime(m.when)) e[k('when')] = MSG.dateTime
        if (m.files.length === 0) e[k('files')] = MSG.attach
      })
      break
    case 'Quote Sent':
      if (d.quoteTab === 'system') { if (!d.quoteSelected) e.quote = MSG.choose }
      else {
        if (!d.quoteUploaded) e.quote = MSG.attach
        const a = amountError(d.quoteAmount); if (a) e.quoteAmount = a
      }
      break
    case 'Won': {
      if (d.wonQuoteTab === 'system') { if (!d.wonQuote) e.wonQuote = MSG.choose }
      else {
        if (!d.wonQuoteUploaded) e.wonQuote = MSG.attach
        const a = amountError(d.wonQuoteAmount); if (a) e.wonQuoteAmount = a
      }
      if (d.wonContractTab === 'system') { if (!d.wonContract) e.wonContract = MSG.choose }
      else if (!d.wonContractUploaded) e.wonContract = MSG.attach
      const total = d.milestones.reduce((n, m) => n + (Number.isFinite(m.pct) ? m.pct : 0), 0)
      if (total !== 100) e.milestones = MSG.milestones
      if (!d.projectType) e.projectType = MSG.required
      break
    }
    default: break
  }
  return e
}

/** Per-stage completeness — drives rail states and Save validation (A1). */
export function stageComplete(stage: Stage, d: WizardData): boolean {
  return Object.keys(validateStage(stage, d)).length === 0
}

/** Which WizardData fields belong to which stage — the journey reads a stage's details only from that stage's own log. */
export const STAGE_FIELDS: Record<(typeof STAGES)[number], (keyof WizardData)[]> = {
  'New': [],
  'Contacted': ['logs'],
  'Met': ['meetings'],
  'Quote Sent': ['quoteTab', 'quoteSelected', 'quoteUploaded', 'quoteAmount'],
  'Won': ['wonQuoteTab', 'wonQuote', 'wonQuoteUploaded', 'wonQuoteAmount', 'wonContractTab', 'wonContract', 'wonContractUploaded', 'milestones', 'projectType'],
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
