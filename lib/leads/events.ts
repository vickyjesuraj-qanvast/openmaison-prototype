import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { leadEvents, leadTasks } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'

/*
 * (REG-613, parity Q-20) The lead event log — written by the actions whose work leaves no row behind (a removal, an edit, a
 * deletion, an undo, a send), read back by the Activity feed. Everything else stays derived from the records themselves.
 */
export type LeadEventKind = 'member_removed' | 'field_edited' | 'task_deleted' | 'note_deleted' | 'file_trashed' | 'file_deleted' | 'return_undone' | 'invite_sent' | 'questionnaire_asked'
  | 'contract_unsigned' | 'contract_archived' | 'contract_restored'   // (REG-634, contracts parity E-128) what a contract's own stamps can't show
  | 'comparison_deleted'   // (REG-641, X-Ray parity Q-20) a Quote X-Ray reading removed — the row goes, the trail stays
  /* (audit 2026-09-26, F093 · F106 · F207) the AI Visualizer's removals and its link's stops and renewals, which leave no row of their own;
     a restore right after its delete is that delete's Undo and takes the delete's line away (the undoStageMove way) */
  | 'design_deleted' | 'design_restored' | 'design_purged' | 'room_deleted' | 'room_restored' | 'version_deleted' | 'version_restored'
  | 'share_stopped' | 'share_renewed' | 'share_reopened'
  /* (UX audit 2026-09-30, T10) a task's changes name who made them — the task row keeps only its latest state and no author of it */
  | 'task_completed' | 'task_reopened' | 'task_edited' | 'task_assigned'
export const LEAD_EVENT_KINDS: readonly LeadEventKind[] = ['member_removed', 'field_edited', 'task_deleted', 'note_deleted', 'file_trashed', 'file_deleted', 'return_undone', 'invite_sent', 'questionnaire_asked',
  'contract_unsigned', 'contract_archived', 'contract_restored', 'comparison_deleted',
  'design_deleted', 'design_restored', 'design_purged', 'room_deleted', 'room_restored', 'version_deleted', 'version_restored', 'share_stopped', 'share_renewed', 'share_reopened',
  'task_completed', 'task_reopened', 'task_edited', 'task_assigned']
export type FieldChange = { key: string; label: string; from: string; to: string }
export type LeadEventDetail = {
  memberId?: string; name?: string; title?: string; kind?: string; when?: string | null; reason?: string | null; phone?: string
  fields?: FieldChange[]
  /** (audit 2026-09-26) the AI Visualizer's record the line is about — a design, room, version (`jobId:variantId`) or link id; its room's
      name and the version's number as they were */
  id?: string; room?: string; n?: number; designId?: string; roomId?: string
  /** (UX audit 2026-09-30) members put on / taken off a task, by name as they were · the questions an ask named (T12) */
  names?: string[]; removed?: string[]; ids?: string[]
}
type Writer = Pick<typeof db, 'insert'>

/** `actorId` left out = the signed-in member (REG-667: resolved inside the insert, so a caller's transaction never waits on a read). Returns the
    row's id, so an Undo can take its own line away again (the undoStageMove way). */
export async function logLeadEvent(tx: Writer, leadId: string, kind: LeadEventKind, detail: LeadEventDetail = {}, actorId?: string | null): Promise<string> {
  const id = randomUUID()
  await tx.insert(leadEvents).values({ id, leadId, kind, actorId: actorId === undefined ? sessionMemberSql : actorId, at: new Date(), detail })
  return id
}

/** (UX audit 2026-09-30, T10) A task's event on its lead, by the signed-in member — nothing for a studio task (it has no lead, so no Activity). */
export async function logTaskEvent(taskId: string, kind: 'task_completed' | 'task_reopened' | 'task_edited' | 'task_assigned', detail: Omit<LeadEventDetail, 'id' | 'title'> = {}): Promise<string | null> {
  const [t] = await db.select({ leadId: leadTasks.leadId, title: leadTasks.title }).from(leadTasks).where(eq(leadTasks.id, taskId))
  if (!t?.leadId) return null
  return logLeadEvent(db, t.leadId, kind, { ...detail, id: taskId, title: t.title })
}
/** An Undo takes its own lines away: the events it names, and only those. */
export async function dropLeadEvents(ids: string[]): Promise<void> {
  if (ids.length) await db.delete(leadEvents).where(inArray(leadEvents.id, ids))
}

/** The lead columns an edit can change, in the form's words — what "You edited the lead — Budget (S$): 68,000 → 72,000" prints. */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Lead name', phone: 'Lead phone number', source: 'Lead source', propertyType: 'Property type', propertyAddress: 'Property address',
  email: 'Lead email', leadAddress: 'Lead address', budgetMinor: 'Budget (S$)', estimatedStartDate: 'Estimated start date', style: 'Style',
  keyCollection: 'Key collection', condition: 'Condition', areaSqft: 'Area size (sq ft)', notes: 'Remarks', area: 'District', icNumber: 'NRIC / FIN', customerId: 'Customer ID',
}
/** A column value as the sentence prints it: money for the budget, a date for a date, "—" for nothing. */
export function printField(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (key === 'budgetMinor') { const n = Number(v); return n ? (n / 100).toLocaleString('en-SG') : '—' }
  if (v instanceof Date) return v.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/(\d{2})$/, '’$1')
  return String(v)
}
/** The changed columns between the row as it was and the columns about to be written — at most six, so a sentence stays a sentence. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): FieldChange[] {
  const out: FieldChange[] = []
  for (const key of Object.keys(FIELD_LABELS)) {
    if (!(key in after)) continue
    const a = before[key], b = after[key]
    const same = a instanceof Date || b instanceof Date ? (a instanceof Date ? a.getTime() : a ?? null) === (b instanceof Date ? b.getTime() : b ?? null) : (a ?? null) === (b ?? null)
    if (!same) out.push({ key, label: FIELD_LABELS[key]!, from: printField(key, a), to: printField(key, b) })
  }
  return out.slice(0, 6)
}

/** (UX audit 2026-09-30, T8) A comment's first words for a feed row: one line, at most ~80 characters, cut at a word. */
export function firstWords(body: string): string {
  const one = body.replace(/\s+/g, ' ').trim()
  if (one.length <= 80) return one
  const cut = one.slice(0, 80)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60))}…`
}
