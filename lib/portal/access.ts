import 'server-only'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, homeownerProfiles, leadAssignees, leadEvents, leads, members, projects, stageLogs } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { worksOn } from '@/lib/projects/policy'
import { seesLeadMoney } from '@/lib/projects/money-visibility'
import { titleCaseName } from '@/lib/format'
import { accessChip, firstName, type AccessStamps, type NeedItem } from './model'
import { accessSectionsOf, needsOf, type AccessSection } from './needs'
import { loadHomeFacts } from './home'
import { currentPortalSlug, fetchPortalLook, fetchPortalSettings, stampsOf } from './queries'
import { fetchHouseholdRows, type HouseholdRow } from './household'
import { NEED_SECTION, SECTION_OFF_STATE, isSectionKey } from './sections'
import { floorPlanAccessOf } from '@/lib/projects/floor-plan'   // (gaps build G)

/*
 * (Projects round 4a, board 8) The studio's Client access panel for one lead (and so its project): who can open it and the state of that
 * access, what the client can see (counted from what exists), what is waiting on them — the portal's own What needs you, read for the
 * studio — and whether the viewer may invite, resend, withdraw and look as the client. Read through `readClientAccess`.
 */
export type ClientAccessData = {
  leadId: string
  projectId: string | null
  /** `phone` = the number that signs in (the portal profile's, fix-G G-02) — the lead's own until the client has one. */
  client: { name: string; first: string; phone: string }
  stamps: AccessStamps | null
  chip: { label: string; tone: 'green' | 'yellow' | 'default' | 'red'; state: 'none' | 'invited' | 'opened' | 'withdrawn' }
  invitedBy: string | null
  withdrawnBy: string | null
  /** (fix-G, G-08) the latest time the link was sent again after the first invite, and by whom — the first invite stays as it was. */
  resent: { at: number; by: string | null } | null
  slug: string
  /** The studio's name as the portal wears it — the WhatsApp drafts' sender. */
  studio: string
  paused: boolean
  /** (parity map, CP-148) OpenMaison closed the portal (Qanvast Ops › Studios) — the client opens a notice; only OpenMaison opens it again */
  closed?: boolean
  sections: AccessSection[]
  waiting: NeedItem[]
  mayAct: boolean
  now: number
  /** (Projects round 9, Q-42) Someone else from the client's household — each with their own access. */
  household: (HouseholdRow & { chip: ReturnType<typeof accessChip>; resent: { at: number; by: string | null } | null })[]
  /** (Projects round 9, Q-45) The sections switched off in Company › Client portal — their rows say so and lead there. */
  sectionsOff: string[]
  /** (Projects round 9, Q-41) When the team last reminded the client of a waiting item, by its key. */
  reminded: Record<string, number>
  /** (pending modules S05 — testers' L-4) The lead's second client (a co-owner) with a mobile, not on the household yet — offered as someone
      from the household in one press. */
  coOwner?: { name: string; phone: string } | null
}

/** (fix-G, G-01) Whether this viewer sees the project's money on this lead — the money rule (F-17) every surface asks: package D's
    `seesLeadMoney` (lib/projects/money-visibility.ts). The Client access panel and the portal preview ask it through this one function. */
export async function portalSeesMoney(leadId: string, viewer?: Viewer): Promise<boolean> {
  return seesLeadMoney(leadId, viewer)
}

/** null when the lead is not one the viewer may open (it answers as not found). */
export async function fetchClientAccess(leadId: string): Promise<ClientAccessData | null> {
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return null
  const [l] = await db.select().from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  if (!l) return null
  const [[link], [p], team, slug, s, look, household, reminders, sends, [quoteStep], money] = await Promise.all([
    db.select({ k: homeownerLeadLinks, phone: homeownerProfiles.phone }).from(homeownerLeadLinks).innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerLeadLinks.homeownerId)).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1),
    db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1),
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId)),
    currentPortalSlug(),
    fetchPortalSettings(),
    fetchPortalLook(),
    fetchHouseholdRows([leadId]),   // (Projects round 9)
    db.select({ at: leadEvents.at, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, leadId), eq(leadEvents.kind, 'portal_reminded'))),
    /* (fix-G, G-08) every send of the link, the client's and the household's — the latest after the first invite is "sent again" */
    db.select({ at: leadEvents.at, kind: leadEvents.kind, actor: leadEvents.actorId, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, leadId), inArray(leadEvents.kind, ['invite_sent', 'household_invited']))).orderBy(desc(leadEvents.at)),
    db.select({ payload: stageLogs.payload }).from(stageLogs).where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Quote Sent'))).orderBy(desc(stageLogs.createdAt)).limit(1),
    portalSeesMoney(leadId, viewer),
  ])
  const k = link?.k
  const ids = [k?.invitedBy, k?.withdrawnBy, ...sends.map((x) => x.actor)].filter((x): x is string => !!x)
  const names = ids.length ? await db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, [...new Set(ids)])) : []
  const nameOf = (id: string | null | undefined) => (id ? names.find((n) => n.id === id)?.name ?? null : null)
  const facts = (await loadHomeFacts([{ linkId: k?.id ?? leadId, leadId, lastOpenedAt: k?.lastOpenedAt?.getTime() ?? null, readerIds: k ? [k.homeownerId] : [] }], slug)).get(leadId)!
  const stamps = k ? stampsOf(k) : null
  const now = Date.now()
  const live = !!stamps?.invitedAt && !stamps.withdrawnAt
  /* (fix-G, G-01) money is the project's team's: a viewer who may not see it reads no Money row and no payment waiting on the client */
  const moneyOff = !money
  const later = (first: number | null | undefined, list: typeof sends) => {
    const r = first ? list.find((x) => x.at.getTime() > first + 60_000) : null
    return r ? { at: r.at.getTime(), by: nameOf(r.actor) } : null
  }
  return {
    leadId, projectId: p?.id ?? null,
    client: { name: titleCaseName(l.name), first: firstName(titleCaseName(l.name)), phone: link?.phone ?? l.phone },
    stamps, chip: accessChip(stamps?.invitedAt || stamps?.withdrawnAt ? stamps : null, now),
    invitedBy: nameOf(k?.invitedBy), withdrawnBy: nameOf(k?.withdrawnBy),
    resent: later(stamps?.invitedAt, sends.filter((x) => x.kind === 'invite_sent')),
    slug, studio: look.studio, paused: s.paused, closed: !!look.closed,
    /* (Projects round 9) a section switched off for every client says so, and leads to the switch */
    sections: accessSectionsOf({ ...facts, leadId, base: p ? `/projects/${p.id}` : `/leads/${leadId}`, direct: l.direct, offPortal: offPortalQuotes(quoteStep?.payload, facts.quotes), floorPlan: p ? await floorPlanAccessOf(p.id) : undefined })   // (gaps build G)
      .filter((x) => !(moneyOff && x.key === 'money'))
      .map((x) => ((isSectionKey(x.key) && look.hidden.includes(x.key)) || (x.key === 'documents' && look.hidden.includes('files')) ? { ...x, state: SECTION_OFF_STATE, href: '/company/portal' } : x)),   // (fix-G, G-26) Documents live inside Files on the portal — off with it
    /* what waits on them only means something once they can open the portal */
    waiting: live ? needsOf(facts).filter((n) => !look.hidden.some((k2) => NEED_SECTION[n.kind] === k2) && !(moneyOff && NEED_SECTION[n.kind] === 'money')) : [],   // (r9) nothing of a section that is off
    mayAct: worksOn(viewer, team.map((t) => t.memberId)),
    now,
    household: (household[leadId] ?? []).map((h) => ({ ...h, chip: accessChip(h.stamps.invitedAt || h.stamps.withdrawnAt ? h.stamps : null, now),
      resent: later(h.stamps.invitedAt, sends.filter((x) => x.kind === 'household_invited' && (x.detail as { id?: string } | null)?.id === h.id)) })),
    sectionsOff: look.hidden,
    reminded: reminders.reduce<Record<string, number>>((m, r) => { const key = (r.detail as { id?: string } | null)?.id; if (key) m[key] = Math.max(m[key] ?? 0, r.at.getTime()); return m }, {}),
    coOwner: l.client2Name && l.client2Phone && l.client2Phone !== (link?.phone ?? l.phone).replace(/\D/g, '').slice(-8) && !(household[leadId] ?? []).some((h) => h.phone === l.client2Phone)
      ? { name: titleCaseName(l.client2Name), phone: l.client2Phone } : null,   // (pending modules S05)
  }
}

/** (fix-G, G-42) The quote the lead's Quote Sent step names, when it reached the client outside the portal — an uploaded quote, or one
    picked from the lead's quotes that the portal does not list (an Approved quote sent by hand). 0 or 1. */
function offPortalQuotes(payload: unknown, listed: { id: string; title: string; kind?: string }[]): number {
  const d = (payload ?? {}) as { quoteTab?: string; quoteSelected?: string | null; quoteSelectedId?: string | null; quoteUploaded?: unknown }
  if (d.quoteTab === 'upload') return d.quoteUploaded ? 1 : 0
  if (!d.quoteSelected && !d.quoteSelectedId) return 0
  const quotes = listed.filter((q) => q.kind !== 'variation')
  return quotes.some((q) => (d.quoteSelectedId ? q.id === d.quoteSelectedId : q.title === d.quoteSelected)) ? 0 : 1
}
