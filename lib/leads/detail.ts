import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { isMarketing } from '@/lib/settings/roles'   // (S44O — call C6)
import { withoutQuoteMoney } from './lead-money'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { leadAssignees, leadFiles, leadNotes, leadReturns, projects, questions, quotes, type LeadFile, type Member, type Quote } from '@/lib/db/schema'
import { factsFrom } from '@/lib/leads/insights'
import { responseTime, type ResponseTime } from '@/lib/leads/tat'
import { fetchCustomFields, fetchCustomValues } from '@/lib/company/custom-fields'
import type { CustomFieldDef, CustomValues } from '@/lib/leads/custom-fields-model'
import { fetchMemberStats } from '@/lib/company/members'
import type { MemberStats } from '@/lib/leads/suggest'
import { fetchPortalLink, type PortalLink } from '@/lib/leads/portal'
import { summarise } from '@/lib/leads/question-model'
import { fetchReturnDetail, type ReturnDetail } from '@/lib/leads/returns'
import { STAGES } from '@/lib/leads/enums'
import { fetchLeadRow, type LeadRow } from '@/lib/leads/queries'
import { isWizardPayload } from '@/lib/leads/stage-data'
import { fetchQuoteApproval, fetchStageMovement, fetchLeadSources, fetchLeadReasons, isApprover } from '@/lib/settings/queries'
import type { LeadTabCounts } from '@/lib/leads/stage-policy'
import type { LeadReasons, QuoteApproval, StageMovement } from '@/lib/settings/types'
import { liveSourceNames } from '@/lib/settings/types'
import { calendarDaysBetween, displayDate, parseInputDateTime } from '@/lib/format'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'

/* Lead Details › Overview (858-24770) — everything the page reads, derived on the server so the client never touches Date.now(). */

export type ActiveStage = (typeof STAGES)[number]
/** (REG-548) Whether the lead's current stage already holds the record that completes it — the same test the Move stage
    rail applies when it ticks the stage the lead is in (tester feedback 2026-09-15: a saved log, then "no green tick" on
    the Overview). Linear movement always leaves one behind; Flexible movement's instant moves can leave a stage bare. */
function stageLogged(stage: ActiveStage, lead: LeadRow): boolean {
  const d = lead.stageData
  switch (stage) {
    case 'New': return lead.assignees.length > 0
    case 'Contacted': return (d.logs?.length ?? 0) > 0
    case 'Met': return (d.meetings?.length ?? 0) > 0
    case 'Quote Sent': return !!(d.quoteSelected || d.quoteUploaded)
    case 'Won': return !!(d.wonQuote || d.wonQuoteUploaded)
    default: return false
  }
}

export type StageStep = {
  stage: ActiveStage; state: 'done' | 'current' | 'future'; days: number | null
  /** (REG-548) A current stage whose completing record exists — the card ticks it, as the Move stage rail already does. */
  logged?: boolean
}
/** (REG-607) `reason` and `detail` come from the parking log's payload — the reason chosen, then "Competitor: X" or "Restart expected 3 Mar ’27". */
export type ParkedStep = { stage: 'On Hold' | 'Lost'; days: number; till: string | null; reason: string | null; detail: string | null }
export type ActivityItem = { at: Date; text: string }
/**
 * QUESTIONNAIRE card counts (858:25077), derived from the `questions` rows (REG-286).
 *
 * This shape used to borrow `LeadQuestionnaire` — the row type of `lead_questionnaires`, a table nothing reads or
 * writes any more (see lib/db/schema.ts). Borrowing it told anyone reading the schema that these counts are stored,
 * and the next person would have built a writer for a table the Questionnaire tab replaced. They are derived per
 * request from `questions`, and now they say so.
 */
export type QuestionnaireSummary = {
  leadId: string
  total: number
  clientAnswered: number
  studioAnswered: number
  /** The newest question's creation date — what the card prints as "Last updated". */
  updatedAt: Date
  /** (REG-609, parity Q-22) When the client was last asked to answer — the portal link's stamp; null until Ask the client › Send. */
  askedAt: Date | null
}

export type LeadDetail = {
  lead: LeadRow
  team: Member[]
  now: number
  stageMovement: StageMovement
  /** Settings › Leads › Quote approval — the studio's quote lifecycle (user 2026-08-30). Rides with the lead so every tab has it. */
  quoteApproval: QuoteApproval
  daysInPipeline: number
  timeline: StageStep[]
  parked: ParkedStep | null
  activity: ActivityItem[]
  quote: Quote | null
  files: LeadFile[]
  questionnaire: QuestionnaireSummary | null
  /** (UX audit T12) The questions still unanswered — what the Overview's quick Ask Client will send, listed in its dialog. */
  unansweredQuestions: { id: string; text: string }[]
  ret: ReturnDetail | null   // the latest return with its attachments + people (Qanvast lead return, REG-192)
  /** (REG-609, parity Q-44) How many times the lead was returned — Qanvast's two-return cap reads it. */
  returnsCount: number
  /** (REG-609, parity Q-22) The portal link's stamps: "Invited on" · "Asked on"; null before either. */
  portal: PortalLink | null
  /** (REG-611, parity R-03) The lead's three turnaround legs — created → assigned → first contact → Won — for the LEAD STAGES card's line. */
  responseTime: ResponseTime
  /** (REG-612, parity Q-25) The studio's active custom fields and this lead's values. */
  customFields: CustomFieldDef[]
  customValues: CustomValues
  /** (REG-612, parity Q-27) What the Assign popover's suggestion scores members on. */
  memberStats: MemberStats
  /** (REG-599) The live lead sources for the edit form, this lead's own retired one kept first. */
  sources: string[]
  /** (REG-601) Who is looking: the assignment rules and the scope. */
  viewer: Viewer
  /** (REG-607) The studio's Lost and On Hold reasons (Settings › Leads › Reasons) for the two dialogs. */
  leadReasons: LeadReasons
  /** (REG-911) The project a Won lead carries on into — the header's Open project; null before Won. */
  project: { id: string; number: string; /** (fix-A, A-26) the brief speaks of it */ stage?: string; name?: string } | null
  /** (Projects round 7, Q-26) A Won lead whose project is in Deleted projects — the header offers Make the project again. */
  deletedProject?: { id: string; number: string } | null
  /** (parity P-06 · Q-01, the owner's pick 2026-10-08) The strip's counts by the one rule both records follow — what waits on you there:
      Tasks = the lead's open tasks; Quotes = its quotes waiting for approval (an approver's queue only, while the studio asks for approval —
      the Tools item's rule); Questionnaire = the questions still unanswered. A tab with nothing waiting carries none. */
  tabCounts: LeadTabCounts
  /** (S42G) The latest meeting held with a lead that hasn't reached Met and has no project — no Met log holds it yet. A lead in Contacted that was
      met reads "Met already · log the meeting" in its brief (not "book the meet"), and Log the meeting carries it into the Met step. */
  heldMeeting?: { id: string; at: number; where: string } | null
}

const isActive = (s: string): s is ActiveStage => (STAGES as readonly string[]).includes(s)
/* (parity P-29 · Q-14, the owner's pick 2026-10-08) Calendar days, as the listing and the reports count them (`calendarDaysBetween`,
   lib/format.ts) — a stage entered yesterday evening is "1 day" this morning, never "0 days" until 24 hours have passed. */
const daysBetween = (from: number, to: number) => Math.max(0, calendarDaysBetween(from, to))

async function fetchLeadDetailUncached(id: string): Promise<LeadDetail | null> {
  // (REG-286) `fetchLeadRow` replaces `fetchLeadRows()` + `rows.find(...)`: the same builder, six selects bounded by
  // this lead instead of six unfiltered ones, and it hands back the stage logs this function used to query again.
  const [{ row: lead, team, logs, now }, stageMovement, quoteApproval, quoteRows, files, qRows, retRows, sourceList, viewer, reasonList, portal, retIds, assignRows, contactNotes, customFields, customValues, memberStats] = await Promise.all([
    fetchLeadRow(id),
    fetchStageMovement(),
    fetchQuoteApproval(),
    db.select().from(quotes).where(and(eq(quotes.leadId, id), isNull(quotes.archivedAt), isNull(quotes.deletedAt), eq(quotes.kind, 'quote'))).orderBy(asc(quotes.createdAt)),   // archived / deleted quotes leave the card (Quotes tab, REG-175)
    db.select().from(leadFiles).where(and(eq(leadFiles.leadId, id), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)),   // trashed files leave the card (Files tab)
    db.select({ id: questions.id, text: questions.text, answeredBy: questions.answeredBy, createdAt: questions.createdAt }).from(questions).where(eq(questions.leadId, id)),   // the card's counts derive from the Questionnaire tab's rows (REG-187)
    fetchReturnDetail(id),
    fetchLeadSources(),
    fetchViewer(),
    fetchLeadReasons(),   /* (REG-607) */
    fetchPortalLink(id),   /* (REG-609) */
    db.select({ id: leadReturns.id }).from(leadReturns).where(eq(leadReturns.leadId, id)),   /* (REG-609) the return count for Qanvast's cap */
    db.select({ memberId: leadAssignees.memberId, assignedAt: leadAssignees.assignedAt }).from(leadAssignees).where(eq(leadAssignees.leadId, id)),   /* (REG-611) */
    db.select({ contactedAt: leadNotes.contactedAt, createdAt: leadNotes.createdAt, authorId: leadNotes.authorId }).from(leadNotes).where(and(eq(leadNotes.leadId, id), eq(leadNotes.kind, 'contact'))),   /* (REG-611) */
    fetchCustomFields(true), fetchCustomValues(id), fetchMemberStats(),   /* (REG-612) */
  ])
  const [projectAny] = await db.select({ id: projects.id, number: projects.number, createdAt: projects.createdAt, deletedAt: projects.deletedAt, stage: projects.stage, name: projects.name }).from(projects).where(eq(projects.leadId, id)).limit(1)   /* (REG-911) */
  const projectRow = projectAny && !projectAny.deletedAt ? projectAny : undefined   /* (Projects round 7) a deleted one is offered again, never opened */
  if (!lead) return null
  if (!(await canOpenLead(viewer, id))) return null   /* (REG-601) not this member's lead: the page answers not found */
  /* (S44O — call C6) Marketing never reads a quote's money: no QUOTES card's quote, no amounts inside the stage logs */
  const desk = isMarketing(viewer.role)
  const sources = liveSourceNames(sourceList.sources, lead.source)

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
    return { stage, state: 'current', days: start !== undefined ? daysBetween(start, now) : null, logged: stageLogged(stage, lead) }
  })
  const parkedPayload = (parkedLog?.payload && typeof parkedLog.payload === 'object' ? parkedLog.payload : {}) as { reason?: string; competitor?: string; restartAt?: string }
  const parked: ParkedStep | null = parkedLog && (lead.stage === 'On Hold' || lead.stage === 'Lost')
    ? {
        stage: lead.stage, days: daysBetween(parkedLog.createdAt.getTime(), now), till: lead.onHoldFollowUp,
        reason: parkedPayload.reason ?? null,   // (REG-607)
        detail: parkedPayload.competitor ? `Competitor: ${parkedPayload.competitor}` : parkedPayload.restartAt ? `Restart expected ${displayDate(new Date(parkedPayload.restartAt))}` : null,
      }
    : null

  /* ── Recent activity (858:24970) — newest first, four rows. Phrases follow the mock where it has one
     ("Lead created from {source}", "Quote created", "Updated contact log", "Lead returned"); the rest are logged as invented. */
  const ret = retRows
  const quote = quoteRows.at(-1) ?? null
  const activity: ActivityItem[] = [{ at: lead.createdAt, text: `Lead created from ${lead.source}` }]
  for (const log of logs) {
    // "Updated contact log" is a correction (fromStage === toStage, written by updateStageDetails) — the same test the
    // Activity tab makes. Without it a real New → Contacted move read as an edit here and the move itself never showed.
    const text = isWizardPayload(log.payload) && log.fromStage === log.toStage && log.toStage === 'Contacted' ? 'Updated contact log'
      : log.toStage === 'On Hold' ? 'Put on hold'
      : log.toStage === 'Lost' ? 'Marked as lost'
      : `Moved to ${log.toStage}`
    activity.push({ at: log.createdAt, text })
  }
  if (quote) activity.push({ at: quote.createdAt, text: 'Quote created' })
  if (ret) activity.push({ at: ret.returnedAt, text: 'Lead returned' })
  if (projectRow) activity.push({ at: new Date(projectRow.createdAt.getTime() + 1000), text: `Project ${projectRow.number} created` })   /* (REG-911) the next chapter, after the Won move */
  activity.sort((a, b) => b.at.getTime() - a.at.getTime())

  /* (parity P-06 · Q-01) The strip's counts — what waits on you there. Quotes count for an approver only, while the studio asks for approval
     (the rail's Tools badge, `countQuotesToApprove`, counts the same quotes studio-wide). */
  const unanswered = qRows.filter((q) => !q.answeredBy)
  const toApprove = quoteApproval === 'required' && (await isApprover(viewer.id, viewer.role)) ? quoteRows.filter((q) => q.status === 'Sent for Approval').length : 0
  const { meetingsWaiting, heldMeetingLog } = await import('@/lib/meetings/queries')   // (pending modules S23) briefs to save · notes to write up
  const meetingsCount = await meetingsWaiting(id)
  /* (S42G) a meeting held before Met — the met-already brief and its Log the meeting read it */
  const heldBefore = journey < STAGES.indexOf('Met') && !projectRow ? await heldMeetingLog(id) : null
  const heldAt = heldBefore ? parseInputDateTime(heldBefore.when) : null
  const tabCounts: LeadTabCounts = {
    ...(lead.tasks.length ? { tasks: lead.tasks.length } : {}),   // LeadRow.tasks holds the open ones only (lib/leads/queries.ts)
    ...(meetingsCount ? { meetings: meetingsCount } : {}),
    ...(toApprove ? { quotes: toApprove } : {}),
    ...(unanswered.length ? { questionnaire: unanswered.length } : {}),
  }

  return {
    tabCounts,
    sources,
    viewer,
    leadReasons: reasonList.reasons,
    lead: desk ? { ...lead, stageData: withoutQuoteMoney(lead.stageData) } : lead, team, now, stageMovement, quoteApproval,
    daysInPipeline: daysBetween(lead.createdAt.getTime(), now),
    timeline, parked,
    activity: activity.slice(0, 4),
    quote: desk ? null : quote, files,
    unansweredQuestions: unanswered.map((q) => ({ id: q.id, text: q.text })),
    questionnaire: (() => { const sum = summarise(qRows); return sum ? { leadId: id, ...sum, updatedAt: qRows.reduce((m, q) => (q.createdAt > m ? q.createdAt : m), qRows[0]!.createdAt), askedAt: portal?.askedAt ?? null } satisfies QuestionnaireSummary : null })(),
    ret,
    returnsCount: retIds.length,
    portal,
    responseTime: responseTime(factsFrom(lead, assignRows, logs, contactNotes), now),   /* (REG-611) */
    customFields, customValues, memberStats,   /* (REG-612) */
    project: projectRow ? { id: projectRow.id, number: projectRow.number, stage: projectRow.stage, name: projectRow.name } : null,   /* (REG-911) · (fix-A, A-26) */
    deletedProject: projectAny?.deletedAt ? { id: projectAny.id, number: projectAny.number } : null,   /* (Projects round 7) */
    heldMeeting: heldBefore?.meetingId && heldAt ? { id: heldBefore.meetingId, at: heldAt.getTime(), where: heldBefore.where } : null,   /* (S42G) */
  }
}

/** (one-home N-10) The lead's live project — where its carried tabs (Tasks · Files · Notes & Logs · Questionnaire · Activity) live once it is
    Won; null before that, and once the project was deleted (the lead keeps its tabs). The lead tab routes redirect on it. */
export async function liveProjectOf(leadId: string): Promise<string | null> {
  const [r] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  return r?.id ?? null
}

/** Per-request memo (audit 2026-08-30): `generateMetadata` and the page both call this, which ran every query twice. */
export const fetchLeadDetail = cache(fetchLeadDetailUncached)
