import 'server-only'
import { and, desc, eq, gt, inArray, isNull, lt, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { forClient, type ClientFaces } from '@/lib/company/member-photo'
import { chatReads, homeownerHouseholdLinks, homeownerLeadLinks, homeownerProfiles, leadAssignees, leads, members, projectMessages, projects, type ConversationMessage } from '@/lib/db/schema'
import { leadMessages } from '@/lib/db/schema'   // (parity map, UC-064) a lead's conversation before Won
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { mayChangeProject } from '@/lib/projects/policy'
import { titleCaseName } from '@/lib/format'
import { imageAddress, rawAddress } from '@/lib/leads/file-store'
import { CHAT_LOAD, conversationKey, parseConversationKey, readIdOf, studioOnly, type ChatType, type ConversationKind } from './messages-model'
import { fetchStudio } from '@/lib/settings/queries'
import { opensWorkspace, runsStudio } from '@/lib/settings/roles'
import { shortStudioName } from '@/lib/settings/types'
import { asksOf } from './client-asks'
import type { AskLinks } from './client-asks-model'
import { contactCards, prefsOf, type ContactCard } from './conversations'   // (parity map, UC-067 · UC-070)
import { chatInbox, chatLinesFor, chatMembers, chatPeople, chatRow, chatTitle, chatTypeOf, leadTeamConversations, leadTeamLines, readersOf, type ChatPerson } from './studio-chats'   // (pending modules S26)

/*
 * (gaps build H — H-Q11…H-Q15) A project's one conversation: its lines (the latest CHAT_LOAD, oldest first — 1.0 returned the oldest 200 and
 * stopped showing new ones, I-338), how far each reader has read it, the studio's inbox (/chat — every conversation the viewer sees) and the
 * rail's unread count. Writes: app/projects/messages-actions.ts (the team) · app/portal/messages-actions.ts (the client's side).
 * (parity map 2026-10-10 — UC-064 · UC-066 · UC-067 · UC-070) Three kinds of conversation now (`ConversationKind`): the project's with the
 * client's side (`project_messages.channel = 'client'` — the lead's messages before Won read first in it), the project's team's own (`'team'` —
 * never on the portal: every client-side read passes the channel), and a lead's before Won (`lead_messages`). Lines carry files beyond photos
 * (a document, a video, a voice note) and a shared place or contact; each member pins or mutes a conversation for themselves.
 */

/* (pending modules S26) a line, a message's attachments and `lineOf` live in ./message-lines (the members' conversations draw theirs the same
   way); re-exported here, so every caller reads them where it always did */
import { attachmentsOf, lineOf, messageFileIds, shareOf, type ChatLine } from './message-lines'
export { lineOf, messageFileIds, type ChatLine } from './message-lines'

/** The latest `limit` lines before `before` (all when null), oldest first, and whether earlier ones remain. A removed line keeps its place
    and loses its words and photos ("Message removed"). `src` makes a photo's address for the side reading it. (parity map) `channel` — the
    client's conversation (the default: every read the portal makes stays on it) or the team's; the client's reads the lead's lines first.
    `fileSrc` — a file's address (the studio's raw route; given a `src`, the portal's own route serves both). */
export async function chatLines(projectId: string, o: { before?: number | null; limit?: number; src?: (id: string) => string; fileSrc?: (id: string) => string; channel?: 'client' | 'team'; leadId?: string } = {}): Promise<{ lines: ChatLine[]; more: boolean }> {
  const limit = o.limit ?? CHAT_LOAD
  const channel = o.channel === 'team' ? 'team' : 'client'
  const before = o.before ? new Date(o.before) : null
  const rows = await db.select().from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.channel, channel), before ? lt(projectMessages.createdAt, before) : undefined))
    .orderBy(desc(projectMessages.createdAt)).limit(limit + 1)
  /* (UC-064) once Won the conversation belongs to the home: the lead's lines first — the client's `lead_messages`, and (pending modules S26)
     the team's own lead chapter (`conversations` kind lead) in the project's Team conversation */
  const leadId = o.leadId ?? (await db.select({ leadId: projects.leadId }).from(projects).where(eq(projects.id, projectId)).limit(1))[0]?.leadId ?? null
  const team = await db.select({ id: members.id, color: members.color }).from(members)
  const tint = new Map(team.map((m) => [m.id, m.color]))
  const src = o.src ?? imageAddress
  const fileSrc = o.fileSrc ?? o.src ?? rawAddress
  const early: ChatLine[] = !leadId ? []
    : channel === 'client' ? (await db.select().from(leadMessages).where(and(eq(leadMessages.leadId, leadId), before ? lt(leadMessages.createdAt, before) : undefined)).orderBy(desc(leadMessages.createdAt)).limit(limit + 1))
      .map((m) => lineOf(m, src, tint, { fileSrc, fromLead: true }))
    : (await leadTeamLines(leadId, { before: o.before ?? null, limit, viewerId: '', fromLead: true })).lines
  const all = [...rows.map((m) => lineOf(m, src, tint, { fileSrc })), ...early].sort((a, b) => b.at - a.at)
  return { more: all.length > limit, lines: all.slice(0, limit).reverse() }
}
/** A lead's conversation before Won — its latest lines, oldest first (the same rules as a project's). */
export async function leadChatLines(leadId: string, o: { before?: number | null; limit?: number; src?: (id: string) => string; fileSrc?: (id: string) => string } = {}): Promise<{ lines: ChatLine[]; more: boolean }> {
  const limit = o.limit ?? CHAT_LOAD
  const rows = await db.select().from(leadMessages).where(and(eq(leadMessages.leadId, leadId), o.before ? lt(leadMessages.createdAt, new Date(o.before)) : undefined))
    .orderBy(desc(leadMessages.createdAt)).limit(limit + 1)
  const team = await db.select({ id: members.id, color: members.color }).from(members)
  const tint = new Map(team.map((m) => [m.id, m.color]))
  const src = o.src ?? imageAddress
  const fileSrc = o.fileSrc ?? o.src ?? rawAddress
  return { more: rows.length > limit, lines: rows.slice(0, limit).reverse().map((m) => lineOf(m, src, tint, { fileSrc })) }
}
export async function readMark(kind: 'member' | 'client', readerId: string, projectId: string): Promise<number | null> {
  const [r] = await db.select({ at: chatReads.readAt }).from(chatReads).where(and(eq(chatReads.readerKind, kind), eq(chatReads.readerId, readerId), eq(chatReads.projectId, projectId))).limit(1)
  return r?.at.getTime() ?? null
}
export async function setReadMark(kind: 'member' | 'client', readerId: string, projectId: string, at = new Date()): Promise<void> {
  await db.insert(chatReads).values({ readerKind: kind, readerId, projectId, readAt: at })
    .onConflictDoUpdate({ target: [chatReads.readerKind, chatReads.readerId, chatReads.projectId], set: { readAt: at } })
}

/** Who is in the conversation: the client, the household people invited, the team. */
export type ChatPeople = { client: string; household: string[]; team: { id: string; name: string; color: string }[]; invited: boolean }
async function peopleOf(leadId: string, client: string): Promise<ChatPeople> {
  const [link, house, team] = await Promise.all([
    db.select({ invitedAt: homeownerLeadLinks.invitedAt, withdrawnAt: homeownerLeadLinks.withdrawnAt }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1),
    db.select({ name: homeownerProfiles.name }).from(homeownerHouseholdLinks).innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerHouseholdLinks.homeownerId))
      .where(and(eq(homeownerHouseholdLinks.leadId, leadId), isNull(homeownerHouseholdLinks.removedAt), isNull(homeownerHouseholdLinks.withdrawnAt))),
    db.select({ id: members.id, name: members.name, color: members.color }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId)).where(eq(leadAssignees.leadId, leadId)),
  ])
  return { client, household: house.map((h) => titleCaseName(h.name)), team, invited: !!link[0]?.invitedAt && !link[0]?.withdrawnAt }
}

/** (pending modules S26) A members' conversation — who is in it, and what this member may do there. */
export type ChatInfo = {
  id: string; type: ChatType
  /** a group's own name (null for two people and the studio's room) */ name: string | null
  /** who is in it now — the room: everyone in the studio who opens Messages */ people: ChatPerson[]
  /** a group's: the members who could be added (active, not in it) */ others: ChatPerson[]
  createdBy: string | null
  mayRename: boolean; mayAdd: boolean; mayLeave: boolean
  /** a group's: the people this member may take out (1.0's rule — a Designer never takes an Owner or an Admin out) */ mayRemove: string[]
  /** two people: the other one, and whether they are still in the studio */ other: ChatPerson | null
}
/** (parity map, UC-064) One conversation as the studio reads it — a project's with the client's side, a project's team's, or a lead's.
    (pending modules S26) …or a lead's Team conversation before Won (`lead-team`), or one among the studio's members (`chat`). */
export type ConversationData = {
  /** `project:<id>` · `team:<id>` · `lead:<leadId>` · `lead-team:<leadId>` · `chat:<id>` (lib/projects/messages-model.ts `conversationKey`) */
  key: string
  kind: ConversationKind
  /** the project — null for a lead's conversation before Won, and for a members' conversation */
  project: { id: string; name: string; number: string; leadId: string; client: string } | null
  /** the lead — null for a members' conversation (S26), which is about no lead */
  lead: { id: string; client: string; stage: string } | null
  /** the list's and the pane's name: the project's, else the client's; (S26) the other member's, the group's, the studio's room's */
  title: string
  lines: ChatLine[]; more: boolean
  /** the viewer's read mark before this visit — the New rule sits after it */
  readAt: number | null
  people: ChatPeople
  me: { id: string; name: string; color: string }
  mayWrite: boolean
  /** (simplify S-22) each client message's task and variation order, by the message's id (a project's client conversation only) */
  asks: Record<string, AskLinks>
  now: number
  /** (UC-070) this member's own place for it */
  prefs: { pinned: boolean; muted: boolean }
  /** (UC-067) the site's address — what "The site's location" shares; null when the lead has none (and in a members' conversation) */
  place: string | null
  /** (UC-067) the cards "A contact" offers — the studio's members and its vendors */
  contacts: ContactCard[]
  /** (S26) a members' conversation's people and rules — null for a lead's or a project's */
  chat: ChatInfo | null
  /** (S26) the other readers' read marks — "Seen by …" under one's own newest line: the client's side in a client's conversation, the
      members in a studio's own */
  seen: { name: string; at: number }[]
}
/** A project's Messages tab: the client's conversation, and the team's beside it (UC-064). The page passes it whole to the tab. */
export type ProjectChatData = ConversationData & { project: NonNullable<ConversationData['project']>; lead: NonNullable<ConversationData['lead']>; team: ConversationData }

type Head = { project: typeof projects.$inferSelect | null; lead: { id: string; name: string; stage: string; propertyAddress: string | null; leadAddress: string | null } }
async function headOf(kind: ConversationKind, id: string): Promise<Head | null> {
  if (kind === 'lead' || kind === 'lead-team') {
    const [l] = await db.select({ id: leads.id, name: leads.name, stage: leads.stage, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, id)).limit(1)
    if (!l || l.deletedAt) return null
    return { project: null, lead: l }
  }
  const [row] = await db.select({ p: projects, l: { id: leads.id, name: leads.name, stage: leads.stage, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress } }).from(projects)
    .innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1)
  return row ? { project: row.p, lead: row.l } : null
}
const latestOf = (...at: (number | null)[]) => { const xs = at.filter((x): x is number => x !== null); return xs.length ? Math.max(...xs) : null }
/** One conversation for the studio — null when it is gone or the viewer may not see it (Who sees leads; a members' conversation: its people). */
export async function fetchConversation(key: string): Promise<ConversationData | null> {
  const k = parseConversationKey(key)
  if (!k) return null
  /* (UC-064) once Won a lead's conversation carries on in its project's — its earlier lines first; (S26) its Team conversation in the project's */
  if (k.kind === 'lead' || k.kind === 'lead-team') {
    const [live] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, k.id), isNull(projects.deletedAt))).limit(1)
    if (live) return fetchConversation(conversationKey(k.kind === 'lead' ? 'client' : 'team', live.id))
  }
  if (k.kind === 'chat') return fetchChatConversation(k.id)
  const h = await headOf(k.kind, k.id)
  if (!h) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, h.lead.id))) return null
  const client = titleCaseName(h.lead.name)
  const convKey = conversationKey(k.kind, k.id)
  const readId = readIdOf(k.kind, k.id)
  /* (S26) a project's Team conversation was its lead's before Won — read up to the later of the two marks, seen by either */
  const leadTeamRead = k.kind === 'team' ? readIdOf('lead-team', h.lead.id) : null
  const [{ lines, more }, readAt, earlyRead, people, me, asks, prefs, contacts, seen] = await Promise.all([
    k.kind === 'lead' ? leadChatLines(h.lead.id)
      : k.kind === 'lead-team' ? leadTeamLines(h.lead.id, { viewerId: viewer.id })
      : chatLines(k.id, { channel: k.kind === 'team' ? 'team' : 'client', leadId: h.lead.id }),
    readMark('member', viewer.id, readId), leadTeamRead ? readMark('member', viewer.id, leadTeamRead) : Promise.resolve(null), peopleOf(h.lead.id, client),
    db.select({ name: members.name, color: members.color }).from(members).where(eq(members.id, viewer.id)).limit(1),
    k.kind === 'client' && h.project ? asksOf(h.project.id, 'message') : Promise.resolve({} as Record<string, AskLinks>),   // (simplify S-22)
    prefsOf(viewer.id, [convKey]),
    contactCards(),
    studioOnly(k.kind) ? Promise.resolve(null) : readersOf([readId], 'client', { leadId: h.lead.id, viewerId: viewer.id }),
  ])
  /* (S26) "Seen by" in a Team conversation names its people — the members and whoever has written in it, never a passer-by */
  const seenTeam = studioOnly(k.kind) ? await readersOf([readId, ...(leadTeamRead ? [leadTeamRead] : [])], 'members', { viewerId: viewer.id, only: [...new Set([...people.team.map((t) => t.id), ...lines.filter((l) => l.authorKind === 'studio' && l.authorId).map((l) => l.authorId!)])] }) : null
  const p = h.project
  return {
    key: convKey, kind: k.kind,
    project: p ? { id: p.id, name: p.name, number: p.number, leadId: p.leadId, client } : null,
    lead: { id: h.lead.id, client, stage: h.lead.stage },
    title: p ? p.name : client,
    lines, more, readAt: latestOf(readAt, earlyRead), people,
    me: { id: viewer.id, name: me[0]?.name ?? 'You', color: me[0]?.color ?? '#5B7FD7' },
    mayWrite: mayChangeProject(viewer, people.team.map((t) => t.id)), asks, now: Date.now(),
    prefs: prefs.get(convKey) ?? { pinned: false, muted: false },
    place: (h.lead.propertyAddress || h.lead.leadAddress || '').trim() || null,
    contacts, chat: null, seen: seenTeam ?? seen ?? [],
  }
}
/** (pending modules S26) A members' conversation for the member reading it — null when it is gone, they are not in it (taken out, left, never
    added), or they keep the books (Accounting opens no Messages). */
async function fetchChatConversation(id: string): Promise<ConversationData | null> {
  const viewer = await fetchViewer()
  if (!opensWorkspace(viewer.role)) return null
  const row = await chatRow(id)
  if (!row) return null
  const everyone = await chatMembers()
  const people = (await chatPeople(row, everyone)).sort((a, b) => Number(b.id === viewer.id) - Number(a.id === viewer.id) || a.name.localeCompare(b.name))
  if (!people.some((x) => x.id === viewer.id)) return null
  const key = conversationKey('chat', row.id)
  const [{ lines, more }, readAt, prefs, contacts, studio, seen] = await Promise.all([
    chatLinesFor(row.id, { viewerId: viewer.id }), readMark('member', viewer.id, key), prefsOf(viewer.id, [key]), contactCards(), fetchStudio(),
    readersOf([key], 'members', { viewerId: viewer.id, only: people.map((x) => x.id) }),
  ])
  const type = chatTypeOf(row)
  const otherId = type === 'direct' ? (row.pairKey ?? '').split('|').find((x) => x !== viewer.id) ?? null : null
  const other = otherId ? everyone.find((x) => x.id === otherId) ?? null : null
  const me = everyone.find((x) => x.id === viewer.id)
  const runs = runsStudio(viewer.role)
  const group = type === 'group'
  return {
    key, kind: 'chat', project: null, lead: null,
    title: chatTitle(row, people, viewer.id, shortStudioName(studio.name), everyone, row.pairKey),
    lines, more, readAt,
    people: { client: '', household: [], team: people.map((x) => ({ id: x.id, name: x.name, color: x.color })), invited: false },
    me: { id: viewer.id, name: me?.name ?? 'You', color: me?.color ?? '#5B7FD7' },
    mayWrite: type !== 'direct' || !!other?.active, asks: {}, now: Date.now(),
    prefs: prefs.get(key) ?? { pinned: false, muted: false }, place: null, contacts,
    chat: {
      id: row.id, type, name: group ? row.name : null, people, createdBy: row.createdBy,
      others: group ? everyone.filter((x) => x.active && !people.some((y) => y.id === x.id)) : [],
      mayRename: group, mayAdd: group, mayLeave: group,
      mayRemove: group ? people.filter((x) => x.id !== viewer.id && (runs || !runsStudio(x.role))).map((x) => x.id) : [],
      other,
    },
    seen,
  }
}
/** A project's conversation for the studio — the client's, with the team's beside it — null when it is gone or the viewer may not see it. */
export async function fetchProjectChat(projectId: string): Promise<ProjectChatData | null> {
  const [client, team] = await Promise.all([fetchConversation(conversationKey('client', projectId)), fetchConversation(conversationKey('team', projectId))])
  if (!client || !client.project || !client.lead || !team) return null
  return { ...client, project: client.project, lead: client.lead, team }
}

/* ── The inbox (/chat) and the rail's count ──────────────────────────────────────────────────────────────────────────────────── */
/** (parity map, UC-064 · UC-070) One row of /chat: a project's client conversation, a project's team's (Team chip), or a lead's (Lead chip).
    (pending modules S26) …a lead's Team conversation before Won (Team chip), or a members' one (Direct · Group · Studio). */
export type InboxRow = {
  key: string; kind: ConversationKind
  /** (S26) a members' conversation's kind — null for a lead's or a project's */ chatType: ChatType | null
  /** the project, when there is one (a lead's row has none) */ projectId: string | null
  /** the lead — null for a members' conversation (S26) */ leadId: string | null
  /** the project's name, or the lead's; (S26) the other member's, the group's, the studio's room's */ projectName: string
  projectNumber: string; client: string; stage: string
  /** the newest line — null for the studio's room before its first line, and for a conversation just started (S26) */
  last: { by: string; body: string; at: number; kind: 'client' | 'studio'; removed: boolean } | null
  /** when the conversation began — where an empty one sorts */ startedAt: number
  unread: number
  pinned: boolean; muted: boolean
}
async function visibleProjects() {
  const viewer = await fetchViewer()
  const [rows, seen] = await Promise.all([
    db.select({ id: projects.id, name: projects.name, number: projects.number, leadId: projects.leadId, stage: projects.stage, client: leads.name }).from(projects)
      .innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))),
    visibleLeadIds(viewer),
  ])
  return { viewer, seen, rows: rows.filter((r) => !seen || seen.has(r.leadId)) }
}
type Msg = { id: string; at: Date; authorKind: string; authorId: string | null; authorName: string; body: string; deletedAt: Date | null; photos?: unknown; attachments?: unknown; meta?: unknown }
const gistOf = (m: Msg) => {
  if (m.deletedAt) return ''
  if (m.body.trim()) return m.body
  const a = attachmentsOf(m.attachments)
  const photos = (Array.isArray(m.photos) ? (m.photos as unknown[]).length : 0) + a.photos.length
  const share = shareOf(m.meta) ?? a.share
  return share?.kind === 'place' ? 'The site’s location' : share?.kind === 'contact' ? `${share.name}’s contact` : a.files.some((f) => f.kind === 'voice') ? 'A voice note' : a.files.length ? (a.files.length > 1 ? `${a.files.length} files` : a.files[0]!.name) : photos > 1 ? 'Photos' : photos ? 'A photo' : ''
}
/** A members' conversation's stored line as the list's Msg (its `meta` is a group line's names, never a share). */
const asMsg = (m: ConversationMessage): Msg => ({ id: m.id, at: m.createdAt, authorKind: 'studio', authorId: m.authorId, authorName: m.authorName, body: m.body, deletedAt: m.deletedAt, attachments: m.attachments, meta: null })
/** Every conversation the viewer sees with words in it: each project's client and team conversations, and each lead's before Won (a lead
    whose project is live reads in its project's). Pinned first, then the unread, then the newest. (pending modules S26) And each lead's Team
    conversation before Won, and every members' conversation they are in — the studio's room always. Accounting opens no Messages: none. */
async function inbox(): Promise<InboxRow[]> {
  const { viewer, seen, rows } = await visibleProjects()
  if (!opensWorkspace(viewer.role)) return []
  const ids = rows.map((r) => r.id)
  const liveLeads = new Set(rows.map((r) => r.leadId))
  const allProjectLeads = new Set((await db.select({ leadId: projects.leadId }).from(projects).where(isNull(projects.deletedAt))).map((r) => r.leadId))
  const [msgs, leadMsgs, reads, leadTeams, studio] = await Promise.all([
    ids.length ? db.select({ id: projectMessages.id, projectId: projectMessages.projectId, channel: projectMessages.channel, at: projectMessages.createdAt, authorKind: projectMessages.authorKind, authorId: projectMessages.authorId, authorName: projectMessages.authorName, body: projectMessages.body, deletedAt: projectMessages.deletedAt, photos: projectMessages.photos, attachments: projectMessages.attachments, meta: projectMessages.meta })
      .from(projectMessages).where(inArray(projectMessages.projectId, ids)).orderBy(desc(projectMessages.createdAt)) : Promise.resolve([]),
    db.select({ id: leadMessages.id, leadId: leadMessages.leadId, at: leadMessages.createdAt, authorKind: leadMessages.authorKind, authorId: leadMessages.authorId, authorName: leadMessages.authorName, body: leadMessages.body, deletedAt: leadMessages.deletedAt, attachments: leadMessages.attachments, client: leads.name, stage: leads.stage, leadDeleted: leads.deletedAt })
      .from(leadMessages).innerJoin(leads, eq(leads.id, leadMessages.leadId)).orderBy(desc(leadMessages.createdAt)),
    db.select().from(chatReads).where(and(eq(chatReads.readerKind, 'member'), eq(chatReads.readerId, viewer.id))),
    leadTeamConversations(),
    fetchStudio(),
  ])
  const readOf = new Map(reads.map((r) => [r.projectId, r.readAt.getTime()]))
  const out: InboxRow[] = []
  /* (pending modules S26) one's own line reads "You:" on every row (a members' conversation's did; now every kind does) */
  const lastOf = (m: Msg | undefined) => (m ? { by: m.authorKind !== 'client' && m.authorId === viewer.id ? 'You' : m.authorName, body: gistOf(m), at: m.at.getTime(), kind: (m.authorKind === 'client' ? 'client' : 'studio') as 'client' | 'studio', removed: !!m.deletedAt } : null)
  /* (S26) a Team conversation's count is its people's — the lead's or project's members and whoever has written in it (its bell's rule,
     `team_message`); anyone else who sees it finds the row, with no count and no badge */
  const assigned = await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.memberId, viewer.id))
  const onTeam = new Set(assigned.map((a) => a.leadId))
  const countsFor = (leadId: string, lines: Msg[]) => onTeam.has(leadId) || lines.some((m) => m.authorKind !== 'client' && m.authorId === viewer.id)
  const teamOfLead = new Map(leadTeams.map((t) => [t.leadId, t.msgs.map(asMsg)]))
  for (const p of rows) {
    const client = titleCaseName(p.client)
    const mine = msgs.filter((m) => m.projectId === p.id)
    const own = mine.filter((m) => m.channel !== 'team')
    const early = leadMsgs.filter((m) => m.leadId === p.leadId)
    /* the client's conversation: its newest line, the lead's before Won counted in */
    const lastClient = [own[0], early[0]].filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.at.getTime() - a.at.getTime())[0]
    const cl = lastOf(lastClient)
    if (cl) {
      const read = readOf.get(p.id) ?? 0
      out.push({ key: conversationKey('client', p.id), kind: 'client', chatType: null, projectId: p.id, leadId: p.leadId, projectName: p.name, projectNumber: p.number, client, stage: p.stage, last: cl, startedAt: cl.at, pinned: false, muted: false,
        unread: own.filter((m) => m.authorKind === 'client' && !m.deletedAt && m.at.getTime() > read).length })
    }
    /* the team's: its own lines and (S26) its lead's Team lines from before Won, read up to the later of the two marks */
    const team = [...mine.filter((m) => m.channel === 'team'), ...(teamOfLead.get(p.leadId) ?? [])].sort((a, b) => b.at.getTime() - a.at.getTime())
    const tl = lastOf(team[0])
    if (tl) {
      const read = Math.max(readOf.get(readIdOf('team', p.id)) ?? 0, readOf.get(readIdOf('lead-team', p.leadId)) ?? 0)
      out.push({ key: conversationKey('team', p.id), kind: 'team', chatType: null, projectId: p.id, leadId: p.leadId, projectName: p.name, projectNumber: p.number, client, stage: p.stage, last: tl, startedAt: tl.at, pinned: false, muted: false,
        unread: countsFor(p.leadId, team) ? team.filter((m) => m.authorId !== viewer.id && !m.deletedAt && m.at.getTime() > read).length : 0 })
    }
  }
  /* (UC-064) a lead's conversation before Won — a lead the viewer sees, with no live project (once Won it reads in the project's) */
  const byLead = new Map<string, typeof leadMsgs>()
  for (const m of leadMsgs) { if (m.leadDeleted || allProjectLeads.has(m.leadId) || liveLeads.has(m.leadId) || (seen && !seen.has(m.leadId))) continue; byLead.set(m.leadId, [...(byLead.get(m.leadId) ?? []), m]) }
  for (const [leadId, list] of byLead) {
    const l = lastOf(list[0]); if (!l) continue
    const read = readOf.get(readIdOf('lead', leadId)) ?? 0
    const client = titleCaseName(list[0]!.client)
    out.push({ key: conversationKey('lead', leadId), kind: 'lead', chatType: null, projectId: null, leadId, projectName: client, projectNumber: '', client, stage: list[0]!.stage, last: l, startedAt: l.at, pinned: false, muted: false,
      unread: list.filter((m) => m.authorKind === 'client' && !m.deletedAt && m.at.getTime() > read).length })
  }
  /* (S26) a lead's Team conversation before Won — the same rule as its client's: a lead the viewer sees, with no live project */
  const teamLeads = leadTeams.filter((t) => !allProjectLeads.has(t.leadId) && (!seen || seen.has(t.leadId)))
  const teamLeadRows = teamLeads.length ? await db.select({ id: leads.id, name: leads.name, stage: leads.stage, deletedAt: leads.deletedAt }).from(leads).where(inArray(leads.id, teamLeads.map((t) => t.leadId))) : []
  for (const t of teamLeads) {
    const lead = teamLeadRows.find((l) => l.id === t.leadId)
    if (!lead || lead.deletedAt) continue
    const list = t.msgs.map(asMsg)
    const l = lastOf(list[0]); if (!l) continue
    const read = readOf.get(readIdOf('lead-team', t.leadId)) ?? 0
    const client = titleCaseName(lead.name)
    out.push({ key: conversationKey('lead-team', t.leadId), kind: 'lead-team', chatType: null, projectId: null, leadId: t.leadId, projectName: client, projectNumber: '', client, stage: lead.stage, last: l, startedAt: l.at, pinned: false, muted: false,
      unread: countsFor(t.leadId, list) ? list.filter((m) => m.authorId !== viewer.id && !m.deletedAt && m.at.getTime() > read).length : 0 })
  }
  /* (S26) the members' conversations this member is in */
  for (const c of await chatInbox(viewer.id, shortStudioName(studio.name), (m) => gistOf(asMsg(m)))) {
    out.push({ key: c.key, kind: 'chat', chatType: c.type, projectId: null, leadId: null, projectName: c.title, projectNumber: '', client: '', stage: '',
      last: c.last ? { ...c.last, kind: 'studio' } : null, startedAt: c.last?.at ?? c.createdAt, unread: c.unread, pinned: false, muted: false })
  }
  const prefs = await prefsOf(viewer.id, out.map((r) => r.key))
  for (const r of out) { const pr = prefs.get(r.key); if (pr) { r.pinned = pr.pinned; r.muted = pr.muted } }
  out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.unread > 0) - Number(a.unread > 0) || (b.last?.at ?? b.startedAt) - (a.last?.at ?? a.startedAt))
  return out
}
/** (S26) What New ▾ starts from: the members to write to (active, who open Messages — never oneself) and the clients the viewer sees (each
    opens their home's conversation: the project's once there is one, else the lead's — invited or not). */
export type ChatStart = { members: { id: string; name: string; role: string; color: string }[]; clients: { key: string; label: string }[] }
async function chatStart(viewerId: string, seen: Set<string> | null): Promise<ChatStart> {
  const [team, ls, ps] = await Promise.all([
    chatMembers(),
    db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(isNull(leads.deletedAt)),
    db.select({ id: projects.id, name: projects.name, leadId: projects.leadId }).from(projects).where(isNull(projects.deletedAt)),
  ])
  const projectOf = new Map(ps.map((p) => [p.leadId, p]))
  return {
    members: team.filter((m) => m.active && m.id !== viewerId).map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color })).sort((a, b) => a.name.localeCompare(b.name)),
    clients: ls.filter((l) => !seen || seen.has(l.id)).map((l) => {
      const p = projectOf.get(l.id)
      return { key: p ? conversationKey('client', p.id) : conversationKey('lead', l.id), label: `${titleCaseName(l.name)} · ${p ? p.name : l.stage}` }
    }).sort((a, b) => a.label.localeCompare(b.label)),
  }
}
/** Every conversation the viewer sees — those with words in them — pinned first, then the unread, then the newest; (S26) and what New ▾ offers. */
export async function fetchChatInbox(): Promise<{ rows: InboxRow[]; now: number; start: ChatStart; viewerId: string }> {
  const viewer = await fetchViewer()
  const [rows, seen] = await Promise.all([inbox(), visibleLeadIds(viewer)])
  return { rows, now: Date.now(), start: await chatStart(viewer.id, seen), viewerId: viewer.id }
}
/** The rail's Messages count: conversations the viewer sees with a line they haven't read — the client's side's in a client's or a lead's,
    a teammate's in a team's — leaving out the ones they muted (UC-070). (S26) A members' conversation counts the same way. */
export async function countUnreadChats(): Promise<number> {
  return (await inbox()).filter((r) => r.unread > 0 && !r.muted).length
}
/** The Messages tab's count for this viewer: the client's messages they haven't read. */
export async function unreadInChat(projectId: string, memberId: string): Promise<number> {
  const read = (await readMark('member', memberId, projectId)) ?? 0
  const rows = await db.select({ id: projectMessages.id }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.authorKind, 'client'), eq(projectMessages.channel, 'client'), isNull(projectMessages.deletedAt), gt(projectMessages.createdAt, new Date(read))))
  return rows.length
}
/** (parity map, UC-064) The team's conversation's count for this viewer — a teammate's lines they haven't read (the Team chip's). */
export async function unreadInTeam(projectId: string, memberId: string): Promise<number> {
  const read = (await readMark('member', memberId, readIdOf('team', projectId))) ?? 0
  const rows = await db.select({ id: projectMessages.id }).from(projectMessages)
    .where(and(eq(projectMessages.projectId, projectId), eq(projectMessages.channel, 'team'), ne(projectMessages.authorId, memberId), isNull(projectMessages.deletedAt), gt(projectMessages.createdAt, new Date(read))))
  return rows.length
}

/** Whether a file is a photo or a file of a message still there on the lead's conversation with the client's side — the portal's file route
    lets the client open it. (parity map, UC-064) Never a team message's; a lead's conversation before Won counts. */
export async function isClientMessageFile(fileId: string, leadId: string): Promise<boolean> {
  const [rows, early] = await Promise.all([
    db.select({ photos: projectMessages.photos, attachments: projectMessages.attachments }).from(projectMessages).where(and(eq(projectMessages.leadId, leadId), eq(projectMessages.channel, 'client'), isNull(projectMessages.deletedAt))),
    db.select({ attachments: leadMessages.attachments }).from(leadMessages).where(and(eq(leadMessages.leadId, leadId), isNull(leadMessages.deletedAt))),
  ])
  return [...rows, ...early].some((r) => messageFileIds(r).includes(fileId))
}

/* ── (parity map, UC-064) the client's side: each home's conversation — a project's with the team, or a lead's before Won ─────────────── */
/** One home's conversation on the portal. `key` is the conversation's (`project:<id>` · `lead:<leadId>`); a lead's has no project. */
export type PortalConversation = {
  key: string; homeId: string; leadId: string; projectId: string | null; title: string; done: boolean
  lines: ChatLine[]; more: boolean; readAt: number | null; team: { name: string; color: string }[]
}
const firstOf = (name: string) => name.trim().split(/\s+/)[0] ?? name.trim()
/** The client's conversations, one per home they are invited to: a project's when it has one (the lead's lines first), else the lead's. Never
    the team's own. `src` makes every picture's and file's address on the portal's own route (lib/portal/files.ts `portalFileHref`). */
export async function fetchPortalConversations(visitor: { homeownerId: string; links: { linkId: string; leadId: string }[] }, src: (id: string) => string, o: { titles?: Record<string, string>
  /** (pending modules S13) the client's own team's photos, through the portal's address (lib/portal/faces.ts `clientFaces`) — else tints */
  faces?: ClientFaces | null } = {}): Promise<PortalConversation[]> {
  const leadIds = visitor.links.map((l) => l.leadId)
  if (!leadIds.length) return []
  const [ps, ls] = await Promise.all([
    db.select().from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt))),
    db.select({ id: leads.id, propertyAddress: leads.propertyAddress, propertyType: leads.propertyType, deletedAt: leads.deletedAt }).from(leads).where(inArray(leads.id, leadIds)),
  ])
  const out: PortalConversation[] = []
  for (const link of visitor.links) {
    const lead = ls.find((x) => x.id === link.leadId)
    if (!lead || lead.deletedAt || out.some((h) => h.leadId === link.leadId)) continue
    const p = ps.find((x) => x.leadId === link.leadId) ?? null
    const team = await db.select({ name: members.name, color: members.color }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId)).where(eq(leadAssignees.leadId, link.leadId))
    const place = (lead.propertyAddress ?? '').split(',')[0]?.trim()
    const title = o.titles?.[link.leadId] ?? (p ? p.name : place ? `Your home at ${place}` : lead.propertyType || 'Your home')
    const [{ lines, more }, readAt] = p
      ? await Promise.all([chatLines(p.id, { src, fileSrc: src, leadId: link.leadId }), readMark('client', visitor.homeownerId, p.id)])
      : await Promise.all([leadChatLines(link.leadId, { src, fileSrc: src }), readMark('client', visitor.homeownerId, readIdOf('lead', link.leadId))])
    out.push({ key: p ? conversationKey('client', p.id) : conversationKey('lead', link.leadId), homeId: link.linkId, leadId: link.leadId, projectId: p?.id ?? null, title, done: p?.stage === 'completed',
      lines: forClient(lines, o.faces), more, readAt, team: forClient(team.map((t) => ({ name: firstOf(t.name), color: t.color })), o.faces) })   // (pending modules S01 · S13) no studio picture address on a client's page — the team's faces through the portal's own
  }
  return out
}
