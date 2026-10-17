import 'server-only'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationMessages, conversations, leadAssignees, leadTasks, leads, quoteComparisons, spaceLayouts, stageLogs } from '@/lib/db/schema'

/** (fix-E, E-09) A lead Delete Forever / Empty Trash left in Deleted Leads, and the project that kept it. */
export type KeptLead = { name: string; projectId: string; number: string; /** the project is in Deleted Projects (else it is live) */ deleted: boolean }

/**
 * (fix-E, E-01) The one removal of leads for good — Deleted Leads' Delete Forever / Empty Trash, and a direct project's client record when
 * its project is deleted forever (`deleteProjectsForever`). Only leads already in the trash; their tasks, members, stage logs and Quote X-Ray
 * readings go with them (REG-641). The callers decide which leads may go — this only removes them. Answers how many went.
 */
export async function purgeLeads(leadIds: string[]): Promise<number> {
  if (!leadIds.length) return 0
  let n = 0
  await db.transaction(async (tx) => {
    const gone = await tx.select({ id: leads.id }).from(leads).where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt)))
    const ids = gone.map((g) => g.id)
    if (ids.length === 0) return
    await tx.delete(leadTasks).where(inArray(leadTasks.leadId, ids))
    await tx.delete(leadAssignees).where(inArray(leadAssignees.leadId, ids))
    await tx.delete(stageLogs).where(inArray(stageLogs.leadId, ids))
    await tx.delete(quoteComparisons).where(inArray(quoteComparisons.leadId, ids))   // (REG-641, X-Ray parity Q-21) a lead gone for good takes its readings
    await tx.delete(spaceLayouts).where(inArray(spaceLayouts.leadId, ids))   // (gaps build J) …and its 3D layouts (their client links go with them)
    /* (pending modules S26) …and its Team conversation before Won (its lines first — the table's cascade may not be on) */
    const talk = (await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.kind, 'lead'), inArray(conversations.leadId, ids)))).map((c) => c.id)
    if (talk.length) { await tx.delete(conversationMessages).where(inArray(conversationMessages.conversationId, talk)); await tx.delete(conversations).where(inArray(conversations.id, talk)) }
    await tx.delete(leads).where(inArray(leads.id, ids))
    n = ids.length
  })
  return n
}
