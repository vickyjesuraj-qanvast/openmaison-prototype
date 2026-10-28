import { displayDate, startOfDay } from '@/lib/format'
import type { Contract } from '@/lib/db/schema'
import { linkExpired } from '@/lib/contracts/link'
import { contractStatusLabel } from '@/lib/contracts/status-words'

/*
 * (Contracts on the move, C4 — P-07 · A-01 · A-07 · A-08, Q-03 as picked; his "please check and built accordingly" 2026-10-22) The phone
 * card's third line, pure — the Quotes card's words module (components/leads/quotes/quote-card-words.ts) on the contract's states: a
 * READ-ONLY status chip (the status changes on the contract, where the rule can say why) and its "since" — what the card can say about where
 * the contract stands today: "sent 2d ago · not opened", "opened yesterday", "link expired 12 Sep", "signed 12 Sep", "edited today",
 * "sent to read". Every word comes from the record; nothing is invented about the client.
 */
export type ContractCardChip = { label: string; color: 'default' | 'green' | 'yellow' | 'blue' }
export type ContractSinceWord = { text: string; tone?: 'red' }

const DAY = 86_400_000
/** "today" · "yesterday" · the date — for a stamp that looks back. */
export function whenWord(d: Date, now: number): string {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(d)) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return displayDate(d)
}
/** "2d ago" · "3h ago" · "just now" — the lists' span (lib/contracts/model.ts `awaitingLine`'s), lowercase. */
export function agoWord(at: number, now: number): string {
  const d = Math.floor((now - at) / DAY)
  if (d >= 1) return `${d}d ago`
  const h = Math.floor((now - at) / 3_600_000)
  return h >= 1 ? `${h}h ago` : 'just now'
}

/** The chip: the status, in the house tag's tones — out with the client = blue, signed = green, a link past its window = yellow, the rest plain. */
export function contractCardChip(c: Pick<Contract, 'status' | 'signExpiresAt' | 'toRead'>, now: number): ContractCardChip {
  if (c.status === 'Signed') return { label: 'Signed', color: 'green' }
  if (c.status === 'Sent to Client') {
    /* past its window the link no longer signs — the chip says so with its day, as the Quotes card's "Expired 21 Sep ’26" (its ⋮ offers Send the link again) */
    if (!c.toRead && linkExpired(c, now)) return { label: c.signExpiresAt ? `Link expired ${displayDate(c.signExpiresAt)}` : 'Link expired', color: 'yellow' }
    /* (the calm UI build 2026-10-27, W-363) out for signature reads as the state it is; a letter to read signs nothing, so it keeps "Sent to client" */
    return { label: c.toRead ? 'Sent to client' : contractStatusLabel(c.status), color: 'blue' }
  }
  return { label: contractStatusLabel(c.status), color: 'default' }
}

/** The "since" beside the chip — at most three short pieces, the first the one that matters most on the move. */
export function contractSinceWords(c: Pick<Contract, 'status' | 'sentAt' | 'viewedAt' | 'signedAt' | 'signExpiresAt' | 'updatedAt' | 'createdAt' | 'toRead' | 'signedBy'>, now: number): ContractSinceWord[] {
  /* (the calm UI build 2026-10-27, 4-26 · W-376) the chip says Signed; the since is its day alone — "Signed · 15 Sep ’26", the word once */
  if (c.status === 'Signed') return [{ text: displayDate(c.signedAt ?? c.updatedAt ?? c.createdAt) }]
  if (c.status === 'Sent to Client') {
    const out: ContractSinceWord[] = []
    if (c.toRead) { out.push({ text: `sent to read${c.sentAt ? ` ${agoWord(c.sentAt.getTime(), now)}` : ''}` }); if (c.viewedAt) out.push({ text: `opened ${agoWord(c.viewedAt.getTime(), now)}` }); return out }
    /* an expired link's chip says it; the since is still when it went and whether it was opened (the Quotes card's "sent … · not opened") */
    if (c.sentAt) out.push({ text: `sent ${agoWord(c.sentAt.getTime(), now)}` })
    out.push(c.viewedAt ? { text: `opened ${agoWord(c.viewedAt.getTime(), now)}` } : { text: 'not opened' })
    return out
  }
  return [{ text: `edited ${whenWord(c.updatedAt ?? c.createdAt, now)}` }]
}

/** The card's second line: "Signs OM-10008 · Interior Design Service Agreement" (Tools), "Signs OM-10008" under the title (the lead's tab). */
export function contractSignsLine(c: Pick<Contract, 'title' | 'toRead' | 'source'>, quoteNumber: string | null, withTitle: boolean): string {
  const what = quoteNumber ? `Signs ${quoteNumber}` : c.toRead ? 'A letter to read' : c.source === 'uploaded' ? 'A PDF' : 'No quote named'
  return withTitle ? `${what} · ${c.title}` : what
}
