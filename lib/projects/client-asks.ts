import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, leadTasks, projectMessages, projectTickets, quoteItems, quotes } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { fetchStudio } from '@/lib/settings/queries'
import { parseDiscounts, quoteTotals } from '@/lib/quotes/math'
import { ASK_TITLE_MAX, ASK_VO_TITLE_MAX, askDescription, askFallbackTitle, askSourceLine, askTitle, type AskLinks, type AskSource } from './client-asks-model'

/*
 * (simplify S-22, her "build everything" 2026-10-09) The client asks, on the server: a task or a variation order made from a client's message
 * or ticket, the client's words carried over, and the ask's link to what it made. (simplify round 2, her "fix all the pending things"
 * 2026-10-09) The link lives on the record: `project_messages.task_id · variation_id` and `project_tickets.task_id · variation_id` (migration
 * 0084 — the floor plan's columns, `floor_plan_marks.task_id · variation_id`, the model), written when Make a task / Raise a variation order
 * runs and read by the ask menu (*Open the task* · *Open VO-n*). The `lead_events` line each press writes stays (kinds `project_ask_task` ·
 * `project_ask_vo`, `detail.source` · `ref` the message or ticket · `id` the task or order) — it is who did it and when, and Activity's sentence
 * (lib/leads/activity.ts). Round 1's lines were moved onto the rows by the repair (R2-D's block). Who may: the caller's rule (the project's team,
 * Managers, Owners, Admins — `mayChangeProject`); money's own rule for the order (`createVariationOrder`).
 */
type Refusal = { error: string }
const TASK_KIND = 'project_ask_task'
const VO_KIND = 'project_ask_vo'
type AskDetail = { source?: AskSource; ref?: string; id?: string; title?: string; number?: string }

/** The messages' or the tickets' own links — what a press made, as the rows keep it. */
async function linksOf(projectId: string, source: AskSource, refs?: string[]): Promise<{ ref: string; taskId: string | null; voId: string | null }[]> {
  if (refs && !refs.length) return []
  const t = source === 'message' ? projectMessages : projectTickets
  return db.select({ ref: t.id, taskId: t.taskId, voId: t.variationId }).from(t)
    .where(and(eq(t.projectId, projectId), or(isNotNull(t.taskId), isNotNull(t.variationId)), refs ? inArray(t.id, refs) : undefined))
}

/** Each ask's task and variation order on a project, by the message's or ticket's id — only what is still there (a task deleted, an order
    deleted: the row's link stays, the menu offers to make one again, and a new one takes the link). */
export async function asksOf(projectId: string, source: AskSource, refs?: string[]): Promise<Record<string, AskLinks>> {
  const rows = await linksOf(projectId, source, refs)
  const out: Record<string, AskLinks> = {}
  if (!rows.length) return out
  const taskIds = [...new Set(rows.map((r) => r.taskId).filter((x): x is string => !!x))]
  const voIds = [...new Set(rows.map((r) => r.voId).filter((x): x is string => !!x))]
  const [tasks, vos] = await Promise.all([
    taskIds.length ? db.select({ id: leadTasks.id, title: leadTasks.title, done: leadTasks.done }).from(leadTasks).where(inArray(leadTasks.id, taskIds)) : Promise.resolve([]),
    voIds.length ? db.select({ id: quotes.id, number: quotes.number, status: quotes.status }).from(quotes).where(and(inArray(quotes.id, voIds), isNull(quotes.deletedAt))) : Promise.resolve([]),
  ])
  for (const r of rows) {
    const t = r.taskId ? tasks.find((x) => x.id === r.taskId) : undefined
    const q = r.voId ? vos.find((x) => x.id === r.voId) : undefined
    if (!t && !q) continue
    out[r.ref] = { task: t ? { id: t.id, title: t.title, done: t.done } : null, vo: q ? { id: q.id, number: q.number, status: q.status } : null }
  }
  return out
}

/** The message's or ticket's own link to what it made (round 2: the record keeps it). */
async function keepLink(source: AskSource, ref: string, link: { taskId: string } | { variationId: string }): Promise<void> {
  if (source === 'message') await db.update(projectMessages).set(link).where(eq(projectMessages.id, ref))
  else await db.update(projectTickets).set(link).where(eq(projectTickets.id, ref))
}

const logAsk = async (o: { leadId: string; projectId: string; kind: typeof TASK_KIND | typeof VO_KIND; detail: AskDetail }) =>
  db.insert(leadEvents).values({ id: randomUUID(), leadId: o.leadId, projectId: o.projectId, kind: o.kind, actorId: await sessionMemberId(), at: new Date(), detail: o.detail })

export type AskInput = {
  leadId: string; projectId: string; source: AskSource
  /** the message's or the ticket's id */
  ref: string
  /** the client's words — the task's title, the order's first line */
  words: string
  /** a ticket's own words under its subject — the task's description and the line's, where `words` is the subject */
  detail?: string | null
  /** who asked, as their name reads, and when */
  client: string; at: number
  /** a ticket's number */
  number?: string | null
  /** whoever pressed — the task is theirs (the floor plan's rule) */
  memberId: string
}

/** Make a task from a client's ask — or answer the one already made. */
export async function makeAskTask(o: AskInput): Promise<{ taskId: string; title: string; made: boolean }> {
  const have = (await asksOf(o.projectId, o.source, [o.ref]))[o.ref]?.task
  if (have) return { taskId: have.id, title: have.title, made: false }
  const words = o.words.trim()
  const title = askTitle(words || askFallbackTitle(o.client, o.source), ASK_TITLE_MAX)
  const line = askSourceLine({ source: o.source, client: o.client, at: o.at, number: o.number })
  const said = [words, o.detail?.trim() ?? ''].filter(Boolean).join('\n')
  const { createTask } = await import('@/app/leads/tasks-actions')   // read when pressed: this module sits under the project's reads, the actions above them
  const taskId = await createTask(o.leadId, title, { description: said ? askDescription(line, said) : `${line}.`, assignees: [o.memberId] })
  await keepLink(o.source, o.ref, { taskId })   // (simplify round 2) the record keeps it
  await logAsk({ leadId: o.leadId, projectId: o.projectId, kind: TASK_KIND, detail: { source: o.source, ref: o.ref, id: taskId, title } })
  return { taskId, title, made: true }
}

/**
 * Raise a variation order from a client's ask — money's own `createVariationOrder` (its rule, its numbering, the signed quote's entity and
 * GST), titled with the client's words, its first line their words at no price yet (the studio prices it in the editor) in a "Client’s
 * requests" section, as a pick's order carries "Client’s choices". One per ask: a second press answers the one already raised.
 */
export async function raiseAskVariation(o: Omit<AskInput, 'memberId'>): Promise<{ id: string; number: string; made: boolean } | Refusal> {
  const have = (await asksOf(o.projectId, o.source, [o.ref]))[o.ref]?.vo
  if (have) return { id: have.id, number: have.number, made: false }
  const { createVariationOrder } = await import('@/app/projects/money-actions')   // money's own — its rule, its numbering
  const vo = await createVariationOrder(o.projectId)
  if ('error' in vo) return vo
  const words = o.words.trim() || askFallbackTitle(o.client, o.source)
  const name = askTitle(words, ASK_TITLE_MAX)
  const title = askTitle(words, ASK_VO_TITLE_MAX)
  const [q] = await db.select().from(quotes).where(eq(quotes.id, vo.id)).limit(1)
  if (!q) return { error: 'Couldn’t raise the variation order' }
  const studio = await fetchStudio()
  const gst = q.gstEnabled ? studio.gstPct : 0
  const now = new Date(), groupId = randomUUID()
  await db.insert(quoteItems).values([
    { id: groupId, quoteId: q.id, parentId: null, kind: 'group', position: 0, name: 'Client’s requests', status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: gst, createdAt: now, updatedAt: now },   // (invented copy)
    { id: randomUUID(), quoteId: q.id, parentId: groupId, kind: 'item', position: 0, name, description: (o.detail?.trim() || (words.length > name.length ? words : '')).slice(0, 2000) || null, status: 'Pending', qty: 1, unit: 'Lot', costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: gst, createdAt: now, updatedAt: now },
  ])
  const lines = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, q.id))
  const t = quoteTotals(lines, { ...q, discounts: parseDiscounts(q.discountsJson) })
  await db.update(quotes).set({ title, amountMinor: t.totalMinor, updatedAt: now }).where(eq(quotes.id, q.id))
  /* the line money wrote names the order as it was made — it carries the client's words now (the pick's order does the same) */
  await db.update(leadEvents).set({ detail: sql`json_set(${leadEvents.detail}, '$.title', ${title})` })
    .where(and(eq(leadEvents.projectId, o.projectId), eq(leadEvents.kind, 'project_vo_created'), sql`json_extract(${leadEvents.detail}, '$.id') = ${q.id}`))
  await keepLink(o.source, o.ref, { variationId: q.id })   // (simplify round 2) the record keeps it
  await logAsk({ leadId: o.leadId, projectId: o.projectId, kind: VO_KIND, detail: { source: o.source, ref: o.ref, id: q.id, title, number: vo.number } })
  return { id: q.id, number: vo.number, made: true }
}
