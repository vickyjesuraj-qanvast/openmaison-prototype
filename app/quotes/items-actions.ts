'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { priceBookItems, quoteItems, quotes, type PriceBookItem, type QuoteItem } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { isDensity, isItemKind, isItemStatus, isItemsView, isVisibility, parseColumns, parseLabels, type ColumnSettings, type ItemLabels } from '@/lib/quotes/items-model'
import { quoteTotals } from '@/lib/quotes/math'

/* Items section (1260:31209, REG-415). Every write ends in `sync`: the quote's amount is DERIVED from its lines (REG-343 / REG-403)
   — the Quotes tab, the Overview card and the Move stage window read `quotes.amount_minor`, so it is recomputed here, never typed. */

const touch = (leadId: string, quoteId: string) => { revalidateLead(leadId); revalidatePath(`/quotes/${quoteId}`) }

async function quoteOf(quoteId: string) {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  return q
}
async function itemOf(itemId: string) {
  const [i] = await db.select().from(quoteItems).where(eq(quoteItems.id, itemId))
  if (!i) throw new Error('item not found')
  return i
}
async function linesOf(quoteId: string) {
  return db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position), asc(quoteItems.createdAt))
}
/** Recompute the quote's amount from its lines and stamp it; returns the new totals' stamp for the header's "Saved …". */
async function sync(quoteId: string): Promise<{ updatedAt: number; amountMinor: number }> {
  const q = await quoteOf(quoteId)
  const lines = await linesOf(quoteId)
  const t = quoteTotals(lines, q)
  const now = new Date()
  await db.update(quotes).set({ amountMinor: t.totalMinor, updatedAt: now }).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId)
  return { updatedAt: now.getTime(), amountMinor: t.totalMinor }
}
/** Siblings renumbered 0…n so a position is never shared. */
async function renumber(quoteId: string, parentId: string | null) {
  const sibs = (await linesOf(quoteId)).filter((i) => (i.parentId ?? null) === parentId)
  for (let i = 0; i < sibs.length; i++) if (sibs[i]!.position !== i) await db.update(quoteItems).set({ position: i }).where(eq(quoteItems.id, sibs[i]!.id))
}

const num = (v: unknown, lo: number, hi: number, fallback: number) => { const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback; return Math.min(hi, Math.max(lo, n)) }
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const label = (v: unknown) => (v === null ? null : str(v, 60)?.trim() || null)

export type ItemPatch = Partial<Pick<QuoteItem, 'name' | 'description' | 'status' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'room' | 'category' | 'section' | 'visibility' | 'collapsed' | 'icon' | 'thumb' | 'thumbCount'>>

/** Public endpoint: every field is bounded and every enum checked before it is written. */
function cleanPatch(p: ItemPatch): Partial<typeof quoteItems.$inferInsert> {
  const set: Partial<typeof quoteItems.$inferInsert> = {}
  if (p.name !== undefined) set.name = (str(p.name, 200) ?? '').trim() || 'Item'
  if (p.description !== undefined) set.description = p.description === null ? null : str(p.description, 2000) ?? null
  if (p.status !== undefined) { if (!isItemStatus(p.status)) throw new Error(`Unknown status: ${p.status}`); set.status = p.status }
  if (p.qty !== undefined) set.qty = num(p.qty, 0, 1_000_000, 1)
  if (p.unit !== undefined) set.unit = p.unit === null ? null : (str(p.unit, 40)?.trim() || null)
  if (p.costMinor !== undefined) set.costMinor = Math.round(num(p.costMinor, 0, 1e11, 0))
  if (p.markupMinor !== undefined) set.markupMinor = Math.round(num(p.markupMinor, -1e11, 1e11, 0))
  if (p.discountPct !== undefined) set.discountPct = num(p.discountPct, 0, 100, 0)
  if (p.gstPct !== undefined) set.gstPct = num(p.gstPct, 0, 100, 9)
  if (p.room !== undefined) set.room = label(p.room)
  if (p.category !== undefined) set.category = label(p.category)
  if (p.section !== undefined) set.section = label(p.section)
  if (p.visibility !== undefined) { if (!isVisibility(p.visibility)) throw new Error(`Unknown visibility: ${p.visibility}`); set.visibility = p.visibility }
  if (p.collapsed !== undefined) set.collapsed = !!p.collapsed
  if (p.icon !== undefined) set.icon = p.icon === null ? null : isItemKind(p.icon) ? p.icon : null
  if (p.thumb !== undefined) set.thumb = p.thumb === null ? null : str(p.thumb, 300) ?? null
  if (p.thumbCount !== undefined) set.thumbCount = Math.round(num(p.thumbCount, 0, 99, 0))
  return set
}

export type CreateItemInput = {
  kind?: 'item' | 'group'
  name?: string
  parentId?: string | null
  /** Insert right after / before this sibling; absent → the end of the parent. */
  afterId?: string | null
  beforeId?: string | null
  /** "My Items" pick: the line copies the price-book entry. */
  priceBookItemId?: string | null
  category?: string | null
  room?: string | null
  section?: string | null
}

/** Add Item row · row "+" · Create ▾ · the My Items popover · Create Group (REG-415). Returns the new line. */
export async function createQuoteItem(quoteId: string, input: CreateItemInput = {}): Promise<QuoteItem> {
  const q = await quoteOf(quoteId)
  const kind = input.kind === 'group' ? 'group' : 'item'
  let parentId = input.parentId ?? null
  let status: QuoteItem['status'] = 'Pending'
  if (parentId) { const p = await itemOf(parentId); if (p.quoteId !== quoteId || p.kind !== 'group') throw new Error('bad parent'); status = p.status }   // a child carries its group's answer
  if (kind === 'group') parentId = null   // groups nest one level (the mock's 4 → 4.1)
  let pb: PriceBookItem | null = null
  if (input.priceBookItemId) { const [row] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, input.priceBookItemId)); pb = row ?? null }
  const sibs = (await linesOf(quoteId)).filter((i) => (i.parentId ?? null) === parentId)
  let position = sibs.length
  const anchor = input.afterId ?? input.beforeId ?? null
  if (anchor) {
    const idx = sibs.findIndex((s) => s.id === anchor)
    if (idx >= 0) position = input.afterId ? idx + 1 : idx
  }
  // open the slot
  for (const s of sibs) if (s.position >= position) await db.update(quoteItems).set({ position: s.position + 1 }).where(eq(quoteItems.id, s.id))
  const now = new Date()
  const id = randomUUID()
  const name = (str(input.name, 200) ?? '').trim() || (pb ? pb.name : kind === 'group' ? 'New Group' : 'Item')
  await db.insert(quoteItems).values({
    id, quoteId, parentId, kind, position, name,
    description: pb?.description ?? null,
    icon: pb ? (isItemKind(pb.kind) ? pb.kind : null) : null,
    thumb: pb?.thumb ?? null, thumbCount: pb?.thumb ? 1 : 0,
    status, qty: 1, unit: pb?.unit ?? null,
    costMinor: pb?.costMinor ?? 0, markupMinor: pb?.markupMinor ?? 0, discountPct: 0, gstPct: 9,
    category: label(input.category) ?? pb?.category ?? null, room: label(input.room), section: label(input.section),
    visibility: 'visible', collapsed: false, priceBookItemId: pb?.id ?? null, createdAt: now, updatedAt: now,
  })
  if (pb) await db.update(priceBookItems).set({ updatedAt: now }).where(eq(priceBookItems.id, pb.id))
  await renumber(quoteId, parentId)
  await sync(q.id)
  return itemOf(id)
}

/** Inline cell edits, the status chip, the visibility menu, Use Icon, a group's fold (autosaved by the editor). */
export async function updateQuoteItem(itemId: string, patch: ItemPatch): Promise<{ updatedAt: number; amountMinor: number }> {
  const i = await itemOf(itemId)
  const set = cleanPatch(patch)
  // (REG-417) Unit Price = Cost + Markup never drops below zero: the markup is bounded by the line's cost.
  const cost = set.costMinor ?? i.costMinor
  if ((set.markupMinor ?? i.markupMinor) < -cost) set.markupMinor = -cost
  set.updatedAt = new Date()
  await db.update(quoteItems).set(set).where(eq(quoteItems.id, itemId))
  // The chip sits on the group row and a child's STATUS cell is empty (spec 03), so a group's answer is its children's (REG-417).
  if (i.kind === 'group' && set.status !== undefined) await db.update(quoteItems).set({ status: set.status, updatedAt: set.updatedAt }).where(eq(quoteItems.parentId, itemId))
  return sync(i.quoteId)
}

/** Remove · bulk Delete: a group takes its children with it. */
export async function deleteQuoteItems(ids: string[]): Promise<{ updatedAt: number; amountMinor: number } | null> {
  if (!ids.length) return null
  const first = await itemOf(ids[0]!)
  const all = await linesOf(first.quoteId)
  const gone = new Set(ids)
  for (const i of all) if (i.parentId && gone.has(i.parentId)) gone.add(i.id)
  await db.delete(quoteItems).where(and(eq(quoteItems.quoteId, first.quoteId), inArray(quoteItems.id, [...gone])))
  await renumber(first.quoteId, null)
  for (const g of all.filter((i) => i.kind === 'group' && !gone.has(i.id))) await renumber(first.quoteId, g.id)
  return sync(first.quoteId)
}

/** Row menu › Duplicate: the copy lands right under the original (a group brings its children). */
export async function duplicateQuoteItem(itemId: string): Promise<QuoteItem> {
  const src = await itemOf(itemId)
  const all = await linesOf(src.quoteId)
  const sibs = all.filter((i) => (i.parentId ?? null) === (src.parentId ?? null))
  const at = sibs.findIndex((s) => s.id === src.id) + 1
  for (const s of sibs) if (s.position >= at) await db.update(quoteItems).set({ position: s.position + 1 }).where(eq(quoteItems.id, s.id))
  const now = new Date()
  const id = randomUUID()
  const { id: _id, createdAt: _c, updatedAt: _u, position: _p, ...rest } = src
  await db.insert(quoteItems).values({ ...rest, id, position: at, createdAt: now, updatedAt: now })
  if (src.kind === 'group') {
    const kids = all.filter((i) => i.parentId === src.id)
    for (const k of kids) { const { id: _k, createdAt: _kc, updatedAt: _ku, ...kr } = k; await db.insert(quoteItems).values({ ...kr, id: randomUUID(), parentId: id, createdAt: now, updatedAt: now }) }
  }
  await renumber(src.quoteId, src.parentId ?? null)
  await sync(src.quoteId)
  return itemOf(id)
}

/** Row menu › Move Item › Up / Down — one step among its siblings. */
export async function moveQuoteItem(itemId: string, dir: 'up' | 'down'): Promise<void> {
  const i = await itemOf(itemId)
  const sibs = (await linesOf(i.quoteId)).filter((s) => (s.parentId ?? null) === (i.parentId ?? null))
  const idx = sibs.findIndex((s) => s.id === i.id)
  const j = dir === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || j < 0 || j >= sibs.length) return
  await db.update(quoteItems).set({ position: sibs[j]!.position }).where(eq(quoteItems.id, i.id))
  await db.update(quoteItems).set({ position: sibs[idx]!.position }).where(eq(quoteItems.id, sibs[j]!.id))
  await sync(i.quoteId)
}

/** Drag reorder (the handle): the whole order of one sibling list, in one write. */
export async function reorderQuoteItems(quoteId: string, parentId: string | null, orderedIds: string[]): Promise<{ updatedAt: number; amountMinor: number }> {
  const sibs = (await linesOf(quoteId)).filter((s) => (s.parentId ?? null) === parentId)
  const known = new Set(sibs.map((s) => s.id))
  const order = orderedIds.filter((id) => known.has(id))
  for (const s of sibs) if (!order.includes(s.id)) order.push(s.id)
  for (let i = 0; i < order.length; i++) await db.update(quoteItems).set({ position: i }).where(eq(quoteItems.id, order[i]!))
  return sync(quoteId)   // the amount is unchanged, but the quote's "Saved …" stamp moves like every other write (REG-417)
}

/** Row menu › Choose New Group (null = out of any group); the line joins the end of its new sibling list. */
export async function setQuoteItemParent(itemId: string, parentId: string | null): Promise<void> {
  const i = await itemOf(itemId)
  if (i.kind === 'group') throw new Error('a group cannot join a group')
  if (parentId) { const p = await itemOf(parentId); if (p.quoteId !== i.quoteId || p.kind !== 'group') throw new Error('bad group') }
  const from = i.parentId ?? null
  const sibs = (await linesOf(i.quoteId)).filter((s) => (s.parentId ?? null) === parentId && s.id !== i.id)
  const status = parentId ? (await itemOf(parentId)).status : i.status   // a child carries its group's answer; a line leaving keeps its own (it gets its chip back)
  await db.update(quoteItems).set({ parentId, position: sibs.length, status, updatedAt: new Date() }).where(eq(quoteItems.id, i.id))
  await renumber(i.quoteId, from)
  await sync(i.quoteId)
}

/** Row menu › Group n Item(s) · bulk Group · Create Group: a new group at the first line's place, the lines under it. */
export async function groupQuoteItems(quoteId: string, ids: string[], name = 'New Group'): Promise<QuoteItem> {
  const q = await quoteOf(quoteId)
  const all = await linesOf(quoteId)
  const picked = all.filter((i) => ids.includes(i.id) && i.kind === 'item')
  const first = picked[0]
  const top = all.filter((i) => !i.parentId)
  const anchorPos = first ? (first.parentId ? (top.find((t) => t.id === first.parentId)?.position ?? top.length) : first.position) : top.length
  for (const t of top) if (t.position >= anchorPos) await db.update(quoteItems).set({ position: t.position + 1 }).where(eq(quoteItems.id, t.id))
  const now = new Date()
  const id = randomUUID()
  // The group's chip speaks for its lines: it takes the answer they all share (else Pending) and the lines follow it.
  const status = picked.length && picked.every((p) => p.status === picked[0]!.status) ? picked[0]!.status : 'Pending'
  await db.insert(quoteItems).values({ id, quoteId, parentId: null, kind: 'group', position: anchorPos, name: (str(name, 200) ?? '').trim() || 'New Group', status, qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, visibility: 'visible', collapsed: false, createdAt: now, updatedAt: now })
  for (let k = 0; k < picked.length; k++) await db.update(quoteItems).set({ parentId: id, position: k, status, updatedAt: now }).where(eq(quoteItems.id, picked[k]!.id))
  await renumber(quoteId, null)
  for (const g of all.filter((i) => i.kind === 'group')) await renumber(quoteId, g.id)
  await sync(q.id)
  return itemOf(id)
}

/** Row menu › Save to Your Library: the line becomes a price-book entry (name, description, kind, unit, cost, markup). */
export async function saveItemToPriceBook(itemId: string): Promise<PriceBookItem> {
  const i = await itemOf(itemId)
  if (i.kind !== 'item') throw new Error('groups are not price-book items')
  const now = new Date()
  const id = randomUUID()
  await db.insert(priceBookItems).values({ id, name: i.name, description: i.description, kind: isItemKind(i.icon) ? i.icon : 'purchase', unit: i.unit ?? 'Pieces', costMinor: i.costMinor, markupMinor: i.markupMinor, category: i.category, thumb: i.thumb, createdAt: now, updatedAt: now })
  await db.update(quoteItems).set({ priceBookItemId: id }).where(eq(quoteItems.id, i.id))
  const q = await quoteOf(i.quoteId)
  touch(q.leadId, q.id)
  const [row] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return row!
}

/** Undo / redo: the editor keeps snapshots of the lines and writes one back whole. */
export async function replaceQuoteItems(quoteId: string, items: QuoteItem[]): Promise<{ updatedAt: number; amountMinor: number }> {
  const q = await quoteOf(quoteId)
  const now = new Date()
  const ids = new Set(items.map((i) => i.id))
  const used = new Set<string>()
  // (REG-417) Every row is validated BEFORE the table is touched, and the delete + inserts run as ONE transaction — a bad
  // snapshot must never leave the quote with half its lines (REG-286: "atomic: no window with the rows deleted").
  const values = items.map((i) => {
    const set = cleanPatch(i)
    let id = typeof i.id === 'string' && i.id.length > 0 && i.id.length <= 64 ? i.id : randomUUID()
    if (used.has(id)) id = randomUUID()
    used.add(id)
    const c = i.createdAt instanceof Date ? i.createdAt : new Date(i.createdAt as unknown as string | number)
    return {
      id, quoteId,
      parentId: i.parentId && ids.has(i.parentId) ? i.parentId : null, kind: i.kind === 'group' ? 'group' as const : 'item' as const,
      position: Math.round(num(i.position, 0, 100000, 0)), name: set.name ?? 'Item', description: set.description ?? null,
      thumb: set.thumb ?? null, thumbCount: set.thumbCount ?? 0, icon: set.icon ?? null, status: set.status ?? 'Pending', qty: set.qty ?? 1,
      unit: set.unit ?? null, costMinor: set.costMinor ?? 0, markupMinor: Math.max(-(set.costMinor ?? 0), set.markupMinor ?? 0), discountPct: set.discountPct ?? 0, gstPct: set.gstPct ?? 9,
      room: set.room ?? null, category: set.category ?? null, section: set.section ?? null, visibility: set.visibility ?? 'visible', collapsed: set.collapsed ?? false,
      priceBookItemId: typeof i.priceBookItemId === 'string' ? i.priceBookItemId : null,
      createdAt: Number.isFinite(c.getTime()) ? c : now, updatedAt: now,
    }
  })
  await db.transaction(async (tx) => {
    await tx.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId))
    for (let at = 0; at < values.length; at += 50) await tx.insert(quoteItems).values(values.slice(at, at + 50))
  })
  return sync(q.id)
}

export type PricingPatch = { additionalDiscountMode?: 'pct' | 'amount'; additionalDiscountValue?: number; gstEnabled?: boolean; issuingEntity?: string | null }
/** The totals card (1271:36761): Additional Discount (% | S$), the GST switch, the Issuing Entity. */
export async function updateQuotePricing(quoteId: string, patch: PricingPatch): Promise<{ updatedAt: number; amountMinor: number }> {
  const q = await quoteOf(quoteId)
  const set: Partial<typeof quotes.$inferInsert> = {}
  const mode = patch.additionalDiscountMode !== undefined ? (patch.additionalDiscountMode === 'amount' ? 'amount' : 'pct') : q.additionalDiscountMode
  if (patch.additionalDiscountMode !== undefined) set.additionalDiscountMode = mode
  if (patch.additionalDiscountValue !== undefined || patch.additionalDiscountMode !== undefined) {
    // (REG-417) The stored value is the applied value: % never above 100, S$ never above the subtotal — the card must not
    // show a figure the maths ignores.
    const raw = patch.additionalDiscountValue !== undefined ? num(patch.additionalDiscountValue, 0, 1e9, 0) : q.additionalDiscountValue
    const max = mode === 'pct' ? 100 : quoteTotals(await linesOf(quoteId), q).subtotalMinor / 100
    set.additionalDiscountValue = Math.min(raw, max)
  }
  if (patch.gstEnabled !== undefined) set.gstEnabled = !!patch.gstEnabled
  if (patch.issuingEntity !== undefined) set.issuingEntity = patch.issuingEntity === null ? null : (str(patch.issuingEntity, 120)?.trim() || null)
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  return sync(quoteId)
}

export type ItemsPrefsPatch = { itemsView?: string; itemsDensity?: string; itemsColumns?: ColumnSettings; itemsLabels?: ItemLabels }
/** View by · density · column settings · the labels the studio adds (Add Category / Add Section). */
export async function updateItemsPrefs(quoteId: string, patch: ItemsPrefsPatch): Promise<void> {
  const q = await quoteOf(quoteId)
  const set: Partial<typeof quotes.$inferInsert> = {}
  if (patch.itemsView !== undefined) { if (!isItemsView(patch.itemsView)) throw new Error('bad view'); set.itemsView = patch.itemsView }
  if (patch.itemsDensity !== undefined) { if (!isDensity(patch.itemsDensity)) throw new Error('bad density'); set.itemsDensity = patch.itemsDensity }
  if (patch.itemsColumns !== undefined) set.itemsColumns = JSON.stringify(parseColumns(JSON.stringify(patch.itemsColumns)))
  if (patch.itemsLabels !== undefined) set.itemsLabels = JSON.stringify(parseLabels(JSON.stringify(patch.itemsLabels)))
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId)
}

/** The quote's lines as stored — the editor reloads them after structural edits (duplicate, group, re-parent). */
export async function listQuoteItems(quoteId: string): Promise<QuoteItem[]> {
  return linesOf(quoteId)
}
