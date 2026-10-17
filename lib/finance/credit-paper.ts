import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, projectInvoices, projectPayments, type CreditNote } from '@/lib/db/schema'
import { fetchInvoiceDoc } from '@/lib/projects/money-queries'
import { fetchPortalInvoice } from '@/lib/projects/payments-portal'
import type { PortalVisitor } from '@/lib/portal/session'
import { runsMoney } from '@/lib/settings/roles'

/*
 * (gaps build F2 — F2-Q9) A credit note's paper — the invoice's own letterhead (the entity it is raised under), the client, the project, the
 * invoice it credits, the reason, the amount with its GST split out, and a void or a refund when there is one. The studio's page and the
 * client's portal read the same paper: the studio's through the invoice page's checks (Who sees leads, then the money), the client's through the
 * portal's (one of their homes). A credit note never shows a figure the invoice paper doesn't already give the client.
 */
export type CreditNotePaperData = {
  letterhead: { name: string; address: string; uen: string; gstReg: string; logo: string | null }
  studioPhone: string
  studioEmail: string
  client: { name: string; phone: string }
  property: string | null
  project: { name: string; number: string }
  invoice: { number: string | null; stageName: string; amountMinor: number; gstMinor: number }
  credit: {
    number: string; reason: string; amountMinor: number; gstMinor: number; issuedAt: number
    voided: { reason: string; at: number | null } | null
    refund: { amountMinor: number; on: number | null; method: string | null; reference: string | null } | null
    /** (pending modules S07 — D-14) an overpayment held as the client's credit: where it was used, and what is left of it */
    kind?: 'credit' | 'overpayment'
    used?: { label: string; amountMinor: number; on: number }[]
    leftMinor?: number
  }
}
const creditOf = async (c: CreditNote): Promise<CreditNotePaperData['credit']> => {
  const base = {
    number: c.number, reason: c.reason, amountMinor: c.amountMinor, gstMinor: c.gstMinor, issuedAt: c.issuedAt.getTime(),
    voided: c.status === 'void' ? { reason: c.voidReason ?? '', at: c.voidedAt?.getTime() ?? null } : null,
    refund: c.refundMinor ? { amountMinor: c.refundMinor, on: c.refundedOn?.getTime() ?? null, method: c.refundMethod, reference: c.refundReference } : null,
  }
  if (c.kind !== 'overpayment') return base
  /* (pending modules S07) the payments taken from it that count — on which invoice, how much, when */
  const used = (await db.select({ amountMinor: projectPayments.amountMinor, on: projectPayments.paidOn, number: projectInvoices.number, ext: projectInvoices.externalRef, stage: projectInvoices.stageName })
    .from(projectPayments).innerJoin(projectInvoices, eq(projectInvoices.id, projectPayments.invoiceId))
    .where(and(eq(projectPayments.creditNoteId, c.id), eq(projectPayments.status, 'confirmed')))).map((u) => ({ label: u.number ?? u.ext ?? `the ${u.stage} invoice`, amountMinor: u.amountMinor, on: u.on.getTime() }))
  const leftMinor = c.status === 'void' ? 0 : Math.max(0, c.amountMinor - used.reduce((s, u) => s + u.amountMinor, 0) - (c.refundMinor ?? 0))
  return { ...base, kind: 'overpayment', used, leftMinor }
}

export type CreditDocData = { paper: CreditNotePaperData; project: { id: string; name: string }; id: string; invoiceId: string; status: 'issued' | 'void'; manages: boolean }
/** The studio's page: after the invoice page's checks. */
export async function fetchCreditDoc(projectId: string, creditId: string): Promise<CreditDocData | null> {
  const [c] = await db.select().from(creditNotes).where(and(eq(creditNotes.id, creditId), eq(creditNotes.projectId, projectId))).limit(1)
  if (!c) return null
  const d = await fetchInvoiceDoc(projectId, c.invoiceId)
  if (!d) return null
  return {
    paper: {
      letterhead: d.letterhead, studioPhone: d.studio.phone, studioEmail: d.studio.email, client: { name: d.client.name, phone: d.client.phone }, property: d.property,
      project: { name: d.project.name, number: d.project.number },
      invoice: { number: d.invoice.label ?? d.invoice.number ?? null, stageName: d.invoice.stageName, amountMinor: d.invoice.amountMinor, gstMinor: d.invoice.gstMinor },
      credit: await creditOf(c),
    },
    project: { id: d.project.id, name: d.project.name }, id: c.id, invoiceId: c.invoiceId, status: c.status === 'void' ? 'void' : 'issued', manages: runsMoney(d.viewer.role),   /* (parity map, MI-007) Accounting voids and refunds a credit note */
  }
}
/** The client's own: a credit note on one of their homes, issued or void (a void one says so). */
export async function fetchPortalCreditNote(visitor: PortalVisitor, creditId: string): Promise<CreditNotePaperData | null> {
  const [c] = await db.select().from(creditNotes).where(eq(creditNotes.id, creditId)).limit(1)
  if (!c) return null
  const inv = await fetchPortalInvoice(visitor, c.invoiceId)
  if (!inv) return null
  return {
    letterhead: inv.letterhead, studioPhone: inv.studioPhone, studioEmail: inv.studioEmail, client: inv.client, property: inv.property, project: inv.project,
    invoice: { number: inv.invoice.label ?? inv.invoice.number ?? null, stageName: inv.invoice.stageName, amountMinor: inv.invoice.amountMinor, gstMinor: inv.invoice.gstMinor },
    credit: await creditOf(c),
  }
}
