import 'server-only'
import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerHouseholdLinks, homeownerLeadLinks, homeownerProfiles, leadAssignees, leads, members, portalPreviews, portalSessions, projects } from '@/lib/db/schema'
import { logLeadEvent } from '@/lib/leads/events'
import { notify } from '@/lib/notifications/emit'
import { titleCaseName } from '@/lib/format'
import { PORTAL_COOKIE, PREVIEW_MINUTES, SESSION_DAYS, SIGNED_OUT, firstName, portalPath, previewCookie, previewSlug, splitPortalSlug } from './model'
import { fetchPortalLook, fetchPortalSettings, resolvePortalSlug, type PortalLook } from './queries'
import { householdLink, householdVisitorLinks } from './household'
import { sectionClosed, sectionOfPath, type SectionKey } from './sections'
import { COOKIE_SECURE } from '@/lib/auth/paths'   // (pending modules S34)

/*
 * (Projects round 4a, Q-38 · Q-50) Who is on a portal page, and whether they may be. A client signs in with their phone and a one-time
 * code (the prototype shows the code step and takes any six digits — the developers wire the SMS) and gets a session row whose id rides
 * in an httpOnly cookie scoped to /my. A studio member's look ("See it as the client", "Open as a test client") is a `preview` session on
 * the same client: the real pages, read-only, and nothing it opens stamps the client's links.
 *
 * `portalGate` is the one check every portal page and every portal action makes: the address (an old one redirects), Live / Paused (a pause
 * refuses every client page and request — a preview still opens, so the studio can try it before going live), the session.
 */

export type VisitorLink = { linkId: string; leadId: string; openedAt: number | null; lastOpenedAt: number | null
  /** (Projects round 9, Q-42) a household link (`homeowner_household_links`) — someone else from the client's household, on the same lead */
  household?: boolean
  /** (fix-F, F-16) a household link's invite — what happened before it is not news to them (their bell starts here) */
  invitedAt?: number | null }
export type PortalVisitor = {
  sessionId: string
  homeownerId: string
  name: string
  phone: string
  preview: boolean
  memberId: string | null
  memberName: string | null
  links: VisitorLink[]
  /** (fix-G, G-17) Company › Client portal's phone frame: what a client sees exactly — no studio strip, the paused notice while paused. */
  frame?: boolean
  /** (fix-G, G-01) a preview by a member who may not see the project's money: Money is withheld as a section switched off is. */
  noMoney?: boolean
  /** (fix-G, G-43) where Close preview returns the studio member — the client's project, else their lead. */
  back?: string | null
}

export type Gate =
  | { kind: 'missing' }
  | { kind: 'redirect'; to: string }
  | { kind: 'paused'; slug: string; look: PortalLook }
  | { kind: 'out'; slug: string; look: PortalLook }
  | { kind: 'in'; slug: string; look: PortalLook; visitor: PortalVisitor; paused: boolean }

/** The visitor's links: invited and not withdrawn on a live lead (a preview also opens a client not invited yet).
    (Projects round 9) …and the homes they open as someone from a client's household — one home once, the client's own link first. */
export async function linksOf(homeownerId: string, preview: boolean): Promise<VisitorLink[]> {
  const [rows, household] = await Promise.all([
    db.select({ k: homeownerLeadLinks }).from(homeownerLeadLinks).innerJoin(leads, eq(leads.id, homeownerLeadLinks.leadId))
      .where(and(eq(homeownerLeadLinks.homeownerId, homeownerId), isNull(homeownerLeadLinks.withdrawnAt), isNull(leads.deletedAt))),
    householdVisitorLinks(homeownerId, preview),
  ])
  const own = rows.filter((r) => preview || !!r.k.invitedAt)
    .map((r) => ({ linkId: r.k.id, leadId: r.k.leadId, openedAt: r.k.openedAt?.getTime() ?? null, lastOpenedAt: r.k.lastOpenedAt?.getTime() ?? null, createdAt: r.k.createdAt.getTime() }))
  const all = [...own, ...household.filter((h) => !own.some((o) => o.leadId === h.leadId))].sort((a, b) => a.createdAt - b.createdAt)
  return all.map(({ createdAt: _c, ...l }) => l)
}

/** The session the cookie names, while it lasts and still opens something — a client's own sign-in. (fix-G, G-03) A studio's preview is
    never read from this shared cookie any more: it rides in its own address (`readPreview`), so an older preview cookie opens nothing here. */
export async function readVisitor(preview: string | null = null): Promise<PortalVisitor | null> {
  if (preview !== null) return readPreview(preview)
  const id = (await cookies()).get(PORTAL_COOKIE)?.value
  if (!id) return null
  const [s] = await db.select().from(portalSessions).where(and(eq(portalSessions.id, id), isNull(portalSessions.endedAt))).limit(1)
  if (!s || s.kind !== 'client' || s.expiresAt.getTime() <= Date.now()) return null
  const [h] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.id, s.homeownerId)).limit(1)
  if (!h) return null
  const links = await linksOf(h.id, false)
  if (!links.length) return null   // every link withdrawn: the door is shut
  return { sessionId: s.id, homeownerId: h.id, name: titleCaseName(h.name), phone: h.phone, preview: false, memberId: null, memberName: null, links }
}

/**
 * (fix-G, G-03 · G-33) A studio member's preview, named by its address and its own cookie: the client (or the household person) as their
 * records stand — built here, never written (a lead never invited has no profile or link, and a preview makes none). One home: the one the
 * preview was opened for.
 */
async function readPreview(id: string): Promise<PortalVisitor | null> {
  if (!id || (await cookies()).get(previewCookie(id))?.value !== id) return null
  const [p] = await db.select().from(portalPreviews).where(and(eq(portalPreviews.id, id), isNull(portalPreviews.endedAt))).limit(1)
  if (!p || p.expiresAt.getTime() <= Date.now()) return null
  const [[l], [link], [m], [proj]] = await Promise.all([
    db.select({ name: leads.name, phone: leads.phone }).from(leads).where(and(eq(leads.id, p.leadId), isNull(leads.deletedAt))).limit(1),
    db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, p.leadId)).limit(1),
    db.select({ name: members.name }).from(members).where(eq(members.id, p.memberId)).limit(1),
    db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, p.leadId), isNull(projects.deletedAt))).limit(1),
  ])
  if (!l) return null
  const person = p.personId ? await householdLink(p.personId) : null
  if (p.personId && (!person || person.k.removedAt || person.k.leadId !== p.leadId)) return null
  const links: VisitorLink[] = person
    ? [{ linkId: person.k.id, leadId: p.leadId, openedAt: person.k.openedAt?.getTime() ?? null, lastOpenedAt: person.k.lastOpenedAt?.getTime() ?? null, household: true }]
    : [{ linkId: link?.id ?? `lead-${p.leadId}`, leadId: p.leadId, openedAt: link?.openedAt?.getTime() ?? null, lastOpenedAt: link?.lastOpenedAt?.getTime() ?? null }]
  return {
    sessionId: p.id, homeownerId: person?.h.id ?? link?.homeownerId ?? '', name: titleCaseName(person?.h.name ?? l.name), phone: person?.h.phone ?? l.phone,
    preview: true, memberId: p.memberId, memberName: m?.name ?? null, links, frame: p.frame, noMoney: !p.money,
    back: proj ? `/projects/${proj.id}` : `/leads/${p.leadId}`,
  }
}
/** Where an ended preview's address leads: back to the studio's page for that client (the preview's record names it), else the portal. */
async function previewGone(id: string): Promise<string | null> {
  if (!id) return null
  const [p] = await db.select({ leadId: portalPreviews.leadId }).from(portalPreviews).where(eq(portalPreviews.id, id)).limit(1)
  if (!p) return null
  const [proj] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, p.leadId), isNull(projects.deletedAt))).limit(1)
  return proj ? `/projects/${proj.id}` : `/leads/${p.leadId}`
}

export async function portalGate(raw: string, sub = ''): Promise<Gate> {
  const { slug, preview } = splitPortalSlug(raw)
  const where = await resolvePortalSlug(slug)
  if (!where) return { kind: 'missing' }
  if (where.old) return { kind: 'redirect', to: portalPath(preview ? previewSlug(where.current, preview) : where.current, sub) }
  const [look0, s, visitor] = await Promise.all([fetchPortalLook(), fetchPortalSettings(), readVisitor(preview)])
  /* (fix-G, G-03 · G-43) a preview that has ended (closed, or past its hour) goes back to the studio's page for that client, never to the
     client's sign-in */
  if (preview !== null && !visitor) return { kind: 'redirect', to: (await previewGone(preview)) ?? portalPath(slug) }
  /* (fix-G, G-01) a member who may not see the project's money previews it with Money withheld, as a switched-off section is everywhere */
  const look = visitor?.noMoney && !look0.hidden.includes('money') ? { ...look0, hidden: [...look0.hidden, 'money' as const] } : look0
  /* (Projects round 9, Q-45) a page of a section the studio switched off is gone: it leads to the home — the money page round 6 adds too */
  const section = sectionOfPath(sub)
  if (visitor && section && look.hidden.includes(section) && (visitor.preview || !s.paused)) return { kind: 'redirect', to: portalPath(raw) }
  /* (parity map, CP-148) OpenMaison closed the portal (Qanvast Ops › Studios): every page is the notice, "closed for now" (`look.closed`), as a
     pause is — the studio's own Paused and this one read the same to the gate; a studio member's look-as still opens, told so in its strip */
  const stopped = s.paused || !!look.closed
  /* (fix-G, G-17) the set-up page's frame shows exactly what a client sees — the paused notice while paused */
  if (visitor?.preview && visitor.frame && stopped) return { kind: 'paused', slug: raw, look }
  if (visitor?.preview) return { kind: 'in', slug: raw, look, visitor, paused: stopped }
  if (stopped) return { kind: 'paused', slug, look }
  return visitor ? { kind: 'in', slug, look, visitor, paused: false } : { kind: 'out', slug, look }
}

/** A portal REQUEST's check (every action): live, signed in — and, for a write, not a preview. Answers the refusal's words or the visitor.
    (Projects round 9, Q-45) `section` names the part of the portal the request belongs to: one the studio switched off is refused. */
export async function portalActor(slug: string, o: { write: boolean; section?: SectionKey }): Promise<{ error: string } | { visitor: PortalVisitor; look: PortalLook }> {
  const gate = await portalGate(slug)
  if (gate.kind === 'missing' || gate.kind === 'redirect') return { error: 'This address doesn’t open a portal' }
  if (gate.kind === 'paused') return { error: gate.look.closed ? `This page is closed for now — contact ${gate.look.studio}` : `${gate.look.studio}’s portal is paused` }   // (parity map, CP-148)
  if (gate.kind === 'out') return { error: SIGNED_OUT }   // (fix-F, F-19) the page offers Sign in on this one
  if (o.section && gate.look.hidden.includes(o.section)) return { error: sectionClosed(o.section, gate.look.studio) }
  if (o.write && gate.visitor.preview) return { error: 'This is a preview — nothing here is saved as the client’s' }
  return { visitor: gate.visitor, look: gate.look }
}

async function setCookie(id: string, expires: Date): Promise<void> {
  (await cookies()).set(PORTAL_COOKIE, id, { httpOnly: true, sameSite: 'lax', path: '/my', expires, secure: COOKIE_SECURE })   // (pending modules S34) Secure on HTTPS
}

/** Signed in: a client session for 30 days on this device. */
export async function startClientSession(homeownerId: string): Promise<void> {
  const id = randomUUID()
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000)
  await db.insert(portalSessions).values({ id, homeownerId, kind: 'client', memberId: null, createdAt: now, expiresAt: expires, lastSeenAt: now, endedAt: null })
  await setCookie(id, expires)
}

/**
 * A studio member's read-only look at a client's portal, for an hour (fix-G, G-03 · G-17 · G-33): its own record and its own cookie, named
 * by an id that rides in the address it opens (`previewSlug`). A live one for the same member, client, person and kind is reused (the set-up
 * page's frame loads on every visit — one record, not one per view). Writes no client record. Route handlers and actions only (it sets the
 * cookie). Answers the preview's id.
 */
export async function startPreview(o: { leadId: string; personId: string | null; memberId: string; frame: boolean; money: boolean }): Promise<string> {
  const now = new Date()
  const [live] = await db.select().from(portalPreviews).where(and(
    eq(portalPreviews.leadId, o.leadId), eq(portalPreviews.memberId, o.memberId), eq(portalPreviews.frame, o.frame), eq(portalPreviews.money, o.money),
    o.personId ? eq(portalPreviews.personId, o.personId) : isNull(portalPreviews.personId), isNull(portalPreviews.endedAt), gt(portalPreviews.expiresAt, new Date(now.getTime() + 10 * 60_000)),
  )).orderBy(desc(portalPreviews.expiresAt)).limit(1)
  const id = live?.id ?? randomUUID().replace(/-/g, '').slice(0, 20)
  const expires = live?.expiresAt ?? new Date(now.getTime() + PREVIEW_MINUTES * 60_000)
  if (!live) await db.insert(portalPreviews).values({ id, leadId: o.leadId, personId: o.personId, memberId: o.memberId, frame: o.frame, money: o.money, createdAt: now, expiresAt: expires, endedAt: null })
  ;(await cookies()).set(previewCookie(id), id, { httpOnly: true, sameSite: 'lax', path: '/my', expires, secure: COOKIE_SECURE })
  return id
}

/** Sign out (or close a preview): the row ends and the cookie goes. Answers where a closed preview returns the member (fix-G, G-43). */
export async function endSession(raw = ''): Promise<string | null> {
  const jar = await cookies()
  const { preview } = splitPortalSlug(raw)
  if (preview) {
    const back = await previewGone(preview)
    await db.update(portalPreviews).set({ endedAt: new Date() }).where(eq(portalPreviews.id, preview))
    jar.delete({ name: previewCookie(preview), path: '/my' })
    return back
  }
  const id = jar.get(PORTAL_COOKIE)?.value
  if (id) await db.update(portalSessions).set({ endedAt: new Date() }).where(eq(portalSessions.id, id))
  jar.delete({ name: PORTAL_COOKIE, path: '/my' })
  return null
}

/** Withdrawn: every client session on this number that no longer opens anything ends at once. */
export async function endSessionsWithout(homeownerId: string): Promise<void> {
  const still = await linksOf(homeownerId, false)
  if (still.length) return
  await db.update(portalSessions).set({ endedAt: new Date() }).where(and(eq(portalSessions.homeownerId, homeownerId), eq(portalSessions.kind, 'client'), isNull(portalSessions.endedAt)))
}

const TOUCH_MS = 10 * 60_000
/**
 * The client opened their portal: each home's link records it — the first time with an event (the lead's Activity) and a bell row for the
 * team; after that "last opened", at most every ten minutes. A preview never comes here.
 */
export async function stampOpened(visitor: PortalVisitor): Promise<void> {
  if (visitor.preview) return
  /* (Projects round 9) someone from the household keeps their own stamps, on their own link */
  const theirs = visitor.links.filter((l) => l.household)
  if (theirs.length) await stampHouseholdOpened(visitor, theirs)
  const now = new Date()
  const first = visitor.links.filter((l) => !l.household && !l.openedAt)
  const stale = visitor.links.filter((l) => !l.household && l.openedAt && (!l.lastOpenedAt || now.getTime() - l.lastOpenedAt > TOUCH_MS))
  if (stale.length) await db.update(homeownerLeadLinks).set({ lastOpenedAt: now }).where(inArray(homeownerLeadLinks.id, stale.map((l) => l.linkId)))
  for (const l of first) {
    const r = await db.update(homeownerLeadLinks).set({ openedAt: now, lastOpenedAt: now }).where(and(eq(homeownerLeadLinks.id, l.linkId), isNull(homeownerLeadLinks.openedAt)))
    if (!r.rowsAffected) continue   // another request (a prefetched tab) stamped it first — one first-open line, one bell row
    await logLeadEvent(db, l.leadId, 'portal_opened', { name: visitor.name }, null)
    const [team, [p]] = await Promise.all([
      db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.leadId)),
      db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, l.leadId), isNull(projects.deletedAt))).limit(1),
    ])
    await notify('portal_opened', team.map((t) => t.id), { title: `${visitor.name} opened their portal for the first time`, body: 'They can see what needs them, their files and the steps ahead.', href: p ? `/projects/${p.id}` : `/leads/${l.leadId}`, leadId: l.leadId, actorId: null })
  }
}

/** (Projects round 9, Q-42) A household person's own stamps: their first open is their own Activity line ("Mei Ling Han, from Benjamin Han's
    household, opened the portal for the first time") and a bell row for the team; after that "last opened", at most every ten minutes. */
async function stampHouseholdOpened(visitor: PortalVisitor, links: VisitorLink[]): Promise<void> {
  const now = new Date()
  const stale = links.filter((l) => l.openedAt && (!l.lastOpenedAt || now.getTime() - l.lastOpenedAt > TOUCH_MS))
  if (stale.length) await db.update(homeownerHouseholdLinks).set({ lastOpenedAt: now }).where(inArray(homeownerHouseholdLinks.id, stale.map((l) => l.linkId)))
  for (const l of links.filter((x) => !x.openedAt)) {
    const r = await db.update(homeownerHouseholdLinks).set({ openedAt: now, lastOpenedAt: now }).where(and(eq(homeownerHouseholdLinks.id, l.linkId), isNull(homeownerHouseholdLinks.openedAt)))
    if (!r.rowsAffected) continue
    const [[lead], team, [p]] = await Promise.all([
      db.select({ name: leads.name }).from(leads).where(eq(leads.id, l.leadId)).limit(1),
      db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.leadId)),
      db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, l.leadId), isNull(projects.deletedAt))).limit(1),
    ])
    const client = lead ? titleCaseName(lead.name) : 'the client'
    await logLeadEvent(db, l.leadId, 'household_opened', { name: visitor.name, id: l.linkId, title: client }, null)
    await notify('portal_opened', team.map((t) => t.id), { title: `${visitor.name} opened ${client}’s portal for the first time`, body: `From ${client}’s household — they see what ${firstName(client)} sees.`, href: p ? `/projects/${p.id}` : `/leads/${l.leadId}`, leadId: l.leadId, actorId: null })
  }
}
