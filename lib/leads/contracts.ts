import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leads, type Contract } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchViewer } from '@/lib/leads/visibility'
import type { ContractViewer } from '@/lib/contracts/policy'

/* Lead Details › Contracts (931-38609) — one loader for the tab. Archived / deleted contracts leave the list. */

export type LeadContractsData = {
  contracts: Contract[]
  /** (REG-591) Send together's defaults: the client's name and number, the studio's name for the draft. */
  lead: { name: string; phone: string }
  studioName: string
  /** (REG-631, contracts parity Q-04) Who is looking — moving a studio-marked signature back is an Owner's or an Admin's. */
  viewer: ContractViewer
  now: number
}

export async function fetchLeadContracts(leadId: string): Promise<LeadContractsData> {
  const [rows, [lead], brand, viewer] = await Promise.all([
    db.select().from(contracts)
      .where(and(eq(contracts.leadId, leadId), isNull(contracts.archivedAt), isNull(contracts.deletedAt)))
      .orderBy(asc(contracts.createdAt)),
    db.select({ name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, leadId)),
    fetchBrand(),
    fetchViewer(),
  ])
  return { contracts: rows, lead: { name: lead?.name ?? '', phone: lead?.phone ?? '' }, studioName: brand.details.name, viewer: { id: viewer.id, role: viewer.role }, now: Date.now() }
}
