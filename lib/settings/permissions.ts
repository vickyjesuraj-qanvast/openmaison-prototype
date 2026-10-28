/**
 * (REG-645, settings parity Q-03) Settings › Studio › Who may do what — the four roles against every action 2.0 checks, computed from the
 * same rule functions the actions and pages call, so the table cannot drift from what the app enforces. Read-only: custom roles and a
 * permissions editor stay held (leads parity Q-40). Pure, client-safe.
 * (parity map, FB-114 · PR-022 · MO-098) A fifth column, Accounting: the books' areas (Studio, Money in, Money out, Profit and commission) read
 * the same rule functions; every other area is closed to them by the one rule the shell's gate and the pages read (lib/settings/roles.ts
 * `opensPath` — the Leads pipeline, a project's other views, the Tools and Company's other sections), so its cells say No — but for a project's
 * Money and Files, which they open.
 */
import { assignableIds, canSeeLead, runsStudio } from '@/lib/leads/assign-policy'
import { canDeleteQuote } from '@/lib/quotes/policy'
import { canDeleteContract, unsignBlock } from '@/lib/contracts/policy'
import { canDeleteComparison } from '@/lib/xray/policy'
import { approves, changesPayments, type LeadVisibility, type QuoteApproval, type TemplateApproval } from '@/lib/settings/types'
import type { Member } from '@/lib/db/schema'
import { addBlock, detailsBlock, payNowBlock } from '@/lib/company/member-rules'
import { runsBook } from '@/lib/company/price-book-rules'
import { folderBlock, folderChangeBlockFor } from '@/lib/company/folder-libraries'
import { designChangeBlock, materialChangeBlock, roomDeleteBlock } from '@/lib/visualizer/policy'
import { templateChangeBlock } from '@/lib/company/template-rules'
import { mayBuyCredits, mayChangePlan, maySetAmounts, usageReach } from '@/lib/credits/policy'
import { mayRunPortal } from '@/lib/portal/model'
import { worksOn } from '@/lib/projects/policy'
import { approvesInvoices, marksVariationApproved, voidsInvoices } from '@/lib/projects/invoices-model'
import { mayCreateProject } from '@/lib/projects/policy'   // (Projects round 7)
import { mayReviewUpdate, publishesAtOnce } from '@/lib/projects/updates-model'
import { completesAnyway, completesAtOnce, deletesProject, reopensProject, reviewsHandover } from '@/lib/projects/handover-model'
import { recordsPayments, reversesPayments } from '@/lib/projects/payments-model'   // (Projects round 6)
import { answersSchedule, asksForTime, doneAtOnce, sharesAtOnce } from '@/lib/projects/schedule-rules'   // (gaps build, package C)
import { isAccounting, isMarketing, runsLeadSetup, runsMoney, seesBooks } from '@/lib/settings/roles'   // (parity map, FB-114) · (S44O — C6)
import { seesMoney } from '@/lib/projects/policy'
import { DEFAULT_INVOICE_RULES, preparesInvoices, sendsAtOnce } from '@/lib/projects/invoices-model'
import { changesVendor, expenseWaits, paysOut, recordsBill, seesCostFigures } from '@/lib/finance/rules'
import { confirmsPayments } from '@/lib/projects/payments-model'
import { listingBlock } from '@/lib/qanvast-listing/model'   // (pending modules S37)
import { DEFAULT_COST_VISIBILITY, seesCostsAs, type CostVisibility } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { checksCrew, seesContractors } from '@/lib/projects/contractors-model'   // (S45B)

/* (S44O — call C6) Marketing's column sits before Accounting's, as Company › Members lists the roles */
export const ROLE_COLUMNS = ['Owner', 'Admin', 'Manager', 'Designer', 'Marketing', 'Accounting'] as const
export type RoleColumn = (typeof ROLE_COLUMNS)[number]

/** What a role gets: yes · no · only their own records · their own and their team's · as the backup approver · submits for approval. */
export type Reach = 'yes' | 'no' | 'own' | 'team' | 'backup' | 'submit'
  /** (fix-E, E-22) submits for approval, and only on the projects it works on — the reach the plain "submit" lost */
  | 'submit-team' | 'submit-own'
  /** (parity map, PR-022) Accounting: a project opened for its Money and its Files only · a project's files, never a lead's */ | 'money' | 'project'
  /** (S44O — call C6) Marketing: a lead's, never a project's */ | 'lead'
export const REACH_LABEL: Record<Reach, string> = { yes: 'Yes', no: 'No', own: 'Their own', team: 'Their team’s', backup: 'If the backup approver', submit: 'Submits for approval', 'submit-team': 'Submits for approval — their team’s', 'submit-own': 'Submits for approval — their own',
  money: 'Its Money and Files', project: 'A project’s', lead: 'A lead’s' }   // (parity map, FB-114) invented copy · (S44O — C6) "A lead’s"

export type StudioRules = { /** (gaps build F1) Settings › Finance › Costs: POs over the limit · expenses need approval (unset = on) */ poApproval?: boolean; expenseApproval?: boolean
  visibility: LeadVisibility; quoteApproval: QuoteApproval; templateApproval: TemplateApproval; paymentLock: boolean; /** (Projects round 5) Invoices need approval (simplify S-20: switched on Settings › Projects › What waits for an Owner or an Admin); unset = on */ invoiceApproval?: boolean
  /** (Projects round 7) Settings › Projects › Updates need review (unset = on) · Handover needs an owner's review (unset = off) */
  updateReview?: boolean; handoverReview?: boolean
  /** (Projects round 6) Client payments (simplify S-15: Settings › Finance): who confirms a client's payment; unset = the assigned designer */ paymentConfirmer?: 'designer' | 'owner' | 'member'
  /** (gaps build, package C) Settings › Projects › Schedule: Milestone completion needs approval · Schedule changes need approval (unset = off) */
  completionApproval?: boolean; shareApproval?: boolean
  /** (pending modules S41b-1) Roles & access › Who sees costs and margins (unset = every role on, 1.0's default) */ costVisibility?: CostVisibility }

/**
 * (Dane UAT 2.23 · 10.08) Where a row's rule is set — Who may do what links each row a studio can change to that place: a Settings card by
 * its anchor, or the Company page that holds the records. A row whose rule is fixed by its role has none. An `href` that is only `#…` is a
 * card on this same module (pending modules S14: Who sees leads).
 */
export type RulePlace = { href: string; label: string }
/* (pending modules S14) Who sees leads sits on this module now, above the table — the row's link brings its card into view (HelpLink's in-page
   form). A place on another page keeps its address. */
const LEADS_VIS: RulePlace = { href: '#lead-visibility', label: 'Who sees leads, above' }
/* (pending modules S41b-1) Who sees costs and margins sits on this module too, above the table */
const COST_VIS: RulePlace = { href: '#cost-visibility', label: 'Who sees costs and margins, above' }
const MEMBERS: RulePlace = { href: '/company/members', label: 'Company › Members' }
const BOOK: RulePlace = { href: '/company/price-book', label: 'Company › Price book' }
const PLAN: RulePlace = { href: '/company/plan', label: 'Company › Plan & AI credits' }
/** (simplify S-20) Settings › Projects' first card, where every project approval is switched */
const OWNER_OK = 'Projects › Approvals'   // (the calm UI build, 5-33 · W-068) the card's name
const OK_INVOICE: RulePlace = { href: '/settings?section=projects#invoice-approval', label: OWNER_OK }
export const RULE_PLACES: Partial<Record<string, RulePlace>> = {
  members: MEMBERS, owner: MEMBERS, 'member-details': MEMBERS, 'member-paynow': MEMBERS,
  see: LEADS_VIS, assign: LEADS_VIS,
  'cost-line': COST_VIS, 'profit-see': COST_VIS,   // (pending modules S41b-1)
  approve: { href: '/settings?section=quotes#quote-approval', label: 'Quotes & pricing › Quote approval' },
  publish: { href: '/settings?section=quotes#template-approval', label: 'Quotes & pricing › Template approval' },
  payments: { href: '/settings?section=quotes#payment-lock', label: 'Quotes & pricing › Payment schedule' },
  'price-book': BOOK, 'price-book-approve': BOOK,
  'price-book-sections': { href: '/company/price-book/sections', label: 'Company › Price book › Sections' },   // (the calm UI build, 4-39) the tab's name
  'ai-use': PLAN, 'ai-buy': PLAN, 'ai-amounts': PLAN, 'ai-plan': PLAN, 'ai-usage': PLAN,
  'portal-setup': { href: '/company/portal', label: 'Company › Client portal' },   // (Projects r4a)
  /* (simplify S-20, a deliberate change) the project approvals sit together on Settings › Projects' first card, What waits for an Owner or an
     Admin — each row lands on its own switch there (the updates row keeps the Updates card's old anchor) */
  'invoice-send': OK_INVOICE,   // (Projects round 5)
  /* (Projects round 7) the project rows a studio can change */
  'project-update': { href: '/settings?section=projects#update-settings', label: OWNER_OK },   // (fix-E, E-22) lands on its row
  'project-handover': { href: '/settings?section=projects#handover-review', label: OWNER_OK },
  'project-see': LEADS_VIS,
  'project-members': LEADS_VIS,   // (parity P-38) a project's members are its lead's — the same reach as a lead's
  'payment-confirm': { href: '/settings?section=finance#payment-settings', label: 'Settings › Finance › Client payments' },   // (Projects round 6) · (one-home N-14) the card's name · (simplify S-15) on Settings › Finance
  /* (gaps build, package C) the schedule's two approvals */
  'project-milestone-done': { href: '/settings?section=projects#done-approval', label: OWNER_OK },
  'project-schedule-share': { href: '/settings?section=projects#share-approval', label: OWNER_OK },
  /* (gaps build F1) money out's two approvals — set with the costs (Settings › Projects' approvals card names them and links here) */
  /* (the calm UI build, 5-28 · W-039) Settings' Finance module by its full path — Company › Finance › Costs is the list, this is its rules */
  'po-send': { href: '/settings?section=finance#cost-settings', label: 'Settings › Finance › Costs' },
  'expense-log': { href: '/settings?section=finance#cost-settings', label: 'Settings › Finance › Costs' },
  'bill-approve': { href: '/settings?section=finance#cost-settings', label: 'Settings › Finance › Costs' },   // (S44R, C8)
  /* (gaps build F2) the books' rules */
  'commission-run': { href: '/settings?section=finance#commission-settings', label: 'Settings › Finance › Commission' },
  'credit-issue': { href: '/settings?section=finance#credit-settings', label: 'Settings › Finance › Credit notes' },   // (simplify S-15) back on Settings › Finance, under Money in
}
/**
 * (parity P-38, D-18) The areas the table is grouped by, in Settings' module order (Studio · Leads · Projects · … · Finance), each with the card
 * table's group caption — so a lead's rows and a project's sit together and read alike ("See a lead" / "See a project"). Every row names its area
 * in `AREA_OF`; a row added later adds its key there (else it falls under Studio).
 */
export const PERMISSION_AREAS = ['Studio', 'Leads', 'Projects', 'Client portal', 'Quotes and contracts', 'Templates and the price book', 'Money in', 'Money out', 'Profit and commission', 'Design tools', 'AI credits and the plan'] as const
export type PermissionArea = (typeof PERMISSION_AREAS)[number]
/** (the calm UI build 2026-10-27, T-01) How each area's caption reads — Finance's two lists are Client payments and Costs on screen. The keys
    stay (each group's test id is its key's); only the words change. */
export const AREA_LABEL: Record<PermissionArea, string> = {
  'Studio': 'Studio', 'Leads': 'Leads', 'Projects': 'Projects', 'Client portal': 'Client portal', 'Quotes and contracts': 'Quotes and contracts',
  'Templates and the price book': 'Templates and the price book', 'Money in': 'Client payments', 'Money out': 'Costs', 'Profit and commission': 'Profit and commission',
  'Design tools': 'Design tools', 'AI credits and the plan': 'AI credits and the plan',
}
const AREA_OF: Record<string, PermissionArea> = {
  settings: 'Studio', members: 'Studio', owner: 'Studio', 'member-details': 'Studio', 'member-paynow': 'Studio', 'sent-messages': 'Studio', 'studio-compliance': 'Studio', 'qanvast-listing': 'Studio',
  see: 'Leads', assign: 'Leads', 'delete-lead': 'Leads', insights: 'Leads', 'files-change': 'Leads', 'lead-setup': 'Leads',
  'project-see': 'Projects', 'project-members': 'Projects', 'project-create': 'Projects', 'project-change': 'Projects', 'project-hold': 'Projects', 'project-client': 'Projects',
  'project-schedule': 'Projects', 'project-milestone-done': 'Projects', 'project-schedule-share': 'Projects', 'project-milestone-more': 'Projects', 'project-schedule-answer': 'Projects',
  'project-update': 'Projects', 'project-update-approve': 'Projects', 'project-choices': 'Projects', 'project-floor-plan': 'Projects', 'layout-project': 'Projects',
  'project-tickets': 'Projects', 'project-messages': 'Projects', 'project-compliance': 'Projects', 'project-workload': 'Projects', 'project-capacity': 'Projects',
  'crew-assign': 'Projects', 'crew-check': 'Projects', 'crew-see': 'Projects', 'crew-mark': 'Money out',   // (S45B)
  'project-handover': 'Projects', 'project-handover-anyway': 'Projects', 'project-handover-review': 'Projects', 'project-handover-withdraw': 'Projects',
  'project-reopen': 'Projects', 'project-remake': 'Projects', 'project-delete': 'Projects',
  'portal-setup': 'Client portal', 'portal-access': 'Client portal', 'client-messages': 'Client portal', 'about-page': 'Client portal',
  'cost-line': 'Quotes and contracts',   // (pending modules S41b-1)
  approve: 'Quotes and contracts', payments: 'Quotes and contracts', 'delete-quote': 'Quotes and contracts', 'delete-contract': 'Quotes and contracts', unsign: 'Quotes and contracts', 'delete-xray': 'Quotes and contracts',
  publish: 'Templates and the price book', 'price-book': 'Templates and the price book', 'price-book-approve': 'Templates and the price book', 'price-book-sections': 'Templates and the price book', folders: 'Templates and the price book', 'file-template': 'Templates and the price book',
  'project-money': 'Money in', 'project-vo': 'Money in', 'invoice-send': 'Money in', 'invoice-void': 'Money in', 'vo-approved': 'Money in', 'payment-record': 'Money in', 'payment-confirm': 'Money in', 'payment-reverse': 'Money in', 'credit-issue': 'Money in',
  'cost-see': 'Money out', 'cost-figures': 'Money out', 'po-prepare': 'Money out', 'po-send': 'Money out', 'po-approve': 'Money out', 'bill-record': 'Money out', 'bill-approve': 'Money out', 'expense-log': 'Money out', 'expense-approve': 'Money out', 'pay-out': 'Money out', 'vendor-add': 'Money out', 'vendor-change': 'Money out',
  'profit-see': 'Profit and commission', 'commission-see': 'Profit and commission', 'commission-ask': 'Profit and commission', 'commission-run': 'Profit and commission', 'commission-pay': 'Profit and commission', xero: 'Profit and commission',
  'viz-design': 'Design tools', 'viz-room': 'Design tools', 'viz-folder': 'Design tools', materials: 'Design tools', 'layout-start': 'Design tools',
  'ai-use': 'AI credits and the plan', 'ai-buy': 'AI credits and the plan', 'ai-amounts': 'AI credits and the plan', 'ai-plan': 'AI credits and the plan', 'ai-usage': 'AI credits and the plan',
}
export type PermissionRow = { key: string; action: string; /** (parity P-38) the group it is listed under */ area: PermissionArea; reach: Record<RoleColumn, Reach> }
/** (parity P-38) The rows in their areas, in `PERMISSION_AREAS`' order (each area's rows as `permissionRows` lists them); empty areas left out. */
export function permissionGroups(rows: PermissionRow[]): { area: PermissionArea; rows: PermissionRow[] }[] {
  return PERMISSION_AREAS.map((area) => ({ area, rows: rows.filter((r) => r.area === area) })).filter((g) => g.rows.length > 0)
}

/* Stand-in ids: "me" is the role holder, "mine" a Designer reporting to them, "other" anyone else. */
const ME = 'me', MINE = 'mine', OTHER = 'other'
const team = [ME, MINE, OTHER].map((id) => ({ id })) as Member[]
const own = (mayAny: boolean, mayOwn: boolean): Reach => (mayAny ? 'yes' : mayOwn ? 'own' : 'no')

/** (parity map, FB-114) The areas an Accounting member works in — the books, and the Studio's own rows; every other area is closed to them. */
const BOOKS_AREAS: readonly PermissionArea[] = ['Studio', 'Money in', 'Money out', 'Profit and commission']
/** (S44O — call C6) The areas a Marketing member works in — the leads, and the Studio's own rows; every other area is closed to them. */
const LEADS_AREAS: readonly PermissionArea[] = ['Studio', 'Leads']
/** A row's cells, each from the rule its action reads. Accounting's cell is the same rule's answer in the books' areas, 'No' elsewhere (the
    pages' gate) — or `accounting`, when the area is closed but a door is open (a project's Money and Files). (S44O — C6) Marketing's likewise
    in the leads' areas — or `marketing`, a narrower answer (a lead's files, never a project's). */
function row(key: string, action: string, of: (role: RoleColumn) => Reach, accounting?: Reach, marketing?: Reach): PermissionRow {
  const area = AREA_OF[key] ?? 'Studio'
  const cell = (r: RoleColumn): Reach => (isAccounting(r) ? accounting ?? (BOOKS_AREAS.includes(area) ? of(r) : 'no')
    : isMarketing(r) ? marketing ?? (LEADS_AREAS.includes(area) ? of(r) : 'no') : of(r))
  return { key, action, area, reach: Object.fromEntries(ROLE_COLUMNS.map((r) => [r, cell(r)])) as Record<RoleColumn, Reach> }
}

export function permissionRows(rules: StudioRules): PermissionRow[] {
  const costs = rules.costVisibility ?? DEFAULT_COST_VISIBILITY   // (pending modules S41b-1)
  const viewer = (role: RoleColumn) => ({ id: ME, role, teamIds: role === 'Manager' ? [MINE] : [], visibility: rules.visibility })
  const rows: PermissionRow[] = [
    row('settings', 'Change the studio’s settings', (r) => (runsStudio(r) ? 'yes' : 'no')),
    /* (pending modules S09) Add member invites — send again and cancel the invitation are the same rule */
    row('members', 'Add and invite members, deactivate and reactivate them; set roles', (r) => (addBlock({ id: ME, role: r }, 'Designer') === null ? 'yes' : 'no')),
    row('owner', 'Make, unmake or deactivate an Owner', (r) => (addBlock({ id: ME, role: r }, 'Owner') === null ? 'yes' : 'no')),   // (REG-646) the Owner rules
    /* (pending modules S01) Your profile and Members › Edit details — an Owner's details only an Owner changes (the refusal says so in the row) */
    row('member-details', 'Change a member’s name, email, phone and photo', (r) => own(detailsBlock({ id: ME, role: r }, { id: OTHER, role: 'Designer' }) === null, detailsBlock({ id: ME, role: r }, { id: ME, role: r }) === null)),
    /* (pending modules S14) Your profile › Your PayNow for everyone, Members for Owners and Admins — the action's own rule */
    row('member-paynow', 'Set a member’s PayNow', (r) => own(payNowBlock({ id: ME, role: r }, OTHER) === null, payNowBlock({ id: ME, role: r }, ME) === null)),
    /* (parity P-38) one grammar with the project's rows: "See a lead" · "See a project", "Change a lead’s members" · "Change a project’s members" */
    row('see', 'See a lead', (r) => {
      const v = viewer(r)
      return canSeeLead(v, [OTHER]) ? 'yes' : canSeeLead(v, [MINE]) ? 'team' : canSeeLead(v, [ME]) ? 'own' : 'no'
    }),   // (parity map, PR-022) Accounting: No — the Leads pipeline is never theirs
    row('assign', 'Change a lead’s members', (r) => {
      const ids = assignableIds(viewer(r), team)
      return ids.includes(OTHER) ? 'yes' : ids.includes(MINE) ? 'team' : ids.includes(ME) ? 'own' : 'no'
    }),
    row('delete-lead', 'Delete a lead', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('insights', 'See Company › Reports › Leads', (r) => (runsLeadSetup(r) ? 'yes' : 'no')),   // (parity P-38) the page REG-1361 moved it to · (S44O — C6) Marketing's too
    /* (S44O — call C6) the lead set-up: Settings › Lead management and Company › Integrations' lead capture */
    row('lead-setup', 'Change Settings › Lead management and Company › Integrations’ lead capture', (r) => (runsLeadSetup(r) ? 'yes' : 'no')),
  ]
  if (rules.quoteApproval === 'required') rows.push(row('approve', 'Approve a quote', (r) => (approves(r, ME, null) ? 'yes' : approves(r, ME, ME) ? 'backup' : 'no')))
  rows.push(
    row('publish', 'Publish a quote template', (r) => (rules.templateApproval === 'not-required' || approves(r, ME, null) ? 'yes' : 'submit')),   // the backup approver publishes too — the card's footnote says so
    row('payments', 'Change a quote’s payment schedule', (r) => (changesPayments(r, rules.paymentLock) ? 'yes' : 'no')),
    /* (pending modules S41b-1 — 1.0's Cost & Margin Visibility) the Owner's switch per role */
    row('cost-line', 'See a quote line’s cost, mark-up and margin, and the price book’s costs', (r) => (seesCostsAs(r, costs) ? 'yes' : 'no')),
    row('delete-quote', 'Delete a quote', (r) => own(canDeleteQuote({ id: ME, role: r }, { createdBy: OTHER }), canDeleteQuote({ id: ME, role: r }, { createdBy: ME }))),
    row('delete-contract', 'Delete a contract', (r) => own(canDeleteContract({ id: ME, role: r }, { createdBy: OTHER }), canDeleteContract({ id: ME, role: r }, { createdBy: ME }))),
    row('unsign', 'Move a studio-signed contract back', (r) => (unsignBlock({ status: 'Signed', signedBy: null }, { id: ME, role: r }) === null ? 'yes' : 'no')),
    row('delete-xray', 'Delete a Quote X-Ray comparison', (r) => own(canDeleteComparison({ id: ME, role: r }, OTHER), canDeleteComparison({ id: ME, role: r }, ME))),
    /* (REG-652, price book parity Q-03 · Q-04) The price book: Owners and Admins change it; anyone else proposes an item for approval. */
    row('price-book', 'Add or change items in the price book', (r) => (runsBook({ id: ME, role: r }) ? 'yes' : 'submit')),
    row('price-book-approve', 'Approve a proposed price book item', (r) => (runsBook({ id: ME, role: r }) ? 'yes' : 'no')),
    row('price-book-sections', 'Save or change the price book’s sections', (r) => (runsBook({ id: ME, role: r }) ? 'yes' : 'no')),
    /* (REG-664) Folders in Templates and the Price book: Owners and Admins make, rename, move and delete them; an entry is filed by whoever
       may rename it — a template by its author (a quote template, which keeps no author, by an Owner or an Admin). */
    row('folders', 'Make, rename, move and delete folders in Templates and the Price book', (r) => (folderBlock({ role: r }) === null ? 'yes' : 'no')),
    row('file-template', 'Move a template into a folder', (r) => own(templateChangeBlock({ id: ME, role: r }, OTHER) === null, templateChangeBlock({ id: ME, role: r }, ME) === null)),
    /* (REG-673, audit 2026-09-26 F076 · F124) The AI Visualizer and Company › Materials: whoever made it, an Owner or an Admin. */
    row('viz-design', 'Rename or delete an AI Visualizer design', (r) => own(designChangeBlock({ id: ME, role: r }, OTHER) === null, designChangeBlock({ id: ME, role: r }, ME) === null)),
    row('viz-room', 'Rename, change the photo of or delete a room in an AI Visualizer design', (r) => own(roomDeleteBlock({ id: ME, role: r }, OTHER, OTHER) === null, roomDeleteBlock({ id: ME, role: r }, ME, OTHER) === null)),
    row('viz-folder', 'Rename, move or delete an AI Visualizer folder', (r) => own(folderChangeBlockFor('visualizer', { id: ME, role: r }, OTHER) === null, folderChangeBlockFor('visualizer', { id: ME, role: r }, ME) === null)),
    row('materials', 'Change or delete a studio material', (r) => own(materialChangeBlock({ id: ME, role: r }, OTHER) === null, materialChangeBlock({ id: ME, role: r }, ME) === null)),
    /* (REG-700, AI credits Q-23 · Q-24 — integration A-18: 1.0's rules as they are) Everyone uses AI within their monthly amount; the Owner
       buys, sets the amounts and changes the plan; the Owner and Admins see the studio's usage, everyone else their own. */
    row('ai-use', 'Use AI tools, within their monthly limit', () => 'yes'),
    row('ai-buy', 'Buy AI credits or turn on auto top-up', (r) => (mayBuyCredits(r) ? 'yes' : 'no')),   // (pending modules S19) auto top-up is buying
    row('ai-amounts', 'Set members’ monthly AI credit limits', (r) => (maySetAmounts(r) ? 'yes' : 'no')),
    row('ai-plan', 'Change the plan, seats and billing', (r) => (mayChangePlan(r) ? 'yes' : 'no')),
    row('ai-usage', 'See the studio’s AI usage', (r) => (usageReach(r) === 'studio' ? 'yes' : 'own')),
    /* (Projects r4a, Q-49 · Q-46) The client portal: its set-up (the address, Live or Paused) is the Owners' and Admins'; a client's access
       (invite, resend, withdraw, see it as them) is whoever works on the lead — its members, their Manager, Owners and Admins. */
    row('portal-setup', 'Change the client portal’s address, pause it or put it live', (r) => (mayRunPortal(r) ? 'yes' : 'no')),
    row('portal-access', 'Invite a client to the portal or withdraw their access', (r) => {
      const v = { id: ME, role: r, teamIds: r === 'Manager' ? [MINE] : [] }
      return worksOn(v, [OTHER]) ? 'yes' : worksOn(v, [MINE]) ? 'team' : worksOn(v, [ME]) ? 'own' : 'no'
    }),
    /* (Projects round 5 — F-05 · F-07 · F-17 · F-18) Money in: the project's team sees its money and prepares its invoices; with Settings ›
       Projects › Invoices need approval on (the default) a Designer's or a Manager's invoice waits for an Owner or an Admin. Voiding a sent
       invoice and recording a client's approval of a variation order given outside its link are the Owners' and Admins'. */
    row('project-money', 'See a project’s payments — its contract value and invoices', (r) => {
      const v = { id: ME, role: r, teamIds: r === 'Manager' ? [MINE] : [] }
      return seesMoney(v, [OTHER]) ? 'yes' : seesMoney(v, [MINE]) ? 'team' : seesMoney(v, [ME]) ? 'own' : 'no'   // (parity map, MI-007) seesMoney — the team's, and the books'
    }),
    row('invoice-send', 'Send a project’s invoice', (r) => (approvesInvoices(r) || rules.invoiceApproval === false ? (approvesInvoices(r) ? 'yes' : r === 'Manager' ? 'team' : 'own') : 'submit'),
      /* (parity map, MI-007) Accounting prepares every project's invoice; theirs waits while Invoices need approval */
      preparesInvoices({ id: ME, role: 'Accounting', teamIds: [] }, [OTHER]) ? (sendsAtOnce('Accounting', { ...DEFAULT_INVOICE_RULES, approval: rules.invoiceApproval !== false }) ? 'yes' : 'submit') : 'no'),
    row('invoice-void', 'Void a sent invoice', (r) => (voidsInvoices(r) ? 'yes' : 'no')),
    row('vo-approved', 'Record a client’s approval of a variation order given outside its link', (r) => (marksVariationApproved(r) ? 'yes' : 'no')),
    /* (Projects round 6 — F-10 · F-11 · F-18 · Q-48) Payments: the project's team records them (confirmed on entry); a client's payment is
       confirmed by whoever Settings › Projects › Payments names — the project's designer by default — and every Owner and Admin; reversing a
       confirmed payment is the Owners' and Admins'. */
    row('payment-record', 'Record a client’s payment on a project', (r) => {
      const v = { id: ME, role: r, teamIds: r === 'Manager' ? [MINE] : [] }
      return recordsPayments(v, [OTHER]) ? 'yes' : recordsPayments(v, [MINE]) ? 'team' : recordsPayments(v, [ME]) ? 'own' : 'no'
    }),
    row('payment-confirm', 'Confirm a payment a client says they made', (r) => (runsStudio(r) ? 'yes' : (rules.paymentConfirmer ?? 'designer') === 'designer' && r === 'Designer' ? 'own' : 'no'),
      confirmsPayments({ id: ME, role: 'Accounting' }, []) ? 'yes' : 'no'),   // (parity map, MI-007 · FR-040) 1.0's verify
    row('payment-reverse', 'Reverse a confirmed payment', (r) => (reversesPayments(r) ? 'yes' : 'no')),
  )
  /* (Projects round 7 — the report's "Roles and rules": every rule 1.0 kept on the screen only becomes a rule function with its row) A project
     is seen by whoever may see its lead; its team — the lead's members, their Manager, Owners and Admins (`worksOn`) — changes it. Each row
     reads the function the server action checks: app/projects/actions.ts · schedule-actions · updates-actions · choices-actions ·
     money-actions · ending-actions, app/portal/studio-actions. */
  const onTeam = (r: RoleColumn): Reach => {
    const v = { id: ME, role: r, teamIds: r === 'Manager' ? [MINE] : [] }
    return worksOn(v, [OTHER]) ? 'yes' : worksOn(v, [MINE]) ? 'team' : worksOn(v, [ME]) ? 'own' : 'no'
  }
  /** (fix-E, E-22) Submits for approval — on the projects it may change: a Manager their team's, a Designer their own. */
  const submitOn = (r: RoleColumn): Reach => { const t = onTeam(r); return t === 'team' ? 'submit-team' : t === 'own' ? 'submit-own' : t === 'yes' ? 'submit' : 'no' }
  rows.push(
    row('project-see', 'See a project', (r) => {
      const v = viewer(r)
      return canSeeLead(v, [OTHER]) ? 'yes' : canSeeLead(v, [MINE]) ? 'team' : canSeeLead(v, [ME]) ? 'own' : 'no'
    }, 'money'),   // (parity map, PR-022) Accounting opens a project for its Money and Files
    /* (parity P-38) the project's Members door runs the lead's own assign (`assignMembers`) — the row the table lacked */
    row('project-members', 'Change a project’s members', (r) => {
      const ids = assignableIds(viewer(r), team)
      return ids.includes(OTHER) ? 'yes' : ids.includes(MINE) ? 'team' : ids.includes(ME) ? 'own' : 'no'
    }),
    row('project-create', 'Add a project by hand (New project)', (r) => (mayCreateProject({ role: r }) ? 'yes' : 'no')),
    row('project-change', 'Start a project, rename it and set its dates and value', onTeam),
    row('project-schedule', 'Change a project’s schedule and share it with the client', onTeam),
    row('project-update', 'Post an update to the client', (r) => (publishesAtOnce(rules.updateReview !== false, r) ? onTeam(r) : submitOn(r))),
    row('project-update-approve', 'Approve or send back a project update', (r) => (mayReviewUpdate(r) ? 'yes' : 'no')),
    row('project-choices', 'Add, share and pick a client’s choices', onTeam),
    row('project-vo', 'Start a variation order', onTeam),
    row('project-handover', 'Complete a project’s handover', (r) => (completesAtOnce(r, { review: rules.handoverReview === true }) ? onTeam(r) : submitOn(r))),
    /* (fix-E, E-13) anyone on the team asks an Owner or an Admin to complete it with items open — they complete it anyway */
    row('project-handover-anyway', 'Complete a handover with checklist items still open', (r) => (completesAnyway(r) ? 'yes' : submitOn(r))),
    row('project-handover-review', 'Approve or send back a handover', (r) => (reviewsHandover(r) ? 'yes' : 'no')),
    /* (fix-E, E-22) the two rules the table left out: whoever asked takes the request back; a deleted project is made again by an Owner or an
       Admin (the old one is removed for good first) */
    row('project-handover-withdraw', 'Take back a handover request', (r) => (reviewsHandover(r) ? 'yes' : onTeam(r) === 'no' ? 'no' : 'own')),
    row('project-remake', 'Make a Won lead’s project again while the old one is in Deleted Projects', (r) => (deletesProject(r) ? 'yes' : 'no')),
    row('project-reopen', 'Reopen a completed project', (r) => (reopensProject(r) ? 'yes' : 'no')),
    row('project-delete', 'Delete, restore or delete forever a project', (r) => (deletesProject(r) ? 'yes' : 'no')),
  )
  /* (gaps build, package A) a hold and a direct client's details follow the change rule (`mayChangeProject`, app/projects/actions.ts) */
  rows.push(
    row('project-hold', 'Put a project on hold and resume it', onTeam),
    row('project-client', 'Change a direct project’s client and property', onTeam),
  )
  /* (gaps build, package C) the schedule's asks: a Done and a share wait for an Owner or an Admin while Settings › Projects › Schedule asks;
     more time is asked by a Designer or a Manager (an Owner or an Admin moves the dates); the asks are answered by Owners and Admins */
  rows.push(
    row('project-milestone-done', 'Mark a milestone done', (r) => (doneAtOnce(r, { completionApproval: rules.completionApproval === true }) ? onTeam(r) : submitOn(r))),
    row('project-schedule-share', 'Share schedule changes with the client', (r) => (sharesAtOnce(r, { shareApproval: rules.shareApproval === true }) ? onTeam(r) : submitOn(r))),
    row('project-milestone-more', 'Ask for more time on a milestone', (r) => (asksForTime(r) ? onTeam(r) : 'no')),
    row('project-schedule-answer', 'Approve more time, a milestone’s Done or schedule changes', (r) => (answersSchedule(r) ? 'yes' : 'no')),
  )
  /* (gaps build E) a lead's files are for whoever may open the lead (app/leads/files-actions.ts `filesOf`); the Sent messages log reads every
     message for the studio's Owners and Admins, else the reader's own (app/notifications/outbox-actions.ts) */
  rows.push(
    row('files-change', 'Upload, rename, move and delete a lead’s or project’s files', (r) => {   // (parity P-38) a project's Files are its lead's
      const v = viewer(r)
      return canSeeLead(v, [OTHER]) ? 'yes' : canSeeLead(v, [MINE]) ? 'team' : canSeeLead(v, [ME]) ? 'own' : 'no'
    }, 'no', 'lead'),   // (pending modules S06 — a deliberate change of this rule) Accounting reads a project's files and changes none (was "A project's", PR-022) · (S44O — C6) Marketing a lead's
    row('sent-messages', 'Read the emails and WhatsApp messages the studio sent', (r) => own(runsStudio(r), true)),
  )
  /* (gaps build F1 — F1-Q2 · Q3) money out: a project's costs are its money (F-17); the totals are the Owners' and Admins' (Q-20); the team
     prepares POs (over the limit or with an advance, a Designer's or a Manager's waits while Settings › Finance › Costs asks), records bills and
     logs expenses (theirs wait while it asks); Owners and Admins approve, pay, and change, deactivate or merge a vendor (lib/finance/rules.ts) */
  rows.push(
    row('cost-see', 'See a project’s costs — its purchase orders, bills and expenses', onTeam, seesMoney({ id: ME, role: 'Accounting', teamIds: [] }, [OTHER]) ? 'yes' : 'no'),   // (parity map, MO-098)
    /* (pending modules S41b-1) a PO's margin against the quote is a margin — it moved to the profit row, which the Owner's cost switch reads */
    row('cost-figures', 'See cost totals and vendors’ balances', (r) => (seesCostFigures({ role: r }) ? 'yes' : 'no')),
    row('po-prepare', 'Raise a purchase order and send it under the approval limit', onTeam, 'yes'),   // (pending modules S06) Accounting raises POs on any project (1.0's managePOs)
    row('po-send', 'Send a purchase order over the limit, or with an advance', (r) => (runsStudio(r) || rules.poApproval === false ? onTeam(r) : submitOn(r)), rules.poApproval === false ? 'yes' : 'submit'),   // (pending modules S06) theirs wait for an Owner or an Admin
    row('po-approve', 'Approve a purchase order', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('bill-record', 'Record a supplier bill', (r) => (recordsBill({ id: ME, role: r, teamIds: [] }, null) ? 'yes' : onTeam(r))),   // (parity map, MO-098) the studio's overhead bills too
    /* (S44R — UAT row 361, call C8, as recommended; REVERSES F1-Q10) a bill over the limit with no PO, or more than its PO by over the tolerance,
       waits for an Owner's or an Admin's OK before it is paid (invented copy) */
    row('bill-approve', 'Approve a supplier bill over the limit or off its PO, before it is paid', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('expense-log', 'Log an expense or a claim', (r) => (runsStudio(r) ? 'yes' : rules.expenseApproval === false ? 'own' : 'submit-own'),
      expenseWaits('Accounting', { expenseApproval: rules.expenseApproval !== false }) ? 'submit' : 'yes'),   // (parity map, MO-098) on any project; theirs wait as a member's do
    row('expense-approve', 'Approve an expense or a claim', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('pay-out', 'Pay a vendor or a claim, and reverse a payment out', (r) => (paysOut(r) ? 'yes' : 'no')),
    row('vendor-add', 'Add a vendor to the directory', () => 'yes'),
    row('vendor-change', 'Change, deactivate or merge a vendor; see its bank details', (r) => (changesVendor(r) ? 'yes' : 'no')),
  )
  /* (gaps build G, G-Q15) the floor plan follows the change rule (`mayChangeProject`, app/projects/floor-plan-actions.ts); a mark is moved or
     deleted only by whoever drew it */
  rows.push(
    row('project-floor-plan', 'Add plans, mark them up and answer the client on a project’s floor plan', onTeam),
  )
  /* (gaps build F2 — the books, F2-Q2 · Q4…Q9 · Q13) profit is the Owners' and Admins' (Q-20); a member sees their own commission and asks for
     another rate on a project they work on; Owners and Admins set the rules, pay, issue credit notes and push to Xero (lib/finance/*) */
  rows.push(
    row('profit-see', 'See a project’s profit and margin, a PO’s margin against the quote, and the Profit and loss and Profitability reports', (r) => (seesBooks(r) && seesCostsAs(r, costs) ? 'yes' : 'no')),   // (parity map, FB-114) the books · (pending modules S41b-1) and the cost switch
    row('commission-see', 'See commission — what is earned, paid and owed', (r) => (seesBooks(r) ? 'yes' : 'own')),
    row('commission-ask', 'Ask for another commission rate on a project', (r) => (runsStudio(r) ? 'yes' : onTeam(r))),
    /* (parity map, FB-114 — a deliberate change of this row) paying commission is running the money (Accounting); setting it is the studio's */
    row('commission-run', 'Set commission rates and shares, and answer rate requests', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('commission-pay', 'Pay commission', (r) => (runsMoney(r) ? 'yes' : 'no')),
    row('credit-issue', 'Issue, void or refund a credit note', (r) => (runsMoney(r) ? 'yes' : 'no')),   // (parity map, MI-007) app/finance/books-actions.ts
    row('xero', 'Connect Xero and push the books', (r) => (runsMoney(r) ? 'yes' : 'no')),   // (parity map, FB-114) app/finance/xero-actions.ts
  )
  /* (gaps build H) tickets and Messages follow the change rule (`mayChangeProject`, app/projects/tickets-actions.ts · messages-actions.ts); the
     categories, the messages clients get by themselves and the About page are the Owners' and Admins' */
  rows.push(
    row('project-tickets', 'Answer, assign, flag to the Owner and resolve a client’s issue', onTeam),
    row('project-messages', 'Write to the client in a project’s Messages', onTeam),
    row('client-messages', 'Change the issue categories and the messages clients get by themselves', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('about-page', 'Change the About page clients read — the story, photos, awards and who is shown', (r) => (runsStudio(r) ? 'yes' : 'no')),
  )
  /* (gaps build I — I-Q1 · Q3 · Q6 · Q10 · Q12) the Workload view and Insights are Owners', Admins' and Managers' (a Manager's team); capacities
     and the studio's own compliance steps are Owners' and Admins'; a project's checklist follows the change rule (app/projects/compliance-actions.ts) */
  rows.push(
    row('project-workload', 'See the Workload view and Company › Reports › Projects', (r) => (runsStudio(r) ? 'yes' : r === 'Manager' ? 'team' : 'no')),   // (parity P-38) REG-1361's home
    row('project-capacity', 'Set the most projects each member can run', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('project-compliance', 'Answer a project’s compliance checklist', onTeam),
    row('studio-compliance', 'Mark the studio’s own compliance steps done', (r) => (runsStudio(r) ? 'yes' : 'no')),
    /* (pending modules S37) Company › Profile › Listed on Qanvast — 1.0's /verify was the owner's alone; 2.0's Profile rule */
    row('qanvast-listing', 'Apply to be listed on Qanvast, or change the listing', (r) => (listingBlock(r) === null ? 'yes' : 'no')),
  )
  /* (gaps build J, J-Q12) a project's 3D layout follows the change rule (its maker too — lib/planner/policy.ts); a personal one is its maker's,
     an Owner's or an Admin's; every member starts layouts */
  rows.push(
    row('layout-project', 'Change, share or delete a project’s 3D layout', onTeam),
    row('layout-start', 'Start a 3D layout in the 3D Space Planner', () => 'yes'),
  )
  /* (S45B · H-UHD-2) contractors on site: marking a vendor one is a vendor change (`changesVendor`; adding one as a contractor is anyone's, as
     adding a vendor is); putting one on a project follows the change rule (app/projects/contractor-actions.ts `mayChangeProject`); Leader
     checked is a sign-off (`checksCrew`); the Workload view's Contractors is everyone's who works on projects (`seesContractors`) */
  rows.push(
    row('crew-mark', 'Mark a vendor as a contractor — its trades, sites at once and code', (r) => (changesVendor(r) ? 'yes' : 'no')),
    row('crew-assign', 'Put a contractor on a project, move them, mark them on site or done, take them off', (r) => (seesContractors(r) ? onTeam(r) : 'no')),
    row('crew-check', 'Mark a contractor’s work checked', (r) => (seesContractors(r) && checksCrew(r) ? onTeam(r) : 'no')),
    row('crew-see', 'See the contractors’ workload — who is free, who is over capacity, the work with no contractor', (r) => (seesContractors(r) ? 'yes' : 'no')),
  )
  return rows
}
