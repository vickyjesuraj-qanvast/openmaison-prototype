import { and, asc, eq, isNull } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { leadFiles, questions, quotes, stageLogs, type LeadFile, type LeadQuestionnaire, type Member, type Quote } from '@/lib/db/schema'
import { summarise } from '@/lib/leads/question-model'
import { fetchReturnDetail, type ReturnDetail } from '@/lib/leads/returns'
import { STAGES } from '@/lib/leads/enums'
import { fetchLeadRows, type LeadRow } from '@/lib/leads/queries'
import { isWizardPayload } from '@/lib/leads/stage-data'
import { fetchStageMovement } from '@/lib/settings/queries'
import type { StageMovement } from '@/lib/settings/types'

/* Lead Details › Overview (858-24770) — everything the page reads, derived on the server so the client never touches Date.now(). */

export type ActiveStage = (typeof STAGES)[number]
export type StageStep = { stage: ActiveStage; state: 'done' | 'current' | 'future'; days: number | null }
export type ParkedStep = { stage: 'On Hold' | 'Lost'; days: number; till: string | null }
export type ActivityItem = { at: Date; text: string }

export type LeadDetail = {
  lead: LeadRow
  team: Member[]
  now: number
  stageMovement: StageMovement
  daysInPipeline: number
  timeline: StageStep[]
  parked: ParkedStep | null
  activity: ActivityItem[]
  quote: Quote | null
  files: LeadFile[]
  questionnaire: LeadQuestionnaire | null
  ret: ReturnDetail | null   // the latest return with its attachments + people (Qanvast lead return, REG-192)
}

const DAY = 86_400_000
const isActive = (s: string): s is ActiveStage => (STAGES as readonly string[]).includes(s)
const daysBetween = (from: number, to: number) => Math.max(0, Math.floor((to - from) / DAY))

async function fetchLeadDetailUncached(id: string): Promise<LeadDetail | null> {
  const [{ rows, team, now }, stageMovement, logs, quoteRows, files, qRows, retRows] = await Promise.all([
    fetchLeadRows(),
    fetchStageMovement(),
    db.select().from(stageLogs).where(eq(stageLogs.leadId, id)).orderBy(asc(stageLogs.createdAt)),
    db.select().from(quotes).where(and(eq(quotes.leadId, id), isNull(quotes.archivedAt), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)),   // archived / deleted quotes leave the card (Quotes tab, REG-175)
    db.select().from(leadFiles).where(and(eq(leadFiles.leadId, id), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)),   // trashed files leave the card (Files tab)
    db.select({ answeredBy: questions.answeredBy, createdAt: questions.createdAt }).from(questions).where(eq(questions.leadId, id)),   // the card's counts derive from the Questionnaire tab's rows (REG-187)
    fetchReturnDetail(id),
  ])
  const lead = rows.find((r) => r.id === id)
  if (!lead) return null

  /* ── Lead stages (858:24890 / 858:24646 / 858:24709) ──
     A stage is entered at the first log that moves the lead into it (New at creation). Leads seeded straight into
     a later stage carry no logs for the stages before it, so those show "--" rather than an invented duration. */
  const entered: Partial<Record<ActiveStage, number>> = { New: lead.createdAt.getTime() }
  for (const log of logs) {
    if (isActive(log.toStage) && entered[log.toStage] === undefined) entered[log.toStage] = log.createdAt.getTime()
  }
  const parkedLog = isActive(lead.stage) ? null : logs.filter((l) => l.toStage === lead.stage).at(-1) ?? null
  const journeyStage = isActive(lead.stage) ? lead.stage : lead.resumeStage
  const journey = journeyStage && isActive(journeyStage) ? STAGES.indexOf(journeyStage) : -1
  const parkedAt = parkedLog?.createdAt.getTime() ?? null
  const timeline: StageStep[] = STAGES.map((stage, i) => {
    if (i > journey) return { stage, state: 'future', days: null }
    const start = entered[stage]
    if (i < journey) {
      const end = STAGES[i + 1] ? entered[STAGES[i + 1] as ActiveStage] : undefined
      return { stage, state: 'done', days: start !== undefined && end !== undefined ? daysBetween(start, end) : null }
    }
    // the stage the lead is in (or left from, when parked)
    if (parkedLog) return { stage, state: 'done', days: start !== undefined && parkedAt !== null ? daysBetween(start, parkedAt) : null }
    return { stage, state: 'current', days: start !== undefined ? daysBetween(start, now) : null }
  })
  const parked: ParkedStep | null = parkedLog && (lead.stage === 'On Hold' || lead.stage === 'Lost')
    ? { stage: lead.stage, days: daysBetween(parkedLog.createdAt.getTime(), now), till: lead.onHoldFollowUp }
    : null

  /* ── Recent activity (858:24970) — newest first, four rows. Phrases follow the mock where it has one
     ("Lead created from {source}", "Quote created", "Updated contact log", "Lead returned"); the rest are logged as invented. */
  const ret = retRows
  const quote = quoteRows.at(-1) ?? null
  const activity: ActivityItem[] = [{ at: lead.createdAt, text: `Lead created from ${lead.source}` }]
  for (const log of logs) {
    const text = isWizardPayload(log.payload) && log.toStage === 'Contacted' ? 'Updated contact log'
      : log.toStage === 'On Hold' ? 'Put on hold'
      : log.toStage === 'Lost' ? 'Marked as lost'
      : `Moved to ${log.toStage}`
    activity.push({ at: log.createdAt, text })
  }
  if (quote) activity.push({ at: quote.createdAt, text: 'Quote created' })
  if (ret) activity.push({ at: ret.returnedAt, text: 'Lead returned' })
  activity.sort((a, b) => b.at.getTime() - a.at.getTime())

  return {
    lead, team, now, stageMovement,
    daysInPipeline: daysBetween(lead.createdAt.getTime(), now),
    timeline, parked,
    activity: activity.slice(0, 4),
    quote, files,
    questionnaire: (() => { const sum = summarise(qRows); return sum ? { leadId: id, ...sum, updatedAt: qRows.reduce((m, q) => (q.createdAt > m ? q.createdAt : m), qRows[0]!.createdAt) } satisfies LeadQuestionnaire : null })(),
    ret,
  }
}

/** Per-request memo (audit 2026-08-30): `generateMetadata` and the page both call this, which ran every query twice. */
export const fetchLeadDetail = cache(fetchLeadDetailUncached)
