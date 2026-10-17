import 'server-only'
import { randomBytes, randomUUID } from 'node:crypto'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, notificationOutbox, studioInvitations, type StudioInvitation } from '@/lib/db/schema'
import { siteConfig } from '@/lib/config'
import { deliver } from '@/lib/notifications/delivery'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { fetchBrand } from '@/lib/templates/queries'
import { homeOfRole } from '@/lib/settings/roles'
import { codeGoesTo, contactsOf } from '@/lib/auth/model'   // (pending modules S30)
import { readStudioSession } from '@/lib/auth/session'
import { INVITE_EVENT, channelsFor, inviteEndsAt, inviteMessage, isInviteToken, joinPath, parseChannels, type InviteChannel, type InviteView } from './invitations'

/*
 * (pending modules S09 — her "build all of them" 2026-10-11; 1.0's `/api/invitations/send` · `[token]` (GET · PATCH resend · DELETE cancel) ·
 * `accept` and auth/verify's auto-accept) Inviting a member, on the server: the invitation's record, its messages through the house outbox, its
 * page's read and the first visit that accepts it. The rules (who may) live in the actions (app/company/members-actions.ts); this module
 * only does what they allow. PRODUCTION: a real provider is the developers' `setDeliveryAdapter` — nothing here changes; sign-in (S30)
 * calls `acceptInvitationOf` on a member's first sign-in, as 1.0's verify route did — on /sign-in and on the invitation's page alike.
 */

export const newInviteToken = () => randomBytes(16).toString('base64url')
const absolute = (path: string) => `${siteConfig.url.replace(/\/$/, '')}${path}`

type Invitee = { id: string; name: string; role: string; phone: string | null; email: string | null }

/** A new invitation for a member who has just been added (or is invited again) — then its first send. Answers the channels it went by. */
export async function inviteMember(m: Invitee, by: string | null, now = Date.now()): Promise<{ id: string; channels: InviteChannel[] }> {
  const id = randomUUID()
  await db.insert(studioInvitations).values({
    id, memberId: m.id, invitedBy: by, fullName: m.name, phone: m.phone, email: m.email, role: m.role, token: newInviteToken(),
    status: 'pending', expiresAt: new Date(inviteEndsAt(now)), sendCount: 0, channels: '', createdAt: new Date(now),
  })
  const channels = await sendInvitation(id, now)
  return { id, channels }
}

/**
 * Send a pending invitation — to the member's mobile and address as they are now (a corrected number is where it goes), the window open for
 * 30 days from now, the token unchanged. A second send says "Reminder" (1.0's). With nowhere to send it, nothing goes and the row says so.
 * Each message is one outbox row, keyed by the invitation and the send, so it never goes twice. Answers the channels it went by.
 */
export async function sendInvitation(invitationId: string, now = Date.now()): Promise<InviteChannel[]> {
  const [inv] = await db.select().from(studioInvitations).where(and(eq(studioInvitations.id, invitationId), eq(studioInvitations.status, 'pending'))).limit(1)
  if (!inv) return []
  const [[m], [by], studio] = await Promise.all([
    db.select({ id: members.id, name: members.name, role: members.role, phone: members.phone, email: members.email }).from(members).where(eq(members.id, inv.memberId)).limit(1),
    inv.invitedBy ? db.select({ name: members.name }).from(members).where(eq(members.id, inv.invitedBy)).limit(1) : Promise.resolve([]),
    fetchStudio(),
  ])
  if (!m) return []
  const channels = channelsFor(m)
  const until = inviteEndsAt(now)
  const n = channels.length ? inv.sendCount + 1 : inv.sendCount
  await db.update(studioInvitations).set({
    fullName: m.name, phone: m.phone, email: m.email, role: m.role, expiresAt: new Date(until), channels: channels.join(','),
    ...(channels.length ? { sentAt: new Date(now), sendCount: n } : {}),
  }).where(eq(studioInvitations.id, inv.id))
  const link = absolute(joinPath(inv.token))
  for (const channel of channels) {
    const words = inviteMessage({ to: m.name, by: by?.name ?? null, studio: shortStudioName(studio.name), role: m.role, link, until, again: n > 1 }, channel)
    try {
      await deliver({ key: `i:${inv.id}:${n}:${channel}`, event: INVITE_EVENT, channel, to: { memberId: m.id, name: m.name, email: m.email, phone: m.phone }, subject: words.subject, body: words.body, href: link, leadId: null, notificationId: null })
    } catch (e) { console.error(`[invitations] ${channel} to ${m.name} wasn’t written:`, e instanceof Error ? e.message : e) }   // the row reads what the outbox kept
  }
  return channels
}

/** The member's latest invitation (any status) — what their row and the rules read. */
export async function latestInvitation(memberId: string): Promise<StudioInvitation | null> {
  const [r] = await db.select().from(studioInvitations).where(eq(studioInvitations.memberId, memberId)).orderBy(desc(studioInvitations.createdAt)).limit(1)
  return r ?? null
}

/** Whether a member has come in — a first visit recorded, or an invitation accepted (the join page's Join comes before the welcome closes). */
export async function hasComeIn(m: { id: string; welcomedAt: Date | null }): Promise<boolean> {
  if (m.welcomedAt) return true
  const [a] = await db.select({ id: studioInvitations.id }).from(studioInvitations).where(and(eq(studioInvitations.memberId, m.id), eq(studioInvitations.status, 'accepted'))).limit(1)
  return !!a
}

/** Deactivating a member closes their waiting invitation (the link stops opening). Answers its id, for Undo. */
export async function cancelPendingInvitation(memberId: string, by: string | null, now = Date.now()): Promise<string | null> {
  const rows = await db.update(studioInvitations).set({ status: 'cancelled', cancelledAt: new Date(now), cancelledBy: by })
    .where(and(eq(studioInvitations.memberId, memberId), eq(studioInvitations.status, 'pending'))).returning({ id: studioInvitations.id })
  return rows[0]?.id ?? null
}
/** Undo of that: the same invitation waits again — the same link, the same window. */
export async function restoreInvitation(memberId: string, invitationId: string): Promise<void> {
  await db.update(studioInvitations).set({ status: 'pending', cancelledAt: null, cancelledBy: null })
    .where(and(eq(studioInvitations.id, invitationId), eq(studioInvitations.memberId, memberId), eq(studioInvitations.status, 'cancelled')))
}

/**
 * A member's first visit (1.0: their first sign-in accepted every pending invitation for that number): the invitation waiting for them is
 * accepted, and whoever invited them hears it — the Owners when that member has left. Idempotent (only a pending one moves, compare-and-set);
 * never throws — the visit itself never fails on it.
 */
export async function acceptInvitationOf(memberId: string, now = Date.now()): Promise<boolean> {
  try {
    const [row] = await db.update(studioInvitations).set({ status: 'accepted', acceptedAt: new Date(now) })
      .where(and(eq(studioInvitations.memberId, memberId), eq(studioInvitations.status, 'pending')))
      .returning({ id: studioInvitations.id, invitedBy: studioInvitations.invitedBy, createdAt: studioInvitations.createdAt })
    if (!row) return false
    const team = await db.select({ id: members.id, name: members.name, role: members.role, isActive: members.isActive }).from(members)
    const me = team.find((x) => x.id === memberId)
    const inviter = team.find((x) => x.id === row.invitedBy && x.isActive)
    const to = inviter ? [inviter.id] : team.filter((x) => x.role === 'Owner' && x.isActive).map((x) => x.id)
    if (me && to.length) {
      const { notify } = await import('@/lib/notifications/emit')
      const d = row.createdAt
      await notify('member_joined', to, {
        title: `${me.name} joined the studio`,
        body: `${me.role === 'Accounting' || me.role === 'Marketing' ? `In ${me.role}` : `As ${me.role === 'Owner' || me.role === 'Admin' ? 'an' : 'a'} ${me.role}`} · invited on ${d.getDate()} ${d.toLocaleString('en-SG', { month: 'short' })}`,
        href: `/company/members?open=${encodeURIComponent(memberId)}`, actorId: memberId,
      })
    }
    return true
  } catch (e) { console.error('[invitations] accepting failed:', e instanceof Error ? e.message : e); return false }
}

/* ── the invitation's page (`/join/<token>`, no sign-in) ─────────────────────────────────────────────────────────────────────────────── */

export type JoinView = {
  state: 'open' | 'expired' | 'inactive' | 'joined'
  studio: string
  logo: string | null
  name: string
  role: string
  by: string | null
  until: number
  /** the mobile's last four — what sign-in will ask them to confirm (S30) */
  ending: string | null
  /** (pending modules S30) where Join's code goes, as the page says it — "the mobile number ending 0077" · "your email n•••@…"; null = nowhere */
  to: string | null
  /** (pending modules S30) this browser is signed in as them already — a joined link just opens the app */
  signedIn: boolean
  joinedAt: number | null
}
/** What the join page shows for a token — null when no invitation has it (the page then says the link is no longer active). Never the token
    back, never anyone else's details (1.0's GET kept the token out too). */
export async function fetchJoin(token: string, now = Date.now()): Promise<JoinView | null> {
  if (!isInviteToken(token)) return null
  const [inv] = await db.select().from(studioInvitations).where(eq(studioInvitations.token, token)).limit(1)
  if (!inv) return null
  const [[m], [by], brand] = await Promise.all([
    db.select({ name: members.name, role: members.role, isActive: members.isActive, phone: members.phone, email: members.email }).from(members).where(eq(members.id, inv.memberId)).limit(1),
    inv.invitedBy ? db.select({ name: members.name }).from(members).where(eq(members.id, inv.invitedBy)).limit(1) : Promise.resolve([]),
    fetchBrand(),
  ])
  const state: JoinView['state'] = !m || !m.isActive || inv.status === 'cancelled' ? 'inactive' : inv.status === 'accepted' ? 'joined' : inv.expiresAt.getTime() <= now ? 'expired' : 'open'
  const digits = (m?.phone ?? '').replace(/\D/g, '')
  return {
    state, studio: shortStudioName(brand.details.name || 'Your studio'), logo: brand.kit.logo ?? null, name: m?.name ?? inv.fullName, role: m?.role ?? inv.role,
    by: by?.name ?? null, until: inv.expiresAt.getTime(), ending: digits.length >= 4 ? digits.slice(-4) : null, joinedAt: inv.acceptedAt?.getTime() ?? null,
    to: (() => { const c = m ? contactsOf(m)[0] : undefined; return c ? codeGoesTo(c) : null })(),
    signedIn: await (async () => { const s = await readStudioSession(); return s.in && s.memberId === inv.memberId })(),
  }
}
/** The member a join link belongs to, while it may still bring them in (open, or already joined) — for the page's Join. */
export async function memberForJoin(token: string, now = Date.now()): Promise<{ memberId: string; role: string; state: 'open' | 'joined' } | { error: string }> {
  if (!isInviteToken(token)) return { error: 'This invitation is no longer active' }
  const [inv] = await db.select().from(studioInvitations).where(eq(studioInvitations.token, token)).limit(1)
  if (!inv) return { error: 'This invitation is no longer active' }
  const [m] = await db.select({ id: members.id, role: members.role, isActive: members.isActive }).from(members).where(eq(members.id, inv.memberId)).limit(1)
  if (!m || !m.isActive || inv.status === 'cancelled') return { error: 'This invitation is no longer active' }
  if (inv.status === 'accepted') return { memberId: m.id, role: m.role, state: 'joined' }
  if (inv.expiresAt.getTime() <= now) return { error: 'This invitation has expired — ask for a new one' }
  return { memberId: m.id, role: m.role, state: 'open' }
}
/** Where a member lands after joining or signing in — the front door, as `/` sends them (pending modules S22: the Dashboard; Accounting's is
    Finance, FR-040); the welcome waits for them there. (S42 audit A-04) It said /leads, from before the Dashboard. */
export const homeOf = (role: string) => homeOfRole(role)   // (S44O — C6) one rule for every role's front door

/* ── Company › Members' read ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Each member's latest invitation, as their row reads it — with how its last send went (the outbox's rows), the inviter's name, and the
    token only for a viewer who may manage it. */
export async function fetchInvitationViews(memberIds: string[], withTokens: boolean): Promise<Map<string, InviteView>> {
  const out = new Map<string, InviteView>()
  if (!memberIds.length) return out
  const rows = await db.select().from(studioInvitations).where(inArray(studioInvitations.memberId, memberIds)).orderBy(desc(studioInvitations.createdAt))
  const latest = new Map<string, StudioInvitation>()
  for (const r of rows) if (!latest.has(r.memberId)) latest.set(r.memberId, r)
  if (!latest.size) return out
  const keys = [...latest.values()].flatMap((r) => parseChannels(r.channels).map((c) => `i:${r.id}:${r.sendCount}:${c}`))
  const [sent, people] = await Promise.all([
    keys.length ? db.select({ key: notificationOutbox.key, status: notificationOutbox.status }).from(notificationOutbox).where(inArray(notificationOutbox.key, keys)) : Promise.resolve([]),
    db.select({ id: members.id, name: members.name }).from(members),
  ])
  const status = new Map(sent.map((s) => [s.key, s.status]))
  const nameOf = new Map(people.map((p) => [p.id, p.name]))
  for (const [memberId, r] of latest) {
    const channels = parseChannels(r.channels)
    const delivery: InviteView['delivery'] = {}
    for (const c of channels) { const s = status.get(`i:${r.id}:${r.sendCount}:${c}`); if (s) delivery[c] = s }
    out.set(memberId, {
      id: r.id, status: r.status === 'accepted' || r.status === 'cancelled' ? r.status : 'pending', createdAt: r.createdAt.getTime(), sentAt: r.sentAt?.getTime() ?? null,
      sendCount: r.sendCount, expiresAt: r.expiresAt.getTime(), channels, delivery, by: r.invitedBy ? nameOf.get(r.invitedBy) ?? null : null,
      acceptedAt: r.acceptedAt?.getTime() ?? null, cancelledAt: r.cancelledAt?.getTime() ?? null, token: withTokens && r.status === 'pending' ? r.token : null,
    })
  }
  return out
}
