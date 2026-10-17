'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { homeownerHouseholdLinks, homeownerLeadLinks, homeownerProfiles, leadAssignees, leads } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { MSG } from '@/lib/forms'
import { SG_MOBILE_MSG, isSgMobile, phoneDigits, titleCaseName } from '@/lib/format'
import { dropLeadEvents, logLeadEvent } from '@/lib/leads/events'
import { revalidateLead } from '@/lib/leads/queries'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { worksOn } from '@/lib/projects/policy'
import { RELATIONSHIP_MAX, householdLink } from '@/lib/portal/household'
import { PORTAL_ACCESS_RULE, firstName } from '@/lib/portal/model'
import { currentPortalSlug } from '@/lib/portal/queries'
import { endSessionsWithout } from '@/lib/portal/session'

/*
 * (Projects round 9 — Q-42; board 8 "Add someone else from the household") Someone else from the client's household: added with their own
 * number (an 8-digit Singapore mobile, `isSgPhone` — 1.0 assumed the country and stored foreign numbers wrong, M-234), sent the link on
 * WhatsApp (wa.me opens on the press in the browser; this records it), withdrawn with Undo, removed with Undo (soft — 1.0 hard-deleted with no
 * Undo, M-239). The rule is Client access's: whoever works on the lead, Owners and Admins (`worksOn`). Every step is a line in the lead's
 * Activity under the person's name. A refusal answers `{ error: <the rule> }`.
 */

type Refusal = { error: string }
const touch = (leadId: string) => { revalidateLead(leadId); revalidatePath('/company/portal', 'layout') }
const cleanName = (s: string) => titleCaseName(s.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 80)
const cleanRelationship = (s: string | null | undefined) => (s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, RELATIONSHIP_MAX)

/** The lead the viewer may act on for its client's access, or the refusal (Client access's own rule). */
async function forAccess(leadId: string): Promise<Refusal | { phone: string; client: string }> {
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return { error: 'This lead isn’t one you can open' }
  const [l] = await db.select({ phone: leads.phone, name: leads.name }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  if (!l) return { error: 'This lead was deleted' }
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  if (!worksOn(viewer, team.map((t) => t.id))) return { error: PORTAL_ACCESS_RULE }
  return { phone: phoneDigits(l.phone), client: titleCaseName(l.name) }
}
/** A household row the viewer may act on. */
async function forPerson(id: string) {
  const r = await householdLink(id)
  if (!r || r.k.removedAt) return { error: 'This person isn’t on the household any more' } as Refusal
  const ok = await forAccess(r.k.leadId)
  if ('error' in ok) return ok
  return { ...r, client: ok.client }
}

/**
 * Add someone else from the household (and, with `invite`, send them the link in the same press — the panel's one button). Their number gets
 * its own profile (or the one it already has: a client of another home keeps their name). Refused: no name, not a mobile number, the client's
 * own number, someone already on this home.
 */
export async function addHouseholdMember(leadId: string, input: { name: string; phone: string; relationship?: string | null; invite: boolean; otherClient?: boolean }): Promise<Refusal | { confirm: 'other-client'; name: string } | { id: string; name: string; slug: string }> {
  const ok = await forAccess(leadId)
  if ('error' in ok) return ok
  const name = cleanName(String(input.name ?? ''))
  if (!name) return { error: `Their name: ${MSG.required.toLowerCase()}` }
  const phone = phoneDigits(String(input.phone ?? ''))
  /* (fix-G, G-05) they sign in with a code sent by SMS — a mobile number, 8 or 9 first */
  if (!isSgMobile(phone)) return { error: SG_MOBILE_MSG }
  if (phone === ok.phone) return { error: `That’s ${firstName(ok.client)}’s own number — ${firstName(ok.client)} already has their own sign-in` }
  const relationship = cleanRelationship(input.relationship) || null
  const now = new Date()
  const me = await sessionMemberId()
  let [profile] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.phone, phone)).limit(1)
  /* (fix-G, G-06) a number that is already another client's (or someone on another client's household) is that person: say so and ask
     before they also open this home — their own name is the one they keep, never the one typed */
  if (profile && !input.otherClient) {
    const [[own], [theirs]] = await Promise.all([
      db.select({ id: homeownerLeadLinks.id }).from(homeownerLeadLinks).innerJoin(leads, eq(leads.id, homeownerLeadLinks.leadId)).where(and(eq(homeownerLeadLinks.homeownerId, profile.id), isNull(leads.deletedAt))).limit(1),
      db.select({ id: homeownerHouseholdLinks.id }).from(homeownerHouseholdLinks).where(and(eq(homeownerHouseholdLinks.homeownerId, profile.id), isNull(homeownerHouseholdLinks.removedAt))).limit(1),
    ])
    if (own || theirs) return { confirm: 'other-client', name: titleCaseName(profile.name) }
  }
  if (!profile) {
    const pid = randomUUID()
    await db.insert(homeownerProfiles).values({ id: pid, phone, name, email: null, createdAt: now, updatedAt: now })
    ;[profile] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.id, pid)).limit(1)
  }
  const [had] = await db.select().from(homeownerHouseholdLinks).where(and(eq(homeownerHouseholdLinks.leadId, leadId), eq(homeownerHouseholdLinks.homeownerId, profile!.id))).limit(1)
  if (had && !had.removedAt) return { error: `${titleCaseName(profile!.name)} is already on this home — use their row to send the link again` }
  const id = had?.id ?? randomUUID()
  const stamps = { relationship, addedBy: me, createdAt: now, invitedAt: input.invite ? now : null, invitedBy: input.invite ? me : null, openedAt: null, lastOpenedAt: null, withdrawnAt: null, withdrawnBy: null, scheduleSeenAt: null, removedAt: null, removedBy: null }
  /* one taken off earlier comes back as a new start on the same row (the pair is unique) */
  if (had) await db.update(homeownerHouseholdLinks).set(stamps).where(eq(homeownerHouseholdLinks.id, id))
  else await db.insert(homeownerHouseholdLinks).values({ id, leadId, homeownerId: profile!.id, ...stamps })
  const shown = titleCaseName(profile!.name)
  await logLeadEvent(db, leadId, 'household_added', { id, name: shown, title: ok.client, reason: relationship, kind: input.invite ? 'invited' : 'added' })
  touch(leadId)
  return { id, name: shown, slug: await currentPortalSlug() }
}

/** Invite / Resend — their number may open the portal now; a withdrawn person is given access again. */
export async function inviteHouseholdMember(id: string): Promise<Refusal | { again: boolean; slug: string }> {
  const r = await forPerson(id)
  if ('error' in r) return r
  const again = !!r.k.invitedAt && !r.k.withdrawnAt
  /* (fix-G, G-05) a number added before the mobile rule may be a landline: it can never sign in, so it is not sent the link */
  if (!isSgMobile(phoneDigits(r.h.phone))) return { error: `${firstName(titleCaseName(r.h.name))}’s number isn’t a mobile number — they can’t sign in with it. Take them off and add their mobile` }
  /* (fix-G, G-08) the first invite stays; a resend or access given back is its own Activity line (`household_invited`) */
  await db.update(homeownerHouseholdLinks).set({ invitedAt: r.k.invitedAt ?? new Date(), invitedBy: r.k.invitedAt ? r.k.invitedBy : await sessionMemberId(), withdrawnAt: null, withdrawnBy: null }).where(eq(homeownerHouseholdLinks.id, r.k.id))
  await logLeadEvent(db, r.k.leadId, 'household_invited', { id: r.k.id, name: titleCaseName(r.h.name), title: r.client, kind: again ? 'again' : r.k.withdrawnAt ? 'back' : 'first' })
  touch(r.k.leadId)
  return { again, slug: await currentPortalSlug() }
}

/** Withdraw: their number no longer opens this home, and their sessions end at once when it opens nothing else. Answers the event for Undo. */
export async function withdrawHouseholdMember(id: string): Promise<Refusal | { eventId: string }> {
  const r = await forPerson(id)
  if ('error' in r) return r
  if (!r.k.invitedAt || r.k.withdrawnAt) return { error: `${firstName(titleCaseName(r.h.name))} has no access to withdraw` }
  await db.update(homeownerHouseholdLinks).set({ withdrawnAt: new Date(), withdrawnBy: await sessionMemberId() }).where(eq(homeownerHouseholdLinks.id, r.k.id))
  const eventId = await logLeadEvent(db, r.k.leadId, 'household_withdrawn', { id: r.k.id, name: titleCaseName(r.h.name), title: r.client })
  await endSessionsWithout(r.h.id)
  touch(r.k.leadId)
  return { eventId }
}
/** Withdraw's Undo: their access is back as it was, and the withdrawal's line goes. */
export async function undoHouseholdWithdraw(id: string, eventId: string): Promise<Refusal | { ok: true }> {
  const r = await forPerson(id)
  if ('error' in r) return r
  await db.update(homeownerHouseholdLinks).set({ withdrawnAt: null, withdrawnBy: null }).where(eq(homeownerHouseholdLinks.id, r.k.id))
  await dropLeadEvents([String(eventId)])
  touch(r.k.leadId)
  return { ok: true }
}

/** Remove someone never invited, or withdrawn — off the list (soft); their trail stays in Activity. Answers the event for Undo. */
export async function removeHouseholdMember(id: string): Promise<Refusal | { eventId: string }> {
  const r = await forPerson(id)
  if ('error' in r) return r
  if (r.k.invitedAt && !r.k.withdrawnAt) return { error: `Withdraw ${firstName(titleCaseName(r.h.name))}’s access first` }
  await db.update(homeownerHouseholdLinks).set({ removedAt: new Date(), removedBy: await sessionMemberId() }).where(eq(homeownerHouseholdLinks.id, r.k.id))
  const eventId = await logLeadEvent(db, r.k.leadId, 'household_removed', { id: r.k.id, name: titleCaseName(r.h.name), title: r.client })
  touch(r.k.leadId)
  return { eventId }
}
export async function undoHouseholdRemove(id: string, eventId: string): Promise<Refusal | { ok: true }> {
  const r = await householdLink(id)
  if (!r) return { error: 'This person isn’t on the household any more' }
  const ok = await forAccess(r.k.leadId)
  if ('error' in ok) return ok
  await db.update(homeownerHouseholdLinks).set({ removedAt: null, removedBy: null }).where(eq(homeownerHouseholdLinks.id, r.k.id))
  await dropLeadEvents([String(eventId)])
  touch(r.k.leadId)
  return { ok: true }
}
