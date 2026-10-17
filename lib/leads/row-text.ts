import { calendarDaysBetween, dayWords, displayDate, money, moneySGD } from '@/lib/format'
import type { LeadRow } from '@/lib/leads/queries'

/**
 * How the listing's surfaces (the table, the kanban cards, the phone cards) print a lead's figures — one wording for all three.
 */

/** An empty value, as the lead's info column, the Files table and the stage cards print it. */
export const BLANK = '--'

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
