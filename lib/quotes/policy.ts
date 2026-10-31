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

/* ── (the close-out round 2026-10-31 — the calm UI build's "found on the way") A signed quote keeps its paper ── */

/** The Template card's test (the calm UI build's 4-10): a signed quote keeps the template it was signed with — the card offers no Change, the
    Preview and the editor offer no picker, and `setQuoteTemplate` refuses it on the server. */
export const keepsItsTemplate = (status: string) => status === 'Signed'
export const SIGNED_TEMPLATE_RULE = 'A signed quote keeps the template it was signed with'

/* ── (UX audit 2026-09-30, Q1 · Q3) The quote's status and the lead's next stage ── */

/** The statuses the client holds the quote in — past the studio's own approval. */
export const CLIENT_STATUSES = ['Sent to Client', 'Confirmed', 'Signed'] as const
const isClientStatus = (s: string) => (CLIENT_STATUSES as readonly string[]).includes(s)

/**
 * (Q3, supersedes REG-176's one-tap menu for these rows · extends REG-590) With approval required, nothing reaches the client's statuses
 * before an approver's OK: a member who does not approve can't mark a Draft — or a quote still waiting for approval — Sent to Client,
 * Confirmed or Signed. `null` = allowed. The server holds the same rule (`setQuoteStatus`).
 */
export function statusBlock(o: { target: string; current: string; approval: string; approver: boolean }): string | null {
  if (o.approval !== 'required' || o.approver || !isClientStatus(o.target)) return null
  return o.current === 'Draft' || o.current === 'Sent for Approval' ? 'It needs an approver’s OK first — send it for approval' : null
}
/** The status row's own reason, short enough for the row (the menu's meta). */
export const STATUS_BLOCK_META = 'needs approval'

/** Marked by hand from a status menu, these send nothing — the menu asks first (Q3). */
export const asksBeforeMarking = (s: string) => isClientStatus(s)

/** The lead's stages before Quote Sent: a quote that reaches the client there offers the lead's next stage (Q1). */
export const BEFORE_QUOTE_SENT = ['New', 'Contacted', 'Met'] as const
/** Whether a quote at `status` on a lead at `stage` offers "Move to Quote Sent" — sent to the client or confirmed, the lead not there yet. */
export const offersQuoteSent = (stage: string | null | undefined, status: string) =>
  !!stage && (BEFORE_QUOTE_SENT as readonly string[]).includes(stage) && (status === 'Sent to Client' || status === 'Confirmed')
