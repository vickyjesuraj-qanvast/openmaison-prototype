import 'server-only'
import { and, eq, gte, inArray, isNull, lt, notInArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { startOfDay } from '@/lib/format'
import {
  contractTemplates, contracts, leadFiles, leadTasks, leads, libraryFolders, paymentTemplates, priceBookItems, priceBookSections, quoteTemplates,
  quoteTextTemplates, quotes, studioMaterials, taskTemplates, visualizerDesigns, projects, marketplaceBanners, marketplaceBrands, marketInsights, members,
  commissionRequests, vendors, projectTickets, leadAssignees, meetings,
} from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { isAccounting, isMarketing, runsStudio, seesBooks } from '@/lib/settings/roles'
import { seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { setupModeFor } from '@/lib/studio-setup/queries'
import { seesTeam } from '@/lib/dashboard/model'
import { siteThisWeek } from '@/lib/dashboard/cards-queries'   // (the Dashboard redesigned — D3's On site rule, read light)
import { HIDEABLE, cardsFor, parsePrefs } from '@/lib/dashboard/frame'
import { myOpenTasks } from '@/lib/dashboard/queries'   // (S42 audit A-16)
import { listingShape } from '@/lib/qanvast-listing/queries'   // (pending modules S37)
import { ticketRaise } from '@/lib/projects/tickets'   // (pending modules S46B) Projects › Tickets' New ticket
import { meetingRows } from '@/lib/meetings/queries'   // (pending modules S46B) Tools › Meeting Copilot's first screen
import { idsOf, standingOf } from '@/lib/meetings/model'
import { qanvastAccountIsStandIn } from '@/lib/qanvast-account/service'   // (S42E, E-07)
import { commissionAsksShape } from '@/lib/finance/sections'   // (S43D, F2-01)
import { fetchLeadRows } from '@/lib/leads/queries'   // (S44Z) the lead header's seed
import { fetchQuoteApproval, fetchStageMovement, isApprover } from '@/lib/settings/queries'
import { headHasPrimary } from '@/lib/leads/stage-policy'
import { railBadges } from '@/lib/leads/tasks'   // (pending modules S46C · M3) read once per request — the shell already asked for it
import { quoteTodoCounts, type QuoteListRow } from '@/lib/leads/quote-filters'   // (responsive audit W6, W5-33) the Quotes to-do pills' seed
import { sentToClientDates } from '@/lib/quotes/sent-to-client'
import { itemVisible } from '@/lib/company/price-book-rules'   // (calm-build regression fix F) the Price book's to-do seed, by the page's own rule

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
    /* (the Dashboard redesigned, 2026-10-26 — lane D1) the page's shape for its loader: a Manager's page (the leads' three figures, the team's
       cards), the cards this member hid for themselves, whether Projects and On site have something to draw (`dashboardSeed`) */
    'dashboard.manager': viewer.role === 'Manager',
    ...(await dashboardSeed(viewer, projectRows.filter((p) => p.stage !== 'completed').map((p) => p.leadId), seen).catch(() => ({}))),
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
    /* (calm-build regression fix F — D's request) Price book › My Items' to-do chip (a proposal waiting) for a browser's first loader, as the page's
       reveal draws it: a proposed, live item this member sees (`itemVisible` — the page's own rule); price-book-ghost.tsx reads it */
    'lib.price-book-items.todo': await db.select({ status: priceBookItems.status, createdBy: priceBookItems.createdBy }).from(priceBookItems)
      .where(and(eq(priceBookItems.status, 'proposed'), isNull(priceBookItems.deletedAt)))
      .then((rows) => rows.some((r) => itemVisible(viewer, r))).catch(() => false),
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
    /* (responsive audit 2026-10-23, W6 — W5-33) Tools › Quotes' and each lead's Quotes tab's to-do pills, for a loader that streams before the page:
       the page's own counts (`quoteTodoCounts`), under the keys the page remembers — the ghost draws the line they take */
    ...(await quoteTodosSeed(sees, viewer).catch(() => ({}))),
    /* (S45B · H-UHD-2) Finance › Vendors shows its *Contractors* chip while an active vendor works on site — the ghost draws the same four */
    'fin.contractors': await db.select({ n: sql<number>`count(*)` }).from(vendors)
      .where(and(eq(vendors.isContractor, true), eq(vendors.isActive, true), isNull(vendors.mergedInto)))
      .then((r) => Number(r[0]?.n ?? 0) > 0).catch(() => false),
  }
}

/** (the Dashboard redesigned, 2026-10-26 — lane D1) The Dashboard's shape for its loader, by the cards' own rules read light: the cards a member
    hid for themselves (his Q-06, `dashboard.hidden.<card>`); whether Projects has a line to draw (D3's `fetchProjectsHealth`: an open project
    this member sees — their own for a Designer, and for an Owner's or Admin's remembered Mine); whether On site has the week's photos (D3's
    `siteThisWeek`, the card's own rule); whether Your day's week has anything in it (`dashboard.week`: one of the member's open tasks due by
    the week's end or late, or one of their meetings planned in it — D3's `fetchDay` read light; Accounting's week of money is left to the
    page's memory). A browser that has seen the page draws what it held last instead (`CARD_COUNT_KEYS`). */
async function dashboardSeed(viewer: Awaited<ReturnType<typeof fetchViewer>>, openLeadIds: string[], seen: Set<string> | null): Promise<Record<string, boolean>> {
  const [m] = await db.select({ prefs: members.dashboardPrefs }).from(members).where(eq(members.id, viewer.id)).limit(1)
  const prefs = parsePrefs(m?.prefs ?? null)
  const cards = cardsFor(viewer.role)
  const ownOnly = runsStudio(viewer.role) ? prefs.scope === 'mine' : viewer.role !== 'Manager'
  const projectsShown = cards.includes('projects') && openLeadIds.length > 0 && (!ownOnly || Number((await db.select({ n: sql<number>`count(*)` }).from(leadAssignees)
    .where(and(eq(leadAssignees.memberId, viewer.id), inArray(leadAssignees.leadId, openLeadIds))))[0]?.n ?? 0) > 0)
  const site = cards.includes('site') && await siteThisWeek(viewer).catch(() => false)
  const weekEnd = startOfDay(new Date()) + 7 * 86_400_000
  const week = isAccounting(viewer.role) || (await myOpenTasks(viewer.id, seen).catch(() => [])).some((t) => t.dueAt && t.dueAt.getTime() < weekEnd)
    || (await db.select({ leadId: meetings.leadId, memberIds: meetings.memberIds, createdBy: meetings.createdBy }).from(meetings)
      .where(and(isNull(meetings.deletedAt), eq(meetings.status, 'planned'), gte(meetings.startsAt, new Date(startOfDay(new Date()))), lt(meetings.startsAt, new Date(weekEnd)))).catch(() => []))
      .some((r) => (!seen || seen.has(r.leadId)) && (idsOf(r.memberIds).includes(viewer.id) || r.createdBy === viewer.id))
  /* (the Dashboard's closing pass, 2026-10-26) a browser's first visit has no memory of the Since chips (`dashboard.since` = none): an Accounting
     member's page holds none on the demo (no leads, no site, no articles — only a client's word that they paid), so their first ghost draws no
     Since row; every other role's page has news and draws it. A browser that has seen the page draws what it held (its own memory).
     (the calm pass 2026-10-26 — lane C1) The news is the greeting line's one link now, no row of chips: the same seed says whether the ghost's
     line carries the link's words. */
  return { ...Object.fromEntries(HIDEABLE.map((k) => [`dashboard.hidden.${k}`, prefs.hidden.includes(k)])), 'dashboard.projects': projectsShown, 'dashboard.updates': site, 'dashboard.week': week, 'dashboard.since': isAccounting(viewer.role) }
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

/** (responsive audit 2026-10-23, W6 — W5-33) Whether the Quotes list (`tools.quotes`) and each lead's Quotes tab (`lead.<id>.quotes`) open with
    each to-do pill — Waiting for my approval · Waiting on client · Expiring this week — by the list's own rules (lib/leads/quote-filters.ts
    `quoteTodoCounts`, the sent-to-client dates as fetchStudioQuotes reads them, the approvals only for an approver while the studio asks). */
async function quoteTodosSeed(sees: (leadId: string | null) => boolean, viewer: { id: string; role: string }): Promise<Record<string, boolean>> {
  const rows = (await db.select({ quote: quotes }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt), eq(quotes.kind, 'quote')))).map((r) => r.quote).filter((q) => sees(q.leadId))
  const sent = await sentToClientDates(rows)
  const list: QuoteListRow[] = rows.map((q) => ({ ...q, sentToClientAt: sent.get(q.id) ?? null }))
  const approves = (await fetchQuoteApproval()) === 'required' && (await isApprover(viewer.id, viewer.role))
  const now = Date.now()
  const out: Record<string, boolean> = {}
  const put = (key: string, qs: QuoteListRow[]) => { const c = quoteTodoCounts(qs, now, approves); out[`${key}.approval`] = c.approval > 0; out[`${key}.waiting`] = c.waiting > 0; out[`${key}.expiring`] = c.expiring > 0 }
  put('tools.quotes', list)
  const byLead = new Map<string, QuoteListRow[]>()
  for (const q of list) { const a = byLead.get(q.leadId) ?? []; a.push(q); byLead.set(q.leadId, a) }
  for (const [leadId, qs] of byLead) put(`lead.${leadId}.quotes`, qs)
  return out
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
