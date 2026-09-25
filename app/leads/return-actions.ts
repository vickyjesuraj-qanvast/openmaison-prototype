'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadReturns, leadTasks, leads, returnAttachments, stageLogs, type LeadFile } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'
import { parseInputDateTime } from '@/lib/format'
import { revalidateLead } from '@/lib/leads/queries'
import { canReturnLead } from '@/lib/leads/stage-policy'
import { REASON_LABELS, REFUSED_SUB_REASONS, WRONG_FIELDS } from '@/lib/leads/return-model'
import { notify } from '@/lib/notifications/emit'
import { logLeadEvent } from '@/lib/leads/events'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'

/* Qanvast lead return (931:48236) + Invite to Portal (931:48844). Every action revalidates the lead's pages and the listings. */

const ME = sessionMemberSql   // (REG-286 · REG-667) the signed-in member, resolved inside each write (lib/db/session.ts)
/** (REG-286) One shared eviction for every detail tab — a return writes a task and a stage log the Tasks and Activity tabs show. */
const touch = (leadId: string) => revalidateLead(leadId)

export type ReturnInput = {
  reason: string
  /** (REG-609, parity D-39) The reason's own fields: the ticked sub-reasons ("Lead refused to meet up") and the detail line
   *  (the duplicate searched for · the existing project reference · what is incorrect). */
  subReasons?: string[]
  detail?: string
  /** d/m/yyyy, h:mm AM input string from the picker (REG-119) — the two contact reasons ask for it, the rest leave it empty */
  firstOutreach: string
  attempts: number | null
  comments: string
  fileIds: string[]
}

/**
 * Return Lead › Confirm (931:49009 → 931:48553): the return opens in "processing", the lead moves to Lost (one stage log),
 * and a "Respond to Qanvast team" task is due today. Everything is remembered on the return row so Undo can reverse it.
 */
export async function returnLead(leadId: string, input: ReturnInput): Promise<{ returnId: string }> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId))
  if (!lead) throw new Error('lead not found')
  // Server twin of the menus' rule (lib/leads/stage-policy.ts canReturnLead): not Qanvast-sourced, or the latest return is still
  // processing / already approved → refuse, so a stale menu can never stack a second return, Lost→Lost log and duplicate task.
  const [latest] = await db.select({ status: leadReturns.status }).from(leadReturns).where(eq(leadReturns.leadId, leadId)).orderBy(desc(leadReturns.returnedAt)).limit(1)
  if (!canReturnLead({ source: lead.source, returnStatus: latest?.status })) throw new Error('This lead cannot be returned')
  if (!REASON_LABELS.includes(input.reason)) throw new Error('unknown reason')   // (REG-285) the vocabulary, not a client string
  const subReasons = (input.subReasons ?? []).filter((r) => (REFUSED_SUB_REASONS as readonly string[]).includes(r))
  const detail = (input.detail ?? '').trim().slice(0, 200)
  if (input.reason === 'Wrong contact info' && detail && !(WRONG_FIELDS as readonly string[]).includes(detail)) throw new Error('unknown field')
  const now = new Date()
  const returnId = randomUUID(); const logId = randomUUID(); const taskId = randomUUID()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0)
  /* (REG-286) One transaction. These five writes are a single act, and the return row is the LAST of them while Undo
     keys off it: a failure partway left the lead sitting in Lost, with a Lost stage log and a "Respond to Qanvast
     team" task, and no return record — so the LEAD RETURNED card never appeared, the snackbar's Undo had nothing to
     reverse, and `canReturnLead` (which reads the latest return) happily offered Return Lead a second time. */
  await db.transaction(async (tx) => {
    await tx.insert(leadTasks).values({ id: taskId, leadId, title: 'Respond to Qanvast team', kind: 'General', dueAt: today, done: false, createdAt: now, creatorId: ME, seenAt: now, updatedAt: now })
    await tx.insert(stageLogs).values({ id: logId, leadId, fromStage: lead.stage, toStage: 'Lost', payload: { reason: 'Lead returned to Qanvast' }, createdAt: now })
    await tx.update(leads).set({ stage: 'Lost', updatedAt: now }).where(eq(leads.id, leadId))
    await tx.insert(leadReturns).values({
      id: returnId, leadId, status: 'processing', returnedById: ME, returnedAt: now, reason: input.reason, createdAt: now,
      firstOutreachAt: input.firstOutreach ? parseInputDateTime(input.firstOutreach) : null, attempts: input.attempts, comments: input.comments.trim() || null,
      subReasons: subReasons.length ? JSON.stringify(subReasons) : null, detail: detail || null,   /* (REG-609) */
      stageBefore: lead.stage, stageLogId: logId, taskId,
    })
    if (input.fileIds.length) await tx.insert(returnAttachments).values(input.fileIds.map((fileId) => ({ returnId, fileId, createdAt: now })))
  })
  /* (REG-608) The return parks the lead as Lost — a stage change like any other. */
  await notify('stage_changed', [...(await studioRunnerIds()), ...(await leadMemberIds(leadId))], { title: `${lead.name}: ${lead.stage} → Lost`, body: 'Lost · Lead returned to Qanvast', href: `/leads/${leadId}`, leadId })
  touch(leadId)
  return { returnId }
}

/** Snackbar Undo (931:48553): the lead goes back to its stage, the Lost log and the task disappear, the return is gone. */
export async function undoReturn(returnId: string): Promise<void> {
  const [ret] = await db.select().from(leadReturns).where(eq(leadReturns.id, returnId))
  if (!ret) return
  // (REG-286) The mirror of returnLead, and just as indivisible: half an undo is a lead back in Contacted that
  // Qanvast Ops still lists as returned, or a return row whose stage log and task are already gone.
  await db.transaction(async (tx) => {
    if (ret.stageBefore) await tx.update(leads).set({ stage: ret.stageBefore, updatedAt: new Date() }).where(eq(leads.id, ret.leadId))
    if (ret.stageLogId) await tx.delete(stageLogs).where(eq(stageLogs.id, ret.stageLogId))
    if (ret.taskId) await tx.delete(leadTasks).where(eq(leadTasks.id, ret.taskId))
    await tx.delete(leadReturns).where(eq(leadReturns.id, returnId))
  })
  await logLeadEvent(db, ret.leadId, 'return_undone', { reason: ret.reason })   /* (REG-613) the undone return leaves no row */
  touch(ret.leadId)
}

/**
 * The listing has no files in memory: the Return Lead wizard opened from a row / kanban card (931:48813) fetches the lead's
 * untrashed, non-folder files here for its "Attach images/screenshots" tiles (same set the overview passes from `detail.files`).
 */
export async function fetchLeadFilesForReturn(leadId: string): Promise<LeadFile[]> {
  const rows = await db.select().from(leadFiles).where(and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt))
  return rows.filter((f) => f.kind !== 'folder')
}
