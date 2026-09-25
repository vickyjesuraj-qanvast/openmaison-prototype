/**
 * (REG-645, settings parity Q-03) Settings › Studio › Who may do what — the four roles against every action 2.0 checks, computed from the
 * same rule functions the actions and pages call, so the table cannot drift from what the app enforces. Read-only: custom roles and a
 * permissions editor stay held (leads parity Q-40). Pure, client-safe.
 */
import { assignableIds, canSeeLead, runsStudio } from '@/lib/leads/assign-policy'
import { canDeleteQuote } from '@/lib/quotes/policy'
import { canDeleteContract, unsignBlock } from '@/lib/contracts/policy'
import { canDeleteComparison } from '@/lib/xray/policy'
import { approves, changesPayments, type LeadVisibility, type QuoteApproval, type TemplateApproval } from '@/lib/settings/types'
import type { Member } from '@/lib/db/schema'
import { addBlock } from '@/lib/company/member-rules'
import { runsBook } from '@/lib/company/price-book-rules'
import { folderBlock } from '@/lib/company/folder-libraries'
import { templateChangeBlock } from '@/lib/company/template-rules'

export const ROLE_COLUMNS = ['Owner', 'Admin', 'Manager', 'Designer'] as const
export type RoleColumn = (typeof ROLE_COLUMNS)[number]

/** What a role gets: yes · no · only their own records · their own and their team's · as the backup approver · submits for approval. */
export type Reach = 'yes' | 'no' | 'own' | 'team' | 'backup' | 'submit'
export const REACH_LABEL: Record<Reach, string> = { yes: 'Yes', no: 'No', own: 'Their own', team: 'Their team’s', backup: 'If the backup approver', submit: 'Submits for approval' }

export type StudioRules = { visibility: LeadVisibility; quoteApproval: QuoteApproval; templateApproval: TemplateApproval; paymentLock: boolean }
export type PermissionRow = { key: string; action: string; reach: Record<RoleColumn, Reach> }

/* Stand-in ids: "me" is the role holder, "mine" a Designer reporting to them, "other" anyone else. */
const ME = 'me', MINE = 'mine', OTHER = 'other'
const team = [ME, MINE, OTHER].map((id) => ({ id })) as Member[]
const own = (mayAny: boolean, mayOwn: boolean): Reach => (mayAny ? 'yes' : mayOwn ? 'own' : 'no')

function row(key: string, action: string, of: (role: RoleColumn) => Reach): PermissionRow {
  return { key, action, reach: Object.fromEntries(ROLE_COLUMNS.map((r) => [r, of(r)])) as Record<RoleColumn, Reach> }
}

export function permissionRows(rules: StudioRules): PermissionRow[] {
  const viewer = (role: RoleColumn) => ({ id: ME, role, teamIds: role === 'Manager' ? [MINE] : [], visibility: rules.visibility })
  const rows: PermissionRow[] = [
    row('settings', 'Change the studio’s settings', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('members', 'Add, deactivate and reactivate members; set roles', (r) => (addBlock({ id: ME, role: r }, 'Designer') === null ? 'yes' : 'no')),
    row('owner', 'Make, unmake or deactivate an Owner', (r) => (addBlock({ id: ME, role: r }, 'Owner') === null ? 'yes' : 'no')),   // (REG-646) the Owner rules
    row('see', 'See leads', (r) => {
      const v = viewer(r)
      return canSeeLead(v, [OTHER]) ? 'yes' : canSeeLead(v, [MINE]) ? 'team' : canSeeLead(v, [ME]) ? 'own' : 'no'
    }),
    row('assign', 'Assign leads', (r) => {
      const ids = assignableIds(viewer(r), team)
      return ids.includes(OTHER) ? 'yes' : ids.includes(MINE) ? 'team' : ids.includes(ME) ? 'own' : 'no'
    }),
    row('delete-lead', 'Delete a lead', (r) => (runsStudio(r) ? 'yes' : 'no')),
    row('insights', 'Open Leads › Insights', (r) => (runsStudio(r) ? 'yes' : 'no')),
  ]
  if (rules.quoteApproval === 'required') rows.push(row('approve', 'Approve a quote', (r) => (approves(r, ME, null) ? 'yes' : approves(r, ME, ME) ? 'backup' : 'no')))
  rows.push(
    row('publish', 'Publish a quote template', (r) => (rules.templateApproval === 'not-required' || approves(r, ME, null) ? 'yes' : 'submit')),   // the backup approver publishes too — the card's footnote says so
    row('payments', 'Change a quote’s payment schedule', (r) => (changesPayments(r, rules.paymentLock) ? 'yes' : 'no')),
    row('delete-quote', 'Delete a quote', (r) => own(canDeleteQuote({ id: ME, role: r }, { createdBy: OTHER }), canDeleteQuote({ id: ME, role: r }, { createdBy: ME }))),
    row('delete-contract', 'Delete a contract', (r) => own(canDeleteContract({ id: ME, role: r }, { createdBy: OTHER }), canDeleteContract({ id: ME, role: r }, { createdBy: ME }))),
    row('unsign', 'Move a studio-signed contract back', (r) => (unsignBlock({ status: 'Signed', signedBy: null }, { id: ME, role: r }) === null ? 'yes' : 'no')),
    row('delete-xray', 'Delete a Quote X-Ray comparison', (r) => own(canDeleteComparison({ id: ME, role: r }, OTHER), canDeleteComparison({ id: ME, role: r }, ME))),
    /* (REG-652, price book parity Q-03 · Q-04) The price book: Owners and Admins change it; anyone else proposes an item for approval. */
    row('price-book', 'Add or change items in the price book', (r) => (runsBook({ id: ME, role: r }) ? 'yes' : 'submit')),
    row('price-book-approve', 'Approve a proposed price book item', (r) => (runsBook({ id: ME, role: r }) ? 'yes' : 'no')),
    row('price-book-sections', 'Save or change My Sections', (r) => (runsBook({ id: ME, role: r }) ? 'yes' : 'no')),
    /* (REG-664) Folders in Templates and the Price book: Owners and Admins make, rename, move and delete them; an entry is filed by whoever
       may rename it — a template by its author (a quote template, which keeps no author, by an Owner or an Admin). */
    row('folders', 'Make, rename, move and delete folders in Templates and the Price book', (r) => (folderBlock({ role: r }) === null ? 'yes' : 'no')),
    row('file-template', 'Move a template into a folder', (r) => own(templateChangeBlock({ id: ME, role: r }, OTHER) === null, templateChangeBlock({ id: ME, role: r }, ME) === null)),
  )
  return rows
}
