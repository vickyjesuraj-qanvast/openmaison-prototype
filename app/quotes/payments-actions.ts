'use server'

import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quotePayments, quotes, type QuotePayment } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { FEE_FIRST_ALONE, FEE_FIRST_ONLY, FEE_FIRST_RULE, FEE_FIRST_STAYS, isDueKind, type DueKind } from '@/lib/quotes/payments'
import { fetchInvoiceRules } from '@/lib/projects/money-queries'   // (parity map, MI-021) Settings › Finance › Invoices › May open with a fixed fee
import { fetchQuoteRules } from '@/lib/settings/queries'
import { changesPayments } from '@/lib/settings/types'
import { fetchViewer } from '@/lib/leads/visibility'
import { deskRefusal, keepOffDesk, offDesk } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server

/* Payment Schedule (1238:29290, REG-418). Every write stamps the quote's `updatedAt` — the header's "Saved …" follows it —
   and revalidates the lead (its Activity feed derives a row from these records, lib/leads/activity.ts). */

/** (REG-626, quote editor parity §8.2 · E-88) The payment lock (Settings › Quotes) holds on the server too: with it on, only Owners and
    Admins change a schedule — the editor already shows it read-only to everyone else. */
async function assertMayEditPayments(): Promise<void> {
  const { paymentLock } = await fetchQuoteRules()
  if (!paymentLock) return
  if (!changesPayments((await fetchViewer()).role, paymentLock)) throw new Error('only Owners and Admins change the payment schedule')   // (REG-645) the rule Settings' roles table states
}
async function quoteOf(quoteId: string) {
  await keepOffDesk()   // (S44Z) the role first — nothing is read for Marketing
  const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  return q
}
async function rowOf(id: string) {
  await keepOffDesk()   // (S44Z)
  const [r] = await db.select().from(quotePayments).where(eq(quotePayments.id, id))
  if (!r) throw new Error('payment not found')
  return r
}
async function stamp(quoteId: string): Promise<{ updatedAt: number }> {
  const q = await quoteOf(quoteId)
  const now = new Date()
  await db.update(quotes).set({ updatedAt: now }).where(eq(quotes.id, quoteId))
  revalidateLead(q.leadId); revalidatePath(`/quotes/${quoteId}`)
  return { updatedAt: now.getTime() }
}
const list = (quoteId: string) => db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt))

export type PaymentInput = { name: string; description: string | null; pct: number; dueKind: DueKind; dueAt: Date | number | null
  /** (parity map, MI-021) the first row as a fixed fee — null = a share */ fixedMinor?: number | null
  /** (S44T — UAT row 310) the fixed row's own word where a share prints its % ("Design Fee"); null = "Fixed fee" */ fixedLabel?: string | null }
export type PaymentPatch = Partial<PaymentInput>
type Refusal = { error: string }

/** (parity map, MI-021) Whether the studio lets a schedule open with a fixed fee — the Payment Schedule offers its `% · S$` switch only then. */
export async function readPaymentFeeFirst(): Promise<{ feeFirst: boolean }> {
  if (await offDesk()) return { feeFirst: false }   // (S44Z) the editors' role rule: a read answers nothing
  return { feeFirst: !!(await fetchInvoiceRules()).feeFirst }
}
/** (parity map, MI-021) A fixed fee is the first row's only, never the only row, and needs the studio's rule — a row already fixed may still be
    turned back to a share, or keep its fee, whatever the rule says now (the record wins). */
async function feeProblem(rows: { fixedMinor?: number | null }[], before: { fixedMinor: number | null }[]): Promise<string | null> {
  const fixed = rows.map((r, i) => ({ i, f: typeof r.fixedMinor === 'number' && r.fixedMinor > 0 ? Math.round(r.fixedMinor) : 0 })).filter((x) => x.f > 0)
  if (!fixed.length) return null
  if (fixed.some((x) => x.i !== 0)) return FEE_FIRST_ONLY
  if (rows.length < 2) return FEE_FIRST_ALONE
  const kept = before[0]?.fixedMinor != null && before[0].fixedMinor === fixed[0]!.f
  if (!kept && !(await fetchInvoiceRules()).feeFirst) return FEE_FIRST_RULE
  return null
}

const num = (v: unknown, lo: number, hi: number, fallback: number) => { const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback; return Math.min(hi, Math.max(lo, n)) }
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const date = (v: unknown): Date | null => { const d = v instanceof Date ? v : typeof v === 'number' ? new Date(v) : null; return d && Number.isFinite(d.getTime()) ? d : null }

/** Public endpoint: every field bounded, the due kind checked, and the kind / date pair kept consistent. */
function clean(p: PaymentPatch, current?: Pick<QuotePayment, 'dueKind' | 'dueAt'>): Partial<typeof quotePayments.$inferInsert> {
  const set: Partial<typeof quotePayments.$inferInsert> = {}
  if (p.name !== undefined) set.name = (str(p.name, 120) ?? '').trim() || 'Payment'
  if (p.description !== undefined) set.description = p.description === null ? null : (str(p.description, 300)?.trim() || null)
  if (p.pct !== undefined) set.pct = Number(num(p.pct, 0, 999, 0).toFixed(2))   // past 100 stays writable: the table shows the over-balance error, it does not refuse it
  if (p.dueKind !== undefined) { if (!isDueKind(p.dueKind)) throw new Error(`Unknown due kind: ${p.dueKind}`); set.dueKind = p.dueKind }
  if (p.dueAt !== undefined) set.dueAt = date(p.dueAt)
  if (p.fixedMinor !== undefined) set.fixedMinor = p.fixedMinor === null ? null : Math.round(num(p.fixedMinor, 0, 1e11, 0)) || null   // (parity map, MI-021)
  if (p.fixedLabel !== undefined) { const w = p.fixedLabel === null ? '' : (str(p.fixedLabel, 30) ?? '').replace(/\s+/g, ' ').trim(); set.fixedLabel = w && w.toLowerCase() !== 'fixed fee' ? w : null }   // (S44T — row 310)
  const kind = set.dueKind ?? current?.dueKind
  const at = set.dueAt !== undefined ? set.dueAt : current?.dueAt ?? null
  if (kind === 'approval') set.dueAt = null
  else if (kind === 'fixed' && !at) set.dueKind = 'estimate'   // a "fixed" row without a date is just an estimate waiting to be set
  return set
}

/** Presets, Add Payments with AI and undo write the whole schedule at once — validated first, then one transaction. */
export async function replaceQuotePayments(quoteId: string, rows: PaymentInput[]): Promise<{ updatedAt: number; rows: QuotePayment[] } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await assertMayEditPayments()
  await quoteOf(quoteId)
  const now = new Date()
  /* (parity map, MI-021) the % · S$ switch, its Undo and a preset all write here — a fixed fee is checked first */
  const why = await feeProblem(rows.slice(0, 50), await list(quoteId)); if (why) return { error: why }
  const values = rows.slice(0, 50).map((r, i) => {
    const set = clean(r)
    return { id: randomUUID(), quoteId, position: i, name: set.name ?? 'Payment', description: set.description ?? null, pct: set.pct ?? 0, dueKind: set.dueKind ?? 'estimate', dueAt: set.dueAt ?? null, fixedMinor: i === 0 ? set.fixedMinor ?? null : null,
      fixedLabel: i === 0 && set.fixedMinor ? set.fixedLabel ?? null : null,   // (S44O — row 297) a fixed fee's own word rides with its amount — an Undo dropped "Design Fee"
      createdAt: now, updatedAt: now }
  })
  await db.transaction(async (tx) => {
    await tx.delete(quotePayments).where(eq(quotePayments.quoteId, quoteId))
    if (values.length) await tx.insert(quotePayments).values(values)
  })
  const { updatedAt } = await stamp(quoteId)
  return { updatedAt, rows: await list(quoteId) }
}

/** An inline edit (name · description · % · amount-as-% · due) on one row. */
export async function updateQuotePayment(id: string, patch: PaymentPatch): Promise<{ updatedAt: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await assertMayEditPayments()
  const r = await rowOf(id)
  /* (parity map, MI-021) a fixed fee's own amount, typed in its Amount cell — the first row only, under the studio's rule */
  if (patch.fixedMinor !== undefined && patch.fixedMinor !== null) {
    const all = await list(r.quoteId)
    const at = all.findIndex((x) => x.id === id)
    const why = await feeProblem(all.map((x, i) => (i === at ? { fixedMinor: patch.fixedMinor } : { fixedMinor: x.fixedMinor })), all.map((x) => (x.id === id ? { fixedMinor: null } : x)))
    if (why) return { error: why }
  }
  const set = clean(patch, r)
  set.updatedAt = new Date()
  await db.update(quotePayments).set(set).where(eq(quotePayments.id, id))
  return stamp(r.quoteId)
}

/** "Add a Payment": a new row at the end of the schedule. */
export async function createQuotePayment(quoteId: string, input: PaymentInput): Promise<{ updatedAt: number; row: QuotePayment } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await assertMayEditPayments()
  await quoteOf(quoteId)
  const rows = await list(quoteId)
  const set = clean(input)
  const now = new Date()
  const id = randomUUID()
  await db.insert(quotePayments).values({ id, quoteId, position: rows.length, name: set.name ?? 'Payment', description: set.description ?? null, pct: set.pct ?? 0, dueKind: set.dueKind ?? 'estimate', dueAt: set.dueAt ?? null, createdAt: now, updatedAt: now })
  const { updatedAt } = await stamp(quoteId)
  return { updatedAt, row: await rowOf(id) }
}

/** The row's delete (hover, 1271:39003). */
export async function deleteQuotePayment(id: string): Promise<{ updatedAt: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await assertMayEditPayments()
  const r = await rowOf(id)
  await db.delete(quotePayments).where(eq(quotePayments.id, id))
  const rest = await list(r.quoteId)
  for (let i = 0; i < rest.length; i++) if (rest[i]!.position !== i) await db.update(quotePayments).set({ position: i }).where(eq(quotePayments.id, rest[i]!.id))
  return stamp(r.quoteId)
}

/** The handle's drag: the whole order in one write. */
export async function reorderQuotePayments(quoteId: string, orderedIds: string[]): Promise<{ updatedAt: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await assertMayEditPayments()
  const rows = await list(quoteId)
  const known = new Set(rows.map((r) => r.id))
  const order = orderedIds.filter((id) => known.has(id))
  for (const r of rows) if (!order.includes(r.id)) order.push(r.id)
  if (rows[0]?.fixedMinor != null && order[0] !== rows[0].id) return { error: FEE_FIRST_STAYS }   // (parity map, MI-021)
  for (let i = 0; i < order.length; i++) await db.update(quotePayments).set({ position: i }).where(eq(quotePayments.id, order[i]!))
  return stamp(quoteId)
}
