/*
 * (simplify round 2 — R2-C, her "fix all the pending things" 2026-10-09; P2 §6.0 rule 5 · §6.8 · §6.9) Held client emails — pure and
 * client-safe. An action that answers with Undo and tells the client by itself (a hold's "The works are paused", a resume's "running again",
 * a handover's "handed over", and whatever the Start sheet or the Mark done sheet sends — the share's, the invoice's, the photos' update) writes
 * its messages to the outbox HELD for as long as its Undo is offered (`status = 'held'`, `send_after`); the Undo deletes the ones still held, so
 * an Undo also takes back the client's email. `releaseHeldMessages` (lib/notifications/delivery.ts) sends what has come due through the same
 * adapter — a real provider only ever sees released mail. These are the windows, the words an Undo adds, and the log's words for a held row.
 */
import { displayTime } from '@/lib/format'
import type { ClientEvent } from '@/lib/portal/client-messages'

/**
 * The only client messages an Undo's window holds — the ones its actions raise by themselves: the hold's and the resume's, the handover's, and
 * what the Start and Mark done sheets send (the invoice's, the schedule's share, the photos' update). Every other event goes at once even when
 * raised inside a window — "A payment is due today" (`client_payment_due`, raised on the bell's read), a reply, a receipt, a choice.
 */
export const HELD_EVENTS: ReadonlySet<string> = new Set<ClientEvent>(['client_paused', 'client_resumed', 'client_handed_over', 'client_invoice_sent', 'client_schedule_shared', 'client_update',
  'client_floor_plan', 'client_floor_plan_ask'])   // (parity map, TD-049 · UC-094 — P-H's) a plan added and a plan asked for answer with Undo too

/**
 * How long a client's message waits for a snackbar's Undo: the house snackbar with an action stays 8 s and runs on at least 2 s after its clock
 * was stopped by a hover, a press or focus (REG-898, components/om/snackbar.tsx `LONG_MS` · `AFTER_HOLD_MS`). The release is lazy (it runs on the
 * next delivery, bell read or Sent messages read), and an Undo takes back whatever is still held — so a longer read rarely loses it.
 */
export const UNDO_SNACKBAR_MS = 8_000 + 2_000

/** What an action held — the outbox rows its Undo may still take back — or what an Undo took back: the rows, and who they were to. */
export type HeldMail = { ids: string[]; to: string[] }
export const NO_HELD: HeldMail = { ids: [], to: [] }

/** The held rows' ids an Undo carries back to the server — strings only, a handful at most (never trusted beyond the project's own lead). */
export const heldIds = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64).slice(0, 40) : [])

const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name.trim()
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/**
 * The tail an Undo's sentence takes when it kept messages from going — "… — and the message to Aisha won’t go" (two channels or two people:
 * "the messages to …"). Empty when nothing was held any more (it went, or nothing was sent). (invented copy)
 */
export function unsentWords(h: HeldMail | null | undefined): string {
  if (!h || !h.ids.length) return ''
  const names = [...new Set(h.to.map(firstOf).filter(Boolean))]
  return ` — and the ${h.ids.length === 1 ? 'message' : 'messages'} to ${names.length ? andList(names) : 'the client'} won’t go`
}

/** Settings › Notifications › Sent messages: a held row's status — "Held — goes at 3:42 PM unless undone". (invented copy) */
export const heldWords = (sendAfter: number | null | undefined): string =>
  sendAfter ? `Held — goes at ${displayTime(new Date(sendAfter))} unless undone` : 'Held — goes soon unless undone'
