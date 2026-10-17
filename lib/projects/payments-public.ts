import 'server-only'
import { receiptExtraOf } from '@/lib/finance/credit-records'   // (pending modules S07)
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, projectInvoices, projectPayments, projects } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { fetchBrand } from '@/lib/templates/queries'
import type { InvoicePaperData } from '@/components/projects/money/invoice-paper'
import type { ReceiptPaperData } from '@/components/projects/money/payments-receipt'
import { moneyOf } from './money'
import { letterheadOf, moneyInputOf } from './money-queries'
import { receiptFigures } from './payments'
import { paperForEntity } from './invoices-paper-queries'
import { fetchLiveMethodValues } from './payment-methods-queries'   // (parity map, FB-112 — P-D)
import { isShareToken } from './invoices-token'

/*
 * (gaps build B, item 6 — 1.0 G-294 · G-494 · G-495) An invoice and a receipt the client opens from a link without signing in — for a client
 * not on the portal (Q-40's four no-login links gain these two; like them they keep answering while the portal is paused). The token IS the
 * permission: a random key given with the Draft (an invoice) or the receipt's number (a receipt). Only what the client already holds answers —
 * an invoice sent (or voided after it went: it says Void), a receipt issued — and only while its project and its client record are live.
 * Never a Draft, never a recorded invoice made elsewhere (its paper is the other system's), never a figure the client's own papers don't print.
 */

export type PublicInvoice = { paper: InvoicePaperData; studio: string; label: string; state: string; projectName: string }
export type PublicReceipt = { paper: ReceiptPaperData; studio: string }

async function paperOf(p: typeof projects.$inferSelect, invoiceId: string, now: number) {
  const input = await moneyInputOf(p)
  const m = moneyOf(input, now)
  const invoice = m.invoices.find((i) => i.id === invoiceId && i.status !== 'draft')
  if (!invoice) return null
  const [brand, [lead]] = await Promise.all([fetchBrand(), db.select().from(leads).where(and(eq(leads.id, p.leadId), isNull(leads.deletedAt))).limit(1)])
  if (!lead) return null
  const { entity, letterhead } = await letterheadOf(brand, invoice.issuingEntity, p.quoteId)
  const layout = await paperForEntity(brand.details.entities, entity?.name ?? null)
  return { m, invoice, entity, letterhead, layout, brand, lead, quoteNumber: input.quote?.number ?? null }
}

export async function fetchPublicInvoice(token: string, now = Date.now()): Promise<PublicInvoice | null> {
  if (!isShareToken(token)) return null
  const [row] = await db.select({ i: projectInvoices, p: projects }).from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId))
    .where(and(eq(projectInvoices.shareToken, token), isNull(projects.deletedAt))).limit(1)
  if (!row || row.i.status === 'draft' || row.i.kind === 'external') return null
  const b = await paperOf(row.p, row.i.id, now)
  if (!b) return null
  const client = titleCaseName(b.lead.name)
  return {
    paper: {
      invoice: b.invoice, money: b.m, letterhead: b.letterhead, entity: b.entity, studioPhone: b.brand.details.phone, studioEmail: b.brand.details.email,
      client: { name: client, phone: b.lead.phone }, property: b.lead.propertyAddress ?? b.lead.leadAddress ?? null, project: { name: row.p.name, number: row.p.number },
      quoteNumber: b.quoteNumber, draftDue: now, now, layout: b.layout, methods: await fetchLiveMethodValues(),   // (parity map, FB-112 — P-D)
    },
    studio: b.letterhead.name, label: b.invoice.label ?? 'Invoice', state: b.invoice.state, projectName: row.p.name,
  }
}

export async function fetchPublicReceipt(token: string, now = Date.now()): Promise<PublicReceipt | null> {
  if (!isShareToken(token)) return null
  const [row] = await db.select({ pay: projectPayments, p: projects }).from(projectPayments).innerJoin(projects, eq(projects.id, projectPayments.projectId))
    .where(and(eq(projectPayments.shareToken, token), isNull(projects.deletedAt))).limit(1)
  if (!row || !row.pay.receiptNumber || (row.pay.status !== 'confirmed' && row.pay.status !== 'reversed')) return null
  const b = await paperOf(row.p, row.pay.invoiceId, now)
  if (!b) return null
  const pay = row.pay
  return {
    paper: {
      letterhead: b.letterhead, studioPhone: b.brand.details.phone, studioEmail: b.brand.details.email, client: { name: titleCaseName(b.lead.name), phone: b.lead.phone },
      property: b.lead.propertyAddress ?? b.lead.leadAddress ?? null, project: { name: row.p.name, number: row.p.number },
      invoice: { number: b.invoice.label, stageName: b.invoice.stageName, pct: b.invoice.pct, kind: b.invoice.kind, outside: b.invoice.outside, fixed: b.invoice.fixedMinor != null },
      payment: { number: pay.receiptNumber!, amountMinor: pay.amountMinor, paidOn: pay.paidOn.getTime(), method: pay.method, reference: pay.reference, issuedAt: (pay.confirmedAt ?? pay.createdAt).getTime(), reversed: pay.status === 'reversed' ? { reason: pay.reverseReason ?? '', at: pay.reversedAt ? pay.reversedAt.getTime() : null } : null },
      figures: await receiptFigures(pay), layout: b.layout, extra: await receiptExtraOf(pay.id),   // (pending modules S07)
    },
    studio: b.letterhead.name,
  }
}
