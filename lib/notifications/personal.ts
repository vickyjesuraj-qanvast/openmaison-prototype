/*
 * (pending modules S18 — card held:notifications; Leads Q-42 · Q-43 opened as recommended, his "build all of them" 2026-10-11) What reaches ONE
 * member, and how — pure and client-safe. The studio still chooses which notices go out at all and on which channels (Settings › Notifications,
 * lib/notifications/model.ts `NotificationRules`); here each member chooses for themselves, on Your profile › Your notifications:
 *  · **a personal mute** (1.0's "who hears each notice" was the studio's, per role and category — the card: "revisit as a personal mute only"):
 *    a muted event never reaches them — no bell row, no email, no WhatsApp, no line in their summary; everyone else still hears it.
 *  · **their emails as one daily summary** (1.0's digest mode, `notification_preferences.digest_mode` + its 8 AM cron): one email at 8 AM with
 *    what came in since the last one and what is due — the bell's own rows (lib/notifications/summary.ts) — while the urgent ones (1.0's
 *    `isCritical`, URGENT_EVENTS below) still come at once.
 * Stored on the member (`members.notice_email` · `notice_muted`); a member who never opens the card hears exactly what they heard before.
 */
import type { EventKey } from '@/lib/notifications/model'
import { statusWords } from '@/lib/notifications/outbox'
import { displayDateTime } from '@/lib/format'

/** How a member's emails come — each with its notice (the default, `null` on the record), or one summary a day. */
export type EmailMode = 'each' | 'daily'
export const EMAIL_MODES: { value: EmailMode; label: string }[] = [{ value: 'each', label: 'As they happen' }, { value: 'daily', label: 'A daily summary' }]
export const emailModeOf = (v: unknown): EmailMode => (v === 'daily' ? 'daily' : 'each')

/** The hour (the studio's local time) the daily summary goes — 1.0's cron sent its digest at 8 AM. */
export const SUMMARY_HOUR = 8

/** The events a member's mute keeps, as stored: known keys only, once each. */
export function parseMuted(v: unknown, known: readonly string[]): EventKey[] {
  let list: unknown = v
  if (typeof v === 'string') { try { list = JSON.parse(v) } catch { list = [] } }
  if (!Array.isArray(list)) return []
  const ok = new Set(known)
  return [...new Set(list.filter((x): x is EventKey => typeof x === 'string' && ok.has(x)))]
}

/**
 * The emails that still come at once while a member takes the daily summary — 1.0's `isCritical` events (`lead.captured`,
 * `quote.signed_by_client`, `quote.signature_requested`, the client's answers on a variation order, `invoice.sent` · `.overdue` ·
 * `.pending_approval`, the vendor's answer, an expired Xero link, the client's "not right" on a stage, a selection answered, `task.assigned` ·
 * `.due_reminder`, the tickets, a floor plan approved) and 2.0's events of the same kind: a client's answer, an approval that holds work up,
 * the AI tools stopped, a message that couldn't go.
 */
export const URGENT_EVENTS: ReadonlySet<EventKey> = new Set<EventKey>([
  'new_lead', 'quote_signed', 'contract_sent', 'quote_confirmed', 'quote_change_asked', 'quote_approval',
  'variation_approved', 'variation_declined', 'invoice_sent', 'payment_overdue', 'invoice_review', 'po_review', 'bill_review', 'po_answered', 'xero_failed',
  'stage_changes', 'choice_made', 'choice_declined', 'update_review', 'handover_review', 'schedule_ask',
  'task_assigned', 'task_due', 'task_due_soon', 'ticket_raised', 'ticket_client', 'ticket_assigned', 'ticket_escalated', 'chat_message', 'floor_plan_confirmed',
  'credits_out', 'payment_failed', 'message_failed', 'send_held',
])
/** Whether a member's email for this event waits for their summary. */
export const waitsForSummary = (mode: EmailMode, kind: string): boolean => mode === 'daily' && !URGENT_EVENTS.has(kind as EventKey)

/* ── the list a member mutes from: by area, and only what can reach them ─────────────────────────────────────────────────────────── */

export type NoticeArea = 'leads' | 'quotes' | 'tasks' | 'projects' | 'clients' | 'money' | 'credits' | 'studio'
/** (invented copy) the areas Your notifications groups the events under */
export const NOTICE_AREAS: { key: NoticeArea; label: string }[] = [
  { key: 'leads', label: 'Leads' }, { key: 'quotes', label: 'Quotes and contracts' }, { key: 'tasks', label: 'Tasks and comments' },
  { key: 'projects', label: 'Projects' }, { key: 'clients', label: 'Clients' }, { key: 'money', label: 'Money' },
  { key: 'credits', label: 'AI credits and the plan' }, { key: 'studio', label: 'The studio' },
]

/**
 * Who an event can ever reach — read off the recipients each `notify` call names (lib/notifications/queries.ts `studioRunnerIds` ·
 * `moneyRunnerIds` · approvers · a lead's or project's members · one person): `owner` the Owners · `runners` Owners and Admins · `approvers`
 * those and the backup approver (REG-590) · `reviewers` those and the members Settings › Projects names for updates · `money` Owners, Admins
 * and Accounting · `team` anyone who can be on a lead or a project (never Accounting) · `anyone` one named person, whatever their role.
 */
export type Audience = 'owner' | 'runners' | 'approvers' | 'reviewers' | 'money' | 'team' | 'anyone'
const A = (area: NoticeArea, audience: Audience) => ({ area, audience })
/** Every event's area and audience — a Record, so a new event can't be left out. */
export const EVENT_PLACE: Record<EventKey, { area: NoticeArea; audience: Audience }> = {
  new_lead: A('leads', 'runners'), assigned: A('leads', 'team'), untouched: A('leads', 'team'), stage_changed: A('leads', 'team'), hold_due: A('leads', 'team'),
  meeting_answered: A('leads', 'team'),
  hangout_registered: A('leads', 'team'), hangout_meeting_assigned: A('leads', 'team'),   // (pending modules S27) the designer who meets them (and the runners)   // (pending modules S23, joined at the lanes' merge) a client answers a meeting's invitation — the meeting's people
  quote_approval: A('quotes', 'approvers'), quote_approved: A('quotes', 'team'), quote_changes: A('quotes', 'team'), quote_confirmed: A('quotes', 'team'),
  quote_change_asked: A('quotes', 'team'), contract_sent: A('quotes', 'team'), quote_signed: A('quotes', 'team'),
  price_book_proposed: A('quotes', 'runners'), price_book_answered: A('quotes', 'team'),
  task_due: A('tasks', 'anyone'), task_assigned: A('tasks', 'anyone'), task_due_soon: A('tasks', 'anyone'), task_comment: A('tasks', 'anyone'), file_comment: A('tasks', 'team'),
  project_created: A('projects', 'team'), update_review: A('projects', 'reviewers'), update_approved: A('projects', 'team'), update_sent_back: A('projects', 'team'),
  update_published: A('projects', 'team'), milestone_due: A('projects', 'team'), milestone_late: A('projects', 'team'),
  handover_review: A('projects', 'runners'), handover_approved: A('projects', 'team'), handover_sent_back: A('projects', 'team'),
  project_completed: A('projects', 'team'), project_reopened: A('projects', 'team'), project_hold_due: A('projects', 'team'),
  schedule_ask: A('projects', 'runners'), schedule_answer: A('projects', 'team'), schedule_shared: A('projects', 'team'), team_message: A('projects', 'team'),
  question_answered: A('clients', 'team'), render_feedback: A('clients', 'team'), portal_opened: A('clients', 'team'), choice_made: A('clients', 'team'),
  choice_declined: A('clients', 'team'), stage_confirmed: A('clients', 'team'), stage_changes: A('clients', 'team'), floor_plan_client: A('clients', 'team'),
  floor_plan_confirmed: A('clients', 'team'), layout_viewed: A('clients', 'team'), chat_message: A('clients', 'team'),
  ticket_raised: A('clients', 'team'), ticket_client: A('clients', 'team'), ticket_assigned: A('clients', 'team'), ticket_escalated: A('clients', 'runners'),
  invoice_review: A('money', 'runners'), invoice_sent_back: A('money', 'anyone'), invoice_approved: A('money', 'anyone'), invoice_ready: A('money', 'team'),
  invoice_sent: A('money', 'money'), invoice_reminded: A('money', 'money'), variation_approved: A('money', 'team'), variation_declined: A('money', 'team'),
  variation_reopened: A('money', 'team'), payment_to_confirm: A('money', 'anyone'), payment_confirmed: A('money', 'team'), payment_not_received: A('money', 'team'),
  payment_reversed: A('money', 'team'), payment_overdue: A('money', 'anyone'), credit_issued: A('money', 'team'),
  po_review: A('money', 'runners'), po_sent_back: A('money', 'anyone'), po_approved: A('money', 'anyone'), po_answered: A('money', 'anyone'),
  po_delivery_late: A('money', 'anyone'), expense_review: A('money', 'runners'), expense_answered: A('money', 'anyone'), claim_paid: A('money', 'anyone'),
  bill_review: A('money', 'runners'), bill_approved: A('money', 'anyone'),   // (S44R, C8) a bill's OK
  bill_due: A('money', 'money'), commission_asked: A('money', 'runners'), commission_answered: A('money', 'team'), commission_paid: A('money', 'team'),
  xero_failed: A('money', 'money'),
  credits_low: A('credits', 'runners'), credits_out: A('credits', 'runners'), credits_renewed: A('credits', 'runners'), credit_request: A('credits', 'owner'),
  credit_request_answered: A('credits', 'anyone'), credit_amount_reached: A('credits', 'owner'), payment_failed: A('credits', 'owner'), credit_receipt: A('credits', 'owner'),
  member_message: A('studio', 'team'),   // (pending modules S26) a teammate's message to you, a group you're in, the studio's room — never Accounting (no Messages)
  member_joined: A('studio', 'runners'), invite_requested: A('studio', 'runners'), message_failed: A('studio', 'runners'), send_held: A('studio', 'owner'),
  listing_answered: A('studio', 'runners'),   // (pending modules S37) Qanvast's answer to the studio's listing application
  upgrade_offer: A('credits', 'owner'),   // (pending modules S41b-4) the Free plan's upgrade offer — the Owner, who buys (1.0's purchaser)
}

/** Who is reading Your notifications — their role, and the two places a role alone doesn't say (the backup approver, an update reviewer). */
export type NoticeViewer = { role: string; approver: boolean; reviewer: boolean }
/** Whether an event can ever reach this member — the list they mute from shows only those. */
export function mayReach(kind: EventKey, v: NoticeViewer): boolean {
  const runs = v.role === 'Owner' || v.role === 'Admin'
  /* (S44O — call C6) Marketing, the lead desk: a new lead, the leads' own notices and a task of theirs — never a quote's, a project's, a client
     portal's, the books' or a team conversation (no Messages) */
  if (v.role === 'Marketing') return kind === 'new_lead' || (EVENT_PLACE[kind]?.area === 'leads' && EVENT_PLACE[kind]?.audience === 'team') || (EVENT_PLACE[kind]?.area === 'tasks' && EVENT_PLACE[kind]?.audience === 'anyone')
  switch (EVENT_PLACE[kind]?.audience ?? 'anyone') {
    case 'owner': return v.role === 'Owner'
    case 'runners': return runs
    case 'approvers': return runs || v.approver
    case 'reviewers': return runs || v.reviewer
    case 'money': return runs || v.role === 'Accounting'
    case 'team': return v.role !== 'Accounting'
    default: return true
  }
}

/* ── the words Your notifications says — the card and its ghost read the same ones (invented copy) ──────────────────────────────── */

export const NOTICES_CARD = {
  title: 'Your notifications',
  help: 'What reaches you, and how. Which notices go out at all is the studio’s choice, in Settings › Notifications.',
  /** Accounting opens Settings › Finance alone (S06) — the sentence without the page they can't open */
  helpBooks: 'What reaches you, and how. Which notices go out at all is the studio’s choice — its Owners and Admins set it.',
  emails: 'Emails',
  muted: 'Muted',
  choose: 'Choose what reaches you',
} as const
export const EMAIL_MODE_HELP: Record<EmailMode, string> = {
  each: 'Each email goes out with its notice in the bell.',
  daily: 'One email at 8 AM with what came in since the last one and what is due. The urgent ones — a client’s answer or signature, a task for you, an approval waiting — still come at once.',
}
export const NO_EMAIL_LINE = 'Add your email in Your details first — the summary goes there.'
export const NOTHING_MUTED = 'Nothing muted — every notice the studio sends you reaches you.'
/** "2 muted: A lead’s or project’s stage changes and Someone comments on a task." — past three, the first three "and 4 more". */
export function mutedLine(labels: string[]): string {
  if (!labels.length) return NOTHING_MUTED
  const named = labels.length > 3 ? [...labels.slice(0, 3), `${labels.length - 3} more`] : labels
  const list = named.length <= 1 ? named.join('') : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
  return `${labels.length} muted: ${list}.`
}
export const MUTE_DIALOG = {
  title: 'What reaches you',
  subtitle: 'Switch a notice off and it stops for you alone — no bell, no email, no WhatsApp. Everyone else still hears it.',
  studioOff: 'Off for the whole studio — Settings › Notifications',
} as const
/** When the next summary goes — "today at 8 AM" before 8, else "tomorrow at 8 AM" (today's went, or had nothing to say, or the choice was made
    after 8 — its first one waits for the next morning). */
export function nextSummaryWords(now: number): string {
  const d = new Date(now)
  return d.getHours() < SUMMARY_HOUR ? 'today at 8 AM' : 'tomorrow at 8 AM'
}
/** What a summary's subject says it holds — "3 notices, 2 due" (lib/notifications/summary.ts `composeSummary` writes it after the last dash). */
export const summaryCounts = (subject: string | null | undefined) => (subject ? subject.split(' — ').pop() ?? '' : '')
/** A summary that didn't simply go — "No email address", "Paused by OpenMaison …"; null when it was sent. */
export const summaryWent = (s: { status: string; sendAfter: number | null }): string | null => (s.status === 'sent' ? null : statusWords({ status: s.status as 'sent', channel: 'email', sendAfter: s.sendAfter }))
/** The card's line under A daily summary — "Last one Mon, 12 Oct ’26 · 9:14 AM — 3 notices, 2 due. The next goes tomorrow at 8 AM." · "Your
    first summary goes today at 8 AM." (the card and its ghost) */
export function summaryLine(last: { at: number; status: string; subject: string | null; sendAfter: number | null } | null, now: number): string {
  return last ? `Last one ${displayDateTime(new Date(last.at))} — ${summaryWent(last) ?? summaryCounts(last.subject)}. The next goes ${nextSummaryWords(now)}.` : `Your first summary goes ${nextSummaryWords(now)}.`
}
