import 'server-only'
import { and, eq, isNull, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, projects, purchaseOrders, supplierBills, vendors } from '@/lib/db/schema'
import type { Viewer } from '@/lib/leads/assign-policy'
import { seesBooks } from '@/lib/settings/roles'
import { leadsSeeingMoney } from '@/lib/projects/money-visibility'
import { money2 } from '@/lib/quotes/math'
import { phoneTyped } from '@/lib/format'

/**
 * (gaps build F1 — F1-Q15) The studio search's money out: a vendor by its name, trade, contact or mobile (anyone — the directory is the studio's);
 * a PO by its number, title or vendor and a supplier bill by its number or vendor — on a project whose money the viewer sees (Who sees leads,
 * then F-17), or the overhead's for Owners and Admins. Each opens its row (`?open=`).
 */
export type FinanceHit = { kind: 'finance'; id: string; title: string; sub: string; chip?: string | null; href: string; icon: string; others: (string | null)[]; phones: (string | null)[] }
export async function financeHits(key: string, viewer: Viewer, seesLead: (leadId: string) => boolean): Promise<FinanceHit[]> {
  const k = `%${key}%`
  const [vs, pos, bills] = await Promise.all([
    db.select().from(vendors).where(and(isNull(vendors.mergedInto), or(like(vendors.name, k), like(vendors.trade, k), like(vendors.contactName, k), like(vendors.phone, `%${key.replace(/\D/g, '') || key}%`)))).limit(40),
    db.select({ id: purchaseOrders.id, number: purchaseOrders.number, title: purchaseOrders.title, total: purchaseOrders.totalMinor, status: purchaseOrders.status, projectId: projects.id, project: projects.name, leadId: leads.id, vendor: vendors.name })
      .from(purchaseOrders).innerJoin(projects, eq(projects.id, purchaseOrders.projectId)).innerJoin(leads, eq(leads.id, projects.leadId)).innerJoin(vendors, eq(vendors.id, purchaseOrders.vendorId))
      .where(and(isNull(purchaseOrders.deletedAt), isNull(projects.deletedAt), or(like(purchaseOrders.number, k), like(purchaseOrders.title, k), like(vendors.name, k)))).limit(40),
    db.select({ id: supplierBills.id, ref: supplierBills.reference, total: supplierBills.totalMinor, projectId: supplierBills.projectId, vendor: vendors.name })
      .from(supplierBills).innerJoin(vendors, eq(vendors.id, supplierBills.vendorId))
      .where(and(isNull(supplierBills.deletedAt), or(like(supplierBills.reference, k), like(vendors.name, k)))).limit(40),
  ])
  const billProjects = bills.filter((b) => b.projectId).length
    ? await db.select({ id: projects.id, name: projects.name, leadId: projects.leadId }).from(projects).where(isNull(projects.deletedAt)) : []
  const leadIds = [...new Set([...pos.map((p) => p.leadId), ...billProjects.map((p) => p.leadId)].filter(seesLead))]
  const money = await leadsSeeingMoney(leadIds, viewer)
  const out: FinanceHit[] = []
  for (const v of vs) out.push({ kind: 'finance', id: v.id, title: v.name, sub: ['Vendor', v.trade, v.contactName].filter(Boolean).join(' · '), chip: v.isActive ? null : 'Inactive', href: `/company/finance/vendors?open=${encodeURIComponent(v.id)}`, icon: 'storefront', others: [v.trade, v.contactName, v.email], phones: [v.phone ? phoneTyped(v.phone) : null] })
  for (const p of pos) {
    if (!money.has(p.leadId)) continue
    out.push({ kind: 'finance', id: p.id, title: p.number, sub: ['Purchase order', p.vendor, p.project, money2(p.total)].filter(Boolean).join(' · '), chip: null, href: `/projects/${p.projectId}/money?open=${encodeURIComponent(p.id)}`, icon: 'local_shipping', others: [p.title, p.vendor], phones: [] })
  }
  for (const b of bills) {
    const proj = b.projectId ? billProjects.find((x) => x.id === b.projectId) : null
    if (proj ? !money.has(proj.leadId) : !seesBooks(viewer.role)) continue   // (parity map, MO-098) the studio's overhead bills — Accounting's books too
    out.push({ kind: 'finance', id: b.id, title: `${b.vendor} · ${b.ref}`, sub: ['Supplier bill', proj?.name ?? 'Studio overhead', money2(b.total)].join(' · '), chip: null,
      href: proj ? `/projects/${proj.id}/money?open=${encodeURIComponent(b.id)}` : `/company/finance/money-out?kind=bills&open=${encodeURIComponent(b.id)}`, icon: 'receipt_long', others: [b.ref, b.vendor], phones: [] })
  }
  return out
}
