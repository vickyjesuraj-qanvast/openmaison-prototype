import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, leadEvents, leadFiles, notifications, settings, type CreditNote, type NewCreditNote } from '@/lib/db/schema'
import { money2 } from '@/lib/quotes/math'
import { logProjectEvent } from '@/lib/projects/events'
import { fileMoneyDoc } from '@/lib/projects/payments'
import { CREDIT_RULES_KEY, DEFAULT_CREDIT_RULES, nextCreditNumber, overpaymentReason, parseCreditRules, type CreditRules } from './credit-model'

/*
 * (gaps build F2 → pending modules S07) The credit notes' numbers and their one writer — Settings › Finance › Document numbers' pattern
 * (`CN-{YYYY}-{seq}`), never below the highest given, a race taking the next one — shared by Issue a credit note (app/finance/books-actions.ts)
 * and an overpayment held as the client's credit (`holdOverpayment` below, called by Record a payment and Confirm). Single statements, each
 * retried on a taken number — never a transaction (a money write against libSQL under the rail's and the page's reads, S06's lesson).
 */

export async function fetchCreditRules(): Promise<CreditRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, CREDIT_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_CREDIT_RULES
  try { return parseCreditRules(JSON.parse(row.value)) } catch { return DEFAULT_CREDIT_RULES }
}
async function creditNumbers(): Promise<string[]> {
  return (await db.select({ n: creditNotes.number }).from(creditNotes)).map((r) => r.n)
}
/** Insert a credit note under the next number; a race that took the number takes the next one (three tries). Answers the number. */
export async function insertNumberedCredit(values: Omit<NewCreditNote, 'number'>, at: Date): Promise<string> {
  const rules = await fetchCreditRules()
  let number = nextCreditNumber(rules.numbering, await creditNumbers(), at)
  for (let k = 0; k < 3; k++) {
    try {
      await db.insert(creditNotes).values({ ...values, number })
      return number
    } catch (e) {
      if (k === 2) throw e
      number = nextCreditNumber(rules.numbering, await creditNumbers(), at)
    }
  }
  return number
}

/* ── An overpayment held as the client's credit (the projects card's D-14, as recommended) ─────────────────────────────────────── */

type HoldContext = { p: { id: string; leadId: string; name: string; number: string }; viewer: { id: string } }
export type HeldCreditMade = { id: string; number: string; fileId: string; eventId: string }

/**
 * What a client paid beyond what an invoice owed becomes their credit: a credit note of kind `overpayment` on that invoice, naming the payment
 * it came with — no GST (money held, not a price changed), numbered, filed in Files › Payments (its entry opens its paper, as every money
 * paper's does), its Activity line (a money line). It lowers no invoice (`moneyOf`); a later invoice takes from it, or it is refunded.
 */
export async function holdOverpayment(c: HoldContext, o: { paymentId: string; invoiceId: string; invoiceLabel: string; extraMinor: number; paidMinor: number; owedMinor: number; at: Date }): Promise<HeldCreditMade> {
  const id = randomUUID()
  const reason = overpaymentReason({ invoice: o.invoiceLabel, paidMinor: o.paidMinor, owedMinor: o.owedMinor })
  const number = await insertNumberedCredit({ id, projectId: c.p.id, invoiceId: o.invoiceId, reason, amountMinor: o.extraMinor, gstMinor: 0, status: 'issued', issuedBy: c.viewer.id, issuedAt: o.at, createdAt: o.at, kind: 'overpayment', paymentId: o.paymentId }, o.at)
  const fileId = await fileMoneyDoc(c.p.leadId, c.viewer.id, { number, stage: `Credit note · overpayment on ${o.invoiceLabel}`, at: o.at })
  await db.update(creditNotes).set({ fileId }).where(eq(creditNotes.id, id))
  const eventId = await logProjectEvent(db, c.p.leadId, c.p.id, 'project_credit_issued', { name: c.p.name, number, id, title: o.invoiceLabel, to: money2(o.extraMinor), reason, overpayment: true, paid: money2(o.paidMinor), owed: money2(o.owedMinor) }, { actorId: c.viewer.id, at: o.at })
  return { id, number, fileId, eventId }
}

export { heldCreditOfPayment } from './credit-records'

/** A payment's Undo (or a confirmation's) takes its overpayment's credit with it: the note, its entry in Files, its Activity line, its bell rows. */
export async function dropHeldCredit(cn: Pick<CreditNote, 'id' | 'projectId' | 'fileId'>, leadId: string): Promise<void> {
  await db.delete(creditNotes).where(eq(creditNotes.id, cn.id))
  if (cn.fileId) await db.delete(leadFiles).where(and(eq(leadFiles.id, cn.fileId), eq(leadFiles.leadId, leadId)))
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, cn.projectId), eq(leadEvents.kind, 'project_credit_issued'), sql`json_extract(${leadEvents.detail}, '$.id') = ${cn.id}`))
  await db.delete(notifications).where(like(notifications.href, `%${cn.id}%`))
}
