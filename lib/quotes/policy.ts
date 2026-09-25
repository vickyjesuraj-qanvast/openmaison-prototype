/**
 * (REG-625, quote editor parity Q-28 · Q-29) Who may delete a quote, and whether its validity has run out — pure, client-safe.
 */

/** Owners, Admins and the member who created the quote delete it, restore it, and delete it forever. */
export const canDeleteQuote = (viewer: { id: string | null; role: string | null | undefined }, q: { createdBy: string | null }) =>
  viewer.role === 'Owner' || viewer.role === 'Admin' || (!!viewer.id && q.createdBy === viewer.id)
export const DELETE_RULE = 'Only an Owner, an Admin or whoever created a quote deletes it'

/**
 * A quote out with the client whose Valid until has passed: the studio sees it marked (nothing is blocked — 1.0 never enforced its
 * date either). Passed = the day after the date, in the demo's own day (a date is a whole day).
 */
export function validityPassed(q: { status: string; validUntil: Date | number | null }, now: number): boolean {
  if (q.status !== 'Sent to Client' || q.validUntil == null) return false
  const until = typeof q.validUntil === 'number' ? q.validUntil : q.validUntil.getTime()
  const end = new Date(until); end.setHours(23, 59, 59, 999)
  return end.getTime() < now
}

/** The snackbar after a Delete: how many went, and why any stayed. */
export function deletedLine(r: { deleted: number; refused: number }): string {
  if (!r.deleted) return r.refused ? `${DELETE_RULE}.` : 'Nothing to delete'
  const done = r.deleted === 1 ? 'Quote deleted' : `${r.deleted} quotes deleted`
  return r.refused ? `${done} — ${r.refused} left: only its creator, an Owner or an Admin deletes a quote` : done
}
