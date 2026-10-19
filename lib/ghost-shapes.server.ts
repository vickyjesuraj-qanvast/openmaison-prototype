import 'server-only'
import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractTemplates, contracts, leadFiles, leadTasks, leads, libraryFolders, paymentTemplates, priceBookItems, priceBookSections, quoteTemplates,
  quoteTextTemplates, quotes, studioMaterials, taskTemplates, visualizerDesigns, projects, marketplaceBanners, marketplaceBrands, marketInsights, members,
  commissionRequests, vendors, projectTickets,
} from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { isAccounting, isMarketing, runsStudio, seesBooks } from '@/lib/settings/roles'
import { seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { setupModeFor } from '@/lib/studio-setup/queries'
import { seesSiteUpdates, seesTeam } from '@/lib/dashboard/model'
import { recentSiteUpdates } from '@/lib/dashboard/updates'
import { myOpenTasks } from '@/lib/dashboard/queries'   // (S42 audit A-16)
import { listingShape } from '@/lib/qanvast-listing/queries'   // (pending modules S37)
import { ticketRaise } from '@/lib/projects/tickets'   // (pending modules S46B) Projects › Tickets' New ticket
import { meetingRows } from '@/lib/meetings/queries'   // (pending modules S46B) Tools › Meeting Copilot's first screen
import { standingOf } from '@/lib/meetings/model'
import { qanvastAccountIsStandIn } from '@/lib/qanvast-account/service'   // (S42E, E-07)
import { commissionAsksShape } from '@/lib/finance/sections'   // (S43D, F2-01)
import { fetchLeadRows } from '@/lib/leads/queries'   // (S44Z) the lead header's seed
import { fetchStageMovement } from '@/lib/settings/queries'
import { headHasPrimary } from '@/lib/leads/stage-policy'
import { railBadges } from '@/lib/leads/tasks'   // (pending modules S46C · M3) read once per request — the shell already asked for it

/**
 * (UX audit build · REG-817) Which pages open on their FIRST RUN right now — told to the ghosts by the app shell, so even a browser's first
 * visit draws the loader in the shape the page lands in (lib/ghost-shape.tsx). A page this browser has visited still wins (what it saw is
 * fresher). Cheap counts, read the way the pages read them (Who sees leads, nothing deleted, archived lists aside); a near-miss only costs a
 * ghost the page's other shape. Keys: the ones the pages remember under — `lib.<tableKey>`, `leads`, `tools.quotes`, `tools.contracts`, `tasks`,
 * and each lead's list tabs, `lead.<id>.quotes|contracts|tasks|files`.
 */
/** (pending modules S17) A gallery's table key → its folders' library (lib/company/folder-libraries.ts). */
const LIBRARY_OF: Record<string, string> = {
  'quote-templates': 'quotes', 'contract-templates': 'contracts', 'task-templates': 'tasks', 'text-templates': 'texts', 'payment-templates': 'payments',
  'schedule-templates': 'schedules', materials: 'materials', 'price-book-items': 'book-items', 'price-book-sections': 'book-sections', 'viz-designs': 'visualizer',
}

export async function fetchFirstRunShapes(): Promise<Record<string, boolean>> {
  const viewer = await fetchViewer()
  const seen = await visibleLeadIds(viewer)
  const sees = (leadId: string | null) => !leadId || !seen || seen.has(leadId)
  const count = async (table: typeof quoteTemplates | typeof contractTemplates | typeof taskTemplates | typeof quoteTextTemplates | typeof paymentTemplates | typeof studioMaterials | typeof priceBookItems | typeof priceBookSections) =>
    Number((await db.select({ n: sql<number>`count(*)` }).from(table).where(isNull(table.deletedAt)))[0]?.n ?? 0)
  const [folderRows, leadRows, designRows, quoteRows, contractRows, taskRows, fileRows, qt, ct, tt, xt, pt, mt, bi, bs] = await Promise.all([
    db.select({ library: libraryFolders.library }).from(libraryFolders).where(isNull(libraryFolders.deletedAt)),
    db.select({ id: leads.id }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))),   // (REG-911)
    db.select({ leadId: visualizerDesigns.leadId }).from(visualizerDesigns).where(isNull(visualizerDesigns.deletedAt)),
    db.select({ leadId: quotes.leadId }).from(quotes).where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt), eq(quotes.kind, 'quote'))),   // (fix-G, G-41) the Quotes tab's rows are quotes
    db.select({ leadId: contracts.leadId }).from(contracts).where(and(isNull(contracts.deletedAt), isNull(contracts.archivedAt))),
    db.select({ leadId: leadTasks.leadId }).from(leadTasks),
    db.select({ leadId: leadFiles.leadId }).from(leadFiles).where(isNull(leadFiles.deletedAt)),
    count(quoteTemplates), count(contractTemplates), count(taskTemplates), count(quoteTextTemplates), count(paymentTemplates),
    count(studioMaterials), count(priceBookItems), count(priceBookSections),
  ])
  const folders = new Set(folderRows.map((f) => f.library))
  /* (REG-929) Projects: the listing's first run, and each project's Tasks / Files — the lead's tabs carried on, keyed by the project's id
     (the address the project's tab ghost reads); the page never remembers these, so the seed is always the answer. */
  const projectRows = (await db.select({ id: projects.id, leadId: projects.leadId, stage: projects.stage }).from(projects).where(isNull(projects.deletedAt))).filter((p) => sees(p.leadId))
  /* each visible lead's list tabs — the leads that hold something in each */
  const holds = (rows: { leadId: string | null }[]) => new Set(rows.map((r) => r.leadId).filter((x): x is string => !!x))
  const has = { quotes: holds(quoteRows), contracts: holds(contractRows), tasks: holds(taskRows), files: holds(fileRows) }
  const tabs: Record<string, boolean> = {}
  for (const l of leadRows) {
    if (!sees(l.id)) continue
    for (const tab of ['quotes', 'contracts', 'tasks', 'files'] as const) tabs[`lead.${l.id}.${tab}`] = !has[tab].has(l.id)
  }
  const empty = (n: number, library: string) => n === 0 && !folders.has(library)
  for (const p of projectRows) for (const tab of ['tasks', 'files'] as const) tabs[`lead.${p.id}.${tab}`] = !has[tab].has(p.leadId)
  /* (S42 audit C-18 — S41b-1's note) a project's Money opens with Needs you while its work runs (the band its ghost draws, `lead.<id>.money`,
     remembered per browser once the tab is seen): a fresh browser's ghost draws the band for a live project, none for a completed one */
  for (const p of projectRows) tabs[`lead.${p.id}.money`] = p.stage !== 'completed'
  /* (S44Z — S44O's ghost note, REG-708) the lead page's header for a loader this browser has no memory of: a lead on its live project draws the
     short strip and the header's pair (`lead.<id>.project`), and — Marketing's — a lead past what is theirs to move draws no filled button
     (`lead.<id>.noprimary`, the page's own rule `headHasPrimary`); what the page remembers once seen still wins (tab-ghost-for.tsx) */
  for (const p of projectRows) tabs[`lead.${p.leadId}.project`] = true
  if (isMarketing(viewer.role)) {
    const [{ rows }, mode] = await Promise.all([fetchLeadRows(), fetchStageMovement()])
    for (const r of rows) if (sees(r.id) && !headHasPrimary(r, mode, viewer.role)) tabs[`lead.${r.id}.noprimary`] = true
  }
  return {
    ...tabs,
    'role.accounting': isAccounting(viewer.role),   // (parity map, PR-022) the ghosts of Accounting's own pages (project · To do · Settings) — `useViewerShape`
    'role.marketing': isMarketing(viewer.role),   // (S44O — call C6) Marketing's own pages: Settings' Lead management alone, a lead's strip without Quotes · Contracts · Meetings, the Dashboard's one tile
    /* (pending modules S08) Settings › Studio opens on Set up your studio for this member (an Owner or an Admin, while it shows by itself), or
       would when they ask for it from ⌘K (`role.runs`) — its ghost draws the list first */
    'role.setup': (await setupModeFor(viewer).catch(() => null)) !== null,
    'role.runs': runsStudio(viewer.role),
    /* (pending modules S41b-1) Who sees costs and margins: the Owner changes it (its card's read-only line for anyone else), and the pages with
       cost columns draw them only for a member who sees costs */
    'role.owner': viewer.role === 'Owner',
    'role.costs': seesCost(viewer),
    /* (pending modules S22) the Dashboard draws Workload for whoever sees the team's load (Owners, Admins, Managers — its tiles are a
       Manager's three then) and Site updates for an Owner or an Admin once one went out in the last fortnight */
    /* (S42 audit A-07 · A-16) …and only when Workload has a line to draw: a running project, or someone it lists (a Designer, a Manager —
       a Manager always lists themselves); a new studio's first day has neither */
    'dashboard.team': seesTeam(viewer.role) && (viewer.role === 'Manager' || projectRows.some((p) => p.stage !== 'completed') || Number((await db.select({ n: sql<number>`count(*)` }).from(members).where(and(eq(members.isActive, true), inArray(members.role, ['Designer', 'Manager']))))[0]?.n ?? 0) > 0),
    'dashboard.updates': seesSiteUpdates(viewer.role) && (await recentSiteUpdates(viewer, Date.now(), 1).catch(() => [])).length > 0,
    /* (S42 audit A-06 · A-16) MY TASKS draws its rows or its one quiet row; Needs you draws one row on a studio with nothing in it yet */
    'dashboard.mytasks': (await myOpenTasks(viewer.id, seen).catch(() => [])).length > 0,
    'dashboard.quiet': projectRows.length === 0 && !leadRows.some((l) => sees(l.id)),
    projects: projectRows.length === 0,   // (REG-929)
    leads: !leadRows.some((l) => sees(l.id)),
    'lib.viz-designs': empty(designRows.filter((d) => sees(d.leadId)).length, 'visualizer'),
    'tools.quotes': !quoteRows.some((q) => sees(q.leadId)),
    'tools.contracts': !contractRows.some((c) => sees(c.leadId)),
    tasks: !taskRows.some((t) => sees(t.leadId)),
    /* (pending modules S46C · M3) the Tasks page's approvals line, for a browser's first visit: the approvals the rail already counts (the
       Dashboard's Needs your OK rows for quotes, templates, the Price book, AI credits and Finance's To approve); a project's own OK asks are the
       page's to add — the browser remembers what the page drew from then on */
    'tasks.approvals': await railBadges().then((b) => ['tools', 'company:templates', 'company:price-book', 'company:plan', 'company:finance'].some((k) => (b[k] ?? 0) > 0)).catch(() => false),
    'lib.quote-templates': empty(qt, 'quotes'),
    'lib.contract-templates': empty(ct, 'contracts'),
    'lib.task-templates': empty(tt, 'tasks'),
    'lib.text-templates': empty(xt, 'texts'),
    'lib.payment-templates': empty(pt, 'payments'),
    'lib.materials': empty(mt, 'materials'),
    'lib.price-book-items': empty(bi, 'book-items'),
    'lib.price-book-sections': empty(bs, 'book-sections'),
    /* (pending modules S17) whether each library's top level opens on a Folders row — its gallery ghost draws one only then (Templates ›
       Schedules has none, and its ghost drew two folders over the cards) */
    ...Object.fromEntries(Object.entries(LIBRARY_OF).map(([key, library]) => [`lib.${key}.folders`, folders.has(library)])),
    /* (pending modules S24) the Marketplace opens on its empty card while the feed holds no brand, and draws its banners' strip only when
       the feed has a banner in its window */
    ...(await marketplaceShape()),
    /* (pending modules S25) Market Insights opens on its empty card while the editors' feed holds no article, draws the featured card when one is
       featured, and the sample note while the demo's own articles are there */
    ...(await insightsShape()),
    /* (pending modules S37) Company › Profile's Listed on Qanvast card lands in its state (listed · waiting · changes asked · a listing made
       before OpenMaison), and Company › Integrations' Qanvast chip with it */
    ...(await listingShape()),
    /* (S42E, E-07) Lead credits' closures footnote says the stand-in's rule while the stand-in answers — its ghost draws the same words */
    'qanvast.standIn': qanvastAccountIsStandIn(),
    /* (S43D, F2-01 — S17's "left as data") Finance › Commission draws its asks for another rate under the tiles while one is open */
    ...(await commissionAsksSeed(viewer).catch(() => ({}))),
    /* (pending modules S46B, M1) Projects › Tickets: its first run (no ticket on a project this member sees — the empty card) and its header's
       New ticket (some project this member may raise one on) — the page's own rules (`fetchStudioTickets`, `ticketRaise`) */
    'studio-tickets': !(await db.select({ leadId: projects.leadId }).from(projectTickets).innerJoin(projects, eq(projects.id, projectTickets.projectId))
      .innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))).catch(() => [])).some((t) => sees(t.leadId)),
    'tickets.new': !!(await ticketRaise(viewer).catch(() => null)),
    /* (pending modules S46B) Tools › Meeting Copilot for a browser that hasn't seen it: its first run and the to-do chips it opens with (Briefs to
       save · Notes to write up) — `fetchStudioMeetings`' rows and lead-meetings.tsx's counts, under the keys the page remembers (S42 C-19) */
    ...(await studioMeetingsSeed(sees).catch(() => ({}))),
    /* (S45B · H-UHD-2) Finance › Vendors shows its *Contractors* chip while an active vendor works on site — the ghost draws the same four */
    'fin.contractors': await db.select({ n: sql<number>`count(*)` }).from(vendors)
      .where(and(eq(vendors.isContractor, true), eq(vendors.isActive, true), isNull(vendors.mergedInto)))
      .then((r) => Number(r[0]?.n ?? 0) > 0).catch(() => false),
  }
}

/** (S43D, F2-01) Whether Finance › Commission opens with its asks band — the page's own rule (`fetchCommissions`: whoever sees the books reads every
    open ask, *Asks for another rate*; a member their own, *Your asks*), keyed by which of the two it is so a member's answer never stands for the
    studio's. The ghost reads it with `useFirstRunShape` — what this browser saw last wins, as C-18's Money band. */
async function commissionAsksSeed(viewer: { id: string; role: string }): Promise<Record<string, boolean>> {
  const runs = seesBooks(viewer.role)
  const open = notInArray(commissionRequests.status, ['approved', 'declined', 'withdrawn'])   // `askRecord`: anything else reads as open
  const rows = await db.select({ n: sql<number>`count(*)` }).from(commissionRequests).where(runs ? open : and(open, eq(commissionRequests.memberId, viewer.id)))
  return { [commissionAsksShape(runs)]: Number(rows[0]?.n ?? 0) > 0 }
}

async function studioMeetingsSeed(sees: (leadId: string | null) => boolean): Promise<Record<string, boolean>> {
  const ids = (await db.select({ id: leads.id }).from(leads).where(isNull(leads.deletedAt))).map((l) => l.id).filter((id) => sees(id))
  const rows = await meetingRows(ids)
  const now = Date.now()
  const waits = rows.map((r) => standingOf(r, now).waits)
  return { meetings: rows.length === 0, 'meetings.save': waits.includes('save'), 'meetings.write': waits.includes('write') }
}

async function marketplaceShape(): Promise<Record<string, boolean>> {
  const now = Date.now()
  const [brands, banners] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(marketplaceBrands).where(isNull(marketplaceBrands.removedAt)),
    db.select({ s: marketplaceBanners.startsAt, e: marketplaceBanners.endsAt }).from(marketplaceBanners),
  ])
  return { marketplace: Number(brands[0]?.n ?? 0) === 0, 'marketplace.banners': banners.some((b) => (!b.s || b.s.getTime() <= now) && (!b.e || b.e.getTime() >= now)) }
}

async function insightsShape(): Promise<Record<string, boolean>> {
  const rows = await db.select({ featured: marketInsights.featured, sample: marketInsights.sample }).from(marketInsights).where(isNull(marketInsights.removedAt))
  return { 'market-insights': rows.length === 0, 'market-insights.featured': rows.some((r) => r.featured), 'market-insights.samples': rows.some((r) => r.sample) }
}
