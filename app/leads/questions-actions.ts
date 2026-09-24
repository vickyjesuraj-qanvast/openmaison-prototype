'use server'

import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questions } from '@/lib/db/schema'
import { QUESTION_TYPES, type QuestionType } from '@/lib/leads/question-model'
import { revalidateLead } from '@/lib/leads/queries'

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
  const leadId = await leadOf(questionId); if (!leadId) return
  await db.update(questions).set({ answer: Array.isArray(answer) ? JSON.stringify(answer) : answer.trim(), answeredBy: 'studio', answeredAt: new Date() }).where(eq(questions.id, questionId))
  touch(leadId)
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
    return { id: randomUUID(), leadId, text: q.question, type: toLeadType(t), options: opts.length ? JSON.stringify(opts) : null, sortOrder: order++, createdAt: now }
  }))
  touch(leadId)
  return missing.length
}
