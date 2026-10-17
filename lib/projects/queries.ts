import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { contractBaseOf } from '@/lib/quotes/contract-value'   // (pending modules S03)
import { poIdByNumber, vendorAnswersBy } from '@/lib/finance/attention'   // (gaps build F1)
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { cache } from 'react'
import { floorPlanToAnswer } from './floor-plan'   // (gaps build G) the Floor plan tab's count
import { unreadInChat } from './messages'   // (gaps build H) the Messages and Tickets tabs' counts
import { ticketAttention, ticketsToAnswer } from './tickets'
import { db } from '@/lib/db'
import { contracts, leadAssignees, leadEvents, leadFileRenders, leadFiles, leadNotes, leadTasks, leads, members, paymentTemplates, projectMilestoneExtensions, projectSelections, projects, questions, quotes, settings, stageLogs, type LeadFile, type Member, type Project } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { fetchViewer, visibleLeadIds, canOpenLead } from '@/lib/leads/visibility'
import { assignHint, assignableIds, type Viewer } from '@/lib/leads/assign-policy'
import { isOverdue, titleCaseName } from '@/lib/format'
import { parseSplitRows } from '@/lib/quotes/payments'
import { fetchLeadActivity, type ActivityEvent } from '@/lib/leads/activity'
import { attentionItems, attentionReasons, moneyAttention, type AttentionFacts } from './attention'
import { scheduleFactsFor, milestonesOf, voDaysOf } from './schedule'
import { dayOf, isLate, nextOpen, type ScheduleFacts } from './schedule-model'
import { isChoiceOverdue } from './choices-model'   // (fix-A, A-10)
import { CONTRACT_FOLDERS } from '@/lib/leads/file-model'   // (gaps build E, item 4)
import { projectHref } from './tabs'
import { gettingStarted, setupOpenCount, type SetupFacts, type SetupRow } from './getting-started'
import { mayChangeProject, seesMoney, seesStudioMoney } from './policy'
import { primaryAction, type PrimaryAction } from './next-step'
import { daysSinceUpdate, fetchLatestUpdates, fetchUpdateFacts } from './updates'
import { mayReviewUpdate, type LatestUpdate } from './updates-model'
import { fetchUpdateReviewers } from './updates'
import { fetchPortalFacts } from '@/lib/portal/waiting'
import { choiceFactsFor } from './choices'
import { approvedVariationsBy, invoicesAwaitingBy, moneySummaryOf, signedNetBy, signedQuoteLines, variationsWithClientBy, type SignedNet } from './money-queries'
import { paymentFactsFor } from './payments'   // (Projects round 6) Collected · Payment overdue · payments to confirm · an invoice to pay
import type { MoneySummary } from './money'
import { endingOf } from './handover'   // (Projects round 7)
import { reviewsHandover, type EndingView } from './handover-model'
import { holdOf, type Hold } from './hold'   // (gaps build, package A — M-01)
import { closingSummaryOf } from './handover'   // (gaps build, package A — 4)
import type { ClosingSummary } from './handover-model'
import { parseScope } from './model'
import { DEFAULT_PROJECT_NUMBERING, PROJECT_NUMBERING_KEY, PROJECT_NUMBERS_GIVEN_KEY, parseNumbersGiven, signedQuoteFileName, isProjectStage, parseProjectNumbering, parseProjectSplit, type PaymentStage, type ProjectMember, type ProjectNumbering, type ProjectRow, type ProjectsListData, type ProjectStage } from './model'
import { profitsFor } from '@/lib/finance/books'   // (gaps build F2)
import { seesProfit } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
/* (simplify S-20) the listing's Needs my review: the schedule's asks, POs and expenses waiting for an Owner's or an Admin's OK */
import { expenses as expenseRows, purchaseOrders as poRows } from '@/lib/db/schema'
import { answersSchedule as answersAsks } from './schedule-rules'   // (aliased: the page's loader below imports it too)
import { approvesExpense, approvesPo } from '@/lib/finance/rules'
/* (parity P-01 · P-04 · P-17) the lead's own record, as the lead's Overview reads it — the project's info column, its MY TASKS · FILES ·
   QUESTIONNAIRE cards and the Assign popover's suggestion */
import { fetchLeadRow, type LeadRow } from '@/lib/leads/queries'
import { fetchPortalLink, type PortalLink } from '@/lib/leads/portal'
import { summarise } from '@/lib/leads/question-model'
import { fetchCustomFields, fetchCustomValues } from '@/lib/company/custom-fields'
import type { CustomFieldDef, CustomValues } from '@/lib/leads/custom-fields-model'
import { fetchMemberStats } from '@/lib/company/members'
import type { MemberStats } from '@/lib/leads/suggest'
import { fetchLeadSources } from '@/lib/settings/queries'
import { liveSourceNames } from '@/lib/settings/types'
import type { QuestionnaireSummary } from '@/lib/leads/detail'

/*
 * (REG-911…) Projects on the server: the listing's rows, one project's page, the rail's count and the numbering. Who SEES a project is
 * its lead's rule (Settings › Who sees leads): every read goes through `visibleLeadIds` / `canOpenLead`, and a project the viewer may not
 * open answers not found. Money follows `lib/projects/policy.ts`.
 */

export async function fetchProjectNumbering(): Promise<ProjectNumbering> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PROJECT_NUMBERING_KEY)).limit(1)
  if (!row) return DEFAULT_PROJECT_NUMBERING
  try { return parseProjectNumbering(JSON.parse(row.value)) } catch { return DEFAULT_PROJECT_NUMBERING }
}
export async function fetchProjectNumbers(): Promise<string[]> {
  /* (fix-A, A-06) with every number ever given — `nextProjectSeq` reads the prefix and the running number only */
  const [rows, [given]] = await Promise.all([db.select({ number: projects.number }).from(projects), db.select({ value: settings.value }).from(settings).where(eq(settings.key, PROJECT_NUMBERS_GIVEN_KEY)).limit(1)])
  return [...rows.map((p) => p.number), ...Object.entries(parseNumbersGiven(given?.value)).map(([prefix, n]) => `${prefix}-${n}`)]
}

/** The project a lead carries on into, if any (deleted ones included — a lead never gets a second). */
export async function projectOfLead(leadId: string): Promise<{ id: string; deleted: boolean } | null> {
  const [p] = await db.select({ id: projects.id, deletedAt: projects.deletedAt }).from(projects).where(eq(projects.leadId, leadId)).limit(1)
  return p ? { id: p.id, deleted: !!p.deletedAt } : null
}

const stageOf = (s: string): ProjectStage => (isProjectStage(s) ? s : 'setting_up')
const plain = (m: { id: string; name: string; color: string }): ProjectMember => ({ id: m.id, name: m.name, color: m.color })

/** The contract value: the signed (else Won) system quote's total, else the agreed value (F-02, round 1 — variation orders join with round 5). */
function valueOf(p: Pick<Project, 'quoteId' | 'agreedValueMinor'>, quoteAmount: Map<string, number>): number | null {
  if (p.quoteId && quoteAmount.has(p.quoteId)) return quoteAmount.get(p.quoteId) ?? null
  return p.agreedValueMinor ?? null
}

/* ── The listing ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** (pending modules S22) Read once per request — the rail's Projects count (`countProjectsNeedingAttention`) and the Dashboard read the same rows. */
export const fetchProjectRows = cache(fetchProjectRowsUncached)
async function fetchProjectRowsUncached(): Promise<ProjectsListData> {
  const viewer = await fetchViewer()
  const [rows, team, visible] = await Promise.all([
    db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
      .where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))).orderBy(desc(projects.createdAt)),
    db.select().from(members).then(withYou),
    visibleLeadIds(viewer),
  ])
  const seen = rows.filter((r) => !visible || visible.has(r.l.id))
  const leadIds = seen.map((r) => r.l.id)
  const now = Date.now()
  const none = <T,>() => Promise.resolve([] as T[])
  const [links, tasks, files, notes, events, qs, cs, splits] = await Promise.all([
    leadIds.length ? db.select().from(leadAssignees).where(inArray(leadAssignees.leadId, leadIds)).orderBy(asc(leadAssignees.assignedAt)) : none<typeof leadAssignees.$inferSelect>(),
    leadIds.length ? db.select({ leadId: leadTasks.leadId, done: leadTasks.done, dueAt: leadTasks.dueAt, createdAt: leadTasks.createdAt, updatedAt: leadTasks.updatedAt }).from(leadTasks).where(inArray(leadTasks.leadId, leadIds)) : none<{ leadId: string | null; done: boolean; dueAt: Date | null; createdAt: Date; updatedAt: Date | null }>(),
    leadIds.length ? db.select({ leadId: leadFiles.leadId, at: sql<number>`max(coalesce(${leadFiles.updatedAt}, ${leadFiles.createdAt}))` }).from(leadFiles).where(inArray(leadFiles.leadId, leadIds)).groupBy(leadFiles.leadId) : none<{ leadId: string; at: number }>(),
    leadIds.length ? db.select({ leadId: leadNotes.leadId, at: sql<number>`max(${leadNotes.createdAt})` }).from(leadNotes).where(inArray(leadNotes.leadId, leadIds)).groupBy(leadNotes.leadId) : none<{ leadId: string; at: number }>(),
    leadIds.length ? db.select({ leadId: leadEvents.leadId, at: sql<number>`max(${leadEvents.at})` }).from(leadEvents).where(inArray(leadEvents.leadId, leadIds)).groupBy(leadEvents.leadId) : none<{ leadId: string; at: number }>(),
    leadIds.length ? db.select({ id: quotes.id, leadId: quotes.leadId, number: quotes.number, status: quotes.status, amountMinor: quotes.amountMinor, signedAmountMinor: quotes.signedAmountMinor, signedAt: quotes.signedAt }).from(quotes).where(and(inArray(quotes.leadId, leadIds), isNull(quotes.deletedAt), isNull(quotes.archivedAt), eq(quotes.kind, 'quote'))) : none<{ id: string; leadId: string; number: string; status: string; amountMinor: number; signedAmountMinor: number | null; signedAt: Date | null }>(),   // (S45A) its signature's day — Signed on
    leadIds.length ? db.select({ id: contracts.id, leadId: contracts.leadId, title: contracts.title, status: contracts.status, signedAt: contracts.signedAt }).from(contracts).where(and(inArray(contracts.leadId, leadIds), isNull(contracts.deletedAt), isNull(contracts.archivedAt), eq(contracts.toRead, false))) : none<{ id: string; leadId: string; title: string; status: string; signedAt: Date | null }>(),   // (S44R, C9) a letter to read waits on nobody
    db.select({ id: paymentTemplates.id, name: paymentTemplates.name, rowsJson: paymentTemplates.rowsJson }).from(paymentTemplates).where(isNull(paymentTemplates.deletedAt)).orderBy(desc(paymentTemplates.isPreset), asc(paymentTemplates.createdAt)),
  ])
  const portal = await fetchPortalFacts(leadIds)   // (Projects r4a) the client's portal: invited, and what waits on them
  const filed = await contractFiledOf(leadIds)   // (gaps build, package A — 6) Files › Contract
  const byMember = new Map(team.map((m) => [m.id, m]))
  const updateFacts = await fetchUpdateFacts(seen.map((r) => r.p.id))   // (REG-956) Last update · Needs my review · No update for n days
  const reviews = mayReviewUpdate(viewer.role, { id: viewer.id, reviewers: await fetchUpdateReviewers() })   // (gaps build D, item 10) named reviewers too
  const quoteAmount = new Map(qs.map((q) => [q.id, contractBaseOf(q)]))   // (pending modules S03) the total as signed
  const sched = await scheduleFactsFor(seen.map((r) => ({ projectId: r.p.id, clientName: r.l.name })), now)   // (Projects round 2)
  const choiceF = await choiceFactsFor(seen.map((r) => r.p.id), now)   // (Projects round 8) Choice overdue · a choice waiting on the client
  /* (Projects round 5) the approved variation orders join the contract value (F-02); one with the client waits on them; an invoice waiting
     for approval is an Owner's or an Admin's to review */
  const [voTotals, voWaiting, invoicesAwaiting] = await Promise.all([approvedVariationsBy(seen.map((r) => r.p.id)), variationsWithClientBy(seen.map((r) => r.p.id)), invoicesAwaitingBy(seen.map((r) => r.p.id))])
  const payF = await paymentFactsFor(seen.map((r) => ({ id: r.p.id, leadId: r.l.id })), viewer, now)   // (Projects round 6)
  const vaF = await vendorAnswersBy(seen.map((r) => r.p.id))   // (gaps build F1) a vendor's changes or no
  const tkF = await ticketAttention(seen.map((r) => r.p.id), now)   // (gaps build H, H-Q25) escalated tickets, tickets waiting on the studio
  const okF = await costApprovalsBy(seen.map((r) => r.p.id), viewer)   // (simplify S-20) POs and expenses waiting for this viewer's OK
  /* (pending modules S45A — H-UHD-3) the Signed on and Value before GST columns: each lead's Won day, and the sale as signed before GST (money
     only for whoever sees the studio's money — the Contract value column's rule) */
  const wonDays = leadIds.length ? await db.select({ leadId: stageLogs.leadId, at: sql<number>`min(${stageLogs.createdAt})` }).from(stageLogs).where(and(inArray(stageLogs.leadId, leadIds), eq(stageLogs.toStage, 'Won'))).groupBy(stageLogs.leadId) : []
  const signedNets = seesStudioMoney(viewer) ? await signedNetBy(seen.map((r) => r.p)) : new Map<string, SignedNet>()
  const maxAt = (list: { leadId: string | null; at: number }[], id: string) => { const v = list.find((x) => x.leadId === id)?.at; return v ? Number(v) * 1000 : 0 }
  const studioMoney = seesStudioMoney(viewer)
  const margins = seesProfit(viewer)   // (pending modules S41b-1) the Margin column — the books' and the Owner's cost switch
  const profits = margins ? await profitsFor(seen.map((r) => r.p.id), now) : new Map()   // (gaps build F2 — F2-Q1) the Margin column, Owners and Admins
  let total = 0
  const out: ProjectRow[] = seen.map(({ p, l }) => {
    const teamIds = links.filter((a) => a.leadId === l.id).map((a) => a.memberId)
    const own = tasks.filter((t) => t.leadId === l.id)
    const stage = stageOf(p.stage)
    const base = valueOf(p, quoteAmount)
    const value = base === null && !voTotals.has(p.id) ? null : Math.max(0, (base ?? 0) + (voTotals.get(p.id) ?? 0))   // (Projects round 5, F-02)
    if (studioMoney && value && stage !== 'completed') total += value
    const sf = sched.get(p.id) ?? null
    const facts: SetupFacts = { direct: l.direct, startDate: !!p.startDate, targetEndDate: !!p.targetEndDate, team: teamIds.length, value: !!value, hasQuote: !!p.quoteId, clientInvited: portal.get(l.id)?.invited ?? false, milestones: sf?.milestones ?? 0,
      contract: stage === 'completed' || !!p.contractId || cs.some((c) => c.leadId === l.id && c.status === 'Signed') || !!filed.get(l.id) }   // (gaps build, package A — 6)
    const hold = holdOf(p)   // (gaps build, package A — M-01)
    const lastTask = own.reduce((m, t) => Math.max(m, (t.updatedAt ?? t.createdAt).getTime()), 0)
    return {
      id: p.id, number: p.number, name: p.name, stage, projectType: p.projectType, leadId: l.id, direct: l.direct, quoteId: p.quoteId, contractId: p.contractId,
      client: titleCaseName(l.name), phone: l.phone, propertyType: l.propertyType, property: l.propertyAddress ?? l.leadAddress ?? l.area,
      team: teamIds.map((id) => byMember.get(id)).filter((m): m is (typeof team)[number] => !!m).map(plain),
      contractValueMinor: studioMoney ? value : null,
      startDate: p.startDate, targetEndDate: p.targetEndDate, startedAt: p.startedAt, createdAt: p.createdAt,
      lastActivity: new Date(Math.max(p.updatedAt.getTime(), lastTask, maxAt(files, l.id), maxAt(notes, l.id), maxAt(events, l.id))),
      attention: attentionReasons({ stage, createdAt: p.createdAt.getTime(), overdueTasks: own.filter((t) => !t.done && isOverdue(t.dueAt, now)).length, setupOpen: setupOpenCount(facts), daysSinceUpdate: daysSinceUpdate(updateFacts.get(p.id), p.startedAt, now), ...scheduleAttention(sf), choicesOverdue: choiceF.get(p.id)?.overdue ?? 0, ...{ choicesDeclined: choiceF.get(p.id)?.declined ?? [] }, paymentsOverdue: payF.get(p.id)?.overdue.n ?? 0, targetEnd: p.targetEndDate?.getTime() ?? null, onHold: hold ? { until: hold.until } : null, ...moneyAttention(payF.get(p.id), value, sf?.progress.pct ?? null, now), vendorAnswers: payF.get(p.id)?.sees ? vaF.get(p.id) ?? null : null, tickets: tkF.get(p.id) ?? null }, now),   // (gaps build B, item 8) money's warnings · (gaps build F1) a vendor's answer
      hold,
      waitingOn: stage === 'completed' ? [...(payF.get(p.id)?.waits ?? [])] /* (fix-D, D-11) an invoice still owed waits on the client after completion */ : [...waitingOf(qs.filter((q) => q.leadId === l.id), cs.filter((c) => c.leadId === l.id)), ...scheduleWaits(sf), ...(portal.get(l.id)?.waiting ?? []), ...(choiceF.get(p.id)?.waits ?? []), ...(voWaiting.get(p.id) ?? []), ...(payF.get(p.id)?.waits ?? [])],
      lastUpdate: updateFacts.get(p.id)?.lastPublishedAt ?? null,
      updatesToReview: reviews ? updateFacts.get(p.id)?.inReview ?? 0 : 0,
      invoicesToReview: reviews ? invoicesAwaiting.get(p.id) ?? 0 : 0,   // (Projects round 5) the same reviewers: Owners and Admins
      schedule: sf,
      ends: { mayHandover: mayChangeProject(viewer, teamIds), runs: reviewsHandover(viewer.role), requested: !!p.handoverRequestedAt,   // (Projects round 7) the row's menu
        /* (fix-E, E-21) who asked and when — the reviewer's menu and the Needs my review row say it */
        requestedBy: p.handoverRequestedBy ? byMember.get(p.handoverRequestedBy)?.name ?? null : null, requestedAt: p.handoverRequestedAt?.getTime() ?? null },
      collectedMinor: studioMoney ? payF.get(p.id)?.collectedMinor ?? 0 : null,   // (Projects round 6)
      paymentsToConfirm: payF.get(p.id)?.toConfirm ?? 0,
      profit: margins ? profits.get(p.id) ?? null : null,   // (gaps build F2)
      approvals: approvalsOf(answersAsks(viewer.role) ? sf?.asks ?? null : null, okF.get(p.id)),   // (simplify S-20) Needs my review counts every kind
      source: l.source,   // (pending modules S45A — H-UHD-3)
      signedOn: signedOnOf(p, l.id, qs, cs, wonDays),
      signedValue: studioMoney ? ((v) => (v ? { minor: v.minor, netMinor: v.netMinor, from: v.from, quoteNumber: v.quoteNumber } : null))(signedNets.get(p.id)) : null,
    }
  })
  return {
    rows: out,
    team,
    now, viewer: { id: viewer.id, role: viewer.role, reviews },   // (gaps build D, item 10) a named reviewer reviews too
    totalValueMinor: studioMoney ? total : null, margins,
    assignable: assignHint(viewer) ? [] : assignableIds(viewer, team), assignHint: assignHint(viewer),
    splits: splits.map((s) => ({ id: s.id, name: s.name, rows: parseSplitRows(s.rowsJson).map((r) => ({ name: r.name, pct: r.pct })) })),
    ...(await memberLoadOf()),   // (gaps build, package A — 9) New project's team picker
    ...(await (await import('./workload-queries')).workloadFor(viewer)),   // (gaps build I, I-Q1) the Workload view
  }
}

/** (simplify S-20) Per project, the purchase orders waiting for approval (a Draft submitted) and the expenses waiting (pending) — for a
    viewer who approves them (an Owner or an Admin, lib/finance/rules.ts `approvesPo` · `approvesExpense`); none for anyone else. */
async function costApprovalsBy(projectIds: string[], viewer: Pick<Viewer, 'role'>): Promise<Map<string, { pos: number; expenses: number }>> {
  const out = new Map<string, { pos: number; expenses: number }>()
  const po = approvesPo(viewer.role), ex = approvesExpense(viewer.role)
  if (!projectIds.length || (!po && !ex)) return out
  const [pos, exs] = await Promise.all([
    po ? db.select({ projectId: poRows.projectId, n: sql<number>`count(*)` }).from(poRows)
      .where(and(inArray(poRows.projectId, projectIds), eq(poRows.status, 'draft'), isNotNull(poRows.submittedAt), isNull(poRows.deletedAt))).groupBy(poRows.projectId) : Promise.resolve([]),
    ex ? db.select({ projectId: expenseRows.projectId, n: sql<number>`count(*)` }).from(expenseRows)
      .where(and(inArray(expenseRows.projectId, projectIds), eq(expenseRows.status, 'pending'), isNull(expenseRows.deletedAt))).groupBy(expenseRows.projectId) : Promise.resolve([]),
  ])
  for (const r of pos) out.set(r.projectId, { pos: Number(r.n), expenses: 0 })
  for (const r of exs) if (r.projectId) out.set(r.projectId, { pos: out.get(r.projectId)?.pos ?? 0, expenses: Number(r.n) })
  return out
}
/** (simplify S-20) What else waits for this viewer's OK on a row — the schedule's asks (handed only to whoever answers them) and the costs'. */
function approvalsOf(asks: ScheduleFacts['asks'], cost: { pos: number; expenses: number } | undefined): ProjectRow['approvals'] {
  const more = asks?.more ?? [], done = asks?.done ?? [], share = !!asks?.share, pos = cost?.pos ?? 0, expenses = cost?.expenses ?? 0
  return more.length || done.length || share || pos || expenses ? { more, done, share, pos, expenses } : null
}

/** (pending modules S45A — H-UHD-3) The day the client signed: the project's signed quote's or its contract's signature (the one it names, else a
    signed one on its lead), whichever came first; else the day its lead was won (the Won step records the signed copy); else none. */
function signedOnOf(p: Pick<Project, 'quoteId' | 'contractId'>, leadId: string, qs: { id: string; number: string; signedAt: Date | null }[], cs: { id: string; leadId: string; title: string; status: string; signedAt: Date | null }[], won: { leadId: string; at: number }[]): ProjectRow['signedOn'] {
  const q = p.quoteId ? qs.find((x) => x.id === p.quoteId) : undefined
  const c = (p.contractId ? cs.find((x) => x.id === p.contractId) : undefined) ?? cs.find((x) => x.leadId === leadId && x.status === 'Signed' && x.signedAt)
  const marks = [q?.signedAt ? { at: q.signedAt.getTime(), by: 'quote' as const, ref: q.number } : null, c?.signedAt ? { at: c.signedAt.getTime(), by: 'contract' as const, ref: c.title } : null].filter((x): x is NonNullable<typeof x> => !!x)
  if (marks.length) return marks.sort((a, b) => a.at - b.at)[0]!
  const w = won.find((x) => x.leadId === leadId)
  const at = w ? Number(w.at) : null
  return at ? { at: at < 1e11 ? at * 1000 : at, by: 'won', ref: null } : null   // a stamp in seconds, as the store keeps them
}

/** (gaps build, package A — 9) Each member's projects still running (Setting up · In progress, studio-wide — a load is a load whoever sees it)
    and the stats the lead's Assign popover suggests from (REG-612). */
async function memberLoadOf(): Promise<{ memberLoad: Record<string, number>; memberStats: Record<string, { closeRate: number; projects12m: number; active: number }> }> {
  const [rows, { fetchMemberStats }] = await Promise.all([
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).innerJoin(projects, eq(projects.leadId, leadAssignees.leadId))
      .where(and(isNull(projects.deletedAt), sql`${projects.stage} <> 'completed'`)),
    import('@/lib/company/members'),
  ])
  const memberLoad: Record<string, number> = {}
  for (const r of rows) memberLoad[r.memberId] = (memberLoad[r.memberId] ?? 0) + 1
  return { memberLoad, memberStats: await fetchMemberStats() }
}

/** (gaps build, package A — 6) The first file in a lead's Files › Contract (the root folder of that name), per lead. */
async function contractFiledOf(leadIds: string[]): Promise<Map<string, { id: string; name: string }>> {
  const out = new Map<string, { id: string; name: string }>()
  if (!leadIds.length) return out
  const folders = await db.select({ id: leadFiles.id, leadId: leadFiles.leadId }).from(leadFiles)
    .where(and(inArray(leadFiles.leadId, leadIds), eq(leadFiles.kind, 'folder'), inArray(leadFiles.name, [...CONTRACT_FOLDERS]), isNull(leadFiles.parentId), isNull(leadFiles.deletedAt)))   // (gaps build E, item 4) the starter folder too
  if (!folders.length) return out
  const files = await db.select({ id: leadFiles.id, name: leadFiles.name, parentId: leadFiles.parentId, leadId: leadFiles.leadId }).from(leadFiles)
    .where(and(inArray(leadFiles.parentId, folders.map((f) => f.id)), isNull(leadFiles.deletedAt), sql`${leadFiles.kind} <> 'folder'`)).orderBy(desc(leadFiles.createdAt))
  for (const f of files) if (!out.has(f.leadId)) out.set(f.leadId, { id: f.id, name: f.name })
  return out
}

/** (Q-06, round 1) What the client has in hand to answer: a quote sent for their confirmation, a contract sent for their signature. */
function waitingOf(qs: { number: string; status: string }[], cs: { title: string; status: string }[]): string[] {
  return [
    ...qs.filter((q) => q.status === 'Sent to Client').map((q) => `Quote ${q.number} awaits confirmation`),
    ...cs.filter((c) => c.status === 'Sent to Client').map((c) => `${c.title} awaits signature`),
  ]
}

/** (Projects round 2) The schedule's attention facts, and a milestone waiting on the client as something the client has to answer. */
const scheduleAttention = (f: ScheduleFacts | null) => ({ milestonesLate: f?.late ?? 0, waiting: f?.waiting ? { who: f.waiting.who, days: f.waiting.days } : null, clientConcerns: f?.concerns ?? null, scheduleAsks: f?.asks ?? null })   // (r4b) the client's concerns · (gaps build, package C) the schedule's asks
const scheduleWaits = (f: ScheduleFacts | null): string[] => (f?.waiting?.onClient ? [`${f.waiting.title} waits on ${f.waiting.who}${f.waiting.note ? ` for ${f.waiting.note.replace(/^./, (c) => c.toLowerCase())}` : ''}`] : [])

/** (REG-919) The rail's and the dock's count: the projects needing attention among those this member sees — the Needs attention tile, where
    the press lands. */
export async function countProjectsNeedingAttention(): Promise<number> {
  const data = await fetchProjectRows()
  return data.rows.filter((r) => r.attention.length > 0).length
}

/* ── One project's page ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/* ── (simplify S-01 · S-02 · S-04 · S-20 — package K-N) the ProjectDetail region's own imports, kept here so the listing's block above stays the
   listing's ── */
import { gt } from 'drizzle-orm'
import { floorPlanComments, floorPlanMarks, projectFloorPlans, projectMessages, projectShareRequests, projectTickets, projectUpdates } from '@/lib/db/schema'
import { isDueToday } from '@/lib/format'
import { fetchClientAccess } from '@/lib/portal/access'
import { portalPath } from '@/lib/portal/model'
import { needsOf, primaryOf, tabCountsOf, type NeedFacts, type NeedRow } from './needs-you'
import { fetchMoneyNeeds } from './money-needs'
import { readMark } from './messages'
import { fetchScheduleRules, waitingWho } from './schedule'
import { answersSchedule, sharesAtOnce } from './schedule-rules'
import { dateOfDay, dayOfStored, isResolved, weekdayOf } from './schedule-model'
import { parsePending, pendingWaits } from './updates-model'
import { WAIT_DAYS, turnOf, waitingDays } from './tickets-model'

/** (simplify S-01) The Overview's WITH {CLIENT} card: the portal as the Invite to Portal panel has it (its state, the sign-in number, the drafts'
    sender, Live / Paused, who may invite or remind), what waits on the client with its own link (Remind drafts the panel's WhatsApp), when
    they last heard from the studio, and the questions still open. */
export type WithClient = {
  portal: { state: 'none' | 'invited' | 'opened' | 'withdrawn'; label: string; phone: string; studio: string; paused: boolean; mayAct: boolean; /** the portal's home, `/my/<slug>` */ home: string }
  /** The client's own list (lib/portal/needs.ts) while they can open the portal — money left to the Money card. */
  waiting: { key: string; kind: string; title: string; line: string; href: string }[]
  /** When the team last reminded them of an item, by its key. */
  reminded: Record<string, number>
  lastTold: { id: string; title: string; at: number } | null
  unanswered: number
  /** (pending modules S23 — 1.0's project Meeting Summary card) the last meeting held with the client: its brief's first line, opening it */
  lastMet?: { id: string; at: number; line: string | null } | null
}
/** (simplify S-01) A COMING UP row: a milestone starting or ending, a task with someone from outside, the next invoice — `day` a day number
    (null for the invoice, which waits on its milestone). */
export type ComingUpItem = { key: string; day: number | null; title: string; caption?: string; icon: string; href: string }
const firstOfName = (n: string) => titleCaseName(n).split(/\s+/)[0] ?? n

export type ProjectDetail = {
  project: { id: string; number: string; name: string; stage: ProjectStage; projectType: string | null; startDate: Date | null; targetEndDate: Date | null; startedAt: Date | null; completedAt: Date | null; createdAt: Date; updatedAt: Date
    /** (gaps build, package A) on hold · the scope's rooms */
    hold?: Hold | null; scope?: string[] }
  lead: { id: string; name: string; phone: string; email: string | null; propertyType: string; propertyAddress: string | null; leadAddress: string | null; area: string | null; source: string; direct: boolean; createdAt: Date
    /** (gaps build, package A — 7) floor area and style live on the lead row */
    areaSqft?: number | null; style?: string | null }
  team: ProjectMember[]
  /** Every member, for the Assign popover. */
  studio: Member[]
  viewer: Viewer
  mayChange: boolean
  assignable: string[]
  assignHint: string | null
  primary: PrimaryAction | null
  setup: SetupRow[]
  attention: string[]
  waitingOn: string[]
  /** null when the viewer may not see money (F-17). */
  money: { valueMinor: number | null; source: 'quote' | 'agreed' | null; /** (pending modules S02 — MI-014, 1.0's "From signed quote · n line items") the signed quote's lines, Declined left out */ lines: number | null; stages: PaymentStage[]; splitName: string | null; /** (Projects round 5) the one set of numbers — lib/projects/money.ts */ summary: MoneySummary
    /** (gaps build F2 — F2-Q1) profit and margin — Owners and Admins only, null for anyone else */ profit?: import('@/lib/finance/profit').ProfitView | null } | null
  quote: { id: string; number: string; title: string; status: string; amountMinor: number; signedAt: Date | null } | null
  contract: { id: string; title: string; status: string; signedAt: Date | null } | null
  renders: { id: string; name: string; thumb: string | null }[]
  activity: ActivityEvent[]
  /** (REG-955) The Overview's Latest updates card: the three newest, how many there are, how many wait In review. */
  updates: { items: LatestUpdate[]; count: number; waiting: number }
  /** When the lead was won — the Won move's log (a direct project: its creation). */
  wonAt: Date
  now: number
  /** (Projects round 2) The schedule's facts and its next two milestones — the Overview's Schedule card; null with no milestones. */
  schedule: { facts: ScheduleFacts; next: { id: string; title: string; start: number; end: number; status: string }[]
    /** (simplify Q-04 — for K-F's phone site bar) every milestone running now (In progress), in the schedule's order */
    running: { id: string; title: string; start: number; end: number }[] } | null
  /** (Projects round 7) The ending: the handover's review, its completion, and what this viewer may do (lib/projects/handover-model.ts). */
  ending: EndingView
  /** (fix-A, A-10 · C-17) The Status card's rows, each opening where its fact is fixed — `attention` and `waitingOn` with their places, one
      line per fact (a milestone that raised "Waiting on …" folds its own waiting line into that row's caption). */
  attentionItems: StatusItem[]
  waitingItems: StatusItem[]
  /** (fix-A, A-02) A direct project's other quotes and contracts — its client has no lead page, so Key documents lists them. */
  documents: { kind: 'quote' | 'contract'; id: string; caption: string; status: string }[]
  /** (fix-A, A-15) The Won step's uploaded signed quote, filed in Files — Key documents names and opens it when no system quote is signed. */
  quoteFile: { id: string; name: string } | null
  /** (gaps build, package A — 6) The signed copy uploaded to Files › Contract — Key documents opens it when no contract record is linked. */
  contractFile?: { id: string; name: string } | null
  /** (gaps build, package A — 12) The tabs' counts: open tasks, unpaid invoices (whoever sees money), updates to review (the reviewers).
      (simplify S-04 — contract B) One rule since 2026-10-09: per VIEW slug, what waits on this viewer there (lib/projects/needs-you.ts
      `tabCountsOf`); the strip's group badge is the sum of its views; Compliance stops counting on the strip. */
  tabCounts?: Record<string, number>
  /** (simplify S-01 · S-02 — contract B) Needs you, in Q-03's order: the header's `primary` is its top row's action. */
  needs: NeedRow[]
  /** (simplify S-01) The Overview's With {client} and Coming up cards. */
  withClient: WithClient
  comingUp: ComingUpItem[]
  /** (gaps build, package A — 4) A completed project's closing summary (money only for whoever sees it). */
  closing?: ClosingSummary | null
  /** (parity P-01 · P-04 · P-17) The lead's own record, read as the lead's Overview reads it (lib/leads/detail.ts): the info column on the
      project's left (identity · Collaborators · Property info · Other info · Custom fields), MY TASKS · FILES · QUESTIONNAIRE on its Overview,
      the Assign popover's suggestion when nobody is on it (REG-612) — and the lead form, for whoever edits the client in place (Q-04). */
  record: ProjectRecord
}

/** (parity P-01 · P-04 · P-17) The project's lead, as the lead page reads it. `lead.name` is the stored name — the page title-cases it. */
export type ProjectRecord = {
  lead: LeadRow
  files: LeadFile[]
  questionnaire: QuestionnaireSummary | null
  /** The questions still unanswered — what QUESTIONNAIRE's Ask Client asks (UX audit T12). */
  unanswered: { id: string; text: string }[]
  portal: PortalLink | null
  customFields: CustomFieldDef[]
  customValues: CustomValues
  memberStats: MemberStats
  /** The studio's live lead sources with this lead's own — the lead form's Source list. */
  sources: string[]
}

/** (fix-A, A-10) A Status-card row: its words, a caption, and where it opens — an address, or one of the page's own dialogs. */
export type StatusItem = { key: string; text: string; caption?: string; href?: string; run?: 'invite' | 'dates:end' | 'setup' | 'visualizer' | 'hold' }

async function fetchProjectDetailUncached(projectId: string): Promise<ProjectDetail | null> {
  const viewer = await fetchViewer()
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!row) return null
  const { p, l } = row
  if (!(await canOpenLead(viewer, l.id))) return null   // (Q-23) the lead's rule: a project the viewer may not see answers not found
  const now = Date.now()
  const [links, studio, openTasks, quoteRow, contractRow, wonLog, renderRows, act, tpl] = await Promise.all([
    db.select().from(leadAssignees).where(eq(leadAssignees.leadId, l.id)).orderBy(asc(leadAssignees.assignedAt)),
    db.select().from(members).then(withYou),
    db.select({ dueAt: leadTasks.dueAt }).from(leadTasks).where(and(eq(leadTasks.leadId, l.id), eq(leadTasks.done, false))),
    p.quoteId ? db.select().from(quotes).where(and(eq(quotes.id, p.quoteId), isNull(quotes.deletedAt))).limit(1) : Promise.resolve([]),
    p.contractId ? db.select().from(contracts).where(and(eq(contracts.id, p.contractId), isNull(contracts.deletedAt))).limit(1) : Promise.resolve([]),
    db.select({ at: stageLogs.createdAt, payload: stageLogs.payload }).from(stageLogs).where(and(eq(stageLogs.leadId, l.id), eq(stageLogs.toStage, 'Won'))).orderBy(desc(stageLogs.createdAt)).limit(1),
    db.select({ id: leadFiles.id, name: leadFiles.name, thumb: leadFiles.thumb }).from(leadFileRenders).innerJoin(leadFiles, eq(leadFiles.id, leadFileRenders.fileId))
      .where(and(eq(leadFiles.leadId, l.id), isNull(leadFiles.deletedAt))).orderBy(desc(leadFiles.createdAt)).limit(3),
    fetchLeadActivity(l.id, { projectId: p.id }),
    (() => { const s = parseProjectSplit(p.paymentTemplate); return s?.template ? db.select({ name: paymentTemplates.name }).from(paymentTemplates).where(eq(paymentTemplates.id, s.template)).limit(1) : Promise.resolve([]) })(),
  ])
  const [latestUpdates, updateFacts] = await Promise.all([fetchLatestUpdates(p.id), fetchUpdateFacts([p.id])])   // (REG-955 · r3.9)
  const teamIds = links.map((a) => a.memberId)
  const team = teamIds.map((id) => studio.find((m) => m.id === id)).filter((m): m is (typeof studio)[number] => !!m).map(plain)
  const stage = stageOf(p.stage)
  const q = quoteRow[0] ?? null
  const c = contractRow[0] ?? null
  const valueMinor = q ? contractBaseOf(q) : p.agreedValueMinor ?? null   // (pending modules S03) the total as signed
  const portal = (await fetchPortalFacts([l.id])).get(l.id)   // (Projects r4a)
  const [sched, ms] = await Promise.all([scheduleFactsFor([{ projectId: p.id, clientName: l.name }], now), milestonesOf([p.id])])   // (Projects round 2)
  const sf = sched.get(p.id) ?? null
  const cf = (await choiceFactsFor([p.id], now)).get(p.id)   // (Projects round 8)
  const pf = (await paymentFactsFor([{ id: p.id, leadId: l.id }], viewer, now)).get(p.id)   // (Projects round 6)
  const va = pf?.sees ? (await vendorAnswersBy([p.id])).get(p.id) ?? null : null   // (gaps build F1)
  const tk = (await ticketAttention([p.id], now)).get(p.id) ?? null   // (gaps build H, H-Q25)
  /* (gaps build, package A — 6) the signed agreement: linked, signed on the client, or filed in Files › Contract (a completed project asks no more) */
  const [contractFile, signedOnLead] = await Promise.all([contractFiledOf([l.id]).then((m) => m.get(l.id) ?? null), db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.leadId, l.id), eq(contracts.status, 'Signed'), isNull(contracts.deletedAt))).limit(1)])
  const facts: SetupFacts = { direct: l.direct, startDate: !!p.startDate, targetEndDate: !!p.targetEndDate, team: teamIds.length, value: !!valueMinor, hasQuote: !!q, clientInvited: portal?.invited ?? false, milestones: sf?.milestones ?? 0,
    contract: stage === 'completed' || !!c || signedOnLead.length > 0 || !!contractFile }
  const hold = holdOf(p)   // (gaps build, package A — M-01)
  const mayChange = mayChangeProject(viewer, teamIds)
  /* (Projects round 7) the ending — near its end from the milestones (else the target end), a request waiting, a completion */
  const live = ms.get(p.id) ?? []
  const ending = await endingOf(p, viewer, teamIds, { milestones: live.length, openMilestones: live.filter((m) => m.status !== 'done').length, now })

  /* (F-03 · F-17) The agreed schedule: the system quote's own Payment Schedule rows; else the split agreed outside one. */
  let money: ProjectDetail['money'] = null
  if (seesMoney(viewer, teamIds)) {
    /* (Projects round 5) every figure from the module: the contract value after variation orders, each stage's invoice as it stands */
    const summary = await moneySummaryOf(p, now)
    const stages: PaymentStage[] = summary.stages.map((s) => ({ name: s.name, pct: s.pct, amountMinor: s.invoice?.amountMinor ?? s.nominalMinor, due: s.due }))
    money = { valueMinor, source: q ? 'quote' : valueMinor ? 'agreed' : null, lines: q ? await signedQuoteLines(q.id) : null, stages, splitName: summary.source === 'agreed' || (!q && stages.length) ? tpl[0]?.name ?? null : null, summary,
      profit: seesProfit(viewer) ? (await profitsFor([p.id], now)).get(p.id) ?? null : null }   // (pending modules S41b-1) and the cost switch   // (gaps build F2 — F2-Q1)
  }

  /* (fix-A, A-10 · C-17) the Status card's rows, each with the place it is fixed: a milestone on the Schedule, a choice on Choices, an
     invoice on Money, a quote or contract itself, the update composer; one line per fact */
  const af: AttentionFacts = { stage, createdAt: p.createdAt.getTime(), overdueTasks: openTasks.filter((t) => isOverdue(t.dueAt, now)).length, setupOpen: setupOpenCount(facts), daysSinceUpdate: daysSinceUpdate(updateFacts.get(p.id), p.startedAt, now), ...scheduleAttention(sf), choicesOverdue: cf?.overdue ?? 0, ...{ choicesDeclined: cf?.declined ?? [] }, paymentsOverdue: pf?.overdue.n ?? 0, targetEnd: p.targetEndDate?.getTime() ?? null, onHold: hold ? { until: hold.until } : null, ...moneyAttention(pf, money?.summary.contractMinor ?? null, sf?.progress.pct ?? null, now), vendorAnswers: va, tickets: tk }   // (gaps build B, item 8) · (gaps build F1) · (gaps build H)
  const today = dayOf(new Date(now))
  const tab = (slug: string, open?: string | null, extra?: string) => `${projectHref(p.id, slug)}${open ? `?open=${encodeURIComponent(open)}` : extra ? `?${extra}` : ''}`
  const waitM = live.filter((m) => m.status !== 'done' && m.waiting).map((m) => ({ m, days: m.waiting!.since !== null ? Math.max(0, today - m.waiting!.since) : 0 })).sort((a, b) => b.days - a.days)[0]?.m ?? null
  const lateChoice = af.choicesOverdue ? (await db.select({ id: projectSelections.id, status: projectSelections.status, neededBy: projectSelections.neededBy }).from(projectSelections)
    .where(and(eq(projectSelections.projectId, p.id), eq(projectSelections.status, 'shared'), isNull(projectSelections.deletedAt))).orderBy(asc(projectSelections.neededBy)))
    .find((c) => isChoiceOverdue({ status: c.status, neededBy: c.neededBy?.getTime() ?? null }, today))?.id ?? null : null
  const lateInvoice = money?.summary.invoices.find((i) => i.overdueMinor > 0)?.id ?? null
  const items = attentionItems(af, now)
  const vendorPo = va?.length === 1 ? await poIdByNumber(va[0]!.po) : null   // (gaps build F1)
  /* (parity P-05 · A-18) "More time asked on …" opens the Schedule at that milestone, "… waits to be approved as done" at that one, "Schedule
     changes wait to be shared" on Share changes — the reason's own words decide which ask it names first (lib/projects/attention.ts) */
  const asksHref = await (async () => {
    const a = sf?.asks
    if (!a) return undefined
    if (a.more.length) {
      const asked = await db.select({ milestoneId: projectMilestoneExtensions.milestoneId }).from(projectMilestoneExtensions)
        .where(and(eq(projectMilestoneExtensions.projectId, p.id), eq(projectMilestoneExtensions.status, 'pending'))).orderBy(asc(projectMilestoneExtensions.requestedAt))
      return tab('schedule', asked.find((x) => live.some((m) => m.id === x.milestoneId))?.milestoneId ?? null)
    }
    if (a.done.length) return tab('schedule', live.find((m) => m.doneAsked && m.status !== 'done')?.id ?? null)
    return a.share ? tab('schedule', null, 'share=1') : tab('schedule')
  })()
  const folded = !!(waitM && sf?.waiting?.onClient && items.some((x) => x.key === 'waiting'))
  const attentionList: StatusItem[] = items.map((x): StatusItem => {
    if (x.key === 'tasks_overdue') return { ...x, href: tab('tasks') }
    if (x.key === 'setup_stalled') return { ...x, run: 'setup' }
    if (x.key === 'update_gap') return { ...x, href: tab('updates', null, 'compose=1') }
    if (x.key === 'milestones_late') return { ...x, href: tab('schedule', live.find((m) => isLate(m, today))?.id) }
    if (x.key === 'waiting') return { ...x, caption: sf?.waiting ? `${sf.waiting.title}${sf.waiting.note ? ` — ${sf.waiting.note.replace(/^./, (c) => c.toLowerCase())}` : ''}` : undefined, href: tab('schedule', waitM?.id) }
    if (x.key === 'choice_overdue') return { ...x, href: tab('choices', lateChoice) }
    if (x.key === 'choice_declined') return { ...x, href: tab('choices', cf?.declined?.[0]?.id ?? null) }   // (gaps build D, item 2)
    if (x.key === 'client_concern') return { ...x, href: tab('schedule', live.find((m) => m.confirm.answer === 'changes')?.id) }
    if (x.key === 'payment_overdue') return money ? { ...x, href: tab('money', lateInvoice) } : x   // the Money tab is the team's, Owners' and Admins' (F-17)
    if (x.key === 'collection_trailing' || x.key === 'invoice_ready') return money ? { ...x, href: tab('money', x.key === 'invoice_ready' ? pf?.ready?.[0]?.id : null) } : x   // (gaps build B, item 8)
    if (x.key === 'target_passed') return sf?.milestones ? { ...x, href: tab('schedule') } : mayChangeProject(viewer, teamIds) ? { ...x, run: 'dates:end' } : x
    if (x.key === 'hold_resume') return mayChangeProject(viewer, teamIds) ? { ...x, run: 'hold' } : x   // (gaps build, package A — M-01) Resume or a new date
    if (x.key === 'vendor_answer') return money ? { ...x, href: tab('money', vendorPo) } : x   // (gaps build F1) the PO the vendor answered
    if (x.key === 'ticket_escalated' || x.key === 'ticket_waiting') return { ...x, href: tab('tickets') }   // (gaps build H, H-Q25)
    if (x.key === 'schedule_asks' && asksHref) return { ...x, href: asksHref }   // (parity P-05 · A-18) it pressed nowhere
    return x
  })
  const from = encodeURIComponent(projectHref(p.id))
  const [qWait, cWait] = stage === 'completed' ? [[], []] : await Promise.all([
    db.select({ id: quotes.id, number: quotes.number, status: quotes.status }).from(quotes).where(and(eq(quotes.leadId, l.id), isNull(quotes.deletedAt), isNull(quotes.archivedAt), eq(quotes.kind, 'quote'))),
    db.select({ id: contracts.id, title: contracts.title, status: contracts.status }).from(contracts).where(and(eq(contracts.leadId, l.id), isNull(contracts.deletedAt), isNull(contracts.archivedAt), eq(contracts.toRead, false))),   // (S44R, C9)
  ])
  const voWaits = stage === 'completed' ? [] : (await variationsWithClientBy([p.id])).get(p.id) ?? []
  /* (parity P-01 · P-04 · P-17) the lead's own record — the info column, the lead's three cards, the Assign suggestion (REG-612) */
  const [{ row: leadRow }, fileRows, qRows, portalLink, customFields, customValues, memberStats, sourceList] = await Promise.all([
    fetchLeadRow(l.id),
    db.select().from(leadFiles).where(and(eq(leadFiles.leadId, l.id), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)),   // trashed files leave the card (the lead's rule)
    db.select({ id: questions.id, text: questions.text, answeredBy: questions.answeredBy, createdAt: questions.createdAt }).from(questions).where(eq(questions.leadId, l.id)),
    fetchPortalLink(l.id),
    fetchCustomFields(true), fetchCustomValues(l.id), fetchMemberStats(),
    fetchLeadSources(),
  ])
  if (!leadRow) return null
  const qSum = summarise(qRows)
  const record: ProjectRecord = {
    lead: leadRow, files: fileRows,
    questionnaire: qSum ? { leadId: l.id, ...qSum, updatedAt: qRows.reduce((m, q) => (q.createdAt > m ? q.createdAt : m), qRows[0]!.createdAt), askedAt: portalLink?.askedAt ?? null } : null,
    unanswered: qRows.filter((q) => !q.answeredBy).map((q) => ({ id: q.id, text: q.text })),
    portal: portalLink, customFields, customValues, memberStats,
    sources: liveSourceNames(sourceList.sources, leadRow.source),
  }
  /* (fix-A, A-02) a direct project's own documents, besides the signed quote and the contract the card already names */
  const [dq, dc] = l.direct ? await Promise.all([
    db.select({ id: quotes.id, number: quotes.number, title: quotes.title, status: quotes.status }).from(quotes).where(and(eq(quotes.leadId, l.id), isNull(quotes.deletedAt), isNull(quotes.archivedAt), eq(quotes.kind, 'quote'))).orderBy(desc(quotes.createdAt)),
    db.select({ id: contracts.id, title: contracts.title, status: contracts.status }).from(contracts).where(and(eq(contracts.leadId, l.id), isNull(contracts.deletedAt), isNull(contracts.archivedAt))).orderBy(desc(contracts.createdAt)),
  ]) : [[], []]
  /* (fix-A, A-15) the signed quote the Won step uploaded, kept in Files */
  const upl = (wonLog[0]?.payload && typeof wonLog[0].payload === 'object' ? wonLog[0].payload : {}) as { wonQuoteTab?: string; wonQuoteUploaded?: string | null }
  const [quoteFile] = !q && upl.wonQuoteTab === 'upload' && upl.wonQuoteUploaded
    ? await db.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles).where(and(eq(leadFiles.leadId, l.id), eq(leadFiles.name, signedQuoteFileName(upl.wonQuoteUploaded)), isNull(leadFiles.deletedAt))).limit(1)
    : []
  const documents: ProjectDetail['documents'] = [
    ...dq.filter((x) => x.id !== q?.id).map((x) => ({ kind: 'quote' as const, id: x.id, caption: `${x.number} · ${x.title}`, status: x.status })),
    ...dc.filter((x) => x.id !== c?.id).map((x) => ({ kind: 'contract' as const, id: x.id, caption: x.title, status: x.status })),
  ]
  const portalWait = (text: string): StatusItem => (/question/.test(text) ? { key: 'questions', text, caption: 'Waiting on client', href: tab('questionnaire') }   /* (gaps build, package A — M-02) the project's own Questionnaire tab */
    : /^Designs/.test(text) ? { key: 'designs', text, caption: 'Waiting on client', run: 'visualizer' }
    : /^Portal invite/.test(text) ? { key: 'invite', text, caption: 'Waiting on client', run: 'invite' }
    : { key: 'stage', text, caption: 'Waiting on client', href: tab('schedule', live.find((m) => text.startsWith(m.title))?.id) })
  const waitingList: StatusItem[] = stage === 'completed'
    /* (fix-D, D-11) an invoice still owed waits on the client after completion — the Status card presses it too */
    ? (pf?.waits ?? []).map((text): StatusItem => ({ key: 'invoice', text, caption: 'Waiting on client', href: money ? tab('money', money.summary.invoices.find((i) => i.number && text.includes(i.number))?.id) : undefined }))
    : [
    ...(folded ? [] : scheduleWaits(sf).map((text): StatusItem => ({ key: 'milestone', text, caption: 'Waiting on client', href: tab('schedule', waitM?.id) }))),
    ...qWait.filter((x) => x.status === 'Sent to Client').map((x): StatusItem => ({ key: 'quote', text: `Quote ${x.number} awaits confirmation`, caption: 'Waiting on client', href: `/quotes/${x.id}?from=${from}` })),
    ...cWait.filter((x) => x.status === 'Sent to Client').map((x): StatusItem => ({ key: 'contract', text: `${x.title} awaits signature`, caption: 'Waiting on client', href: `/contracts/${x.id}?from=${from}` })),
    ...(portal?.waiting ?? []).map(portalWait),
    ...(cf?.waits ?? []).map((text): StatusItem => ({ key: 'choice', text, caption: 'Waiting on client', href: tab('choices') })),
    ...voWaits.map((text): StatusItem => ({ key: 'variation', text, caption: 'Waiting on client', href: money ? tab('money') : undefined })),
    ...(pf?.waits ?? []).map((text): StatusItem => ({ key: 'invoice', text, caption: 'Waiting on client', href: money ? tab('money', money.summary.invoices.find((i) => i.number && text.includes(i.number))?.id) : undefined })),
  ]


  /* ── (simplify S-01 · S-02 · S-04 · S-05 · S-20 · Q-09 — package K-N, contract B) Needs you, the header's one action, the tabs' counts, With
     {client} and Coming up — every fact read from a record (P2 §6.11: never page memory), each list scoped to this viewer ── */
  const firstOfClient = titleCaseName(l.name).split(/\s+/)[0] ?? titleCaseName(l.name)
  const memberName = (id: string | null | undefined) => (id ? studio.find((m) => m.id === id)?.name ?? null : null)
  const reviewsUpdates = mayReviewUpdate(viewer.role, { id: viewer.id, reviewers: await fetchUpdateReviewers() })   // (gaps build D, item 10) named reviewers too
  const answers = answersSchedule(viewer.role)
  const [reviewRows, [lastPub], moreRows, shareRows, readAt, ticketRows, markRows, schedRules, access] = await Promise.all([
    reviewsUpdates ? db.select({ id: projectUpdates.id, title: projectUpdates.title, status: projectUpdates.status, authorId: projectUpdates.authorId, submittedBy: projectUpdates.submittedBy, submittedAt: projectUpdates.submittedAt, createdAt: projectUpdates.createdAt, pending: projectUpdates.pending })
      .from(projectUpdates).where(and(eq(projectUpdates.projectId, p.id), isNull(projectUpdates.deletedAt), inArray(projectUpdates.status, ['in_review', 'published']))) : Promise.resolve([]),
    db.select({ id: projectUpdates.id, title: projectUpdates.title, at: projectUpdates.publishedAt }).from(projectUpdates)
      .where(and(eq(projectUpdates.projectId, p.id), isNull(projectUpdates.deletedAt), eq(projectUpdates.status, 'published'))).orderBy(desc(projectUpdates.publishedAt)).limit(1),
    answers ? db.select({ id: projectMilestoneExtensions.id, milestoneId: projectMilestoneExtensions.milestoneId, fromEnd: projectMilestoneExtensions.fromEnd, toEnd: projectMilestoneExtensions.toEnd, by: projectMilestoneExtensions.requestedBy, at: projectMilestoneExtensions.requestedAt })
      .from(projectMilestoneExtensions).where(and(eq(projectMilestoneExtensions.projectId, p.id), eq(projectMilestoneExtensions.status, 'pending'))).orderBy(asc(projectMilestoneExtensions.requestedAt)) : Promise.resolve([]),
    answers ? db.select({ ids: projectShareRequests.milestoneIds, by: projectShareRequests.requestedBy, at: projectShareRequests.requestedAt }).from(projectShareRequests)
      .where(and(eq(projectShareRequests.projectId, p.id), eq(projectShareRequests.status, 'pending'))).orderBy(asc(projectShareRequests.requestedAt)) : Promise.resolve([]),
    readMark('member', viewer.id, p.id),
    db.select({ id: projectTickets.id, number: projectTickets.number, subject: projectTickets.subject, status: projectTickets.status, escalatedAt: projectTickets.escalatedAt, lastClientAt: projectTickets.lastClientAt, lastStudioAt: projectTickets.lastStudioAt, createdAt: projectTickets.createdAt })
      .from(projectTickets).where(and(eq(projectTickets.projectId, p.id), inArray(projectTickets.status, ['open', 'in_progress']))),
    db.select({ id: floorPlanMarks.id, planId: floorPlanMarks.planId }).from(floorPlanMarks).innerJoin(projectFloorPlans, eq(projectFloorPlans.id, floorPlanMarks.planId))
      .where(and(eq(floorPlanMarks.projectId, p.id), eq(floorPlanMarks.authorKind, 'client'), eq(floorPlanMarks.status, 'open'), isNull(floorPlanMarks.deletedAt), isNull(projectFloorPlans.putAwayAt))).orderBy(asc(floorPlanMarks.createdAt)),
    fetchScheduleRules(),
    fetchClientAccess(l.id),
  ])
  const unreadRows = await db.select({ body: projectMessages.body, at: projectMessages.createdAt }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, p.id), eq(projectMessages.authorKind, 'client'), isNull(projectMessages.deletedAt), gt(projectMessages.createdAt, new Date(readAt ?? 0)))).orderBy(desc(projectMessages.createdAt))
  /* the client's marks nobody at the studio has answered yet — floorPlanToAnswer's rule, with the first one's place */
  const answeredMarks = markRows.length ? new Set((await db.select({ markId: floorPlanComments.markId }).from(floorPlanComments)
    .where(and(inArray(floorPlanComments.markId, markRows.map((m) => m.id)), eq(floorPlanComments.authorKind, 'studio'), isNull(floorPlanComments.deletedAt)))).map((c) => c.markId)) : new Set<string>()
  const openMarks = markRows.filter((m) => !answeredMarks.has(m.id))
  const tickets = ticketRows.map((t) => { const tf = { status: t.status, lastClientAt: t.lastClientAt?.getTime() ?? null, lastStudioAt: t.lastStudioAt?.getTime() ?? null, createdAt: t.createdAt.getTime() }
    return { id: t.id, number: t.number, subject: t.subject, escalated: !!t.escalatedAt, waitingDays: waitingDays(tf, now), studioTurn: turnOf(tf) === 'studio' } })
  const reviewList = reviewRows.filter((u) => u.status === 'in_review' || (u.status === 'published' && pendingWaits(parsePending(u.pending))))
    .map((u) => { const held = u.status === 'published' ? parsePending(u.pending) : null
      return { id: u.id, title: held?.title ?? u.title, author: memberName(held?.by ?? u.submittedBy ?? u.authorId) ?? null, at: held?.at ?? (u.submittedAt ?? u.createdAt).getTime(), change: !!held } })   // (simplify round 2) a change held on a published update
  const sharesNow = sharesAtOnce(viewer.role, schedRules)
  const moneyRows: NeedRow[] = money ? await fetchMoneyNeeds(p.id, viewer, now).catch(() => []) : []   // (contract B) K-M's money rows — the Money tab's own, for this viewer
  const nf: NeedFacts = {
    base: projectHref(p.id), client: firstOfClient, stage, hold, now, today, mayChange,
    quoteHref: q ? `/quotes/${q.id}?from=${from}` : null,
    reviews: reviewList,
    handoverAsk: ending.request && ending.runs ? { by: ending.request.by.name, at: ending.request.at } : null,
    doneAsks: answers ? live.filter((m) => m.doneAsked && m.status !== 'done').map((m) => ({ id: m.id, title: m.title, by: memberName(m.doneAsked!.by) ?? m.doneAsked!.by, at: dateOfDay(m.doneAsked!.at).getTime() })) : [],
    moreTime: moreRows.flatMap((x) => { const m = live.find((y) => y.id === x.milestoneId); return m ? [{ id: x.id, milestoneId: m.id, title: m.title, by: memberName(x.by) ?? 'The team', fromEnd: dayOfStored(x.fromEnd), toEnd: dayOfStored(x.toEnd), at: x.at.getTime() }] : [] }),
    shareAsk: shareRows[0] ? { by: memberName(shareRows[0].by) ?? 'The team', at: shareRows[0].at.getTime(), n: Array.isArray(shareRows[0].ids) ? (shareRows[0].ids as unknown[]).length || (sf?.unshared ?? 0) : sf?.unshared ?? 0 } : null,
    unread: unreadRows.length ? { n: unreadRows.length, text: unreadRows[0]!.body || null, at: unreadRows[0]!.at.getTime() } : null,
    tickets, ticketWaitDays: WAIT_DAYS,
    marks: openMarks.length ? { n: openMarks.length, planId: openMarks[0]!.planId, markId: openMarks[0]!.id } : null,
    declined: cf?.declined ?? [],
    concerns: live.filter((m) => m.confirm.answer === 'changes' && !isResolved(m)).map((m) => ({ id: m.id, title: m.title })),
    milestones: live.map((m) => ({ id: m.id, title: m.title, start: m.start, end: m.end, status: m.status, waitingOn: m.waiting?.on ?? null, waitingWho: m.waiting ? waitingWho(m, firstOfClient, studio) : null, waitingSince: m.waiting?.since ?? null })),
    targetEnd: p.targetEndDate?.getTime() ?? null,
    progress: { done: sf?.progress.done ?? 0, total: sf?.progress.total ?? 0 },
    schedule: { unshared: sf?.unshared ?? 0, shared: sf?.shared ?? false, sharesAtOnce: sharesNow, asked: !!sf?.asks?.share },
    lastToldAt: lastPub?.at ? lastPub.at.getTime() : null, startedAt: p.startedAt?.getTime() ?? null,
    setup: gettingStarted(facts),
    ending: { near: ending.near, mayHandover: ending.mayHandover },
    /* (parity map, SC-094) an approved variation order's extra days nobody has answered — "VO-n adds n days — move what follows?" */
    voDays: mayChange && stage === 'in_progress' ? (await voDaysOf([p.id])).get(p.id)?.open ?? [] : [],
    /* (S45B · H-UHD-2) work starting this week with no contractor of its trade */
    crewGaps: mayChange && stage === 'in_progress' && !hold ? await (await import('./contractors')).crewGapsOf(p.id, live, today) : [],
  }
  const needs = needsOf(nf, moneyRows)
  const asksWaiting = !!sf?.asks?.share && !sharesNow   // a Designer's share ask already waits: the old registry offers no second Share
  /* (S-02) the header's one filled action is the top row's; with nothing waiting, the stage's registry (REG-917) — its money and share entries
     are Needs you rows now, so the fallback never names them */
  const primary = primaryOf(needs, firstOfClient) ?? (mayChange ? primaryAction({ stage, mayChange, milestones: sf?.milestones ?? 0, unshared: asksWaiting ? 0 : sf?.unshared ?? 0, shared: sf?.shared ?? false,
    handover: ending.request ? 'requested' : ending.near ? 'near' : null, reviews: ending.runs, onHold: !!hold, readyInvoice: null }) : null)
  const tabCounts = tabCountsOf({
    tasksDue: openTasks.filter((t) => isOverdue(t.dueAt, now) || isDueToday(t.dueAt, now)).length,
    scheduleAsks: answers ? nf.moreTime.length + nf.doneAsks.length + shareRows.length : 0,
    toShare: mayChange && stage === 'in_progress' && (sf?.unshared ?? 0) > 0 && !asksWaiting,
    reviews: reviewsUpdates ? updateFacts.get(p.id)?.inReview ?? 0 : 0,
    unread: await unreadInChat(p.id, viewer.id), ticketsToAnswer: await ticketsToAnswer(p.id),   // (gaps build H) the house counts
    declined: cf?.declined?.length ?? 0,
    marks: await floorPlanToAnswer(p.id),   // (gaps build G)
    meetings: await (await import('@/lib/meetings/queries')).meetingsWaiting(l.id, now),   // (pending modules S23)
  }, needs)
  /* (S-01) WITH {CLIENT}: the Invite to Portal panel's own read (lib/portal/access.ts) — what waits on them with its link, so Remind drafts the
     panel's WhatsApp; their money stays with the Money card */
  const withClient: WithClient = {
    portal: access ? { state: access.chip.state, label: access.chip.label, phone: access.client.phone, studio: access.studio, paused: access.paused, mayAct: access.mayAct, home: portalPath(access.slug) }
      : { state: 'none', label: 'Not invited', phone: l.phone, studio: '', paused: false, mayAct: false, home: '' },
    waiting: (access?.waiting ?? []).filter((w) => w.kind !== 'payment').map((w) => ({ key: w.key, kind: w.kind, title: w.title, line: w.line, href: w.href })),
    reminded: access?.reminded ?? {},
    lastTold: lastPub?.at ? { id: lastPub.id, title: lastPub.title, at: lastPub.at.getTime() } : null,
    unanswered: record.unanswered.length,
  }
  /* (pending modules S23) the client's meetings: the last one held (With {client}'s line, 1.0's Meeting Summary) and the ones planned (Coming up) */
  const { meetings: meetingT } = await import('@/lib/db/schema')
  const { aimLabel: meetingAim, parseBrief: meetingBrief } = await import('@/lib/meetings/model')
  const meetingList = await db.select({ id: meetingT.id, aim: meetingT.aim, status: meetingT.status, startsAt: meetingT.startsAt, whereKind: meetingT.whereKind, briefJson: meetingT.briefJson }).from(meetingT).where(and(eq(meetingT.leadId, l.id), isNull(meetingT.deletedAt)))
  const lastHeld = meetingList.filter((x) => x.status === 'held').sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0]
  /* its line: 1.0's card's first "Top action" and its deal score — else the brief's second sentence (what they want) */
  const lastBrief = lastHeld ? meetingBrief(lastHeld.briefJson) : null
  const metLine = lastBrief ? [lastBrief.actions[0] ? `Next: ${lastBrief.actions[0]}` : lastBrief.summary.split(/(?<=\.)\s/)[1] ?? null, lastBrief.score ? `deal score ${lastBrief.score}` : null].filter(Boolean).join(' · ') || null : null
  withClient.lastMet = lastHeld ? { id: lastHeld.id, at: lastHeld.startsAt.getTime(), line: metLine } : null
  /* (S-01) COMING UP: this week and next — a milestone starting or ending, a task with someone from outside; when it is quiet, the next three
     dates; then the next invoice and the milestone it waits on */
  const windowEnd = today + ((7 - weekdayOf(today)) % 7) + 7   // the end of next week (Sunday)
  const events: ComingUpItem[] = [
    ...live.filter((m) => m.status === 'not_started' && m.start >= today).map((m) => ({ key: `start:${m.id}`, day: m.start, title: `${m.title} starts`, icon: 'event', href: projectHref(p.id, `schedule?open=${encodeURIComponent(m.id)}`) })),
    ...live.filter((m) => (m.status === 'in_progress' || m.status === 'blocked') && m.end >= today).map((m) => ({ key: `end:${m.id}`, day: m.end, title: `${m.title} ends`, icon: 'flag', href: projectHref(p.id, `schedule?open=${encodeURIComponent(m.id)}`) })),
    ...leadRow.tasks.filter((t) => !t.done && t.externalName && t.dueAt && dayOf(t.dueAt) >= today).map((t) => ({ key: `task:${t.id}`, day: dayOf(t.dueAt!), title: `${t.externalName} — ${t.title}`, icon: 'person', href: projectHref(p.id, `tasks?open=${encodeURIComponent(t.id)}`) })),
    ...meetingList.filter((x) => x.status === 'planned' && dayOf(x.startsAt) >= today).map((x) => ({ key: `meeting:${x.id}`, day: dayOf(x.startsAt), title: `${meetingAim(x.aim) === 'Other' ? 'Meeting' : meetingAim(x.aim)} with ${firstOfName(l.name)}`, caption: x.whereKind, icon: 'event', href: `/meetings/${x.id}` })),   // (pending modules S23)
  ].sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
  const soon = events.filter((e) => (e.day ?? 0) <= windowEnd)
  const comingUp: ComingUpItem[] = (soon.length >= 3 ? soon : events.slice(0, 3)).slice(0, 6)
  const nextStage = stage === 'completed' || !money ? null : money.summary.stages.find((st) => (!st.invoice || st.invoice.status === 'draft') && st.milestone && st.milestone.status !== 'done')
  if (nextStage?.milestone) comingUp.push({ key: `invoice:${nextStage.ref}`, day: null, title: `${nextStage.name} invoice`, caption: `sent when ${nextStage.milestone.title} ${nextStage.milestone.due === 'start' ? 'starts' : 'is done'}`, icon: 'payments',
    href: projectHref(p.id, nextStage.invoice ? `money?open=${encodeURIComponent(nextStage.invoice.id)}` : 'money') })

  return {
    project: { id: p.id, number: p.number, name: p.name, stage, projectType: p.projectType, startDate: p.startDate, targetEndDate: p.targetEndDate, startedAt: p.startedAt, completedAt: p.completedAt, createdAt: p.createdAt, updatedAt: p.updatedAt, hold, scope: parseScope(p.scope) },
    lead: { id: l.id, name: titleCaseName(l.name), phone: l.phone, email: l.email, propertyType: l.propertyType, propertyAddress: l.propertyAddress, leadAddress: l.leadAddress, area: l.area, source: l.source, direct: l.direct, createdAt: l.createdAt, areaSqft: l.areaSqft, style: l.style },
    team, studio, viewer, mayChange,
    assignable: assignHint(viewer) ? [] : assignableIds(viewer, studio), assignHint: assignHint(viewer),
    primary,   // (simplify S-02) the top Needs you row's action — the registry when nothing waits (above)
    setup: gettingStarted(facts),
    attention: attentionReasons(af, now),   // (fix-A, A-07) with the target end
    waitingOn: waitingList.map((w) => w.text),   // (fix-A, A-10) the same lines the Status card presses
    money,
    quote: q ? { id: q.id, number: q.number, title: q.title, status: q.status, amountMinor: q.amountMinor, signedAt: q.signedAt } : null,
    contract: c ? { id: c.id, title: c.title, status: c.status, signedAt: c.signedAt } : null,
    renders: renderRows,
    activity: act.events.slice(0, 5),
    updates: latestUpdates,
    wonAt: wonLog[0]?.at ?? p.createdAt,
    now,
    schedule: sf && sf.milestones ? { facts: sf, next: nextOpen(ms.get(p.id) ?? [], 2).map((m) => ({ id: m.id, title: m.title, start: m.start, end: m.end, status: m.status })),
      running: [...live].sort((a, b) => a.position - b.position).filter((m) => m.status === 'in_progress').map((m) => ({ id: m.id, title: m.title, start: m.start, end: m.end })) } : null,
    ending,
    attentionItems: attentionList, waitingItems: waitingList,   // (fix-A, A-10 · C-17)
    documents, quoteFile: quoteFile ?? null,
    contractFile: c ? null : contractFile,   // (gaps build, package A — 6)
    tabCounts,   // (simplify S-04) one rule — what waits on this viewer there, per view (lib/projects/needs-you.ts `tabCountsOf`)
    needs, withClient, comingUp,   // (simplify S-01 · S-02)
    closing: stage === 'completed' ? await closingSummaryOf(p, { withMoney: seesMoney(viewer, teamIds), now }) : null,   // (gaps build, package A — 4)
    record,   // (parity P-01 · P-04 · P-17)
  }
}
/** Per-request memo: the page and its metadata both read it. */
export const fetchProjectDetail = cache(fetchProjectDetailUncached)

/** The lead a project carries on — the tab pages hand its id to the lead's own tab loaders. Who sees: the lead's rule. */
export async function projectLeadId(projectId: string): Promise<string | null> {
  const [p] = await db.select({ leadId: projects.leadId }).from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  return p?.leadId ?? null
}

/** (Q-04) A direct lead's project, for `/leads/<id>` — a direct lead's record is its project. (fix-E, E-07) In Deleted Projects too: its
    client's address then lands where the project's own does (the listing, which says where it went), never on the bare not-found page. */
export async function directProjectOf(leadId: string): Promise<string | null> {
  const [r] = await db.select({ id: projects.id }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.leadId, leadId), eq(leads.direct, true))).limit(1)
  return r?.id ?? null
}

/** (REG-709) For the studio-wide search. */
export async function searchableProjects(): Promise<{ id: string; number: string; name: string; stage: string; leadId: string; client: string; phone: string; property: string | null; projectType: string | null; household: { name: string; phone: string }[] }[]> {
  const rows = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt), isNotNull(projects.number)))
  /* (fix-G, G-31) someone from the household is found with the project they can open — by name or by number */
  const { homeownerHouseholdLinks, homeownerProfiles } = await import('@/lib/db/schema')
  const hh = await db.select({ leadId: homeownerHouseholdLinks.leadId, name: homeownerProfiles.name, phone: homeownerProfiles.phone }).from(homeownerHouseholdLinks)
    .innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerHouseholdLinks.homeownerId)).where(isNull(homeownerHouseholdLinks.removedAt))
  const householdOf = (leadId: string) => hh.filter((h) => h.leadId === leadId).map((h) => ({ name: h.name ?? '', phone: h.phone ?? '' }))
  return rows.map(({ p, l }) => ({ id: p.id, number: p.number, name: p.name, stage: p.stage, leadId: l.id, client: titleCaseName(l.name), phone: l.phone, household: householdOf(l.id), property: l.propertyAddress ?? l.leadAddress, projectType: p.projectType }))
}
