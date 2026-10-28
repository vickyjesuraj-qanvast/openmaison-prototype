'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, projectTickets, projects, settings, ticketReplies, type ProjectTicket } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { logProjectEvent, type ProjectEventKind } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject, mayTakeTicket } from '@/lib/projects/policy'
import { keepThreadPhotos } from '@/lib/projects/thread-photos'
import { fetchTicketCategories, fetchTicketThread, issueTicketNumber } from '@/lib/projects/tickets'
import { tellClient } from '@/lib/portal/client-messages-send'
import { firstWords } from '@/lib/projects/messages-model'
import { makeAskTask, raiseAskVariation } from '@/lib/projects/client-asks'   // (simplify S-22)
import { titleCaseName } from '@/lib/format'
import {
  BODY_MAX, CATEGORY_MAX, NOTE_MAX, PHOTOS_MAX, PHOTO_DATA_MAX, SUBJECT_MAX, TICKET_CATEGORIES_KEY, isLive, liveCategories, type TicketCategory,
} from '@/lib/projects/tickets-model'
import { listedAs } from '@/lib/settings/trades'   // (S44Z — S44P's M14 words)
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build H — H-Q3…H-Q10) The studio's ticket actions. Who: whoever sees the project's lead reads (`canOpenLead`); the project's team, their
 * Managers, Owners and Admins act (`mayChangeProject`) — a completed project's tickets carry on (a defect after handover is what they are for).
 * Every refusal answers `{ error: <the rule> }`; every remove-like step answers what its Undo needs. A photo travels inside one object.
 */
type Refusal = { error: string }
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
/** (Dane's Tickets review, 2026-10-26 — Vicky's call) the member a ticket goes to: active, and able to work on its project (`mayTakeTicket`). */
async function assigneeOf(memberId: string, team: string[]): Promise<{ id: string; name: string } | Refusal> {
  const all = await db.select({ id: members.id, name: members.name, role: members.role, active: members.isActive, managerId: members.managerId }).from(members)
  const m = all.find((x) => x.id === memberId)
  if (!m || !m.active) return { error: 'That member isn’t in the studio any more' }
  const reports = all.filter((x) => x.managerId === m.id).map((x) => x.id)
  return mayTakeTicket({ id: m.id, role: m.role, reports }, team) ? { id: m.id, name: m.name } : { error: `${m.name} can’t work on this project — add them to its team first` }   // (invented copy)
}
const GONE = 'This ticket isn’t there any more'
const PROJECT_GONE = 'This project isn’t there any more'
const CLOSED_RULE = 'Reopen the issue to answer on it'
const RUNS_RULE = 'Only Owners and Admins change the ticket categories'

type Ctx = { p: typeof projects.$inferSelect; viewer: Viewer; me: { id: string; name: string }; team: string[]; client: string }
async function forProject(projectId: string): Promise<Ctx | Refusal> {
  const [row] = await db.select({ p: projects, client: leads.name }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(eq(projects.id, String(projectId ?? ''))).limit(1)
  if (!row || row.p.deletedAt) return { error: PROJECT_GONE }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.p.leadId))) return { error: PROJECT_GONE }
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.p.leadId))).map((r) => r.id)
  if (!mayChangeProject(viewer, team)) return { error: CHANGE_RULE }
  const [m] = await db.select({ name: members.name }).from(members).where(eq(members.id, viewer.id)).limit(1)
  return { p: row.p, viewer, me: { id: viewer.id, name: m?.name ?? 'Someone' }, team, client: row.client }
}
async function forTicket(ticketId: string): Promise<(Ctx & { t: ProjectTicket }) | Refusal> {
  const [t] = await db.select().from(projectTickets).where(eq(projectTickets.id, String(ticketId ?? ''))).limit(1)
  if (!t) return { error: GONE }
  const c = await forProject(t.projectId)
  return isRefusal(c) ? c : { ...c, t }
}
const touch = (projectId: string) => { revalidatePath(`/projects/${projectId}/tickets`); revalidatePath('/tickets'); revalidatePath(`/projects/${projectId}`) }
const log = (c: Ctx, kind: ProjectEventKind, detail: Record<string, string | undefined>) => logProjectEvent(db, c.p.leadId, c.p.id, kind, { name: c.p.name, number: c.p.number, ...detail })
const hrefOf = (c: { p: { id: string } }, ticketId: string) => `/projects/${c.p.id}/tickets?open=${encodeURIComponent(ticketId)}`
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\r\n/g, '\n').trim().slice(0, max) : '')
async function line(ticketId: string, c: Ctx, o: { body?: string; photos?: string[]; internal?: boolean; event?: string | null }) {
  const id = randomUUID()
  await db.insert(ticketReplies).values({ id, ticketId, authorKind: 'studio', authorId: c.me.id, authorName: c.me.name, body: o.body ?? '', photos: o.photos?.length ? o.photos : null, internal: !!o.internal, event: o.event ?? null, createdAt: new Date() })
  return id
}

/** (H-Q9) The studio raises a ticket for the client — a call, a site visit. The client sees it on their portal. */
export async function createTicket(projectId: string, input: { category: string; subject: string; body: string; photos?: string[]; assigneeId?: string | null }): Promise<{ id: string; number: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const subject = clean(input?.subject, SUBJECT_MAX)
  const body = clean(input?.body, BODY_MAX)
  if (!subject) return { error: 'Say in a few words what the problem is' }
  const cats = liveCategories(await fetchTicketCategories())
  const category = cats.find((x) => x === input?.category) ?? null
  if (!category) return { error: 'Pick a category' }
  const assignee = input?.assigneeId ? await assigneeOf(input.assigneeId, c.team) : null
  if (assignee && isRefusal(assignee)) return assignee
  const photos = await keepThreadPhotos(c.p.leadId, 'Tickets', c.me.name, input?.photos, { max: PHOTOS_MAX, dataMax: PHOTO_DATA_MAX }); if (isRefusal(photos)) return photos
  const now = new Date()
  const id = randomUUID()
  const number = await issueTicketNumber(now)   // (parity map, UC-058) the studio's pattern — T-{YYYY}-{nnn} unless Settings › Finance › Document numbers says otherwise
  await db.insert(projectTickets).values({
    id, projectId: c.p.id, leadId: c.p.leadId, number, category, subject, body, photos: photos.length ? photos : null, status: assignee ? 'in_progress' : 'open', priority: 'normal',
    assigneeId: assignee?.id ?? null, raisedKind: 'studio', raisedById: c.me.id, raisedByName: c.me.name, lastStudioAt: now, createdAt: now, updatedAt: now,
  })
  await log(c, 'project_ticket_raised', { id, title: subject, by: 'studio', kind: number })
  if (assignee && assignee.id !== c.me.id) await notify('ticket_assigned', [assignee.id], { title: `${c.me.name} gave you ${number}`, body: `${subject} · ${c.p.name}`, href: hrefOf(c, id), leadId: c.p.leadId, fields: { '{ticket}': `${number} · ${subject}` } })
  touch(c.p.id)
  return { id, number }
}

/** A reply to the client, or an internal note (H-Q6). The studio's first word to the client takes an Open ticket In progress. */
export async function replyTicket(ticketId: string, input: { body: string; photos?: string[]; internal?: boolean }): Promise<{ id: string; at: number; status: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  if (!isLive(c.t.status)) return { error: CLOSED_RULE }
  const body = clean(input?.body, BODY_MAX)
  const internal = input?.internal === true
  const photos = await keepThreadPhotos(c.p.leadId, 'Tickets', c.me.name, input?.photos, { max: PHOTOS_MAX, dataMax: PHOTO_DATA_MAX }); if (isRefusal(photos)) return photos
  if (!body && !photos.length) return { error: 'Write your reply first' }
  const id = await line(c.t.id, c, { body, photos, internal })
  const now = new Date()
  const status = !internal && c.t.status === 'open' ? 'in_progress' : c.t.status
  await db.update(projectTickets).set({ status, updatedAt: now, ...(internal ? {} : { lastStudioAt: now }) }).where(eq(projectTickets.id, c.t.id))
  if (!internal) {
    await tellClient({ event: 'client_issue_answered', leadId: c.p.leadId, ref: id, path: `issues?open=${encodeURIComponent(c.t.id)}`,
      fields: { '{ticket}': c.t.number, '{subject}': c.t.subject, '{sender}': c.me.name.split(/\s+/)[0] ?? c.me.name, '{message}': firstWords(body || 'Photos attached', 300) },
      plain: { title: `Your issue ${c.t.number}: ${c.t.subject}`, line: `${c.me.name} answered your issue ${c.t.number} — “${c.t.subject}”.` } })
  }
  touch(c.p.id)
  return { id, at: now.getTime(), status }
}

/** (H-Q3) Resolved — with a closing line the client reads, when one is written. Undo = `reopenTicket`. */
export async function resolveTicket(ticketId: string, input: { note?: string } = {}): Promise<{ ok: true; was: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  if (!isLive(c.t.status)) return { error: c.t.status === 'resolved' ? 'This ticket is already resolved' : 'This ticket is closed — reopen it first' }
  const note = clean(input?.note, BODY_MAX)
  const now = new Date()
  if (note) await line(c.t.id, c, { body: note })
  const id = await line(c.t.id, c, { event: 'resolved' })
  await db.update(projectTickets).set({ status: 'resolved', resolvedAt: now, resolvedBy: c.me.name, updatedAt: now, lastStudioAt: now }).where(eq(projectTickets.id, c.t.id))
  await log(c, 'project_ticket_resolved', { id: c.t.id, title: c.t.subject, kind: c.t.number })
  await tellClient({ event: 'client_issue_answered', leadId: c.p.leadId, ref: id, path: `issues?open=${encodeURIComponent(c.t.id)}`,
    fields: { '{ticket}': c.t.number, '{subject}': c.t.subject, '{sender}': c.me.name.split(/\s+/)[0] ?? c.me.name, '{message}': note ? firstWords(note, 300) : 'We’ve marked it resolved. If anything is still not right, reply on your page.' },
    plain: { title: `Your issue ${c.t.number} is resolved`, line: `${c.me.name} marked your issue ${c.t.number} — “${c.t.subject}” — resolved.` } })
  touch(c.p.id)
  return { ok: true, was: c.t.status }
}

/** Reopen a Resolved or Closed ticket (also Resolve's Undo, which hands back the state it was in). */
export async function reopenTicket(ticketId: string, input: { to?: string } = {}): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  if (isLive(c.t.status)) return { ok: true }
  const to = input?.to === 'open' ? 'open' : 'in_progress'
  await line(c.t.id, c, { event: 'reopened' })
  await db.update(projectTickets).set({ status: to, resolvedAt: null, resolvedBy: null, closedAt: null, closedBy: null, updatedAt: new Date() }).where(eq(projectTickets.id, c.t.id))
  await log(c, 'project_ticket_reopened', { id: c.t.id, title: c.t.subject, kind: c.t.number, by: 'studio' })
  touch(c.p.id)
  return { ok: true }
}

/** Whoever looks after it — a studio-only line (H-Q6); the member hears it. An Open ticket goes In progress once someone has it. */
export async function assignTicket(ticketId: string, input: { memberId: string | null }): Promise<{ ok: true; was: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  const id = input?.memberId ?? null
  const m = id ? await assigneeOf(id, c.team) : null
  if (m && isRefusal(m)) return m
  if ((c.t.assigneeId ?? null) === id) return { ok: true, was: c.t.assigneeId }
  const now = new Date()
  await line(c.t.id, c, { event: 'assigned', body: m?.name ?? '', internal: true })
  await db.update(projectTickets).set({ assigneeId: id, status: id && c.t.status === 'open' ? 'in_progress' : c.t.status, updatedAt: now }).where(eq(projectTickets.id, c.t.id))
  await log(c, 'project_ticket_assigned', { id: c.t.id, title: c.t.subject, kind: c.t.number, to: m?.name ?? '' })
  if (m && m.id !== c.me.id) await notify('ticket_assigned', [m.id], { title: `${c.me.name} gave you ${c.t.number}`, body: `${c.t.subject} · ${c.p.name}`, href: hrefOf(c, c.t.id), leadId: c.p.leadId, fields: { '{ticket}': `${c.t.number} · ${c.t.subject}` } })
  touch(c.p.id)
  return { ok: true, was: c.t.assigneeId }
}

/** (H-Q4) Escalate: Urgent, with a note — Owners and Admins hear it; the project is in Needs attention until it is resolved. */
export async function escalateTicket(ticketId: string, input: { note: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  if (!isLive(c.t.status)) return { error: 'Only a ticket still open is escalated' }
  if (c.t.escalatedAt) return { error: 'This ticket is already escalated' }
  const note = clean(input?.note, NOTE_MAX)
  if (!note) return { error: 'Say why it is urgent — Owners and Admins read it' }
  const now = new Date()
  await line(c.t.id, c, { event: 'escalated', body: note, internal: true })
  await db.update(projectTickets).set({ priority: 'urgent', escalatedAt: now, escalatedBy: c.me.name, escalateNote: note, updatedAt: now }).where(eq(projectTickets.id, c.t.id))
  await log(c, 'project_ticket_escalated', { id: c.t.id, title: c.t.subject, kind: c.t.number, note })
  await notify('ticket_escalated', await studioRunnerIds(), { title: `${c.me.name} escalated ${c.t.number}`, body: `${c.t.subject} · ${c.p.name} — ${note}`, href: hrefOf(c, c.t.id), leadId: c.p.leadId, fields: { '{ticket}': `${c.t.number} · ${c.t.subject}`, '{note}': note } })
  touch(c.p.id)
  return { ok: true }
}
/** Escalate's Undo — back to Normal, the escalation taken off. */
export async function undoEscalateTicket(ticketId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  if (!c.t.escalatedAt) return { ok: true }
  await line(c.t.id, c, { event: 'priority', body: 'Normal', internal: true })
  await db.update(projectTickets).set({ priority: 'normal', escalatedAt: null, escalatedBy: null, escalateNote: null, updatedAt: new Date() }).where(eq(projectTickets.id, c.t.id))
  touch(c.p.id)
  return { ok: true }
}

/** The studio-wide list opens a ticket in its drawer — its thread read fresh. */
export async function readTicket(ticketId: string) {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const r = await fetchTicketThread(String(ticketId ?? ''))
  return r ?? { error: GONE }
}

/* ── Settings › Projects › Ticket categories (H-Q8) ───────────────────────────────────────────────────────────────────────────────── */
async function runner(): Promise<Refusal | null> { return runsStudio((await fetchViewer()).role) ? null : { error: RUNS_RULE } }
async function writeCategories(list: TicketCategory[]) {
  const value = JSON.stringify(list)
  const updatedAt = new Date()
  await db.insert(settings).values({ key: TICKET_CATEGORIES_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
  revalidatePath('/settings')
}
/** The list as a whole — add, remove, retire, restore, reorder. Answers the list as kept. */
export async function setTicketCategories(input: { list: TicketCategory[] }): Promise<{ list: TicketCategory[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  const seen = new Set<string>()
  const list = (Array.isArray(input?.list) ? input.list : []).flatMap((x): TicketCategory[] => {
    const name = clean(x?.name, CATEGORY_MAX).replace(/\s+/g, ' ')
    if (!name || seen.has(name.toLowerCase())) return []
    seen.add(name.toLowerCase())
    return [x?.retired ? { name, retired: true } : { name }]
  })
  if (!list.some((x) => !x.retired)) return { error: 'Keep at least one category' }
  await writeCategories(list)
  return { list }
}
/** A rename carries the tickets that hold the old name (2.0's rename rule, REG-647). */
export async function renameTicketCategory(input: { from: string; to: string; position: number }): Promise<{ list: TicketCategory[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const no = await runner(); if (no) return no
  const to = clean(input?.to, CATEGORY_MAX).replace(/\s+/g, ' ')
  if (!to) return { error: 'Give the category a name' }
  const list = await fetchTicketCategories()
  const at = list.findIndex((x) => x.name === input?.from)
  if (at < 0) return { error: 'That category isn’t in the list any more' }
  { const hit = list.find((x, i) => i !== at && x.name.toLowerCase() === to.toLowerCase()); if (hit) return { error: listedAs([hit.name], to) ?? `${to} is already in the list` } }   // (S44Z) names the entry it matches
  const entry = { ...list[at]!, name: to }
  const rest = list.filter((_, i) => i !== at)
  const pos = Math.max(0, Math.min(rest.length, Math.round(Number(input?.position) || at + 1) - 1))
  const next = [...rest.slice(0, pos), entry, ...rest.slice(pos)]
  await writeCategories(next)
  if (input.from !== to) await db.update(projectTickets).set({ category: to }).where(eq(projectTickets.category, input.from))
  revalidatePath('/tickets')
  return { list: next }
}
/** How many tickets hold each category — a used one is retired, not removed. */
export async function ticketCategoryCounts(): Promise<Record<string, number>> {
  const rows = await db.select({ c: projectTickets.category }).from(projectTickets)
  const out: Record<string, number> = {}
  for (const r of rows) out[r.c] = (out[r.c] ?? 0) + 1
  return out
}

/* ── (simplify S-22, his "build everything" 2026-10-09) a ticket → a task · a variation order, the client's words carried over ─────────── */

const askOf = (c: Ctx & { t: ProjectTicket }) => ({
  leadId: c.p.leadId, projectId: c.p.id, source: 'ticket' as const, ref: c.t.id, words: c.t.subject, detail: c.t.body || null,
  client: c.t.raisedKind === 'client' ? c.t.raisedByName : titleCaseName(c.client), at: c.t.createdAt.getTime(), number: c.t.number,
})
/** Make a task from the ticket — its title the subject, its description where it came from and the client's words; one per ticket. */
export async function ticketToTask(ticketId: string): Promise<{ taskId: string; title: string; made: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  const r = await makeAskTask({ ...askOf(c), memberId: c.me.id })
  touch(c.p.id); revalidatePath(`/projects/${c.p.id}/tasks`)
  return r
}
/** Raise a variation order from the ticket — its first line the subject, the client's words under it; one per ticket. Money's rule decides. */
export async function ticketToVariation(ticketId: string): Promise<{ id: string; number: string; made: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forTicket(ticketId); if (isRefusal(c)) return c
  const r = await raiseAskVariation(askOf(c))
  if (!isRefusal(r)) touch(c.p.id)
  return r
}
