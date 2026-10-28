import type { Quote } from '@/lib/db/schema'
import { displayDate, displayDateLong, money, parseInputDate, startOfDay } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import type { QuoteApproval } from '@/lib/settings/types'   // types only — safe to import from a client component

/* Lead Details › Quotes (910-36240) — pure model shared by the table, the status menu and the Filters modal. */

/** Status menu order (910:36673) — five statuses, verbatim. */
/* (REG-587) Confirmed = the client said yes on the confirmation link, before the T&Cs and the signature. */
export const QUOTE_STATUSES = ['Draft', 'Sent for Approval', 'Approved', 'Sent to Client', 'Confirmed', 'Signed'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
export const isQuoteStatus = (s: string): s is QuoteStatus => (QUOTE_STATUSES as readonly string[]).includes(s)
/** (the calm UI build 2026-10-27 — T-01, audit 4-04) What a status READS as on screen: one set, sentence case — ONE map, lib/quotes/status-words.ts
 *  (it imports only this file's type, so there is no cycle), re-exported here for this module's readers. Display only — the stored value, the
 *  status menu's keys, filters, URLs and every rule keep the stored words above. */
export { QUOTE_STATUS_LABEL, quoteStatusLabel } from '@/lib/quotes/status-words'
/** (the calm UI build 2026-10-27 — audit 2-25 · 4-15, W-053) A quote's stored visibility ('Private' · 'Shared') in plain words: who can see it. */
export const quoteVisibilityLabel = (v: string, clientFirst: string | null): string =>
  v === 'Shared' ? `${clientFirst || 'The client'} can see it` : v === 'Private' ? 'Only your studio can see it' : v

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
  { key: 'waiting', label: (n) => `With client · ${n}`, icon: 'hourglass_top' },   // (the calm UI build 2026-10-27 — 4-04) the status's own words
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

/** Overdue = a due date before today on a quote the client has not decided on yet (mirrors tasks: open + due before today). (the Dashboard
    redesigned, 2026-10-26 — P-14) Confirmed settles it as Signed does: the due date's follow-up closes on either (lib/quotes/follow-up.ts), so
    the Due cell never reads late on a quote whose follow-up is done. */
export const isQuoteOverdue = (q: Pick<Quote, 'dueAt' | 'status'>, now: number) =>
  !!q.dueAt && q.status !== 'Signed' && q.status !== 'Confirmed' && q.dueAt.getTime() < startOfDay(new Date(now))

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
      q.dueAt ? displayDateLong(q.dueAt) : null,   // (Dane UAT 5.13) Due and Valid until print their day
      displayDate(q.createdAt),
      (() => { const d = sentToClientOf(q); return d ? displayDate(d) : null })(),   // (UX audit Q5) the "Sent to client" column's date
      q.validUntil ? displayDateLong(q.validUntil) : null,   // (Q5) the Valid until column
      displayDate(q.updatedAt ?? q.createdAt),
      q.approvedAt ? displayDate(q.approvedAt) : null,
    ],
  }))
}

/* ── (pending modules S04 — card held:quotes, "Sort on the Quotes table heads (Valid until sorts) — Coming soon · his call (REG-468) · revisit")
   a column's own order — the Contracts heads' model (S03, the projects table's): a head cycles A→Z → Z→A → off, and ONE sort holds at a time —
   a head's sort sets Filters' Sort back to Newest first, an order picked in Filters takes the head's off. Title and Creator stay unsorted
   (REG-468: names); Client too, as Contracts' Lead. Status reads the journey's order; an empty cell (no date) always last. ── */
export const QUOTE_SORT_KEYS = ['status', 'total', 'due', 'created', 'sent', 'valid', 'updated', 'approval'] as const
export type QuoteSortKey = (typeof QUOTE_SORT_KEYS)[number]
export type QuoteHeadSort = { key: QuoteSortKey; dir: 'asc' | 'desc' } | null
export const isQuoteSortKey = (k: string): k is QuoteSortKey => (QUOTE_SORT_KEYS as readonly string[]).includes(k)
const statusRank = (s: string) => { const i = (QUOTE_STATUSES as readonly string[]).indexOf(s); return i < 0 ? QUOTE_STATUSES.length : i }
function headValue(q: QuoteListRow, key: QuoteSortKey): number | null {
  if (key === 'status') return statusRank(q.status)
  if (key === 'total') return q.amountMinor
  if (key === 'due') return q.dueAt?.getTime() ?? null
  if (key === 'created') return q.createdAt.getTime()
  if (key === 'sent') return sentToClientOf(q)?.getTime() ?? null
  if (key === 'valid') return q.validUntil?.getTime() ?? null
  if (key === 'updated') return (q.updatedAt ?? q.createdAt).getTime()
  return q.approvedAt?.getTime() ?? null
}
/** Rows in the head's order; ties keep the order they came in. */
export function sortQuotesByHead<T extends QuoteListRow>(rows: T[], sort: QuoteHeadSort): T[] {
  if (!sort) return rows
  const sign = sort.dir === 'asc' ? 1 : -1
  return rows.map((r, i) => ({ r, i, v: headValue(r, sort.key) }))
    .sort((a, b) => (a.v === null && b.v === null ? a.i - b.i : a.v === null ? 1 : b.v === null ? -1 : (a.v - b.v) * sign || a.i - b.i))
    .map((x) => x.r)
}
export const nextQuoteHeadSort = (s: QuoteHeadSort, key: QuoteSortKey): QuoteHeadSort => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null)
/** How a head says its order — "soonest first" for the days ahead, "lowest first" for the total, the journey for the status. */
export function headOrderWords(key: QuoteSortKey, dir: 'asc' | 'desc'): string {
  if (key === 'total') return dir === 'asc' ? 'lowest first' : 'highest first'
  if (key === 'status') return dir === 'asc' ? 'Draft first' : 'Signed first'
  if (key === 'due' || key === 'valid') return dir === 'asc' ? 'soonest first' : 'latest first'
  return dir === 'asc' ? 'oldest first' : 'newest first'
}

/** (pending modules S04 — 1.0's view count) When the client last opened the quote on one of its links, since it went to them — the lists'
    "Viewed {date}" and the editor's "opened …". An open before the latest send (a revision sent again) doesn't count; null = not since. */
export function viewedSince(q: Pick<QuoteListRow, 'status' | 'sentAt' | 'clientSentAt' | 'clientLastViewedAt'> & { sentToClientAt?: Date | null }): Date | null {
  if (!q.clientLastViewedAt) return null
  const sent = sentToClientOf(q)
  return !sent || q.clientLastViewedAt.getTime() >= sent.getTime() ? q.clientLastViewedAt : null
}
