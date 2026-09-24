import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { questions, studioScopeQuestions, type StudioScopeQuestion } from '@/lib/db/schema'

/* (REG-612, parity Q-21) The studio's question bank — what a lead's questionnaire starts from. */
export async function fetchScopeQuestions(): Promise<StudioScopeQuestion[]> {
  return db.select().from(studioScopeQuestions).orderBy(asc(studioScopeQuestions.sortOrder), asc(studioScopeQuestions.createdAt))
}
/** The enabled bank questions a lead does not carry yet (by their text) — what "Add the studio's questions" would add. */
export async function missingBankQuestions(leadId: string): Promise<StudioScopeQuestion[]> {
  const have = (await db.select({ text: questions.text }).from(questions).where(eq(questions.leadId, leadId))).map((q) => q.text)
  const bank = (await fetchScopeQuestions()).filter((q) => q.isEnabled)
  return have.length ? bank.filter((q) => !have.includes(q.question)) : bank
}
