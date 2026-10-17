import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { leadEvents } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import type { FieldChange, LeadEventDetail } from '@/lib/leads/events'

/**
 * (REG-912, the build record §2 "Events") A project's event: a `lead_events` row with `project_id`, so the lead's Activity carries the
 * project on — the feed reads the kind's sentence (lib/leads/activity.ts, the `project_` branch). Every project action writes one; a
 * round that adds an action adds its kind to `LeadEventKind` (lib/leads/events.ts) and its sentence to the Activity branch.
 */
export type ProjectEventKind = 'project_created' | 'project_renamed' | 'project_started' | 'project_edited'
  /* (parity map 2026-10-10) each package's own lines — `parity_<pkg>_…`, read in its region of lib/leads/activity.ts */
  | `parity_${string}`
  /* (REG-953, Projects round 3) an update's steps — `detail.id` names the update, `title` its title as it was, `note` a Send back's reason,
     `again` a send or a publish after it was sent back or withdrawn */
  | 'project_update_drafted' | 'project_update_posted' | 'project_update_submitted' | 'project_update_approved' | 'project_update_sent_back'
  | 'project_update_edited' | 'project_update_withdrawn' | 'project_update_deleted'
  /* (Projects round 2) the Schedule: every milestone action and each share */
  | 'project_schedule_created' | 'project_milestone_added' | 'project_milestone_renamed' | 'project_milestone_moved' | 'project_milestone_status'
  | 'project_milestone_edited' | 'project_milestone_deleted' | 'project_milestone_restored' | 'project_schedule_shared'
  /* (Projects round 8) Choices: `detail.id` names the choice, `title` its title as it was; a pick carries the option, who made it (`by` client
     | studio), its price against the quote and its picture's address (the Activity's summary card) */
  | 'project_choice_added' | 'project_choice_edited' | 'project_choice_shared' | 'project_choice_unshared' | 'project_choice_chosen' | 'project_choice_changed'
  | 'project_choice_deleted' | 'project_choice_option_added' | 'project_choice_option_removed'
  /* (Projects round 4b) the client's answer to a finished stage on their portal (`detail.name` the client, `note` what is not right), and
     the studio asking again after "Something is not right" */
  | 'project_stage_confirmed' | 'project_stage_changes' | 'project_stage_asked'
  /* (Projects round 7) the ending — a handover asked for review and sent back, completed (with `open` the checklist items left and `reason`
     when it was completed anyway, `requester` when it approved someone's request), reopened, deleted, restored, deleted forever — and a task
     put into or taken out of a milestone (`task`, `out`) */
  | 'project_handover_requested' | 'project_handover_sent_back' | 'project_completed' | 'project_reopened'
  | 'project_deleted' | 'project_restored' | 'project_purged' | 'project_milestone_task'
  /* (Projects round 5) money in — `detail.id` names the variation order or the invoice, `number` its number, `name` the client who approved,
     `via` how, `from` · `to` the contract value or the amount as words, `n` · `names` the Drafts a rebalance re-sized, `reason` · `note` */
  | 'project_vo_created' | 'project_vo_approved' | 'project_money_rebalanced'
  | 'project_vo_reopened'   // (fix-D, D-01) an approved variation order revised: its approval stops counting until the client approves the new version
  | 'project_invoice_submitted' | 'project_invoice_sent_back' | 'project_invoice_sent' | 'project_invoice_voided' | 'project_invoice_edited'
  /* (Projects round 6) money in, part two — `detail.id` names the payment, `invoice` its invoice, `stage` · `title` the invoice's stage and
     number, `to` the amount as words, `number` the receipt's, `method`, `name` the client, `reason` why not received or reversed */
  | 'project_payment_recorded' | 'project_payment_submitted' | 'project_payment_confirmed' | 'project_payment_not_received' | 'project_payment_reversed'
  | 'project_invoice_reminded'
  /* (gaps build, package A — M-01) on hold and resumed (`reason` · `when` the resume day, ISO); a direct project's client and property changed
     (`fields`, `phone` when the portal's sign-in moved with it) */
  | 'project_put_on_hold' | 'project_resumed' | 'project_client_edited'
  /* (gaps build B) money in, complete — a one-off or a variation order's own invoice made (`kind` one_off · variation, `reason`, `vo`), a Draft of
     theirs removed, an invoice recorded from elsewhere (`ref` its own number), a Draft's details changed (`what`), the approvers reminded, a
     project's own payment split set (`names`) */
  | 'project_invoice_created' | 'project_invoice_removed' | 'project_invoice_recorded' | 'project_invoice_details' | 'project_invoice_approver_reminded' | 'project_split_set'
  /* (gaps build, package C) the schedule rebuilt (`n` kept · `added` · `dropped` names); more time asked / approved / declined / withdrawn
     (`from` · `to` the last day as words, `reason`, `note`); a Done asked / approved / sent back / withdrawn; a share asked / sent back /
     withdrawn (`n` the changes); the client's "not right" resolved (`note` — the words the client reads) */
  | 'project_schedule_rebuilt' | 'project_milestone_more_asked' | 'project_milestone_more_approved' | 'project_milestone_more_declined' | 'project_milestone_more_withdrawn'
  | 'project_milestone_done_asked' | 'project_milestone_done_approved' | 'project_milestone_done_sent_back' | 'project_milestone_done_withdrawn'
  | 'project_schedule_share_asked' | 'project_schedule_share_sent_back' | 'project_schedule_share_withdrawn' | 'project_stage_resolved'
  /* (gaps build D — M-07) the client says no: a choice turned down or sent back for other options (`kind` the answer, `note` their reason,
     `person` who), a variation order declined on its link (`note` · `by`) */
  | 'project_choice_declined' | 'project_vo_declined'
  /* (gaps build F1) money out — `detail.id` names the PO, bill, expense or payment out, `number` the PO's or the bill's, `vendor` the vendor's name,
     `to` the amount as words, `answer` the vendor's (accepted · changes · declined) and `via`, `po` the PO a bill or a payment is on, `claim` a claim's member */
  | 'project_po_created' | 'project_po_edited' | 'project_po_submitted' | 'project_po_withdrawn' | 'project_po_sent_back' | 'project_po_sent' | 'project_po_answered' | 'project_po_cancelled' | 'project_po_closed' | 'project_po_removed'
  | 'project_bill_recorded' | 'project_bill_edited' | 'project_bill_removed' | 'project_bill_approved'   // (S44R, C8) a bill's OK
  | 'project_expense_logged' | 'project_expense_edited' | 'project_expense_approved' | 'project_expense_sent_back' | 'project_expense_removed'
  /* (pending modules S06) an expense's repeat set, changed or stopped — `repeat` its rhythm as words ("every month"), `stopped` true when it ends,
     `why` 'completed' when the handover ended it; a logged one's `repeat` · `day` say the rule logged it (on `project_expense_logged`) */
  | 'project_expense_repeat'
  | 'project_payout_recorded' | 'project_payout_reversed'
  /* (gaps build G) the floor plan — `detail.id` the plan, `title` its name as it was, `mark` the mark's name, `task` the task's title, `vo` the order's
     number, `person` · `note` the client's confirmation, `by` who added a plan, `scale` the length as words */
  | 'project_floor_plan_added' | 'project_floor_plan_main' | 'project_floor_plan_renamed' | 'project_floor_plan_put_away' | 'project_floor_plan_restored' | 'project_floor_plan_scale' | 'project_floor_plan_resolved' | 'project_floor_plan_reopened' | 'project_floor_plan_task' | 'project_floor_plan_vo' | 'project_floor_plan_confirmed'
  /* (gaps build F2 — F2-Q9) a credit note — `number` its CN number, `id` it, `title` its invoice, `to` the amount as words, `reason` · `note` */
  | 'project_credit_issued' | 'project_credit_voided' | 'project_credit_refunded'
  /* (pending modules S07 — D-14) an overpayment's credit note: `overpayment` true on its `project_credit_issued` (with `paid` · `owed` as words), and
     `project_credit_used` when some of it is taken off a later invoice — `title` that invoice, `to` the amount, `payment` the payment it made */
  | 'project_credit_used'
  /* (gaps build F2 — F2-Q6) commission paid to a member, reversed — `memberId` the member, `title` their name, `to` the amount */
  | 'project_commission_paid' | 'project_commission_reversed'
  /* (gaps build H) tickets — `detail.id` the ticket, `number` its number, `title` its subject, `by` client | studio, `to` the assignee's name, `note` an escalation's note */
  | 'project_ticket_raised' | 'project_ticket_resolved' | 'project_ticket_reopened' | 'project_ticket_closed' | 'project_ticket_escalated' | 'project_ticket_assigned'
  /* (gaps build I) compliance — `item` the checklist item's id, `title` its words, `n` the starter tasks made */
  | 'project_compliance_done' | 'project_compliance_not_needed' | 'project_compliance_reopened' | 'project_compliance_tasks'
  /* (gaps build J) the 3D Space Planner — `detail.id` the layout, `title` its name; a share's start, its changes shared, its stop, the client's
     first open (`by` client); a personal layout linked to the project; a layout deleted and restored */
  | 'project_layout_created' | 'project_layout_shared' | 'project_layout_share_updated' | 'project_layout_unshared' | 'project_layout_viewed' | 'project_layout_linked' | 'project_layout_deleted' | 'project_layout_restored'
  /* (S45B · H-UHD-2) contractors on the project — `detail.id` the crew row, `vendor` the contractor's name, `trade`, `title` its milestone, `from` ·
     `to` the window or the status as words, `before` what the row was (its Undo reads it) */
  | 'project_contractor_assigned' | 'project_contractor_moved' | 'project_contractor_status' | 'project_contractor_checked' | 'project_contractor_unchecked' | 'project_contractor_removed'
export type ProjectEventDetail = LeadEventDetail & { number?: string; from?: string; to?: string; direct?: boolean; fields?: FieldChange[]; again?: boolean
  /** (pending modules S06) an expense's repeat: its rhythm as words, whether it stopped, why the system stopped it, the day a logged one is for */
  repeat?: string; stopped?: boolean; why?: string; day?: string
  /** (S44R — UAT row 361, call C8) a bill that waits for an Owner's or an Admin's OK: why, in words */ waits?: string }
  /* (Projects round 2) a share's note to the client · where a schedule came from */
  & { note?: string | null; source?: string; /** (REG-1071) the schedule template it started from */ templateId?: string }
  /* (Projects round 8) a choice's pick */
  & { option?: string; by?: 'client' | 'studio'; price?: number | null; thumb?: string | null; hex?: string | null; /** (REG-1068) the GST its variation order adds */ gst?: number }
  /* (Projects round 5) how a variation order was approved · an invoice's stage and due day */
  & { via?: string; stage?: string; due?: string }
  /* (Projects round 9) who on the client's side did it — someone from the household acts under their own name */
  & { person?: string }
  /* (Projects round 7) the ending's lines */
  & { open?: string[]; requester?: string; task?: string; out?: boolean }
  /* (Projects round 6) a payment's invoice, method and whether a client's proof counted at once */
  & { invoice?: string; method?: string; trusted?: boolean; choice?: string; receipt?: string | null }
  /* (fix-C) a held change to a published update (C-01) · the milestone wait a pick ended (C-04) · the variation order a changed pick rewrote (C-02) */
  & { changes?: boolean; waitEnded?: string; vo?: string; voDropped?: boolean }
  /* (fix-E, E-06) a project made again after the old one was deleted forever */
  & { remade?: boolean }
  /* (fix-B, B-02) a milestone save's fields as they were — its Undo reads them from its own line, never from the page */
  & { before?: Record<string, string | number | boolean | null> }
  /* (gaps build, package A) the handover's deferred items, each with its own reason; a resume after the date passed */
  & { deferred?: { item: string; reason: string }[]; late?: boolean }
  /* (gaps build B) an invoice's changed details, a recorded invoice's own number */
  & { what?: string[]; ref?: string | null }
  /* (gaps build, package C) a rebuild's milestones kept, added and dropped; an ask's requester (by name); whether the answer re-asked the client */
  & { added?: string[]; dropped?: string[]; requester?: string; askedAgain?: boolean; kept?: number }
  /* (gaps build F1) money out's lines */
  & { vendor?: string; answer?: string; po?: string | null; claim?: string | null; category?: string; overhead?: boolean }
  /* (gaps build G) the floor plan's lines */
  & { mark?: string; scale?: string; plan?: string }
  /* (gaps build I) a compliance item's id; how many starter tasks */
  & { item?: string; n?: number }
  /* (pending modules S07 — D-14) an overpayment held as credit: on its credit note's line, what came and what was owed; on a payment's, its credit
     note's number and the extra; on a use, the payment it made; (a lead's 3D layout carried to its project) `carried` */
  & { overpayment?: boolean; paid?: string; owed?: string; credit?: string; extra?: string; payment?: string; carried?: boolean }
  /* (S45B) a contractor's line: the trade they are there for, the status they were put on with */
  & { trade?: string; status?: string }
type Writer = Pick<typeof db, 'insert'>

/** `actorId` left out = the signed-in member — this browser's, read here (pending modules S43A), so only through `db`: inside a transaction
    (any writer but `db` itself) the caller passes who, read before it opened — the second signature requires it; `at` left out = now. */
export async function logProjectEvent(w: typeof db, leadId: string, projectId: string, kind: ProjectEventKind, detail?: ProjectEventDetail, o?: { actorId?: string | null; at?: Date }): Promise<string>
export async function logProjectEvent(w: Writer, leadId: string, projectId: string, kind: ProjectEventKind, detail: ProjectEventDetail, o: { actorId: string | null; at?: Date }): Promise<string>
export async function logProjectEvent(w: Writer, leadId: string, projectId: string, kind: ProjectEventKind, detail: ProjectEventDetail = {}, o: { actorId?: string | null; at?: Date } = {}): Promise<string> {
  const id = randomUUID()
  const actor = o.actorId === undefined ? await sessionMemberId() : o.actorId
  await w.insert(leadEvents).values({ id, leadId, projectId, kind, actorId: actor, at: o.at ?? new Date(), detail })
  return id
}
