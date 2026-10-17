/**
 * (REG-604) Notifications — the events, the rules and the messages, pure and client-safe.
 *
 * An EVENT is raised by an action (a lead arrives, a lead is assigned, a quote goes for approval, a client confirms or
 * signs) or derived at read time (a follow-up is due). The RULES say which channels carry each event and who receives it;
 * the MESSAGES are the copy each channel sends, with fields the platform fills. The delay and the stop rule are Cove's
 * "30 minutes" and "a closed lead gets no follow-up".
 */

export type Channel = 'in_app' | 'email' | 'whatsapp'
export const CHANNELS: { key: Channel; label: string }[] = [{ key: 'in_app', label: 'In app' }, { key: 'email', label: 'Email' }, { key: 'whatsapp', label: 'WhatsApp' }]

export type EventKey = 'new_lead' | 'assigned' | 'untouched' | 'quote_approval' | 'quote_approved' | 'quote_changes' | 'quote_confirmed' | 'contract_sent' | 'quote_signed' | 'task_due' | 'stage_changed' | 'task_assigned' | 'task_due_soon' | 'hold_due' | 'question_answered' | 'price_book_proposed' | 'price_book_answered' | 'render_feedback'
  | 'credits_low' | 'credits_out' | 'credit_request' | 'credit_request_answered' | 'credit_amount_reached' | 'credits_renewed' | 'payment_failed' | 'credit_receipt'
  | 'quote_change_asked'   /* (UX audit Q6) */
  | 'task_comment' | 'file_comment'   // (UX audit 2026-09-30, T8) a comment reaches the people it concerns
  | 'project_created'   // (REG-918, Projects round 1) a Won move or New project made a project — its team hears it
  | 'update_review' | 'update_approved' | 'update_sent_back'   // (REG-954, Projects round 3) an update's review: the approvers, then its author
  | 'portal_opened'   // (Projects r4a) a client signs in to their portal for the first time
  | 'milestone_due' | 'milestone_late'   // (Projects round 2) reminders from the schedule's dates, derived like a task's
  | 'choice_made'   // (Projects round 8) the client chose an option on their portal
  | 'stage_confirmed' | 'stage_changes'   // (Projects round 4b) the client answers a finished stage on their portal
  | 'handover_review' | 'handover_approved' | 'handover_sent_back'   // (Projects round 7) a handover's owner's review: the approvers, then whoever asked
  | 'invoice_review' | 'invoice_sent_back' | 'variation_approved'   // (Projects round 5) an invoice's approval, a client's approval of a variation order
  | 'payment_to_confirm' | 'payment_confirmed' | 'payment_not_received' | 'payment_reversed' | 'payment_overdue'   // (Projects round 6) payments
  | 'project_completed' | 'project_reopened'   // (fix-E, E-20) the project's team hears its ending and its reopening
  | 'invoice_approved'   // (fix-D, D-18) the submitter hears that their invoice was approved and sent
  | 'variation_reopened'   // (fix-D, D-01) an approved variation order revised — the contract moves back until the client approves again
  | 'project_hold_due'   // (gaps build, package A — M-01) a project on hold whose resume day has come round, derived like a task's
  | 'invoice_ready'   // (gaps build B, item 5) a stage's invoice turns Ready to send — its milestone is done (or begun)
  | 'schedule_ask' | 'schedule_answer'   // (gaps build, package C) more time, a Done or a share waiting for an Owner or an Admin — and the answer
  | 'choice_declined' | 'variation_declined'   // (gaps build D, item 2 — M-07) the client says no: a choice turned down or sent back for other options, a variation order declined
  | 'update_published'   // (gaps build D, item 10) an update goes out to the client — the project's team hears it
  | 'po_review' | 'po_sent_back' | 'po_approved' | 'po_answered' | 'expense_review' | 'expense_answered' | 'claim_paid' | 'bill_due'   // (gaps build F1) money out
  | 'bill_review' | 'bill_approved'   // (S44R — UAT row 361, call C8) a supplier bill waits for an Owner's or an Admin's OK — and the OK
  | 'floor_plan_client' | 'floor_plan_confirmed'   // (gaps build G, G-Q14) the client marks up the floor plan (a quiet 15 minutes per plan) — and confirms a layout
  | 'commission_asked' | 'commission_answered' | 'commission_paid' | 'credit_issued' | 'xero_failed'   // (gaps build F2) the books
  | 'ticket_raised' | 'ticket_client' | 'ticket_assigned' | 'ticket_escalated' | 'chat_message'   // (gaps build H, H-Q10 · H-Q15) tickets and the client's messages
  | 'layout_viewed'   // (gaps build J, J-Q17) a client opens a shared 3D layout — the first open of each share
  /* (parity map 2026-10-10 — her "build everything that's in 1.0 to 2.0") 1.0's notices 2.0 had no event for: a schedule shared directly
     (SC-084 · UC-084), an invoice sent (UC-098), an invoice still unpaid after its third reminder (MI-068), a PO's delivery late (MO-094), a
     member's ask to add an outside person (TD-019), a message to a client that could not be sent (UC-083), a large send held (UC-082), the
     team's own conversation on a project (UC-064) */
  | 'schedule_shared' | 'invoice_sent' | 'invoice_reminded' | 'po_delivery_late' | 'invite_requested' | 'message_failed' | 'send_held' | 'team_message'
  | 'member_joined'   // (pending modules S09) someone invited on Company › Members comes in for the first time — whoever invited them hears it
  | 'meeting_answered'   // (pending modules S23) a client answers a meeting's invitation — coming, or the time doesn't suit
  | 'member_message'   // (pending modules S26) a teammate writes to you — two people, a group you're in, the studio's room
  | 'hangout_registered' | 'hangout_meeting_assigned'   // (pending modules S27) 1.0's two Hangout notices: a homeowner books a chat, a chat is given to a designer
  | 'listing_answered'   // (pending modules S37) Qanvast answers the studio's application to be listed — listed, or changes asked
  | 'upgrade_offer'   // (pending modules S41b-4) the Free plan's upgrade offer — 1.0's plg nudges, one quiet row in the Owner's bell (lib/credits/nudges.ts)
export type EventDef = { key: EventKey; label: string; help: string; who: string; icon: string }
export const EVENTS: EventDef[] = [
  { key: 'new_lead', label: 'A new lead arrives', help: 'From the form, an import, the website or Meta.', who: 'Owners and Admins', icon: 'person_add' },
  /* (parity P-37 · P-17) one event for both records — a project's members are its lead's (Q-05: "Members" everywhere) */
  { key: 'assigned', label: 'A lead or project is assigned to you', help: 'To the member it was assigned to.', who: 'The assignee', icon: 'person' },
  { key: 'untouched', label: 'A new lead is untouched', help: 'No contact logged within the delay set under Lead management › Untouched leads.', who: 'The assignee, else Owners and Admins', icon: 'schedule' },   // (REG-645, E-106) as queries.ts raises it — (pending modules S18) the delay moved to Lead management (UX audit S9); "the delay below" pointed at nothing
  { key: 'quote_approval', label: 'A quote needs approval', help: 'Sent for Approval by a designer.', who: 'Approvers', icon: 'approval' },
  /* (REG-624, quote editor parity Q-22) The approver's answer goes back to whoever sent the quote. */
  { key: 'quote_approved', label: 'Your quote is approved', help: 'An approver approved a quote you sent for approval.', who: 'Whoever sent it', icon: 'verified' },
  { key: 'quote_changes', label: 'Changes are asked on your quote', help: 'An approver sent a quote back to Draft with a note.', who: 'Whoever sent it', icon: 'edit' },
  { key: 'quote_confirmed', label: 'A client confirms a quote', help: 'On the confirmation link.', who: 'The lead’s members', icon: 'task' },
  /* (UX audit Q6) The confirmation link's "Ask for a change": the client's words reach the studio, not only the designer's WhatsApp. */
  { key: 'quote_change_asked', label: 'A client asks for a change to a quote', help: 'On the confirmation link, before confirming.', who: 'The lead’s members, Owners and Admins', icon: 'edit' },
  /* (REG-634, contracts parity Q-23) 1.0 told the studio on every send (`quote.signature_requested`); a signature — the client's own, or one the studio marks — reaches the same people. */
  { key: 'contract_sent', label: 'A contract goes out for signature', help: 'Sent on WhatsApp, its link shared, or sent together — by anyone but you.', who: 'Owners, Admins and the lead’s members', icon: 'send' },
  { key: 'quote_signed', label: 'A contract is signed', help: 'By the client on its link, or marked signed by the studio.', who: 'The lead’s members, Owners and Admins', icon: 'draw' },
  { key: 'task_due', label: 'A task is overdue', help: 'Its due date has passed.', who: 'The task’s assignees', icon: 'warning' },
  /* (REG-608, parity Q-23) 1.0's events that 2.0 lacked — the owner's six, minus the T−30 lead reminder, which "a task is due in 30 minutes" covers now that follow-ups are tasks. */
  /* (parity P-37) a project's start, hold and resume are stage changes too (app/projects/actions.ts `notifyProjectStage`); its completion and reopening keep their own rows */
  { key: 'stage_changed', label: 'A lead’s or project’s stage changes', help: 'A lead’s move, hold, loss or resume; a project’s start, hold or resume — by anyone but you.', who: 'Owners, Admins and the lead’s or project’s members', icon: 'swap_horiz' },
  { key: 'task_assigned', label: 'A task is assigned to you', help: 'Created with you on it, or added to it later.', who: 'The assignee', icon: 'task_alt' },
  /* (S42 audit A-09) its name says both timings (it was "A task is due in 30 minutes", while a running project's task comes a day or more ahead) */
  { key: 'task_due_soon', label: 'A task comes due', help: 'Thirty minutes before a follow-up or any task with a time — and a running project’s task the alerts’ lead time before its day (Settings › Projects › Schedule).', who: 'The task’s assignees', icon: 'event' },   // (gaps build, package C — 15)
  { key: 'hold_due', label: 'An On Hold date is reached', help: 'The follow-up date on a lead still on hold.', who: 'The lead’s members, else Owners and Admins', icon: 'timelapse' },
  { key: 'question_answered', label: 'A client answers the questionnaire', help: 'On their portal.', who: 'The lead’s or project’s members', icon: 'help' },
  /* (REG-652, price book parity Q-04) A Designer proposes an item for My Items; the answer goes back to them. */
  { key: 'price_book_proposed', label: 'An item is proposed for My Items', help: 'A Designer’s new item, waiting to be approved or sent back.', who: 'Owners and Admins', icon: 'list_alt' },
  { key: 'price_book_answered', label: 'Your proposed item is answered', help: 'Approved into My Items, or sent back with a note.', who: 'Whoever proposed it', icon: 'verified' },
  /* (REG-676, AI Visualizer Q-34) The client answers on a render link: a favourite, a note, a pin, a call back. */
  { key: 'render_feedback', label: 'A client responds to shared renders', help: 'A favourite, a note, a pin or a call back on the renders link.', who: 'The lead’s or project’s members and whoever shared the link', icon: 'wand_shine' },
  /* (REG-703, AI credits Q-35 · Q-38) The heads-up and the asks: steps at 75% and 90% of the month and at 0, a member's ask and its answer,
     the month's credits, a failed payment and a receipt. None of them existed in 1.0 (B §6). */
  { key: 'credits_low', label: 'AI credits are running low', help: 'At 75% and 90% of the month’s AI credits, with the date they run out at this pace.', who: 'Owners and Admins', icon: 'hourglass_top' },
  { key: 'credits_out', label: 'The studio is out of AI credits', help: 'AI tools pause until you top up or the month refreshes.', who: 'Owners and Admins', icon: 'warning' },
  { key: 'credit_request', label: 'A member asks for more AI credits', help: 'The studio is out, or their monthly amount is used.', who: 'The Owner', icon: 'person' },
  { key: 'credit_request_answered', label: 'Your ask for AI credits is answered', help: 'Credits added, or your monthly amount raised.', who: 'Whoever asked', icon: 'verified' },
  { key: 'credit_amount_reached', label: 'A member uses their monthly AI credits', help: 'Their monthly amount is reached; the studio’s credits are untouched.', who: 'The Owner', icon: 'hourglass_top' },
  { key: 'credits_renewed', label: 'This month’s AI credits are in', help: 'The plan’s credits refresh on its date each month.', who: 'Owners and Admins', icon: 'diamond' },
  { key: 'payment_failed', label: 'A payment for the plan doesn’t go through', help: 'The plan stays until the grace date; update the card before then.', who: 'The Owner', icon: 'credit_card' },
  { key: 'credit_receipt', label: 'A receipt for a purchase', help: 'A plan, a seat or a top-up — with its tax invoice.', who: 'Whoever bought it, and the Owner', icon: 'receipt_long' },
  /* (UX audit 2026-09-30, T8) Comments were silent: a task's comment reaches its members, a file's the lead's team — never the author. */
  { key: 'task_comment', label: 'Someone comments on a task', help: 'A comment on a task you are on — its first words in the feed.', who: 'The task’s members, else the lead’s or project’s members', icon: 'comment' },
  { key: 'file_comment', label: 'Someone comments on a file', help: 'A comment on one of a lead’s or project’s files — its first words in the feed.', who: 'The lead’s or project’s members', icon: 'comment' },
  /* (REG-918, Projects round 1) */
  { key: 'project_created', label: 'A project is created', help: 'A lead is won, or a project is added by hand — by anyone but you.', who: 'The project’s members', icon: 'business_center' },
  /* (REG-954, Projects round 3) Q-17's review: an update waiting reaches the approvers; their answer goes back to whoever wrote it. */
  { key: 'update_review', label: 'A project update needs review', help: 'Posted by a designer while Settings › Projects asks for review.', who: 'Owners, Admins and the members named in Settings › Projects', icon: 'approval' },
  { key: 'update_approved', label: 'Your project update is published', help: 'An Owner or an Admin approved it — the client can see it.', who: 'Whoever wrote it', icon: 'verified' },
  { key: 'update_sent_back', label: 'Your project update is sent back', help: 'An Owner or an Admin sent it back with a reason.', who: 'Whoever wrote it', icon: 'edit' },
  /* (Projects r4a) */
  { key: 'portal_opened', label: 'A client opens their portal for the first time', help: 'They signed in with their number after you invited them.', who: 'The lead’s or project’s members', icon: 'home' },
  /* (Projects round 2) reminders that come from the schedule's dates, not from someone opening a page */
  { key: 'milestone_due', label: 'A milestone ends soon', help: 'An unfinished milestone on a running project, the alerts’ lead time before its last day (Settings › Projects › Schedule — three days unless changed).', who: 'The project’s members', icon: 'calendar_month' },
  { key: 'milestone_late', label: 'A milestone is overdue', help: 'Its last day has passed and it is not done.', who: 'The project’s members', icon: 'warning' },
  /* (Projects round 8) */
  { key: 'choice_made', label: 'A client makes a choice', help: 'They picked an option you shared on their portal — with their note.', who: 'The project’s members', icon: 'palette' },
  /* (Projects round 4b, Q-16) the client's answer when the studio asked them to confirm a finished stage */
  { key: 'stage_confirmed', label: 'A client confirms a finished stage', help: 'On their portal, after you asked them to confirm it.', who: 'The project’s members', icon: 'check_circle' },
  { key: 'stage_changes', label: 'A client says something is not right with a stage', help: 'On their portal, with what they noticed.', who: 'The project’s members, Owners and Admins', icon: 'error' },
  /* (Projects round 7, Q-24) the handover's owner's review — on while Settings › Projects › Handover needs an owner's review is on */
  /* (fix-E, E-29 · E-13) a Manager asks too, and anyone on the team asks when items are still open, whatever the setting */
  { key: 'handover_review', label: 'A handover needs your review', help: 'A Designer or a Manager asked to complete a project — while Settings › Projects asks for an owner’s review, or with checklist items still open.', who: 'Owners and Admins', icon: 'approval' },
  { key: 'handover_approved', label: 'Your handover is approved', help: 'An Owner or an Admin approved it — the project is completed.', who: 'Whoever asked', icon: 'verified' },
  { key: 'handover_sent_back', label: 'Your handover is sent back', help: 'An Owner or an Admin sent it back with a note.', who: 'Whoever asked', icon: 'edit' },
  /* (fix-E, E-20) the ending and the way back reach the whole team, not only whoever asked */
  { key: 'project_completed', label: 'A project is completed', help: 'Its handover is completed — with the reason when items were still open — by anyone but you.', who: 'The project’s members', icon: 'task_alt' },
  { key: 'project_reopened', label: 'A completed project is reopened', help: 'An Owner or an Admin put it back In progress, with a reason.', who: 'The project’s members', icon: 'undo' },
  /* (Projects round 5, F-05 · F-07) an invoice waiting for approval reaches the approvers, their send-back its author; a variation order the
     client approved reaches the project's team */
  { key: 'invoice_review', label: 'An invoice needs approval', help: 'Submitted by a designer while Settings › Projects asks for invoice approval.', who: 'Owners and Admins', icon: 'approval' },
  { key: 'invoice_sent_back', label: 'Your invoice is sent back', help: 'An Owner or an Admin sent it back with a note.', who: 'Whoever submitted it', icon: 'edit' },
  { key: 'variation_approved', label: 'A client approves a variation order', help: 'On its confirmation link, or recorded by an Owner or an Admin.', who: 'The project’s members', icon: 'task' },
  /* (Projects round 6, Q-48 · F-14 · F-18) a client says they paid → whoever confirms the studio's payments; the answer and a reversal → the
     project's team; an invoice past its due day, derived from the date (never stored), for the team */
  { key: 'payment_to_confirm', label: 'A client says they have paid', help: 'On their portal, with the bank’s confirmation — check it and confirm.', who: 'Whoever confirms payments (Settings › Projects), and Accounting', icon: 'payments' },   // (parity map, MI-007)
  { key: 'payment_confirmed', label: 'A client’s payment is confirmed', help: 'Confirmed by whoever checks the studio’s payments; its receipt is ready.', who: 'The project’s members', icon: 'receipt_long' },
  { key: 'payment_not_received', label: 'A client’s payment is not received', help: 'Marked not received, with the reason the client reads.', who: 'The project’s members', icon: 'error' },
  { key: 'payment_reversed', label: 'A payment is reversed', help: 'An Owner or an Admin reversed a confirmed payment, with a reason.', who: 'The project’s members', icon: 'undo' },
  { key: 'payment_overdue', label: 'An invoice is overdue', help: 'Its due day has passed and it is not paid.', who: 'The project’s members and Accounting', icon: 'warning' },   // (parity map, MI-007)
  /* (fix-D, D-18 · F-05) the quotes' approval pattern: the approver's answer goes back to whoever submitted it — sent back (above) or approved and sent */
  { key: 'invoice_approved', label: 'Your invoice is approved and sent', help: 'An Owner or an Admin approved an invoice you submitted and sent it to the client.', who: 'Whoever submitted it', icon: 'verified' },
  /* (fix-D, D-01) the other side of variation_approved: revising an approved order takes its approval back, and the contract with it */
  { key: 'variation_reopened', label: 'An approved variation order is revised', help: 'Its approval stops counting until the client approves the new version; the contract and the unsent invoices follow.', who: 'The project’s members', icon: 'undo' },
  /* (gaps build, package A — M-01) the lead's hold_due, for a project: its resume day has come round — resume it, or give it a new date */
  { key: 'project_hold_due', label: 'A project on hold reaches its resume date', help: 'The day it was to resume — resume it or set a new date.', who: 'The project’s members, else Owners and Admins', icon: 'timelapse' },
  /* (gaps build B, item 5 — 1.0's "Complete & bill", G-255) the moment a stage's milestone is done its invoice is ready: the team is told, derived from
     the schedule like an overdue invoice (never stored), gone once it is sent or submitted */
  { key: 'invoice_ready', label: 'An invoice is ready to send', help: 'Its stage’s milestone is done (or begun, for a stage due at its start).', who: 'The project’s members', icon: 'receipt_long' },
  /* (gaps build, package C — 5 · 8) the schedule's asks: more time on a milestone, a Done or schedule changes waiting (Settings › Projects ›
     Schedule) — to the studio's Owners and Admins; their answer back to whoever asked */
  { key: 'schedule_ask', label: 'A schedule change waits for your approval', help: 'More time asked on a milestone, a milestone marked done, or changes to share with the client.', who: 'Owners and Admins', icon: 'approval' },
  { key: 'schedule_answer', label: 'Your schedule ask is answered', help: 'More time approved or declined, a Done approved or sent back, changes shared or sent back.', who: 'Whoever asked', icon: 'verified' },
  /* (gaps build D, item 2 — M-07; 1.0's `vo.client_rejected`, I-284) the client says no on their portal or the order's link — with their reason */
  { key: 'choice_declined', label: 'A client says no to a choice', help: 'They turned the options down, or asked for other options — with their reason.', who: 'The project’s members', icon: 'palette' },
  { key: 'variation_declined', label: 'A client declines a variation order', help: 'On the order’s confirmation link, with their reason.', who: 'The project’s members, Owners and Admins', icon: 'request_quote' },
  /* (gaps build D, item 10 — 1.0 D-80 · D-114) every update that reaches the client, posted at once or approved, rings the project's team */
  { key: 'update_published', label: 'An update goes out to the client', help: 'Posted at once, or approved after review.', who: 'The project’s members', icon: 'chat' },
  /* (gaps build F1 — money out, F1-Q15) a PO over the limit (or with an advance) and an expense waiting for an Owner or an Admin; their answer back
     to whoever made it; the vendor's answer on its link; a claim paid back; a supplier bill coming due, derived from its day (never stored) */
  { key: 'po_review', label: 'A purchase order needs approval', help: 'Over the limit in Settings › Finance › Costs, or with an advance — submitted by a designer.', who: 'Owners and Admins', icon: 'approval' },
  { key: 'po_sent_back', label: 'Your purchase order is sent back', help: 'An Owner or an Admin sent it back with a note.', who: 'Whoever submitted it', icon: 'edit' },
  { key: 'po_approved', label: 'Your purchase order is approved and sent', help: 'An Owner or an Admin approved a purchase order you submitted and sent it to the vendor.', who: 'Whoever submitted it', icon: 'verified' },
  { key: 'po_answered', label: 'A vendor answers a purchase order', help: 'Accepted, changes asked or declined — on its link, or marked by the studio.', who: 'Whoever made it and the project’s members', icon: 'local_shipping' },
  { key: 'expense_review', label: 'An expense needs approval', help: 'Logged by a designer while Settings › Finance › Costs asks for approval.', who: 'Owners and Admins', icon: 'approval' },
  { key: 'expense_answered', label: 'Your expense is answered', help: 'Approved, or sent back with a note.', who: 'Whoever logged it', icon: 'verified' },
  { key: 'claim_paid', label: 'Your claim is paid back', help: 'An Owner or an Admin recorded the payment.', who: 'Whoever claimed it', icon: 'payments' },
  /* (S44R — UAT row 361, call C8, as recommended — her UAT ask 2026-10-15) invented copy */
  { key: 'bill_review', label: 'A supplier bill needs your OK', help: 'Over the PO approval limit with no PO, or more than its PO by over the tolerance in Settings › Finance › Money out — it waits before anyone pays it.', who: 'Owners and Admins', icon: 'approval' },
  { key: 'bill_approved', label: 'A bill you recorded is approved', help: 'An Owner or an Admin approved a bill that waited — it can be paid now.', who: 'Whoever recorded it', icon: 'verified' },
  { key: 'bill_due', label: 'A supplier bill falls due', help: 'Three days before its due day, and once it is overdue and not paid.', who: 'Owners, Admins and Accounting', icon: 'receipt_long' },   // (parity map, MO-098)
  /* (gaps build G, G-Q14) the floor plan, from the client's side */
  { key: 'floor_plan_client', label: 'A client marks up the floor plan', help: 'A pin, a drawing, a comment or a plan they add — once in 15 minutes per plan, however many they make.', who: 'The project’s members', icon: 'space_dashboard' },
  { key: 'floor_plan_confirmed', label: 'A client confirms a layout', help: 'They pressed Confirm this layout on their portal — with their note.', who: 'The project’s members, Owners and Admins', icon: 'verified' },
  /* (gaps build F2 — the books, F2-Q15) a member's ask for another commission rate and its answer; commission paid; a credit note issued on a
     project; a push to Xero that failed (derived from the sync, never stored) */
  { key: 'commission_asked', label: 'A member asks for another commission rate', help: 'On a project they work on, with their reason.', who: 'Owners and Admins', icon: 'workspace_premium' },
  { key: 'commission_answered', label: 'Your commission ask is answered', help: 'Approved — perhaps at another rate — or declined with a note.', who: 'Whoever asked', icon: 'verified' },
  { key: 'commission_paid', label: 'Your commission is paid', help: 'An Owner or an Admin recorded the payment.', who: 'The member paid', icon: 'payments' },
  { key: 'credit_issued', label: 'A credit note is issued', help: 'Against one of the project’s invoices — the client sees it on their portal.', who: 'The project’s members', icon: 'receipt_long' },
  { key: 'xero_failed', label: 'Xero needs you', help: 'A push to Xero failed — usually a mapping to set — and waits for Retry.', who: 'Owners, Admins and Accounting', icon: 'account_balance' },   // (parity map, FB-114)
  /* (gaps build H, H-Q10 · H-Q15) tickets and the conversation, from the client's side (invented copy) */
  { key: 'ticket_raised', label: 'A client reports an issue', help: 'A new ticket from their portal — its category and subject.', who: 'The project’s members, else Owners and Admins', icon: 'handyman' },
  { key: 'ticket_client', label: 'A client answers on a ticket', help: 'They reply, reopen it with a reply, or close it.', who: 'Whoever looks after it, else the project’s members', icon: 'handyman' },
  { key: 'ticket_assigned', label: 'A ticket is given to you', help: 'Someone made you the one who looks after it.', who: 'The member it is given to', icon: 'person' },
  { key: 'ticket_escalated', label: 'A ticket is escalated', help: 'Marked Urgent with a note — it stays in Needs attention until resolved.', who: 'Owners and Admins', icon: 'flag' },
  /* (gaps build J, J-Q17) the 3D Space Planner (invented copy) */
  { key: 'layout_viewed', label: 'A client opens a shared 3D layout', help: 'The first time they open it — on its link or on their portal.', who: 'Whoever shared it and the project’s members', icon: 'view_in_ar' },
  /* (parity map 2026-10-10) (invented copy) */
  { key: 'schedule_shared', label: 'The schedule is shared with a client', help: 'The first share and each share of changes — by anyone but you.', who: 'Owners, Admins and the project’s members', icon: 'calendar_month' },
  { key: 'invoice_sent', label: 'An invoice goes to a client', help: 'A stage’s invoice or a one-off invoice is sent — by anyone but you.', who: 'Owners, Admins and Accounting', icon: 'send' },   // (parity map, FB-114)
  { key: 'invoice_reminded', label: 'An invoice is still unpaid after three reminders', help: 'Reminded three times and still owed — time for a call.', who: 'Owners, Admins and Accounting', icon: 'warning' },   // (parity map, FB-114)
  { key: 'po_delivery_late', label: 'A purchase order’s delivery is late', help: 'Its expected delivery day has passed and it is not marked delivered.', who: 'Whoever made it, the project’s members and Accounting', icon: 'local_shipping' },   // (parity map, MO-098)
  { key: 'invite_requested', label: 'A member asks to add someone to the studio', help: 'From a task given to someone outside the studio.', who: 'Owners and Admins', icon: 'person_add' },
  { key: 'message_failed', label: 'A message could not be sent', help: 'An email or a WhatsApp to a client failed three times — or an invitation to a new member, which tells whoever sent it.', who: 'Owners and Admins', icon: 'error' },   // (pending modules S18) the invitation's last failure too
  { key: 'send_held', label: 'A large send waits for your OK', help: 'One action would message many people at once — it is held until you send it.', who: 'The Owner', icon: 'approval' },
  /* (pending modules S26) a lead's Team conversation before Won rings it too — the words say both */
  { key: 'team_message', label: 'A teammate writes in a team chat', help: 'In a lead’s or a project’s Team conversation — the client never sees it.', who: 'The lead’s or the project’s members', icon: 'comment' },
  { key: 'chat_message', label: 'A client sends a message', help: 'In Messages — once in 15 minutes per conversation while it waits unread.', who: 'The project’s members', icon: 'comment' },
  /* (pending modules S09 — her "build all of them" 2026-10-11) 1.0's invitations had no word back; the studio now hears its new member arrive (invented copy) */
  { key: 'member_joined', label: 'Someone you invited joins the studio', help: 'Their first visit, after Company › Members sent them an invitation.', who: 'Whoever invited them, else the Owners', icon: 'person_add' },
  /* (pending modules S23 — 1.0's unmerged meetings branch kept the client's RSVP) (invented copy) */
  { key: 'meeting_answered', label: 'A client answers a meeting invitation', help: 'They’re coming, or the time doesn’t suit — on the invitation’s link.', who: 'The meeting’s people', icon: 'event' },
  /* (pending modules S26 — her "build all of them" 2026-10-11; card studio:team-chats) 1.0's chats between members (invented copy) */
  { key: 'member_message', label: 'A teammate messages you', help: 'In Messages — to you, a group you’re in or everyone at the studio; once in 15 minutes per conversation while it waits unread.', who: 'The people in the conversation', icon: 'comment' },
  /* (pending modules S27 — 1.0's hangout.homeowner_registered · hangout.meeting_assigned) (invented copy) */
  { key: 'hangout_registered', label: 'Someone books a chat at a Hangout', help: 'On your Hangout page or at your table — they arrive as a lead, source Hangout.', who: 'The designer who meets them, Owners and Admins', icon: 'group' },
  { key: 'hangout_meeting_assigned', label: 'A Hangout chat is given to you', help: 'An Owner or an Admin gives you a homeowner’s chat at the tables.', who: 'The designer', icon: 'group' },
  /* (pending modules S37 — 1.0's /verify promised "You'll be notified via email and in-app notification" and sent neither) (invented copy) */
  { key: 'listing_answered', label: 'Qanvast answers your listing application', help: 'Your studio is listed, or Qanvast asks for changes — on Company › Profile.', who: 'Owners and Admins', icon: 'verified' },
  /* (pending modules S41b-4 — 1.0's plg upgrade nudges, a modal there; here one quiet row with its one way on and Not now) (invented copy) */
  { key: 'upgrade_offer', label: 'An offer to move to Pro', help: 'On Free only, at a quiet moment — a second render, the first quote read, a teammate joining, AI credits running low. In the app only.', who: 'The Owner', icon: 'diamond' },
]
/** (pending modules S41b-4) Notices that stay in the app — 1.0 never sent an upgrade offer by email or WhatsApp, so the studio's table offers
    neither channel for them, the rules never carry one, and a daily summary leaves them out. */
export const IN_APP_ONLY: ReadonlySet<EventKey> = new Set<EventKey>(['upgrade_offer'])
export const eventDef = (key: string): EventDef | undefined => EVENTS.find((e) => e.key === key)

export type NotificationRules = {
  channels: Record<EventKey, Record<Channel, boolean>>
  /** Minutes a New lead may go without a contact log before "untouched" is raised. */
  untouchedMinutes: number
  /** No follow-ups once a lead is Lost or On Hold, or Won with no open project — a project's tasks keep their reminders until it is
      completed (Q-29, lib/notifications/queries.ts `derivedDue`). */
  stopWhenClosed: boolean
}
export const UNTOUCHED_OPTIONS: { minutes: number; label: string }[] = [{ minutes: 15, label: '15 minutes' }, { minutes: 30, label: '30 minutes' }, { minutes: 60, label: '1 hour' }, { minutes: 240, label: '4 hours' }, { minutes: 1440, label: '1 day' }]
const on = (in_app: boolean, email: boolean, whatsapp: boolean): Record<Channel, boolean> => ({ in_app, email, whatsapp })
export const DEFAULT_RULES: NotificationRules = {
  channels: { new_lead: on(true, true, true), assigned: on(true, true, false), untouched: on(true, false, true), quote_approval: on(true, true, false), quote_approved: on(true, true, false), quote_changes: on(true, true, false), quote_confirmed: on(true, true, true), contract_sent: on(true, true, false), quote_signed: on(true, true, true), task_due: on(true, false, false), stage_changed: on(true, false, false), task_assigned: on(true, true, false), task_due_soon: on(true, false, true), hold_due: on(true, true, false), question_answered: on(true, true, false), price_book_proposed: on(true, true, false), price_book_answered: on(true, false, false), render_feedback: on(true, false, true), credits_low: on(true, true, false), credits_out: on(true, true, true), credit_request: on(true, true, false), credit_request_answered: on(true, false, false), credit_amount_reached: on(true, false, false), credits_renewed: on(true, false, false), payment_failed: on(true, true, true), credit_receipt: on(true, true, false),
    quote_change_asked: on(true, true, true),
    task_comment: on(true, false, false), file_comment: on(true, false, false),   // (UX audit 2026-09-30, T8)
    project_created: on(true, true, false),   // (REG-918)
    update_review: on(true, true, false), update_approved: on(true, false, false), update_sent_back: on(true, true, false),   // (REG-954)
    portal_opened: on(true, false, false),   // (Projects r4a)
    milestone_due: on(true, false, false), milestone_late: on(true, false, false),   // (Projects round 2)
    choice_made: on(true, true, false),   // (Projects round 8)
    stage_confirmed: on(true, false, false), stage_changes: on(true, true, true),   // (Projects round 4b)
    handover_review: on(true, true, false), handover_approved: on(true, false, false), handover_sent_back: on(true, true, false),   // (Projects round 7)
    invoice_review: on(true, true, false), invoice_sent_back: on(true, true, false), variation_approved: on(true, true, false),   // (Projects round 5)
    payment_to_confirm: on(true, true, false), payment_confirmed: on(true, false, false), payment_not_received: on(true, false, false), payment_reversed: on(true, true, false), payment_overdue: on(true, false, false),   // (Projects round 6)
    project_completed: on(true, false, false), project_reopened: on(true, true, false),   // (fix-E, E-20)
    invoice_approved: on(true, false, false),   // (fix-D, D-18)
    variation_reopened: on(true, false, false),   // (fix-D, D-01)
    project_hold_due: on(true, true, false),   // (gaps build, package A — M-01)
    invoice_ready: on(true, false, false),   // (gaps build B, item 5)
    schedule_ask: on(true, true, false), schedule_answer: on(true, false, false),   // (gaps build, package C)
    choice_declined: on(true, true, false), variation_declined: on(true, true, true), update_published: on(true, false, false),   // (gaps build D)
    po_review: on(true, true, false), po_sent_back: on(true, true, false), po_approved: on(true, false, false), po_answered: on(true, true, false), expense_review: on(true, false, false), expense_answered: on(true, false, false), claim_paid: on(true, false, false), bill_due: on(true, false, false),   // (gaps build F1)
    bill_review: on(true, true, false), bill_approved: on(true, false, false),   // (S44R, C8) the PO review's own channels
    floor_plan_client: on(true, false, false), floor_plan_confirmed: on(true, true, false),   // (gaps build G)
    commission_asked: on(true, true, false), commission_answered: on(true, false, false), commission_paid: on(true, false, false), credit_issued: on(true, false, false), xero_failed: on(true, false, false),   // (gaps build F1 · F2)
    ticket_raised: on(true, true, false), ticket_client: on(true, false, false), ticket_assigned: on(true, false, false), ticket_escalated: on(true, true, true), chat_message: on(true, false, false),   // (gaps build H)
    layout_viewed: on(true, false, false),   // (gaps build J)
    schedule_shared: on(true, false, false), invoice_sent: on(true, false, false), invoice_reminded: on(true, true, false), po_delivery_late: on(true, false, false),
    invite_requested: on(true, true, false), message_failed: on(true, true, false), send_held: on(true, true, false), team_message: on(true, false, false),   // (parity map 2026-10-10)
    member_joined: on(true, false, false),   // (pending modules S09)
    meeting_answered: on(true, true, false),   // (pending modules S23)
    member_message: on(true, false, false),   // (pending modules S26) the bell, as the team chat's
    hangout_registered: on(true, true, false), hangout_meeting_assigned: on(true, false, false),   // (pending modules S27)
    listing_answered: on(true, true, false),   // (pending modules S37) 1.0's "via email and in-app notification"
    upgrade_offer: on(true, false, false) },   // (pending modules S41b-4) in the app only (IN_APP_ONLY)
  untouchedMinutes: 30,
  stopWhenClosed: true,
}
export function parseRules(v: unknown): NotificationRules {
  const r = (v ?? {}) as Partial<{ channels: Record<string, Partial<Record<Channel, unknown>>>; untouchedMinutes: unknown; stopWhenClosed: unknown }>
  const channels = {} as NotificationRules['channels']
  for (const e of EVENTS) {
    const c = r.channels?.[e.key] ?? {}
    channels[e.key] = { in_app: c.in_app === undefined ? DEFAULT_RULES.channels[e.key].in_app : !!c.in_app, email: c.email === undefined ? DEFAULT_RULES.channels[e.key].email : !!c.email, whatsapp: c.whatsapp === undefined ? DEFAULT_RULES.channels[e.key].whatsapp : !!c.whatsapp }
    if (IN_APP_ONLY.has(e.key)) channels[e.key] = { ...channels[e.key], email: false, whatsapp: false }   // (pending modules S41b-4)
  }
  const minutes = typeof r.untouchedMinutes === 'number' && UNTOUCHED_OPTIONS.some((o) => o.minutes === r.untouchedMinutes) ? r.untouchedMinutes : DEFAULT_RULES.untouchedMinutes
  return { channels, untouchedMinutes: minutes, stopWhenClosed: r.stopWhenClosed === undefined ? true : !!r.stopWhenClosed }
}

/* ── messages ── */
export type MessageTemplate = { event: EventKey; channel: Exclude<Channel, 'in_app'>; subject: string; body: string }
export const FIELDS: { key: string; label: string }[] = [
  { key: '{lead_name}', label: 'The lead’s name' }, { key: '{studio}', label: 'The studio' }, { key: '{member}', label: 'Who the message is to' }, { key: '{actor}', label: 'Who did it' },
  { key: '{source}', label: 'The lead’s source' }, { key: '{quote_number}', label: 'The quote’s number' }, { key: '{link}', label: 'The record’s link' },
  { key: '{stage}', label: 'The lead’s new stage' }, { key: '{task}', label: 'The task’s title' },   /* (REG-608) */
  { key: '{when}', label: 'When it is due' },   /* (S42 audit A-09) */
  { key: '{item}', label: 'The price book item' },   /* (REG-652) */
  { key: '{credits}', label: 'The AI credits' }, { key: '{amount}', label: 'The amount paid' },   /* (REG-703) */
  { key: '{comment}', label: 'The comment’s first words' }, { key: '{file}', label: 'The file’s name' },   /* (UX audit 2026-09-30, T8) */
  { key: '{update}', label: 'The project update’s title' }, { key: '{note}', label: 'The reason it was sent back' },   /* (REG-954) */
  { key: '{choice}', label: 'The choice and the option picked' },   /* (Projects round 8) */
  { key: '{milestone}', label: 'The milestone’s name' },   /* (Projects round 4b) — a client's note rides in {note} */
  { key: '{invoice}', label: 'The invoice’s payment stage' },   /* (Projects round 5) */
  { key: '{po}', label: 'The purchase order’s number' }, { key: '{vendor}', label: 'The vendor' }, { key: '{expense}', label: 'What the expense was for' },   /* (gaps build F1) */
  { key: '{plan}', label: 'The floor plan’s name' },   /* (gaps build G) */
  { key: '{rate}', label: 'The commission rate' }, { key: '{credit_note}', label: 'The credit note’s number' },   /* (gaps build F2) */
  { key: '{ticket}', label: 'The ticket’s number and subject' },   /* (gaps build H) — a message's first words ride in {comment} */
]
const T = (event: EventKey, channel: 'email' | 'whatsapp', subject: string, body: string): MessageTemplate => ({ event, channel, subject, body })
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  T('new_lead', 'whatsapp', '', 'New lead at {studio}: {lead_name} ({source}). Open it: {link}'),
  T('new_lead', 'email', 'New lead: {lead_name}', 'Hi {member},\n\n{lead_name} just came in through {source}. Open the lead to assign it and log the first contact: {link}\n\n{studio}'),
  T('assigned', 'email', '{lead_name} is now yours', 'Hi {member},\n\n{actor} assigned {lead_name} to you. Reach out today and log the contact: {link}\n\n{studio}'),
  T('assigned', 'whatsapp', '', '{actor} assigned {lead_name} to you at {studio}. Open it: {link}'),
  T('untouched', 'whatsapp', '', '{lead_name} has had no contact yet. A quick reply keeps the lead warm: {link}'),
  T('untouched', 'email', 'Follow up: {lead_name}', 'Hi {member},\n\n{lead_name} arrived and nobody has logged a contact yet. Open the lead and reach out: {link}\n\n{studio}'),
  T('quote_approval', 'email', 'Quote {quote_number} needs your approval', 'Hi {member},\n\n{actor} sent quote {quote_number} for {lead_name} for approval. Review it here: {link}\n\n{studio}'),
  T('quote_approval', 'whatsapp', '', 'Quote {quote_number} for {lead_name} needs your approval: {link}'),
  /* (REG-624) */
  T('quote_approved', 'email', 'Quote {quote_number} is approved', 'Hi {member},\n\n{actor} approved quote {quote_number} for {lead_name}. Send it to the client when you’re ready: {link}\n\n{studio}'),
  T('quote_approved', 'whatsapp', '', '{actor} approved quote {quote_number} for {lead_name}: {link}'),
  T('quote_changes', 'email', 'Changes asked on quote {quote_number}', 'Hi {member},\n\n{actor} sent quote {quote_number} for {lead_name} back with a note. Open it to read the note and make the changes: {link}\n\n{studio}'),
  T('quote_changes', 'whatsapp', '', '{actor} asked for changes on quote {quote_number} for {lead_name}: {link}'),
  T('quote_confirmed', 'email', '{lead_name} confirmed quote {quote_number}', 'Hi {member},\n\n{lead_name} confirmed quote {quote_number} on its link. Add the T&Cs and send it for signature: {link}\n\n{studio}'),
  T('quote_confirmed', 'whatsapp', '', '{lead_name} confirmed quote {quote_number}. Next: add the T&Cs and send for signature — {link}'),
  /* (UX audit Q6) */
  T('quote_change_asked', 'email', '{lead_name} asked for a change to quote {quote_number}', 'Hi {member},\n\n{lead_name} asked for a change to quote {quote_number} on its confirmation link. Read what they asked and revise it: {link}\n\n{studio}'),
  T('quote_change_asked', 'whatsapp', '', '{lead_name} asked for a change to quote {quote_number}: {link}'),
  /* (REG-634) */
  T('contract_sent', 'email', 'A contract went out to {lead_name}', 'Hi {member},\n\n{actor} sent a contract to {lead_name} for signature. Follow it on the lead: {link}\n\n{studio}'),
  T('contract_sent', 'whatsapp', '', '{actor} sent a contract to {lead_name} for signature: {link}'),
  T('quote_signed', 'email', '{lead_name} signed', 'Hi {member},\n\n{lead_name} signed on the signing link. The signed copy is on the lead: {link}\n\n{studio}'),
  T('quote_signed', 'whatsapp', '', '{lead_name} signed at {studio}. The signed copy is on the lead: {link}'),
  T('task_due', 'email', 'Overdue: a task on {lead_name}', 'Hi {member},\n\nA task on {lead_name} is past its due date. Open it: {link}\n\n{studio}'),
  T('task_due', 'whatsapp', '', 'A task on {lead_name} is overdue: {link}'),
  /* (REG-608) */
  T('stage_changed', 'email', '{lead_name} moved to {stage}', 'Hi {member},\n\n{actor} moved {lead_name} to {stage}. Open it: {link}\n\n{studio}'),   /* (parity P-37) a lead's or a project's — "Open it" (was "Open the lead") */
  T('stage_changed', 'whatsapp', '', '{actor} moved {lead_name} to {stage} at {studio}: {link}'),
  T('task_assigned', 'email', 'New task: {task}', 'Hi {member},\n\n{actor} put you on “{task}” for {lead_name}. Open it: {link}\n\n{studio}'),
  T('task_assigned', 'whatsapp', '', 'New task for you at {studio}: “{task}” on {lead_name} — {link}'),
  /* (S42 audit A-09) {when}: "in 30 minutes", "today", "tomorrow", "in 3 days" — the reminder's own timing */
  T('task_due_soon', 'email', 'Due {when}: {task}', 'Hi {member},\n\n“{task}” on {lead_name} is due {when}. Open it: {link}\n\n{studio}'),
  T('task_due_soon', 'whatsapp', '', 'Due {when}: “{task}” on {lead_name} — {link}'),
  T('hold_due', 'email', 'Hold ended: {lead_name}', 'Hi {member},\n\nThe follow-up date on {lead_name} has come round. Resume the lead or hold it again: {link}\n\n{studio}'),
  T('hold_due', 'whatsapp', '', 'Hold ended — revisit {lead_name}: {link}'),
  T('question_answered', 'email', '{lead_name} answered the questionnaire', 'Hi {member},\n\n{lead_name} answered the questionnaire on their portal. Read the answers: {link}\n\n{studio}'),
  T('question_answered', 'whatsapp', '', '{lead_name} answered the questionnaire at {studio}: {link}'),
  /* (REG-652) */
  T('price_book_proposed', 'email', '{actor} proposed an item for My Items', 'Hi {member},\n\n{actor} proposed “{item}” for the studio’s price book. Approve it, or send it back with a note: {link}\n\n{studio}'),
  T('price_book_proposed', 'whatsapp', '', '{actor} proposed “{item}” for My Items at {studio}: {link}'),
  T('price_book_answered', 'email', 'Your proposed item: {item}', 'Hi {member},\n\n{actor} answered your proposal “{item}”. Open My Items to see it: {link}\n\n{studio}'),
  T('price_book_answered', 'whatsapp', '', '{actor} answered your proposal “{item}”: {link}'),
  T('render_feedback', 'whatsapp', '', '{lead_name} responded to the renders you shared from {studio}: {link}'),
  T('render_feedback', 'email', '{lead_name} responded to your renders', 'Hi {member},\n\n{lead_name} responded to the renders you shared. Open the design to see what they said: {link}\n\n{studio}'),
  /* (REG-703) */
  T('credits_low', 'email', 'AI credits are running low at {studio}', 'Hi {member},\n\n{studio} has {credits} AI credits left this month. Top up or change the plan before they run out: {link}\n\n{studio}'),
  T('credits_low', 'whatsapp', '', '{studio} has {credits} AI credits left this month: {link}'),
  T('credits_out', 'email', '{studio} is out of AI credits', 'Hi {member},\n\nThe AI tools are paused until you top up or the month refreshes — nothing else stops. Add AI credits: {link}\n\n{studio}'),
  T('credits_out', 'whatsapp', '', '{studio} is out of AI credits. AI tools are paused — top up here: {link}'),
  T('credit_request', 'email', '{actor} asks for more AI credits', 'Hi {member},\n\n{actor} asked for more AI credits. Raise their monthly amount or top up: {link}\n\n{studio}'),
  T('credit_request', 'whatsapp', '', '{actor} asks for more AI credits at {studio}: {link}'),
  T('credit_request_answered', 'email', 'More AI credits', 'Hi {member},\n\n{actor} answered your ask for AI credits. Press Generate again when you’re ready: {link}\n\n{studio}'),
  T('credit_request_answered', 'whatsapp', '', '{actor} answered your ask for AI credits at {studio}.'),
  T('credit_amount_reached', 'email', '{actor} used their monthly AI credits', 'Hi {member},\n\n{actor} has used their monthly AI credits. The studio’s credits are untouched. Raise their amount if they need more: {link}\n\n{studio}'),
  T('credit_amount_reached', 'whatsapp', '', '{actor} used their monthly AI credits at {studio}: {link}'),
  T('credits_renewed', 'email', 'This month’s AI credits are in', 'Hi {member},\n\n{studio}’s {credits} AI credits for this month are in. See the month: {link}\n\n{studio}'),
  T('credits_renewed', 'whatsapp', '', '{studio}’s {credits} AI credits for this month are in.'),
  T('payment_failed', 'email', 'The payment for {studio}’s plan didn’t go through', 'Hi {member},\n\nWe couldn’t take the payment for {studio}’s plan. It stays on until the grace date — update the card before then: {link}\n\n{studio}'),
  T('payment_failed', 'whatsapp', '', 'The payment for {studio}’s plan didn’t go through. Update the card: {link}'),
  T('credit_receipt', 'email', 'Your receipt · {amount}', 'Hi {member},\n\nThanks — {amount} was paid for {credits}. The tax invoice is in Company › Plan & AI credits: {link}\n\n{studio}'),
  T('credit_receipt', 'whatsapp', '', 'Receipt from {studio}: {amount} for {credits}. The tax invoice: {link}'),
  /* (UX audit 2026-09-30, T8) */
  T('task_comment', 'email', '{actor} commented on “{task}”', 'Hi {member},\n\n{actor} commented on “{task}” for {lead_name}: “{comment}”. Reply in the task: {link}\n\n{studio}'),
  T('task_comment', 'whatsapp', '', '{actor} on “{task}” ({lead_name}): “{comment}” — {link}'),
  T('file_comment', 'email', '{actor} commented on {file}', 'Hi {member},\n\n{actor} commented on {file} for {lead_name}: “{comment}”. Reply on the file: {link}\n\n{studio}'),
  T('file_comment', 'whatsapp', '', '{actor} on {file} ({lead_name}): “{comment}” — {link}'),
  /* (REG-918) */
  T('project_created', 'email', 'New project: {lead_name}', 'Hi {member},\n\n{actor} created the project for {lead_name}. Open it to set its dates and team: {link}\n\n{studio}'),
  T('project_created', 'whatsapp', '', 'New project for {lead_name} at {studio}: {link}'),
  /* (REG-954) */
  T('update_review', 'email', 'An update for {lead_name} needs your review', 'Hi {member},\n\n{actor} wrote “{update}” for {lead_name}. Approve it to send it to the client, or send it back with a reason: {link}\n\n{studio}'),
  T('update_review', 'whatsapp', '', '{actor} wrote “{update}” for {lead_name} — it needs your review: {link}'),
  T('update_approved', 'email', 'Your update “{update}” is published', 'Hi {member},\n\n{actor} approved “{update}” for {lead_name}. The client can see it now: {link}\n\n{studio}'),
  T('update_approved', 'whatsapp', '', '{actor} approved “{update}” for {lead_name} — the client can see it: {link}'),
  T('update_sent_back', 'email', 'Your update “{update}” was sent back', 'Hi {member},\n\n{actor} sent “{update}” for {lead_name} back: “{note}”. Change it and resubmit: {link}\n\n{studio}'),
  T('update_sent_back', 'whatsapp', '', '{actor} sent “{update}” for {lead_name} back: “{note}” — {link}'),
  /* (Projects r4a) */
  T('portal_opened', 'email', '{lead_name} opened their portal', 'Hi {member},\n\n{lead_name} signed in to their portal for the first time. See what is waiting on them: {link}\n\n{studio}'),
  T('portal_opened', 'whatsapp', '', '{lead_name} opened their portal at {studio} for the first time: {link}'),
  /* (Projects round 8) */
  T('choice_made', 'email', '{lead_name} made a choice', 'Hi {member},\n\n{lead_name} chose on their portal: {choice}. See it with their note: {link}\n\n{studio}'),
  T('choice_made', 'whatsapp', '', '{lead_name} chose {choice} on their portal: {link}'),
  /* (Projects round 4b) */
  T('stage_confirmed', 'email', '{lead_name} confirmed {milestone}', 'Hi {member},\n\n{lead_name} confirmed on their portal that {milestone} is done. See the schedule: {link}\n\n{studio}'),
  T('stage_confirmed', 'whatsapp', '', '{lead_name} confirmed {milestone} is done: {link}'),
  T('stage_changes', 'email', '{lead_name} says something is not right with {milestone}', 'Hi {member},\n\n{lead_name} says something is not right with {milestone}: “{note}”. Look at it with them, then ask them to confirm again: {link}\n\n{studio}'),
  T('stage_changes', 'whatsapp', '', '{lead_name} says something is not right with {milestone}: “{note}” — {link}'),
  /* (Projects round 7) the schedule's two reminders (round 2) had no messages, so Settings › Notifications could not draw its Messages and
     the page failed — their email and WhatsApp words */
  T('milestone_due', 'email', '{milestone} ends soon on {lead_name}’s project', 'Hi {member},\n\n“{milestone}” on {lead_name}’s project ends soon and is not done yet. Open the schedule: {link}\n\n{studio}'),
  T('milestone_due', 'whatsapp', '', '“{milestone}” on {lead_name}’s project ends soon: {link}'),
  T('milestone_late', 'email', 'Overdue: {milestone} on {lead_name}’s project', 'Hi {member},\n\n“{milestone}” on {lead_name}’s project is past its last day and not done. Move it or mark it done: {link}\n\n{studio}'),
  T('milestone_late', 'whatsapp', '', 'Overdue: “{milestone}” on {lead_name}’s project — {link}'),
  T('handover_review', 'email', '{lead_name}’s handover needs your review', 'Hi {member},\n\n{actor} asked to complete {lead_name}’s project. Look at the checklist, then approve it or send it back with a note: {link}\n\n{studio}'),
  T('handover_review', 'whatsapp', '', '{actor} asked to complete {lead_name}’s project — it needs your review: {link}'),
  T('handover_approved', 'email', '{lead_name}’s project is completed', 'Hi {member},\n\n{actor} approved the handover you asked for — {lead_name}’s project is completed: {link}\n\n{studio}'),
  T('handover_approved', 'whatsapp', '', '{actor} approved your handover — {lead_name}’s project is completed: {link}'),
  T('handover_sent_back', 'email', 'Your handover for {lead_name} was sent back', 'Hi {member},\n\n{actor} sent the handover for {lead_name} back: “{note}”. Finish what it needs and ask again: {link}\n\n{studio}'),
  T('handover_sent_back', 'whatsapp', '', '{actor} sent the handover for {lead_name} back: “{note}” — {link}'),
  /* (Projects round 5) */
  T('invoice_review', 'email', 'An invoice for {lead_name} needs your approval', 'Hi {member},\n\n{actor} submitted the {invoice} invoice for {lead_name}. Approve and send it, or send it back with a note: {link}\n\n{studio}'),
  T('invoice_review', 'whatsapp', '', '{actor} submitted the {invoice} invoice for {lead_name} — it needs your approval: {link}'),
  T('invoice_sent_back', 'email', 'Your invoice for {lead_name} was sent back', 'Hi {member},\n\n{actor} sent the {invoice} invoice for {lead_name} back: “{note}”. Change it and submit it again: {link}\n\n{studio}'),
  T('invoice_sent_back', 'whatsapp', '', '{actor} sent the {invoice} invoice for {lead_name} back: “{note}” — {link}'),
  T('variation_approved', 'email', '{lead_name} approved {quote_number}', 'Hi {member},\n\n{lead_name} approved variation order {quote_number}. The contract value and the unsent invoices follow: {link}\n\n{studio}'),
  T('variation_approved', 'whatsapp', '', '{lead_name} approved variation order {quote_number} — the contract moved: {link}'),
  /* (Projects round 6) */
  T('payment_to_confirm', 'email', '{lead_name} says they have paid', 'Hi {member},\n\n{lead_name} says they paid {amount} for the {invoice} invoice. Check the bank’s confirmation and confirm it, or say it didn’t arrive: {link}\n\n{studio}'),
  T('payment_to_confirm', 'whatsapp', '', '{lead_name} says they paid {amount} for the {invoice} invoice — check and confirm: {link}'),
  T('payment_confirmed', 'email', '{lead_name}’s payment is confirmed', 'Hi {member},\n\n{actor} confirmed {lead_name}’s payment of {amount} for the {invoice} invoice. The receipt is on the project: {link}\n\n{studio}'),
  T('payment_confirmed', 'whatsapp', '', '{actor} confirmed {lead_name}’s payment of {amount}: {link}'),
  T('payment_not_received', 'email', '{lead_name}’s payment was not received', 'Hi {member},\n\n{actor} marked {lead_name}’s payment of {amount} as not received: “{note}”. See the invoice: {link}\n\n{studio}'),
  T('payment_not_received', 'whatsapp', '', '{actor} marked {lead_name}’s payment of {amount} as not received: “{note}” — {link}'),
  T('payment_reversed', 'email', 'A payment from {lead_name} was reversed', 'Hi {member},\n\n{actor} reversed {lead_name}’s payment of {amount} for the {invoice} invoice: “{note}”. See the invoice: {link}\n\n{studio}'),
  T('payment_reversed', 'whatsapp', '', '{actor} reversed {lead_name}’s payment of {amount}: “{note}” — {link}'),
  T('payment_overdue', 'email', 'Overdue: the {invoice} invoice for {lead_name}', 'Hi {member},\n\nThe {invoice} invoice for {lead_name} is past its due day and not paid. Remind them on WhatsApp from the project: {link}\n\n{studio}'),
  T('payment_overdue', 'whatsapp', '', 'The {invoice} invoice for {lead_name} is overdue: {link}'),
  /* (fix-E, E-20) every event carries its email and WhatsApp words, or Settings › Notifications cannot draw its row */
  T('project_completed', 'email', '{lead_name}’s project is completed', 'Hi {member},\n\n{actor} completed the handover on {lead_name}’s project. Its schedule, choices and agreed money now read only: {link}\n\n{studio}'),
  T('project_completed', 'whatsapp', '', '{actor} completed {lead_name}’s project: {link}'),
  T('project_reopened', 'email', '{lead_name}’s project is open again', 'Hi {member},\n\n{actor} reopened {lead_name}’s project: “{note}”. It is In progress again: {link}\n\n{studio}'),
  T('project_reopened', 'whatsapp', '', '{actor} reopened {lead_name}’s project: “{note}” — {link}'),
  /* (fix-D, D-18) */
  T('invoice_approved', 'email', 'Your invoice for {lead_name} was approved and sent', 'Hi {member},\n\n{actor} approved the {invoice} invoice for {lead_name} and sent it to the client: {link}\n\n{studio}'),
  T('invoice_approved', 'whatsapp', '', '{actor} approved and sent the {invoice} invoice for {lead_name}: {link}'),
  /* (fix-D, D-01) */
  T('variation_reopened', 'email', '{quote_number} for {lead_name} is being revised', 'Hi {member},\n\n{actor} started a new version of variation order {quote_number}. Its approval no longer counts until {lead_name} approves the new one — the contract value and the unsent invoices moved back: {link}\n\n{studio}'),
  T('variation_reopened', 'whatsapp', '', '{actor} is revising variation order {quote_number} for {lead_name} — the contract moved back until it is approved again: {link}'),
  /* (gaps build, package A — M-01) */
  T('project_hold_due', 'email', 'Time to resume {lead_name}’s project', 'Hi {member},\n\n{lead_name}’s project on hold was to resume today. Resume it, or give it a new date: {link}\n\n{studio}'),
  T('project_hold_due', 'whatsapp', '', '{lead_name}’s project on hold was to resume today: {link}'),
  /* (gaps build B, item 5) */
  T('invoice_ready', 'email', 'The {invoice} invoice for {lead_name} is ready to send', 'Hi {member},\n\nThe {invoice} stage on {lead_name}’s project is reached — its invoice is ready to send: {link}\n\n{studio}'),
  T('invoice_ready', 'whatsapp', '', 'The {invoice} invoice for {lead_name} is ready to send: {link}'),
  /* (gaps build, package C) */
  T('schedule_ask', 'email', '{actor} asks about {milestone} on {lead_name}’s project', 'Hi {member},\n\n{actor} asks about “{milestone}” on {lead_name}’s project: {note}. Approve it or answer them on the schedule: {link}\n\n{studio}'),
  T('schedule_ask', 'whatsapp', '', '{actor} asks about “{milestone}” on {lead_name}’s project — it needs your answer: {link}'),
  T('schedule_answer', 'email', 'Your ask about {milestone} is answered', 'Hi {member},\n\n{actor} answered your ask about “{milestone}” on {lead_name}’s project: {note}. See the schedule: {link}\n\n{studio}'),
  T('schedule_answer', 'whatsapp', '', '{actor} answered your ask about “{milestone}” on {lead_name}’s project: {link}'),
  /* (gaps build D) */
  T('choice_declined', 'email', '{lead_name} said no to {choice}', 'Hi {member},\n\n{lead_name} said no to “{choice}” on their portal: {note}. Add other options and share it again: {link}\n\n{studio}'),
  T('choice_declined', 'whatsapp', '', '{lead_name} said no to “{choice}” on their portal: {link}'),
  T('variation_declined', 'email', '{lead_name} declined variation order {quote_number}', 'Hi {member},\n\n{lead_name} declined variation order {quote_number} on its confirmation link: {note}. Revise it and send it again, or delete it: {link}\n\n{studio}'),
  T('variation_declined', 'whatsapp', '', '{lead_name} declined variation order {quote_number}: {link}'),
  T('update_published', 'email', '{lead_name} has a new update', 'Hi {member},\n\n“{update}” went out to {lead_name} on their portal: {link}\n\n{studio}'),
  T('update_published', 'whatsapp', '', '“{update}” went out to {lead_name}: {link}'),
  /* (gaps build F1) money out */
  T('po_review', 'email', 'Purchase order {po} needs your approval', 'Hi {member},\n\n{actor} submitted purchase order {po} to {vendor} on {lead_name}’s project. Approve and send it, or send it back with a note: {link}\n\n{studio}'),
  T('po_review', 'whatsapp', '', '{actor} submitted purchase order {po} to {vendor} — it needs your approval: {link}'),
  T('po_sent_back', 'email', 'Your purchase order {po} was sent back', 'Hi {member},\n\n{actor} sent purchase order {po} to {vendor} back: “{note}”. Change it and submit it again: {link}\n\n{studio}'),
  T('po_sent_back', 'whatsapp', '', '{actor} sent purchase order {po} back: “{note}” — {link}'),
  T('po_approved', 'email', 'Your purchase order {po} was approved and sent', 'Hi {member},\n\n{actor} approved purchase order {po} to {vendor} on {lead_name}’s project and sent it: {link}\n\n{studio}'),
  T('po_approved', 'whatsapp', '', '{actor} approved and sent purchase order {po} to {vendor}: {link}'),
  T('po_answered', 'email', '{vendor} answered purchase order {po}', 'Hi {member},\n\n{vendor} answered purchase order {po} on {lead_name}’s project: {note}. See it on the project’s Money: {link}\n\n{studio}'),
  T('po_answered', 'whatsapp', '', '{vendor} answered purchase order {po}: {note} — {link}'),
  T('expense_review', 'email', 'An expense needs your approval', 'Hi {member},\n\n{actor} logged an expense of {amount} — “{expense}”. Approve it, or send it back with a note: {link}\n\n{studio}'),
  T('expense_review', 'whatsapp', '', '{actor} logged an expense of {amount} — “{expense}” — it needs your approval: {link}'),
  T('expense_answered', 'email', 'Your expense “{expense}” is answered', 'Hi {member},\n\n{actor} answered your expense “{expense}” ({amount}): {note}. See it: {link}\n\n{studio}'),
  T('expense_answered', 'whatsapp', '', '{actor} answered your expense “{expense}”: {note} — {link}'),
  T('claim_paid', 'email', '{amount} is paid back to you', 'Hi {member},\n\n{actor} paid you back {amount} for “{expense}”. See it: {link}\n\n{studio}'),
  T('claim_paid', 'whatsapp', '', '{actor} paid you back {amount} for “{expense}”: {link}'),
  T('bill_review', 'email', '{vendor}’s bill {bill} needs your OK', 'Hi {member},\n\n{actor} recorded {vendor}’s bill {bill} for {amount} — {note}. It waits for your OK before it is paid. Approve it from Finance › To do: {link}\n\n{studio}'),   // (S44R, C8) invented copy
  T('bill_review', 'whatsapp', '', '{vendor}’s bill {bill} for {amount} needs your OK before it is paid — {note}: {link}'),
  T('bill_approved', 'email', '{vendor}’s bill {bill} is approved', 'Hi {member},\n\n{actor} approved {vendor}’s bill {bill} for {amount} — it can be paid now: {link}\n\n{studio}'),
  T('bill_approved', 'whatsapp', '', '{actor} approved {vendor}’s bill {bill} — it can be paid: {link}'),
  T('bill_due', 'email', '{vendor}’s bill is due', 'Hi {member},\n\n{vendor}’s bill for {amount} is due and not paid yet. Pay it from Finance › To do: {link}\n\n{studio}'),
  T('bill_due', 'whatsapp', '', '{vendor}’s bill for {amount} is due: {link}'),
  /* (gaps build G) */
  T('floor_plan_client', 'email', '{lead_name} marked up {plan}', 'Hi {member},\n\n{lead_name} added to the floor plan “{plan}” on their portal: {comment}. Open it to answer: {link}\n\n{studio}'),
  T('floor_plan_client', 'whatsapp', '', '{lead_name} marked up the floor plan “{plan}”: {link}'),
  T('floor_plan_confirmed', 'email', '{lead_name} confirmed the layout', 'Hi {member},\n\n{lead_name} confirmed the layout “{plan}” on their portal. {note}\n\nOpen the floor plan: {link}\n\n{studio}'),
  T('floor_plan_confirmed', 'whatsapp', '', '{lead_name} confirmed the layout “{plan}”: {link}'),
  /* (gaps build F2) the books */
  T('commission_asked', 'email', '{actor} asks for another commission rate', 'Hi {member},\n\n{actor} asks for {rate} on {lead_name}’s project: {note}. Approve it or decline it: {link}\n\n{studio}'),
  T('commission_asked', 'whatsapp', '', '{actor} asks for {rate} on {lead_name}’s project: {link}'),
  T('commission_answered', 'email', 'Your commission ask is answered', 'Hi {member},\n\n{actor} answered your ask for {rate} on {lead_name}’s project: {note}. See it: {link}\n\n{studio}'),
  T('commission_answered', 'whatsapp', '', '{actor} answered your commission ask on {lead_name}’s project: {link}'),
  T('commission_paid', 'email', '{amount} commission is paid to you', 'Hi {member},\n\n{actor} paid you {amount} commission for {lead_name}’s project. See it: {link}\n\n{studio}'),
  T('commission_paid', 'whatsapp', '', '{actor} paid you {amount} commission for {lead_name}’s project: {link}'),
  T('credit_issued', 'email', 'Credit note {credit_note} for {lead_name}', 'Hi {member},\n\n{actor} issued credit note {credit_note} ({amount}) on {lead_name}’s project: {note}. See it on Money: {link}\n\n{studio}'),
  T('credit_issued', 'whatsapp', '', '{actor} issued credit note {credit_note} ({amount}) on {lead_name}’s project: {link}'),
  T('xero_failed', 'email', 'Xero needs you', 'Hi {member},\n\nA push to Xero failed: {note}. Fix it and press Retry: {link}\n\n{studio}'),
  T('xero_failed', 'whatsapp', '', 'A push to Xero failed: {note} — {link}'),
  /* (gaps build H) (invented copy) */
  T('ticket_raised', 'email', '{lead_name} reported an issue', 'Hi {member},\n\n{lead_name} reported an issue on their portal: {ticket}.\n\n{comment}\n\nOpen the ticket to answer: {link}\n\n{studio}'),
  T('ticket_raised', 'whatsapp', '', '{lead_name} reported an issue: {ticket}. {link}'),
  T('ticket_client', 'email', '{lead_name} answered on {ticket}', 'Hi {member},\n\n{lead_name} answered on {ticket}: {comment}\n\nOpen the ticket: {link}\n\n{studio}'),
  T('ticket_client', 'whatsapp', '', '{lead_name} answered on {ticket}: {link}'),
  T('ticket_assigned', 'email', '{ticket} is yours', 'Hi {member},\n\n{actor} gave you the ticket {ticket} from {lead_name}. Open it: {link}\n\n{studio}'),
  T('ticket_assigned', 'whatsapp', '', '{actor} gave you the ticket {ticket}: {link}'),
  T('ticket_escalated', 'email', 'Escalated: {ticket}', 'Hi {member},\n\n{actor} escalated {lead_name}’s ticket {ticket} — {note}\n\nOpen it: {link}\n\n{studio}'),
  T('ticket_escalated', 'whatsapp', '', 'Escalated — {lead_name}’s ticket {ticket}: {note} {link}'),
  T('chat_message', 'email', 'A message from {lead_name}', 'Hi {member},\n\n{lead_name} sent a message: {comment}\n\nReply in Messages: {link}\n\n{studio}'),
  T('chat_message', 'whatsapp', '', '{lead_name} sent a message: {comment} {link}'),
  /* (gaps build J) (invented copy) */
  T('layout_viewed', 'email', '{lead_name} opened the 3D layout', 'Hi {member},\n\n{lead_name} opened the 3D layout “{layout}” you shared. Open it: {link}\n\n{studio}'),
  T('layout_viewed', 'whatsapp', '', '{lead_name} opened the 3D layout “{layout}”: {link}'),
  /* (parity map 2026-10-10) (invented copy) */
  T('schedule_shared', 'email', '{actor} shared the schedule with {lead_name}', 'Hi {member},\n\n{actor} shared the schedule for {lead_name}’s project with the client. Open it: {link}\n\n{studio}'),
  T('schedule_shared', 'whatsapp', '', '{actor} shared the schedule with {lead_name}: {link}'),
  T('invoice_sent', 'email', '{invoice} went to {lead_name}', 'Hi {member},\n\n{actor} sent {invoice} to {lead_name}. Open it: {link}\n\n{studio}'),
  T('invoice_sent', 'whatsapp', '', '{actor} sent {invoice} to {lead_name}: {link}'),
  T('invoice_reminded', 'email', '{invoice} is still unpaid after three reminders', 'Hi {member},\n\n{lead_name} has been reminded three times about {invoice} and it is still owed. A call may help: {link}\n\n{studio}'),
  T('invoice_reminded', 'whatsapp', '', '{invoice} for {lead_name} is still unpaid after three reminders: {link}'),
  T('po_delivery_late', 'email', 'The delivery on {po} is late', 'Hi {member},\n\nThe delivery on {po} for {lead_name}’s project was expected and is not marked delivered. Follow up: {link}\n\n{studio}'),
  T('po_delivery_late', 'whatsapp', '', 'The delivery on {po} for {lead_name} is late: {link}'),
  T('invite_requested', 'email', '{actor} asks to add {person} to the studio', 'Hi {member},\n\n{actor} gave a task to {person}, who isn’t in the studio yet, and asks you to add them. Add them: {link}\n\n{studio}'),
  T('invite_requested', 'whatsapp', '', '{actor} asks to add {person} to the studio: {link}'),
  T('message_failed', 'email', 'A message to {lead_name} could not be sent', 'Hi {member},\n\nA message to {lead_name} could not be sent after three tries. See Sent messages: {link}\n\n{studio}'),
  T('message_failed', 'whatsapp', '', 'A message to {lead_name} could not be sent: {link}'),
  T('send_held', 'email', 'A large send waits for your OK', 'Hi {member},\n\nOne action would message many people at once, so it is held until you send it: {link}\n\n{studio}'),
  T('send_held', 'whatsapp', '', 'A large send waits for your OK: {link}'),
  T('team_message', 'email', '{actor} in the team chat for {lead_name}', 'Hi {member},\n\n{actor} wrote in the team chat for {lead_name}: {link}\n\n{studio}'),
  T('team_message', 'whatsapp', '', '{actor} in the team chat for {lead_name}: {link}'),
  /* (pending modules S26) a teammate's message — the words stay in Messages; the email and the WhatsApp say who and open it (invented copy) */
  T('member_message', 'email', '{actor} sent you a message', 'Hi {member},\n\n{actor} wrote to you in Messages: {link}\n\n{studio}'),
  T('member_message', 'whatsapp', '', '{actor} wrote to you in Messages: {link}'),
  /* (pending modules S27) (invented copy) */
  T('hangout_registered', 'email', '{lead_name} booked a chat at the Hangout', 'Hi {member},\n\n{lead_name} booked a chat with {studio} at the Hangout. See who they are and when: {link}\n\n{studio}'),
  T('hangout_registered', 'whatsapp', '', '{lead_name} booked a chat with {studio} at the Hangout: {link}'),
  T('hangout_meeting_assigned', 'email', 'A Hangout chat with {lead_name}', 'Hi {member},\n\n{actor} gave you the chat with {lead_name} at the Hangout. See it: {link}\n\n{studio}'),
  T('hangout_meeting_assigned', 'whatsapp', '', '{actor} gave you the Hangout chat with {lead_name}: {link}'),
  /* (pending modules S09) (invented copy) */
  T('member_joined', 'email', '{actor} joined {studio}', 'Hi {member},\n\n{actor}, whom you invited, has come in for the first time. See the team: {link}\n\n{studio}'),
  T('member_joined', 'whatsapp', '', '{actor} joined {studio}: {link}'),
  /* (pending modules S23) (invented copy) */
  T('meeting_answered', 'email', '{lead_name} answered the meeting invitation', 'Hi {member},\n\n{lead_name} answered the invitation to your meeting. See it: {link}\n\n{studio}'),
  T('meeting_answered', 'whatsapp', '', '{lead_name} answered the meeting invitation: {link}'),
  /* (pending modules S37) Qanvast's answer — {note} carries what it said (invented copy) */
  T('listing_answered', 'email', 'Qanvast answered {studio}’s listing application', 'Hi {member},\n\n{note}\n\nSee your listing: {link}\n\n{studio}'),
  T('listing_answered', 'whatsapp', '', '{note} — {link}'),
]
export function parseTemplates(v: unknown): MessageTemplate[] {
  const list = Array.isArray(v) ? v : []
  return DEFAULT_TEMPLATES.map((d) => {
    const hit = list.find((x) => x && typeof x === 'object' && (x as MessageTemplate).event === d.event && (x as MessageTemplate).channel === d.channel) as Partial<MessageTemplate> | undefined
    return { ...d, subject: typeof hit?.subject === 'string' ? hit.subject.slice(0, 120) : d.subject, body: typeof hit?.body === 'string' ? hit.body.slice(0, 2000) : d.body }
  })
}
export const templateFor = (list: MessageTemplate[], event: EventKey, channel: 'email' | 'whatsapp') => list.find((t) => t.event === event && t.channel === channel) ?? DEFAULT_TEMPLATES.find((t) => t.event === event && t.channel === channel)!

/** The message with its fields filled — the preview and the platform's send use the same function. */
export function renderTemplate(text: string, fields: Record<string, string>): string {
  return text.replace(/\{[a-z_]+\}/g, (k) => fields[k] ?? k)
}
export const SAMPLE_FIELDS: Record<string, string> = { '{lead_name}': 'Farah Ahmad', '{studio}': 'Demo Studio', '{member}': 'Sarah', '{actor}': 'Dane', '{source}': 'Website', '{quote_number}': 'OM-10008', '{link}': 'https://app.openmaison.sg/leads/farah-ahmad', '{stage}': 'Met', '{task}': 'Follow up with Farah Ahmad', '{when}': 'in 30 minutes', '{item}': 'Skirting, PVC', '{credits}': '1,000', '{amount}': 'S$20.00', '{comment}': 'Can we move the site visit to Friday?', '{file}': 'Kitchen layout.pdf', '{update}': 'Kitchen cabinets are in', '{note}': 'Add a close-up of the laminate', '{choice}': 'Paint colours — Sage Whisper', '{milestone}': 'Electrical & plumbing', '{invoice}': 'Mid-project', '{plan}': 'Floor plan — Blk 456', '{ticket}': 'T-2026-004 · Water stain under the sink', '{layout}': 'HDB 4-Room — furnished' }

/**
 * (simplify round 2 · P2 §6.7) An approval that still waits on the member reading the bell, answered in its row: Approve · Send back, each the
 * record's own server action with its Undo and its refusal. `kind` names the record; `id` is what the action takes (the update, the PO, the expense,
 * the invoice, the milestone with a Done waiting, the more-time ask, the share ask, the project whose handover waits). `door`: an approval that
 * SENDS something through a dialog the approver must see — a PO to its vendor on WhatsApp, an invoice to the client — opens that send where it
 * lives (Money's `&do=approve`) instead of answering in place. `title` · `by` · `client` · `end` are the words the Send back dialog names.
 * Absent on every row this member may not answer, or whose record no longer waits — that row stays a link.
 */
export type FeedActKind = 'update' | 'po' | 'expense' | 'invoice' | 'done' | 'more_time' | 'share' | 'handover'
export type FeedAct = { kind: FeedActKind; id: string; projectId: string | null; door?: string; title: string; by: string | null; client: string | null
  /** a share ask: what it asked to share (Approve shares exactly that) and its note */ only?: string[]; note?: string | null
  /** more time: the last day it keeps when declined (schedule-model's day number, `dayOf`) */ end?: number }
/** A feed row — a stored notification or a derived one (a due follow-up). */
export type FeedRow = { id: string; kind: EventKey; title: string; body: string | null; href: string | null; at: number; readAt: number | null; channels: Channel[]; derived: boolean
  /** (S42 audit A-09) a derived reminder's own fields for the studio's message wording ({task}, {when}, {milestone} …) — its WhatsApp and email
      fill the event's template with them instead of falling back to the bell's words */ fields?: Record<string, string>
  /** (pending modules S18) a reminder ahead of its work: when the work itself is due (ms) — a task due soon, or a project's task due in days */ due?: number
  /** (pending modules S18) its email waits for the member's daily summary (they take their emails that way) — the bell says so, never "also by email" */ summary?: boolean
  /** (simplify round 2 · P2 §6.7) the approval this member answers in the row */ act?: FeedAct
  /** (pending modules S41b-4) the Owner's live upgrade offer: its moment (1.0's T-number) and its one way on — Plans, or Buy AI credits */
  offer?: { trigger: string; primary: 'plans' | 'topup'; label: string } }
