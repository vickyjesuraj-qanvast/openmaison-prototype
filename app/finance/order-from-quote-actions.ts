'use server'

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadEvents, purchaseOrderLines, purchaseOrders, quoteItems, quotes, vendors } from '@/lib/db/schema'
import { dropLeadEvents } from '@/lib/leads/events'
import { completedBlock } from '@/lib/projects/handover-model'
import { fetchCostRules, wasteOf } from '@/lib/finance/queries'
import { orderedQty } from '@/lib/company/price-book-waste'
import { fetchStudio } from '@/lib/settings/queries'
import { nameKey } from '@/lib/finance/model'
import { PO_RULE, preparesPo } from '@/lib/finance/rules'
import { forCosts, isRefusal, touchCosts, type Refusal } from '@/lib/finance/server'
import { removePo, savePo } from './po-actions'
import { ORDER_COST_HIDDEN, seesCost } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)

/*
 * (simplify Q-10 · P3 §6.8) *Order from the quote*: the signed quote's lines already carry who does them (`quote_items.vendor`, REG-623), so the
 * Money tab's New ▾ lists them by vendor — with what is already on another PO — and makes ONE Draft PO per ticked vendor through today's save
 * path (`savePo`, app/finance/po-actions.ts: its rules, its numbering, its Activity line), the lines at their cost as *Add from the quote* puts
 * them. Nothing is sent: each Draft waits on the Costs list for its own Send (or Submit). One sentence + Undo (`undoOrderFromQuote` removes the
 * Drafts it made through `removePo` and takes both their lines off Activity). A vendor the directory does not know is said in its row — the
 * studio adds it in Finance › Vendors first (a PO always names a vendor from the directory, F1-Q4). The PO dialog's *Add from the quote* stays.
 * (pending modules S12 — card held:price-book, "Waste factor % … revisit: Order from the quote sends quoted quantities to vendors") A line that
 * came from a My Items entry with a waste share orders that much more (`orderedQty`, rounded up); the quote keeps its quantity.
 */

export type OrderLine = { id: string; name: string
  /** what the PO orders — the quote's quantity plus its item's waste share */ qty: number
  /** (pending modules S12) the quote's own quantity, and the waste share added on top (0 = none) */ quotedQty: number; wastePct: number
  unit: string | null; costMinor: number; category: string | null
  /** the live PO (not cancelled) this quote line is already on, if any */ onPo: string | null }
export type OrderGroup = {
  /** the vendor as the quote names it */ name: string
  /** the directory's vendor it is, or null — with why it can't be ordered here */ vendorId: string | null; block: string | null
  lines: OrderLine[]
}
export type OrderFromQuote = { quote: { id: string; number: string } | null; groups: OrderGroup[]; unassigned: number }

/** The signed quote's lines by their Vendor/Sub, each with the PO it is already on. */
export async function orderFromQuoteLines(projectId: string): Promise<OrderFromQuote | Refusal> {
  const c = await forCosts(typeof projectId === 'string' ? projectId : ''); if (isRefusal(c)) return c
  if (!preparesPo(c.viewer, c.team)) return { error: PO_RULE }
  if (!seesCost(c.viewer)) return { error: ORDER_COST_HIDDEN }   // (pending modules S41b-1) the lines are listed at their cost
  const shut = completedBlock(c.p.stage, 'money'); if (shut) return { error: shut }
  if (!c.p.quoteId) return { quote: null, groups: [], unassigned: 0 }
  const [q] = await db.select({ id: quotes.id, number: quotes.number }).from(quotes).where(and(eq(quotes.id, c.p.quoteId), isNull(quotes.deletedAt))).limit(1)
  if (!q) return { quote: null, groups: [], unassigned: 0 }
  const [rows, dir, onPos] = await Promise.all([
    db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, q.id), eq(quoteItems.kind, 'item'))).orderBy(asc(quoteItems.position)),
    db.select({ id: vendors.id, name: vendors.name, isActive: vendors.isActive, mergedInto: vendors.mergedInto }).from(vendors),
    db.select({ quoteItemId: purchaseOrderLines.quoteItemId, number: purchaseOrders.number, status: purchaseOrders.status }).from(purchaseOrderLines)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderLines.poId))
      .where(and(eq(purchaseOrders.projectId, c.p.id), isNull(purchaseOrders.deletedAt))),
  ])
  const ordered = new Map<string, string>()
  for (const r of onPos) if (r.quoteItemId && r.status !== 'cancelled') ordered.set(r.quoteItemId, r.number)
  const live = rows.filter((r) => r.status !== 'Declined' && !r.optional && r.costMinor > 0)
  const waste = await wasteOf(live.map((r) => r.priceBookItemId))
  const byVendor = new Map<string, OrderLine[]>()
  let unassigned = 0
  for (const r of live) {
    const v = (r.vendor ?? '').trim()
    if (!v) { unassigned++; continue }
    const list = byVendor.get(v) ?? []
    const w = (r.priceBookItemId ? waste.get(r.priceBookItemId) : 0) ?? 0
    list.push({ id: r.id, name: r.name, qty: orderedQty(r.qty, w), quotedQty: r.qty, wastePct: w, unit: r.unit, costMinor: r.costMinor, category: r.category, onPo: ordered.get(r.id) ?? null })
    byVendor.set(v, list)
  }
  const groups: OrderGroup[] = [...byVendor.entries()].map(([name, lines]) => {
    const match = dir.find((d) => !d.mergedInto && nameKey(d.name) === nameKey(name))   // "Floor Xpert" is Floor Xpert Pte Ltd — the PO dialog's rule
    const block = !match ? `${name} isn’t in Finance › Vendors — add it there first` : !match.isActive ? `${match.name} is deactivated — reactivate it in Finance › Vendors` : null
    return { name: match?.name ?? name, vendorId: match && match.isActive ? match.id : null, block, lines }
  })
  return { quote: q, groups, unassigned }
}

export type OrderUndo = { poIds: string[] }

/** One Draft PO per ticked vendor, its ticked lines at their cost. Answers the sentence and the Undo. */
export async function orderFromQuote(projectId: string, o: { orders: { vendorId: string; lineIds: string[] }[] }): Promise<{ sentence: string; made: { id: string; number: string }[]; undo: OrderUndo } | Refusal> {
  const c = await forCosts(typeof projectId === 'string' ? projectId : ''); if (isRefusal(c)) return c
  if (!preparesPo(c.viewer, c.team)) return { error: PO_RULE }
  if (!seesCost(c.viewer)) return { error: ORDER_COST_HIDDEN }   // (pending modules S41b-1) each Draft is priced at the quote's costs
  const shut = completedBlock(c.p.stage, 'money'); if (shut) return { error: shut }
  if (!c.p.quoteId) return { error: 'The project has no signed quote to order from' }
  const orders = (Array.isArray(o?.orders) ? o.orders : []).filter((x) => typeof x?.vendorId === 'string' && Array.isArray(x.lineIds) && x.lineIds.length).slice(0, 30)
  if (!orders.length) return { error: 'Tick the lines to order' }
  const ids = [...new Set(orders.flatMap((x) => x.lineIds.filter((id) => typeof id === 'string')))]
  const lines = await db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, c.p.quoteId), eq(quoteItems.kind, 'item'), inArray(quoteItems.id, ids)))
  const [rules, studio, dir, waste] = await Promise.all([fetchCostRules(), fetchStudio(), db.select().from(vendors).where(inArray(vendors.id, orders.map((x) => x.vendorId))), wasteOf(lines.map((l) => l.priceBookItemId))])
  const gstRate = studio.gstRegistered === false ? 0 : studio.gstPct
  const made: { id: string; number: string }[] = []
  for (const order of orders) {
    const v = dir.find((d) => d.id === order.vendorId)
    if (!v || v.mergedInto || !v.isActive) continue
    const mine = order.lineIds.map((id) => lines.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l)
    if (!mine.length) continue
    const r = await savePo({
      projectId: c.p.id, vendorId: v.id, title: mine.length === 1 ? mine[0]!.name.slice(0, 120) : `${mine[0]!.category ?? v.trade ?? 'Works'} — ${mine.length} lines from the quote`.slice(0, 120),
      lines: mine.map((l) => ({ description: l.name, category: l.category, qty: orderedQty(l.qty, l.priceBookItemId ? waste.get(l.priceBookItemId) : 0), unit: l.unit, unitMinor: l.costMinor, quoteItemId: l.id, milestoneId: null })),   // (pending modules S12) + its waste
      chargesGst: v.chargesGst && gstRate > 0, advanceKind: 'none', advanceValue: 0, terms: rules.terms, termsText: null, expectedOn: null, deliveryAddress: c.address, vendorNote: null,
    })
    if (isRefusal(r)) {
      if (made.length) await undoOrderFromQuote({ poIds: made.map((x) => x.id) })   // all or nothing — no half an order
      return { error: `${v.name}: ${r.error}` }
    }
    made.push({ id: r.id, number: r.number })
  }
  if (!made.length) return { error: 'None of those vendors can take a PO — check them in Finance › Vendors' }
  touchCosts(c.p)
  const sentence = made.length === 1 ? `${made[0]!.number} is a Draft — send it from Costs` : `${made.length} Draft POs made — ${made.map((x) => x.number).join(', ')}; send each from Costs`
  return { sentence, made, undo: { poIds: made.map((x) => x.id) } }
}

/** Undo: the Drafts it made are removed (today's `removePo`), and neither their making nor their removal stays on Activity. */
export async function undoOrderFromQuote(u: OrderUndo): Promise<{ ok: true } | Refusal> {
  const ids = (Array.isArray(u?.poIds) ? u.poIds : []).filter((x) => typeof x === 'string').slice(0, 30)
  for (const id of ids) {
    const r = await removePo(id)
    if (isRefusal(r)) return r
    const made = await db.select({ id: leadEvents.id }).from(leadEvents).where(and(eq(leadEvents.kind, 'project_po_created'), sql`json_extract(${leadEvents.detail}, '$.id') = ${id}`))
    await dropLeadEvents([r.undo.eventId, ...made.map((m) => m.id)])
  }
  return { ok: true }
}
