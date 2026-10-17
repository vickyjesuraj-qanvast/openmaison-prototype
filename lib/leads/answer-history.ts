import 'server-only'
import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questionAnswerHistory } from '@/lib/db/schema'
import type { AnswerChange } from './question-model'

/*
 * (gaps build D, item 9 — 1.0 M-170 · M-175, the clock icon's answer history) Every change to a question's answer is kept: what it read before
 * and after, who changed it — a member answering for the client on the lead's Questionnaire, or the client (or someone of their household) on
 * the portal — and when. Written beside the answer by both writers (`answerQuestion`, the portal's `answerQuestions`); read by the tab.
 */

type Writer = Pick<typeof db, 'insert'>
export async function recordAnswerChange(w: Writer, o: { leadId: string; questionId: string; before: string | null; after: string | null; byKind: 'studio' | 'client'; byMemberId?: string | null; byHomeownerId?: string | null; byName: string | null; at?: Date }): Promise<void> {
  if ((o.before ?? null) === (o.after ?? null)) return
  await w.insert(questionAnswerHistory).values({ id: randomUUID(), leadId: o.leadId, questionId: o.questionId, before: o.before, after: o.after, byKind: o.byKind, byMemberId: o.byMemberId ?? null, byHomeownerId: o.byHomeownerId ?? null, byName: o.byName, at: o.at ?? new Date() })
}

/** A lead's answer history, by question id, newest first. */
export async function fetchAnswerHistory(leadId: string): Promise<Record<string, AnswerChange[]>> {
  const rows = await db.select().from(questionAnswerHistory).where(eq(questionAnswerHistory.leadId, leadId)).orderBy(asc(questionAnswerHistory.at))
  const out: Record<string, AnswerChange[]> = {}
  for (const r of rows) (out[r.questionId] ??= []).unshift({ before: r.before, after: r.after, byKind: r.byKind === 'client' ? 'client' : 'studio', byName: r.byName, at: r.at.getTime() })
  return out
}
