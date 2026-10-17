import 'server-only'
import { and, asc, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, members, portalBellReads, projectMessages, projectTickets, projects, ticketReplies } from '@/lib/db/schema'
import { linesOf, fetchTicketCategories, tintMap, type TicketLine, type TicketPhoto } from '@/lib/projects/tickets'
import { chatLines, readMark, type ChatLine } from '@/lib/projects/messages'
import { forClient, lookUnder } from '@/lib/company/member-photo'
import { liveCategories, type TicketStatus } from '@/lib/projects/tickets-model'
import { firstName } from './model'
import { portalFileHref } from './files'
import type { PortalVisitor } from './session'
import { clientFaces } from './faces'
import type { BellChatNews, BellIssueAnswer } from './notifications-model'

/*
 * (gaps build H — H-Q2 · H-Q5 · H-Q6 · H-Q11 · H-Q15) The client's side of tickets ("issues") and the conversation, for one visitor's homes:
 * only homes with a project (work under way, or done — issues after handover are the point of them), never an internal note or a studio-only
 * line, photos through the portal's own file route. Checked by the caller's `portalGate` / `portalActor` (the section switch included).
 */

export type PortalIssue = {
  id: string; number: string; category: string; subject: string; body: string; photos: TicketPhoto[]; status: TicketStatus
  createdAt: number; resolvedAt: number | null; closedAt: number | null
  raisedKind: 'client' | 'studio'; raisedByName: string
  /** reported by this person — only they close it (H-Q5) */
  mine: boolean
  lines: TicketLine[]
  /** the studio has answered since this person last looked */
  unread: boolean
}
export type PortalThreadHome = { homeId: string; leadId: string; projectId: string; title: string; done: boolean }
export type PortalIssuesHome = PortalThreadHome & { issues: PortalIssue[] }

async function homesOf(visitor: PortalVisitor): Promise<PortalThreadHome[]> {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length) return []
  const ps = await db.select().from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  return visitor.links.flatMap((l) => { const p = ps.find((x) => x.leadId === l.leadId); return p ? [{ homeId: l.linkId, leadId: l.leadId, projectId: p.id, title: p.name, done: p.stage === 'completed' }] : [] })
}
/** The key a studio's answer rings under in the client's bell — opening the issue marks it read. */
export const issueKey = (replyId: string) => `issue:${replyId}`

export async function fetchPortalIssues(visitor: PortalVisitor, slug: string): Promise<{ homes: PortalIssuesHome[]; categories: string[] }> {
  const homes = await homesOf(visitor)
  const categories = liveCategories(await fetchTicketCategories())
  if (!homes.length) return { homes: [], categories }
  const tickets = await db.select().from(projectTickets).where(inArray(projectTickets.projectId, homes.map((h) => h.projectId))).orderBy(desc(projectTickets.createdAt))
  const [replies, reads] = await Promise.all([
    tickets.length ? db.select().from(ticketReplies).where(inArray(ticketReplies.ticketId, tickets.map((t) => t.id))).orderBy(asc(ticketReplies.createdAt)) : Promise.resolve([]),
    db.select({ key: portalBellReads.rowKey }).from(portalBellReads).where(eq(portalBellReads.homeownerId, visitor.homeownerId)),
  ])
  const read = new Set(reads.map((r) => r.key))
  const src = (id: string) => portalFileHref(slug, id)
  /* (pending modules S01 · S13) a client's page carries no studio picture address — the client's own team shows its faces through the portal's */
  const faces = await clientFaces(slug, visitor)
  const tint = new Map([...(await tintMap())].map(([id, look]) => [id, forClient([{ color: look }], faces)[0]!.color ?? lookUnder(look)]))
  return {
    categories,
    homes: homes.map((h) => ({
      ...h,
      issues: tickets.filter((t) => t.projectId === h.projectId).map((t): PortalIssue => {
        const lines = linesOf(replies.filter((r) => r.ticketId === t.id), { client: true, src, tint })
        const since = t.lastClientAt?.getTime() ?? t.createdAt.getTime()
        const unread = lines.some((l) => l.authorKind === 'studio' && (!l.event || l.event === 'resolved') && l.at > since && !read.has(issueKey(l.id)))
        return {
          id: t.id, number: t.number, category: t.category, subject: t.subject, body: t.body,
          photos: (Array.isArray(t.photos) ? (t.photos as unknown[]) : []).filter((x): x is string => typeof x === 'string').map((id) => ({ id, src: src(id) })),
          status: t.status as TicketStatus, createdAt: t.createdAt.getTime(), resolvedAt: t.resolvedAt?.getTime() ?? null, closedAt: t.closedAt?.getTime() ?? null,
          raisedKind: t.raisedKind === 'studio' ? 'studio' : 'client', raisedByName: t.raisedByName, mine: t.raisedKind === 'client' && t.raisedById === visitor.homeownerId, lines, unread,
        }
      }),
    })),
  }
}

export type PortalChatHome = PortalThreadHome & { lines: ChatLine[]; more: boolean; readAt: number | null; team: { name: string; color: string }[] }
export async function fetchPortalChats(visitor: PortalVisitor, slug: string): Promise<PortalChatHome[]> {
  const homes = await homesOf(visitor)
  const src = (id: string) => portalFileHref(slug, id)
  const faces = await clientFaces(slug, visitor)   // (pending modules S13)
  return Promise.all(homes.map(async (h) => {
    const [{ lines, more }, readAt, team] = await Promise.all([
      chatLines(h.projectId, { src }), readMark('client', visitor.homeownerId, h.projectId),
      db.select({ name: members.name, color: members.color }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId)).where(eq(leadAssignees.leadId, h.leadId)),
    ])
    return { ...h, lines: forClient(lines, faces), more, readAt, team: forClient(team.map((t) => ({ name: firstName(t.name), color: t.color })), faces) }   // (pending modules S01 · S13)
  }))
}

/* ── the client's bell (lib/portal/notifications.ts fills these; lib/portal/notifications-model.ts rings them) ────────────────────── */
export async function clientBellFacts(leadId: string, homeownerId: string, o: { issues: boolean; chat: boolean }): Promise<{ issues: BellIssueAnswer[]; chat: BellChatNews | null }> {
  const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { issues: [], chat: null }
  let issues: BellIssueAnswer[] = []
  if (o.issues) {
    const rows = await db.select({ r: ticketReplies, t: projectTickets }).from(ticketReplies).innerJoin(projectTickets, eq(projectTickets.id, ticketReplies.ticketId))
      .where(and(eq(projectTickets.projectId, p.id), eq(ticketReplies.authorKind, 'studio'), eq(ticketReplies.internal, false)))
    issues = rows.filter(({ r }) => !r.event || r.event === 'resolved').map(({ r, t }) => ({
      key: issueKey(r.id), ticketId: t.id, number: t.number, subject: t.subject, by: firstName(r.authorName), resolved: r.event === 'resolved', at: r.createdAt.getTime(),
      seen: (t.lastClientAt?.getTime() ?? 0) > r.createdAt.getTime(),
    }))
  }
  let chat: BellChatNews | null = null
  if (o.chat) {
    const read = (await readMark('client', homeownerId, p.id)) ?? 0
    const unread = await db.select().from(projectMessages)
      .where(and(eq(projectMessages.projectId, p.id), eq(projectMessages.authorKind, 'studio'), eq(projectMessages.channel, 'client'), isNull(projectMessages.deletedAt), gt(projectMessages.createdAt, new Date(read))))   // (parity map, UC-064) the team's own conversation never reaches the client
      .orderBy(desc(projectMessages.createdAt))
    const latest = unread[0]
    if (latest) chat = { projectId: p.id, latestId: latest.id, by: firstName(latest.authorName), words: latest.body, at: latest.createdAt.getTime(), count: unread.length }
  }
  return { issues, chat }
}
