import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, type Contract } from '@/lib/db/schema'

/* Lead Details › Contracts (931-38609) — one loader for the tab. Archived / deleted contracts leave the list. */

export type LeadContractsData = {
  contracts: Contract[]
  now: number
}

export async function fetchLeadContracts(leadId: string): Promise<LeadContractsData> {
  const rows = await db.select().from(contracts)
    .where(and(eq(contracts.leadId, leadId), isNull(contracts.archivedAt), isNull(contracts.deletedAt)))
    .orderBy(asc(contracts.createdAt))
  return { contracts: rows, now: Date.now() }
}
