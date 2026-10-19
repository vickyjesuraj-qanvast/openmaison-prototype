import 'server-only'
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, projectTickets, projects, settings, ticketReplies, type ProjectTicket, type TicketReply } from '@/lib/db/schema'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { pickable } from '@/lib/leads/assign-policy'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { titleCaseName } from '@/lib/format'
import { imageAddress } from '@/lib/leads/file-store'
import { asksOf } from './client-asks'   // (simplify S-22)
import { NO_ASK, type AskLinks } from './client-asks-model'
import { DEFAULT_CATEGORIES, STUDIO_ONLY_EVENTS, TICKET_CATEGORIES_KEY, WAIT_DAYS, isLive, liveCategories, parseCategories, turnOf, waitingDays, type TicketCategory, type TicketStatus } from './tickets-model'
import { DEFAULT_TICKET_NUMBERING, TICKET_NUMBERING_KEY, nextTicketNumber, parseTicketNumbering } from './tickets-model'   // (parity map, UC-058)
import type { ProjectNumbering } from './model'

/*
 * (gaps build H — H-Q1…H-Q10, H-Q25) The tickets' reads: a project's, the studio's (every project the viewer sees — Who sees leads), one
 * ticket's thread, the client's issues (without internal notes or studio-only lines, H-Q6), the categories, Needs attention's facts.
 * Writes: app/projects/tickets-actions.ts (the studio) · app/portal/tickets-actions.ts (the client).
 */

export type TicketPhoto = { id: string; src: string }
export type TicketLine = { id: string; authorKind: 'client' | 'studio'; authorId: string | null; authorName: string; body: string; photos: TicketPhoto[]; internal: boolean; event: string | null; at: number
  /** a member's avatar tint (the client's side has none) */ color: string | null }
export type TicketRow = {
  id: string; number: string; projectId: string; projectName: string; projectNumber: string; leadId: string; client: string
  category: string; subject: string; body: string; photos: TicketPhoto[]
  status: TicketStatus; priority: 'normal' | 'urgent'
  assignee: { id: string; name: string; color: string } | null
  raisedKind: 'client' | 'studio'; raisedByName: string
  createdAt: number; updatedAt: number; lastClientAt: number | null; lastStudioAt: number | null
  resolvedAt: number | null; closedAt: number | null; escalatedAt: number | null; escalateNote: string | null
  /** whose word is next — the studio's, the client's, or nobody's (resolved / closed) */
  turn: 'studio' | 'client' | null
  /** the newest word in the thread (not an internal note's for the client) — the list's second line */
  last: { by: string; body: string; at: number } | null
  replies: number
  /** (simplify S-22) the task and the variation order made from it — the studio's reads only */
  asks?: AskLinks
}
export type TicketTeamMember = { id: string; name: string; role: string; color: string; onTeam: boolean }

const photosOf = (v: unknown, src: (id: string) => string): TicketPhoto[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((id) => ({ id, src: src(id) })) : [])
const studioPhoto = (id: string) => imageAddress(id)

export async function fetchTicketCategories(): Promise<TicketCategory[]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TICKET_CATEGORIES_KEY)).limit(1)
  if (!row) return DEFAULT_CATEGORIES
  try { return parseCategories(JSON.parse(row.value)) } catch { return DEFAULT_CATEGORIES }
}

/* ── (parity map 2026-10-10 — UC-058 · FR-084) the ticket's number, as Settings › Finance › Document numbers' Tickets row sets it ── */
export async function fetchTicketNumbering(): Promise<ProjectNumbering> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TICKET_NUMBERING_KEY)).limit(1)
  if (!row) return DEFAULT_TICKET_NUMBERING
  try { return parseTicketNumbering(JSON.parse(row.value)) } catch { return DEFAULT_TICKET_NUMBERING }
}
/** Every ticket number the studio has given (the row's "Next:" and the next number read them). */
export async function ticketNumbers(): Promise<string[]> {
  return (await db.select({ n: projectTickets.number }).from(projectTickets)).map((r) => r.n)
}
/** The number a ticket raised now takes — the studio's pattern, one past the highest given under it. Both sides raise through it
    (app/projects/tickets-actions.ts, and the portal's report). */
export async function issueTicketNumber(at: Date = new Date()): Promise<string> {
  const [n, numbers] = await Promise.all([fetchTicketNumbering(), ticketNumbers()])
  return nextTicketNumber(n, numbers, at)
}

type Head = { t: ProjectTicket; p: { id: string; name: string; number: string; leadId: string }; client: string }
async function rowsOf(heads: Head[], o: { client?: boolean } = {}): Promise<TicketRow[]> {
  if (!heads.length) return []
  const ids = heads.map((h) => h.t.id)
  const [replies, team] = await Promise.all([
    db.select().from(ticketReplies).where(inArray(ticketReplies.ticketId, ids)).orderBy(asc(ticketReplies.createdAt)),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
  ])
  const byId = new Map(team.map((m) => [m.id, m]))
  return heads.map(({ t, p, client }) => {
    const mine = replies.filter((r) => r.ticketId === t.id && !r.event && (!o.client || !r.internal))
    const last = mine[mine.length - 1]
    const a = t.assigneeId ? byId.get(t.assigneeId) : undefined
    return {
      id: t.id, number: t.number, projectId: p.id, projectName: p.name, projectNumber: p.number, leadId: p.leadId, client,
      category: t.category, subject: t.subject, body: t.body, photos: photosOf(t.photos, studioPhoto),
      status: t.status as TicketStatus, priority: t.priority === 'urgent' ? 'urgent' : 'normal',
      assignee: a ? { id: a.id, name: a.name, color: a.color } : null,
      raisedKind: t.raisedKind === 'studio' ? 'studio' : 'client', raisedByName: t.raisedByName,
      createdAt: t.createdAt.getTime(), updatedAt: t.updatedAt.getTime(), lastClientAt: t.lastClientAt?.getTime() ?? null, lastStudioAt: t.lastStudioAt?.getTime() ?? null,
      resolvedAt: t.resolvedAt?.getTime() ?? null, closedAt: t.closedAt?.getTime() ?? null, escalatedAt: t.escalatedAt?.getTime() ?? null, escalateNote: t.escalateNote,
      turn: turnOf({ status: t.status, lastClientAt: t.lastClientAt?.getTime() ?? null, lastStudioAt: t.lastStudioAt?.getTime() ?? null, createdAt: t.createdAt.getTime() }),
      last: last ? { by: last.authorName, body: last.body, at: last.createdAt.getTime() } : null,
      replies: mine.length,
    }
  })
}
/** Each member's avatar tint, for the thread's lines. */
export async function tintMap(): Promise<Map<string, string>> {
  return new Map((await db.select({ id: members.id, color: members.color }).from(members)).map((m) => [m.id, m.color]))
}
const order = (a: TicketRow, b: TicketRow) => {
  /* live first — the studio's turn first, urgent first — then the newest */
  const rank = (t: TicketRow) => (isLive(t.status) ? (t.turn === 'studio' ? 0 : 1) : 2) * 2 + (t.priority === 'urgent' && isLive(t.status) ? 0 : 1)
  return rank(a) - rank(b) || b.updatedAt - a.updatedAt
}

/** The thread of one ticket, as the studio reads it — internal notes and every state line included. */
export function linesOf(replies: TicketReply[], o: { client?: boolean; src?: (id: string) => string; tint?: Map<string, string> } = {}): TicketLine[] {
  return replies
    .filter((r) => !o.client || (!r.internal && !(r.event && (STUDIO_ONLY_EVENTS as readonly string[]).includes(r.event))))
    .map((r) => ({ id: r.id, authorKind: r.authorKind === 'client' ? 'client' : 'studio', authorId: r.authorId, authorName: r.authorName, body: r.body, photos: photosOf(r.photos, o.src ?? studioPhoto), internal: r.internal, event: r.event, at: r.createdAt.getTime(),
      color: r.authorKind === 'studio' && r.authorId ? o.tint?.get(r.authorId) ?? null : null }))
}

export type ProjectTicketsData = {
  project: { id: string; name: string; number: string; leadId: string; stage: string; client: string }
  tickets: TicketRow[]
  threads: Record<string, TicketLine[]>
  categories: string[]
  team: TicketTeamMember[]
  mayChange: boolean
  me: { id: string; name: string }
  now: number
}

async function teamFor(leadId: string): Promise<TicketTeamMember[]> {
  const [all, on] = await Promise.all([
    db.select({ id: members.id, name: members.name, role: members.role, color: members.color, isActive: members.isActive }).from(members),
    db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId)),
  ])
  const onIds = new Set(on.map((r) => r.id))
  return pickable(all).map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, onTeam: onIds.has(m.id) }))
    .sort((a, b) => Number(b.onTeam) - Number(a.onTeam) || a.name.localeCompare(b.name))
}

/** A project's tickets with their threads — null when the project is gone or the viewer may not see it. */
export async function fetchProjectTickets(projectId: string): Promise<ProjectTicketsData | null> {
  const [row] = await db.select({ p: projects, client: leads.name }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.p.leadId))) return null
  const [list, categories, team, me] = await Promise.all([
    db.select().from(projectTickets).where(eq(projectTickets.projectId, projectId)).orderBy(desc(projectTickets.createdAt)),
    fetchTicketCategories(),
    teamFor(row.p.leadId),
    db.select({ name: members.name }).from(members).where(eq(members.id, viewer.id)).limit(1),
  ])
  const client = titleCaseName(row.client)
  const p = { id: row.p.id, name: row.p.name, number: row.p.number, leadId: row.p.leadId }
  const asks = await asksOf(projectId, 'ticket')   // (simplify S-22)
  const tickets = (await rowsOf(list.map((t) => ({ t, p, client })))).sort(order).map((t) => ({ ...t, asks: asks[t.id] ?? NO_ASK }))
  const replies = list.length ? await db.select().from(ticketReplies).where(inArray(ticketReplies.ticketId, list.map((t) => t.id))).orderBy(asc(ticketReplies.createdAt)) : []
  const tint = await tintMap()
  const threads = Object.fromEntries(list.map((t) => [t.id, linesOf(replies.filter((r) => r.ticketId === t.id), { tint })]))
  return {
    project: { ...p, stage: row.p.stage, client }, tickets, threads, categories: liveCategories(categories), team,
    mayChange: mayChangeProject(viewer, team.filter((m) => m.onTeam).map((m) => m.id)),
    me: { id: viewer.id, name: me[0]?.name ?? 'You' }, now: Date.now(),
  }
}

/** (pending modules S46B, M1) A project the studio-wide list can raise a ticket on: its client and team for the project tab's own New ticket
    compose, and why this viewer can't (the server's rule, `createTicket`'s) — null when they can. */
export type TicketProject = { id: string; name: string; number: string; client: string; stage: string; teamIds: string[]; blocked: string | null }
/** (S46B, M1) New ticket on the studio-wide list: the projects the viewer sees (the ones they may change first), the studio's live categories
    and its members — each project's compose reads its own team out of them, as the tab's `teamFor` does. Null while no project can take one. */
export type TicketRaise = { projects: TicketProject[]; categories: string[]; members: TicketTeamMember[] }
export type StudioTicketsData = { tickets: TicketRow[]; categories: string[]; now: number; me: { id: string }; raise: TicketRaise | null }
/** Every ticket on the projects the viewer sees, live ones first (the studio-wide list, /tickets — a rail place since S46, REG-2524). */
export async function fetchStudioTickets(): Promise<StudioTicketsData> {
  const viewer = await fetchViewer()
  const [rows, seen, categories, raise] = await Promise.all([
    db.select({ t: projectTickets, p: { id: projects.id, name: projects.name, number: projects.number, leadId: projects.leadId }, client: leads.name }).from(projectTickets)
      .innerJoin(projects, eq(projects.id, projectTickets.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
      .where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))),
    visibleLeadIds(viewer),
    fetchTicketCategories(),
    ticketRaise(viewer),
  ])
  const mine = rows.filter((r) => !seen || seen.has(r.p.leadId))
  const tickets = (await rowsOf(mine.map((r) => ({ t: r.t, p: r.p, client: titleCaseName(r.client) })))).sort(order)
  return { tickets, categories: categories.map((c) => c.name), now: Date.now(), me: { id: viewer.id }, raise }
}

/** (S46B, M1) Which projects this viewer may raise a ticket on from the studio-wide list — `createTicket`'s own rule (`mayChangeProject` over
    the project's team; a completed project's tickets carry on, a defect after handover is what they are for), over the projects they see.
    Null when none can take one: the list then offers no New ticket. Also the ghost's seed (`tickets.new`). */
export async function ticketRaise(viewer?: Awaited<ReturnType<typeof fetchViewer>>): Promise<TicketRaise | null> {
  const v = viewer ?? await fetchViewer()
  const [rows, seen, team, all, cats] = await Promise.all([
    db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId, client: leads.name }).from(projects)
      .innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))),
    visibleLeadIds(v),
    db.select({ leadId: leadAssignees.leadId, id: leadAssignees.memberId }).from(leadAssignees),
    db.select({ id: members.id, name: members.name, role: members.role, color: members.color, isActive: members.isActive }).from(members),
    fetchTicketCategories(),
  ])
  const list: TicketProject[] = rows.filter((r) => !seen || seen.has(r.leadId)).map((r) => {
    const teamIds = team.filter((t) => t.leadId === r.leadId).map((t) => t.id)
    return { id: r.id, name: r.name, number: r.number, client: titleCaseName(r.client), stage: r.stage, teamIds, blocked: mayChangeProject(v, teamIds) ? null : CHANGE_RULE }
  })
  if (!list.some((x) => !x.blocked)) return null
  /* the ones this viewer may raise on first; inside, the running ones before the completed, the newest number first */
  const rank = (x: TicketProject) => (x.blocked ? 2 : 0) + (x.stage === 'completed' ? 1 : 0)
  list.sort((a, b) => rank(a) - rank(b) || b.number.localeCompare(a.number, undefined, { numeric: true }))
  return { projects: list, categories: liveCategories(cats), members: pickable(all).map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, onTeam: false })) }
}

/** One ticket's thread for the studio — the studio-wide list opens it in the drawer. Null when the viewer may not see its project. */
export async function fetchTicketThread(ticketId: string): Promise<{ ticket: TicketRow; lines: TicketLine[]; team: TicketTeamMember[]; mayChange: boolean; categories: string[] } | null> {
  const [row] = await db.select({ t: projectTickets, p: projects, client: leads.name }).from(projectTickets).innerJoin(projects, eq(projects.id, projectTickets.projectId))
    .innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projectTickets.id, ticketId), isNull(projects.deletedAt))).limit(1)
  if (!row) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.p.leadId))) return null
  const [[ticket], replies, team, categories] = await Promise.all([
    rowsOf([{ t: row.t, p: { id: row.p.id, name: row.p.name, number: row.p.number, leadId: row.p.leadId }, client: titleCaseName(row.client) }]),
    db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, ticketId)).orderBy(asc(ticketReplies.createdAt)),
    teamFor(row.p.leadId),
    fetchTicketCategories(),
  ])
  const asks = (await asksOf(row.p.id, 'ticket', [ticketId]))[ticketId] ?? NO_ASK   // (simplify S-22)
  return { ticket: { ...ticket!, asks }, lines: linesOf(replies, { tint: await tintMap() }), team, mayChange: mayChangeProject(viewer, team.filter((m) => m.onTeam).map((m) => m.id)), categories: liveCategories(categories) }
}

/* ── Needs attention (H-Q25) and the tab's count ─────────────────────────────────────────────────────────────────────────────── */
export type TicketAttention = { escalated: number; waiting: number }
/** Per project: escalated tickets not resolved, and live tickets that have waited on the studio more than WAIT_DAYS. */
export async function ticketAttention(projectIds: string[], now = Date.now()): Promise<Map<string, TicketAttention>> {
  const out = new Map<string, TicketAttention>()
  if (!projectIds.length) return out
  const rows = await db.select().from(projectTickets).where(and(inArray(projectTickets.projectId, projectIds), inArray(projectTickets.status, ['open', 'in_progress'])))
  for (const t of rows) {
    const a = out.get(t.projectId) ?? { escalated: 0, waiting: 0 }
    if (t.escalatedAt) a.escalated++
    if (waitingDays({ status: t.status, lastClientAt: t.lastClientAt?.getTime() ?? null, lastStudioAt: t.lastStudioAt?.getTime() ?? null, createdAt: t.createdAt.getTime() }, now) > WAIT_DAYS) a.waiting++
    out.set(t.projectId, a)
  }
  return out
}
/** The Tickets tab's count: live tickets whose turn is the studio's. */
export async function ticketsToAnswer(projectId: string): Promise<number> {
  const rows = await db.select().from(projectTickets).where(and(eq(projectTickets.projectId, projectId), inArray(projectTickets.status, ['open', 'in_progress'])))
  return rows.filter((t) => turnOf({ status: t.status, lastClientAt: t.lastClientAt?.getTime() ?? null, lastStudioAt: t.lastStudioAt?.getTime() ?? null, createdAt: t.createdAt.getTime() }) === 'studio').length
}
/** Live tickets on the projects the viewer sees whose turn is the studio's — the rail's Tickets badge (S46, REG-2524; it was the Projects ⋮'s
    row, REG-1425) and (S46B, M1) the Dashboard's Tickets tile: one count, read here. */
export async function countTicketsToAnswer(): Promise<number> {
  return (await ticketTally()).toAnswer
}
/** (pending modules S46B, M1 — 1.0's "Escalations (3)") The studio's live tickets on the projects the viewer sees: how many wait on the studio
    (the ⋮ row's count — `countTicketsToAnswer`), how many are open in all, how many are escalated. */
export async function ticketTally(): Promise<{ toAnswer: number; open: number; escalated: number }> {
  const viewer = await fetchViewer()
  const [rows, seen] = await Promise.all([
    db.select({ t: projectTickets, leadId: projects.leadId }).from(projectTickets).innerJoin(projects, eq(projects.id, projectTickets.projectId))
      .where(and(isNull(projects.deletedAt), inArray(projectTickets.status, ['open', 'in_progress']))),
    visibleLeadIds(viewer),
  ])
  const mine = rows.filter((r) => !seen || seen.has(r.leadId))
  return {
    toAnswer: mine.filter((r) => turnOf({ status: r.t.status, lastClientAt: r.t.lastClientAt?.getTime() ?? null, lastStudioAt: r.t.lastStudioAt?.getTime() ?? null, createdAt: r.t.createdAt.getTime() }) === 'studio').length,
    open: mine.length,
    escalated: mine.filter((r) => !!r.t.escalatedAt).length,
  }
}

/** Whether a file is a photo the client may open through the portal: on one of the lead's tickets, or a reply to the client (never a note's). */
export async function isClientTicketFile(fileId: string, leadId: string): Promise<boolean> {
  const [tickets, replies] = await Promise.all([
    db.select({ photos: projectTickets.photos }).from(projectTickets).where(eq(projectTickets.leadId, leadId)),
    db.select({ photos: ticketReplies.photos }).from(ticketReplies).innerJoin(projectTickets, eq(projectTickets.id, ticketReplies.ticketId)).where(and(eq(projectTickets.leadId, leadId), eq(ticketReplies.internal, false))),
  ])
  const has = (v: unknown) => Array.isArray(v) && v.includes(fileId)
  return tickets.some((t) => has(t.photos)) || replies.some((r) => has(r.photos))
}
