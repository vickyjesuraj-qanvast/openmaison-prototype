'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadReturns, leadTasks, leads, projects, returnAttachments, stageLogs, type LeadFile } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { parseInputDateTime } from '@/lib/format'
import { revalidateLead } from '@/lib/leads/queries'
import { canReturnLead, projectHoldsWon } from '@/lib/leads/stage-policy'
import { REASON_LABELS, REFUSED_SUB_REASONS, WRONG_FIELDS } from '@/lib/leads/return-model'
import { notify } from '@/lib/notifications/emit'
import { logLeadEvent } from '@/lib/leads/events'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'

/* Qanvast lead return (931:48236) + Invite to Portal (931:48844). Every action revalidates the lead's pages and the listings. */

/* (REG-286 · REG-667 · pending modules S43A) Every write stamp is the signed-in member — this browser's (`sessionMemberId()`), read before a
   transaction opens and passed in as a value. */
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
  /** (pending modules S05 — the card's "Appeal a rejected return … revisit: a rejected return's only way forward is a dead link") the rejected
      return this one appeals: the same lead's latest return, rejected by Qanvast. The appeal is a return again, with more to go on. */
  appealOf?: string | null
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
  /* (pending modules S05) an appeal names the return Qanvast rejected — the lead's latest, and rejected; anything else is refused */
  const appealOf = input.appealOf ? String(input.appealOf) : null
  if (appealOf) {
    const [last] = await db.select({ id: leadReturns.id, status: leadReturns.status }).from(leadReturns).where(eq(leadReturns.leadId, leadId)).orderBy(desc(leadReturns.returnedAt)).limit(1)
    if (!last || last.id !== appealOf || last.status !== 'rejected') throw new Error('Only the latest return Qanvast rejected can be appealed')
  }
  /* (fix-E, A-01) a return parks the lead as Lost — a lead whose project is live stays Won (the menus no longer offer it) */
  const [held] = await db.select({ number: projects.number }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  if (held) throw new Error(projectHoldsWon(held.number))
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
  /* (pending modules S05) a lead already parked as Lost (its first return put it there) stays put — no second Lost → Lost move */
  const moves = lead.stage !== 'Lost'
  const me = await sessionMemberId()
  await db.transaction(async (tx) => {
    await tx.insert(leadTasks).values({ id: taskId, leadId, title: 'Respond to Qanvast team', kind: 'General', dueAt: today, done: false, createdAt: now, creatorId: me, seenAt: now, updatedAt: now })
    if (moves) {
      await tx.insert(stageLogs).values({ id: logId, leadId, fromStage: lead.stage, toStage: 'Lost', payload: { reason: 'Lead returned to Qanvast' }, createdAt: now })
      await tx.update(leads).set({ stage: 'Lost', updatedAt: now }).where(eq(leads.id, leadId))
    }
    await tx.insert(leadReturns).values({
      id: returnId, leadId, status: 'processing', returnedById: me, returnedAt: now, reason: input.reason, createdAt: now,
      firstOutreachAt: input.firstOutreach ? parseInputDateTime(input.firstOutreach) : null, attempts: input.attempts, comments: input.comments.trim() || null,
      subReasons: subReasons.length ? JSON.stringify(subReasons) : null, detail: detail || null,   /* (REG-609) */
      stageBefore: lead.stage, stageLogId: moves ? logId : null, taskId, appealOf,
    })
    if (input.fileIds.length) await tx.insert(returnAttachments).values(input.fileIds.map((fileId) => ({ returnId, fileId, createdAt: now })))
  })
  /* (REG-608) The return parks the lead as Lost — a stage change like any other. */
  if (moves) await notify('stage_changed', [...(await studioRunnerIds()), ...(await leadMemberIds(leadId))], { title: `${lead.name}: ${lead.stage} → Lost`, body: appealOf ? 'Lost · Return appealed to Qanvast' : 'Lost · Lead returned to Qanvast', href: `/leads/${leadId}`, leadId })
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
  await logLeadEvent(db, ret.leadId, 'return_undone', { reason: ret.reason, ...(ret.appealOf ? { kind: 'appeal' } : {}) })   /* (REG-613) the undone return leaves no row · (S42 B-08) an appeal taken back says so */
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

/* ── (pending modules S05 — card held:leads, "Return a lead: Appeal a rejected return (the 'here' link and the Returned card's banner), the
   policy behind the info icon, Tips › View all, deleting evidence — Coming soon · revisit: a rejected return's only way forward is a dead link") ── */

/** What an appeal starts from: the rejected return as the studio sent it — its reason and fields, its files — and Qanvast's reply. */
export type AppealDraft = {
  id: string; reason: string; subReasons: string[]; detail: string | null; firstOutreach: string; attempts: number | null; comments: string
  files: LeadFile[]; reply: string | null; repliedAt: Date | null
  /** The days Qanvast gave to appeal, as its reply said (the LEAD RETURNED card's "within n days"). */
  appealDays: number | null
}

/** The lead's latest return when Qanvast rejected it — the appeal's starting point; null for anything else (never returned, still with
    Qanvast, approved). Who sees leads decides, as the lead's own page does. */
export async function fetchAppealDraft(leadId: string): Promise<AppealDraft | null> {
  const { canOpenLead, fetchViewer } = await import('@/lib/leads/visibility')
  if (!(await canOpenLead(await fetchViewer(), leadId))) return null
  const [ret] = await db.select().from(leadReturns).where(eq(leadReturns.leadId, leadId)).orderBy(desc(leadReturns.returnedAt)).limit(1)
  if (!ret || ret.status !== 'rejected') return null
  const links = await db.select({ fileId: returnAttachments.fileId }).from(returnAttachments).where(eq(returnAttachments.returnId, ret.id)).orderBy(asc(returnAttachments.createdAt))
  const files = links.length ? (await db.select().from(leadFiles).where(and(eq(leadFiles.leadId, leadId), isNull(leadFiles.deletedAt)))).filter((f) => links.some((l) => l.fileId === f.id)) : []
  const { parseSubReasons } = await import('@/lib/leads/return-model')
  const { formatInputDateTime } = await import('@/lib/format')
  return {
    id: ret.id, reason: ret.reason, subReasons: parseSubReasons(ret.subReasons), detail: ret.detail ?? null,
    firstOutreach: ret.firstOutreachAt ? formatInputDateTime(ret.firstOutreachAt) : '', attempts: ret.attempts ?? null, comments: ret.comments ?? '',
    files: links.map((l) => files.find((f) => f.id === l.fileId)).filter((f): f is LeadFile => !!f), reply: ret.replyReason ?? ret.statusText ?? null, repliedAt: ret.repliedAt ?? null,
    appealDays: ret.appealDays ?? null,
  }
}

const WITH_QANVAST = 'Only a return still with Qanvast can lose a file — once Qanvast has answered, the files it read stay with its answer'

/** A file taken off a return Qanvast has not answered yet (picked by mistake, or private): the file stays in the lead's Files; Undo puts it
    back. Once Qanvast has answered, the files it decided on stay with the return. Refusals answer `{ error }`. */
export async function removeReturnAttachment(returnId: string, fileId: string): Promise<{ undo: { returnId: string; fileId: string; createdAt: number; eventId: string | null } } | { error: string }> {
  const [ret] = await db.select().from(leadReturns).where(eq(leadReturns.id, String(returnId)))
  if (!ret) return { error: 'This return is not there any more' }
  const { canOpenLead, fetchViewer } = await import('@/lib/leads/visibility')
  if (!(await canOpenLead(await fetchViewer(), ret.leadId))) return { error: 'This return is not there any more' }
  if (ret.status !== 'processing') return { error: WITH_QANVAST }
  const [link] = await db.select().from(returnAttachments).where(and(eq(returnAttachments.returnId, ret.id), eq(returnAttachments.fileId, String(fileId))))
  if (!link) return { error: 'That file is not on the return any more' }
  const [file] = await db.select({ name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.id, link.fileId))
  await db.delete(returnAttachments).where(and(eq(returnAttachments.returnId, ret.id), eq(returnAttachments.fileId, link.fileId)))
  const eventId = await logLeadEvent(db, ret.leadId, 'return_evidence_removed', { name: file?.name ?? 'a file' })
  touch(ret.leadId)
  return { undo: { returnId: ret.id, fileId: link.fileId, createdAt: link.createdAt.getTime(), eventId } }
}

/** The remove's Undo: the file back on the return, in its place, and the remove's line gone from Activity. */
export async function restoreReturnAttachment(u: { returnId: string; fileId: string; createdAt: number; eventId: string | null }): Promise<{ ok: true } | { error: string }> {
  const [ret] = await db.select().from(leadReturns).where(eq(leadReturns.id, String(u?.returnId)))
  if (!ret) return { error: 'This return is not there any more' }
  if (ret.status !== 'processing') return { error: WITH_QANVAST }
  const [file] = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.id, String(u.fileId)), eq(leadFiles.leadId, ret.leadId), isNull(leadFiles.deletedAt)))
  if (!file) return { error: 'That file is not in the lead’s Files any more' }
  const [had] = await db.select().from(returnAttachments).where(and(eq(returnAttachments.returnId, ret.id), eq(returnAttachments.fileId, file.id)))
  if (!had) await db.insert(returnAttachments).values({ returnId: ret.id, fileId: file.id, createdAt: new Date(Number(u.createdAt) || Date.now()) })
  if (u.eventId) { const { dropLeadEvents } = await import('@/lib/leads/events'); await dropLeadEvents([String(u.eventId)]) }
  touch(ret.leadId)
  return { ok: true }
}
