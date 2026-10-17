import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, asc, desc, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, homeownerProfiles, leadAssignees, leads, members, portalAddresses, projects, settings } from '@/lib/db/schema'
import { worksOn } from '@/lib/projects/policy'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { titleCaseName } from '@/lib/format'
import type { BrandKit } from '@/lib/templates/model'
import { ACCESS_ORDER, DEFAULT_PORTAL, PORTAL_KEY, accessState, cleanSlug, mayRunPortal, parsePortalSettings, slugFromName, type AccessStamps, type AccessState, type PortalSettings } from './model'
import { hiddenOf, type PortalSections, type SectionKey } from './sections'
import { fetchPortalLinks, fetchPortalSections, fetchPortalWelcome } from './sections-queries'
import type { FootLinks } from './links'   // (pending modules S13)
import { fetchHouseholdRows, type HouseholdRow } from './household'
import { aboutIsEmpty } from './about'   // (gaps build H, H-Q20)
import { fetchPlatform, portalClosedByPlatform } from '@/lib/platform'   // (parity map, CP-148)

/*
 * (Projects round 4a) The portal's studio-side reads: its set-up (settings `portal` + the address history), the address a request names,
 * the Clients tab's rows and the look the client pages wear (the brand kit's logo and colour, the studio's short name). Who changes the
 * set-up is `mayRunPortal`; every write is in app/portal/studio-actions.ts.
 */

export async function fetchPortalSettings(): Promise<PortalSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PORTAL_KEY)).limit(1)
  if (!row) return DEFAULT_PORTAL
  try { return parsePortalSettings(JSON.parse(row.value)) } catch { return DEFAULT_PORTAL }
}
export async function savePortalSettings(next: PortalSettings): Promise<void> {
  const value = JSON.stringify(next)
  const updatedAt = new Date()
  await db.insert(settings).values({ key: PORTAL_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
}

/** The current address — made from the studio's name the first time anything needs it (Q-44: a studio never has to think of one). */
export async function currentPortalSlug(): Promise<string> {
  const [cur] = await db.select().from(portalAddresses).where(isNull(portalAddresses.retiredAt)).orderBy(desc(portalAddresses.createdAt)).limit(1)
  if (cur) return cur.slug
  const studio = await fetchStudio()
  let slug = slugFromName(studio.name)
  const taken = new Set((await db.select({ slug: portalAddresses.slug }).from(portalAddresses)).map((a) => a.slug))
  for (let n = 2; taken.has(slug); n++) slug = cleanSlug(`${slugFromName(studio.name)}-${n}`)
  await db.insert(portalAddresses).values({ slug, createdAt: new Date(), createdBy: null, retiredAt: null }).onConflictDoNothing()
  return slug
}

/** What an address in a request is: the current one, an old one (→ redirect to the current), or nothing. */
export async function resolvePortalSlug(slug: string): Promise<{ current: string; old: boolean } | null> {
  const current = await currentPortalSlug()
  /* (fix-F, F-22) an address reads the same in any case ("/my/Demo-Studio" from a phone's auto-capital) — a different spelling redirects to
     the address as it is kept, as an old one does */
  const asKept = slug.toLowerCase()
  if (asKept === current) return { current, old: slug !== current }
  const [row] = await db.select({ slug: portalAddresses.slug }).from(portalAddresses).where(eq(portalAddresses.slug, asKept)).limit(1)
  return row ? { current, old: true } : null
}

/** The look every client page wears (Q-39): the brand kit's logo and accent colour on 2.0's type, the studio's name without "Pte Ltd".
    (Projects round 9) …and what the studio set for every client: the sections switched off (the frame lists no tab of theirs; the gate and
    every request refuse them) and its welcome line (Q-44 — the sign-in page's heading and a line under the studio's name on the home). */
export type PortalLook = { studio: string; logo: string | null; colour: string; phone: string; hidden: SectionKey[]; welcome: string | null
  /** (parity map, CP-148) OpenMaison has closed this studio's portal (Qanvast Ops › Studios, lib/platform.ts): the gate shows every page's
      notice as "closed for now" and every request refuses — the studio's own Paused is a different thing, and both can be on. */
  closed?: boolean
  /** (pending modules S13) The studio's privacy notice, terms and contact page — the links at the foot of every page and the sign-in page,
      each only once set (Company › Client portal). */
  links?: FootLinks }
export async function fetchPortalLook(): Promise<PortalLook> {
  const [brand, sections, welcome, aboutEmpty, closed, links] = await Promise.all([fetchBrand(), fetchPortalSections(), fetchPortalWelcome(), aboutIsEmpty(), portalClosedByPlatform(), fetchPortalLinks()])
  /* (gaps build H, H-Q20) About us is listed only while something is on it — an empty page is withheld as a switched-off section is */
  const hidden = hiddenOf(sections)
  return lookOf(brand.kit, brand.details.name, brand.details.phone, { hidden: aboutEmpty && !hidden.includes('about') ? [...hidden, 'about'] : hidden, welcome, links, ...(closed ? { closed: true } : {}) })
}
const lookOf = (kit: BrandKit, name: string, phone: string, set: Pick<PortalLook, 'hidden' | 'welcome' | 'closed' | 'links'>): PortalLook => ({ studio: shortStudioName(name), logo: kit.logo, colour: kit.colors.accent, phone, ...set })

/* ── Company › Client portal ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type PortalClientRow = {
  leadId: string
  projectId: string | null
  client: string
  phone: string
  /** "HDB 5-Room · SkyOasis @ Dawson" — board 9's second line. */
  home: string
  state: AccessState
  stamps: AccessStamps | null
  /** Whether the viewer may invite / resend / withdraw this one (the panel's rule — whoever works on the lead). */
  mayAct: boolean
}

/** "SkyOasis @ Dawson" — the part of an address a person says. */
export const placeOf = (address: string | null | undefined) => (address ?? '').split(',')[0]?.trim() ?? ''

/**
 * (Q-46) Everyone with access, invited or not: every live project's client, and every lead the studio has invited (or withdrawn) —
 * the leads the viewer may see (Who sees leads). Opened first (most recent), then invited, not invited, withdrawn.
 */
export async function fetchPortalClients(): Promise<PortalClientRow[]> {
  const viewer = await fetchViewer()
  const [visible, links, projectRows] = await Promise.all([
    visibleLeadIds(viewer),
    db.select({ k: homeownerLeadLinks, l: leads }).from(homeownerLeadLinks).innerJoin(leads, eq(leads.id, homeownerLeadLinks.leadId)).where(isNull(leads.deletedAt)),
    db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))),
  ])
  const byLead = new Map<string, { l: typeof leads.$inferSelect; k: typeof homeownerLeadLinks.$inferSelect | null; projectId: string | null }>()
  for (const r of projectRows) byLead.set(r.l.id, { l: r.l, k: null, projectId: r.p.id })
  for (const r of links) {
    const had = byLead.get(r.l.id)
    if (!r.k.invitedAt && !r.k.withdrawnAt && !had) continue   // a link the questionnaire's ask made, never an invite: not a client of the portal yet
    byLead.set(r.l.id, { l: r.l, k: r.k, projectId: had?.projectId ?? null })
  }
  const ids = [...byLead.keys()].filter((id) => !visible || visible.has(id))
  const team = ids.length ? await db.select().from(leadAssignees).where(inArray(leadAssignees.leadId, ids)) : []
  const rows: PortalClientRow[] = ids.map((id) => {
    const { l, k, projectId } = byLead.get(id)!
    const stamps = k ? stampsOf(k) : null
    return {
      leadId: id, projectId, client: titleCaseName(l.name), phone: l.phone,
      home: [l.propertyType, placeOf(l.propertyAddress ?? l.leadAddress)].filter(Boolean).join(' · '),
      state: accessState(stamps), stamps,
      mayAct: worksOn(viewer, team.filter((a) => a.leadId === id).map((a) => a.memberId)),
    }
  })
  return rows.sort((a, b) => ACCESS_ORDER[a.state] - ACCESS_ORDER[b.state] || (b.stamps?.lastOpenedAt ?? b.stamps?.invitedAt ?? 0) - (a.stamps?.lastOpenedAt ?? a.stamps?.invitedAt ?? 0) || a.client.localeCompare(b.client))
}

export const stampsOf = (k: Pick<typeof homeownerLeadLinks.$inferSelect, 'invitedAt' | 'openedAt' | 'lastOpenedAt' | 'withdrawnAt'>): AccessStamps => ({
  invitedAt: k.invitedAt?.getTime() ?? null, openedAt: k.openedAt?.getTime() ?? null, lastOpenedAt: k.lastOpenedAt?.getTime() ?? null, withdrawnAt: k.withdrawnAt?.getTime() ?? null,
})

/** Company › Client portal › Set-up: the address and its history, Live / Paused, the checklist's facts, who a test opens as. */
export type PortalSetup = {
  slug: string
  oldSlugs: { slug: string; retiredAt: number }[]
  settings: PortalSettings
  pausedByName: string | null
  look: PortalLook
  /** Getting it live's facts: a logo and colour in the brand kit; the issuing entity's bank and PayNow (Company › Profile). */
  brandReady: boolean
  pay: { entity: string; bank: boolean; payNow: boolean }
  /** Who "See it as {client}" and "What a client sees" open with (fix-G, G-18): the first project client invited, else the first invited,
      else the first project's client — among those the viewer may look as; a real record, read-only (Q-44). */
  sample: { leadId: string; client: string; project: boolean } | null
  clients: PortalClientRow[]
  mayRun: boolean
  now: number
  /** (Projects round 9) What clients can see (the six switches) and the welcome line as saved (null = the sign-in page's own heading). */
  sections: PortalSections
  welcome: string | null
  /** (Projects round 9, Q-42) Someone else from each client's household, by the client's lead — the Clients tab lists them under their client. */
  household: Record<string, HouseholdRow[]>
  /** (parity map, CP-148) OpenMaison has closed the portal — when (the studio is told "Closed by OpenMaison", never who) — or null. */
  closedByPlatform: { at: number | null } | null
  /** (pending modules S13) The links at the foot of every portal page, as saved. */
  links: FootLinks
}
export async function fetchPortalSetup(): Promise<PortalSetup> {
  const [slug, s, brand, clients, viewer, sections, welcome, platform, links] = await Promise.all([currentPortalSlug(), fetchPortalSettings(), fetchBrand(), fetchPortalClients(), fetchViewer(), fetchPortalSections(), fetchPortalWelcome(), fetchPlatform(), fetchPortalLinks()])
  const household = await fetchHouseholdRows(clients.map((c) => c.leadId))
  const [old, pausedBy] = await Promise.all([
    db.select().from(portalAddresses).where(ne(portalAddresses.slug, slug)).orderBy(desc(portalAddresses.retiredAt)),
    s.pausedBy ? db.select({ name: members.name }).from(members).where(eq(members.id, s.pausedBy)).limit(1) : Promise.resolve([] as { name: string }[]),
  ])
  const entity = brand.details.entities[0]
  /* (fix-G, G-18 · G-01) one stable sample, and one the viewer may look as (the Client access panel's rule — whoever works on the client):
     the first project client invited, else the first invited, else the first project's client — never "whoever opened last" */
  const live = clients.filter((c) => c.state !== 'withdrawn' && c.mayAct)
  const byInvite = (a: PortalClientRow, b: PortalClientRow) => (a.stamps?.invitedAt ?? Infinity) - (b.stamps?.invitedAt ?? Infinity) || a.client.localeCompare(b.client)
  const invited = live.filter((c) => c.stamps?.invitedAt).sort(byInvite)
  const pick = invited.find((c) => c.projectId) ?? invited[0] ?? live.filter((c) => c.projectId).sort(byInvite)[0] ?? live[0] ?? null
  return {
    slug,
    oldSlugs: old.map((a) => ({ slug: a.slug, retiredAt: (a.retiredAt ?? a.createdAt).getTime() })),
    settings: s,
    pausedByName: pausedBy[0]?.name ?? null,
    look: lookOf(brand.kit, brand.details.name, brand.details.phone, { hidden: hiddenOf(sections), welcome, links, ...(platform.portalOff ? { closed: true } : {}) }),
    brandReady: !!brand.kit.logo && !!brand.kit.colors.accent,
    pay: { entity: entity?.name ?? brand.details.name, bank: !!(entity?.bankName && entity.accountNo), payNow: !!entity?.payNow },
    sample: pick ? { leadId: pick.leadId, client: pick.client, project: !!pick.projectId } : null,
    clients,
    mayRun: mayRunPortal(viewer.role),
    now: Date.now(),
    sections, welcome, household,
    closedByPlatform: platform.portalOff ? { at: platform.portalOffAt } : null,   // (parity map, CP-148)
    links,   // (pending modules S13)
  }
}

/** A homeowner by phone, with their links (the leads that number may open). */
export async function homeownerByPhone(phone: string) {
  const [h] = await db.select().from(homeownerProfiles).where(eq(homeownerProfiles.phone, phone)).limit(1)
  return h ?? null
}

/** The links a homeowner opens: invited and not withdrawn, on a live lead — oldest first. */
export async function openLinksOf(homeownerId: string) {
  return db.select({ k: homeownerLeadLinks, l: leads }).from(homeownerLeadLinks).innerJoin(leads, eq(leads.id, homeownerLeadLinks.leadId))
    .where(and(eq(homeownerLeadLinks.homeownerId, homeownerId), isNull(homeownerLeadLinks.withdrawnAt), isNull(leads.deletedAt)))
    .orderBy(asc(homeownerLeadLinks.createdAt))
    .then((rows) => rows.filter((r) => !!r.k.invitedAt))
}
