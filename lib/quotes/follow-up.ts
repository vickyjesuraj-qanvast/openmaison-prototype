import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leadTasks } from '@/lib/db/schema'

/*
 * (the Dashboard redesigned, 2026-10-26 — P-14, his Build mark; a bug B's study found, REG-470's follow-up) A quote's due date raises one
 * follow-up task on its lead — "Follow up on quote OM-10001", "chase the client for a decision before then" (`setQuoteDue`). Once the client
 * has decided — the quote Confirmed or Signed, by any path: their Confirm on the link, a status marked by hand, a variation order approved by
 * hand, the contract it was raised from signed (online, in a bundle, marked, from a list, the Won step's upload) — there is nothing left to
 * chase: its open follow-up is done. It closed only when its date was cleared, so it stayed on My tasks, Your day and the bell, late, for a
 * quote already signed. The mark's Undo opens it again (`reopenQuoteFollowUps`), so the way back leaves everything as it was. A completed
 * follow-up stays as history; the closing writes no Activity line of its own (the confirmation or the signature is the line, as a contract's
 * own follow-up closes on signing — lib/contracts/automation.ts `afterSigned`).
 */

/** A quote's status that settles its follow-up: the client has said yes. */
export const settlesFollowUp = (status: string | null | undefined): boolean => status === 'Confirmed' || status === 'Signed'

/** The quote's open follow-ups (one, by `setQuoteDue`'s rule — a list, so an older second one closes too). */
export async function openQuoteFollowUps(quoteId: string): Promise<string[]> {
  return (await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.quoteId, quoteId), eq(leadTasks.done, false)))).map((r) => r.id)
}

/** Close the quote's open follow-ups — answers the ids it closed (what an Undo opens again). */
export async function closeQuoteFollowUps(quoteId: string): Promise<string[]> {
  const ids = await openQuoteFollowUps(quoteId)
  if (!ids.length) return []
  await db.update(leadTasks).set({ done: true, updatedAt: new Date() }).where(and(inArray(leadTasks.id, ids), eq(leadTasks.done, false)))
  revalidatePath('/tasks')
  return ids
}

/** An Undo's way back: the follow-ups this quote's mark closed are open again — only this quote's, only those still done. */
export async function reopenQuoteFollowUps(quoteId: string, ids: readonly string[] | null | undefined): Promise<number> {
  const list = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64).slice(0, 20)
  if (!list.length) return 0
  const rows = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(inArray(leadTasks.id, list), eq(leadTasks.quoteId, quoteId), eq(leadTasks.done, true)))
  if (!rows.length) return 0
  await db.update(leadTasks).set({ done: false, updatedAt: new Date() }).where(inArray(leadTasks.id, rows.map((r) => r.id)))
  revalidatePath('/tasks')
  return rows.length
}
