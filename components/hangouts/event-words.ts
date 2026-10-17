import { moneyCard } from '@/lib/format'
import type { HangoutListItem } from '@/lib/hangouts/queries'

/**
 * (pending modules S27) A Hangout card's words — what waits, in one line; its one press; what a place costs — written once for the card
 * (hangouts-home.tsx), its scopes and its one press kept beside the words they count.
 */
export type Scope = 'all' | 'open' | 'mine' | 'ended'
export const inScope = (e: HangoutListItem, s: Scope) => s === 'all' ? true
  : s === 'open' ? e.phase === 'ahead' && (e.participation === 'none' || e.participation === 'withdrawn' || e.participation === 'applied')
  : s === 'mine' ? e.participation === 'confirmed' && e.phase !== 'ended'
  : e.phase === 'ended' || e.phase === 'cancelled'
export const scopeLabels = (events: HangoutListItem[]) => {
  const n = (s: Scope) => events.filter((e) => inScope(e, s)).length
  return [{ value: 'all', label: `All · ${n('all')}` }, { value: 'open', label: `Open to apply · ${n('open')}` }, { value: 'mine', label: `Taking part · ${n('mine')}` }, { value: 'ended', label: `Ended · ${n('ended')}` }]
}

export const isOpen = (e: HangoutListItem) => e.phase === 'ahead' && (e.participation === 'none' || e.participation === 'withdrawn')

/** what waits, in one line */
export function eventLine(e: HangoutListItem): string | null {
  const taking = e.participation === 'confirmed'
  return e.participation === 'applied' ? `Applied${e.appliedBy ? ` by ${e.appliedBy}` : ''} — Qanvast confirms your place and gives you your tables`
    : taking && e.phase === 'ended' ? `${e.held} ${e.held === 1 ? 'chat' : 'chats'} held · ${e.booked} booked`
    : taking ? [e.tables.length ? `Tables ${e.tables.join(' and ')}` : null, `${e.designers} ${e.designers === 1 ? 'designer' : 'designers'} on the plan`, `${e.booked} booked`].filter(Boolean).join(' · ')
    : e.participation === 'declined' ? 'Qanvast didn’t confirm a place this time'
    : isOpen(e) ? (e.placesLeft > 0 ? `${e.placesLeft} ${e.placesLeft === 1 ? 'place' : 'places'} left` : 'Every place is taken') : null
}

/** the card's one press — a button's label, or the line that says who may */
export function eventPress(e: HangoutListItem, runs: boolean): { kind: 'apply' | 'withdraw' | 'open' | 'who'; label: string } | null {
  if (isOpen(e) && runs && e.placesLeft > 0) return { kind: 'apply', label: 'Apply' }
  if (isOpen(e) && !runs) return { kind: 'who', label: 'An Owner or an Admin applies' }
  if (e.participation === 'applied' && runs) return { kind: 'withdraw', label: 'Take back' }
  if (e.participation === 'confirmed') return { kind: 'open', label: e.phase === 'today' ? 'Open today’s chats' : e.phase === 'ended' ? 'See how it went' : 'Open the plan' }
  return null
}

export const costLine = (e: HangoutListItem) => `${moneyCard(e.pricePerTableMinor * e.tablesPerStudio)} · ${e.tablesPerStudio} ${e.tablesPerStudio === 1 ? 'table' : 'tables'} at ${moneyCard(e.pricePerTableMinor)}`
