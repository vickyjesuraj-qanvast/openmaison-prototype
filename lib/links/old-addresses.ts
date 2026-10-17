/*
 * (pending modules S41b-2 — her "please make sure nothing left behind from 1.0 to 2.0" 2026-10-12; the S41b pages sweep's M1) EVERY address 1.0
 * printed — its website's, its studio app's and the links it sent clients — and where each lands in 2.0. One list: S35's website addresses
 * moved here from lib/site/model.ts, S02's client links are named here too (their record lookups stay in lib/links/old-links.ts), and the
 * studio app's own addresses join them. Members bookmarked those, and 1.0's notifications carry them in bell rows, emails and WhatsApp
 * messages already sent (`actionUrl`: `/leads?leadId=` · `/finance/operations?invoiceId=` · `/escalations/<ticket>` ·
 * `/projects/<id>?tab=management…` · `/accounts` …).
 *
 * Pure and free of imports — next.config.ts and proxy.ts both read it. Who answers each address:
 *   · a FIXED landing (`to`) — next.config.ts `redirects()` (307 while the prototype's addresses may still move; the developers make them
 *     permanent), before any route runs;
 *   · a landing that depends on the address's QUERY (`/leads?leadId=` · `/projects/<id>?tab=` · `/accounts?tab=` · `/inbox?…`) — proxy.ts,
 *     through `oldQueryTarget` below (pure rules: nothing is read);
 *   · a landing that needs its RECORD looked up (which project an invoice is on, a ticket's 2.0 id) — a small route under the old address
 *     (`by: 'route'`), through lib/links/old-links.ts: it asks the visitor's permission first and, for a record they may not see or that 2.0
 *     does not hold, lands where that kind of thing lives — the same answer either way, so no address reveals a record.
 * Every landing page keeps its own permission: a redirect only ever names an id the old address already carried, or one the route checked.
 * An address on none of these answers the app-wide "page not found" (app/not-found.tsx), never Next's bare page.
 */

export type OldAddress = {
  /** 1.0's address, as next.config.ts reads a `source` (`:id` a segment) */
  from: string
  /** a fixed landing — served by next.config.ts */
  to?: string
  /** otherwise, who answers: proxy.ts (`oldQueryTarget`) or a route under the old address (named in `lands`) */
  by?: 'proxy' | 'route'
  /** where it lands, in words, when it is not fixed */
  lands?: string
  /** whose address it was */
  kind: 'site' | 'app' | 'client'
}
type Row = Omit<OldAddress, 'kind'>
const rows = (kind: OldAddress['kind'], list: Row[]): OldAddress[] => list.map((a) => ({ ...a, kind }))

/* ── 1.0's website (S35) — its addresses at the domain's root land on the same page of the site here ─────────────────────────────── */
/* 1.0's own redirects ride along (/about → Story, /products and /ai-agents → Platform, /pricing → home while pricing is hidden). None of these
   paths is one of the app's. NOT here: /uae-get-started (her hold on countries beyond Singapore, 2026-10-12). (pending modules S36) 1.0's trial
   addresses land on the trial: /try-visualizer and its six tool pages, and 1.0's older /try. */
const SITE: OldAddress[] = rows('site', [
  { from: '/platform', to: '/site/platform' },
  { from: '/platform/visualiser', to: '/site/platform/visualizer' },
  { from: '/platform/space-planner', to: '/site/platform/space-planner' },
  { from: '/platform/quote-digitizer', to: '/site/platform/upload-a-quote' },
  { from: '/platform/finance', to: '/site/platform/finance' },
  { from: '/platform/leads', to: '/site/platform/leads' },
  { from: '/platform/projects', to: '/site/platform/projects' },
  { from: '/platform/co-pilot', to: '/site/platform/meeting-copilot' },
  { from: '/platform/maison-bot', to: '/site/platform/maison-ai' },
  { from: '/story', to: '/site/story' },
  { from: '/about', to: '/site/story' },
  { from: '/products', to: '/site/platform' },
  { from: '/ai-agents', to: '/site/platform' },
  { from: '/pricing', to: '/site' },
  { from: '/site/pricing', to: '/site' },        // 1.0's pricing page, hidden before launch: home (the plans live inside the app)
  { from: '/trust', to: '/site/trust' },
  { from: '/blog', to: '/site/blog' },
  { from: '/blog/:slug', to: '/site/blog/:slug' },
  { from: '/changelog', to: '/site/changelog' },
  { from: '/careers', to: '/site/careers' },
  { from: '/contact', to: '/site/contact' },
  { from: '/privacy', to: '/site/privacy' },
  { from: '/terms', to: '/site/terms' },
  { from: '/cookies', to: '/site/cookies' },
  { from: '/try', to: '/site/try' },
  { from: '/try-visualizer', to: '/site/try' },
  { from: '/try-visualizer/:tool(style|materials|lighting|furniture|defurnish|sketch)', to: '/site/try/:tool' },
])

/* ── 1.0's studio app — every page under src/app/(main) that 2.0 serves elsewhere (the sweep's §1, "home exists · old address 404") ─────── */
/* Same address in 2.0, nothing to do: /dashboard · /leads · /projects · /projects/<id> · /tasks · /marketplace · /marketplace/<id> · /settings
   (1.0's personal settings: Your profile now — its #anchors land there from the Settings page, app/settings/settings-view.tsx).
   Already landing: /login · /onboarding · /verify · /finance/<pipeline · commissions · reports · vendors> (app/finance/[tab]).
   (pending modules S41b-5) Same address too: 1.0's Qanvast line's /qanvast-ops/credits[/transactions|/contracts] and /qanvast-ops/reviews[/feedback]. */
const APP: OldAddress[] = rows('app', [
  /* Chats → Messages; a lead's "new chat" → that lead's conversation (1.0's chat ids have no 2.0 record: a chat lands on Messages) */
  { from: '/inbox', by: 'proxy', lands: 'Messages (/chat); ?newChat=…&leadId=<id> → the lead’s conversation' },
  { from: '/inbox/:chat', by: 'proxy', lands: 'Messages (/chat) — 1.0 copied this as a chat’s link, though no 1.0 page served it' },
  /* Escalations → Projects › Tickets */
  { from: '/escalations', to: '/projects/tickets' },
  { from: '/escalations/new', to: '/projects/tickets' },   // a ticket is raised on its project's Tickets
  { from: '/escalations/:ticket', by: 'route', lands: 'Projects › Tickets with the ticket open (1.0 named it by its number, T-2026-…), else Projects › Tickets — app/escalations/[ticket]' },
  /* Finance › Operations → Company › Finance (To do · Money in · Money out), a project's Money, an invoice */
  { from: '/finance/operations', by: 'route', lands: 'Finance › To do; ?tab= its 2.0 tab; &project= that project’s Money; ?invoiceId= the invoice on its project’s Money — app/finance/operations' },
  { from: '/finance/invoices/:id/preview', by: 'route', lands: 'the invoice’s paper (/projects/<p>/invoices/<id>), else Money in — app/finance/invoices/[id]/preview' },
  { from: '/finance/pos/:id/preview', by: 'route', lands: 'the purchase order’s paper (/projects/<p>/purchase-orders/<id>), else Money out — app/finance/pos/[id]/preview' },
  { from: '/finance/vos/:id/preview', by: 'route', lands: 'the variation order’s Preview (/quotes/<id>/preview), else Money in › Variation orders — app/finance/vos/[id]/preview' },
  /* Accounts Setup → Settings' modules and Company's sections (each of its 44 tabs to its card) */
  { from: '/accounts', by: 'proxy', lands: 'each ?tab= to its card (OLD_ACCOUNTS_TABS); no tab → Company › Members (1.0 opened on Team Members)' },
  { from: '/accounts/roles', by: 'proxy', lands: 'Settings › Roles & access › Who may do what' },
  { from: '/accounts/usage', by: 'proxy', lands: 'Company › Reports › Studio health (S39)' },
  { from: '/accounts/milestone-templates', by: 'proxy', lands: 'Company › Templates › Schedules' },
  { from: '/settings/notifications', to: '/settings?section=notifications' },
  { from: '/upgrade', to: '/company/plan/billing' },   // 1.0 sent it to its Settings; the plans live on Plan & billing
  { from: '/studio-setup', to: '/settings?section=studio' },   // the forced wizard → Set up your studio, at the top of Roles & access (S08)
  /* the new-record pages → the listing's own form */
  { from: '/leads/new', to: '/leads?new=1' },
  { from: '/projects/new', to: '/projects?new=1' },
  { from: '/projects/:id/quotes/new', to: '/projects/:id' },   // dead in 1.0 (nothing linked to it) — the project, all the same
  /* the query 1.0's links carried on two pages 2.0 still serves at the same address */
  { from: '/leads', by: 'proxy', lands: 'with ?leadId= / ?openLead= the lead (/leads/<id>); with ?quoteId= the quote (/quotes/<id>)' },
  { from: '/leads/:id/quote-preview-popout', by: 'proxy', lands: 'the quote’s Preview (?quoteId=), else the lead’s Quotes' },
  { from: '/projects/:id', by: 'proxy', lands: 'with ?tab= (+ sub · designSubTab · financeSubTab · milestone · focus) the 2.0 view of the project it named' },
  /* Tools → their 2.0 homes; ?planId= and ?sessionId= look their record up */
  { from: '/tools/quote-digitizer', to: '/quotes' },
  { from: '/tools/quote-xray', to: '/quote-x-ray' },
  { from: '/tools/ai-visualizer', to: '/visualizer' },
  { from: '/tools/floorplan-3d-isometric', to: '/planner?view=iso&photo=1' },
  { from: '/tools/market-insights', to: '/market-insights' },
  { from: '/tools/market-insights/:id', to: '/market-insights/mi-:id' },   // S25: an article's 2.0 id is `mi-<1.0's id>`
  { from: '/tools/compliance-navigator', to: '/compliance' },
  { from: '/tools/floor-plan', by: 'route', lands: 'the 3D Space Planner; ?planId= that layout when the visitor may open it — app/tools/floor-plan' },
  { from: '/tools/copilot-analytics', by: 'route', lands: 'Meetings; ?view=insights → Company › Reports › Meetings; ?sessionId= that meeting when the visitor may open it — app/tools/copilot-analytics' },
  { from: '/tools/homeowner-portal', to: '/company/portal' },
  /* (S41) 1.0's AI sandboxes — each to the 2.0 page that does its job (S41's map); the developers' bench is /dev/ai-bench */
  { from: '/tools/auto-furnish-sandbox', to: '/visualizer' },
  { from: '/tools/detect-sandbox', to: '/visualizer' },
  { from: '/tools/relight-sandbox', to: '/visualizer' },
  { from: '/tools/style-transfer-sandbox', to: '/visualizer' },
  { from: '/tools/visualizer-sandbox', to: '/visualizer' },
  { from: '/tools/floorplan-3d-sandbox', to: '/planner?view=iso&photo=1' },
  { from: '/tools/quote-template-sandbox', to: '/company/templates/quotes' },
  /* the studio's mock preview of its portal → Company › Client portal (Open as a test client) */
  { from: '/my/:slug/preview/:view', to: '/company/portal' },
  /* (pending modules S41b-5) 1.0's Qanvast line (`deployment/qanvast`): Qanvast Ops' Credits and Reviews & Rankings keep their addresses in 2.0
     (/qanvast-ops/credits · …/credits/transactions · …/credits/contracts · /qanvast-ops/reviews · …/reviews/feedback — Lead credits' and
     Reviews' own views); its Qanvast Leads page is 2.0's Qanvast Ops › Leads, its Lead Transaction Log (credits/leads — an empty list in 1.0's
     code, the hub's "View All Leads" opened Qanvast Leads) the same, and the older line's credit Packages are the Contracts */
  { from: '/qanvast-ops/leads', to: '/qanvast-ops' },
  { from: '/qanvast-ops/credits/leads', to: '/qanvast-ops' },
  { from: '/qanvast-ops/credits/packages', to: '/qanvast-ops/credits/contracts' },
  /* (S42E, E-15) the older Qanvast line's three pages, each where its job lives in 2.0: Portfolio → the member's own public profile (S27's
     card and work, on Your profile); Complaints → what homeowners told Qanvast (Reviews › Feedback); Promote → its tips on being seen (Reviews ›
     Ranking) — each keeps its own gate */
  { from: '/qanvast-ops/portfolio', to: '/profile#public' },
  { from: '/qanvast-ops/complaints', to: '/qanvast-ops/reviews/feedback' },
  { from: '/qanvast-ops/promote', to: '/qanvast-ops/reviews/ranking' },
])

/* ── The links 1.0 sent clients (S02 · S03 · S23 · S27) — each a route that looks its token up (lib/links/old-links.ts) ─────────────────── */
const CLIENT: OldAddress[] = rows('client', [
  { from: '/pay/:token', by: 'route', lands: 'the client’s portal (sign-in first)' },
  { from: '/pay/inv/:token', by: 'route', lands: '/invoice/<token>, else the portal’s Money' },
  { from: '/pay/receipt/:token', by: 'route', lands: '/receipt/<token>, else the portal’s Money' },
  { from: '/my', by: 'route', lands: 'the studio’s portal' },
  { from: '/my/login', by: 'route', lands: '/my/<address>/login' },
  { from: '/my/:slug/p/:token', by: 'route', lands: 'the portal (sign-in first)' },
  { from: '/my/projects/:id', by: 'route', lands: 'the portal — on the section its ?tab= named (OLD_PORTAL_TABS); ?issue= on Issues' },
  { from: '/my/:slug/projects/:id', by: 'route', lands: 'the portal — on the section its ?tab= named' },
  { from: '/my/engagement/:id', by: 'route', lands: 'the portal' },
  { from: '/my/:slug/team', by: 'route', lands: '/my/<address>/about' },
  { from: '/quote-preview/:token', by: 'route', lands: '/quote/<token>' },
  { from: '/floor-plan/view/:token', by: 'route', lands: '/space/<token>' },
  { from: '/sign/quote-xray/:token', by: 'route', lands: 'the studio’s notice (X-Ray has no client link)' },
  { from: '/copilot/share/:id', by: 'route', lands: '/meeting/<token>, else the studio’s notice' },
  { from: '/hangouts/:eventId', by: 'route', lands: '/hangout/<token>, else the studio’s notice' },
])

export const OLD_ADDRESSES: readonly OldAddress[] = [...SITE, ...APP, ...CLIENT]
/** The fixed ones — what next.config.ts `redirects()` serves. */
export const OLD_REDIRECTS: readonly { source: string; destination: string }[] = OLD_ADDRESSES.flatMap((a) => (a.to ? [{ source: a.from, destination: a.to }] : []))
/** (S35) The website's part of the list, by its old name. */
export const OLD_SITE_ADDRESSES: readonly { from: string; to: string }[] = SITE.map((a) => ({ from: a.from, to: a.to! }))

/* ── The rules for the addresses whose landing depends on their query (proxy.ts) ─────────────────────────────────────────────────── */

type Query = { get(key: string): string | null; has(key: string): boolean }
const enc = encodeURIComponent
/** An id as an address segment may carry it — 1.0's uuids, 2.0's own ids; never a path, a query or a script. */
const idOf = (v: string | null | undefined): string | null => (v && v.length <= 120 && /^[A-Za-z0-9_.:-]+$/.test(v) ? v : null)
/** The way back a 2.0 link carried (`?from=`) rides on to the landing. */
const keepFrom = (to: string, q: Query) => { const f = q.get('from'); return f && f.startsWith('/') && !f.startsWith('//') ? `${to}${to.includes('?') ? '&' : '?'}from=${enc(f)}` : to }

/**
 * 1.0's Accounts Setup tabs (`/accounts?tab=<id>`, its MENU_GROUPS) and the 2.0 card that holds each one's job — the sweep's §7 — with 1.0's
 * own aliases (`assemblies` → Packages, the five `portal-*` → the portal hub). A card lands by its anchor (useHashLanding).
 */
export const OLD_ACCOUNTS_TABS: Readonly<Record<string, string>> = {
  /* Studio */
  team: '/company/members',
  'legal-entities': '/company/profile#entities',
  roles: '/settings?section=studio#studio-roles',
  usage: '/company/reports/health',
  /* Lead Management */
  'lead-experience': '/settings?section=leads',          // Journey excluded (LM-01)
  funnel: '/settings?section=leads#lead-stages',
  categories: '/settings?section=leads',                // dead in 1.0 (LM-06)
  'lead-sources': '/settings?section=leads#lead-sources',
  fields: '/settings?section=leads#custom-fields',
  'lead-webhooks': '/company/integrations#webhooks',
  /* Quotes & Pricing */
  'quote-categories': '/settings?section=quotes#trades',
  'document-templates': '/company/templates/quotes',
  'signing-documents': '/company/templates/contracts',
  'quote-templates': '/company/price-book/sections',     // Packages = My Sections
  assemblies: '/company/price-book/sections',
  'quote-rules': '/company/price-book/sections',         // Starter Quote: My Sections with property-type tags (templates Q-07)
  catalogue: '/company/price-book',
  approval: '/settings?section=quotes#quote-approval',
  'quote-sharing': '/settings?section=quotes',           // nothing to port (templates Q-09)
  /* Workflow */
  'workflow-rules': '/settings?section=projects#owner-approvals',
  'feature-flags': '/company/profile#registrations',    // the one flag with a setting left: CaseTrust, on the studio's registrations
  'proactive-alerts': '/settings?section=projects#schedule-settings',
  'ai-logic': '/settings?section=leads',                // dead in 1.0 (LM-11)
  /* Projects */
  'project-types': '/settings?section=projects',        // the Won step's three types (Leads Q-34)
  'timeline-templates': '/company/templates/schedules',
  stages: '/settings?section=leads#lead-stages',        // 1.0's legacy pipeline stages (LM-12)
  'material-catalog': '/company/materials',
  'escalation-categories': '/settings?section=projects#ticket-categories',
  /* Finance */
  milestones: '/company/templates/payments',             // Project & Payments: the payment % per milestone
  'payment-schedules': '/company/templates/payments',
  'expense-categories': '/settings?section=finance#expense-categories',
  commissions: '/settings?section=finance#commission-settings',
  'po-settings': '/settings?section=finance#cost-settings',
  numbering: '/settings?section=finance#document-numbers',
  'payment-methods': '/settings?section=finance#payment-settings',
  accounting: '/company/finance/accounting',            // Xero — where 1.0's sync failures pointed
  /* Branding & Comms */
  'client-portal': '/company/templates/brand',           // 1.0's "Studio Branding"
  accreditations: '/company/templates/brand#marks',
  'chat-identity': '/company/profile',                  // nothing to build (S31): Messages use the studio's name
  'review-link': '/company/profile#reviews',
  /* HomeOwner Portal (+ 1.0's legacy portal-* tabs) */
  portal: '/company/portal',
  'portal-features': '/company/portal', 'portal-branding': '/company/portal', 'portal-scope': '/company/portal', 'portal-team': '/company/portal', 'portal-about': '/company/portal',
  /* AI & Copilot */
  'copilot-tuning': '/settings?section=meetings#meetings-features',
  'objection-responses': '/settings?section=meetings#meetings-answers',
  'meeting-checklists': '/settings?section=meetings#meetings-checklists',
  'competitor-list': '/settings?section=meetings#meetings-competitors',
}
/** 1.0 resolved a group's label as a tab to the group's first entry (`?tab=workflow` → Workflow Rules). */
const ACCOUNTS_GROUPS: Readonly<Record<string, string>> = {
  studio: 'team', 'lead-management': 'lead-experience', 'quotes-&-pricing': 'quote-categories', workflow: 'workflow-rules', projects: 'project-types',
  finance: 'milestones', 'branding-&-comms': 'client-portal', 'homeowner-portal': 'portal', 'ai-&-copilot': 'copilot-tuning',
}
/** `/accounts` (+ `?tab=`) and its three sub-pages. An unknown tab lands on Settings (1.0 showed an empty pane); an unknown sub-page is no
    address at all (the not-found page). */
export function oldAccountsTarget(sub: string | null, q: Query): string | null {
  if (sub === 'roles') return OLD_ACCOUNTS_TABS.roles!
  if (sub === 'usage') return OLD_ACCOUNTS_TABS.usage!
  if (sub === 'milestone-templates') return OLD_ACCOUNTS_TABS['timeline-templates']!
  if (sub !== null) return null
  const raw = (q.get('tab') ?? '').trim().toLowerCase().replace(/\s+/g, '-')
  if (!raw) return OLD_ACCOUNTS_TABS.team!
  return OLD_ACCOUNTS_TABS[ACCOUNTS_GROUPS[raw] ?? raw] ?? '/settings'
}

/**
 * 1.0's project page tabs (`/projects/<id>?tab=&sub=`, src/app/(main)/projects/[projectId]/page.tsx) → the 2.0 view of the project: Overview
 * (details) · Management (milestones → Schedule · tasks → Tasks · materials → Choices · floor-plan → Floor plan) · Finance (→ Money) · Files &
 * Docs (→ Files) · Activity · Render (→ Designs); 1.0's older `timeline` / `tasks` tabs were Management; its notifications also wrote
 * `?tab=design&designSubTab=floor-plan` and `&financeSubTab=contract`. A milestone (`&milestone=`) and an invoice (`&focus=`) open on their row.
 */
export function oldProjectTarget(id: string, q: Query): string | null {
  if (!q.has('tab') || ['tickets', 'insights', 'new'].includes(id) || !idOf(id)) return null   // only 1.0's links carry `tab`; 2.0's never do
  const tab = (q.get('tab') ?? '').toLowerCase()
  const sub = (q.get('sub') ?? '').toLowerCase()
  const base = `/projects/${enc(id)}`
  const open = (slug: string, key: string | null) => { const v = idOf(key ? q.get(key) : null); return `${base}/${slug}${v ? `?open=${enc(v)}` : ''}` }
  let to: string
  if (tab === 'management' || tab === 'timeline' || tab === 'tasks') {
    const s = tab === 'tasks' ? 'tasks' : sub
    to = s === 'tasks' ? `${base}/tasks` : s === 'materials' ? `${base}/choices` : s === 'floor-plan' ? `${base}/floor-plan` : open('schedule', 'milestone')
  } else if (tab === 'finance') to = open('money', 'focus')
  else if (tab === 'design') to = (q.get('designSubTab') ?? '').toLowerCase() === 'floor-plan' ? `${base}/floor-plan` : `${base}/choices`
  else if (tab === 'files-docs' || tab === 'files') to = `${base}/files`
  else if (tab === 'activity') to = `${base}/activity`
  else if (tab === 'render') to = `${base}/designs`
  else to = base   // details — 1.0's Overview — and any tab 1.0 no longer had
  return keepFrom(to, q)
}

/** `/leads` as 1.0's links opened it: `?leadId=` (every notification and email) or `?openLead=` (its own pages) opens the lead; `?quoteId=` the
    quote; `&openQuote=true` the lead's quotes. Anything else is the listing, untouched (null). */
export function oldLeadsTarget(q: Query): string | null {
  const quote = idOf(q.get('quoteId'))
  if (quote) return keepFrom(`/quotes/${enc(quote)}`, q)
  const lead = idOf(q.get('leadId') ?? q.get('openLead'))
  if (!lead) return null
  return keepFrom(`/leads/${enc(lead)}${q.get('openQuote') === 'true' ? '/quotes' : ''}`, q)
}

/** `/leads/<id>/quote-preview-popout?quoteId=` — the Quote Digitizer's pop-out preview: the quote's Preview, else the lead's quotes. */
export const oldQuotePopoutTarget = (leadId: string, q: Query): string => {
  const quote = idOf(q.get('quoteId'))
  return quote ? `/quotes/${enc(quote)}/preview` : `/leads/${enc(leadId)}/quotes`
}

/** `/inbox` (Chats): a lead's "new chat" (`?newChat=<phone>&leadId=<id>`) opens that lead's conversation; a 2.0 conversation's key opens it;
    1.0's own chat ids name no 2.0 record, so they land on Messages. */
export function oldInboxTarget(q: Query): string {
  const lead = idOf(q.get('leadId'))
  if (lead) return `/chat?open=${enc(`lead:${lead}`)}`
  const chat = q.get('chat') ?? ''
  return /^(project|team|lead-team|lead|chat):[A-Za-z0-9_.-]+$/.test(chat) ? `/chat?open=${enc(chat)}` : '/chat'
}

/**
 * The one entry proxy.ts calls: where an address that 1.0 printed, and that only its query can place, lands — or null (not an old address;
 * the request goes on as it is). Pure.
 */
export function oldQueryTarget(pathname: string, q: Query): string | null {
  const seg = pathname.split('/').filter(Boolean)
  if (seg[0] === 'leads') {
    if (seg.length === 1) return oldLeadsTarget(q)
    if (seg.length === 3 && seg[2] === 'quote-preview-popout' && idOf(seg[1])) return oldQuotePopoutTarget(seg[1]!, q)
    return null
  }
  if (seg[0] === 'projects' && seg.length === 2) return oldProjectTarget(decodeURIComponent(seg[1]!), q)
  if (seg[0] === 'inbox' && seg.length <= 2) return oldInboxTarget(q)
  if (seg[0] === 'accounts' && seg.length <= 2) return oldAccountsTarget(seg[1] ?? null, q)
  return null
}

/* ── The rules a lookup route applies after its record read (lib/links/old-links.ts) ───────────────────────────────────────────────── */

/** 1.0's Finance › Operations tabs (with its own legacy names: vos → Contracts, review → Overview) → the 2.0 tab that holds each register. */
export const OLD_OPERATIONS_TABS: Readonly<Record<string, string>> = {
  overview: '/company/finance/todo', review: '/company/finance/todo',
  invoices: '/company/finance/money-in',
  receipts: '/company/finance/money-in?kind=payments',
  contracts: '/company/finance/money-in?kind=variations', vos: '/company/finance/money-in?kind=variations',   // its signed quotes and VOs
  pos: '/company/finance/money-out?kind=purchase-orders',
  bills: '/company/finance/money-out?kind=bills',
  expenses: '/company/finance/money-out?kind=expenses',
}

/** 1.0's client portal tabs (`/my/projects/<id>?tab=`, with its LEGACY_TAB_MAP) → the section of 2.0's portal ('' = Home). */
export const OLD_PORTAL_TABS: Readonly<Record<string, string>> = {
  overview: '', updates: 'updates', scope: '', about: 'about',
  design: 'designs', renders: 'designs', moodboard: 'designs', selections: 'choices', 'floor-plan': 'floor-plan',
  finance: 'money', documents: 'files',
  messages: 'issues', issues: 'issues', support: 'issues', chat: 'messages',
}
export const oldPortalSection = (tab: string | null | undefined): string => OLD_PORTAL_TABS[(tab ?? '').toLowerCase()] ?? ''

/** 1.0's `/finance/<tab>` query names that 2.0 reads by another (Vendors' `?vendorId=` is 2.0's `?open=`). */
export function oldFinanceQuery(tab: string, sp: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  if (tab !== 'vendors' || typeof sp.vendorId !== 'string' || sp.open) return sp
  const { vendorId, ...rest } = sp
  return { ...rest, open: vendorId }
}
