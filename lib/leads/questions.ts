import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, questions, type Question } from '@/lib/db/schema'

/* Lead Details › Questionnaire (931-46769) — one loader for the tab. */

export type LeadQuestionsData = { questions: Question[]; leadName: string; now: number }

export async function fetchLeadQuestions(leadId: string): Promise<LeadQuestionsData> {
  const [rows, lead] = await Promise.all([
    db.select().from(questions).where(eq(questions.leadId, leadId)).orderBy(asc(questions.sortOrder), asc(questions.createdAt)),
    db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)),
  ])
  return { questions: rows, leadName: lead[0]?.name ?? '', now: Date.now() }
}
