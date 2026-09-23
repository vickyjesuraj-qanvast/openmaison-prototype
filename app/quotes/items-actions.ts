'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { priceBookItems, priceBookSections, quoteItems, quotes, type PriceBookItem, type PriceBookSection, type QuoteItem } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { isDensity, isHighlight, isItemKind, isItemStatus, isItemsView, isPrintAs, isVisibility, parseColumns, parseLabels, parseSavedSection, type ColumnSettings, type ItemLabels, type SavedLine, type SavedSection } from '@/lib/quotes/items-model'
import { descendantIds, parseDiscounts, quoteTotals, type NamedDiscount } from '@/lib/quotes/math'
import { fetchQuoteRules } from '@/lib/settings/queries'
import { roundToStep } from '@/lib/settings/types'

/* Items section (1260:31209, REG-415). Every write ends in `sync`: the quote's amount is DERIVED from its lines (REG-343 / REG-403)
   — the Quotes tab, the Overview card and the Move stage window read `quotes.amount_minor`, so it is recomputed here, never typed.
   Sections nest one level (REG-558): a group may hold groups, a group inside a group may not. */

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
  const t = quoteTotals(lines, { ...q, discounts: parseDiscounts(q.discountsJson) })
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
/** Every group's children renumbered — after a delete or a regroup. */
async function renumberAll(quoteId: string) {
  const all = await linesOf(quoteId)
  await renumber(quoteId, null)
  for (const g of all.filter((i) => i.kind === 'group')) await renumber(quoteId, g.id)
}

const num = (v: unknown, lo: number, hi: number, fallback: number) => { const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback; return Math.min(hi, Math.max(lo, n)) }
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const label = (v: unknown) => (v === null ? null : str(v, 60)?.trim() || null)

export type ItemPatch = Partial<Pick<QuoteItem, 'name' | 'description' | 'status' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'room' | 'category' | 'section' | 'visibility' | 'collapsed' | 'icon' | 'thumb' | 'thumbCount' | 'optional' | 'printAs' | 'printAsText' | 'highlight' | 'noNumber' | 'descriptionHtml' | 'printOneLine' | 'rebateMinor'>>

/** Public endpoint: every field is bounded and every enum checked before it is written. */
function cleanPatch(p: ItemPatch): Partial<typeof quoteItems.$inferInsert> {
  const set: Partial<typeof quoteItems.$inferInsert> = {}
  if (p.name !== undefined) set.name = (str(p.name, 200) ?? '').trim() || 'Item'
  if (p.description !== undefined) set.description = p.description === null ? null : str(p.description, 4000) ?? null
  if (p.descriptionHtml !== undefined) set.descriptionHtml = p.descriptionHtml === null ? null : str(p.descriptionHtml, 12000) ?? null   // (REG-557)
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
  if (p.optional !== undefined) set.optional = !!p.optional   // (REG-492)
  if (p.printAs !== undefined) set.printAs = p.printAs === null ? null : isPrintAs(p.printAs) ? p.printAs : null   // (REG-555)
  if (p.printAsText !== undefined) set.printAsText = p.printAsText === null ? null : (str(p.printAsText, 40)?.trim() || null)
  if (p.highlight !== undefined) set.highlight = p.highlight === null ? null : isHighlight(p.highlight) ? p.highlight : null   // (REG-556)
  if (p.noNumber !== undefined) set.noNumber = !!p.noNumber   // (REG-558)
  if (p.printOneLine !== undefined) set.printOneLine = !!p.printOneLine   // (REG-585) a section as one printed line
  if (p.rebateMinor !== undefined) set.rebateMinor = Math.round(num(p.rebateMinor, 0, 1e11, 0))   // (REG-596) Owners only
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

/** Add Item row · row "+" · Create ▾ · the My Items popover · New section (REG-415). Returns the new line. */
export async function createQuoteItem(quoteId: string, input: CreateItemInput = {}): Promise<QuoteItem> {
  const q = await quoteOf(quoteId)
  const kind = input.kind === 'group' ? 'group' : 'item'
  let parentId = input.parentId ?? null
  let status: QuoteItem['status'] = 'Pending'
  if (parentId) {
    const p = await itemOf(parentId)
    if (p.quoteId !== quoteId || p.kind !== 'group') throw new Error('bad parent')
    status = p.status   // a child carries its group's answer
    // (REG-558) Sections nest one level: a section asked for inside a sub-section lands beside it, in the top section.
    if (kind === 'group' && p.parentId) parentId = p.parentId
  }
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
  const name = (str(input.name, 200) ?? '').trim() || (pb ? pb.name : kind === 'group' ? 'New section' : 'Item')
  await db.insert(quoteItems).values({
    id, quoteId, parentId, kind, position, name,
    description: pb?.description ?? null,
    icon: pb ? (isItemKind(pb.kind) ? pb.kind : null) : null,
    thumb: pb?.thumb ?? null, thumbCount: pb?.thumb ? 1 : 0,
    status, qty: 1, unit: pb?.unit ?? null,
    costMinor: pb?.costMinor ?? 0, markupMinor: roundToStep(pb?.costMinor ?? 0, pb?.markupMinor ?? 0, (await fetchQuoteRules()).roundStep), discountPct: 0, gstPct: 9,   // (REG-584) the studio's rounding rule
    category: label(input.category) ?? pb?.category ?? null, room: label(input.room), section: label(input.section),
    visibility: 'visible', collapsed: false, priceBookItemId: pb?.id ?? null, createdAt: now, updatedAt: now,
  })
  if (pb) await db.update(priceBookItems).set({ updatedAt: now }).where(eq(priceBookItems.id, pb.id))
  await renumber(quoteId, parentId)
  await sync(q.id)
  return itemOf(id)
}

export type BulkLine = Pick<ItemPatch, 'name' | 'description' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'room' | 'category' | 'section'>
/** Paste from a spreadsheet (REG-476): the mapped lines land in ONE transaction — after `afterId` among `parentId`'s children, else
    at the end of that list — every field bounded by `cleanPatch` as a cell edit is. Returns how many landed. */
export async function createQuoteItems(quoteId: string, lines: BulkLine[], place: { parentId?: string | null; afterId?: string | null } = {}): Promise<number> {
  const q = await quoteOf(quoteId)
  const clean = lines.slice(0, 500).map((l) => cleanPatch(l))
  if (!clean.length) return 0
  let parentId = place.parentId ?? null
  let status: QuoteItem['status'] = 'Pending'
  if (parentId) { const p = await itemOf(parentId); if (p.quoteId !== quoteId || p.kind !== 'group') parentId = null; else status = p.status }
  const sibs = (await linesOf(quoteId)).filter((i) => (i.parentId ?? null) === parentId)
  let position = sibs.length
  if (place.afterId) { const idx = sibs.findIndex((s) => s.id === place.afterId); if (idx >= 0) position = idx + 1 }
  const now = new Date()
  const rules = await fetchQuoteRules()   // (REG-584)
  const values = clean.map((set, k) => ({
    id: randomUUID(), quoteId, parentId, kind: 'item' as const, position: position + k,
    name: set.name ?? 'Item', description: set.description ?? null, icon: null, thumb: null, thumbCount: 0, status,
    qty: set.qty ?? 1, unit: set.unit ?? null, costMinor: set.costMinor ?? 0, markupMinor: roundToStep(set.costMinor ?? 0, Math.max(-(set.costMinor ?? 0), set.markupMinor ?? 0), rules.roundStep),
    discountPct: set.discountPct ?? 0, gstPct: set.gstPct ?? 9, room: set.room ?? null, category: set.category ?? null, section: set.section ?? null,
    visibility: 'visible' as const, collapsed: false, priceBookItemId: null, createdAt: now, updatedAt: now,
  }))
  await db.transaction(async (tx) => {
    for (const s of sibs) if (s.position >= position) await tx.update(quoteItems).set({ position: s.position + values.length }).where(eq(quoteItems.id, s.id))
    for (let at = 0; at < values.length; at += 50) await tx.insert(quoteItems).values(values.slice(at, at + 50))
  })
  await renumber(quoteId, parentId)
  await sync(q.id)
  return values.length
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
  // The chip sits on the group row and a child's STATUS cell is empty (spec 03), so a group's answer is its children's — sub-sections' too (REG-417 / REG-558).
  if (i.kind === 'group' && set.status !== undefined) {
    const under = [...descendantIds(await linesOf(i.quoteId), [itemId])].filter((x) => x !== itemId)
    if (under.length) await db.update(quoteItems).set({ status: set.status, updatedAt: set.updatedAt }).where(inArray(quoteItems.id, under))
  }
  return sync(i.quoteId)
}

/** Remove · bulk Delete: a section takes its lines and sub-sections with it. */
export async function deleteQuoteItems(ids: string[]): Promise<{ updatedAt: number; amountMinor: number } | null> {
  if (!ids.length) return null
  const first = await itemOf(ids[0]!)
  const all = await linesOf(first.quoteId)
  const gone = descendantIds(all, ids)
  await db.delete(quoteItems).where(and(eq(quoteItems.quoteId, first.quoteId), inArray(quoteItems.id, [...gone])))
  await renumberAll(first.quoteId)
  return sync(first.quoteId)
}

/** (REG-558) Row menu › Ungroup: the section goes, its lines and sub-sections step up into its parent at its place, in order. */
export async function ungroupQuoteItem(groupId: string): Promise<{ updatedAt: number; amountMinor: number }> {
  const g = await itemOf(groupId)
  if (g.kind !== 'group') throw new Error('not a section')
  const all = await linesOf(g.quoteId)
  const kids = all.filter((i) => i.parentId === g.id).sort((a, b) => a.position - b.position)
  const parentId = g.parentId ?? null
  const sibs = all.filter((i) => (i.parentId ?? null) === parentId && i.id !== g.id)
  const now = new Date()
  // A sub-section stepping up to the top keeps its own children; a sub-section cannot step into another sub-section (depth stays ≤ 2).
  await db.transaction(async (tx) => {
    for (const s of sibs) if (s.position > g.position) await tx.update(quoteItems).set({ position: s.position + kids.length }).where(eq(quoteItems.id, s.id))
    for (let k = 0; k < kids.length; k++) await tx.update(quoteItems).set({ parentId, position: g.position + k, updatedAt: now }).where(eq(quoteItems.id, kids[k]!.id))
    await tx.delete(quoteItems).where(eq(quoteItems.id, g.id))
  })
  await renumberAll(g.quoteId)
  return sync(g.quoteId)
}

/** Row menu › Duplicate: the copy lands right under the original (a section brings its lines and sub-sections). */
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
    const copy = async (fromId: string, toId: string) => {
      for (const k of all.filter((i) => i.parentId === fromId)) {
        const { id: _k, createdAt: _kc, updatedAt: _ku, ...kr } = k
        const nid = randomUUID()
        await db.insert(quoteItems).values({ ...kr, id: nid, parentId: toId, createdAt: now, updatedAt: now })
        if (k.kind === 'group') await copy(k.id, nid)
      }
    }
    await copy(src.id, id)
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

/** Row menu › Move to section (null = out of any section); the line joins the end of its new sibling list.
    (REG-558) A section may join a top section — as its sub-section — when it holds no sub-sections itself. */
export async function setQuoteItemParent(itemId: string, parentId: string | null): Promise<void> {
  const i = await itemOf(itemId)
  const all = await linesOf(i.quoteId)
  if (parentId) {
    const p = all.find((x) => x.id === parentId)
    if (!p || p.kind !== 'group') throw new Error('bad section')
    if (i.kind === 'group') {
      if (p.parentId) throw new Error('a section cannot join a sub-section')
      if (all.some((x) => x.parentId === i.id && x.kind === 'group')) throw new Error('a section with sub-sections stays at the top')
      if (p.id === i.id) throw new Error('a section cannot join itself')
    }
  }
  const from = i.parentId ?? null
  const sibs = all.filter((s) => (s.parentId ?? null) === parentId && s.id !== i.id)
  const status = parentId ? all.find((x) => x.id === parentId)!.status : i.status   // a child carries its group's answer; a line leaving keeps its own (it gets its chip back)
  const now = new Date()
  await db.update(quoteItems).set({ parentId, position: sibs.length, status, updatedAt: now }).where(eq(quoteItems.id, i.id))
  if (i.kind === 'group') { const under = [...descendantIds(all, [i.id])].filter((x) => x !== i.id); if (under.length) await db.update(quoteItems).set({ status, updatedAt: now }).where(inArray(quoteItems.id, under)) }
  await renumber(i.quoteId, from)
  await sync(i.quoteId)
}

/** Row menu › Section with n item(s) · bulk Section · New section: a new section at the first line's place, the lines under it.
    (REG-558) Lines that all sit in one section get a sub-section there; otherwise the section is a top one. */
export async function groupQuoteItems(quoteId: string, ids: string[], name = 'New section'): Promise<QuoteItem> {
  const q = await quoteOf(quoteId)
  const all = await linesOf(quoteId)
  const picked = all.filter((i) => ids.includes(i.id) && i.kind === 'item')
  const first = picked[0]
  const parents = new Set(picked.map((p) => p.parentId ?? null))
  const onlyParent = parents.size === 1 ? [...parents][0] ?? null : null
  const host = onlyParent ? all.find((i) => i.id === onlyParent) ?? null : null
  // A sub-section lives one level down only: lines already in a sub-section get a top-level section beside their parent's parent.
  const parentId = host && !host.parentId ? host.id : null
  const sibs = all.filter((i) => (i.parentId ?? null) === parentId)
  const anchorPos = first ? (parentId ? (first.parentId === parentId ? first.position : sibs.length) : (first.parentId ? (sibs.find((t) => t.id === first.parentId)?.position ?? sibs.length) : first.position)) : sibs.length
  for (const t of sibs) if (t.position >= anchorPos) await db.update(quoteItems).set({ position: t.position + 1 }).where(eq(quoteItems.id, t.id))
  const now = new Date()
  const id = randomUUID()
  // The group's chip speaks for its lines: it takes the answer they all share (else Pending) and the lines follow it.
  const status = picked.length && picked.every((p) => p.status === picked[0]!.status) ? picked[0]!.status : 'Pending'
  await db.insert(quoteItems).values({ id, quoteId, parentId, kind: 'group', position: anchorPos, name: (str(name, 200) ?? '').trim() || 'New section', status, qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, visibility: 'visible', collapsed: false, createdAt: now, updatedAt: now })
  for (let k = 0; k < picked.length; k++) await db.update(quoteItems).set({ parentId: id, position: k, status, updatedAt: now }).where(eq(quoteItems.id, picked[k]!.id))
  await renumberAll(quoteId)
  await sync(q.id)
  return itemOf(id)
}

/** Row menu › Save to Your Library: the line becomes a price-book entry (name, description, kind, unit, cost, markup). */
export async function saveItemToPriceBook(itemId: string): Promise<PriceBookItem> {
  const i = await itemOf(itemId)
  if (i.kind !== 'item') throw new Error('sections are saved with Save section to My Items')
  const now = new Date()
  const id = randomUUID()
  await db.insert(priceBookItems).values({ id, name: i.name, description: i.description, kind: isItemKind(i.icon) ? i.icon : 'purchase', unit: i.unit ?? 'Pieces', costMinor: i.costMinor, markupMinor: i.markupMinor, category: i.category, thumb: i.thumb, createdAt: now, updatedAt: now })
  await db.update(quoteItems).set({ priceBookItemId: id }).where(eq(quoteItems.id, i.id))
  const q = await quoteOf(i.quoteId)
  touch(q.leadId, q.id)
  const [row] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return row!
}

/* ── (REG-566) Saved sections: "Save section to My Items" and "My Sections" in the Add Item popover ── */
const savedLine = (i: QuoteItem): SavedLine => ({
  name: i.name, description: i.description, descriptionHtml: i.descriptionHtml, qty: i.qty, unit: i.unit, costMinor: i.costMinor, markupMinor: i.markupMinor, discountPct: i.discountPct, gstPct: i.gstPct,
  room: i.room, category: i.category, section: i.section, printAs: i.printAs, printAsText: i.printAsText, highlight: i.highlight, icon: i.icon,
})
/** Row menu on a section › Save section to My Items: the section, its lines and its sub-sections, as one reusable block. */
export async function saveSectionToPriceBook(groupId: string, name?: string): Promise<PriceBookSection> {
  const g = await itemOf(groupId)
  if (g.kind !== 'group') throw new Error('not a section')
  const all = await linesOf(g.quoteId)
  const kids = all.filter((i) => i.parentId === g.id).sort((a, b) => a.position - b.position)
  const body: SavedSection = {
    name: (str(name, 200) ?? '').trim() || g.name, description: g.description, descriptionHtml: g.descriptionHtml,
    lines: kids.filter((k) => k.kind === 'item').map(savedLine),
    subs: kids.filter((k) => k.kind === 'group').map((s) => ({ name: s.name, description: s.description, descriptionHtml: s.descriptionHtml, lines: all.filter((i) => i.parentId === s.id && i.kind === 'item').sort((a, b) => a.position - b.position).map(savedLine) })),
  }
  const now = new Date()
  const id = randomUUID()
  await db.insert(priceBookSections).values({ id, name: body.name, description: g.description, linesJson: JSON.stringify(body), createdAt: now, updatedAt: now })
  const q = await quoteOf(g.quoteId)
  touch(q.leadId, q.id)
  const [row] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  return row!
}
/** The Add Item popover › My Sections › a pick: the saved section lands whole — after `afterId` at the top, else at the end. */
export async function insertPriceBookSection(quoteId: string, sectionId: string, place: { afterId?: string | null } = {}): Promise<QuoteItem> {
  const q = await quoteOf(quoteId)
  const [row] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, sectionId))
  if (!row) throw new Error('saved section not found')
  const body = parseSavedSection(row.linesJson)
  if (!body) throw new Error('saved section unreadable')
  const top = (await linesOf(quoteId)).filter((i) => !i.parentId)
  let position = top.length
  if (place.afterId) { const idx = top.findIndex((s) => s.id === place.afterId); if (idx >= 0) position = idx + 1 }
  const now = new Date()
  const id = randomUUID()
  const rules = await fetchQuoteRules()   // (REG-584)
  const line = (l: SavedLine, parentId: string, k: number) => ({
    id: randomUUID(), quoteId, parentId, kind: 'item' as const, position: k, name: l.name, description: l.description, descriptionHtml: l.descriptionHtml, icon: isItemKind(l.icon) ? l.icon : null, thumb: null, thumbCount: 0, status: 'Pending' as const,
    qty: l.qty, unit: l.unit, costMinor: l.costMinor, markupMinor: roundToStep(l.costMinor, Math.max(-l.costMinor, l.markupMinor), rules.roundStep), discountPct: l.discountPct, gstPct: l.gstPct, room: l.room, category: l.category, section: l.section,
    printAs: isPrintAs(l.printAs) ? l.printAs : null, printAsText: l.printAsText, highlight: isHighlight(l.highlight) ? l.highlight : null, visibility: 'visible' as const, collapsed: false, priceBookItemId: null, createdAt: now, updatedAt: now,
  })
  await db.transaction(async (tx) => {
    for (const s of top) if (s.position >= position) await tx.update(quoteItems).set({ position: s.position + 1 }).where(eq(quoteItems.id, s.id))
    await tx.insert(quoteItems).values({ id, quoteId, parentId: null, kind: 'group', position, name: body.name, description: body.description, descriptionHtml: body.descriptionHtml, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, visibility: 'visible', collapsed: false, priceBookItemId: sectionId, createdAt: now, updatedAt: now })   // (REG-594) the section it came from — the Price book's "Used in n quotes"
    let k = 0
    for (const l of body.lines) await tx.insert(quoteItems).values(line(l, id, k++))
    for (const s of body.subs) {
      const sid = randomUUID()
      await tx.insert(quoteItems).values({ id: sid, quoteId, parentId: id, kind: 'group', position: k++, name: s.name, description: s.description, descriptionHtml: s.descriptionHtml, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, visibility: 'visible', collapsed: false, createdAt: now, updatedAt: now })
      let j = 0
      for (const l of s.lines) await tx.insert(quoteItems).values(line(l, sid, j++))
    }
    await tx.update(priceBookSections).set({ lastUsedAt: now }).where(eq(priceBookSections.id, sectionId))
  })
  await renumber(quoteId, null)
  await sync(q.id)
  return itemOf(id)
}
/** The studio's saved sections, newest first — the popover's list after a save. */
export async function listPriceBookSections(): Promise<PriceBookSection[]> {
  return db.select().from(priceBookSections).where(isNull(priceBookSections.deletedAt)).orderBy(asc(priceBookSections.name))
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
      position: Math.round(num(i.position, 0, 100000, 0)), name: set.name ?? 'Item', description: set.description ?? null, descriptionHtml: set.descriptionHtml ?? null,
      thumb: set.thumb ?? null, thumbCount: set.thumbCount ?? 0, icon: set.icon ?? null, status: set.status ?? 'Pending', qty: set.qty ?? 1,
      unit: set.unit ?? null, costMinor: set.costMinor ?? 0, markupMinor: Math.max(-(set.costMinor ?? 0), set.markupMinor ?? 0), discountPct: set.discountPct ?? 0, gstPct: set.gstPct ?? 9,
      room: set.room ?? null, category: set.category ?? null, section: set.section ?? null, visibility: set.visibility ?? 'visible', collapsed: set.collapsed ?? false,
      optional: set.optional ?? false, printAs: set.printAs ?? null, printAsText: set.printAsText ?? null, highlight: set.highlight ?? null, noNumber: set.noNumber ?? false,
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

export type PricingPatch = { additionalDiscountMode?: 'pct' | 'amount'; additionalDiscountValue?: number; gstEnabled?: boolean; issuingEntity?: string | null; /** (REG-559) the named discounts, whole */ discounts?: NamedDiscount[] }
/** The totals card (1271:36761): Additional Discount (% | S$), the named discounts (REG-559), the GST switch, the Issuing Entity. */
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
  if (patch.discounts !== undefined) {
    const clean = patch.discounts.slice(0, 10).map((d) => ({ id: str(d.id, 40) || randomUUID(), label: (str(d.label, 60) ?? '').trim(), mode: d.mode === 'amount' ? 'amount' as const : 'pct' as const, value: num(d.value, 0, d.mode === 'amount' ? 1e9 : 100, 0) }))
    set.discountsJson = clean.length ? JSON.stringify(clean) : null
  }
  if (patch.gstEnabled !== undefined) set.gstEnabled = !!patch.gstEnabled
  if (patch.issuingEntity !== undefined) set.issuingEntity = patch.issuingEntity === null ? null : (str(patch.issuingEntity, 120)?.trim() || null)
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  return sync(quoteId)
}

export type ItemsPrefsPatch = { itemsView?: string; itemsDensity?: string; itemsColumns?: ColumnSettings; itemsLabels?: ItemLabels }
/** View by · density · column settings · the labels the studio adds (Add Category / Add Section label). */
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
