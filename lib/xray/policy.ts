import { runsStudio } from '@/lib/leads/assign-policy'

/**
 * Quote X-Ray (REG-641, X-Ray parity Q-20) — who may delete a comparison: the member who ran it, an Owner or an Admin — the
 * rule a quote's (REG-625) and a contract's (REG-634) delete follow. The delete itself stays permanent (the owner's call of
 * 2026-09-18: "a comparison is only ever a reading of two quotes"), and the lead's Activity keeps who removed which reading.
 */
export const canDeleteComparison = (viewer: { id: string; role: string }, createdBy: string) => createdBy === viewer.id || runsStudio(viewer.role)
/** (sweep S3) Worded as the quote's and the contract's rule (lib/quotes/policy.ts, lib/contracts/policy.ts). */
export const COMPARISON_DELETE_RULE = 'Only its creator, an Owner or an Admin deletes a comparison'
