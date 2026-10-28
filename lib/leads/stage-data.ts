import type { PickedPdf } from '@/lib/contracts/pdf'
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
  /** (pending modules S05 — REG-149's 'Q-101' stand-in retired) the lead's files the log attaches, by id, beside their names in `files` —
      the Notes tab lists them under the log; an older log holds names alone */
  fileIds?: string[]
  notes: string
  collapsed?: boolean
  /** (UX audit 2026-09-30, L2) The Notes-tab contact log this entry was filled from (`?move=contacted&log=<id>`) — the Notes list
      shows that log once, as the note it is, and never again as a stage row. */
  noteId?: string
}

export type MeetingLog = {
  where: string
  when: string
  files: string[]
  /** (pending modules S05) the meeting's documents, by id (as a contact log's) */
  fileIds?: string[]
  notes: string
  collapsed?: boolean
  /** (pending modules S23) The meeting this log IS (lib/meetings) — its co-pilot session and brief. A meeting held on a lead is its Met log, never
      a second record of where and when: the Meetings tab reads this log's where and when, and lists a log with no meeting as itself. */
  meetingId?: string
}

export type WizardData = {
  assignees: string[]
  logs: ContactLog[]                       // Contacted
  meetings: MeetingLog[]                   // Met (780:90234 — a log list like Contacted)
  quoteTab: 'system' | 'upload'
  quoteSelected: string | null             // From System quote name
  /** (UX audit 2026-09-30, Q1) The picked system quote's id — the move stamps THAT quote Sent to Client (names can repeat). Older logs lack it. */
  quoteSelectedId?: string | null
  quoteUploaded: string | null             // Uploaded file name
  /** (pending modules S05) The uploaded quote itself, on its way to Files › Quotes & BOQ — lifted out before the stage log is kept. */
  quoteFile?: PickedPdf | null
  quoteAmount: string
  /** (pending modules S05) the Quote Sent step's optional meeting documents and render — the lead's files, by id (they were tiles the step
      never kept) */
  quoteMeetingFiles?: string[]
  quoteRenderFiles?: string[]
  wonQuoteTab: 'system' | 'upload'
  wonQuote: string | null                  // From System signed quote
  wonQuoteUploaded: string | null          // Uploaded signed quote (780:92744)
  /** (pending modules S05) The uploaded signed quote itself, kept in the lead's Files with the project — lifted out before the stage log is kept. */
  wonQuoteFile?: PickedPdf | null
  wonQuoteAmount: string                   // Only asked in the upload flow — the file can't tell us the amount
  wonContractTab: 'system' | 'upload'
  wonContract: string | null
  wonContractUploaded: string | null
  /** (pending modules S03) The picked PDF itself, on its way to the contract the step makes — lifted out before the stage log is kept. */
  wonContractFile?: PickedPdf | null
  milestones: { name: string; meta: string; pct: number }[]
  projectType: string
}

/* (S43B · F1-01) Auto Fill reads the picked file by rule (lib/leads/contact-fill.ts) — the scripted next step (AUTO_FILL_DAYS on at
   AUTO_FILL_HOUR) is gone; testers' L-6 stays there: a file that names no moment gives the log the upload's. */

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

/* (held calls 2026-10-24 — his "fix all of it") The upload flow's 0% split (780:92744, REG-149) is retired at every width: an uploaded signed
   quote starts at the studio's usual (components/leads/move-stage/panels.tsx `uploadSplit`, `fetchUsualSplit` in app/leads/actions.ts). */

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
/** (pending modules S05 — Manage Stages) What the studio set a step to ask for (Settings › Lead management › Lead stages); absent = the defaults. */
export type StageAsks = { contactNextStep?: boolean; wonContract?: boolean }
export function validateStage(stage: Stage, d: WizardData, asks: StageAsks = {}): StageErrors {
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
        /* (pending modules S05) …unless the studio asks for it (1.0's "Follow-up required") — never for a client who said they're not interested */
        else if (asks.contactNextStep && !l.nextStepWhen && l.outcome && l.outcome !== 'Not interested') e[k('nextStepWhen')] = MSG.required
        /* (Leads on the move, Q-02 — his pick 2026-10-23: "optional in both places, with Take a photo offered first"; reverses REG-543's
           mandatory screenshot here) The log is what matters — channel, when, outcome. A screenshot or a photo is optional, as it always was
           on the Notes tab's contact log: one log, one rule, at every width (the window's Attach row says "(optional)"). */
      })
      break
    }
    case 'Met':
      d.meetings.forEach((m, i) => {
        const k = (f: string) => `meetings.${i}.${f}`
        if (!m.where) e[k('where')] = MSG.required
        if (!m.when) e[k('when')] = MSG.required; else if (!parseInputDateTime(m.when)) e[k('when')] = MSG.dateTime
        // (REG-543) Meeting documents are optional — a meeting is logged by where and when (tester feedback 2026-09-15).
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
      /* (pending modules S05) the signed contract, unless the studio wins a lead on its signed quote alone (1.0's "Contract required" off) */
      if (asks.wonContract !== false) {
        if (d.wonContractTab === 'system') { if (!d.wonContract) e.wonContract = MSG.choose }
        else if (!d.wonContractUploaded) e.wonContract = MSG.attach
      }
      const total = d.milestones.reduce((n, m) => n + (Number.isFinite(m.pct) ? m.pct : 0), 0)
      if (total !== 100) e.milestones = MSG.milestones
      if (!d.projectType) e.projectType = MSG.required
      break
    }
    default: break
  }
  return e
}

/** The window's field names, in the words its labels use — a refusal names the field it is about. */
const FIELD_WORD: Record<string, string> = {
  // (the calm UI build 2026-10-27 — 2-08) the labels' new words: How · When · How it went · Call back by
  channel: 'How', when: 'When', outcome: 'How it went', nextStepWhen: 'the call back', nextStepMode: 'Call back by', files: 'the proof of contact',
  where: 'Where', assignees: 'Members', quote: 'the quote', quoteAmount: 'Quote amount', wonQuote: 'the signed quote', wonQuoteAmount: 'Quote amount',
  wonContract: 'the signed contract', milestones: 'the payment split', projectType: 'Project type',
}
/**
 * (S43B · F1-07 — his "fix all the pending things" 2026-10-15, as recommended; S05's note for the developers) The server's answer to a stage's
 * fields that `validateStage` refuses — the window's own message, named by its field, in the house's refusal shape: "The Contacted step isn’t
 * complete — Log 1’s Contacted via: choose an option". Null when the step is complete. (invented copy, reg-S43B)
 */
export function stageRefusal(stage: Stage, errors: StageErrors): string | null {
  const first = Object.entries(errors).find(([, v]) => !!v)
  if (!first) return null
  const [key, msg] = first
  const m = /^(logs|meetings)\.(\d+)\.(\w+)$/.exec(key)
  const field = m ? `Log ${Number(m[2]) + 1}’s ${FIELD_WORD[m[3]!] ?? m[3]}` : FIELD_WORD[key] ?? key
  return `The ${stage} step isn’t complete — ${field}: ${msg!.replace(/^./, (c) => c.toLowerCase())}`
}

/**
 * (UX audit 2026-09-30, T3 — extends REG-324) The contact log's Attach row names what proves THIS contact: a visit leaves photos, a
 * call or a message leaves screenshots. One wording for the Move stage window and the Notes tab.
 */
export function attachLabel(channel: string | null | undefined): string {
  // (the calm UI build 2026-10-27 — W-486) shorter, and the log's own verb: the row's link is Attach
  if (channel === 'In person') return 'Add photos from the visit'
  if (channel === 'WhatsApp' || channel === 'Email' || channel === 'SMS') return 'Add screenshots of the messages'
  return 'Add a screenshot'   // Call, Others, nothing chosen yet
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
  'Quote Sent': ['quoteTab', 'quoteSelected', 'quoteSelectedId', 'quoteUploaded', 'quoteAmount', 'quoteMeetingFiles', 'quoteRenderFiles'],
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
