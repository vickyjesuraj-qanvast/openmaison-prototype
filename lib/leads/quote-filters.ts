import type { Quote } from '@/lib/db/schema'
import { parseInputDate, startOfDay } from '@/lib/format'
import type { QuoteApproval } from '@/lib/settings/types'   // types only — safe to import from a client component

/* Lead Details › Quotes (910-36240) — pure model shared by the table, the status menu and the Filters modal. */

/** Status menu order (910:36673) — five statuses, verbatim. */
export const QUOTE_STATUSES = ['Draft', 'Sent for Approval', 'Approved', 'Sent to Client', 'Signed'] as const
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

/** Filters modal (910:36338): Sort · Date · Status · Due. */
export type QuoteSort = 'newest' | 'oldest'
export type QuoteDatePreset = '' | 'today' | 'last7' | 'last30' | 'custom'
export type QuoteDue = 'all' | 'overdue' | 'upcoming'
export type QuoteFilters = {
  sort: QuoteSort
  date: QuoteDatePreset
  from: string             // d/m/yyyy (DateField value — never typed, REG-119); only read when date === 'custom'
  to: string
  status: QuoteStatus[]
  due: QuoteDue
}
export const EMPTY_QUOTE_FILTERS: QuoteFilters = { sort: 'newest', date: '', from: '', to: '', status: [], due: 'all' }

/** Which rail groups carry a selection — rail dots + toolbar badge (the tasks/listing pattern). */
export function activeQuoteGroups(f: QuoteFilters): { sort: boolean; date: boolean; status: boolean; due: boolean } {
  return {
    sort: f.sort !== 'newest',
    date: f.date === 'custom' ? !!(parseInputDate(f.from) || parseInputDate(f.to)) : f.date !== '',
    status: f.status.length > 0,
    due: f.due !== 'all',
  }
}
export const activeQuoteFilterCount = (f: QuoteFilters) => Object.values(activeQuoteGroups(f)).filter(Boolean).length

/** Overdue = a due date before today on a quote that is not yet Signed (mirrors tasks: open + due before today). */
export const isQuoteOverdue = (q: Pick<Quote, 'dueAt' | 'status'>, now: number) =>
  !!q.dueAt && q.status !== 'Signed' && q.dueAt.getTime() < startOfDay(new Date(now))

/**
 * Filter + sort. The Date pane bounds the quote's Created date (the first date column; the mock names the pane "Dates").
 * Today / Last 7 days / Last 30 days are day-granular windows ending today; Custom uses the From / To fields.
 */
export function applyQuoteFilters(quotes: Quote[], f: QuoteFilters, now: number): Quote[] {
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
  const sorted = [...out]
  if (f.sort === 'newest') sorted.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())
  else sorted.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
  return sorted
}

/** Search matches the title or the quote number ("OM-10001"). */
export function searchQuotes(quotes: Quote[], query: string): Quote[] {
  const q = query.trim().toLowerCase()
  if (!q) return quotes
  return quotes.filter((x) => x.title.toLowerCase().includes(q) || x.number.toLowerCase().includes(q))
}
