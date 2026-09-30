import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, leads, questions, type Question } from '@/lib/db/schema'
import type { LeadEventDetail } from '@/lib/leads/events'
import { fetchPortalLink } from '@/lib/leads/portal'
import { missingBankQuestions } from '@/lib/company/scope-questions'

/* Lead Details › Questionnaire (931-46769) — one loader for the tab. */

export type LeadQuestionsData = { leadId: string; questions: Question[]; leadName: string; now: number; /** (REG-609) the last Ask the client › Send */ askedAt: Date | null; /** (REG-612) enabled bank questions this lead does not carry yet */ bankCount: number
  /** (UX audit 2026-09-30, T12) When each question was last asked, by question id (ms) — the card's "Asked · 30 Sep" chip */
  askedOn: Record<string, number> }

/**
 * (T12) Each question's last ask, read from the asks on the lead's record: an ask that names its questions counts for those; one from
 * before the ask named them (or from the Overview's quick Ask) counts for every question that was there and still open when it went.
 */
function askedOnOf(rows: Question[], asks: { at: Date; detail: unknown }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of asks) {
    const ids = (a.detail && typeof a.detail === 'object' ? (a.detail as LeadEventDetail).ids : undefined) ?? null
    const t = a.at.getTime()
    for (const q of rows) {
      const hit = ids ? ids.includes(q.id) : q.createdAt.getTime() <= t && (!q.answeredAt || q.answeredAt.getTime() >= t)
      if (hit && (out[q.id] ?? 0) < t) out[q.id] = t
    }
  }
  return out
}

export async function fetchLeadQuestions(leadId: string): Promise<LeadQuestionsData> {
  const [rows, lead, portal, missing, asks] = await Promise.all([
    db.select().from(questions).where(eq(questions.leadId, leadId)).orderBy(asc(questions.sortOrder), asc(questions.createdAt)),
    db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)),
    fetchPortalLink(leadId),   /* (REG-609) */
    missingBankQuestions(leadId),   /* (REG-612) */
    db.select({ at: leadEvents.at, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, leadId), eq(leadEvents.kind, 'questionnaire_asked'))),   /* (T12) */
  ])
  // Unanswered first — those are the ones still needing work; answered ones are a record (user 2026-08-30).
  // Array.prototype.sort is stable, so each group keeps the tab's own sortOrder / createdAt sequence.
  const byOutstanding = [...rows].sort((a, b) => Number(a.answer !== null) - Number(b.answer !== null))
  return { leadId, questions: byOutstanding, leadName: lead[0]?.name ?? '', now: Date.now(), askedAt: portal?.askedAt ?? null, bankCount: missing.length, askedOn: askedOnOf(rows, asks) }
}
