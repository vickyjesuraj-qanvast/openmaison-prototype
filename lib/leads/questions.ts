import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
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
  // Unanswered first — those are the ones still needing work; answered ones are a record (user 2026-08-30).
  // Array.prototype.sort is stable, so each group keeps the tab's own sortOrder / createdAt sequence.
  const byOutstanding = [...rows].sort((a, b) => Number(a.answer !== null) - Number(b.answer !== null))
  return { questions: byOutstanding, leadName: lead[0]?.name ?? '', now: Date.now() }
}
