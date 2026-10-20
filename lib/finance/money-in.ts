import 'server-only'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, leadAssignees, leads, projects } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { seesBooks } from '@/lib/settings/roles'
import { titleCaseName } from '@/lib/format'
import { fetchBrand } from '@/lib/templates/queries'
import { seesMoney } from '@/lib/projects/policy'
import { moneyOf, variationLabel, variationTone, type InvoiceKind, type InvoiceView } from '@/lib/projects/money'
import { moneyInputOf } from '@/lib/projects/money-queries'
import { paymentViewsOf } from '@/lib/projects/payments'
import { kindWords } from '@/lib/projects/invoices-kinds'
import type { PaymentStatus } from '@/lib/projects/payments-model'
import { entityOptions, type EntityOption } from './entity-scope'

/*
 * (parity map 2026-10-10 — FB-013 · FB-016 · FB-012; his "build everything that's in 1.0 to 2.0") Company › Finance › **Money in** on the server:
 * 1.0's Finance › Operations kept three studio-wide registers — every invoice (number, project, status incl. pending approval / rejected, total,
 * paid, outstanding, due), every receipt, every variation order — and 2.0 had them only per project. Here they are again as Money out's twin,
 * read from the ONE set of numbers (`moneyOf` per project — nothing is added up twice) and the payments' own records, scoped as the Money tab is:
 * the projects whose lead the viewer sees (Who sees leads) and whose money they see (F-17: the project's team, their Manager, Owners and Admins).
 * A row opens its project's Money on it (`?open=` + `?from=`); nothing here changes a record.
 */

export type MoneyInProject = { id: string; number: string; name: string; client: string }
/** An invoice's word in the register: its Money state, or *Sent back* (a Draft an approver returned). A stage's plain Draft — its milestone not
    reached — is not listed: it joins once it is ready (it waits on its project's Money until then). */
export type MoneyInStatus = 'ready' | 'awaiting' | 'sent_back' | 'sent' | 'overdue' | 'part_paid' | 'to_confirm' | 'paid' | 'credited' | 'void'
export type MoneyInInvoice = {
  id: string; projectId: string; label: string | null; stageName: string; kind: InvoiceKind; kindWords: string; status: MoneyInStatus
  amountMinor: number; paidMinor: number; owedMinor: number; overdueMinor: number; toConfirmMinor: number; creditedMinor: number
  dueAt: number | null; sentAt: number | null; reviewNote: string | null; entity: string | null
}
export type MoneyInPayment = {
  id: string; projectId: string; invoiceId: string; receiptNumber: string | null; invoiceLabel: string | null; stageName: string
  amountMinor: number; paidOn: number; method: string; reference: string | null; status: PaymentStatus; trusted: boolean; source: 'studio' | 'client'; by: string; entity: string | null
}
export type MoneyInVariation = {
  id: string; projectId: string; number: string; title: string; label: string; tone: 'default' | 'green' | 'yellow' | 'blue' | 'red'
  amountMinor: number; approved: boolean; billed: string | null; createdAt: number; entity: string | null
}
export type MoneyInCredit = {
  id: string; projectId: string; number: string; invoiceLabel: string | null; reason: string; amountMinor: number; status: 'issued' | 'void'; issuedAt: number; refundedMinor: number; entity: string | null
  /** (pending modules S07 — D-14) an overpayment held as the client's credit, and what is left of it */ kind: 'credit' | 'overpayment'; heldMinor: number
}
export type MoneyInData = {
  projects: MoneyInProject[]
  invoices: MoneyInInvoice[]
  payments: MoneyInPayment[]
  variations: MoneyInVariation[]
  credits: MoneyInCredit[]
  /** (parity map, MO-079 · P-B's `lib/finance/entity-scope.ts`) the issuing entities — empty with fewer than two: no Issued by pill, no chips */
  entities: EntityOption[]
  viewer: { id: string; runs: boolean }
  now: number
}

/** The register's word for an invoice — null for a stage's plain Draft (not listed). */
export function moneyInStatusOf(i: Pick<InvoiceView, 'state' | 'status' | 'submittedAt' | 'reviewNote' | 'reviewedAt'>): MoneyInStatus | null {
  if (i.status === 'draft' && !i.submittedAt && i.reviewNote && i.reviewedAt) return 'sent_back'
  if (i.state === 'draft') return null
  return i.state
}

export async function fetchMoneyIn(): Promise<MoneyInData> {
  const viewer = await fetchViewer()
  const runs = seesBooks(viewer.role)   // (parity map, MI-007) every project's money in — Owners, Admins and Accounting
  const now = Date.now()
  const [visible, brand, rows] = await Promise.all([
    visibleLeadIds(viewer), fetchBrand(),
    db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))).orderBy(asc(projects.number)),
  ])
  const seen = rows.filter((r) => visible === null || visible.has(r.l.id))
  const team = seen.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, seen.map((r) => r.l.id))) : []
  const mine = seen.filter((r) => seesMoney(viewer, team.filter((t) => t.leadId === r.l.id).map((t) => t.memberId)))
  const credits = mine.length ? await db.select().from(creditNotes).where(inArray(creditNotes.projectId, mine.map((r) => r.p.id))).orderBy(asc(creditNotes.issuedAt)) : []
  const out: MoneyInData = { projects: [], invoices: [], payments: [], variations: [], credits: [], entities: entityOptions(brand.details.entities), viewer: { id: viewer.id, runs }, now }
  for (const { p, l } of mine) {
    const client = titleCaseName(l.name)
    const input = await moneyInputOf(p)
    const m = moneyOf(input, now)
    const quoteEntity = input.quote?.issuingEntity ?? null
    out.projects.push({ id: p.id, number: p.number, name: p.name, client })
    const byId = new Map(m.invoices.map((i) => [i.id, i]))
    for (const i of m.invoices) {
      const status = moneyInStatusOf(i)
      if (!status) continue
      out.invoices.push({
        id: i.id, projectId: p.id, label: i.label, stageName: i.stageName, kind: i.kind ?? 'stage', kindWords: kindWords(i), status,
        amountMinor: i.amountMinor, paidMinor: i.paidMinor, owedMinor: i.status === 'sent' ? Math.max(0, i.balanceMinor) : 0, overdueMinor: i.overdueMinor,
        toConfirmMinor: i.toConfirmMinor, creditedMinor: i.creditedMinor ?? 0, dueAt: i.dueAt, sentAt: i.sentAt, reviewNote: i.reviewNote, entity: i.issuingEntity ?? quoteEntity,
      })
    }
    for (const x of await paymentViewsOf(p.id, client)) {
      const inv = byId.get(x.invoiceId)
      out.payments.push({
        id: x.id, projectId: p.id, invoiceId: x.invoiceId, receiptNumber: x.receiptNumber, invoiceLabel: inv?.label ?? x.invoiceNumber, stageName: x.stageName,
        amountMinor: x.amountMinor, paidOn: x.paidOn, method: x.method, reference: x.reference, status: x.status, trusted: x.trusted, source: x.source, by: x.by,
        entity: inv?.issuingEntity ?? quoteEntity,
      })
    }
    for (const v of m.variations) {
      out.variations.push({
        id: v.id, projectId: p.id, number: v.number, title: v.title, label: variationLabel(v), tone: variationTone(v), amountMinor: v.amountMinor, approved: v.approved,
        billed: v.billedBy ? v.billedBy.label ?? 'its own invoice, a Draft' : null, createdAt: v.createdAt, entity: v.issuingEntity ?? quoteEntity,
      })
    }
    for (const c of credits.filter((x) => x.projectId === p.id)) {
      const inv = byId.get(c.invoiceId)
      out.credits.push({
        id: c.id, projectId: p.id, number: c.number, invoiceLabel: inv?.label ?? null, reason: c.reason, amountMinor: c.amountMinor, status: c.status === 'void' ? 'void' : 'issued',
        issuedAt: c.issuedAt.getTime(), refundedMinor: c.refundMinor ?? 0, entity: inv?.issuingEntity ?? quoteEntity,
        kind: c.kind === 'overpayment' ? 'overpayment' : 'credit', heldMinor: m.held?.find((h) => h.id === c.id)?.heldMinor ?? 0,   // (pending modules S07)
      })
    }
  }
  /* newest first, as a register reads: invoices by the day they went (a Draft that waits, by when it was made), payments by the day paid */
  out.invoices.sort((a, b) => (b.sentAt ?? Number.MAX_SAFE_INTEGER) - (a.sentAt ?? Number.MAX_SAFE_INTEGER) || (b.label ?? '').localeCompare(a.label ?? ''))
  out.payments.sort((a, b) => b.paidOn - a.paidOn)
  out.variations.sort((a, b) => b.createdAt - a.createdAt)
  out.credits.sort((a, b) => b.issuedAt - a.issuedAt)
  return out
}
