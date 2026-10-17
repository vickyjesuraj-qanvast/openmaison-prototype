/**
 * (pending modules S41b-1 — the S41b data sweep's M-03; 1.0's *Cost & Margin Visibility*, `origin/deployment/qanvast`
 * docs/features/cost-visibility/spec.md, `studios.settings.cost_visibility`, `studio-config/cost-visibility`) **Who sees costs and margins.**
 * The Owner switches cost, mark-up and margin off per role: a quote line's and a price-book item's cost and mark-up, every margin built from
 * them, and the books' profit and margin. Owners always see them. Cost, mark-up and margin share one switch — a mark-up beside a selling price
 * gives the cost away (1.0's reason).
 *
 * Stored as settings key `cost_visibility` = `{ admin, manager, designer, accounting }` booleans. **A missing key or role reads as on** — 1.0's
 * default, so a studio that never opens the card sees no change. 1.0's `id` key (its Interior Designer) reads as both Designer and Manager: a 1.0
 * manager was a designer with a manager tag, and 2.0's Manager is that person (1.0: "manager follows the member's other tags").
 *
 * What a switch decides is the whole of what a member may see; the role's own reach still applies on top — a Designer never opened the books,
 * so their switch hides a quote's and the price book's costs, while Admins' and Accounting's also hide the books' profit and margin
 * (`seesProfit`). Pure, client-safe.
 */
import { seesBooks } from '@/lib/settings/roles'

export const COST_VISIBILITY_KEY = 'cost_visibility'
/** The roles the Owner switches, in the Who may do what table's order. */
export const COST_ROLES = ['Admin', 'Manager', 'Designer', 'Accounting'] as const
export type CostRole = (typeof COST_ROLES)[number]
export type CostVisibility = Record<CostRole, boolean>
export const DEFAULT_COST_VISIBILITY: CostVisibility = { Admin: true, Manager: true, Designer: true, Accounting: true }
const STORED: Record<CostRole, string> = { Admin: 'admin', Manager: 'manager', Designer: 'designer', Accounting: 'accounting' }

/** Whatever is stored, against the defaults: only an explicit `false` hides a role (1.0's `resolveCostVisibility`). */
export function parseCostVisibility(raw: unknown): CostVisibility {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const legacy = src.id   // 1.0's Interior Designer
  const on = (role: CostRole) => {
    const v = src[STORED[role]]
    if (v === false) return false
    if (v === undefined && (role === 'Designer' || role === 'Manager') && legacy === false) return false
    return true
  }
  return { Admin: on('Admin'), Manager: on('Manager'), Designer: on('Designer'), Accounting: on('Accounting') }
}
/** The value kept in `settings` — 2.0's keys, every role named. */
export const storedCostVisibility = (c: CostVisibility) => ({ admin: c.Admin, manager: c.Manager, designer: c.Designer, accounting: c.Accounting })

/** Whether a member in `role` sees cost, mark-up and margin: an Owner always; another role as its switch says; a role the studio doesn't know never. */
export function seesCostsAs(role: string | null | undefined, c: CostVisibility): boolean {
  if (role === 'Owner') return true
  return (COST_ROLES as readonly string[]).includes(role ?? '') ? c[role as CostRole] : false
}

/** The member reading a page — `fetchViewer()` sets `costs` from the setting on every request. */
export type CostSighted = { role: string; /** sees cost, mark-up and margin (Settings › Roles & access › Who sees costs and margins) */ costs?: boolean }
/** Whether this member sees a quote line's and the price book's cost, mark-up and margin. Every server read and write asks it. */
export const seesCost = (v: CostSighted): boolean => v.costs ?? seesCostsAs(v.role, DEFAULT_COST_VISIBILITY)
/** Whether this member sees the books' profit and margin — the books' reach (Owners, Admins, Accounting) and the cost switch, both. */
export const seesProfit = (v: CostSighted): boolean => seesBooks(v.role) && seesCost(v)
/** (REG-596) A line's rebate is the Owner's alone — never printed, never shown to anyone else; the server leaves it out for everyone else. */
export const seesRebate = (v: Pick<CostSighted, 'role'>): boolean => v.role === 'Owner'

/** What a refused cost-only change answers a member who doesn't see costs (a mark-up as a share of the cost, say). */
export const COST_HIDDEN = 'Your role doesn’t see costs — the Owner set that under Settings › Roles & access'   // invented copy (pending modules S41b-1)
/** Order from the quote prices each Draft PO at the quote's costs — a member who doesn't see costs raises a PO and enters the vendor's prices. */
export const ORDER_COST_HIDDEN = 'Order from the quote prices each PO at the quote’s costs, which your role doesn’t see — raise a purchase order and enter the vendor’s prices'   // invented copy (pending modules S41b-1)
/** What Maison AI answers a member whose role doesn't see the books' profit and margin. */
export const PROFIT_HIDDEN = 'The Owner keeps profit and margin from your role — set under Settings › Roles & access › Who sees costs and margins. Who owes what, GST and cash flow are still yours to ask.'   // invented copy (pending modules S41b-1)
/** Only the Owner changes it (1.0: "the menu item is owner-only … the API refuses non-owner saves"). */
export const COST_VISIBILITY_RULE = 'Only the Owner changes who sees costs and margins'
export const changesCostVisibility = (role: string | null | undefined) => role === 'Owner'

/** The card's words, shared by the page and its ghost. */
export const COST_VISIBILITY_HELP = 'Who sees what each line costs the studio — a quote’s cost, mark-up and margin, the price book’s costs, and the books’ profit and margin. A role switched off doesn’t see them anywhere, and their changes keep the costs already entered. Owners always see them.'   // invented copy (pending modules S41b-1; 1.0's card text in 2.0's words)
export const COST_ROLE_HELP: Record<'Owner' | CostRole, string> = {
  Owner: 'Always see them',
  Admin: 'Quotes, the price book, and profit and margin in Finance and Reports',
  Manager: 'Their quotes and their team’s, and the price book',
  Designer: 'Their quotes and the price book',
  Accounting: 'Profit and margin in Finance and Reports — bills, POs and payments stay',
}   // invented copy (pending modules S41b-1)
/** (S44O — call C6) Marketing's fixed row: they never see a quote's money, so never its costs. *(invented copy)* */
export const MARKETING_COST_HELP = 'Never — the lead desk works the leads, never a quote’s money'
/** The snackbar's sentence after a switch — "Designers don’t see costs and margins now". */
export function costSwitchSentence(role: CostRole, on: boolean): string {
  const who = role === 'Accounting' ? 'Accounting' : `${role}s`
  return on ? `${who} see costs and margins again` : `${who} don’t see costs and margins now`
}   // invented copy (pending modules S41b-1)
