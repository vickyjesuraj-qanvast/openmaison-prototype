import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, leads, members, projectTickets, projectUpdates, projects, settings, type Project } from '@/lib/db/schema'
import { answersOf } from '@/lib/compliance/queries'   // (simplify S-19) the Handover phase's items on the checklist
import { complianceKindOf, itemsFor } from '@/lib/compliance/model'
import { turnOf } from './tickets-model'
import type { Viewer } from '@/lib/leads/assign-policy'
import { titleCaseName } from '@/lib/format'
import { milestonesOf } from './schedule'
import { handoverOf } from './schedule-model'
import { fetchUpdateFacts } from './updates'
import { moneyInputOf } from './money-queries'
import { moneyOf } from './money'
import { loadCostRecords } from '@/lib/finance/queries'   // (parity map, PR-121 · MO-101) the vendors' balances
import { costsOf } from '@/lib/finance/costs'
import { closingNumbers } from '@/lib/finance/closing-numbers'   // (parity map, PR-122 · PR-123) P-C's
import { mayChangeProject } from './policy'
import {
  DEFAULT_HANDOVER_RULES, DEFAULT_SCHEDULE_DEFAULTS, HANDOVER_RULES_KEY, SCHEDULE_DEFAULTS_KEY, nearHandover, parseHandoverRules, parseScheduleDefaults,
  reviewsHandover, type EndingView, type HandoverFacts, type HandoverRules, type ScheduleDefaults,
  closingSummary, parseDeferred, refundDueOf, type ClosingSummary,   // (gaps build, package A)
} from './handover-model'

/*
 * (Projects round 7) The ending on the server: the settings, the checklist's facts (read from the records — the schedule's milestones and the
 * client's answer, the one set of numbers for money, the updates In review), what money is recorded against a project for Delete, and what the
 * project page shows about its ending. Money is read ONLY through the money module (`moneyInputOf` · `moneyOf`), so round 6's payments count
 * here the moment they land.
 */

export async function fetchHandoverRules(): Promise<HandoverRules> {
  const rules = await fetchHandoverRulesStored()   // (pending modules S19) the handover review is an approval: off on Free
  return rules.review && !(await planAllowsNow('internal_approvals')) ? { ...rules, review: false } : rules
}
export async function fetchHandoverRulesStored(): Promise<HandoverRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, HANDOVER_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_HANDOVER_RULES
  try { return parseHandoverRules(JSON.parse(row.value)) } catch { return DEFAULT_HANDOVER_RULES }
}
export async function fetchScheduleDefaults(): Promise<ScheduleDefaults> {
  const [row] = await db.select().from(settings).where(eq(settings.key, SCHEDULE_DEFAULTS_KEY)).limit(1)
  if (!row) return DEFAULT_SCHEDULE_DEFAULTS
  try { return parseScheduleDefaults(JSON.parse(row.value)) } catch { return DEFAULT_SCHEDULE_DEFAULTS }
}

/** The checklist's facts for one project (its row as stored). (simplify S-19) …with what the Hand over sheet fixes in place: the updates in
    review by name, the stage invoice still to send and the overdue ones, the home's compliance Handover items still to do, the tickets
    waiting on the studio. */
export async function handoverFactsOf(p: Project, clientName: string, now = Date.now(), o: { /** (parity map, PR-121) the vendors' sum shows — an Owner's or an Admin's (F1-Q2) */ figures?: boolean } = {}): Promise<HandoverFacts> {
  const [ms, input, updates, waiting, lead, answers, tickets, costRecords] = await Promise.all([
    milestonesOf([p.id]), moneyInputOf(p), fetchUpdateFacts([p.id]),
    db.select({ id: projectUpdates.id, title: projectUpdates.title }).from(projectUpdates)
      .where(and(eq(projectUpdates.projectId, p.id), isNull(projectUpdates.deletedAt), sql`(${projectUpdates.status} = 'in_review' or (${projectUpdates.status} = 'published' and ${projectUpdates.pending} is not null and json_extract(${projectUpdates.pending}, '$.note') is null))`))
      .orderBy(asc(projectUpdates.createdAt)),
    db.select({ propertyType: leads.propertyType }).from(leads).where(eq(leads.id, p.leadId)).limit(1),
    answersOf([p.id]),
    db.select().from(projectTickets).where(and(eq(projectTickets.projectId, p.id), inArray(projectTickets.status, ['open', 'in_progress']))).orderBy(asc(projectTickets.createdAt)),
    loadCostRecords({ projectIds: [p.id], overhead: false }),   // (parity map, PR-121 · MO-101) what the vendors are still owed
  ])
  /* (parity map, PR-121 · MO-101) the one set of costs: a bound PO with a balance, a bill on no PO with one */
  const costs = costsOf(costRecords, now)
  const owedPos = costs.pos.filter((x) => x.balanceMinor > 0)
  const owedBills = costs.bills.filter((x) => !x.poId && x.balanceMinor > 0)
  const vendors = costs.pos.length || costs.bills.length
    ? { any: true, pos: owedPos.length, bills: owedBills.length, owedMinor: o.figures ? owedPos.reduce((s, x) => s + x.balanceMinor, 0) + owedBills.reduce((s, x) => s + x.balanceMinor, 0) : null }
    : null
  const list = ms.get(p.id) ?? []
  const h = handoverOf(list)
  const m = moneyOf(input, now)
  /* the stage invoice still to send — a Ready one first, else the last Draft (the Completion, as a rule); the sent ones past their day */
  const unsent = m.stages.map((st) => (st.invoice && (st.invoice.state === 'ready' || st.invoice.state === 'draft' || st.invoice.state === 'awaiting') && st.invoice.amountMinor > 0 ? { id: st.invoice.id, stage: st.name, amountMinor: st.invoice.amountMinor, state: st.invoice.state } : null)).filter((x): x is NonNullable<typeof x> => !!x)
  const toSend = unsent.find((x) => x.state === 'ready') ?? unsent[unsent.length - 1] ?? null
  const overdue = m.invoices.filter((i) => i.state === 'overdue' && i.number).map((i) => ({ id: i.id, number: i.number!, stage: i.stageName, owedMinor: i.balanceMinor, dueAt: i.dueAt }))
  const kind = complianceKindOf(lead[0]?.propertyType ?? null)
  const done = answers.get(p.id) ?? {}
  const complianceOpen = kind ? itemsFor(kind).filter((i) => i.phase === 'handover' && i.level === 'mandatory' && !done[i.id]).map((i) => ({ id: i.id, title: i.title })) : null
  const toAnswer = tickets.filter((t) => turnOf({ status: t.status, lastClientAt: t.lastClientAt?.getTime() ?? null, lastStudioAt: t.lastStudioAt?.getTime() ?? null, createdAt: t.createdAt.getTime() }) === 'studio')
  return {
    client: titleCaseName(clientName),
    milestones: { total: list.length, open: list.filter((x) => x.status !== 'done').map((x) => ({ id: x.id, title: x.title })) },
    handover: h ? { id: h.id, title: h.title, asked: h.confirm.askedAt !== null, answer: h.confirm.answer } : null,
    money: { contractMinor: m.contractMinor, outstandingMinor: m.outstandingMinor, leftMinor: m.leftMinor, awaiting: m.awaitingCount, stages: m.stages.length, refundMinor: refundDueOf({ collectedMinor: m.collectedContractMinor, contractMinor: m.contractMinor }), heldMinor: m.heldMinor ?? 0 },   // (gaps build, package A) the refund-due check · (pending modules S07) a credit held
    updatesInReview: updates.get(p.id)?.inReview ?? 0,
    updates: waiting,
    invoices: { toSend, overdue },
    compliance: complianceOpen ? { open: complianceOpen } : null,
    tickets: toAnswer.map((t) => ({ id: t.id, number: t.number, subject: t.subject })),
    vendors,   // (parity map, PR-121 · MO-101)
  }
}

/**
 * (Q-26) What money is recorded against a project — through the money module only: its payments (round 6 fills `payments`; none before it
 * lands) and the invoices that went to the client and were not voided.
 */
export async function moneyRecordedOn(p: Project): Promise<{ payments: number; sent: number }> {
  const input = await moneyInputOf(p)
  return { payments: (input.payments ?? []).filter((x) => !x.pending).length,   /* (integration) money received — a client's proof still waiting is not a payment yet */
    sent: input.invoices.filter((i) => i.status !== 'draft' && i.status !== 'void').length }
}

/** The project page's ending: the rule, a waiting request or the last send-back, the completion, and what this viewer may do. */
export async function endingOf(p: Project, viewer: Pick<Viewer, 'id' | 'role' | 'teamIds'>, teamIds: string[], o: { milestones: number; openMilestones: number; now: number }): Promise<EndingView> {
  const rules = await fetchHandoverRules()
  const ids = [p.handoverRequestedBy, p.handoverReviewedBy, p.completedBy].filter((x): x is string => !!x)
  const names = new Map((ids.length ? await db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, ids)) : []).map((m) => [m.id, m.name]))
  const person = (id: string | null) => ({ id, name: id ? names.get(id) ?? 'Someone' : 'Someone' })
  const pending = p.stage === 'in_progress' && !!p.handoverRequestedAt
  const sentBack = !pending && p.stage === 'in_progress' && p.handoverReviewNote && p.handoverReviewedAt
  const completed = p.stage === 'completed' && p.completedAt
  /* (fix-E, E-23 · E-24) Read from the event log: whose handover went back (the hint is theirs), and how many items were open when it was
     completed — the project row keeps only the reason. */
  const [backLine, doneLine] = await Promise.all([
    sentBack ? db.select({ detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.projectId, p.id), eq(leadEvents.kind, 'project_handover_sent_back'))).orderBy(desc(leadEvents.at)).limit(1) : Promise.resolve([]),
    completed ? db.select({ detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.projectId, p.id), eq(leadEvents.kind, 'project_completed'))).orderBy(desc(leadEvents.at)).limit(1) : Promise.resolve([]),
  ])
  const asker = ((backLine[0]?.detail ?? null) as { memberId?: string } | null)?.memberId ?? null
  const openCount = ((doneLine[0]?.detail ?? null) as { open?: unknown[] } | null)?.open?.length ?? 0
  return {
    rules,
    request: pending ? { by: person(p.handoverRequestedBy), at: p.handoverRequestedAt!.getTime(), note: p.handoverNote } : null,
    sentBack: sentBack ? { by: person(p.handoverReviewedBy), at: p.handoverReviewedAt!.getTime(), note: p.handoverReviewNote!, mine: asker === viewer.id } : null,
    completed: completed ? { by: person(p.completedBy), at: p.completedAt!.getTime(), note: p.completeNote, reason: p.completeReason, open: p.completeReason ? openCount : 0, deferred: parseDeferred(p.handoverDeferred) } : null,   // (gaps build, package A) the deferred items
    mayHandover: mayChangeProject(viewer, teamIds),
    runs: reviewsHandover(viewer.role),
    mine: pending && p.handoverRequestedBy === viewer.id,
    near: nearHandover({ stage: p.stage, milestones: o.milestones, openMilestones: o.openMilestones, targetEnd: p.targetEndDate?.getTime() ?? null, now: o.now }),
  }
}

/** (Projects round 7) Is this a project in Deleted projects? Its page sends the viewer to the listing instead of answering not found. */
export async function isDeletedProject(projectId: string): Promise<boolean> {
  const [p] = await db.select({ deletedAt: projects.deletedAt }).from(projects).where(eq(projects.id, projectId)).limit(1)
  return !!p?.deletedAt
}

/** (fix-E, E-28) A deleted project the viewer may see (its lead's rule): the listing says once that it is in Deleted Projects and opens the
    sheet on its action. Anyone else learns nothing about it. */
export async function deletedProjectFor(projectId: string | null): Promise<{ id: string; number: string } | null> {
  if (!projectId) return null
  const [p] = await db.select({ id: projects.id, number: projects.number, leadId: projects.leadId, deletedAt: projects.deletedAt }).from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!p?.deletedAt) return null
  const { canOpenLead, fetchViewer } = await import('@/lib/leads/visibility')
  return (await canOpenLead(await fetchViewer(), p.leadId)) ? { id: p.id, number: p.number } : null
}

/**
 * (gaps build, package A — 1.0 D-265 · D-266 · D-271) The closing summary of one project — at Complete handover (to today) and on a completed
 * project's Overview (to its completion): contract against collected, the variation orders, a credit or refund due, planned against actual
 * days, the milestones that finished late, the deferred items. Money through the money module only (`moneyInputOf` · `moneyOf`) and only for
 * whoever sees it (`withMoney`, F-17).
 */
export async function closingSummaryOf(p: Project, o: { withMoney: boolean; now?: number }): Promise<ClosingSummary> {
  const now = o.now ?? Date.now()
  const [ms, input, closing] = await Promise.all([milestonesOf([p.id]), o.withMoney ? moneyInputOf(p) : Promise.resolve(null),
    /* (parity map, PR-122 · PR-123) the costs and the margin — P-C's `closingNumbers` hands them to Owners and Admins only (null for anyone else) */
    o.withMoney ? closingNumbers(p.id).catch(() => null) : Promise.resolve(null)])
  const m = input ? moneyOf(input, now) : null
  const summary = closingSummary({
    /* (gaps build B) contract against contract: the summary's Collected and its refund read what was paid on the contract's invoices — a one-off or a recorded invoice is not the contract's */
    money: m ? { contractMinor: m.contractMinor, collectedMinor: m.collectedContractMinor, outstandingMinor: m.outstandingMinor, toCreditMinor: m.toCreditMinor, variations: m.variations } : null,
    start: (p.startDate ?? p.startedAt)?.getTime() ?? null, targetEnd: p.targetEndDate?.getTime() ?? null, endAt: p.completedAt?.getTime() ?? now,
    milestones: (ms.get(p.id) ?? []).map((x) => ({ status: x.status, end: x.end, plan: x.plan, doneAt: x.doneAt })),
    deferred: p.stage === 'completed' ? parseDeferred(p.handoverDeferred) : [],
  })
  return closing ? { ...summary, closing: { costsMinor: closing.costsMinor, marginPct: closing.marginPct, expectedMarginPct: closing.expectedMarginPct, word: closing.word, warning: closing.warning } } : summary
}
