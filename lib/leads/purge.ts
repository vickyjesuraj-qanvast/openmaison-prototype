import 'server-only'
import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationMessages, conversations, leadAssignees, leadTasks, leads, projects, quoteComparisons, spaceLayouts, stageLogs } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'

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

/**
 * (fix-E, E-01 · E-09 — the rule Delete Forever and Empty Trash used inline, now shared with the 30-day purge below) Of the leads asked for,
 * the ones Deleted Leads lists — in the trash, never a direct project's client record (that leaves with its project, from Deleted Projects) —
 * split into the leads free to go and the leads a project keeps: a live project (delete the project first, Q-27) or one in Deleted Projects
 * (`projects.lead_id` cascades, so purging the lead would take the project with it, unseen). The kept ones are named for the caller's answer.
 */
export async function splitKept(leadIds: string[]): Promise<{ free: string[]; kept: KeptLead[] }> {
  const listed = leadIds.length ? await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt), eq(leads.direct, false))) : []
  if (!listed.length) return { free: [], kept: [] }
  const projs = await db.select({ id: projects.id, leadId: projects.leadId, number: projects.number, deletedAt: projects.deletedAt }).from(projects).where(inArray(projects.leadId, listed.map((l) => l.id)))
  const kept: KeptLead[] = []
  const free: string[] = []
  for (const l of listed) {
    const p = projs.find((x) => x.leadId === l.id)
    if (p) kept.push({ name: titleCaseName(l.name), projectId: p.id, number: p.number, deleted: !!p.deletedAt })
    else free.push(l.id)
  }
  return { free, kept }
}

/**
 * (pending modules S46C · R1 — her "fix everything" 2026-10-19 after the findability audit, finding L-1) How long Deleted Leads keeps a lead.
 * The mock's words promise it — the delete dialog's "will be permanently deleted in 30 days" (779:26316's family) and the sheet's "Deleted leads
 * are permanently removed after 30 days" — and until now nothing removed them (1.0 dropped the same promise for the same reason).
 */
export const LEAD_TRASH_DAYS = 30
const DAY_MS = 86_400_000

/**
 * (pending modules S46C · R1) The trash's promise, kept: every lead deleted MORE than LEAD_TRASH_DAYS ago is removed for good through
 * `purgeLeads` — the one removal Delete Forever uses — by Delete Forever's own rule (`splitKept`): a lead a project keeps stays in Deleted Leads
 * (the sheet already says which project and why), a direct project's client record is never this trash's to remove. Nothing is recorded beyond
 * the removal itself, as with Delete Forever (the lead's records go with it). Idempotent: a lead purged is gone, so a second run finds nothing;
 * two runs at once remove each lead once (`purgeLeads` re-reads inside its transaction). Run by the sweep (`lib/services/sweep.ts`, job
 * `deleted-leads`, daily) and lazily whenever Deleted Leads is read (`fetchDeletedLeads`, the listing's page) — the prototype has no scheduler,
 * the way repeating expenses are logged (`raiseDueRepeats`). Answers how many went.
 */
export async function purgeExpiredLeads(now: number = Date.now()): Promise<number> {
  const cutoff = new Date(now - LEAD_TRASH_DAYS * DAY_MS)
  const due = await db.select({ id: leads.id }).from(leads).where(and(isNotNull(leads.deletedAt), lt(leads.deletedAt, cutoff), eq(leads.direct, false)))
  if (!due.length) return 0   // the usual answer: one read, no write
  const { free } = await splitKept(due.map((d) => d.id))
  return purgeLeads(free)
}
