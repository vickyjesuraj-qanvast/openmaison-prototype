/**
 * (parity map, PR-022 · MI-007 · MO-098 · FB-114 · FR-040 — his "build everything that's in 1.0" 2026-10-10; F-16 · F2-Q14 · REG-1310 lifted)
 * The studio's five roles, and the ONE place that splits *running the studio* from *keeping its books*. 1.0 tagged a bookkeeper
 * `accounting` (src/lib/access-control.ts): finance pages only, never leads or projects (PR-022), landing on Finance (FR-040). 2.0's
 * Accounting keeps that job in 2.0's shape:
 *
 *   runsStudio   Owner · Admin            — approvals (invoices, POs, expenses, handovers), what was agreed (a project's value, its payment
 *                                           split, a variation order), commission rates and asks, every Settings rule. Unchanged.
 *   seesBooks    Owner · Admin · Accounting — every project's money, profit and margin, cost totals, vendors' balances and bank details,
 *                                           everyone's commission, Company › Reports › Finance.
 *   runsMoney    Owner · Admin · Accounting — what a money row offers that is neither an approval nor a change to what was agreed: record,
 *                                           confirm and reverse a client's payment, invoices and reminders, voids, credit notes and refunds,
 *                                           bills, expenses, paying out, a PO's delivery, a PO made elsewhere, vendors, Xero, exports.
 *
 * Accounting is on no lead and no project (`onLeads`): the house pickers leave them out and `worksOn` never counts them, so nothing that
 * follows a project's team reaches them. What they open is `opensPath` — the shell's gate and the pages read the same list. Pure,
 * client-safe; no imports, so every rule file may read it.
 *
 * (S44O — call C6 · UAT row 313, IDL's "a marketing person sees only lead things"; as recommended — his UAT ask 2026-10-15) A SIXTH fixed role,
 * **Marketing**, on Accounting's pattern — the studio's lead desk: the Leads pipeline (every lead — the leads they hand out, so Who sees leads'
 * "only their own" never narrows it, as for Owners and Admins), putting any member on a lead, Company › Reports › Leads, Settings › Lead
 * management and Company › Integrations' lead capture (`runsLeadSetup`). Never a quote's or a contract's money, a project or Finance; no cost
 * sight (lib/settings/cost-visibility.ts knows no Marketing switch); never put on a lead or a project themselves (`onLeads`). No roles editor
 * (REG-645 holds). What they open is `opensPath` too.
 */

export const ACCOUNTING = 'Accounting'
/** A member in Accounting — the studio's bookkeeper. */
export const isAccounting = (role: string | null | undefined): boolean => role === 'Accounting'
/** (S44O — call C6) A member in Marketing — the studio's lead desk. */
export const MARKETING = 'Marketing'
export const isMarketing = (role: string | null | undefined): boolean => role === 'Marketing'
/** (S44O — call C6) Whose work is the whole pipeline: they see every lead under either Who sees leads rule and put any member on one —
    Owners, Admins and Marketing. */
export const runsLeads = (role: string | null | undefined): boolean => runsStudio(role) || isMarketing(role)
/** (S44O — call C6) Who changes the lead set-up — Settings › Lead management and Company › Integrations' lead capture — and reads Company ›
    Reports › Leads: Owners, Admins and Marketing. */
export const runsLeadSetup = (role: string | null | undefined): boolean => runsStudio(role) || isMarketing(role)
/** Owners and Admins: the approvals, the rules and what was agreed (the rule every gate read before the role came). */
export const runsStudio = (role: string | null | undefined): boolean => role === 'Owner' || role === 'Admin'
/** Seeing the books — every project's money, profit and margin, the cost totals, the finance reports. */
export const seesBooks = (role: string | null | undefined): boolean => runsStudio(role) || isAccounting(role)
/** Running the money — recording, paying, sending and correcting; never approving and never changing what was agreed. */
export const runsMoney = (role: string | null | undefined): boolean => runsStudio(role) || isAccounting(role)
/** Whether a member may be put on a lead or a project (and so be its owner) — Accounting never is; (S44O — C6) nor Marketing, who hands
    leads to the members who work them. */
export const onLeads = (role: string | null | undefined): boolean => !isAccounting(role) && !isMarketing(role)
/** Whether a member opens the studio's workspace — the Leads pipeline, Projects, Messages, the Tools, Qanvast Ops and Company's other
    sections. Accounting opens the books only (`opensPath`); (S44O — C6) Marketing the leads only — so neither takes an AI tools seat. */
export const opensWorkspace = (role: string | null | undefined): boolean => !isAccounting(role) && !isMarketing(role)

/** Accounting's own place — Company › Finance › To do (1.0 landed them on Finance, FR-040): the house gate's door, a project's crumb for them.
    (the Dashboard redesigned, Q-08) Their front door is the Dashboard now (`homeOfRole`); this stays the books' home. */
export const ACCOUNTING_HOME = '/company/finance'
/** (S44O — C6) Where a member lands when an address isn't theirs, and where View as takes them: every role's Dashboard (Marketing's is the
    leads' own). (the Dashboard redesigned, 2026-10-26 — his Q-08: "Accounting's front door: the Dashboard, in its money layout") Accounting's
    too now — its page is the books' (Owed to you · Coming in · You owe · GST, Finance's To do as Needs you, the week's money in and out); the
    Finance › To do door stays in their rail (Company › Finance). */
export const homeOfRole = (_role: string | null | undefined): string => '/dashboard'
/** (S44O — C6) What the house gate says of a role that may not open an address — its sentence and its one press. *(invented copy)* */
export function roleGate(role: string | null | undefined): { help: string; label: string; href: string } {
  if (isMarketing(role)) return { help: 'Marketing looks after the studio’s leads — Leads, Reports › Leads, Settings › Lead management and Company › Integrations. An Owner or an Admin sets roles in Company › Members.', label: 'Go to Leads', href: '/leads' }
  return { help: 'Accounting keeps the studio’s books — Finance, Reports › Finance and each project’s Money and Files. An Owner or an Admin sets roles in Company › Members.', label: 'Go to Finance', href: ACCOUNTING_HOME }
}
/** (S44O — call C6) What Maison AI tells a Marketing member of the quotes, the projects and the books. *(invented copy)* */
export const ON_DESK = 'Quotes, projects and the books are the designers’, the approvers’ and Accounting’s — Marketing looks after the leads.'
/** (S44O — C6) The words a refused action of the workspace's ends on — "… — Accounting keeps the books". *(invented copy)* */
export const roleScope = (role: string | null | undefined): string => (isMarketing(role) ? 'Marketing looks after the leads' : 'Accounting keeps the books')
/** (pending modules S07 — the steps' note after S06) Where a project's crumb and Back lead when nothing else is named: the Projects listing —
    or, for Accounting, who opens no listing (it is the house gate for them), Finance, their home. */
export const projectsHome = (role: string | null | undefined): { label: string; href: string } =>
  isAccounting(role) ? { label: 'Finance', href: ACCOUNTING_HOME } : { label: 'Projects', href: '/projects' }
/** (parity map, PR-022) A project's views an Accounting member opens: its Money, and its Files for a payment's proof, an invoice, a bill. */
export const ACCOUNTING_PROJECT_SLUGS: readonly string[] = ['money', 'files']

/* The addresses an Accounting member opens. Everything else in the studio's app lands on the house gate (components/shell/access-gate.tsx).
   Public links (/invoice, /receipt, /po, /f, /sign, /my …) never pass through the shell, so they are not listed. */
const ACCOUNTING_PATHS: readonly RegExp[] = [
  /^\/company\/finance(\/|$)/,   // every Finance tab, Xero included
  /^\/company\/reports(\/|$)/,   // Reports lands them on Finance; the Leads and Projects tabs keep their own gate
  /^\/finance(\/|$)/,   // Finance's old addresses (each redirects) and a document's file
  /* a project's address and each of its views: the page itself lands Accounting on Money and keeps the frame over any other view with its own
     gate (app/projects/[id]/[tab] — ProjectViewGate), so the shell's net lets them through */
  /* (S44 closing regression, 2026-10-15) `tickets` and `insights` are the studio's pages, not a project's id — the pattern let Accounting
     past Tickets' gate once S44Z moved that page onto refusesPath */
  /^\/projects\/(?!(tickets|insights)(\/|$))[^/]+(\/[^/]+)?\/?$/,
  /^\/projects\/[^/]+\/(money|files)(\/|$)/,
  /^\/projects\/[^/]+\/media\//,   // a file's picture
  /^\/projects\/[^/]+\/(invoices|receipts|credit-notes|purchase-orders|selection-receipts)\//,   // the papers a money row opens — (pending modules S07) and a selection receipt, a paper in the project's Files they read
  /^\/quotes\/[^/]+\/preview\/?$/,   // a quote or a variation order a money row links to — read-only
  /^\/tasks\/?$/,   // their own tasks
  /^\/settings\/?$/,   // Settings, read-only (it opens on Finance for them)
  /^\/files\//,   // a file's bytes and thumbnails
  /^\/profile\/?$/,   // (pending modules S01) Your profile — everyone's own
  /^\/dashboard\/?$/,   // (pending modules S22) the Dashboard — theirs is the books: To do's count, their tasks, what is owed and the month's profit
]

/* (S44O — call C6) The addresses a Marketing member opens: the Leads pipeline — every lead's Overview and its own tabs, but its Quotes, Contracts
   and Meetings (a quote's money and the designer's meeting brief) — Reports › Leads, Settings (it opens on Lead management for them) and Company
   › Integrations (lead capture). Never a quote, a contract, a project, Finance or a Tool. */
const MARKETING_PATHS: readonly RegExp[] = [
  /^\/leads\/?$/,   // the listing
  /^\/leads\/imports(\/|$)/,   // the imports and their skipped rows
  /^\/leads\/insights\/?$/,   // (REG-1361) a redirect to Reports › Leads
  /^\/leads\/(?!imports\/?$|insights\/?$)[^/]+\/?$/,   // a lead's Overview
  /^\/leads\/[^/]+\/(tasks|files|notes|questionnaire|activity)(\/|$)/,   // its own tabs (a file's viewer among them)
  /^\/company\/reports(\/leads)?\/?$/,   // Reports opens on Leads for them; its other tabs keep their own gate
  /^\/company\/integrations\/?$/,   // lead capture
  /^\/tasks\/?$/,   // their own tasks
  /^\/settings\/?$/,   // Settings — Lead management, theirs to change
  /^\/files\//,   // a file's bytes and thumbnails
  /^\/profile\/?$/,   // Your profile — everyone's own
  /^\/dashboard\/?$/,   // the Dashboard — theirs is the leads': what waits, their tasks, the pipeline's figure
]

/** Whether `role` opens `pathname` (an address without its query). Every role but Accounting and Marketing opens everything the shell offers;
    their own page rules (Who sees leads, the money rule) still decide what they find there. */
export function opensPath(role: string | null | undefined, pathname: string): boolean {
  const list = isAccounting(role) ? ACCOUNTING_PATHS : isMarketing(role) ? MARKETING_PATHS : null
  if (!list) return true
  const path = pathname.split('?')[0]!.split('#')[0]!
  return list.some((re) => re.test(path))
}

/** (parity map, PR-022) Whether `role` opens this view of a project ('' = its Overview, which lands an Accounting member on Money). */
export const opensProjectView = (role: string | null | undefined, slug: string): boolean => !isAccounting(role) || ACCOUNTING_PROJECT_SLUGS.includes(slug)
