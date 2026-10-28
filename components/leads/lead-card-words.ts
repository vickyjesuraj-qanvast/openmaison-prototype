/**
 * (Leads on the move, L3 — P-05 · A-03 · A-28, his marks 2026-10-23 on the Leads-on-the-move page, "continue the leads") The phone card's words —
 * who to call now: when we last spoke, what is next and how late it is; a Lost card says why and when. Pure: the card, the probe's pure checks
 * and any other card read the same sentences (the Quotes card's `quote-card-words.ts`, the Contracts card's `contract-card-words.ts`).
 */
import type { LeadRow } from '@/lib/leads/queries'
import { channelLabel } from '@/lib/leads/enums'
import { dayWords, displayDayShortMonth, displayTime, dueDistance, hasTime, isOverdue, phoneDigits, startOfDay } from '@/lib/format'

const DAY = 86_400_000
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const daysFrom = (a: Date, now: number) => Math.round((startOfDay(a) - startOfDay(new Date(now))) / DAY)

/** A moment that has passed, as a card says it: "Today 4:10 PM" · "Yesterday" · "Mon" (this past week) · "12 Oct". */
export function pastWhen(at: Date, now: number): string {
  const d = -daysFrom(at, now)
  if (d <= 0) return hasTime(at) ? `Today ${displayTime(at)}` : 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return SHORT_DAYS[at.getDay()]!
  return displayDayShortMonth(at)
}

/** A due moment, as a card says it, with its time when it has one: "Today 10:00 AM" · "Tomorrow 10:00 AM" · "Thu 10:00 AM" (in the coming
 *  week) · "22 Oct 10:00 AM"; a late one by its day and how late — "19 Oct · 4 days late" (a bare "Mon" in red read as next Monday). */
export function dueWhen(at: Date, now: number): string {
  const d = daysFrom(at, now)
  const t = hasTime(at) ? ` ${displayTime(at)}` : ''
  if (d < 0) return `${displayDayShortMonth(at)} · ${dueDistance(at, now)}`
  if (d === 0) return `Today${t}`
  if (d === 1) return `Tomorrow${t}`
  if (d < 7) return `${SHORT_DAYS[at.getDay()]}${t}`
  return `${displayDayShortMonth(at)}${t}`
}

/** The earliest dated open task — the listing's tasks come ordered by due date, nulls last (the table's Next follow-up). */
export const nextTask = (row: Pick<LeadRow, 'tasks'>) => row.tasks.find((t) => t.dueAt) ?? null

/** "Others: moved overseas" → "moved overseas"; the studio's own reason as it reads. */
const reasonWords = (r: string | null | undefined) => (r ? r.replace(/^Others:\s*/i, '').trim() : '')

export type CardLine = { label: string; text: string; late?: boolean }

/** The card's "when" lines — at most two, 14 each:
 *   · Lost: "Lost 51 days ago · Went with another ID" (the competitor after it) — nothing else, the lead is over;
 *   · On Hold: Last, then "Follow up on 12 Nov" (red once the day has passed);
 *   · every other lead: Last ("Call · Callback requested · Mon", or "Not contacted yet"), then Next — the earliest follow-up's day and time, red
 *     once it is late (the task box under it names it). No dated follow-up, no Next line. */
export function cardLines(row: Pick<LeadRow, 'stage' | 'lastContact' | 'tasks' | 'onHoldFollowUp' | 'stageSince' | 'parked'>, now: number): CardLine[] {
  if (row.stage === 'Lost') {
    const ago = -daysFrom(row.stageSince, now)
    const when = ago <= 0 ? 'Lost today' : ago === 1 ? 'Lost yesterday' : `Lost ${dayWords(ago)} ago`
    const why = reasonWords(row.parked?.reason)
    const to = row.parked?.competitor ? `went with ${row.parked.competitor}` : ''
    return [{ label: 'Lost', text: [when.replace(/^Lost /, ''), why, to].filter(Boolean).join(' · ') }]
  }
  const c = row.lastContact
  const last: CardLine = { label: 'Last', text: c ? [channelLabel(c.channel), c.outcome, pastWhen(c.at, now)].filter(Boolean).join(' · ') : 'Not contacted yet' }
  if (row.stage === 'On Hold') {
    const f = row.onHoldFollowUp ? new Date(row.onHoldFollowUp) : null
    return f && !Number.isNaN(f.getTime()) ? [last, { label: 'Next', text: isOverdue(f, now) ? `Follow up on ${displayDayShortMonth(f)} · ${dueDistance(f, now)}` : `Follow up on ${displayDayShortMonth(f)}`, late: isOverdue(f, now) }] : [last]
  }
  const t = nextTask(row)
  return t?.dueAt ? [last, { label: 'Next', text: dueWhen(t.dueAt, now), late: isOverdue(t.dueAt, now) }] : [last]
}

/** A parked lead (On Hold · Lost) wears no Overdue tag: its follow-ups wait, as "Overdue follow-ups" leaves them out (A-28). */
export const parked = (row: Pick<LeadRow, 'stage'>) => row.stage === 'On Hold' || row.stage === 'Lost'

/** WhatsApp on the press: wa.me with the Singapore number, or null when the lead has none. */
export function waHref(phone: string | null | undefined): string | null {
  const d = phoneDigits(phone)
  return d.length === 8 ? `https://wa.me/65${d}` : null
}
