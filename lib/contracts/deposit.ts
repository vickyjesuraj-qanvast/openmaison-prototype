import 'server-only'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, quotePayments, quotes, type Contract } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { contractBaseOf } from '@/lib/quotes/contract-value'
import { payOf } from '@/lib/projects/payments-portal'
import { moneySummaryOf } from '@/lib/projects/money-queries'
import { fetchLiveMethodValues } from '@/lib/projects/payment-methods-queries'
import type { IssuingEntity, StudioDetails } from '@/lib/templates/model'
import { depositAmount, depositWhy, type DepositOption, type DepositView } from './deposit-model'

/*
 * (S44R — UAT row 358, call C7, as recommended — her UAT ask 2026-10-15) The deposit an agreement asks for, read from the records: the quote it
 * names, that quote's Payment Schedule (its first stage), the issuing entity that bills it (the contract's own, else the quote's) and — once the
 * signature started the project — the project's own invoice for that stage.
 */

const entityOf = (studio: StudioDetails, name: string | null | undefined): IssuingEntity | null => {
  const list = studio.entities ?? []
  const named = name ? list.find((e) => e.name === name) : undefined
  return named ?? list[0] ?? null
}
type QuoteRow = { id: string; number: string; amountMinor: number; signedAmountMinor: number | null; issuingEntity: string | null; leadId: string }
async function firstStages(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; name: string; pct: number; fixedMinor: number | null }>()
  const rows = await db.select({ id: quotePayments.id, quoteId: quotePayments.quoteId, name: quotePayments.name, pct: quotePayments.pct, fixedMinor: quotePayments.fixedMinor, position: quotePayments.position })
    .from(quotePayments).where(inArray(quotePayments.quoteId, ids)).orderBy(asc(quotePayments.position))
  const out = new Map<string, { id: string; name: string; pct: number; fixedMinor: number | null }>()
  for (const r of rows) if (!out.has(r.quoteId)) out.set(r.quoteId, { id: r.id, name: r.name, pct: r.pct, fixedMinor: r.fixedMinor })
  return out
}

/** The Send dialog's choice for each quote a contract may name: its deposit, or why it can't be asked for. `entity` = the contract's own issuer. */
export async function depositOptions(qs: QuoteRow[], contractEntity: string | null): Promise<Record<string, DepositOption>> {
  if (!qs.length) return {}
  const [brand, first, methods] = await Promise.all([fetchBrand(), firstStages(qs.map((q) => q.id)), fetchLiveMethodValues()])
  const out: Record<string, DepositOption> = {}
  for (const q of qs) {
    const e = entityOf(brand.details, contractEntity ?? q.issuingEntity)
    const entity = e?.name || brand.details.name
    const f = first.get(q.id)
    const amountMinor = depositAmount(contractBaseOf(q), f)
    const why = !f ? depositWhy.noSchedule(q.number) : amountMinor <= 0 ? depositWhy.zero(q.number) : !payOf(e, methods) ? depositWhy.noPay(entity) : null
    out[q.id] = { amountMinor, stage: f?.name ?? '', quoteNumber: q.number, entity, why }
  }
  return out
}

/** The signing page's "Pay the deposit" for a contract that asks for it — null when it doesn't, or its quote has no first stage to pay. */
export async function depositOf(c: Pick<Contract, 'askDeposit' | 'fromQuoteId' | 'issuingEntity' | 'leadId'>): Promise<DepositView | null> {
  if (!c.askDeposit || !c.fromQuoteId) return null
  const [q] = await db.select({ id: quotes.id, number: quotes.number, amountMinor: quotes.amountMinor, signedAmountMinor: quotes.signedAmountMinor, issuingEntity: quotes.issuingEntity, leadId: quotes.leadId })
    .from(quotes).where(and(eq(quotes.id, c.fromQuoteId), isNull(quotes.deletedAt))).limit(1)
  if (!q) return null
  const [brand, first, methods] = await Promise.all([fetchBrand(), firstStages([q.id]), fetchLiveMethodValues()])
  const f = first.get(q.id)
  if (!f) return null
  let amountMinor = depositAmount(contractBaseOf(q), f)
  let reference = `${q.number} deposit`
  let paid = false
  /* once the signature started the project, its invoice for the stage is the figure — its number the reference once sent, paid when it is */
  const [p] = await db.select().from(projects).where(and(eq(projects.leadId, c.leadId), isNull(projects.deletedAt), eq(projects.quoteId, q.id))).limit(1)
  if (p) {
    const m = await moneySummaryOf(p)
    const inv = m.invoices.find((i) => i.stageRef === f.id && i.status !== 'void')
    if (inv) {
      amountMinor = inv.amountMinor
      if (inv.label && inv.status !== 'draft') reference = inv.label
      paid = inv.status !== 'draft' && inv.amountMinor > 0 && inv.paidMinor + (inv.creditedMinor ?? 0) >= inv.amountMinor
    }
  }
  if (amountMinor <= 0) return null
  const e = entityOf(brand.details, c.issuingEntity ?? q.issuingEntity)
  const entity = e?.name || brand.details.name
  return { amountMinor, stage: f.name, quoteNumber: q.number, reference, entity, pay: payOf(e, methods), paid }
}

/** (S44R, C7) Quotes with their Deposit field's figure — the first payment stage's amount (`depositAmount`), for the contract's fields. */
export async function withDeposits<Q extends { id: string; amountMinor: number; signedAmountMinor?: number | null }>(qs: Q[]): Promise<(Q & { depositMinor: number | null })[]> {
  if (!qs.length) return []
  const first = await firstStages(qs.map((q) => q.id))
  return qs.map((q) => { const f = first.get(q.id); const d = f ? depositAmount(contractBaseOf(q), f) : 0; return { ...q, depositMinor: d > 0 ? d : null } })
}
/** (S44R, C9) A contract's lead with its live project — the Handover fields read its number and completion day. */
export async function withProject<L extends { id: string }>(lead: L): Promise<L & { project: { number: string; completedAt: Date | null } | null }> {
  const [p] = await db.select({ number: projects.number, completedAt: projects.completedAt }).from(projects).where(and(eq(projects.leadId, lead.id), isNull(projects.deletedAt))).limit(1)
  return { ...lead, project: p ?? null }
}
