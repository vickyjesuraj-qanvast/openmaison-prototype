/**
 * (pending modules S03 — the card's "Contract value moves when a Signed quote is edited (1.0 froze it at signing)") What a project's
 * contract stands on: the quote's total as it was signed, once it has been (`quotes.signed_amount_minor`, stamped by every path that signs
 * it) — a later edit, or a revision not yet signed again, never moves it (a change after signing is a variation order); before any
 * signature, the quote's own total. One rule for every reader. Pure, client-safe.
 */
export const contractBaseOf = (q: { amountMinor: number; signedAmountMinor?: number | null }) => (typeof q.signedAmountMinor === 'number' ? q.signedAmountMinor : q.amountMinor)
/** The signed total and today's differ — the editor of a signed quote says what the contract still stands on. */
export const movedSinceSigning = (q: { amountMinor: number; signedAmountMinor?: number | null }) => typeof q.signedAmountMinor === 'number' && q.signedAmountMinor !== q.amountMinor
