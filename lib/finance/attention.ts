import 'server-only'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { purchaseOrders, vendors } from '@/lib/db/schema'

/**
 * (gaps build F1 — F1-Q15) The projects' POs a vendor answered with changes or a no — the Needs attention reason `vendor_answer`
 * (lib/projects/attention.ts). One read for a list; the caller hands it only to whoever sees the project's money.
 */
export async function vendorAnswersBy(projectIds: string[]): Promise<Map<string, { po: string; vendor: string; answer: 'changes' | 'declined' }[]>> {
  const out = new Map<string, { po: string; vendor: string; answer: 'changes' | 'declined' }[]>()
  if (!projectIds.length) return out
  const rows = await db.select({ projectId: purchaseOrders.projectId, number: purchaseOrders.number, answer: purchaseOrders.vendorAnswer, vendor: vendors.name })
    .from(purchaseOrders).innerJoin(vendors, eq(vendors.id, purchaseOrders.vendorId))
    .where(and(inArray(purchaseOrders.projectId, projectIds), eq(purchaseOrders.status, 'sent'), isNull(purchaseOrders.deletedAt), inArray(purchaseOrders.vendorAnswer, ['changes', 'declined'])))
  for (const r of rows) out.set(r.projectId, [...(out.get(r.projectId) ?? []), { po: r.number, vendor: r.vendor, answer: r.answer === 'declined' ? 'declined' : 'changes' }])
  return out
}

/** The PO a number names — the Status card's reason lands on its row. */
export async function poIdByNumber(number: string): Promise<string | null> {
  const [r] = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.number, number)).limit(1)
  return r?.id ?? null
}
