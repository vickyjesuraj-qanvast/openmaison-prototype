import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { maisonQuestions } from '@/lib/db/schema'

/**
 * (pending modules S10 — card studio:maison-assistant, "a conversation that carries from the home's chat box into the panel"; 1.0 kept its chat
 * in one tab's sessionStorage) What a member asked the Ask box, kept as a record: the sheet's Recent reads it on every page and every device,
 * and a Dashboard's chat box (S22) writes the same rows — so the conversation carries. Only the question is kept (and what its answer was
 * called): a press asks again and reads the records as they are then. The same question asked again moves to the top; 20 a member are kept.
 * Server-only; every write is one statement.
 */

export const KEEP = 20
export const RECENT = 5
export type Asked = { id: string; question: string; title: string | null; askedAt: number }

export async function recordAsked(memberId: string, o: { question: string; title: string | null; path: string | null; projectId: string | null; milestoneId: string | null }, now = Date.now()): Promise<void> {
  const q = o.question.trim()
  if (!q) return
  const [same] = await db.select({ id: maisonQuestions.id }).from(maisonQuestions)
    .where(and(eq(maisonQuestions.memberId, memberId), isNull(maisonQuestions.clearedAt), sql`lower(${maisonQuestions.question}) = ${q.toLowerCase()}`)).limit(1)
  if (same) await db.update(maisonQuestions).set({ askedAt: new Date(now), title: o.title, path: o.path, projectId: o.projectId, milestoneId: o.milestoneId }).where(eq(maisonQuestions.id, same.id))
  else await db.insert(maisonQuestions).values({ id: randomUUID(), memberId, question: q, title: o.title, path: o.path, projectId: o.projectId, milestoneId: o.milestoneId, askedAt: new Date(now) })
  /* keep the newest KEEP; a cleared row older than them goes too */
  const keep = (await db.select({ id: maisonQuestions.id }).from(maisonQuestions).where(eq(maisonQuestions.memberId, memberId)).orderBy(desc(maisonQuestions.askedAt)).limit(KEEP)).map((r) => r.id)
  if (keep.length >= KEEP) await db.delete(maisonQuestions).where(and(eq(maisonQuestions.memberId, memberId), notInArray(maisonQuestions.id, keep)))
}

export async function historyOf(memberId: string, limit = RECENT): Promise<Asked[]> {
  const rows = await db.select({ id: maisonQuestions.id, question: maisonQuestions.question, title: maisonQuestions.title, askedAt: maisonQuestions.askedAt }).from(maisonQuestions)
    .where(and(eq(maisonQuestions.memberId, memberId), isNull(maisonQuestions.clearedAt))).orderBy(desc(maisonQuestions.askedAt)).limit(limit)
  return rows.map((r) => ({ ...r, askedAt: r.askedAt.getTime() }))
}

export async function clearHistoryOf(memberId: string, now = Date.now()): Promise<string[]> {
  const ids = (await db.select({ id: maisonQuestions.id }).from(maisonQuestions).where(and(eq(maisonQuestions.memberId, memberId), isNull(maisonQuestions.clearedAt)))).map((r) => r.id)
  if (ids.length) await db.update(maisonQuestions).set({ clearedAt: new Date(now) }).where(and(eq(maisonQuestions.memberId, memberId), inArray(maisonQuestions.id, ids)))
  return ids
}

export async function restoreHistoryOf(memberId: string, ids: string[]): Promise<void> {
  if (ids.length) await db.update(maisonQuestions).set({ clearedAt: null }).where(and(eq(maisonQuestions.memberId, memberId), inArray(maisonQuestions.id, ids)))
}
