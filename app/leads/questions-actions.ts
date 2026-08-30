'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questions } from '@/lib/db/schema'
import type { QuestionType } from '@/lib/leads/question-model'

/* Lead Details › Questionnaire (931-46769). Every action revalidates the lead's pages; the client calls router.refresh() as well. */

const touch = (leadId: string) => { revalidatePath(`/leads/${leadId}`); revalidatePath(`/leads/${leadId}/questionnaire`); revalidatePath('/leads') }
const leadOf = async (id: string) => (await db.select({ leadId: questions.leadId }).from(questions).where(eq(questions.id, id)))[0]?.leadId ?? null

/** Add Question (empty state 931:46839 / the list's add row — REG-188): appended after the last question. */
export async function createQuestion(leadId: string, text: string, type: QuestionType, options: string[] = []): Promise<string> {
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

export async function deleteQuestion(questionId: string): Promise<void> {
  const leadId = await leadOf(questionId); if (!leadId) return
  await db.delete(questions).where(eq(questions.id, questionId))
  touch(leadId)
}
