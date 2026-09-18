'use server'

import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts } from '@/lib/db/schema'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import { revalidateLead } from '@/lib/leads/queries'

/* Lead Details › Contracts (931-38609). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity, which prints every contract milestone. */
const touch = (leadId: string) => revalidateLead(leadId)


/** (REG-534) From Blank / the `?new=1` landing: the editor's own create — the starter agreement, the lead's client as recipient. */
export async function createContract(leadId: string): Promise<string> {
  const { createContractDoc } = await import('@/app/contracts/actions')
  return createContractDoc({ leadId })
}

async function leadOf(contractId: string): Promise<string | null> {
  const [c] = await db.select({ leadId: contracts.leadId }).from(contracts).where(eq(contracts.id, contractId))
  return c?.leadId ?? null
}

/** Status cell menu. Sent to Client stamps Sent (first time); Signed stamps the signed date and names the signed copy "<title>.pdf". */
export async function setContractStatus(contractId: string, status: ContractStatus): Promise<void> {
  // (REG-286) Public endpoint, and `status` decides the stamped dates below as well as what the table prints.
  if (!(CONTRACT_STATUSES as readonly string[]).includes(status)) throw new Error(`Unknown contract status: ${String(status)}`)
  const [c] = await db.select().from(contracts).where(eq(contracts.id, contractId))
  if (!c) return
  const now = new Date()
  const patch: Partial<typeof contracts.$inferInsert> = { status, updatedAt: now }
  if ((status === 'Sent to Client' || status === 'Signed') && !c.sentAt) patch.sentAt = now
  if (status === 'Signed' && !c.signedAt) { patch.signedAt = now; patch.signedCopy = `${c.title}.pdf` }
  await db.update(contracts).set(patch).where(eq(contracts.id, contractId))
  touch(c.leadId)
}

/** Row kebab › Archive — soft; `restore` is the snackbar's Undo. */
export async function archiveContract(contractId: string, restore = false): Promise<void> {
  const leadId = await leadOf(contractId); if (!leadId) return
  await db.update(contracts).set({ archivedAt: restore ? null : new Date() }).where(eq(contracts.id, contractId))
  touch(leadId)
}

/** Row kebab › Delete — soft, so "Deleted Contracts" (header kebab) can list them later. */
export async function deleteContracts(contractIds: string[]): Promise<void> {
  if (!contractIds.length) return
  const leadId = await leadOf(contractIds[0]!); if (!leadId) return
  await db.update(contracts).set({ deletedAt: new Date() }).where(inArray(contracts.id, contractIds))
  touch(leadId)
}
