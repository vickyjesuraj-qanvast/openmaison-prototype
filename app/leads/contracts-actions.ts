'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts } from '@/lib/db/schema'
import { type ContractStatus } from '@/lib/leads/contract-filters'

/* Lead Details › Contracts (931-38609). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const touch = (leadId: string) => { revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/contracts`); revalidatePath('/leads') }

const CONTRACT_TITLE = 'General Contract Agreement'

/**
 * Title from the lead's own count, the way quotes number themselves: the first contract is the mock's row
 * (931:38692, "General Contract Agreement"), each later one is numbered so no two rows — or signed copies,
 * named "<title>.pdf" — read alike.
 */
async function nextTitle(leadId: string): Promise<string> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(contracts).where(eq(contracts.leadId, leadId))
  const n = row?.n ?? 0
  return n ? `${CONTRACT_TITLE} ${n + 1}` : CONTRACT_TITLE
}

/** New Contract › From Blank / empty state › From Scratch (REG-178): a Draft titled as the mock's row, "General Contract Agreement". */
export async function createContract(leadId: string): Promise<string> {
  const id = randomUUID(); const now = new Date()
  await db.insert(contracts).values({ id, leadId, title: await nextTitle(leadId), status: 'Draft', createdAt: now, updatedAt: now })
  touch(leadId); return id
}

async function leadOf(contractId: string): Promise<string | null> {
  const [c] = await db.select({ leadId: contracts.leadId }).from(contracts).where(eq(contracts.id, contractId))
  return c?.leadId ?? null
}

/** Status cell menu. Sent to Client stamps Sent (first time); Signed stamps the signed date and names the signed copy "<title>.pdf". */
export async function setContractStatus(contractId: string, status: ContractStatus): Promise<void> {
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
