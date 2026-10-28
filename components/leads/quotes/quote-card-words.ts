import { displayDate, displayDateLong, startOfDay } from '@/lib/format'
import { clientValidityPassed, isQuoteOverdue, sentToClientOf, viewedSince, waitingOnClient, type QuoteListRow } from '@/lib/leads/quote-filters'
import { quoteStatusLabel } from '@/lib/quotes/status-words'

/*
 * (Quotes on the move, K4 — P-06 · A-07 · A-08, the owner's "please go ahead" 2026-10-22) The phone card's third line, pure: a READ-ONLY
 * status chip (the status changes on the quote, Q-04) and its "since" — what the card can say about where the quote stands today:
 * "opened 3 Oct · expires in 4 days", "sent 16 Sep · not opened", "approved 21 Sep · not sent", "edited yesterday", "signed 12 Sep".
 * A quote out with the client past its Valid until wears "Expired {date}" as the chip (REG-625's mark), and the line says when it went.
 * Every word comes from the record; nothing is invented about the client.
 */
export type CardChip = { label: string; color: 'default' | 'green' | 'yellow' | 'blue'; /** out with the client past its Valid until */ expired: boolean }
export type SinceWord = { text: string; tone?: 'red' }

const DAY = 86_400_000
/** "today" · "yesterday" · the date — for a stamp that looks back. */
export function whenWord(d: Date, now: number): string {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(d)) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return displayDate(d)
}

/** The chip: the status, in the house tag's tones — went out = blue, done = green, expired = yellow, the rest plain. */
export function cardChip(q: QuoteListRow, now: number): CardChip {
  if (clientValidityPassed(q, now) && q.validUntil) return { label: `Expired ${displayDate(q.validUntil)}`, color: 'yellow', expired: true }
  /* (the calm UI build 2026-10-27, T-01 · 4-04) the status set on screen — With client, Waiting for approval */
  if (q.status === 'Confirmed' || q.status === 'Signed') return { label: quoteStatusLabel(q.status), color: 'green', expired: false }
  if (q.status === 'Sent to Client') return { label: quoteStatusLabel(q.status), color: 'blue', expired: false }
  return { label: quoteStatusLabel(q.status), color: 'default', expired: false }
}

/** The "since" beside the chip — at most three short pieces, the first the one that matters most on the move. */
export function sinceWords(q: QuoteListRow, now: number): SinceWord[] {
  const out: SinceWord[] = []
  const sent = sentToClientOf(q), seen = viewedSince(q)
  const expired = clientValidityPassed(q, now)
  /* (the calm UI build 2026-10-27, W-376) the chip already says Signed / Confirmed — the line says the day, once */
  if (q.status === 'Signed') { out.push({ text: displayDate(q.signedAt ?? q.updatedAt ?? q.createdAt) }); return out }
  if (q.status === 'Confirmed') { out.push({ text: displayDate(q.confirmedAt ?? q.updatedAt ?? q.createdAt) }); return out }
  if (q.status === 'Draft') out.push({ text: `edited ${whenWord(q.updatedAt ?? q.createdAt, now)}` })
  else if (q.status === 'Sent for Approval') out.push({ text: `since ${displayDate(q.submittedAt ?? q.sentAt ?? q.updatedAt ?? q.createdAt)}` })
  else if (waitingOnClient(q) && sent) {
    if (seen) out.push({ text: `opened ${displayDate(seen)}` })
    else out.push({ text: `sent ${displayDate(sent)}` }, { text: 'not opened' })
  } else if (q.status === 'Approved') out.push({ text: `approved ${displayDate(q.approvedAt ?? q.updatedAt ?? q.createdAt)}` }, { text: 'not sent' })
  /* the price's life, while the client holds the quote and it still stands — the chip already says "Expired" otherwise */
  let validity = false
  if (!expired && q.validUntil && (q.status === 'Sent to Client' || q.status === 'Approved')) {
    const left = Math.round((startOfDay(q.validUntil) - startOfDay(new Date(now))) / DAY)
    if (left === 0) out.push({ text: 'expires today' })
    else if (left > 0 && left <= 14) out.push({ text: `expires in ${left} ${left === 1 ? 'day' : 'days'}` })
    else if (left > 14) out.push({ text: `valid until ${displayDate(q.validUntil)}` })
    validity = left >= 0
  }
  /* the follow-up's day (REG-470): when it is late, always; otherwise only where no validity line says the next date */
  if (q.dueAt) {
    const late = isQuoteOverdue(q, now)
    if (late) out.push({ text: `due ${displayDateLong(q.dueAt)}`, tone: 'red' })
    else if (!validity) out.push({ text: `due ${displayDateLong(q.dueAt)}` })
  }
  return out.slice(0, 3)
}

/** Whether the card's ⋮ offers a reminder: the quote is out with the client, unanswered. */
export const canRemind = (q: QuoteListRow) => waitingOnClient(q)

/** The WhatsApp nudge for a quote the client holds — a draft the designer finishes (invented copy; the confirmation draft's model, REG-587). */
export function remindMessage(o: { clientFirst: string; studio: string; number: string; link: string | null }): string {
  const where = o.link ? `: ${o.link}` : ''
  return `Hi ${o.clientFirst}, just checking in on quote ${o.number} from ${o.studio}${where}\n\nDo let me know if you have any questions, or if you’re happy to go ahead.`
}
