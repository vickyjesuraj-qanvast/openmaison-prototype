'use server'

import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, portalBellReads, projectTickets, projects, ticketReplies, type ProjectTicket } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { logProjectEvent } from '@/lib/projects/events'
import { keepThreadPhotos } from '@/lib/projects/thread-photos'
import { fetchTicketCategories } from '@/lib/projects/tickets'
import { firstWords } from '@/lib/projects/messages-model'
import { BODY_MAX, PHOTOS_MAX, PHOTO_DATA_MAX, SUBJECT_MAX, liveCategories } from '@/lib/projects/tickets-model'
import { issueTicketNumber } from '@/lib/projects/tickets'
import { issueKey } from '@/lib/portal/threads'
import { portalActor, type PortalVisitor } from '@/lib/portal/session'

/*
 * (gaps build H — H-Q2 · H-Q3 · H-Q5 · H-Q7 · H-Q10) The client's issues. Checked here as every portal request is (`portalActor`: the address,
 * Live / Paused, the session, the Issues switch — a write is refused in a studio's preview), then the home: one of this visitor's, with a
 * project. Anyone from the home may report and reply (the household shares the home); only the person who reported it closes it. A reply on
 * a Resolved issue reopens it. The project's team hears it on the bell (else Owners and Admins). Portal actions revalidate no path (round 4b).
 */
type Refusal = { error: string }
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
const GONE = 'This issue isn’t there any more'
const NO_PROJECT = 'Issues open once work on your home begins'
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\r\n/g, '\n').trim().slice(0, max) : '')

type Who = { visitor: PortalVisitor }
async function actor(slug: string): Promise<Who | Refusal> {
  const who = await portalActor(slug, { write: true, section: 'issues' })
  return 'error' in who ? who : { visitor: who.visitor }
}
async function forIssue(slug: string, ticketId: string): Promise<(Who & { t: ProjectTicket; p: typeof projects.$inferSelect }) | Refusal> {
  const who = await actor(slug); if (isRefusal(who)) return who
  const [row] = await db.select({ t: projectTickets, p: projects }).from(projectTickets).innerJoin(projects, eq(projects.id, projectTickets.projectId)).where(eq(projectTickets.id, String(ticketId ?? ''))).limit(1)
  if (!row || row.p.deletedAt || !who.visitor.links.some((l) => l.leadId === row.p.leadId)) return { error: GONE }
  return { ...who, ...row }
}
async function teamOf(leadId: string): Promise<string[]> { return (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.id) }
const hrefOf = (projectId: string, ticketId: string) => `/projects/${projectId}/tickets?open=${encodeURIComponent(ticketId)}`

/** Report an issue: a category, a subject, what happened, up to five photos (I-330). */
export async function reportIssue(slug: string, input: { homeId: string; category: string; subject: string; body: string; photos?: string[] }): Promise<{ id: string; number: string } | Refusal> {
  const who = await actor(slug); if (isRefusal(who)) return who
  const link = who.visitor.links.find((l) => l.linkId === input?.homeId) ?? (who.visitor.links.length === 1 ? who.visitor.links[0] : undefined)
  if (!link) return { error: 'Pick which home it is about' }
  const [p] = await db.select().from(projects).where(and(eq(projects.leadId, link.leadId))).limit(1)
  if (!p || p.deletedAt) return { error: NO_PROJECT }
  const subject = clean(input?.subject, SUBJECT_MAX)
  const body = clean(input?.body, BODY_MAX)
  if (!subject) return { error: 'Say in a few words what is wrong' }
  if (!body) return { error: 'Tell your designer what happened' }
  const category = liveCategories(await fetchTicketCategories()).find((c) => c === input?.category)
  if (!category) return { error: 'Pick what it is about' }
  const photos = await keepThreadPhotos(p.leadId, 'Tickets', who.visitor.name, input?.photos, { max: PHOTOS_MAX, dataMax: PHOTO_DATA_MAX }); if (isRefusal(photos)) return photos
  const now = new Date()
  const number = await issueTicketNumber(now)   // (parity map, UC-058) the studio's own ticket numbers (Settings › Finance › Document numbers)
  const id = randomUUID()
  await db.insert(projectTickets).values({
    id, projectId: p.id, leadId: p.leadId, number, category, subject, body, photos: photos.length ? photos : null, status: 'open', priority: 'normal', assigneeId: null,
    raisedKind: 'client', raisedById: who.visitor.homeownerId, raisedByName: who.visitor.name, lastClientAt: now, createdAt: now, updatedAt: now,
  })
  await logProjectEvent(db, p.leadId, p.id, 'project_ticket_raised', { name: p.name, number: p.number, id, title: subject, by: 'client', kind: number, person: who.visitor.name }, { actorId: null })
  const team = await teamOf(p.leadId)
  await notify('ticket_raised', team.length ? team : await studioRunnerIds(), { title: `${who.visitor.name} reported an issue`, body: `${number} · ${subject} · ${p.name}`, href: hrefOf(p.id, id), leadId: p.leadId, actorId: null,
    fields: { '{ticket}': `${number} · ${subject}`, '{comment}': firstWords(body, 300) } })
  return { id, number }
}

/** A reply from the client's side — on a Resolved issue it reopens it (H-Q3). */
export async function replyIssue(slug: string, input: { ticketId: string; body: string; photos?: string[] }): Promise<{ id: string; at: number; status: string } | Refusal> {
  const c = await forIssue(slug, input?.ticketId); if (isRefusal(c)) return c
  if (c.t.status === 'closed') return { error: 'This issue is closed — report a new one if something else is wrong' }
  const body = clean(input?.body, BODY_MAX)
  const photos = await keepThreadPhotos(c.p.leadId, 'Tickets', c.visitor.name, input?.photos, { max: PHOTOS_MAX, dataMax: PHOTO_DATA_MAX }); if (isRefusal(photos)) return photos
  if (!body && !photos.length) return { error: 'Write your reply first' }
  const now = new Date()
  const reopen = c.t.status === 'resolved'
  if (reopen) await db.insert(ticketReplies).values({ id: randomUUID(), ticketId: c.t.id, authorKind: 'client', authorId: c.visitor.homeownerId, authorName: c.visitor.name, body: '', photos: null, internal: false, event: 'reopened', createdAt: new Date(now.getTime() - 1) })
  const id = randomUUID()
  await db.insert(ticketReplies).values({ id, ticketId: c.t.id, authorKind: 'client', authorId: c.visitor.homeownerId, authorName: c.visitor.name, body, photos: photos.length ? photos : null, internal: false, event: null, createdAt: now })
  const status = reopen ? 'in_progress' : c.t.status
  await db.update(projectTickets).set({ status, lastClientAt: now, updatedAt: now, ...(reopen ? { resolvedAt: null, resolvedBy: null } : {}) }).where(eq(projectTickets.id, c.t.id))
  if (reopen) await logProjectEvent(db, c.p.leadId, c.p.id, 'project_ticket_reopened', { name: c.p.name, number: c.p.number, id: c.t.id, title: c.t.subject, kind: c.t.number, by: 'client', person: c.visitor.name }, { actorId: null })
  const to = c.t.assigneeId ? [c.t.assigneeId] : await teamOf(c.p.leadId)
  await notify('ticket_client', to.length ? to : await studioRunnerIds(), { title: `${c.visitor.name} ${reopen ? 'reopened' : 'replied on'} ${c.t.number}`, body: `${c.t.subject} · ${c.p.name}`, href: hrefOf(c.p.id, c.t.id), leadId: c.p.leadId, actorId: null,
    fields: { '{ticket}': `${c.t.number} · ${c.t.subject}`, '{comment}': firstWords(body || 'Photos', 300) } })
  return { id, at: now.getTime(), status }
}

/** Close it — the person who reported it, at any state but Closed. Undo = `reopenIssue` with the state it was in. */
export async function closeIssue(slug: string, input: { ticketId: string }): Promise<{ ok: true; was: string } | Refusal> {
  const c = await forIssue(slug, input?.ticketId); if (isRefusal(c)) return c
  if (c.t.raisedKind !== 'client' || c.t.raisedById !== c.visitor.homeownerId) return { error: 'Only whoever reported it closes it' }
  if (c.t.status === 'closed') return { ok: true, was: 'closed' }
  const now = new Date()
  await db.insert(ticketReplies).values({ id: randomUUID(), ticketId: c.t.id, authorKind: 'client', authorId: c.visitor.homeownerId, authorName: c.visitor.name, body: '', photos: null, internal: false, event: 'closed', createdAt: now })
  await db.update(projectTickets).set({ status: 'closed', closedAt: now, closedBy: c.visitor.name, lastClientAt: now, updatedAt: now }).where(eq(projectTickets.id, c.t.id))
  await logProjectEvent(db, c.p.leadId, c.p.id, 'project_ticket_closed', { name: c.p.name, number: c.p.number, id: c.t.id, title: c.t.subject, kind: c.t.number, by: 'client', person: c.visitor.name }, { actorId: null })
  const to = c.t.assigneeId ? [c.t.assigneeId] : await teamOf(c.p.leadId)
  await notify('ticket_client', to, { title: `${c.visitor.name} closed ${c.t.number}`, body: `${c.t.subject} · ${c.p.name}`, href: hrefOf(c.p.id, c.t.id), leadId: c.p.leadId, actorId: null, fields: { '{ticket}': `${c.t.number} · ${c.t.subject}`, '{comment}': 'Closed it' } })
  return { ok: true, was: c.t.status }
}
/** Close's Undo — back to the state it was in. */
export async function reopenIssue(slug: string, input: { ticketId: string; to: string }): Promise<{ ok: true } | Refusal> {
  const c = await forIssue(slug, input?.ticketId); if (isRefusal(c)) return c
  if (c.t.raisedById !== c.visitor.homeownerId) return { error: 'Only whoever reported it closes it' }
  if (c.t.status !== 'closed') return { ok: true }
  const to = input?.to === 'resolved' || input?.to === 'open' ? input.to : 'in_progress'
  await db.delete(ticketReplies).where(and(eq(ticketReplies.ticketId, c.t.id), eq(ticketReplies.event, 'closed'), eq(ticketReplies.authorKind, 'client')))
  await db.update(projectTickets).set({ status: to, closedAt: null, closedBy: null, updatedAt: new Date() }).where(eq(projectTickets.id, c.t.id))
  return { ok: true }
}

/** The issue opened — the studio's answers on it read in this person's bell (a preview marks nothing). */
export async function openIssue(slug: string, input: { ticketId: string }): Promise<{ n: number } | Refusal> {
  const c = await forIssue(slug, input?.ticketId)
  if (isRefusal(c)) return c.error === 'This is a preview — nothing here is saved as the client’s' ? { n: 0 } : c
  const lines = await db.select({ id: ticketReplies.id, event: ticketReplies.event }).from(ticketReplies)
    .where(and(eq(ticketReplies.ticketId, c.t.id), eq(ticketReplies.authorKind, 'studio'), eq(ticketReplies.internal, false)))
  const keys = lines.filter((l) => !l.event || l.event === 'resolved').map((l) => issueKey(l.id))
  if (!keys.length) return { n: 0 }
  const now = new Date()
  await db.insert(portalBellReads).values(keys.map((rowKey) => ({ homeownerId: c.visitor.homeownerId, rowKey, readAt: now }))).onConflictDoNothing()
  return { n: keys.length }
}
