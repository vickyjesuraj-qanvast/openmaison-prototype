/**
 * (pending modules S46C · R1 — her "fix everything" 2026-10-19 after the findability audit, finding L-1; her open call taken as recommended:
 * "1.0's archived leads land in Lost with the reason 'Archived in 1.0'") THE PORT OF 1.0's ARCHIVED LEADS. Pure: no database, no clock — a
 * port script reads 1.0's rows, calls this, and writes what it answers.
 *
 * 1.0 (migration 092 `leads.archived_at`; `archiveLead` in src/lib/lifecycle/transitions.ts, `deployment/qanvast`): Archive hid a lead from the
 * board and kept it in Accounts › Archived Leads "until you revive them" — no reason asked, no purge (1.0 took its own "deleted after 30 days"
 * note out because nothing removed them); the archive cancelled the lead's open tasks and wrote "Lead archived" to `lead_activity_log`
 * (`performed_by`, `performed_at`). Revive took it back to the board where it was.
 *
 * 2.0 has no Archive (A01 DEF-03), and Deleted Leads removes a lead for good 30 days after its delete (S46C, lib/leads/purge.ts) — so an
 * archived lead is never trash. It is a lead the studio stopped working, which is what 2.0's **Lost** is (a parked stage; Resume brings it back,
 * as Revive did):
 *   · `deleted_at` stays null — the lead is on the listing under Lost, never in Deleted Leads;
 *   · its stage is Lost, with ONE Lost stage log: from the stage the state mapping gave it (map 02 §2, the audit's §4.6), at the archive's moment,
 *     reason "Archived in 1.0", moved by the member 1.0's "Lead archived" line names (null when the port found none — Activity then reads "The
 *     lead moved from … to Lost", as for a log from before `moved_by`). The log's id comes from the lead's, so a second run writes nothing new;
 *   · a lead 1.0 had already closed (Lost by the state mapping, its own reason on its own Lost log) keeps that log — the archive adds nothing
 *     (`already-lost`);
 *   · a lead the port gives a project stays where the project holds it — 2.0 refuses Lost while a project lives (fix-E, A-01) — noted
 *     (`kept-by-project`);
 *   · an archive date that can't be read lands at the port's own moment, noted (`bad-date`).
 * The reason is a SYSTEM reason, as "Lead returned to Qanvast" is (app/leads/return-actions.ts): it is never added to the studio's Lost reasons
 * (settings `lead_reasons`), so the Lost dialog never offers it and a rename in Settings › Lead management never touches it; the lead's LEAD
 * STAGES card, Activity and Reports › Leads read it from the log like any reason. `withoutArchivedReason` keeps a studio's list clean of it
 * should a hand-made list carry the same words. The archive's cancelled tasks are the tasks' own port (Cancelled → done); nothing here writes
 * a task.
 */

/** The Lost reason every archived 1.0 lead carries in 2.0. */
export const ARCHIVED_REASON = 'Archived in 1.0'

/** 2.0's stages (lib/leads/enums.ts `ALL_STAGES`) — repeated here so the mapper stays free of the app's imports (a port script runs it alone). */
export type PortStage = 'New' | 'Contacted' | 'Met' | 'Quote Sent' | 'Won' | 'On Hold' | 'Lost'
const PORT_STAGES: readonly PortStage[] = ['New', 'Contacted', 'Met', 'Quote Sent', 'Won', 'On Hold', 'Lost']

/** A 1.0 lead as the port reads it for this step. */
export type V1ArchivedLead = {
  id: string
  /** 1.0's `leads.archived_at` — ISO text, epoch milliseconds or a Date; null / blank = not archived */
  archived_at: string | number | Date | null | undefined
  /** the 2.0 stage the state mapping (map 02 §2, the audit's §4.6) gives the lead from its bucket and status */
  stage: PortStage
  /** the port gives the lead a project (`projects.lead_id`) — 2.0 holds such a lead where it is */
  hasProject?: boolean
  /** `lead_activity_log.performed_by` of the lead's latest "Lead archived" line, when the port found one (1.0's user id) */
  archived_by?: string | null
}

/** The Lost stage log the port writes (`stage_logs`). */
export type ArchivedLostLog = {
  id: string
  leadId: string
  fromStage: PortStage
  toStage: 'Lost'
  createdAt: Date
  /** members.id — null when 1.0 named nobody, or someone the members' port doesn't know */
  movedBy: string | null
  payload: { reason: typeof ARCHIVED_REASON }
}

export type ArchivedNoteKind =
  | 'already-lost'       // closed in 1.0 before it was archived: its own Lost log stands, nothing added
  | 'kept-by-project'    // the port gives it a project: it stays where the project holds it
  | 'bad-date'           // the archive date couldn't be read: the port's own moment
  | 'archived-by-unknown' // 1.0 named a user the members' port doesn't know: the log names nobody

/** What the port writes for one lead: its stage, `deleted_at` (always null — never trash), the Lost log (or none) and what the log should say. */
export type ArchivedLeadPort = { leadId: string; archived: boolean; stage: PortStage; deletedAt: null; log: ArchivedLostLog | null; notes: ArchivedNoteKind[] }

/** 1.0's archive moment as a Date, or null when the lead isn't archived; `undefined` when the value is there but can't be read. */
export function archivedAtOf(v: V1ArchivedLead['archived_at']): Date | null | undefined {
  if (v === null || v === undefined) return null
  if (typeof v === 'string' && !v.trim()) return null
  const d = v instanceof Date ? new Date(v.getTime()) : typeof v === 'number' ? new Date(v) : new Date(v.trim())
  return Number.isFinite(d.getTime()) ? d : undefined
}

/** The Lost log's id — the lead's own, so a second run of the port writes the same row (`INSERT OR IGNORE`). */
export const archivedLogId = (leadId: string) => `v1-archived-${leadId}`

/** Whether a stage log's reason is the archive's (Activity and reports may name it; the Lost dialog never offers it). */
export const isArchivedReason = (reason: unknown): boolean => typeof reason === 'string' && reason.trim().toLowerCase() === ARCHIVED_REASON.toLowerCase()

/**
 * One lead. `memberFor` answers 1.0's user id with the 2.0 member the members' port made (null: none); `portedAt` is the moment a date that
 * can't be read lands on (the port's own run).
 */
export function portArchivedLead(lead: V1ArchivedLead, memberFor: (userId: string) => string | null, portedAt: Date): ArchivedLeadPort {
  const stage: PortStage = PORT_STAGES.includes(lead.stage) ? lead.stage : 'New'
  const at = archivedAtOf(lead.archived_at)
  const base = { leadId: lead.id, deletedAt: null } as const
  if (at === null) return { ...base, archived: false, stage, log: null, notes: [] }
  const notes: ArchivedNoteKind[] = []
  if (lead.hasProject) return { ...base, archived: true, stage, log: null, notes: ['kept-by-project'] }
  if (stage === 'Lost') return { ...base, archived: true, stage, log: null, notes: ['already-lost'] }
  if (at === undefined) notes.push('bad-date')
  const by = lead.archived_by ? memberFor(lead.archived_by) : null
  if (lead.archived_by && !by) notes.push('archived-by-unknown')
  return {
    ...base, archived: true, stage: 'Lost', notes,
    log: { id: archivedLogId(lead.id), leadId: lead.id, fromStage: stage, toStage: 'Lost', createdAt: at ?? new Date(portedAt.getTime()), movedBy: by, payload: { reason: ARCHIVED_REASON } },
  }
}

/** Every lead of a studio, with the port's log lines (one per note) — the leads that weren't archived come back unchanged. */
export function portArchivedLeads(list: readonly V1ArchivedLead[], memberFor: (userId: string) => string | null, portedAt: Date): { leads: ArchivedLeadPort[]; notes: { kind: ArchivedNoteKind; leadId: string }[] } {
  const leads = list.map((l) => portArchivedLead(l, memberFor, portedAt))
  return { leads, notes: leads.flatMap((l) => l.notes.map((kind) => ({ kind, leadId: l.leadId }))) }
}

/**
 * A studio's Lost reasons (settings `lead_reasons.lost`, `LeadReason`) without the archive's — it is the system's, never a reason to pick. A list
 * that doesn't carry it comes back as it was (the same array).
 */
export function withoutArchivedReason<R extends { name: string }>(lost: readonly R[]): readonly R[] {
  return lost.some((r) => isArchivedReason(r.name)) ? lost.filter((r) => !isArchivedReason(r.name)) : lost
}
