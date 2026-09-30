import type { Quote } from '@/lib/db/schema'
import { displayDate, money, parseInputDate, startOfDay } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import type { QuoteApproval } from '@/lib/settings/types'   // types only — safe to import from a client component

/* Lead Details › Quotes (910-36240) — pure model shared by the table, the status menu and the Filters modal. */

/** Status menu order (910:36673) — five statuses, verbatim. */
/* (REG-587) Confirmed = the client said yes on the confirmation link, before the T&Cs and the signature. */
export const QUOTE_STATUSES = ['Draft', 'Sent for Approval', 'Approved', 'Sent to Client', 'Confirmed', 'Signed'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
export const isQuoteStatus = (s: string): s is QuoteStatus => (QUOTE_STATUSES as readonly string[]).includes(s)

/**
 * The two statuses that exist only in a studio that reviews quotes internally (Settings › Leads › Quote approval).
 * Everything that lists quote statuses — the row menu, the Filters modal, the Overview widget's track — asks
 * `quoteStatuses()` rather than mapping QUOTE_STATUSES, so one setting moves them together (user 2026-08-30).
 */
export const APPROVAL_ONLY_STATUSES: readonly QuoteStatus[] = ['Sent for Approval', 'Approved']

/** The studio's quote lifecycle, in order. */
export function quoteStatuses(approval: QuoteApproval): readonly QuoteStatus[] {
  return approval === 'required' ? QUOTE_STATUSES : QUOTE_STATUSES.filter((s) => !APPROVAL_ONLY_STATUSES.includes(s))
}

/**
 * Where a quote sits on the studio's track. A quote can hold a status the studio no longer uses — it was approved and
 * then approval was switched off — so it lands on the last step it has actually passed, never back at Draft.
 */
export function quoteStepIndex(status: string, approval: QuoteApproval): number {
  const steps = quoteStatuses(approval)
  const reached = QUOTE_STATUSES.indexOf(status as QuoteStatus)
  if (reached < 0) return 0
  let idx = 0
  steps.forEach((s, i) => { if (QUOTE_STATUSES.indexOf(s) <= reached) idx = i })
  return idx
}

/** Filters modal (910:36338): Sort · Date · Status · Due — and (UX audit Q5) Valid until. */
/** (Q5) `valid` = Valid until, soonest first (a quote with none last). */
export type QuoteSort = 'newest' | 'oldest' | 'valid'
export type QuoteDatePreset = '' | 'today' | 'last7' | 'last30' | 'custom'
export type QuoteDue = 'all' | 'overdue' | 'upcoming'
/** (Q5) The quote's Valid until: this week (today and the six days after) · passed (before today). */
export type QuoteValid = 'all' | 'week' | 'passed'
export type QuoteFilters = {
  sort: QuoteSort
  date: QuoteDatePreset
  from: string             // d/m/yyyy (DateField value — never typed, REG-119); only read when date === 'custom'
  to: string
  status: QuoteStatus[]
  due: QuoteDue
  valid: QuoteValid
}
export const EMPTY_QUOTE_FILTERS: QuoteFilters = { sort: 'newest', date: '', from: '', to: '', status: [], due: 'all', valid: 'all' }

/** Which rail groups carry a selection — rail dots + toolbar badge (the tasks/listing pattern). */
export function activeQuoteGroups(f: QuoteFilters): { sort: boolean; date: boolean; status: boolean; due: boolean; valid: boolean } {
  return {
    sort: f.sort !== 'newest',
    date: f.date === 'custom' ? !!(parseInputDate(f.from) || parseInputDate(f.to)) : f.date !== '',
    status: f.status.length > 0,
    due: f.due !== 'all',
    valid: f.valid !== 'all',
  }
}
export const activeQuoteFilterCount = (f: QuoteFilters) => Object.values(activeQuoteGroups(f)).filter(Boolean).length

/* ── (UX audit Q4 · Q5) What needs the studio today: the to-do chips over the Quotes lists ── */

/** A Quotes row: the quote, and — worked out by the loaders — the day it went to the client (the "Sent to client" column). */
export type QuoteListRow = Quote & { sentToClientAt?: Date | null }
/**
 * (Q5) The day the quote went to the client: `client_sent_at` (REG-624), else — a quote the client confirmed or signed before that stamp
 * existed — its first send; a loader may know more (an Approved quote its lead's Quote Sent step sent, lib/leads/quotes.ts).
 */
export function sentToClientOf(q: Pick<QuoteListRow, 'status' | 'sentAt' | 'clientSentAt'> & { sentToClientAt?: Date | null }): Date | null {
  if (q.sentToClientAt !== undefined) return q.sentToClientAt
  return q.clientSentAt ?? (q.status === 'Confirmed' || q.status === 'Signed' ? q.sentAt : null)
}
/** (Q5) Out with the client and not yet answered: it went to them, and it is neither confirmed nor signed. */
export const waitingOnClient = (q: QuoteListRow) => (q.status === 'Sent to Client' || q.status === 'Approved') && !!sentToClientOf(q)
const DAY = 86_400_000
/** (Q5) Its Valid until falls today or in the six days after. */
export const validThisWeek = (q: Pick<Quote, 'validUntil'>, now: number) => { if (!q.validUntil) return false; const t = q.validUntil.getTime(), today = startOfDay(new Date(now)); return t >= today && t < today + 7 * DAY }
/** (Q5) Its Valid until is before today. */
export const validPassed = (q: Pick<Quote, 'validUntil'>, now: number) => !!q.validUntil && q.validUntil.getTime() < startOfDay(new Date(now))
/** (Q5) Still open with the client (not confirmed, not signed) and its price stops standing this week. */
export const expiringThisWeek = (q: QuoteListRow, now: number) => q.status !== 'Confirmed' && q.status !== 'Signed' && validThisWeek(q, now)
/** (Q5) Out with the client past its Valid until — the row's "Expired" mark (REG-625's, now for every quote the client holds). */
export const clientValidityPassed = (q: QuoteListRow, now: number) => waitingOnClient(q) && validPassed(q, now)

/** (Q4 · Q5) The to-do chips: each narrows the list to what waits on it; a second press lets go (REG-666). */
export type QuoteQuick = '' | 'approval' | 'waiting' | 'expiring'
export const QUOTE_TODOS: { key: Exclude<QuoteQuick, ''>; label: (n: number) => string; icon: string; approversOnly?: boolean }[] = [
  { key: 'approval', label: (n) => `Waiting for my approval · ${n}`, icon: 'approval', approversOnly: true },
  { key: 'waiting', label: (n) => `Waiting on client · ${n}`, icon: 'hourglass_top' },
  { key: 'expiring', label: (n) => `Expiring this week · ${n}`, icon: 'event' },
]
/** (Q4 · Q5) How many wait on each to-do — the approvals only for a member who approves, while the studio asks for approval. */
export function quoteTodoCounts(quotes: QuoteListRow[], now: number, approves: boolean): Record<Exclude<QuoteQuick, ''>, number> {
  return {
    approval: approves ? quotes.filter((q) => q.status === 'Sent for Approval').length : 0,
    waiting: quotes.filter(waitingOnClient).length,
    expiring: quotes.filter((q) => expiringThisWeek(q, now)).length,
  }
}
export function quickMatch(q: QuoteListRow, quick: QuoteQuick, now: number): boolean {
  if (quick === 'approval') return q.status === 'Sent for Approval'
  if (quick === 'waiting') return waitingOnClient(q)
  if (quick === 'expiring') return expiringThisWeek(q, now)
  return true
}

/** Overdue = a due date before today on a quote that is not yet Signed (mirrors tasks: open + due before today). */
export const isQuoteOverdue = (q: Pick<Quote, 'dueAt' | 'status'>, now: number) =>
  !!q.dueAt && q.status !== 'Signed' && q.dueAt.getTime() < startOfDay(new Date(now))

/**
 * Filter + sort. The Date pane bounds the quote's Created date (the first date column; the mock names the pane "Dates").
 * Today / Last 7 days / Last 30 days are day-granular windows ending today; Custom uses the From / To fields.
 */
export function applyQuoteFilters<T extends QuoteListRow>(quotes: T[], f: QuoteFilters, now: number): T[] {
  let out = quotes
  const day = 86_400_000
  const today = startOfDay(new Date(now))
  if (f.date && f.date !== 'custom') {
    const from = f.date === 'today' ? today : f.date === 'last7' ? today - 6 * day : today - 29 * day
    out = out.filter((q) => q.createdAt.getTime() >= from && q.createdAt.getTime() < today + day)
  } else if (f.date === 'custom') {
    const a = parseInputDate(f.from), b = parseInputDate(f.to)
    if (a || b) {
      const from = a ? a.getTime() : null
      const to = b ? b.getTime() + day : null
      out = out.filter((q) => { const c = q.createdAt.getTime(); return (from === null || c >= from) && (to === null || c < to) })
    }
  }
  if (f.status.length) out = out.filter((q) => (f.status as readonly string[]).includes(q.status))
  if (f.due === 'overdue') out = out.filter((q) => isQuoteOverdue(q, now))
  if (f.due === 'upcoming') out = out.filter((q) => !!q.dueAt && q.dueAt.getTime() >= today)
  if (f.valid === 'week') out = out.filter((q) => validThisWeek(q, now))   // (UX audit Q5)
  if (f.valid === 'passed') out = out.filter((q) => validPassed(q, now))
  const sorted = [...out]
  if (f.sort === 'newest') sorted.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())
  else if (f.sort === 'valid') sorted.sort((x, y) => (x.validUntil?.getTime() ?? Infinity) - (y.validUntil?.getTime() ?? Infinity) || y.createdAt.getTime() - x.createdAt.getTime())
  else sorted.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
  return sorted
}

/**
 * Search matches every piece of text the Quotes row prints (REG-274, user 2026-09-01 "look at the other pages"):
 * title · number ("OM-10001") · visibility ("Private" / "Shared") · status label · total ("S$70,000", the exact
 * string the Total cell prints, so "70,000" and "S$70" both land) · Due · Created · Sent · Updated · Approval Date.
 * Dates are matched as `displayDate` renders them ("17 Jul ’26"), never as raw timestamps, and an empty date column
 * (the row's "-") contributes nothing. Approval Date is safe to match even though its column is conditional: the
 * table shows it whenever any visible quote carries `approvedAt` (quotes-table.tsx `showApproval`), so a quote found
 * by its approval date always lands in a table that prints the column.
 * Title + number were the only two fields before, so a quote could not be found by its status or any of its dates.
 */
export function searchQuotes<T extends QuoteListRow>(quotes: T[], query: string): T[] {
  return filterByQuery(quotes, query, (q) => ({
    fields: [
      q.title,
      q.number,
      q.visibility,
      q.status,
      `S$${money(q.amountMinor)}`,
      q.dueAt ? displayDate(q.dueAt) : null,
      displayDate(q.createdAt),
      (() => { const d = sentToClientOf(q); return d ? displayDate(d) : null })(),   // (UX audit Q5) the "Sent to client" column's date
      q.validUntil ? displayDate(q.validUntil) : null,   // (Q5) the Valid until column
      displayDate(q.updatedAt ?? q.createdAt),
      q.approvedAt ? displayDate(q.approvedAt) : null,
    ],
  }))
}
