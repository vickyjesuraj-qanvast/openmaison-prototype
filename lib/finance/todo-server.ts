import 'server-only'
import { raiseDueRepeats } from './repeats-server'
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { commissionRequests, expenses, homeownerLeadLinks, leads, members, projectInvoices, projectPayments, projects, purchaseOrders } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { currentPortalSlug } from '@/lib/portal/queries'
import { portalPath } from '@/lib/portal/model'
import { fetchFinance } from './queries'
import { fetchBooks, type BooksData } from './books'
import { fetchXero, type XeroData } from './xero-server'
import { RECENT_MAX, todoInputOf, todoRows, type RecentRow, type TodoData, type TodoMoney, type TodoXero } from './todo'
import type { BookProject } from './books'

/*
 * (simplify S-10 · Q-07 · S-16, her "build everything" 2026-10-09) Finance › To do on the server: it hands the screen the summaries the rest of
 * 2.0 already builds — `fetchFinance` (costsOf, the viewer's own scope), and for Owners and Admins `fetchBooks` (every project's moneyOf and
 * commissionsOf) and the Xero pushes that failed — plus the two facts a row's action needs that no summary carries: the client payments waiting
 * for the confirmer, and the client's phone and portal page for the reminder. Nothing is added up here (lib/finance/todo.ts reads the rows).
 */

/** To do's data, and the books and Xero it read on the way — the Commission and Xero tabs reuse them rather than reading them twice. */
export async function fetchFinanceTodo(): Promise<{ todo: TodoData; books: BooksData | null; xero: XeroData | null }> {
  const finance = await fetchFinance()
  const now = Date.now()
  if (!finance.viewer.runs) return { todo: { finance, money: [], commission: null, xero: [], now }, books: null, xero: null }
  const [books, xero] = await Promise.all([fetchBooks(), fetchXero()])
  if (!books) return { todo: { finance, money: [], commission: null, xero: [], now }, books: null, xero }
  const ids = books.projects.map((p) => p.id)
  const leadIds = books.projects.map((p) => p.leadId)
  const [pending, phones, invited, slug, people] = await Promise.all([
    ids.length ? db.select().from(projectPayments).where(and(inArray(projectPayments.projectId, ids), eq(projectPayments.status, 'to_confirm'))) : Promise.resolve([]),
    leadIds.length ? db.select({ id: leads.id, phone: leads.phone }).from(leads).where(inArray(leads.id, leadIds)) : Promise.resolve([]),
    leadIds.length ? db.select({ leadId: homeownerLeadLinks.leadId }).from(homeownerLeadLinks).where(and(inArray(homeownerLeadLinks.leadId, leadIds), isNotNull(homeownerLeadLinks.invitedAt), isNull(homeownerLeadLinks.withdrawnAt))) : Promise.resolve([]),
    currentPortalSlug(),
    db.select({ id: members.id, name: members.name }).from(members),
  ])
  const money: TodoMoney[] = books.projects.map((p) => ({
    projectId: p.id, number: p.number, name: p.name, client: p.client, phone: phones.find((x) => x.id === p.leadId)?.phone ?? '',
    portalUrl: invited.some((x) => x.leadId === p.leadId) ? portalPath(slug) : null,
    entity: p.entity ?? null,   // (parity map, MO-079)
    invoices: p.money.invoices.map((v) => ({
      id: v.id, label: v.label, stageName: v.stageName, state: v.state, amountMinor: v.amountMinor, balanceMinor: v.balanceMinor, overdueMinor: v.overdueMinor, dueAt: v.dueAt,
      readySince: v.readySince, submittedBy: v.submittedBy, submittedAt: v.submittedAt, toConfirmMinor: v.toConfirmMinor, uncheckedMinor: v.uncheckedMinor, paidMinor: v.paidMinor,
      remindedCount: v.remindedCount ?? 0, lastRemindedAt: v.lastRemindedAt ?? null, entity: v.issuingEntity ?? null,
    })),
    pending: pending.filter((x) => x.projectId === p.id).map((x) => ({
      id: x.id, invoiceId: x.invoiceId, amountMinor: x.amountMinor, paidOn: x.paidOn.getTime(), trusted: x.trusted, reference: x.reference,
      by: x.source === 'client' ? p.client : people.find((m) => m.id === x.recordedBy)?.name ?? p.client,
    })),
  }))
  const failed: TodoXero[] = xero.settings.connected ? xero.due.filter((d) => d.failed).map((d) => ({ kind: d.kind, id: d.id, label: d.label, amountMinor: d.amountMinor, error: d.failed ?? '' })) : []
  /* (pending modules S06 — the Accounting role's open question 10) whether this viewer's ready invoice goes at once, or waits for an approver */
  const { fetchInvoiceRules } = await import('@/lib/projects/money-queries')
  const { sendsAtOnce } = await import('@/lib/projects/invoices-model')
  const sendsNow = sendsAtOnce(finance.viewer.role, await fetchInvoiceRules())
  return { todo: { finance, money, commission: { asks: books.commission.asks, lines: books.commission.summary.lines }, xero: failed, now, recentIn: recentMoneyIn(books.projects), sendsNow }, books, xero }
}

/**
 * (parity map, MO-084 · FB-009) Money in's newest records for To do's Recently — read off the books the page already loaded (no read of its
 * own): invoices sent, client payments that count, variation orders (approved, sent, or drafted), credit notes. Each opens on its project's Money.
 */
function recentMoneyIn(projects: BookProject[]): RecentRow[] {
  const out: RecentRow[] = []
  const firstName = (n: string) => n.split(/\s+/)[0] ?? n
  for (const p of projects) {
    const inv = (id: string) => p.money.invoices.find((v) => v.id === id) ?? null
    const entity = p.entity ?? null
    /* invented copy (parity map, MO-084): one short sentence per record */
    for (const v of p.money.invoices) if (v.sentAt && v.status !== 'void') out.push({ key: `inv-${v.id}`, kind: 'invoice', ref: v.id, title: `${v.label ?? `The ${v.stageName} invoice`} sent to ${firstName(p.client)}`, projectId: p.id, project: p.name, at: v.sentAt, amountMinor: v.amountMinor, entity: v.issuingEntity ?? entity })
    for (const x of p.payments) out.push({ key: `pay-${x.id}`, kind: 'payment', ref: x.id, title: x.method === 'credit' ? `${firstName(p.client)}’s credit ${x.reference ?? ''} used on ${inv(x.invoiceId)?.label ?? 'an invoice'}`.replace('  ', ' ') : `${firstName(p.client)} paid ${inv(x.invoiceId)?.label ?? 'an invoice'}${x.receipt ? ` — ${x.receipt}` : ''}`, projectId: p.id, project: p.name, at: x.paidOn, amountMinor: x.amountMinor, entity: inv(x.invoiceId)?.issuingEntity ?? entity })   // (pending modules S07) a credit's use is no money paid
    for (const vo of p.money.variations) {
      const at = vo.confirmedAt ?? vo.clientSentAt ?? vo.createdAt
      const word = vo.confirmedAt ? `approved by ${firstName(p.client)}` : vo.clientSentAt ? `sent to ${firstName(p.client)}` : 'drafted'
      out.push({ key: `vo-${vo.id}`, kind: 'vo', ref: vo.id, title: `${vo.number} ${word}${vo.title ? ` — ${vo.title}` : ''}`, projectId: p.id, project: p.name, at, amountMinor: vo.amountMinor, entity: vo.issuingEntity ?? entity })
    }
    for (const c of p.credits) if (c.status !== 'void') out.push({ key: `cn-${c.id}`, kind: 'credit', ref: c.id, title: c.kind === 'overpayment' ? `${c.number} — ${firstName(p.client)} paid beyond ${c.invoiceLabel}, kept as credit` : `${c.number} issued against ${c.invoiceLabel}`, projectId: p.id, project: p.name, at: c.issuedAt, amountMinor: c.amountMinor, entity: inv(c.invoiceId)?.issuingEntity ?? entity })   // (pending modules S07)
  }
  return out.sort((a, b) => b.at - a.at).slice(0, RECENT_MAX)
}

/** To do's count — the tab strip's badge: everything that waits on you (simplify S-04's rule). */
export const todoCountOf = (d: TodoData) => todoRows(todoInputOf(d)).filter((r) => r.group !== 'waiting').length   // (parity map, MO-098) what waits on someone else is no count of yours (S-04)

/**
 * (simplify S-16) The rail's money badge — what waits for an Owner's or an Admin's OK: POs waiting for approval, expenses waiting, client
 * invoices waiting, commission asks. Four counts in SQL (the rail draws on every page), on the same predicates as To do's To approve rows
 * (`poState` awaiting = a Draft with a submission; `expenseState` pending; `invoiceState` awaiting; an ask open). Nobody else's queue: 0.
 */
export async function countFinanceToApprove(): Promise<number> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return 0
  await raiseDueRepeats()   // (pending modules S06) a repeating expense whose day came counts once it is logged — the rail asks before any page does
  const live = and(isNull(projects.deletedAt), isNull(leads.deletedAt))
  const [[po], [ex], [inv], [ask]] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(purchaseOrders).innerJoin(projects, eq(projects.id, purchaseOrders.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
      .where(and(eq(purchaseOrders.status, 'draft'), isNotNull(purchaseOrders.submittedAt), isNull(purchaseOrders.deletedAt), live)),
    db.select({ n: sql<number>`count(*)` }).from(expenses).leftJoin(projects, eq(projects.id, expenses.projectId))
      .where(and(eq(expenses.status, 'pending'), isNull(expenses.deletedAt), sql`(${expenses.projectId} IS NULL OR ${projects.deletedAt} IS NULL)`)),
    db.select({ n: sql<number>`count(*)` }).from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
      .where(and(eq(projectInvoices.status, 'draft'), isNotNull(projectInvoices.submittedAt), live)),
    db.select({ n: sql<number>`count(*)` }).from(commissionRequests).innerJoin(projects, eq(projects.id, commissionRequests.projectId))
      .where(and(eq(commissionRequests.status, 'open'), isNull(projects.deletedAt))),
  ])
  return Number(po?.n ?? 0) + Number(ex?.n ?? 0) + Number(inv?.n ?? 0) + Number(ask?.n ?? 0)
}
