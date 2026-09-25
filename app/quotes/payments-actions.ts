'use server'

import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quotePayments, quotes, type QuotePayment } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { isDueKind, type DueKind } from '@/lib/quotes/payments'
import { fetchQuoteRules } from '@/lib/settings/queries'
import { changesPayments } from '@/lib/settings/types'
import { fetchViewer } from '@/lib/leads/visibility'

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
  const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  return q
}
async function rowOf(id: string) {
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

export type PaymentInput = { name: string; description: string | null; pct: number; dueKind: DueKind; dueAt: Date | number | null }
export type PaymentPatch = Partial<PaymentInput>

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
  const kind = set.dueKind ?? current?.dueKind
  const at = set.dueAt !== undefined ? set.dueAt : current?.dueAt ?? null
  if (kind === 'approval') set.dueAt = null
  else if (kind === 'fixed' && !at) set.dueKind = 'estimate'   // a "fixed" row without a date is just an estimate waiting to be set
  return set
}

/** Presets, Add Payments with AI and undo write the whole schedule at once — validated first, then one transaction. */
export async function replaceQuotePayments(quoteId: string, rows: PaymentInput[]): Promise<{ updatedAt: number; rows: QuotePayment[] }> {
  await assertMayEditPayments()
  await quoteOf(quoteId)
  const now = new Date()
  const values = rows.slice(0, 50).map((r, i) => {
    const set = clean(r)
    return { id: randomUUID(), quoteId, position: i, name: set.name ?? 'Payment', description: set.description ?? null, pct: set.pct ?? 0, dueKind: set.dueKind ?? 'estimate', dueAt: set.dueAt ?? null, createdAt: now, updatedAt: now }
  })
  await db.transaction(async (tx) => {
    await tx.delete(quotePayments).where(eq(quotePayments.quoteId, quoteId))
    if (values.length) await tx.insert(quotePayments).values(values)
  })
  const { updatedAt } = await stamp(quoteId)
  return { updatedAt, rows: await list(quoteId) }
}

/** An inline edit (name · description · % · amount-as-% · due) on one row. */
export async function updateQuotePayment(id: string, patch: PaymentPatch): Promise<{ updatedAt: number }> {
  await assertMayEditPayments()
  const r = await rowOf(id)
  const set = clean(patch, r)
  set.updatedAt = new Date()
  await db.update(quotePayments).set(set).where(eq(quotePayments.id, id))
  return stamp(r.quoteId)
}

/** "Add a Payment": a new row at the end of the schedule. */
export async function createQuotePayment(quoteId: string, input: PaymentInput): Promise<{ updatedAt: number; row: QuotePayment }> {
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
export async function deleteQuotePayment(id: string): Promise<{ updatedAt: number }> {
  await assertMayEditPayments()
  const r = await rowOf(id)
  await db.delete(quotePayments).where(eq(quotePayments.id, id))
  const rest = await list(r.quoteId)
  for (let i = 0; i < rest.length; i++) if (rest[i]!.position !== i) await db.update(quotePayments).set({ position: i }).where(eq(quotePayments.id, rest[i]!.id))
  return stamp(r.quoteId)
}

/** The handle's drag: the whole order in one write. */
export async function reorderQuotePayments(quoteId: string, orderedIds: string[]): Promise<{ updatedAt: number }> {
  await assertMayEditPayments()
  const rows = await list(quoteId)
  const known = new Set(rows.map((r) => r.id))
  const order = orderedIds.filter((id) => known.has(id))
  for (const r of rows) if (!order.includes(r.id)) order.push(r.id)
  for (let i = 0; i < order.length; i++) await db.update(quotePayments).set({ position: i }).where(eq(quotePayments.id, order[i]!))
  return stamp(quoteId)
}
