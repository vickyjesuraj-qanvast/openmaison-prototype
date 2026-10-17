import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, projects, type ConversationRow } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { mayChangeProject } from '@/lib/projects/policy'
import { opensWorkspace } from '@/lib/settings/roles'
import { chatMembers, chatPeople, chatRow, chatTypeOf, type ChatPerson } from './studio-chats'
import { conversationKey, parseConversationKey, readIdOf, type ChatType, type ConversationKind } from './messages-model'

/*
 * (gaps build H · parity map UC-064 — moved out of app/projects/messages-actions.ts by pending modules S26, so New ▾'s actions (app/chat/actions.ts)
 * ask the same question) Who is writing in a conversation, and may they: a project's (the client's side or the team's), a lead's before Won,
 * (S26) a lead's Team conversation before Won, or one among the studio's members. A refusal is `{ error }` with the rule in words.
 */
export type Refusal = { error: string }
export const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
export const GONE = 'This project isn’t there any more'
export const CONV_GONE = 'This conversation isn’t there any more'
export const LEAD_RULE = 'Only the lead’s team, their Managers, Owners and Admins write here'

/** A members' conversation's people and kind (S26). */
export type ChatCtx = { row: ConversationRow; type: ChatType; people: (ChatPerson & { joinedAt: number })[]; everyone: ChatPerson[]; other: ChatPerson | null }
export type Ctx = {
  kind: ConversationKind; key: string
  p: typeof projects.$inferSelect | null
  /** the lead — null for a members' conversation */ leadId: string | null
  client: string; place: string | null; viewer: Viewer; me: { id: string; name: string; color: string }
  /** who the conversation is with on the studio's side — a lead's or a project's members; a members' conversation's people */ team: string[]
  mayWrite: boolean
  chat: ChatCtx | null
}

export async function forConversation(key: string): Promise<Ctx | Refusal> {
  const k = parseConversationKey(String(key ?? ''))
  if (!k) return { error: CONV_GONE }
  const viewer = await fetchViewer()
  const [m] = await db.select({ name: members.name, color: members.color }).from(members).where(eq(members.id, viewer.id)).limit(1)
  const me = { id: viewer.id, name: m?.name ?? 'Someone', color: m?.color ?? '#5B7FD7' }
  /* (S26) a members' conversation: its people read and write; nobody else (an Owner never reads two members' own) */
  if (k.kind === 'chat') {
    if (!opensWorkspace(viewer.role)) return { error: CONV_GONE }
    const row = await chatRow(k.id)
    if (!row) return { error: CONV_GONE }
    const everyone = await chatMembers()
    const people = await chatPeople(row, everyone)
    if (!people.some((x) => x.id === viewer.id)) return { error: CONV_GONE }
    const type = chatTypeOf(row)
    const otherId = type === 'direct' ? (row.pairKey ?? '').split('|').find((x) => x !== viewer.id) ?? null : null
    const other = otherId ? everyone.find((x) => x.id === otherId) ?? null : null
    return { kind: 'chat', key: conversationKey('chat', row.id), p: null, leadId: null, client: '', place: null, viewer, me, team: people.map((x) => x.id),
      mayWrite: type !== 'direct' || !!other?.active, chat: { row, type, people, everyone, other } }
  }
  let p: typeof projects.$inferSelect | null = null
  let leadId: string
  if (k.kind === 'lead' || k.kind === 'lead-team') {
    leadId = k.id
    /* (UC-064) once Won a lead's conversation carries on in its project's — (S26) and its Team conversation in the project's Team one */
    const [live] = await db.select().from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
    if (live) return forConversation(conversationKey(k.kind === 'lead' ? 'client' : 'team', live.id))
  } else {
    const [row] = await db.select().from(projects).where(eq(projects.id, k.id)).limit(1)
    if (!row || row.deletedAt) return { error: GONE }
    p = row; leadId = row.leadId
  }
  const lead0 = k.kind === 'lead' || k.kind === 'lead-team'
  const [lead] = await db.select({ name: leads.name, deletedAt: leads.deletedAt, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead || lead.deletedAt) return { error: lead0 ? CONV_GONE : GONE }
  if (!(await canOpenLead(viewer, leadId))) return { error: lead0 ? CONV_GONE : GONE }
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.id)
  return { kind: k.kind, key: conversationKey(k.kind, k.id), p, leadId, client: lead.name, place: (lead.propertyAddress || lead.leadAddress || '').trim() || null, viewer,
    me, team, mayWrite: mayChangeProject(viewer, team), chat: null }
}
/** Where the viewer's read mark for it lives (`chat_reads.project_id`). */
export const readIdOfCtx = (c: Ctx) => readIdOf(c.kind, c.kind === 'chat' ? c.chat!.row.id : c.kind === 'lead' || c.kind === 'lead-team' ? c.leadId! : c.p!.id)
/** Where a bell for it opens: a project's Messages (the team's view of it), else Messages with it open. */
export const hrefOfCtx = (c: Ctx) => (c.kind === 'client' || c.kind === 'team' ? `/projects/${c.p!.id}/messages${c.kind === 'team' ? '?channel=team' : ''}` : `/chat?open=${encodeURIComponent(c.key)}`)
/** The refusal a viewer who may not write reads. */
export const writeRule = (c: Ctx, change: string) => (c.kind === 'chat'
  ? (c.chat?.type === 'direct' && c.chat.other && !c.chat.other.active ? `${c.chat.other.name} is no longer in the studio` : 'Only the people in this conversation write in it')
  : c.kind === 'lead' || c.kind === 'lead-team' ? LEAD_RULE : change)
