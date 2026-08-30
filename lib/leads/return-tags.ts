import type { LeadReturn } from '@/lib/db/schema'

/*
 * Qanvast lead return — the return / refund state labels (931:49232 status column · 931:49048 details head · 931:48553
 * header chips; spec design-source/context/lead-return/02-qanvast-ops.txt + 01-wizard-details.txt "Return details").
 * Deliberately db-free: client components (the details modal, the LEAD RETURNED card, the overview header, Qanvast Ops)
 * import these, while `fetchReturnDetail` / `fetchQanvastLeads` stay in the server-only lib/leads/returns.ts / qanvast.ts.
 */

export type ReturnTag = { label: string; color: 'green' | 'yellow' | 'red' | 'default' }

/** Header / listing tags for a return: the return status, then the refund status once approved. */
export function returnTags(ret: Pick<LeadReturn, 'status' | 'refundStatus'> | null | undefined): ReturnTag[] {
  if (!ret) return []
  if (ret.status === 'processing') return [{ label: 'Return Processing', color: 'yellow' }]
  if (ret.status === 'rejected') return [{ label: 'Return Rejected', color: 'red' }]
  const tags: ReturnTag[] = [{ label: 'Return Approved', color: 'green' }]
  if (ret.refundStatus === 'credited') tags.push({ label: 'Refund Credited', color: 'green' })
  else tags.push({ label: 'Refund Processing', color: 'yellow' })
  return tags
}

/** The "Lead Return" group of the "All Leads" dropdown (931:49435) — the five return / refund states, in the mock's order. */
export const RETURN_FILTERS = ['Return Processing', 'Return Approved', 'Return Rejected', 'Refund Processing', 'Refund Credited'] as const
