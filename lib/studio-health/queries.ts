import 'server-only'   // libSQL never reaches the browser: the page hands the client plain facts
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  creditLedger, hangoutMeetings, hangoutParticipations, homeownerLeadLinks, leadEvents, leadMessages, leadTasks, leads, members, portalSessions,
  projectInvoices, projectMessages, projectSelections, projectTickets, projects, quotes, studioSessions,
} from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { fetchInsights } from '@/lib/leads/insights'
import { fetchProjectInsights } from '@/lib/projects/insights'
import { publishedSiteUpdateRows } from '@/lib/dashboard/updates'
import { ACT_SOURCES, stampsSql } from './sources'
import type { Act, HealthFacts } from './model'

/**
 * (pending modules S39 — card studio:studio-health) Company › Reports › Studio health's facts: each record's moment, once; the report is pure
 * and derives per range in the browser (lib/studio-health/model.ts). Owners and Admins only (1.0's page was the Owner's; 2.0's reports are the
 * Owners' and Admins' — the other tabs' rule); anyone else gets null and the tab's gate. Owners and Admins see every lead, so Who sees leads
 * narrows nothing. Every figure reads the rows another page counts — Reports › Leads' and › Projects' own facts, the Dashboard's published
 * updates, Plan › Usage's ledger, Qanvast Ops › Studios' client usage — never a second computation.
 */
export async function fetchStudioHealth(): Promise<HealthFacts | null> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return null
  const now = Date.now()
  const [team, acts, signIns, ai, insights, projectInsights, quoteRows, invoiceRows, taskRows, completions, tickets, updates, chats, parts, clients, links, projectCount] = await Promise.all([
    db.select({ id: members.id, name: members.name, role: members.role, color: members.color, active: members.isActive }).from(members),
    memberActs(),
    db.select({ m: studioSessions.memberId, at: studioSessions.startedAt }).from(studioSessions),
    db.select({ m: creditLedger.memberId, at: creditLedger.createdAt, credits: creditLedger.credits, reason: creditLedger.reason }).from(creditLedger).where(inArray(creditLedger.reason, ['spend', 'refund'])),
    fetchInsights(),
    fetchProjectInsights(),
    /* quotes as they stand sent to the client — never a variation order (every quote list's rule: kind = 'quote'), on a live lead */
    db.select({ m: quotes.createdBy, at: quotes.clientSentAt }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
      .where(and(eq(quotes.kind, 'quote'), isNull(quotes.deletedAt), isNull(leads.deletedAt), isNotNull(quotes.clientSentAt))),
    db.select({ m: projectInvoices.sentBy, at: projectInvoices.sentAt }).from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId))
      .where(and(isNotNull(projectInvoices.sentAt), isNull(projects.deletedAt))),
    /* every task on a live lead and every studio task (no lead) */
    db.select({ id: leadTasks.id, done: leadTasks.done, createdAt: leadTasks.createdAt, updatedAt: leadTasks.updatedAt }).from(leadTasks).leftJoin(leads, eq(leads.id, leadTasks.leadId))
      .where(sql`(${leadTasks.leadId} IS NULL OR ${leads.deletedAt} IS NULL)`),
    /* a done task's own line in Activity (lib/leads/activity.ts): who ticked it and when — the newest, since a reopen comes between */
    db.select({ taskId: sql<string>`json_extract(${leadEvents.detail}, '$.id')`, m: leadEvents.actorId, at: leadEvents.at }).from(leadEvents)
      .where(eq(leadEvents.kind, 'task_completed')).orderBy(desc(leadEvents.at)),
    db.select({ at: projectTickets.createdAt, resolvedAt: projectTickets.resolvedAt, closedAt: projectTickets.closedAt, client: projectTickets.raisedKind }).from(projectTickets),
    publishedSiteUpdateRows(),
    db.select({ m: hangoutMeetings.memberId, at: hangoutMeetings.endedAt, eventId: hangoutMeetings.eventId }).from(hangoutMeetings)
      .where(and(eq(hangoutMeetings.status, 'completed'), isNotNull(hangoutMeetings.endedAt))),
    db.select({ id: hangoutParticipations.id }).from(hangoutParticipations).limit(1),
    clientPortalActs(),
    db.select({ id: homeownerLeadLinks.id }).from(homeownerLeadLinks).limit(1),
    db.select({ n: sql<number>`count(*)` }).from(projects),
  ])
  const ms = (d: Date | null | undefined) => (d instanceof Date ? d.getTime() : null)
  const doneBy = new Map<string, { m: string | null; at: number }>()
  for (const c of completions) if (c.taskId && !doneBy.has(c.taskId)) doneBy.set(c.taskId, { m: c.m, at: c.at.getTime() })
  return {
    now,
    team: team.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color, active: p.active !== false })),
    acts,
    signIns: signIns.map((s) => ({ m: s.m, at: s.at.getTime() })),
    ai: ai.map((r) => ({ m: r.m, at: r.at.getTime(), credits: r.credits, run: r.reason === 'spend' })),
    leads: insights.facts,
    projects: projectInsights?.facts ?? [],
    quotesSent: quoteRows.flatMap((q) => (q.at ? [{ m: q.m, at: q.at.getTime() }] : [])),
    invoicesSent: invoiceRows.flatMap((i) => (i.at ? [{ m: i.m, at: i.at.getTime() }] : [])),
    tasksAdded: taskRows.map((t) => t.createdAt.getTime()),
    tasksDone: taskRows.filter((t) => t.done).map((t) => doneBy.get(t.id) ?? { m: null, at: (t.updatedAt ?? t.createdAt).getTime() }),
    tickets: tickets.map((t) => ({ at: t.at.getTime(), doneAt: ms(t.resolvedAt) ?? ms(t.closedAt) })),
    updates: updates.map((u) => ({ m: u.authorId, at: u.publishedAt?.getTime() ?? now, projectId: u.projectId })),
    chats: chats.flatMap((c) => (c.at ? [{ m: c.m, at: c.at.getTime(), eventId: c.eventId }] : [])),
    clients,
    has: { projects: Number(projectCount[0]?.n ?? 0) > 0, hangouts: parts.length > 0 || chats.length > 0, portal: links.length > 0 },
  }
}

/** Every act the records name a member for (lib/studio-health/sources.ts) — one statement. */
async function memberActs(): Promise<Act[]> {
  const rows = await db.all<{ m: unknown; at: unknown }>(sql.raw(stampsSql(ACT_SOURCES)))
  return rows.flatMap((r) => (typeof r.m === 'string' && r.m && Number.isFinite(Number(r.at)) ? [{ m: r.m, at: Number(r.at) }] : []))
}

/**
 * (parity map, CP-149 — Qanvast Ops › Studios' usage, lib/platform-studios.ts) What a studio's clients did on the portal, each moment once:
 * sign-ins (a client's session — never a studio member's look-as), issues the client reported, messages the client's side wrote (the household
 * included, a lead's conversation too; the team's own conversation never), and choices the client made on their page. Qanvast Ops counts the
 * last 30 days of these; Studio health counts its range — one rule.
 */
export type ClientPortalActs = HealthFacts['clients']
export async function clientPortalActs(): Promise<ClientPortalActs> {
  const [signIns, issues, messages, leadMsgs, choices] = await Promise.all([
    db.select({ c: portalSessions.homeownerId, at: portalSessions.createdAt }).from(portalSessions).where(eq(portalSessions.kind, 'client')),
    db.select({ at: projectTickets.createdAt, resolvedAt: projectTickets.resolvedAt, closedAt: projectTickets.closedAt }).from(projectTickets).where(eq(projectTickets.raisedKind, 'client')),
    db.select({ c: projectMessages.authorId, at: projectMessages.createdAt }).from(projectMessages).where(and(eq(projectMessages.authorKind, 'client'), eq(projectMessages.channel, 'client'), isNull(projectMessages.deletedAt))),
    db.select({ c: leadMessages.authorId, at: leadMessages.createdAt }).from(leadMessages).where(and(eq(leadMessages.authorKind, 'client'), isNull(leadMessages.deletedAt))),
    db.select({ at: projectSelections.chosenAt }).from(projectSelections).where(and(eq(projectSelections.chosenBy, 'client'), isNotNull(projectSelections.chosenAt), isNull(projectSelections.deletedAt))),
  ])
  return {
    signIns: signIns.map((s) => ({ c: s.c, at: s.at.getTime() })),
    issues: issues.map((i) => ({ at: i.at.getTime(), open: !i.resolvedAt && !i.closedAt })),
    messages: [...messages, ...leadMsgs].map((x) => ({ c: x.c ?? null, at: x.at.getTime() })),
    choices: choices.flatMap((x) => (x.at ? [{ at: x.at.getTime() }] : [])),
  }
}

/** The client usage since a moment — Qanvast Ops › Studios' four figures. */
export const clientUsageSince = (a: ClientPortalActs, since: number) => ({
  signIns: a.signIns.filter((x) => x.at >= since).length, issues: a.issues.filter((x) => x.at >= since).length,
  messages: a.messages.filter((x) => x.at >= since).length, choices: a.choices.filter((x) => x.at >= since).length,
})
