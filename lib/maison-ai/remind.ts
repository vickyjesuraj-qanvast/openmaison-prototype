/**
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · P-04 · Q-03 · lane D4) **A quote that waits on its client**, one rule for the docked
 * field's suggestion ("Remind Ryan about VO-2"), Maison AI's answer to it and the reminder it keeps: a quote or a variation order sent to the
 * client and not answered — opened twice or more, or sent three days ago or more (the Needs you signal's own rule, brief § D2) — whose validity
 * still stands, and that nobody reminded them about in the last two days. Pure and client-safe; the reminder is kept on the client's Activity
 * as Client access keeps its own (`portal_reminded`, its key `quote:<id>`, lib/maison-ai/remind-actions.ts).
 */
const DAY = 86_400_000

/** Sent this long ago with no answer, it waits on the client. */
export const REMIND_AFTER_DAYS = 3
/** …or opened this often by the client without an answer. */
export const REMIND_OPENED = 2
/** A client reminded within this many days is not offered again. */
export const REMIND_QUIET_DAYS = 2

/** The key a quote's reminder is kept under on the lead's Activity (`lead_events.detail.id`). */
export const quoteReminderKey = (quoteId: string) => `quote:${quoteId}`

export type WaitingFacts = { sentAt: number | null; viewCount: number; validUntil: number | null; remindedAt: number | null }

/** Whether a sent quote waits on its client now — and so is worth a reminder. */
export function waitsOnClient(f: WaitingFacts, now: number): boolean {
  if (f.validUntil !== null && f.validUntil < now) return false   // its validity ended: revise it, don't remind
  if (f.remindedAt !== null && now - f.remindedAt < REMIND_QUIET_DAYS * DAY) return false
  const days = f.sentAt === null ? 0 : (now - f.sentAt) / DAY
  return f.viewCount >= REMIND_OPENED || days >= REMIND_AFTER_DAYS
}

/** Which of several waits first: the one opened most, then the longest out. */
export const byWait = (a: WaitingFacts, b: WaitingFacts) => b.viewCount - a.viewCount || (a.sentAt ?? Infinity) - (b.sentAt ?? Infinity)
