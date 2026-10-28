import { calendarDaysBetween, dayWords, displayDate, money, moneySGD } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'

/**
 * How the listing's surfaces (the table, the kanban cards, the phone cards) print a lead's figures — one wording for all three.
 */

/** An empty value in a table cell. (the calm UI build 2026-10-27 — T-08) One stand-in, the em dash — it was "--" here, "—" and "- -" elsewhere. */
export const BLANK = '—'

/** (the calm UI build 2026-10-27 — T-11, audit 2-35, W-067) How long ago, in calendar days and words: "today", "yesterday", "2 days ago" —
 *  never "2d ago". The kanban's Updated, the phone card's Added and the review sheet's dates read it. */
export const agoWords = (at: Date, now: number): string => {
  const d = Math.max(0, calendarDaysBetween(at, now))
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${dayWords(d)} ago`
}
/** (the calm UI build 2026-10-27 — T-11) A date the house way: relative words for the last seven days ("today", "2 days ago"), else the date. */
export const whenWords = (at: Date, now: number): string => (calendarDaysBetween(at, now) <= 6 ? agoWords(at, now) : displayDate(at))

/** (UX audit L8) A budget of 0 is "not known" — a blank budget is stored as 0 (`leads.budget_minor` is not nullable) — so it reads "--",
 *  never "0" or "S$0". The table's column carries the S$ in its head; a card's line carries it on the figure. */
export const budgetCell = (minor: number): string => (minor > 0 ? money(minor) : BLANK)
export const budgetCard = (minor: number): string => (minor > 0 ? moneySGD(minor) : BLANK)

/** (UX audit L3) Days the lead has sat in its stage — (parity P-29 · Q-14) calendar days, as the Schedule, the record cards and the reports
 *  count them (REG-1131: never elapsed 24-hour spans, which read one day fewer before midnight). */
export const daysInStage = (row: Pick<LeadRow, 'stageSince'>, now: number): number =>
  Math.max(0, calendarDaysBetween(row.stageSince, now))

/** (UX audit L3) "5 days in Met" — the cards' days-in-stage figure and the In stage column's first line; (parity P-28 · Q-13) the house
 *  words, never "5d". */
export const stageAge = (row: Pick<LeadRow, 'stageSince' | 'stage'>, now: number): string => `${dayWords(daysInStage(row, now))} in ${row.stage}`

/** The In stage column's second line: "since 25 Sep ’26". */
export const stageSinceText = (row: Pick<LeadRow, 'stageSince'>): string => `since ${displayDate(row.stageSince)}`
