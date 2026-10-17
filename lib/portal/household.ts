import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerHouseholdLinks, homeownerLeadLinks, homeownerProfiles, leads, members } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { givenName, type AccessStamps } from './model'

/*
 * (Projects round 9 — Q-42; the Client Portal Proposal, board 8 "Add someone else from the household") Someone else from the client's
 * household: their own number and sign-in on the same lead — so on its project too, since the link names the lead (1.0's M-236 lost a
 * lead-stage family member at Won) — with their own invited / opened / last opened state. They see what the client sees; what they do is
 * recorded under their own name (a session is theirs, `PortalVisitor.name`). The lead's own link stays the primary client's.
 * The writes are app/portal/household-actions.ts; the session reads `householdVisitorLinks` (lib/portal/session.ts `linksOf`).
 */

export type HouseholdRow = {
  id: string
  leadId: string
  homeownerId: string
  name: string
  first: string
  phone: string
  relationship: string | null
  stamps: AccessStamps
  invitedBy: string | null
  withdrawnBy: string | null
  createdAt: number
}

/** "Wife" — what the studio typed, cut to a short phrase; empty is none. */
export const RELATIONSHIP_MAX = 40

/** Each client's household, by lead — not the removed ones; oldest first. */
export async function fetchHouseholdRows(leadIds: string[]): Promise<Record<string, HouseholdRow[]>> {
  const out: Record<string, HouseholdRow[]> = {}
  if (!leadIds.length) return out
  const rows = await db.select({ k: homeownerHouseholdLinks, h: homeownerProfiles }).from(homeownerHouseholdLinks)
    .innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerHouseholdLinks.homeownerId))
    .where(and(inArray(homeownerHouseholdLinks.leadId, leadIds), isNull(homeownerHouseholdLinks.removedAt))).orderBy(asc(homeownerHouseholdLinks.createdAt))
  const ids = [...new Set(rows.flatMap((r) => [r.k.invitedBy, r.k.withdrawnBy]).filter((x): x is string => !!x))]
  const names = ids.length ? new Map((await db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, ids))).map((m) => [m.id, m.name])) : new Map<string, string>()
  /* (REG-1054) each one's given name, the family name they share with the client left off */
  const clients = new Map((await db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, leadIds))).map((l) => [l.id, l.name]))
  for (const { k, h } of rows) {
    const name = titleCaseName(h.name)
    ;(out[k.leadId] ??= []).push({
      id: k.id, leadId: k.leadId, homeownerId: h.id, name, first: givenName(name, clients.get(k.leadId)), phone: h.phone, relationship: k.relationship,
      stamps: { invitedAt: k.invitedAt?.getTime() ?? null, openedAt: k.openedAt?.getTime() ?? null, lastOpenedAt: k.lastOpenedAt?.getTime() ?? null, withdrawnAt: k.withdrawnAt?.getTime() ?? null },
      invitedBy: k.invitedBy ? names.get(k.invitedBy) ?? null : null, withdrawnBy: k.withdrawnBy ? names.get(k.withdrawnBy) ?? null : null,
      createdAt: k.createdAt.getTime(),
    })
  }
  return out
}

/** The household links a number opens — invited, not withdrawn, not removed, on a live lead (a studio preview also opens one not invited yet). */
export async function householdVisitorLinks(homeownerId: string, preview: boolean) {
  const rows = await db.select({ k: homeownerHouseholdLinks }).from(homeownerHouseholdLinks).innerJoin(leads, eq(leads.id, homeownerHouseholdLinks.leadId))
    .where(and(eq(homeownerHouseholdLinks.homeownerId, homeownerId), isNull(homeownerHouseholdLinks.withdrawnAt), isNull(homeownerHouseholdLinks.removedAt), isNull(leads.deletedAt)))
  return rows.filter((r) => preview || !!r.k.invitedAt).map((r) => ({
    linkId: r.k.id, leadId: r.k.leadId, openedAt: r.k.openedAt?.getTime() ?? null, lastOpenedAt: r.k.lastOpenedAt?.getTime() ?? null,
    household: true as const, createdAt: r.k.createdAt.getTime(), invitedAt: r.k.invitedAt?.getTime() ?? null,   // (fix-F, F-16) their bell starts here
  }))
}

/** One household row with its lead's client — the actions' read. */
export async function householdLink(id: string) {
  const [r] = await db.select({ k: homeownerHouseholdLinks, h: homeownerProfiles }).from(homeownerHouseholdLinks)
    .innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerHouseholdLinks.homeownerId)).where(eq(homeownerHouseholdLinks.id, String(id))).limit(1)
  return r ?? null
}

/* ── Round 4b's "what changed since you last looked", per person ───────────────────────────────────────────────────────────── */

/** When each of these links (the client's own or a household one) last looked at the Schedule tab. */
export async function scheduleSeenOf(linkIds: string[]): Promise<{ id: string; seenAt: Date | null }[]> {
  if (!linkIds.length) return []
  const [own, hh] = await Promise.all([
    db.select({ id: homeownerLeadLinks.id, seenAt: homeownerLeadLinks.scheduleSeenAt }).from(homeownerLeadLinks).where(inArray(homeownerLeadLinks.id, linkIds)),
    db.select({ id: homeownerHouseholdLinks.id, seenAt: homeownerHouseholdLinks.scheduleSeenAt }).from(homeownerHouseholdLinks).where(inArray(homeownerHouseholdLinks.id, linkIds)),
  ])
  return [...own, ...hh]
}
/** A household person's look at the Schedule tab — the client's own link is stamped by round 4b's `markScheduleSeen`. */
export async function markHouseholdScheduleSeen(linkIds: string[]): Promise<void> {
  if (linkIds.length) await db.update(homeownerHouseholdLinks).set({ scheduleSeenAt: new Date() }).where(inArray(homeownerHouseholdLinks.id, linkIds))
}

/* ── (fix-F, F-03 · F-04 · C-07) Who did something on the portal, by name ─────────────────────────────────────────────────────── */

/** Each lead's people on the portal — its own client and everyone ever on its household — by their given name (REG-1054: the family name they
    share with the client left off). `primary` is the client's own homeowner: an older record that names nobody was theirs. */
export type PortalPeople = { primary: string | null; given: Map<string, string> }
export async function portalPeopleOf(leadIds: string[]): Promise<Map<string, PortalPeople>> {
  const out = new Map<string, PortalPeople>()
  if (!leadIds.length) return out
  const [own, hh, ls] = await Promise.all([
    db.select({ leadId: homeownerLeadLinks.leadId, id: homeownerProfiles.id, name: homeownerProfiles.name }).from(homeownerLeadLinks)
      .innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerLeadLinks.homeownerId)).where(inArray(homeownerLeadLinks.leadId, leadIds)),
    db.select({ leadId: homeownerHouseholdLinks.leadId, id: homeownerProfiles.id, name: homeownerProfiles.name }).from(homeownerHouseholdLinks)
      .innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerHouseholdLinks.homeownerId)).where(inArray(homeownerHouseholdLinks.leadId, leadIds)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, leadIds)),
  ])
  for (const id of leadIds) out.set(id, { primary: own.find((o) => o.leadId === id)?.id ?? null, given: new Map() })
  const client = new Map(ls.map((l) => [l.id, l.name]))
  for (const r of [...own, ...hh]) out.get(r.leadId)?.given.set(r.id, givenName(titleCaseName(r.name), client.get(r.leadId)))
  return out
}
/** The person behind a portal record, as a page reads it to someone: "You" when it is the reader, else their given name. */
export function portalWho(people: PortalPeople | undefined, homeownerId: string | null | undefined, readerId: string | null | undefined): { mine: boolean; name: string | null } {
  const id = homeownerId ?? people?.primary ?? null
  return { mine: !!id && !!readerId && id === readerId, name: id ? people?.given.get(id) ?? null : null }
}
