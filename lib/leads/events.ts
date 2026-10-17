import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { leadEvents, leadTasks } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { maskNric, phoneLocal } from '@/lib/format'

/*
 * (REG-613, parity Q-20) The lead event log — written by the actions whose work leaves no row behind (a removal, an edit, a
 * deletion, an undo, a send), read back by the Activity feed. Everything else stays derived from the records themselves.
 */
export type LeadEventKind = 'member_removed' | 'field_edited' | 'task_deleted' | 'note_deleted' | 'file_trashed' | 'file_deleted' | 'return_undone' | 'invite_sent' | 'questionnaire_asked'
  | 'return_evidence_removed'   // (pending modules S05) a file taken off a return still with Qanvast (its Undo takes the line away)
  | `parity_${string}`   // (parity map 2026-10-10) each package's own lines, read in its region of lib/leads/activity.ts
  | 'contract_unsigned' | 'contract_archived' | 'contract_restored'   // (REG-634, contracts parity E-128) what a contract's own stamps can't show
  | 'comparison_deleted'   // (REG-641, X-Ray parity Q-20) a Quote X-Ray reading removed — the row goes, the trail stays
  | 'meeting_deleted'   // (pending modules S23) a meeting deleted — its row leaves the lists, the trail stays (a restore takes the line away)
  | 'trial_claimed'   // (pending modules S41b-3) what a visitor made in the website's free trial, brought into the studio at sign-up (`kind` lead · quote · reading)
  /* (audit 2026-09-26, F093 · F106 · F207) the AI Visualizer's removals and its link's stops and renewals, which leave no row of their own;
     a restore right after its delete is that delete's Undo and takes the delete's line away (the undoStageMove way) */
  | 'design_deleted' | 'design_restored' | 'design_purged' | 'room_deleted' | 'room_restored' | 'version_deleted' | 'version_restored'
  | 'share_stopped' | 'share_renewed' | 'share_reopened'
  /* (UX audit 2026-09-30, T10) a task's changes name who made them — the task row keeps only its latest state and no author of it */
  | 'task_completed' | 'task_reopened' | 'task_edited' | 'task_assigned'
  /* (REG-912, Projects round 1) a project's own events, written with `lead_events.project_id` (lib/projects/events.ts) */
  | 'project_created' | 'project_renamed' | 'project_started' | 'project_edited'
  /* (REG-953, Projects round 3) an update's every step — written by app/projects/updates-actions.ts, read by the Activity's update branch */
  | 'project_update_drafted' | 'project_update_posted' | 'project_update_submitted' | 'project_update_approved' | 'project_update_sent_back'
  | 'project_update_edited' | 'project_update_withdrawn' | 'project_update_deleted'
  /* (Projects r4a) the client portal: the client's first sign-in, a withdrawal (its Undo takes the line away), a file shown or hidden */
  | 'portal_opened' | 'portal_withdrawn' | 'file_shown' | 'file_hidden'
  /* (Projects round 2) the Schedule's milestones and shares */
  | 'project_schedule_created' | 'project_milestone_added' | 'project_milestone_renamed' | 'project_milestone_moved' | 'project_milestone_status'
  | 'project_milestone_edited' | 'project_milestone_deleted' | 'project_milestone_restored' | 'project_schedule_shared'
  /* (Projects round 8) Choices — written by app/projects/choices-actions.ts and the client's pick (app/portal/choices-actions.ts) */
  | 'project_choice_added' | 'project_choice_edited' | 'project_choice_shared' | 'project_choice_unshared' | 'project_choice_chosen' | 'project_choice_changed'
  | 'project_choice_deleted' | 'project_choice_option_added' | 'project_choice_option_removed'
  /* (Projects round 4b) the client's answer to a finished stage on their portal, and the studio asking again */
  | 'project_stage_confirmed' | 'project_stage_changes' | 'project_stage_asked'
  /* (Projects round 7) the ending — handover review, completed, reopened, deleted, restored, deleted forever — and a task put in a milestone */
  | 'project_handover_requested' | 'project_handover_sent_back' | 'project_completed' | 'project_reopened'
  | 'project_deleted' | 'project_restored' | 'project_purged' | 'project_milestone_task'
  /* (Projects round 5) money in: a variation order's creation and approval, the rebalance, an invoice's every step */
  | 'project_vo_created' | 'project_vo_approved' | 'project_money_rebalanced'
  | 'project_vo_reopened'   // (fix-D, D-01)
  | 'project_invoice_submitted' | 'project_invoice_sent_back' | 'project_invoice_sent' | 'project_invoice_voided' | 'project_invoice_edited'
  /* (Projects round 9) the portal, part two: someone else from the household added, sent the link, withdrawn, removed, first opening it; a
     reminder of what waits on the client sent on WhatsApp from Client access */
  | 'household_added' | 'household_invited' | 'household_withdrawn' | 'household_removed' | 'household_opened' | 'portal_reminded'
  /* (Projects round 6) money in, part two: a payment's every step and a reminder on WhatsApp */
  | 'project_payment_recorded' | 'project_payment_submitted' | 'project_payment_confirmed' | 'project_payment_not_received' | 'project_payment_reversed' | 'project_invoice_reminded'
  /* (gaps build, package A — M-01) on hold, resumed, a direct project's client and property changed */
  | 'project_put_on_hold' | 'project_resumed' | 'project_client_edited'
  /* (gaps build B) money in, complete: one-offs, a variation order billed on its own, recorded invoices, a Draft's details, the approvers reminded, a split */
  | 'project_invoice_created' | 'project_invoice_removed' | 'project_invoice_recorded' | 'project_invoice_details' | 'project_invoice_approver_reminded' | 'project_split_set'
  /* (gaps build, package C) an outside person put on a task, changed or taken off (M-03), and the task sent to them on WhatsApp */
  | 'task_outside' | 'task_sent_outside'
  /* (gaps build, package C) the schedule: rebuilt; more time asked, answered or taken back; a Done waiting and its answer; a share waiting
     and its answer; the client's "not right" resolved */
  | 'project_schedule_rebuilt' | 'project_milestone_more_asked' | 'project_milestone_more_approved' | 'project_milestone_more_declined' | 'project_milestone_more_withdrawn'
  | 'project_milestone_done_asked' | 'project_milestone_done_approved' | 'project_milestone_done_sent_back' | 'project_milestone_done_withdrawn'
  | 'project_schedule_share_asked' | 'project_schedule_share_sent_back' | 'project_schedule_share_withdrawn' | 'project_stage_resolved'
  | 'project_choice_declined' | 'project_vo_declined'   // (gaps build D — M-07)
  /* (gaps build F1) money out: a PO's every step, a supplier bill, an expense, a payment out — written by app/finance/actions.ts */
  | 'project_po_created' | 'project_po_edited' | 'project_po_submitted' | 'project_po_withdrawn' | 'project_po_sent_back' | 'project_po_sent' | 'project_po_answered' | 'project_po_cancelled' | 'project_po_closed' | 'project_po_removed'
  | 'project_bill_recorded' | 'project_bill_edited' | 'project_bill_removed' | 'project_bill_approved'   // (S44R, C8) a bill's OK
  | 'project_expense_logged' | 'project_expense_edited' | 'project_expense_approved' | 'project_expense_sent_back' | 'project_expense_removed'
  | 'project_payout_recorded' | 'project_payout_reversed'
  /* (gaps build G) the floor plan: a plan added (by the studio or the client), made the main plan, renamed, put away and back, its scale set; a mark
     resolved or reopened, made a task or a variation order; the client's confirmation of a layout */
  | 'project_floor_plan_added' | 'project_floor_plan_main' | 'project_floor_plan_renamed' | 'project_floor_plan_put_away' | 'project_floor_plan_restored' | 'project_floor_plan_scale' | 'project_floor_plan_resolved' | 'project_floor_plan_reopened' | 'project_floor_plan_task' | 'project_floor_plan_vo' | 'project_floor_plan_confirmed'
  /* (gaps build F2 — F2-Q9) a credit note: issued, void, its refund — written by app/finance/books-actions.ts */
  | 'project_credit_issued' | 'project_credit_voided' | 'project_credit_refunded'
  | 'project_commission_paid' | 'project_commission_reversed'   // (gaps build F2 — F2-Q6)
  | 'project_ticket_raised' | 'project_ticket_resolved' | 'project_ticket_reopened' | 'project_ticket_closed' | 'project_ticket_escalated' | 'project_ticket_assigned'   // (gaps build H)
  /* (gaps build I, I-Q10 · I-Q11) a compliance item answered Done or Not needed, or back to To do (`item` its id, `title` its words), and the
     starter tasks made with a new project (`n`) */
  | 'project_compliance_done' | 'project_compliance_not_needed' | 'project_compliance_reopened' | 'project_compliance_tasks'
  | 'project_layout_created' | 'project_layout_shared' | 'project_layout_share_updated' | 'project_layout_unshared' | 'project_layout_viewed' | 'project_layout_linked' | 'project_layout_deleted' | 'project_layout_restored'   // (gaps build J)
export const LEAD_EVENT_KINDS: readonly LeadEventKind[] = ['member_removed', 'field_edited', 'task_deleted', 'note_deleted', 'file_trashed', 'file_deleted', 'return_undone', 'invite_sent', 'questionnaire_asked',
  'return_evidence_removed',   // (pending modules S05)
  'contract_unsigned', 'contract_archived', 'contract_restored', 'comparison_deleted', 'meeting_deleted', 'trial_claimed',
  'design_deleted', 'design_restored', 'design_purged', 'room_deleted', 'room_restored', 'version_deleted', 'version_restored', 'share_stopped', 'share_renewed', 'share_reopened',
  'task_completed', 'task_reopened', 'task_edited', 'task_assigned',
  'project_created', 'project_renamed', 'project_started', 'project_edited',
  'project_update_drafted', 'project_update_posted', 'project_update_submitted', 'project_update_approved', 'project_update_sent_back',
  'project_update_edited', 'project_update_withdrawn', 'project_update_deleted',
  'portal_opened', 'portal_withdrawn', 'file_shown', 'file_hidden',
  'project_schedule_created', 'project_milestone_added', 'project_milestone_renamed', 'project_milestone_moved', 'project_milestone_status',
  'project_milestone_edited', 'project_milestone_deleted', 'project_milestone_restored', 'project_schedule_shared',
  'project_choice_added', 'project_choice_edited', 'project_choice_shared', 'project_choice_unshared', 'project_choice_chosen', 'project_choice_changed',
  'project_choice_deleted', 'project_choice_option_added', 'project_choice_option_removed',
  'project_stage_confirmed', 'project_stage_changes', 'project_stage_asked',
  'project_handover_requested', 'project_handover_sent_back', 'project_completed', 'project_reopened',   // (Projects round 7)
  'project_deleted', 'project_restored', 'project_purged', 'project_milestone_task',
  'project_vo_created', 'project_vo_approved', 'project_money_rebalanced',   // (Projects round 5)
  'project_invoice_submitted', 'project_invoice_sent_back', 'project_invoice_sent', 'project_invoice_voided', 'project_invoice_edited',
  'household_added', 'household_invited', 'household_withdrawn', 'household_removed', 'household_opened', 'portal_reminded',   // (Projects round 9)
  'project_payment_recorded', 'project_payment_submitted', 'project_payment_confirmed', 'project_payment_not_received', 'project_payment_reversed', 'project_invoice_reminded',   // (Projects round 6)
  'project_vo_reopened',   // (fix-D, D-01)
  'project_put_on_hold', 'project_resumed', 'project_client_edited',   // (gaps build, package A)
  'project_invoice_created', 'project_invoice_removed', 'project_invoice_recorded', 'project_invoice_details', 'project_invoice_approver_reminded', 'project_split_set',   // (gaps build B)
  'task_outside', 'task_sent_outside',   // (gaps build, package C)
  'project_schedule_rebuilt', 'project_milestone_more_asked', 'project_milestone_more_approved', 'project_milestone_more_declined', 'project_milestone_more_withdrawn',
  'project_milestone_done_asked', 'project_milestone_done_approved', 'project_milestone_done_sent_back', 'project_milestone_done_withdrawn',
  'project_schedule_share_asked', 'project_schedule_share_sent_back', 'project_schedule_share_withdrawn', 'project_stage_resolved',
  'project_choice_declined', 'project_vo_declined',   // (gaps build D)
  'project_po_created', 'project_po_edited', 'project_po_submitted', 'project_po_withdrawn', 'project_po_sent_back', 'project_po_sent', 'project_po_answered', 'project_po_cancelled', 'project_po_closed', 'project_po_removed', 'project_bill_recorded', 'project_bill_edited', 'project_bill_removed', 'project_bill_approved', 'project_expense_logged', 'project_expense_edited', 'project_expense_approved', 'project_expense_sent_back', 'project_expense_removed', 'project_payout_recorded', 'project_payout_reversed',   // (gaps build F1)
  'project_floor_plan_added', 'project_floor_plan_main', 'project_floor_plan_renamed', 'project_floor_plan_put_away', 'project_floor_plan_restored', 'project_floor_plan_scale', 'project_floor_plan_resolved', 'project_floor_plan_reopened', 'project_floor_plan_task', 'project_floor_plan_vo', 'project_floor_plan_confirmed',   // (gaps build G)
  'project_credit_issued', 'project_credit_voided', 'project_credit_refunded', 'project_commission_paid', 'project_commission_reversed',   // (gaps build F2)
  'project_ticket_raised', 'project_ticket_resolved', 'project_ticket_reopened', 'project_ticket_closed', 'project_ticket_escalated', 'project_ticket_assigned',   // (gaps build H)
  'project_compliance_done', 'project_compliance_not_needed', 'project_compliance_reopened', 'project_compliance_tasks',   // (gaps build I)
  'project_layout_created', 'project_layout_shared', 'project_layout_share_updated', 'project_layout_unshared', 'project_layout_viewed', 'project_layout_linked', 'project_layout_deleted', 'project_layout_restored']   // (gaps build J)
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

/** `actorId` left out = the signed-in member (REG-667) — this browser's, read here (pending modules S43A), so only through `db`: inside a
    transaction (any writer but `db` itself) the caller passes who, read before it opened — the second signature can't leave it out. Returns the
    row's id, so an Undo can take its own line away again (the undoStageMove way). */
export async function logLeadEvent(w: typeof db, leadId: string, kind: LeadEventKind, detail?: LeadEventDetail, actorId?: string | null): Promise<string>
export async function logLeadEvent(w: Writer, leadId: string, kind: LeadEventKind, detail: LeadEventDetail, actorId: string | null): Promise<string>
export async function logLeadEvent(w: Writer, leadId: string, kind: LeadEventKind, detail: LeadEventDetail = {}, actorId?: string | null): Promise<string> {
  const id = randomUUID()
  const actor = actorId === undefined ? await sessionMemberId() : actorId
  await w.insert(leadEvents).values({ id, leadId, kind, actorId: actor, at: new Date(), detail })
  return id
}

/** (UX audit 2026-09-30, T10) A task's event on its lead, by the signed-in member — nothing for a studio task (it has no lead, so no Activity). */
export async function logTaskEvent(taskId: string, kind: 'task_completed' | 'task_reopened' | 'task_edited' | 'task_assigned' | 'task_outside' | 'task_sent_outside', detail: Omit<LeadEventDetail, 'id' | 'title'> = {}): Promise<string | null> {
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
  /* (pending modules S05 — testers' L-3 · L-4) */
  companyName: 'Company name', companyUen: 'UEN', client2Name: 'Second client', client2Nric: 'Second client’s NRIC / FIN', client2Phone: 'Second client’s mobile',
}
/** A column value as the sentence prints it: money for the budget, a date for a date, "—" for nothing — and (REG-903, PDPA) the NRIC /
    FIN masked as a signed document shows it (•••••567A), so the log never keeps the full number. */
export function printField(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (key === 'icNumber' || key === 'client2Nric') return maskNric(String(v))
  if (key === 'phone' || key === 'client2Phone') return phoneLocal(String(v))   // (S42 B-07, REG-456) a phone reads grouped — "9111 0000"
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
