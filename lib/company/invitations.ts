/**
 * (pending modules S09 — the card `onboarding:team-invitations`, her "build all of them" 2026-10-11; 1.0's `studio_invitations`, its
 * `/api/invitations/{send,[token],accept}` and auth/verify's auto-accept) Inviting your team, as the screens and the server read it. Pure,
 * client-safe.
 *
 * - **Add member invites.** The member is made at once (in every picker — 2.0's Add member, and 1.0's self-serve flow, which created the
 *   member with the invitation) and sent an invitation: WhatsApp to their mobile (1.0's SMS), email to their address (1.0's
 *   `team.member_invited`), each through the house outbox (lib/notifications/delivery.ts — Settings › Notifications › Sent messages lists
 *   them; the prototype's adapter sends nothing). Always on, as 1.0's was ("always send invite email to the invitee").
 * - **The link** is `/join/<token>` — its own random token, open for 30 days (1.0's). Send again re-opens it for 30 days from then and keeps
 *   the token (1.0's PATCH), so the first message's link works again too. Cancel the invitation closes it for good.
 * - **Invited** until their first visit (1.0: the first sign-in with that number accepts every pending invitation) — here the first visit is
 *   the join page's Join, or the first-visit welcome closing (the signed-in member is View as's until sign-in, S30). Then `accepted`, and
 *   whoever invited them hears it (`member_joined`).
 * - **Cancel the invitation** takes the member out of the team (deactivated, never deleted — their records stay theirs) and frees their
 *   seat; Undo brings both back. A cancelled invitee who never came in is invited again from Deactivated (a new link).
 */

import { isSgMobile } from '@/lib/format'

/** 1.0's thirty days. */
export const INVITE_DAYS = 30
const DAY_MS = 86_400_000
export const inviteEndsAt = (from: number, days = INVITE_DAYS) => from + days * DAY_MS

/** The outbox event an invitation's messages are logged under (Settings › Notifications › Sent messages). */
export const INVITE_EVENT = 'member_invite' as const
export type InviteEvent = typeof INVITE_EVENT
/** How Sent messages names it — beside "To the client · …" (invented copy). */
export const INVITE_EVENT_LABEL = 'To a new member · An invitation to join'

/** The address of the invitation's own page. */
export const joinPath = (token: string) => `/join/${encodeURIComponent(token)}`
/** A token as an address may carry it — 22 characters of base64url (nothing else is looked up). */
export const isInviteToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(t)

export type InviteChannel = 'whatsapp' | 'email'
/** The channels a person can be reached on: WhatsApp on a mobile, email on an address — in that order. (S42 audit A-02) A mobile is S30's
    sign-in rule (`isSgMobile`, 8 or 9 first): a landline gets no WhatsApp and can't sign in, so it never counts as a way to send. */
export function channelsFor(to: { phone: string | null | undefined; email: string | null | undefined }): InviteChannel[] {
  return [...(isSgMobile((to.phone ?? '').replace(/\D/g, '')) ? (['whatsapp'] as const) : []), ...((to.email ?? '').trim() ? (['email'] as const) : [])]
}
export const parseChannels = (v: string | null | undefined): InviteChannel[] => (v ?? '').split(',').filter((c): c is InviteChannel => c === 'whatsapp' || c === 'email')
/** "WhatsApp and email" · "WhatsApp" · "email". */
export const channelWords = (list: readonly InviteChannel[]) => list.map((c) => (c === 'whatsapp' ? 'WhatsApp' : 'email')).join(' and ')

/** What a member's row reads its invitation as. `none` = a member who has never come in and was never sent one (added before invitations
    existed); `unsent` = an invitation with nowhere to go (no mobile, no email). */
export type InviteState = 'pending' | 'unsent' | 'expired' | 'accepted' | 'cancelled' | 'none'

/** An invitation as Company › Members carries it — the token only to whoever may manage it (Owners and Admins). */
export type InviteView = {
  id: string
  status: 'pending' | 'accepted' | 'cancelled'
  createdAt: number
  sentAt: number | null
  sendCount: number
  expiresAt: number
  channels: InviteChannel[]
  /** how the last send went, per channel, as the outbox has it ('sent' · 'paused' · 'failed' …) */
  delivery: Partial<Record<InviteChannel, string>>
  by: string | null
  acceptedAt: number | null
  cancelledAt: number | null
  token: string | null
}

export function inviteStateOf(v: InviteView | null | undefined, m: { isActive: boolean; welcomedAt: Date | number | null; welcomeDue: boolean }, now: number): InviteState | null {
  if (v?.status === 'accepted') return 'accepted'
  if (v?.status === 'pending') return v.expiresAt <= now ? 'expired' : v.channels.length ? 'pending' : 'unsent'
  if (v?.status === 'cancelled' && !m.isActive) return 'cancelled'
  /* never had one, or brought back by Reactivate after a cancel: still not come in — the row offers their (first) invitation */
  return m.isActive && !m.welcomedAt && m.welcomeDue ? 'none' : null
}
/** Still waiting on the person: the row says Invited (or Invitation expired), and Cancel the invitation is its remove. */
export const waitingOn = (s: InviteState | null) => s === 'pending' || s === 'unsent' || s === 'expired' || s === 'none'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]}` }

/** The row's line under the member — who invited them and when, how it went, how long the link stays open (invented copy). */
export function inviteLine(v: InviteView | null, state: InviteState, now: number): string {
  if (state === 'none' || !v) return 'Hasn’t come in yet — no invitation was sent'
  const who = `${v.by ? `Invited by ${v.by}` : 'Invited'} on ${day(v.createdAt)}`
  if (state === 'unsent') return `${who} · not sent — add a mobile number or an email, then send it`
  if (state === 'expired') return `${who} · the link expired on ${day(v.expiresAt)} — send it again to open it for ${INVITE_DAYS} more days`
  const failed = v.channels.filter((c) => v.delivery[c] === 'failed')
  const waiting = v.channels.filter((c) => v.delivery[c] && v.delivery[c] !== 'sent' && v.delivery[c] !== 'failed')
  const sent = v.sendCount > 1 && v.sentAt ? `sent again on ${day(v.sentAt)}` : 'sent'
  const how = failed.length ? `the ${channelWords(failed)} didn’t go — send it again` : waiting.length ? `waiting to go by ${channelWords(v.channels)}` : `${sent} by ${channelWords(v.channels)}`
  const left = v.expiresAt - now
  return `${who} · ${how} · ${left < DAY_MS ? 'the link closes today' : `the link is open until ${day(v.expiresAt)}`}`
}

/* ── the message (invented copy, from 1.0's: SMS "You've been invited to join {studio} on OpenMaison. Login at {url} to get started.",
   WhatsApp "{invited_by} invited you to {studio}. Sign in: {url}", the email "{inviter} has invited you to join {studio} on OpenMaison" with
   the role and "Accept invite"; a resend's "Reminder: …"). A member hears the platform's name — they will work in it; a client never does. ── */

const aRole = (role: string) => (role === 'Owner' || role === 'Admin' ? `an ${role}` : `a ${role}`)
/** What they are invited as — "as a Designer", "as an Admin", Accounting's "to keep the books". */
export const asRole = (role: string) => (role === 'Accounting' ? 'to keep the books' : role === 'Marketing' ? 'to look after the leads' : `as ${aRole(role)}`)   // (S44O — C6) invented copy
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export function inviteMessage(o: { to: string; by: string | null; studio: string; role: string; link: string; until: number; again: boolean }, channel: InviteChannel): { subject: string | null; body: string } {
  const hi = `Hi ${firstName(o.to)}`
  const who = o.by ? `${o.by} invited you` : 'You’re invited'
  const as = asRole(o.role)
  if (channel === 'whatsapp') {
    return { subject: null, body: `${o.again ? 'A reminder: ' : ''}${hi}, ${who} to join ${o.studio} on OpenMaison ${as}. Join here: ${o.link} (open until ${day(o.until)})` }
  }
  return {
    subject: `${o.again ? 'Reminder: ' : ''}${o.by ? `${o.by} invited you` : 'You’re invited'} to join ${o.studio}`,
    body: `${hi},\n\n${who} to join ${o.studio} on OpenMaison ${as}.\n\nJoin here: ${o.link}\n\nThe link stays open until ${day(o.until)}.\n\n${o.studio}`,
  }
}

/* ── the refusals (one sentence each, the rule's own words) ── */
export const INVITE_RULE = 'Only Owners and Admins invite members'
export const OWNER_INVITE_RULE = 'Only an Owner invites an Owner'
export const nowhereToSend = (name: string) => `Add a mobile number or an email for ${name} first`
export const CAME_IN = 'They’ve already come in — there’s nothing to send'
