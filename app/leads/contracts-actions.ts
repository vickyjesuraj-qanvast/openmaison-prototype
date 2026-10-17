'use server'

import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { contracts, leads } from '@/lib/db/schema'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import { revalidateLead } from '@/lib/leads/queries'
import { applyContractStatus } from '@/lib/contracts/status'
import { canDeleteContract } from '@/lib/contracts/policy'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { logLeadEvent } from '@/lib/leads/events'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { deskRefusal, offDesk } from '@/lib/quotes/desk'   // (S45C) the editors' role rule (S44Z)
import type { Refusal } from '@/lib/company/template-rules'

/* Lead Details › Contracts (931-38609). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity, which prints every contract milestone. */
const touch = (leadId: string) => revalidateLead(leadId)



/** Status cell menu — the editor's rule (REG-631, parity Q-04 · Q-05): Signed keeps the copy as it stands; leaving Signed only for a
 *  studio-marked signature, only for an Owner or an Admin, clearing every signing stamp. */
export async function setContractStatus(contractId: string, status: ContractStatus): Promise<void | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  // (REG-286) Public endpoint, and `status` decides the stamped dates below as well as what the table prints.
  if (!(CONTRACT_STATUSES as readonly string[]).includes(status)) throw new Error(`Unknown contract status: ${String(status)}`)
  const [c] = await db.select().from(contracts).where(eq(contracts.id, contractId))
  if (!c) return
  await applyContractStatus(c, status)
  touch(c.leadId)
}

/** Row kebab › Archive — soft; `restore` is the snackbar's Undo. (REG-634, E-128) Each leaves a line in Activity. */
export async function archiveContract(contractId: string, restore = false): Promise<void | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  const [c] = await db.select({ leadId: contracts.leadId, title: contracts.title }).from(contracts).where(eq(contracts.id, contractId))
  if (!c) return
  await db.update(contracts).set({ archivedAt: restore ? null : new Date() }).where(eq(contracts.id, contractId))
  await logLeadEvent(db, c.leadId, restore ? 'contract_restored' : 'contract_archived', { title: c.title })
  touch(c.leadId); revalidatePath('/contracts')   // (sweep S2) Tools › Contracts lists it too
}

/**
 * (sweep S2 · U-07) Archived Contracts — as Archived Quotes: archiving took a contract off every list with no way back once the snackbar
 * had gone. The archived ones on a lead (or, with null, on every lead the member sees), newest first; Unarchive puts them back and says so
 * in Activity, as the snackbar's Undo does.
 */
export type ArchivedContractRow = { id: string; title: string; leadId: string; leadName: string; status: string; archivedAt: number }
export async function listArchivedContracts(leadId: string | null): Promise<ArchivedContractRow[]> {
  if (await offDesk()) return []   // (S45C) the editors' role rule (S44Z): Marketing reads nothing here
  const seen = await visibleLeadIds(await fetchViewer())
  const rows = await db.select({ c: contracts, leadName: leads.name }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId))
    .where(and(isNotNull(contracts.archivedAt), isNull(contracts.deletedAt), isNull(leads.deletedAt), leadId ? eq(contracts.leadId, leadId) : undefined))
  return rows.filter((r) => !seen || seen.has(r.c.leadId)).map((r) => ({ id: r.c.id, title: r.c.title, leadId: r.c.leadId, leadName: r.leadName, status: r.c.status, archivedAt: r.c.archivedAt!.getTime() }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}
export async function unarchiveContracts(contractIds: string[]): Promise<{ restored: number } | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  const seen = await visibleLeadIds(await fetchViewer())
  const rows = contractIds.length ? await db.select({ id: contracts.id, leadId: contracts.leadId, title: contracts.title }).from(contracts).where(and(inArray(contracts.id, contractIds), isNotNull(contracts.archivedAt), isNull(contracts.deletedAt))) : []
  const back = rows.filter((c) => !seen || seen.has(c.leadId))
  if (back.length) await db.update(contracts).set({ archivedAt: null }).where(inArray(contracts.id, back.map((c) => c.id)))
  for (const c of back) await logLeadEvent(db, c.leadId, 'contract_restored', { title: c.title })
  for (const leadId of new Set(back.map((c) => c.leadId))) touch(leadId)
  revalidatePath('/contracts')
  return { restored: back.length }
}

/** Row kebab › Delete — soft, so "Deleted Contracts" (header kebab) can list them later. (REG-634, parity Q-21) Only the contract's
 *  creator, an Owner or an Admin deletes it: the others in the list are left and counted back; who deleted it is kept. */
export async function deleteContracts(contractIds: string[]): Promise<{ deleted: number; refused: number } | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  if (!contractIds.length) return { deleted: 0, refused: 0 }
  const viewer = await fetchViewer()
  const rows = await db.select({ id: contracts.id, leadId: contracts.leadId, createdBy: contracts.createdBy }).from(contracts).where(and(inArray(contracts.id, contractIds), isNull(contracts.deletedAt)))
  const mine = rows.filter((c) => canDeleteContract(viewer, c))
  if (mine.length) await db.update(contracts).set({ deletedAt: new Date(), deletedBy: viewer.id ?? SESSION_MEMBER_ID }).where(inArray(contracts.id, mine.map((c) => c.id)))
  for (const leadId of new Set(mine.map((c) => c.leadId))) touch(leadId)
  revalidatePath('/contracts')
  return { deleted: mine.length, refused: rows.length - mine.length }
}
