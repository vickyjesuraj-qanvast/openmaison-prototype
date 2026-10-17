'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questions } from '@/lib/db/schema'
import { QUESTION_TYPES, type QuestionType } from '@/lib/leads/question-model'
import { revalidateLead } from '@/lib/leads/queries'
import { recordAnswerChange } from '@/lib/leads/answer-history'
import { fetchViewer } from '@/lib/leads/visibility'
import { askBlock, askTargetOf, recordAsk, type AskTarget } from '@/lib/portal/ask'   // (parity map, CP-110)
import { members } from '@/lib/db/schema'

/* Lead Details › Questionnaire (931-46769). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

/** (REG-286) One shared eviction for every detail tab — the hand-listed paths here never named Activity, which prints every question and answer. */
const touch = (leadId: string) => revalidateLead(leadId)
const leadOf = async (id: string) => (await db.select({ leadId: questions.leadId }).from(questions).where(eq(questions.id, id)))[0]?.leadId ?? null

/** Add Question (empty state 931:46839 / the list's add row — REG-188): appended after the last question. */
export async function createQuestion(leadId: string, text: string, type: QuestionType, options: string[] = []): Promise<string> {
  // (REG-286) This action has no caller in the app yet — it is the seam the Company tab will use, which makes it the
  // one most likely to be called with something unexpected. `type` decides which editor the card renders and how
  // `answer` is parsed (question-model.ts), so an unknown one leaves a question nobody can answer.
  if (!(QUESTION_TYPES as readonly string[]).includes(type)) throw new Error(`Unknown question type: ${String(type)}`)
  const id = randomUUID()
  const [m] = await db.select({ max: sql<number | null>`max(${questions.sortOrder})` }).from(questions).where(eq(questions.leadId, leadId))
  await db.insert(questions).values({ id, leadId, text: text.trim(), type, options: type === 'single' ? JSON.stringify(['Yes', 'No']) : type === 'multi' ? JSON.stringify(options) : null, sortOrder: (m?.max ?? -1) + 1, createdAt: new Date() })
  touch(leadId); return id
}

/** Answer / edit an answer (931:46995) — always "By Studio" from this side; multi answers arrive as a string[]. */
export async function answerQuestion(questionId: string, answer: string | string[]): Promise<void> {
  const [q] = await db.select({ leadId: questions.leadId, answer: questions.answer }).from(questions).where(eq(questions.id, questionId))
  if (!q) return
  const next = Array.isArray(answer) ? JSON.stringify(answer) : answer.trim()
  const now = new Date()
  await db.update(questions).set({ answer: next, answeredBy: 'studio', answeredAt: now }).where(eq(questions.id, questionId))
  /* (gaps build D, item 9) every change kept — old → new, who, when */
  const me = await fetchViewer()
  const name = (await db.select({ name: members.name }).from(members).where(eq(members.id, me.id)))[0]?.name ?? null
  await recordAnswerChange(db, { leadId: q.leadId, questionId, before: q.answer, after: next, byKind: 'studio', byMemberId: me.id, byName: name, at: now })
  touch(q.leadId)
}

/* createQuestion / deleteQuestion have no caller in the app on purpose (REG-246, REG-282): questions are
   studio-level setup, added and removed by admins under a Company tab that is not built yet — the lead-side
   Questionnaire only answers them. They are the seam that flow will use; they are not leftovers. */
export async function deleteQuestion(questionId: string): Promise<void> {
  const leadId = await leadOf(questionId); if (!leadId) return
  await db.delete(questions).where(eq(questions.id, questionId))
  touch(leadId)
}

/** (REG-612, parity Q-21) "Add the studio's questions" — the enabled bank questions the lead does not carry yet, appended in the bank's order. */
export async function addStudioQuestions(leadId: string): Promise<number> {
  const { missingBankQuestions } = await import('@/lib/company/scope-questions')
  const { toLeadType, leadOptions, parseBankOptions } = await import('@/lib/company/question-bank')
  const { isBankType } = await import('@/lib/company/question-bank')
  const missing = await missingBankQuestions(leadId)
  if (!missing.length) return 0
  const [m] = await db.select({ max: sql<number | null>`max(${questions.sortOrder})` }).from(questions).where(eq(questions.leadId, leadId))
  let order = (m?.max ?? -1) + 1
  const now = new Date()
  await db.insert(questions).values(missing.map((q) => {
    const t = isBankType(q.questionType) ? q.questionType : 'text'
    const opts = leadOptions(t, parseBankOptions(q.options))
    return { id: randomUUID(), leadId, text: q.question, type: toLeadType(t), options: opts.length ? JSON.stringify(opts) : null, sortOrder: order++, createdAt: now, required: q.isRequired }   // (REG-647)
  }))
  touch(leadId)
  return missing.length
}

/**
 * (UX audit 2026-09-30, T12) Ask the client › Send, naming what it asks: the ticked questions (unanswered ones only) are recorded on the
 * ask, so each card can say "Asked · 30 Sep" and Activity says how many were asked. The portal link is stamped as `askClient` stamps it
 * (REG-609). Answers how many went.
 * (parity map, CP-110) …and the client is told: a row on their portal's bell, `client_questions` by email (the house delivery layer), and a
 * client never invited is invited by this ask (lib/portal/ask.ts `recordAsk` — its rules, and why a send is refused).
 */
export async function askClientQuestions(leadId: string, questionIds: string[]): Promise<number | { error: string }> {
  const open = questionIds.length
    ? (await db.select({ id: questions.id }).from(questions).where(and(eq(questions.leadId, leadId), inArray(questions.id, questionIds), isNull(questions.answeredBy)))).map((q) => q.id)
    : []
  if (!open.length) return { error: 'Tick at least one unanswered question' }
  const r = await recordAsk(leadId, open)
  if ('error' in r) return r
  touch(leadId)
  return open.length
}

/** (parity map, CP-110) What the Ask the client dialog shows when it opens: whom it asks, the real address, and why a send can't go now.
    Named by the lead or, from a caller that passes only the questions, by their lead. */
export async function readAskTarget(o: { leadId?: string | null; questionIds?: string[] }): Promise<(AskTarget & { block: string | null }) | { error: string }> {
  const leadId = o.leadId ?? (o.questionIds?.[0] ? await leadOf(String(o.questionIds[0])) : null)
  if (!leadId) return { error: 'No questions to ask yet' }
  const t = await askTargetOf(leadId)
  if (!t) return { error: 'This lead isn’t one you can open' }
  return { ...t, block: askBlock(t) }
}
