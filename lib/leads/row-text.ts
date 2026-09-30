import { displayDate, money, moneySGD } from '@/lib/format'
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

/** (UX audit L3) Whole days the lead has sat in its stage — whole 24 hours, the listing's own relative clock (`relativeTime`'s "8d ago"), so
 *  a New lead's card never reads "8d ago" beside "9d in New". */
export const daysInStage = (row: Pick<LeadRow, 'stageSince'>, now: number): number =>
  Math.max(0, Math.floor((now - row.stageSince.getTime()) / 86_400_000))

/** (UX audit L3) "5d in Met" — the cards' days-in-stage figure and the In stage column's first line. */
export const stageAge = (row: Pick<LeadRow, 'stageSince' | 'stage'>, now: number): string => `${daysInStage(row, now)}d in ${row.stage}`

/** The In stage column's second line: "since 25 Sep ’26". */
export const stageSinceText = (row: Pick<LeadRow, 'stageSince'>): string => `since ${displayDate(row.stageSince)}`
