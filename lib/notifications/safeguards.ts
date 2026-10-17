/**
 * (parity map 2026-10-10 — UC-082 · UC-083, 1.0's dispatcher and its hourly retry) The delivery layer's safeguards — pure and client-safe:
 * the numbers lib/notifications/delivery.ts holds a message by, and the words Settings › Notifications › Sent messages says them in.
 *  · OpenMaison's pause (Qanvast Ops › Studios, `settings.platform.messagesPaused`) — every message waits as `paused`, goes when it lifts.
 *  · One raise that would message more than FANOUT_MAX people at once waits as `held_large` for the Owner (`send_held`): Send · Drop.
 *    1.0 only logged an alarm past 15 emails; 2.0 holds past 25 people (the brief's number) so nothing goes until someone says so.
 *  · A failed message is tried again up to RETRY_MAX times (1.0's three), spaced by RETRY_AFTER_MS, then Owners and Admins hear
 *    `message_failed`. A missing address is not retried (nothing to send to).
 * The prototype's adapter never fails and never sends — nothing leaves the machine; these rules are what a real provider runs under.
 */
export const FANOUT_MAX = 25
export const RETRY_MAX = 3
/** The wait before each retry: 5 minutes, then 30, then 2 hours. */
export const RETRY_AFTER_MS: readonly number[] = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000]
/** A held batch's mark on its rows (`notification_outbox.error`, free while a row is held). */
export const batchOf = (id: string) => `batch:${id}`
export const batchIdOf = (error: string | null | undefined) => (error && error.startsWith('batch:') ? error.slice(6) : null)

/** How a row reads in Sent messages for the statuses the safeguards add — null for the others (the log's own words, outbox.ts). */
export function safeguardWords(m: { status: string; attempts?: number | null; nextTryAt?: number | null; error?: string | null }): string | null {
  if (m.status === 'paused') return 'Paused by OpenMaison — goes when it lifts'
  if (m.status === 'held_large') return 'Waiting for the Owner’s OK'
  if (m.status === 'dropped') return m.error ?? 'Dropped'
  if (m.status === 'failed' && m.nextTryAt) return `Trying again (${Math.min(RETRY_MAX, (m.attempts ?? 0) + 1)} of ${RETRY_MAX})`
  if (m.status === 'failed' && (m.attempts ?? 0) >= RETRY_MAX) return `Didn’t go — tried ${RETRY_MAX} more times`
  return null
}
