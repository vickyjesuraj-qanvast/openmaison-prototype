'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadReturns, leadTasks, leads, returnAttachments, stageLogs, type LeadFile } from '@/lib/db/schema'
import { parseInputDateTime } from '@/lib/format'
import { canReturnLead } from '@/lib/leads/stage-policy'

/* Qanvast lead return (931:48236) + Invite to Portal (931:48844). Every action revalidates the lead's pages and the listings. */

const ME = 'dane'
const touch = (leadId: string) => { revalidatePath(`/leads/${leadId}`); revalidatePath('/leads'); revalidatePath('/qanvast-ops') }

export type ReturnInput = {
  reason: string
  /** d/m/yyyy, h:mm AM input string from the picker (REG-119) */
  firstOutreach: string
  attempts: number
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
  const now = new Date()
  const returnId = randomUUID(); const logId = randomUUID(); const taskId = randomUUID()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0)
  await db.insert(leadTasks).values({ id: taskId, leadId, title: 'Respond to Qanvast team', kind: 'General', dueAt: today, done: false, createdAt: now, creatorId: ME, seenAt: now, updatedAt: now })
  await db.insert(stageLogs).values({ id: logId, leadId, fromStage: lead.stage, toStage: 'Lost', payload: { reason: 'Lead returned to Qanvast' }, createdAt: now })
  await db.update(leads).set({ stage: 'Lost', updatedAt: now }).where(eq(leads.id, leadId))
  await db.insert(leadReturns).values({
    id: returnId, leadId, status: 'processing', returnedById: ME, returnedAt: now, reason: input.reason, createdAt: now,
    firstOutreachAt: parseInputDateTime(input.firstOutreach), attempts: input.attempts, comments: input.comments.trim() || null,
    stageBefore: lead.stage, stageLogId: logId, taskId,
  })
  if (input.fileIds.length) await db.insert(returnAttachments).values(input.fileIds.map((fileId) => ({ returnId, fileId, createdAt: now })))
  touch(leadId)
  return { returnId }
}

/** Snackbar Undo (931:48553): the lead goes back to its stage, the Lost log and the task disappear, the return is gone. */
export async function undoReturn(returnId: string): Promise<void> {
  const [ret] = await db.select().from(leadReturns).where(eq(leadReturns.id, returnId))
  if (!ret) return
  if (ret.stageBefore) await db.update(leads).set({ stage: ret.stageBefore, updatedAt: new Date() }).where(eq(leads.id, ret.leadId))
  if (ret.stageLogId) await db.delete(stageLogs).where(eq(stageLogs.id, ret.stageLogId))
  if (ret.taskId) await db.delete(leadTasks).where(eq(leadTasks.id, ret.taskId))
  await db.delete(leadReturns).where(eq(leadReturns.id, returnId))
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
