import 'server-only'   // libSQL never reaches the browser
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leads, meetings, projectInvoices, projectPayments, projectTickets, projects, purchaseOrders, quotes, spaceLayouts } from '@/lib/db/schema'
import { portalPath } from '@/lib/portal/model'
import { currentPortalSlug, resolvePortalSlug } from '@/lib/portal/queries'
import { isShareToken } from '@/lib/projects/invoices-token'
import { canOpenLead, fetchViewer, refusesWorkspace } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { layoutVisible } from '@/lib/planner/queries'
import { moneyInHref, moneyOutHref, todoHref } from '@/lib/finance/sections'
import { OLD_OPERATIONS_TABS, oldPortalSection } from './old-addresses'

/*
 * (pending modules S02 — the projects map's D-11, as recommended: "redirect each to its new page") The links 1.0 sent clients, already in
 * their WhatsApp threads, land on the 2.0 page that does the same job — never a 404. A port that carries 1.0's tokens into 2.0's columns
 * (an invoice's and a receipt's `share_token`, a quote's `view_token`, a 3D layout share's `token`, a client's `portal_token`) makes each
 * land on the very record; a token 2.0 does not hold lands where that kind of thing lives for the client — their portal, which asks them
 * to sign in first.
 *
 *   1.0                                    2.0
 *   /pay/<token>  (the old project portal) /my/<address>                       — the portal (sign-in first)
 *   /pay/inv/<token>                       /invoice/<token>                     — else the portal's Money
 *   /pay/receipt/<token>                   /receipt/<token>                     — else the portal's Money
 *   /my/<slug>/p/<token>                   /my/<address>                       — the portal (sign-in first); (pending modules S13) a slug no
 *                                                                                  studio here holds keeps it: /my/<that slug>, its own notice
 *   /my/login                              /my/<address>/login
 *   /my/projects/<id> · /my/engagement/<id> /my/<address>                      — the client's homes are on its Home
 *   /my/<slug>/projects/<id>               /my/<address>
 *   /my/<slug>/team                        /my/<address>/about                 — About · Our team
 *   /quote-preview/<token>                 /quote/<token>                       — the view-only link (1.0's /quote/<token> is the same path)
 *   /floor-plan/view/<token>               /space/<token>                       — the 3D layout
 *   /sign/quote-xray/<token>               the studio's notice                  — X-Ray has no client link (X-Ray audit Q-24)
 *   /copilot/share/<id>                    /meeting/<id>                        — (pending modules S23) the meeting's client link, when a port puts 1.0's
 *                                                                                  share id in `meetings.client_token`; else the studio's notice (1.0's
 *                                                                                  share links lasted 24 hours, so a real one has long ended)
 *   /hangouts/<eventId>                    /hangout/<token>                     — (pending modules S27) the studio's own page for that Hangout (its
 *                                                                                  Qanvast id is the event's `feed_ref`) when it takes part; else the
 *                                                                                  studio's notice (app/hangouts/[eventId])
 *   /sign/<token>                          /sign/<token>                        — (pending modules S03) the same path: a port puts 1.0's request token in
 *                                                                                  `contracts.sign_token` (one document) or `contract_bundles.sign_token` (a set,
 *                                                                                  which lands on /sign/bundle/<id>); an unknown token says the link is no longer active
 *
 * (pending modules S41b-2) Every 1.0 address — these client links, the website's and the studio app's — is on one list,
 * lib/links/old-addresses.ts; this file keeps the lookups (a token's, a record's) its routes need.
 */

/** The portal an old link names. With no address in it (`/pay/<token>`, `/my/projects/<id>`), the studio's own — the one the prototype holds.
    With one, the portal at that address (an old 1.0 slug kept as an old address resolves to this studio's current one) — and (pending
    modules S13, S02's note) an address no studio here holds keeps it, so the client lands on that address's own notice ("This address
    doesn’t open a portal") rather than on another studio's sign-in. */
async function portalOf(slug?: string): Promise<string> {
  if (slug === undefined) return currentPortalSlug()
  const where = slug ? await resolvePortalSlug(slug) : null
  return where ? where.current : encodeURIComponent(slug || '-')
}

export async function oldPortalTarget(slug?: string): Promise<string> { return portalPath(await portalOf(slug)) }

/** `/my/<slug>/p/<token>`: the client's home on 2.0's portal — the token names whose link it was (1.0's `portal_token`, kept on the link). */
export async function oldPortalTokenTarget(slug: string, token: string): Promise<string> {
  const [link] = token && token.length <= 80 ? await db.select({ id: homeownerLeadLinks.id }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.portalToken, token)).limit(1) : []
  /* a known client's link opens this studio's portal whatever slug 1.0 printed; an unknown one goes to the slug's own portal — or, at an address
     no studio here holds, to that address's notice (pending modules S13) */
  return portalPath(link ? await currentPortalSlug() : await portalOf(slug))
}

export async function oldInvoiceTarget(token: string): Promise<string> {
  if (isShareToken(token)) { const [i] = await db.select({ id: projectInvoices.id }).from(projectInvoices).where(eq(projectInvoices.shareToken, token)).limit(1); if (i) return `/invoice/${token}` }
  return portalPath(await portalOf(), 'money')
}

export async function oldReceiptTarget(token: string): Promise<string> {
  if (isShareToken(token)) { const [p] = await db.select({ id: projectPayments.id }).from(projectPayments).where(eq(projectPayments.shareToken, token)).limit(1); if (p) return `/receipt/${token}` }
  return portalPath(await portalOf(), 'money')
}

/** (pending modules S23) 1.0's meeting share link (`/copilot/share/<shareId>`, 24 hours): the meeting's client link when 2.0 holds the id as a
    meeting's token — the page itself then says what applies (the notes, a thank-you, or the house notice past its 30 days); null = none does. */
export async function oldMeetingShareTarget(token: string): Promise<string | null> {
  if (!token || token.length > 80 || !/^[A-Za-z0-9_-]+$/.test(token)) return null
  const [m] = await db.select({ id: meetings.id }).from(meetings).where(and(eq(meetings.clientToken, token), isNull(meetings.deletedAt))).limit(1)
  return m ? `/meeting/${token}` : null
}

/* ── (pending modules S41b-2 — the S41b pages sweep's M1) 1.0's studio-app addresses that name a record ────────────────────────────────────
 * The fixed and the query-placed old addresses are lib/links/old-addresses.ts' (next.config.ts · proxy.ts); these few need the record read
 * first — which project an invoice is on, a ticket's 2.0 id. Each asks the visitor's permission (Who sees leads; a project = its lead) before
 * it names anything: a record they may not see, or one 2.0 does not hold, lands where that kind of thing lives — the same answer either
 * way, so an old address never reveals a record. The page it lands on keeps its own rules (money withheld, Accounting's gate).
 */

/** The project of `projectId` when the signed-in member may open it (its lead's rule; a deleted project or lead never). */
async function openProject(projectId: string, viewer?: Viewer): Promise<{ id: string; leadId: string } | null> {
  const [p] = await db.select({ id: projects.id, leadId: projects.leadId }).from(projects)
    .innerJoin(leads, eq(leads.id, projects.leadId)).where(and(eq(projects.id, projectId), isNull(projects.deletedAt), isNull(leads.deletedAt))).limit(1)
  if (!p) return null
  return (await canOpenLead(viewer ?? await fetchViewer(), p.leadId)) ? p : null
}
const safeId = (v: unknown): string | null => (typeof v === 'string' && v.length <= 120 && /^[A-Za-z0-9_.:-]+$/.test(v) ? v : null)

/** `/escalations/<ticket>` — 1.0 named a ticket by its number (`T-2026-…`, kept as 2.0's `number` by a port), 2.0's own links by its id. */
export async function oldTicketTarget(ref: string): Promise<string> {
  const key = safeId(ref)
  const home = '/projects/tickets'
  if (!key) return home
  const viewer = await fetchViewer()
  if (await refusesWorkspace(viewer)) return home   // Accounting: the page answers with the house gate
  const [t] = await db.select({ id: projectTickets.id, projectId: projectTickets.projectId }).from(projectTickets)
    .where(or(eq(projectTickets.id, key), sql`upper(${projectTickets.number}) = ${key.toUpperCase()}`)).limit(1)
  return t && (await openProject(t.projectId, viewer)) ? `${home}?open=${encodeURIComponent(t.id)}` : home
}

/** `/finance/operations` (+ `?tab=` · `&project=` · `?invoiceId=`) — 1.0's Finance › Operations. */
export async function oldOperationsTarget(sp: Record<string, string | string[] | undefined>): Promise<string> {
  const one = (k: string) => { const v = sp[k]; return typeof v === 'string' ? v : null }
  const tab = (one('tab') ?? '').toLowerCase()
  const register = OLD_OPERATIONS_TABS[tab] ?? todoHref()
  const invoiceId = safeId(one('invoiceId'))
  if (invoiceId) {
    /* the invoice's drawer in 1.0 = its row on its project's Money in 2.0 (the panel opens on it); else Money in's invoices */
    const [i] = await db.select({ projectId: projectInvoices.projectId }).from(projectInvoices).where(eq(projectInvoices.id, invoiceId)).limit(1)
    return i && (await openProject(i.projectId)) ? `/projects/${encodeURIComponent(i.projectId)}/money?open=${encodeURIComponent(invoiceId)}` : moneyInHref('invoices')
  }
  const projectId = safeId(one('project'))
  if (projectId && (await openProject(projectId))) return `/projects/${encodeURIComponent(projectId)}/money`
  return register
}

/** `/finance/invoices/<id>/preview` — the invoice's paper. */
export async function oldInvoicePaperTarget(id: string): Promise<string> {
  const key = safeId(id)
  const [i] = key ? await db.select({ projectId: projectInvoices.projectId }).from(projectInvoices).where(eq(projectInvoices.id, key)).limit(1) : []
  return i && key && (await openProject(i.projectId)) ? `/projects/${encodeURIComponent(i.projectId)}/invoices/${encodeURIComponent(key)}` : moneyInHref('invoices')
}

/** `/finance/pos/<id>/preview` — the purchase order's paper. */
export async function oldPoPaperTarget(id: string): Promise<string> {
  const key = safeId(id)
  const [po] = key ? await db.select({ projectId: purchaseOrders.projectId }).from(purchaseOrders).where(eq(purchaseOrders.id, key)).limit(1) : []
  return po && key && (await openProject(po.projectId)) ? `/projects/${encodeURIComponent(po.projectId)}/purchase-orders/${encodeURIComponent(key)}` : moneyOutHref('purchase-orders')
}

/** `/finance/vos/<id>/preview` — a variation order is a quote of kind `variation` in 2.0: its Preview. */
export async function oldVoPaperTarget(id: string): Promise<string> {
  const key = safeId(id)
  const [q] = key ? await db.select({ leadId: quotes.leadId }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(eq(quotes.id, key), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt), isNull(leads.deletedAt))).limit(1) : []
  return q && key && (await canOpenLead(await fetchViewer(), q.leadId)) ? `/quotes/${encodeURIComponent(key)}/preview` : moneyInHref('variations')
}

/** `/tools/floor-plan` (+ `?planId=`) — the 3D Space Planner, on the layout when the member may open it. */
export async function oldPlannerTarget(planId: string | null): Promise<string> {
  const key = safeId(planId)
  const [l] = key ? await db.select({ id: spaceLayouts.id, projectId: spaceLayouts.projectId, leadId: spaceLayouts.leadId, isTemplate: spaceLayouts.isTemplate })
    .from(spaceLayouts).where(and(eq(spaceLayouts.id, key), isNull(spaceLayouts.deletedAt))).limit(1) : []
  return l && (await layoutVisible(await fetchViewer(), l)) ? `/planner/${encodeURIComponent(l.id)}` : '/planner'
}

/** `/tools/copilot-analytics` — the Meeting Co-Pilot: `?view=insights` its analytics (Company › Reports › Meetings, S23); `?sessionId=` a
    meeting (a port keeps 1.0's session id as the meeting's) when the member may open it; else Meetings. */
export async function oldCopilotTarget(sp: Record<string, string | string[] | undefined>): Promise<string> {
  if (sp.view === 'insights') return '/company/reports/meetings'
  const key = safeId(sp.sessionId)
  if (!key) return '/meetings'
  const viewer = await fetchViewer()
  if (await refusesWorkspace(viewer)) return '/meetings'
  const [m] = await db.select({ id: meetings.id, leadId: meetings.leadId }).from(meetings).where(and(eq(meetings.id, key), isNull(meetings.deletedAt))).limit(1)
  return m && (await canOpenLead(viewer, m.leadId)) ? `/meetings/${encodeURIComponent(m.id)}` : '/meetings'
}

/** 1.0's portal tab (`?tab=` on `/my/projects/<id>` · `/my/<slug>/projects/<id>`) — the client lands on that section of their portal; 1.0's
    `?issue=<id>` (an issue's own link) on Issues. */
export async function oldPortalSectionTarget(slug: string | undefined, sp: { tab?: string | string[]; issue?: string | string[] }): Promise<string> {
  const tab = typeof sp.tab === 'string' ? sp.tab : sp.issue ? 'issues' : null
  return portalPath(await portalOf(slug), oldPortalSection(tab))
}
