import { runsStudio } from '@/lib/leads/assign-policy'

/**
 * Quote X-Ray (REG-641, X-Ray parity Q-20) — who may delete a comparison: the member who ran it, an Owner or an Admin — the
 * rule a quote's (REG-625) and a contract's (REG-634) delete follow, and the lead's Activity keeps who removed which reading.
 * (the close-out round 2026-10-31, C-08) The delete is soft now, as a quote's and a contract's: the reading waits in Deleted comparisons
 * with Undo, and the same rule restores it or deletes it forever (the owner's call of 2026-09-18 — "gone for good" — is reversed by C-08).
 */
export const canDeleteComparison = (viewer: { id: string; role: string }, createdBy: string) => createdBy === viewer.id || runsStudio(viewer.role)
/** (sweep S3) Worded as the quote's and the contract's rule (lib/quotes/policy.ts, lib/contracts/policy.ts). */
export const COMPARISON_DELETE_RULE = 'Only its creator, an Owner or an Admin deletes a comparison'
/** (C-08) The same rule, as the Deleted comparisons sheet says it (Deleted quotes' and Deleted contracts' words). */
export const COMPARISON_TRASH_RULE = 'Only its creator, an Owner or an Admin restores or deletes a comparison'
