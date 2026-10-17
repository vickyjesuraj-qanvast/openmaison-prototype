'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, priceBookItems, priceBookSections, quoteItems, quotes, type PriceBookItem, type PriceBookSection, type QuoteItem } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { cleanLink, nameFromHtml, narrowNameHtml, isDensity, isHighlight, isItemKind, isItemsView, isPrintAs, isVisibility, parseColumns, parseLabels, parseSavedSection, tradeOfSection, type ColumnSettings, type ItemLabels, type SavedLine, type SavedSection } from '@/lib/quotes/items-model'
import { ancestorIds, carried, descendantIds, flattenItems, groupLevel, parseDiscounts, quoteTotals, type NamedDiscount } from '@/lib/quotes/math'
import { fetchQuoteRules, fetchStudio } from '@/lib/settings/queries'
import { roundToStep } from '@/lib/settings/types'
import { PROPERTY_TYPES } from '@/lib/leads/enums'   // (REG-619) a saved section remembers the quote's property type
import { isRefusal, refuse, type Refusal } from '@/lib/company/template-rules'   // (audit 2026-09-26, E7) a refusal answers with its rule
import { deskRefusal, keepOffDesk, offDesk } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server
import { ON_DESK } from '@/lib/settings/roles'
import { keepLineCosts, keptCostsOf } from '@/lib/quotes/kept-costs'
import { bookItemFor, keptCostPatch, pricedFor, sectionFor, sightOf, withKeptCost, type CostSight } from '@/lib/quotes/cost-sight'   // (pending modules S41b-1)
import { fetchViewer } from '@/lib/leads/visibility'
import { cleanRichHtml, cleanSectionHtml } from '@/lib/rich-html'   // (S44Q, triage §12.1) every description through the house allowlist

/* Items section (1260:31209, REG-415). Every write ends in `sync`: the quote's amount is DERIVED from its lines (REG-343 / REG-403)
   — the Quotes tab, the Overview card and the Move stage window read `quotes.amount_minor`, so it is recomputed here, never typed.
   Sections nest one level (REG-558): a group may hold groups, a group inside a group may not. */

const touch = (leadId: string, quoteId: string) => { revalidateLead(leadId); revalidatePath(`/quotes/${quoteId}`) }

/* (pending modules S41b-1 — 1.0's Cost & Margin Visibility) What the member writing here may see: every line this file answers is sent as they
   may see it (lib/quotes/cost-sight.ts — cost folded into the price for a member who doesn't see costs, a rebate for an Owner alone), and their
   writes keep the stored cost and rebate. */
const sightNow = async (): Promise<CostSight> => sightOf(await fetchViewer())
const seen = (l: QuoteItem, s: CostSight) => pricedFor(l, s)
/** A deleted line's cost is kept 30 days, so a member who doesn't see costs can bring the line back whole (Undo, ⌘Z) — lib/quotes/kept-costs.ts. */
const keepCosts = keepLineCosts

/* (S44I — row 335, her UAT ask 2026-10-15) A write that can't land says why: these sentences reach the snackbar through the adds' refusals
   (`addQuoteItem` and the other `{ error }` answers below) — a thrown word never survives a production server action. */
const GONE_QUOTE = 'This quote was deleted since it was opened'
const GONE_LINE = 'That line was removed since the quote was opened'
async function quoteOf(quoteId: string) {
  await keepOffDesk()   // (S44Z) the role first — nothing is read for Marketing, whatever action asks
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error(GONE_QUOTE)
  return q
}
async function itemOf(itemId: string) {
  await keepOffDesk()   // (S44Z)
  const [i] = await db.select().from(quoteItems).where(eq(quoteItems.id, itemId))
  if (!i) throw new Error(GONE_LINE)
  return i
}
const GONE_SECTION = 'That section was removed since the quote was opened'
/** (S44T — call C1, S44I) a section priced after the contract stays a top section (only those can be) */
const AFTER_TOP = 'A section priced after the contract stays at the top — price it with the contract first'
const GONE_ITEM = 'That item left the price book'
/** A thrown sentence of ours as a refusal; anything else (a database fault) stays a throw — the snackbar's "please try again". */
const asRefusal = (e: unknown): Refusal => { const m = e instanceof Error ? e.message : ''; if ([GONE_QUOTE, GONE_LINE, GONE_SECTION, GONE_ITEM, ON_DESK].includes(m)) return refuse(m); throw e }   // (S44Z) the role rule too
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
/** Siblings renumbered 0…n so a position is never shared — and returned in that order, so an index IS a position. (REG-662) Saved
    lines can carry gaps (1, 2, 3, 4, 6 …), and a place read as "the count" or "index + 1" then landed mid-list: every placement
    below reads its list through here first. */
async function renumber(quoteId: string, parentId: string | null) {
  const sibs = (await linesOf(quoteId)).filter((i) => (i.parentId ?? null) === parentId)
  for (let i = 0; i < sibs.length; i++) if (sibs[i]!.position !== i) await db.update(quoteItems).set({ position: i }).where(eq(quoteItems.id, sibs[i]!.id))
  return sibs.map((x, i) => ({ ...x, position: i }))
}
/** (S44T — call C1 · S44I) Where the contract's own rows end at the top of the table: before the first section priced after the contract —
    a new top row (the Add Item field, a pasted block, a saved section, an empty new section) lands there, never among the estimates. */
const mainEnd = (sibs: { pricedAfter?: boolean | null }[]) => { const k = sibs.findIndex((s) => s.pricedAfter); return k < 0 ? sibs.length : k }
/** Every group's children renumbered — after a delete or a regroup. */
async function renumberAll(quoteId: string) {
  const all = await linesOf(quoteId)
  await renumber(quoteId, null)
  for (const g of all.filter((i) => i.kind === 'group')) await renumber(quoteId, g.id)
}

const num = (v: unknown, lo: number, hi: number, fallback: number) => { const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback; return Math.min(hi, Math.max(lo, n)) }
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const label = (v: unknown) => (v === null ? null : str(v, 60)?.trim() || null)
/** (REG-623) A vendor's name, as long as My Items allows (80). */
const vendorName = (v: unknown) => (v === null ? null : str(v, 80)?.trim() || null)

export type ItemPatch = Partial<Pick<QuoteItem, 'name' | 'description' | 'status' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'room' | 'category' | 'section' | 'visibility' | 'collapsed' | 'icon' | 'thumb' | 'thumbCount' | 'optional' | 'printAs' | 'printAsText' | 'highlight' | 'noNumber' | 'descriptionHtml' | 'printOneLine' | 'rebateMinor' | 'vendor' | 'link' | 'nameHtml'>>

/** Public endpoint: every field is bounded and every enum checked before it is written. */
function cleanPatch(p: ItemPatch): Partial<typeof quoteItems.$inferInsert> {
  const set: Partial<typeof quoteItems.$inferInsert> = {}
  if (p.name !== undefined) set.name = (str(p.name, 200) ?? '').trim() || 'Item'
  /* (S44I — call C2) a name's emphasis, breaks and kit colours: the house allowlist (S44Q), narrowed to a name's marks; its plain words are the
     name. A plain name written alone (the box, a fill, the phone's field) is the line's words now — the formatted copy goes. */
  if (p.nameHtml !== undefined) { set.nameHtml = p.nameHtml === null ? null : narrowNameHtml(cleanRichHtml(p.nameHtml, 4000)); if (set.nameHtml) set.name = nameFromHtml(set.nameHtml).slice(0, 200) || set.name || 'Item' }
  else if (p.name !== undefined) set.nameHtml = null
  if (p.description !== undefined) set.description = p.description === null ? null : str(p.description, 4000) ?? null
  if (p.descriptionHtml !== undefined) set.descriptionHtml = p.descriptionHtml === null ? null : cleanRichHtml(p.descriptionHtml, typeof p.descriptionHtml === 'string' && /<img\b/i.test(p.descriptionHtml) ? 400_000 : undefined)   // (S44I — NB-07 (a)) a section note's picture takes room   // (REG-557) · (S44Q, triage §12.1) the house allowlist — it was stored as sent and drawn raw on the client's pages
  /* (pending modules S04 — card held:quotes, "a line's status (Pending · Approved · Declined) is a record with no screen (REG-435) · revisit: decide
     or drop") Dropped: a line has no answer of its own — the client's one per-line answer is an optional work's pick (`client_choice`, REG-626).
     No screen writes a status since REG-435, and this endpoint no longer takes one; the column stays (additive), Pending (repair R106). */
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
  if (p.vendor !== undefined) set.vendor = vendorName(p.vendor)   // (REG-623, parity Q-08)
  if (p.link !== undefined) set.link = typeof p.link === 'string' ? cleanLink(p.link) ?? null : null   // (REG-623, parity Q-09) http / https only; anything else is dropped
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
  /** (S42 B-15) the line's quantity when the caller knows it (Draft with Maison AI's "6 downlights"); else 1 */
  qty?: number
  /** (S44I, B1) the unit — Enter on a line just added carries the line's unit to the next one (B10) */
  unit?: string | null
  /** (S44I, B6) `start`: first in `parentId` (a pick from the Price book at the top of a section) */
  at?: 'start' | 'end'
}

/** Add Item row · row "+" · Create ▾ · the My Items popover · New section (REG-415). Returns the new line. */
export async function createQuoteItem(quoteId: string, input: CreateItemInput = {}): Promise<QuoteItem | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const q = await quoteOf(quoteId)
  const kind = input.kind === 'group' ? 'group' : 'item'
  let parentId = input.parentId ?? null
  let status: QuoteItem['status'] = 'Pending'
  if (parentId) {
    const [p] = await db.select().from(quoteItems).where(eq(quoteItems.id, parentId))
    if (!p || p.quoteId !== quoteId || p.kind !== 'group') throw new Error(GONE_SECTION)
    status = p.status   // a child carries its group's answer
    // (REG-558) Sections nest one level: a section asked for inside a sub-section lands beside it, in the top section.
    if (kind === 'group' && p.parentId) parentId = p.parentId
  }
  let pb: PriceBookItem | null = null
  if (input.priceBookItemId) {
    const [row] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, input.priceBookItemId)); pb = row ?? null
    /* (REG-652, price book parity Q-04 · Q-11) A deleted item, or someone else's proposal, is not taken — a page opened before the change still offers it. */
    const { fetchViewer } = await import('@/lib/leads/visibility')
    const { itemPickable } = await import('@/lib/company/price-book-rules')
    if (!pb || pb.deletedAt || !itemPickable(await fetchViewer(), pb)) throw new Error(GONE_ITEM)
  }
  const sibs = await renumber(quoteId, parentId)
  let position = input.at === 'start' ? 0 : parentId ? sibs.length : mainEnd(sibs)
  const anchor = input.afterId ?? input.beforeId ?? null
  if (anchor) {
    const idx = sibs.findIndex((s) => s.id === anchor)
    if (idx >= 0) position = input.afterId ? idx + 1 : idx
  }
  // open the slot
  for (const s of sibs) if (s.position >= position) await db.update(quoteItems).set({ position: s.position + 1 }).where(eq(quoteItems.id, s.id))
  const now = new Date()
  const id = randomUUID()
  /* (S44I, B1) a group made inside a section is a sub-section, and says so until it is named (invented copy: "New sub-section") */
  const name = (str(input.name, 200) ?? '').trim() || (pb ? pb.name : kind === 'group' ? (parentId ? 'New sub-section' : 'New section') : 'Item')
  await db.insert(quoteItems).values({
    id, quoteId, parentId, kind, position, name,
    description: pb?.description ?? null, descriptionHtml: cleanRichHtml(pb?.descriptionHtml ?? null),   // (REG-653, price book parity Q-08) the formatted description travels · (S44Q) through the allowlist
    icon: pb ? (isItemKind(pb.kind) ? pb.kind : null) : null,
    thumb: pb?.thumb ?? null, thumbCount: pb?.thumb ? 1 : 0,
    status, qty: typeof input.qty === 'number' && Number.isFinite(input.qty) && input.qty > 0 ? Math.min(99999, Math.round(input.qty * 100) / 100) : 1, unit: input.unit !== undefined ? (input.unit === null ? null : str(input.unit, 40)?.trim() || null) : pb?.unit ?? null,   // (S42 B-15) · (S44I, B1) a carried unit, bounded as a cell's
    costMinor: pb?.costMinor ?? 0, markupMinor: roundToStep(pb?.costMinor ?? 0, pb?.markupMinor ?? 0, (await fetchQuoteRules()).roundStep, pb?.unit), discountPct: 0, gstPct: (await fetchStudio()).gstPct,   // (REG-584) the studio's rounding rule · (REG-645) its GST rate
    category: label(input.category) ?? pb?.category ?? null, room: label(input.room), section: label(input.section),
    vendor: pb?.vendor ?? null, link: pb?.link ?? null,   // (REG-623, parity Q-08) the line knows who supplies it · (REG-653) and its product page
    visibility: 'visible', collapsed: false, priceBookItemId: pb?.id ?? null, createdAt: now, updatedAt: now,
  })
  /* (REG-651, price book parity Q-17 · E-63) A pick is a use, not an edit: the item's "edited" stays its last change. */
  await renumber(quoteId, parentId)
  await sync(q.id)
  return seen(await itemOf(id), await sightNow())   // (pending modules S41b-1)
}
/** (S44I — row 335) The editor's adds: `createQuoteItem`, its refusals answered as `{ error }` in words (the section or the item gone). */
export async function addQuoteItem(quoteId: string, input: CreateItemInput = {}): Promise<QuoteItem | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  try { return await createQuoteItem(quoteId, input) } catch (e) { return asRefusal(e) }
}

export type BulkLine = Pick<ItemPatch, 'name' | 'description' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'room' | 'category' | 'section' | 'vendor' | 'link'>
/** Paste from a spreadsheet (REG-476): the mapped lines land in ONE transaction — after `afterId` among `parentId`'s children, else
    at the end of that list — every field bounded by `cleanPatch` as a cell edit is. Returns how many landed.
    (S44I, B1) `beforeId` puts them before a sibling, `at: 'start'` first in `parentId` (the row menu's Above · At the top of the section,
    Add several, Paste lines…, the Price book from a row). */
export type ItemsPlace = { parentId?: string | null; afterId?: string | null; beforeId?: string | null; at?: 'start' | 'end' }
export async function createQuoteItems(quoteId: string, lines: BulkLine[], place: ItemsPlace = {}): Promise<number | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const q = await quoteOf(quoteId)
  const sight = await sightNow()
  /* (pending modules S41b-1) a member who doesn't see costs pastes prices only: each line's price sits in its cost with no mark-up — a pasted
     "Rate" with its cost not known yet, as anyone's price-only paste lands (lib/quotes/clipboard.ts), so Match lines can fill it */
  const clean = lines.slice(0, 500).map((l) => cleanPatch(l)).map((c) => (sight.costs ? c : { ...c, costMinor: Math.max(0, (c.costMinor ?? 0) + (c.markupMinor ?? 0)), markupMinor: 0 }))
  if (!clean.length) return 0
  let parentId = place.parentId ?? null
  let status: QuoteItem['status'] = 'Pending'
  if (parentId) { const p = await itemOf(parentId); if (p.quoteId !== quoteId || p.kind !== 'group') parentId = null; else status = p.status }
  const sibs = await renumber(quoteId, parentId)
  let position = parentId ? sibs.length : mainEnd(sibs)
  if (place.at === 'start') position = 0
  else if (place.beforeId) { const idx = sibs.findIndex((s) => s.id === place.beforeId); if (idx >= 0) position = idx }
  else if (place.afterId) { const idx = sibs.findIndex((s) => s.id === place.afterId); if (idx >= 0) position = idx + 1 }
  const now = new Date()
  const [rules, studio] = await Promise.all([fetchQuoteRules(), fetchStudio()])   // (REG-584) · (REG-645) the studio's GST rate for a line that brings none
  const values = clean.map((set, k) => ({
    id: randomUUID(), quoteId, parentId, kind: 'item' as const, position: position + k,
    name: set.name ?? 'Item', description: set.description ?? null, icon: null, thumb: null, thumbCount: 0, status,
    qty: set.qty ?? 1, unit: set.unit ?? null, costMinor: set.costMinor ?? 0, markupMinor: roundToStep(set.costMinor ?? 0, Math.max(-(set.costMinor ?? 0), set.markupMinor ?? 0), rules.roundStep, set.unit),
    discountPct: set.discountPct ?? 0, gstPct: set.gstPct ?? studio.gstPct, room: set.room ?? null, category: set.category ?? null, section: set.section ?? null,
    vendor: set.vendor ?? null, link: set.link ?? null,   // (REG-623)
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
/** (S44I, B1 · row 335) The editor's several-at-once adds: `createQuoteItems` with the new lines' ids in order, its refusals in words. */
export async function addQuoteItems(quoteId: string, lines: BulkLine[], place: ItemsPlace = {}): Promise<{ ids: string[] } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  try {
    const before = new Set((await linesOf(quoteId)).map((i) => i.id))
    if (place.parentId) { const [p] = await db.select().from(quoteItems).where(eq(quoteItems.id, place.parentId)); if (!p || p.quoteId !== quoteId || p.kind !== 'group') throw new Error(GONE_SECTION) }
    const made = await createQuoteItems(quoteId, lines, place); if (isRefusal(made)) return made   // (S44Z)
    return { ids: flattenItems(await linesOf(quoteId)).filter((i) => !before.has(i.id)).map((i) => i.id) }
  } catch (e) { return asRefusal(e) }
}

/** Inline cell edits, the status chip, the visibility menu, Use Icon, a group's fold (autosaved by the editor). */
export async function updateQuoteItem(itemId: string, patch: ItemPatch): Promise<{ updatedAt: number; amountMinor: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const i = await itemOf(itemId)
  const set = cleanPatch(patch)
  /* (pending modules S41b-1) a member who doesn't see costs moves only the price — the stored cost stays, the mark-up takes the change; a
     rebate is the Owner's to change (REG-596) */
  const sight = await sightNow()
  if (!sight.costs) { const sent = { costMinor: set.costMinor, markupMinor: set.markupMinor }; delete set.costMinor; delete set.markupMinor; Object.assign(set, keptCostPatch(i, sent)) }
  if (!sight.rebate) delete set.rebateMinor
  /* (Projects round 5, F-06) A variation order's omission is a line with a minus quantity — its quote alone keeps the sign. */
  if (typeof patch.qty === 'number' && patch.qty < 0 && (await quoteOf(i.quoteId)).kind === 'variation') set.qty = num(patch.qty, -1_000_000, 1_000_000, 1)
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
export async function deleteQuoteItems(ids: string[]): Promise<{ updatedAt: number; amountMinor: number } | null | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  if (!ids.length) return null
  const first = await itemOf(ids[0]!)
  const all = await linesOf(first.quoteId)
  const gone = descendantIds(all, ids)
  await keepCosts(all.filter((l) => gone.has(l.id)))   // (pending modules S41b-1) for an Undo by a member who doesn't see costs
  await db.delete(quoteItems).where(and(eq(quoteItems.quoteId, first.quoteId), inArray(quoteItems.id, [...gone])))
  await renumberAll(first.quoteId)
  return sync(first.quoteId)
}

/** (REG-558) Row menu › Ungroup: the section goes, its lines and sub-sections step up into its parent at its place, in order. */
export async function ungroupQuoteItem(groupId: string): Promise<{ updatedAt: number; amountMinor: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
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
export async function duplicateQuoteItem(itemId: string): Promise<QuoteItem | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const src = await itemOf(itemId)
  const all = await linesOf(src.quoteId)
  const sibs = await renumber(src.quoteId, src.parentId ?? null)
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
  return seen(await itemOf(id), await sightNow())   // (pending modules S41b-1)
}

/** Row menu › Move Item › Up / Down — one step among its siblings. */
export async function moveQuoteItem(itemId: string, dir: 'up' | 'down'): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
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
export async function reorderQuoteItems(quoteId: string, parentId: string | null, orderedIds: string[]): Promise<{ updatedAt: number; amountMinor: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const sibs = (await linesOf(quoteId)).filter((s) => (s.parentId ?? null) === parentId)
  const known = new Set(sibs.map((s) => s.id))
  const order = orderedIds.filter((id) => known.has(id))
  for (const s of sibs) if (!order.includes(s.id)) order.push(s.id)
  for (let i = 0; i < order.length; i++) await db.update(quoteItems).set({ position: i }).where(eq(quoteItems.id, order[i]!))
  return sync(quoteId)   // the amount is unchanged, but the quote's "Saved …" stamp moves like every other write (REG-417)
}

/** Row menu › Move to section (null = out of any section); the line joins the end of its new sibling list.
    (REG-558) A section may join a top section — as its sub-section — when it holds no sub-sections itself. */
export async function setQuoteItemParent(itemId: string, parentId: string | null): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const i = await itemOf(itemId)
  const all = await linesOf(i.quoteId)
  if (parentId) {
    const p = all.find((x) => x.id === parentId)
    if (!p || p.kind !== 'group') throw new Error('bad section')
    if (i.kind === 'group') {
      if (p.parentId) throw new Error('a section cannot join a sub-section')
      if (all.some((x) => x.parentId === i.id && x.kind === 'group')) throw new Error('a section with sub-sections stays at the top')
      if (i.pricedAfter) throw new Error(AFTER_TOP)   // (S44T — call C1, S44I)
      if (p.id === i.id) throw new Error('a section cannot join itself')
    }
  }
  const from = i.parentId ?? null
  const end = (await renumber(i.quoteId, parentId)).length   // (REG-662) past the last, gaps or not
  const status = parentId ? all.find((x) => x.id === parentId)!.status : i.status   // a child carries its group's answer; a line leaving keeps its own (it gets its chip back)
  const now = new Date()
  await db.update(quoteItems).set({ parentId, position: end, status, updatedAt: now }).where(eq(quoteItems.id, i.id))
  if (i.kind === 'group') { const under = [...descendantIds(all, [i.id])].filter((x) => x !== i.id); if (under.length) await db.update(quoteItems).set({ status, updatedAt: now }).where(inArray(quoteItems.id, under)) }
  await renumber(i.quoteId, from)
  await sync(i.quoteId)
}

/** Row menu › Section with n item(s) · bulk Group into section · New section: a new section at the first line's place, the lines under it.
    (REG-558) Lines that all sit in one section get a sub-section there; otherwise the section is a top one.
    (S44I, B1 — the team's sections prototype) Lines that all sit in one sub-section are refused with the rule — they went to a new section
    at the END of the quote — and a section made from lines in several places stands right after the top section that holds the first of
    them (in the table's order), not at the end either. A section made inside a section is named "New sub-section" until it is named. */
export async function groupQuoteItems(quoteId: string, ids: string[], name?: string): Promise<QuoteItem | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  try {
    const q = await quoteOf(quoteId)
    await renumberAll(quoteId)   // (REG-662) positions without gaps, so "the end" below is the end
    const all = await linesOf(quoteId)
    const want = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === 'string')
    const level = groupLevel(all, want)
    if (typeof level === 'object') return refuse(level.refused)
    const picked = flattenItems(all).filter((i) => want.includes(i.id) && i.kind === 'item')   // the table's order
    const first = picked[0]
    const parentId = level === 'sub-section' && first ? first.parentId ?? null : null
    const sibs = all.filter((i) => (i.parentId ?? null) === parentId)
    let anchorPos = parentId ? sibs.length : mainEnd(sibs.sort((a, b) => a.position - b.position))
    if (first) {
      if ((first.parentId ?? null) === parentId) anchorPos = first.position
      else { const topId = ancestorIds(all, first.id).at(-1); const top = sibs.find((t) => t.id === topId); if (top) anchorPos = top.position + 1 }
    }
    for (const t of sibs) if (t.position >= anchorPos) await db.update(quoteItems).set({ position: t.position + 1 }).where(eq(quoteItems.id, t.id))
    const now = new Date()
    const id = randomUUID()
    // The group's chip speaks for its lines: it takes the answer they all share (else Pending) and the lines follow it.
    const status = picked.length && picked.every((p) => p.status === picked[0]!.status) ? picked[0]!.status : 'Pending'
    await db.insert(quoteItems).values({ id, quoteId, parentId, kind: 'group', position: anchorPos, name: (str(name, 200) ?? '').trim() || (parentId ? 'New sub-section' : 'New section'), status, qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, visibility: 'visible', collapsed: false, createdAt: now, updatedAt: now })
    for (let k = 0; k < picked.length; k++) await db.update(quoteItems).set({ parentId: id, position: k, status, updatedAt: now }).where(eq(quoteItems.id, picked[k]!.id))
    await renumberAll(quoteId)
    await sync(q.id)
    return seen(await itemOf(id), await sightNow())   // (pending modules S41b-1)
  } catch (e) { return asRefusal(e) }
}

/** Where `moveQuoteItems` puts the rows: inside `parentId` (null = the top of the table) before / after a sibling, first, or last. */
export type MoveTarget = { parentId: string | null; beforeId?: string | null; afterId?: string | null; at?: 'start' | 'end' }
/**
 * (S44I, B1 — the team's sections prototype: the bulk bar's Move to section · Out of the section, and a drag of several ticked lines) Every
 * ticked row moves in ONE write, in the table's order — a row under a ticked section travels with it. `'out'` puts each just after its own
 * section, one level up. REG-558's two levels hold (a section joins only a top section, and only while it has no sub-sections); a row joining a
 * section takes its answer (its status) and — a line — its trade when the section stands for one (Dane UAT 6.11, `tradeOfSection`).
 */
export async function moveQuoteItems(quoteId: string, ids: string[], to: MoveTarget | 'out'): Promise<{ updatedAt: number; amountMinor: number; recategorised: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  try {
    const q = await quoteOf(quoteId)
    const all = await linesOf(q.id)
    const byId = new Map(all.map((i) => [i.id, i]))
    const want = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === 'string' && byId.has(x))
    const keep = new Set(carried(all, want))
    const moving = flattenItems(all).filter((i) => keep.has(i.id))
    if (!moving.length) return refuse('Tick the lines to move')
    const byPos = (a: QuoteItem, b: QuoteItem) => a.position - b.position
    const lists = new Map<string | null, string[]>()
    const listOf = (p: string | null) => { let l = lists.get(p); if (!l) { l = all.filter((i) => (i.parentId ?? null) === p).sort(byPos).map((i) => i.id); lists.set(p, l) } return l }
    const parentOf = new Map<string, string | null>()
    if (to === 'out') {
      const inside = moving.filter((m) => m.parentId)
      if (!inside.length) return refuse('None of the ticked lines is in a section')
      for (const pid of [...new Set(inside.map((m) => m.parentId!))]) {
        const p = byId.get(pid)!
        const rows = inside.filter((m) => m.parentId === pid)
        const src = listOf(pid)
        for (const r of rows) src.splice(src.indexOf(r.id), 1)
        const dest = p.parentId ?? null
        const dst = listOf(dest)
        dst.splice(dst.indexOf(p.id) + 1, 0, ...rows.map((r) => r.id))
        for (const r of rows) parentOf.set(r.id, dest)
      }
    } else {
      const parentId = typeof to?.parentId === 'string' ? to.parentId : null
      const host = parentId ? byId.get(parentId) : null
      if (parentId && (!host || host.kind !== 'group')) return refuse(GONE_SECTION)
      for (const m of moving) {
        if (m.kind !== 'group' || !parentId) continue
        if (parentId === m.id || ancestorIds(all, parentId).includes(m.id)) return refuse('A section can’t go inside itself')
        if (host?.parentId) return refuse('Sections go two levels deep — a section can’t go inside a sub-section')
        if (all.some((x) => x.parentId === m.id && x.kind === 'group')) return refuse('A section that holds sub-sections stays at the top of the table')
        if (m.pricedAfter) return refuse(AFTER_TOP)   // (S44T — call C1, S44I)
      }
      for (const m of moving) { const l = listOf(m.parentId ?? null); l.splice(l.indexOf(m.id), 1) }
      const dst = listOf(parentId)
      let at = parentId ? dst.length : mainEnd(dst.map((x) => byId.get(x)!))
      if (to.at === 'start') at = 0
      else if (to.beforeId && dst.includes(to.beforeId)) at = dst.indexOf(to.beforeId)
      else if (to.afterId && dst.includes(to.afterId)) at = dst.indexOf(to.afterId) + 1
      dst.splice(at, 0, ...moving.map((m) => m.id))
      for (const m of moving) parentOf.set(m.id, parentId)
    }
    const { fetchTrades } = await import('@/lib/settings/queries')
    const trades = (await fetchTrades()).trades
    const now = new Date()
    let recategorised = 0
    await db.transaction(async (tx) => {
      for (const list of lists.values()) for (let k = 0; k < list.length; k++) if (byId.get(list[k]!)!.position !== k || parentOf.has(list[k]!)) await tx.update(quoteItems).set({ position: k }).where(eq(quoteItems.id, list[k]!))
      for (const [id, parentId] of parentOf) {
        const m = byId.get(id)!
        if ((m.parentId ?? null) === parentId) continue
        const host = parentId ? byId.get(parentId)! : null
        const status = host ? host.status : m.status   // a child carries its section's answer; a line leaving keeps its own
        const trade = host && m.kind === 'item' ? tradeOfSection(host, trades) : null
        if (trade && trade !== m.category) recategorised++
        await tx.update(quoteItems).set({ parentId, status, updatedAt: now, ...(trade && trade !== m.category ? { category: trade } : {}) }).where(eq(quoteItems.id, id))
        if (m.kind === 'group') { const under = [...descendantIds(all, [id])].filter((x) => x !== id); if (under.length) await tx.update(quoteItems).set({ status, updatedAt: now }).where(inArray(quoteItems.id, under)) }
      }
    })
    return { ...(await sync(q.id)), recategorised }
  } catch (e) { return asRefusal(e) }
}

/** What a save to My Items did — the row menu's Undo reads it back (REG-653, price book parity Q-09). */
export type SavedToBook = { mode: 'new' | 'update'; item: PriceBookItem; /** the entry the line pointed at before */ prevLink: string | null; /** an update: the item as it was */ previous: PriceBookItem | null }
const fromLine = (i: QuoteItem, cur?: PriceBookItem) => ({
  name: i.name, description: i.description, descriptionHtml: i.descriptionHtml, kind: isItemKind(i.icon) ? i.icon : cur?.kind ?? 'purchase', unit: i.unit ?? cur?.unit ?? 'Pieces',
  costMinor: i.costMinor, markupMinor: i.markupMinor, category: i.category, vendor: i.vendor, link: i.link, thumb: i.thumb,
})
/** Row menu › Save to My Items: the line becomes a price-book entry (name, description, kind, unit, cost, markup, category, vendor, link,
    photo). (REG-653, price book parity Q-09) On a line that came from an item, `update` writes the line back into that item instead —
    an Owner's or an Admin's — so nothing is duplicated unasked; a new entry is the other, named choice. */
export async function saveItemToPriceBook(itemId: string, mode: 'new' | 'update' = 'new'): Promise<SavedToBook | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const i = await itemOf(itemId)
  if (i.kind !== 'item') throw new Error('sections are saved with Save section to My Sections')
  /* (REG-652, price book parity Q-04) An Owner's or an Admin's save joins the book; a Designer's is proposed — on their quotes at once, offered to no one else until approved. */
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { newItemStatus, runsBook, BOOK_RULE } = await import('@/lib/company/price-book-rules')
  const v = await fetchViewer()
  if (mode === 'update') {
    if (!runsBook(v)) return refuse(BOOK_RULE)
    const [cur] = i.priceBookItemId ? await db.select().from(priceBookItems).where(eq(priceBookItems.id, i.priceBookItemId)) : []
    if (!cur || cur.deletedAt) return refuse('That item is gone from the price book')
    const q = await quoteOf(i.quoteId)
    const { updatePriceBookItem } = await import('@/app/company/price-book-actions')
    const item = await updatePriceBookItem(cur.id, fromLine(i, cur), `Updated from ${q.number}`)
    if ('error' in item) return item
    touch(q.leadId, q.id)
    const s = sightOf(v)   // (pending modules S41b-1) the item, and what it was, as this member may see them
    return { mode, item: bookItemFor(item, s), prevLink: cur.id, previous: bookItemFor(cur, s) }
  }
  const status = newItemStatus(v)
  const id = await addLineToBook(i, v, status, new Date())
  if (status === 'proposed') await proposeNotice(v.id, [{ id, name: i.name }])
  const q = await quoteOf(i.quoteId)
  touch(q.leadId, q.id)
  const [row] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return { mode, item: bookItemFor(row!, sightOf(v)), prevLink: i.priceBookItemId, previous: null }   // (pending modules S41b-1)
}
/** A line becomes a new My Items entry, the line points at it — Save to My Items and the Match review's "Not in My Items yet" share it. */
async function addLineToBook(i: QuoteItem, v: { id: string | null }, status: string, now: Date): Promise<string> {
  const id = randomUUID()
  await db.insert(priceBookItems).values({ id, ...fromLine(i), createdAt: now, updatedAt: now, status, createdBy: v.id, updatedBy: v.id })   // (REG-623) the vendor goes with it · (REG-653) the formatted description, the link
  { const { logBookChange } = await import('@/lib/company/price-book-history'); await logBookChange(id, 'created', v.id, null, `Saved from quote line “${i.name}”`, now) }
  await db.update(quoteItems).set({ priceBookItemId: id }).where(eq(quoteItems.id, i.id))
  return id
}
/** (REG-652) A Designer's new entries wait for an Owner or an Admin: one bell row for them, however many were proposed at once. */
async function proposeNotice(by: string | null, made: { id: string; name: string }[]) {
  if (!made.length) return
  const { notify } = await import('@/lib/notifications/emit'); const { studioRunnerIds } = await import('@/lib/notifications/queries')
  const [me] = by ? await db.select({ name: members.name }).from(members).where(eq(members.id, by)) : []
  const one = made.length === 1 ? made[0]! : null
  await notify('price_book_proposed', await studioRunnerIds(), { title: one ? `${me?.name ?? 'Someone'} proposed “${one.name}” for My Items` : `${me?.name ?? 'Someone'} proposed ${made.length} items for My Items`,
    body: one ? 'Approve it, or send it back with a note' : 'Approve each, or send it back with a note', href: one ? `/company/price-book?open=${encodeURIComponent(one.id)}` : '/company/price-book', actorId: by })   // (UX audit V11) the item itself
}

/** What the Match review did — its snackbar and its Undo read it back (pending modules S12). */
export type BookMatchDone = { matched: number; /** the new My Items entries, as the editor's Add Item box lists them */ added: PriceBookItem[]; updatedAt: number; amountMinor: number }
/**
 * (pending modules S12 — card held:price-book, 1.0's auto-match review and its "add to the price book" suggestions) The Items table's *Match lines*
 * review, applied: each ticked match takes its item's cost (the client's price kept) and points at it (lib/quotes/book-fill.ts); each ticked line
 * that is not in My Items becomes a new entry — a Designer's proposed (REG-652), one bell row for the reviewers — and points at it. One object
 * argument; nothing the browser computed is trusted.
 */
export async function matchQuoteLinesToBook(quoteId: string, o: { matches?: { lineId: string; itemId: string }[]; add?: string[] }): Promise<BookMatchDone | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const q = await quoteOf(typeof quoteId === 'string' ? quoteId : '')
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { newItemStatus } = await import('@/lib/company/price-book-rules')
  const { writeBookMatches } = await import('@/lib/quotes/book-fill')
  const v = await fetchViewer()
  const matches = Array.isArray(o?.matches) ? o.matches : []
  const add = (Array.isArray(o?.add) ? o.add : []).filter((x): x is string => typeof x === 'string').slice(0, 200)
  if (!matches.length && !add.length) return refuse('Tick the lines to match or to add')
  const matched = await writeBookMatches(q.id, matches, v)
  const made: { id: string; name: string }[] = []
  if (add.length) {
    const status = newItemStatus(v)
    const lines = await db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, q.id), inArray(quoteItems.id, add)))
    const now = new Date()
    for (const [k, i] of lines.entries()) {
      if (i.kind !== 'item' || i.priceBookItemId || matched.includes(i.id)) continue
      made.push({ id: await addLineToBook(i, v, status, new Date(now.getTime() + k)), name: i.name })
    }
    if (status === 'proposed') await proposeNotice(v.id, made)
  }
  const added = (made.length ? await db.select().from(priceBookItems).where(inArray(priceBookItems.id, made.map((x) => x.id))) : []).map((x) => bookItemFor(x, sightOf(v)))   // (pending modules S41b-1)
  if (!matched.length && !added.length) return refuse('Those lines have changed since — open Match lines again')
  if (added.length) revalidatePath('/company/price-book')
  const r = await sync(q.id)
  return { matched: matched.length, added, ...r }
}
/** The review's Undo, after the lines are written back as they were: the entries it added leave My Items again — never one a quote line still
    takes from (it stays, and says so), never one the member may not change (REG-652). */
export async function undoBookAdds(o: { added?: string[] }): Promise<{ removed: number; kept: number; keptIds: string[] } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const ids = (Array.isArray(o?.added) ? o.added : []).filter((x): x is string => typeof x === 'string').slice(0, 200)
  if (!ids.length) return { removed: 0, kept: 0, keptIds: [] }
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { itemChangeBlock } = await import('@/lib/company/price-book-rules')
  const { priceBookChanges } = await import('@/lib/db/schema')
  const v = await fetchViewer()
  const [items, used] = await Promise.all([
    db.select().from(priceBookItems).where(inArray(priceBookItems.id, ids)),
    db.selectDistinct({ id: quoteItems.priceBookItemId }).from(quoteItems).where(inArray(quoteItems.priceBookItemId, ids)),
  ])
  const taken = new Set(used.map((u) => u.id))
  const gone = items.filter((i) => !taken.has(i.id) && !itemChangeBlock(v, i)).map((i) => i.id)
  if (gone.length) { await db.delete(priceBookChanges).where(inArray(priceBookChanges.itemId, gone)); await db.delete(priceBookItems).where(inArray(priceBookItems.id, gone)) }
  revalidatePath('/company/price-book')
  return { removed: gone.length, kept: ids.length - gone.length, keptIds: ids.filter((x) => !gone.includes(x)) }
}
/** (REG-653, Q-09) Undo on the save's snackbar: a new entry leaves the book again (nothing else used it yet) and the line points where
    it did; an update writes the item's figures back — History keeps both steps. */
export async function undoSaveToPriceBook(lineId: string, saved: { mode: 'new' | 'update'; itemId: string; prevLink: string | null; previous: PriceBookItem | null }): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const i = await itemOf(lineId)
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { itemChangeBlock } = await import('@/lib/company/price-book-rules')
  const v = await fetchViewer()
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, saved.itemId))
  if (!cur) return
  const block = itemChangeBlock(v, cur)
  if (block) return refuse(block)
  if (saved.mode === 'update' && saved.previous) {
    const p = saved.previous
    const { updatePriceBookItem } = await import('@/app/company/price-book-actions')
    const u = await updatePriceBookItem(cur.id, { name: p.name, description: p.description, descriptionHtml: p.descriptionHtml, kind: p.kind, unit: p.unit, costMinor: p.costMinor, markupMinor: p.markupMinor, category: p.category, vendor: p.vendor, link: p.link, thumb: p.thumb }, 'Undone')
    if ('error' in u) return u
  } else if (saved.mode === 'new') {
    const others = await db.select({ id: quoteItems.id }).from(quoteItems).where(and(eq(quoteItems.priceBookItemId, cur.id)))
    if (others.some((o) => o.id !== i.id)) return refuse('Another quote line uses it now — it stays in My Items')
    const { priceBookChanges } = await import('@/lib/db/schema')
    await db.delete(priceBookItems).where(eq(priceBookItems.id, cur.id))
    await db.delete(priceBookChanges).where(eq(priceBookChanges.itemId, cur.id))
    const [back] = saved.prevLink ? await db.select({ id: priceBookItems.id }).from(priceBookItems).where(eq(priceBookItems.id, saved.prevLink)) : []
    await db.update(quoteItems).set({ priceBookItemId: back ? back.id : null }).where(eq(quoteItems.id, i.id))
  }
  const q = await quoteOf(i.quoteId)
  touch(q.leadId, q.id)
  revalidatePath('/company/price-book')
}

/* ── (REG-566) Saved sections: "Save section to My Items" and "My Sections" in the Add Item popover ── */
const savedLine = (i: QuoteItem): SavedLine => ({
  name: i.name, description: i.description, descriptionHtml: i.descriptionHtml, qty: i.qty, unit: i.unit, costMinor: i.costMinor, markupMinor: i.markupMinor, discountPct: i.discountPct, gstPct: i.gstPct,
  room: i.room, category: i.category, section: i.section, printAs: i.printAs, printAsText: i.printAsText, highlight: i.highlight, icon: i.icon,
  vendor: i.vendor, link: i.link,   // (REG-623)
  /* (REG-653, price book parity Q-10 · E-67) hidden or priced-off lines stay so, optional ones stay out of the sums, and the rest travels */
  visibility: isVisibility(i.visibility) ? i.visibility : 'visible', optional: i.optional, noNumber: i.noNumber, rebateMinor: i.rebateMinor, thumb: i.thumb, thumbCount: i.thumbCount, priceBookItemId: i.priceBookItemId,
  nameHtml: i.nameHtml,   // (S44I — call C2)
})
/** (REG-653, Q-10) A section's own marks: one-line print, the sub-total's word, its highlight, its visibility. */
const savedMarks = (g: QuoteItem) => ({ printOneLine: g.printOneLine, printAsText: g.printAsText, highlight: g.highlight, visibility: isVisibility(g.visibility) ? g.visibility : 'visible' as const })
/** Row menu on a section › Save section to My Sections: the section, its lines and its sub-sections, as one reusable block. */
export async function saveSectionToPriceBook(groupId: string, name?: string): Promise<PriceBookSection | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  { const lock = await requirePlan('package_creation'); if (lock) return lock }   // (pending modules S19) My Sections are Pro
  /* (REG-652, price book parity Q-03) My Sections are the Owners' and Admins'. */
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsBook, SECTION_RULE } = await import('@/lib/company/price-book-rules')
  const v = await fetchViewer()
  if (!runsBook(v)) return refuse(SECTION_RULE)
  const g = await itemOf(groupId)
  if (g.kind !== 'group') throw new Error('not a section')
  const all = await linesOf(g.quoteId)
  const kids = all.filter((i) => i.parentId === g.id).sort((a, b) => a.position - b.position)
  const body: SavedSection = cleanSectionHtml({   // (S44Q, triage §12.1) the words travel through the allowlist
    name: (str(name, 200) ?? '').trim() || g.name, description: g.description, descriptionHtml: g.descriptionHtml, ...savedMarks(g),
    lines: kids.filter((k) => k.kind === 'item').map(savedLine),
    /* (S44I — UAT row 316) an empty sub-section is left out: it never prints, and every quote that took the section got it as clutter */
    subs: kids.filter((k) => k.kind === 'group').map((s) => ({ name: s.name, description: s.description, descriptionHtml: s.descriptionHtml, ...savedMarks(s), lines: all.filter((i) => i.parentId === s.id && i.kind === 'item').sort((a, b) => a.position - b.position).map(savedLine) })).filter((s) => s.lines.length > 0),
  })
  const now = new Date()
  const id = randomUUID()
  const q = await quoteOf(g.quoteId)
  // (REG-619, parity Q-27) The section remembers the property type of the quote it came from, as 1.0's packages took the lead's.
  const propertyType = q.propertyType && (PROPERTY_TYPES as readonly string[]).includes(q.propertyType) ? q.propertyType : null
  await db.insert(priceBookSections).values({ id, name: body.name, description: g.description, linesJson: JSON.stringify(body), propertyType, createdAt: now, updatedAt: now, createdBy: v.id, updatedBy: v.id })
  touch(q.leadId, q.id)
  const [row] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  return sectionFor(row!, sightOf(v), parseSavedSection)   // (pending modules S41b-1)
}
/** The Add Item popover › My Sections › a pick: the saved section lands whole — after `afterId` at the top, else at the end. */
export async function insertPriceBookSection(quoteId: string, sectionId: string, place: { afterId?: string | null } = {}): Promise<QuoteItem | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  { const lock = await requirePlan('package_creation'); if (lock) throw new Error(lock.error) }   // (pending modules S19) My Sections are Pro
  const q = await quoteOf(quoteId)
  const [row] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, sectionId))
  if (!row || row.deletedAt) throw new Error('saved section not found')   // (REG-653, Q-11) a page opened before the delete still lists it
  const read = parseSavedSection(row.linesJson)
  if (!read) throw new Error('saved section unreadable')
  const body = cleanSectionHtml(read)   // (S44Q, triage §12.1) a section saved before the allowlist lands clean
  const top = await renumber(quoteId, null)
  let position = mainEnd(top)
  if (place.afterId) { const idx = top.findIndex((s) => s.id === place.afterId); if (idx >= 0) position = idx + 1 }
  const now = new Date()
  const id = randomUUID()
  const [rules, studio] = await Promise.all([fetchQuoteRules(), fetchStudio()])   // (REG-584) · (REG-653, Q-10 · E-69) the studio's GST rate, not the one the section was saved with
  /* (REG-653, Q-10) a line keeps its link to My Items only while that item is still live in the book */
  const linked = [...body.lines, ...body.subs.flatMap((s) => s.lines)].map((l) => l.priceBookItemId).filter((x): x is string => !!x)
  const live = new Set(linked.length ? (await db.select({ id: priceBookItems.id }).from(priceBookItems).where(and(inArray(priceBookItems.id, linked), isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live')))).map((r) => r.id) : [])
  const line = (l: SavedLine, parentId: string, k: number) => ({
    id: randomUUID(), quoteId, parentId, kind: 'item' as const, position: k, name: l.name, description: l.description, descriptionHtml: l.descriptionHtml, icon: isItemKind(l.icon) ? l.icon : null, thumb: l.thumb ?? null, thumbCount: l.thumb ? Math.max(1, l.thumbCount ?? 1) : 0, status: 'Pending' as const,
    qty: l.qty, unit: l.unit, costMinor: l.costMinor, markupMinor: roundToStep(l.costMinor, Math.max(-l.costMinor, l.markupMinor), rules.roundStep, l.unit), discountPct: l.discountPct, gstPct: studio.gstPct, room: l.room, category: l.category, section: l.section,
    printAs: isPrintAs(l.printAs) ? l.printAs : null, printAsText: l.printAsText, highlight: isHighlight(l.highlight) ? l.highlight : null, visibility: l.visibility ?? 'visible', collapsed: false,
    optional: l.optional === true, noNumber: l.noNumber === true, rebateMinor: Math.max(0, Math.round(l.rebateMinor ?? 0)), priceBookItemId: l.priceBookItemId && live.has(l.priceBookItemId) ? l.priceBookItemId : null, createdAt: now, updatedAt: now,
    vendor: vendorName(l.vendor ?? null), link: l.link ? cleanLink(l.link) ?? null : null,   // (REG-623)
    nameHtml: narrowNameHtml(cleanRichHtml(l.nameHtml ?? null, 4000)),   // (S44I — call C2) through the allowlist, as every save
  })
  const marks = (g: { printOneLine?: boolean; printAsText?: string | null; highlight?: string | null; visibility?: string }) => ({ printOneLine: g.printOneLine === true, printAsText: g.printAsText ?? null, highlight: isHighlight(g.highlight) ? g.highlight : null, visibility: g.visibility && isVisibility(g.visibility) ? g.visibility : 'visible' })
  await db.transaction(async (tx) => {
    for (const s of top) if (s.position >= position) await tx.update(quoteItems).set({ position: s.position + 1 }).where(eq(quoteItems.id, s.id))
    await tx.insert(quoteItems).values({ id, quoteId, parentId: null, kind: 'group', position, name: body.name, description: body.description, descriptionHtml: body.descriptionHtml, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: studio.gstPct, ...marks(body), collapsed: false, priceBookItemId: sectionId, createdAt: now, updatedAt: now })   // (REG-594) the section it came from — the Price book's "Used in n quotes"
    let k = 0
    for (const l of body.lines) await tx.insert(quoteItems).values(line(l, id, k++))
    for (const s of body.subs) {
      if (!s.lines.length) continue   // (S44I — row 316) a sub-section saved empty before this rule never lands
      const sid = randomUUID()
      await tx.insert(quoteItems).values({ id: sid, quoteId, parentId: id, kind: 'group', position: k++, name: s.name, description: s.description, descriptionHtml: s.descriptionHtml, status: 'Pending', qty: 1, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: studio.gstPct, ...marks(s), collapsed: false, createdAt: now, updatedAt: now })
      let j = 0
      for (const l of s.lines) await tx.insert(quoteItems).values(line(l, sid, j++))
    }
    await tx.update(priceBookSections).set({ lastUsedAt: now }).where(eq(priceBookSections.id, sectionId))
  })
  await renumber(quoteId, null)
  await sync(q.id)
  return seen(await itemOf(id), await sightNow())   // (pending modules S41b-1)
}

/** Undo / redo: the editor keeps snapshots of the lines and writes one back whole. */
export async function replaceQuoteItems(quoteId: string, items: QuoteItem[]): Promise<{ updatedAt: number; amountMinor: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const q = await quoteOf(quoteId)
  const now = new Date()
  /* (pending modules S41b-1) A snapshot from a member who doesn't see costs carries each line's price with its cost folded in: every line is
     written with its stored cost (the line as it is now, else the cost kept when it was deleted, else its My Items entry's), its price as sent;
     a rebate from anyone but an Owner is the stored one. A line the snapshot drops keeps its cost for an Undo of this one. */
  const sight = await sightNow()
  const before = await linesOf(quoteId)
  const incomingIds = items.map((i) => (typeof i?.id === 'string' ? i.id : '')).filter(Boolean)
  const kept = (!sight.costs || !sight.rebate) ? await keptCostsOf(incomingIds) : new Map<string, { costMinor: number; markupMinor: number; rebateMinor: number }>()
  const bookIds = !sight.costs ? [...new Set(items.map((i) => i?.priceBookItemId).filter((x): x is string => typeof x === 'string'))] : []
  const book = bookIds.length ? await db.select({ id: priceBookItems.id, costMinor: priceBookItems.costMinor, markupMinor: priceBookItems.markupMinor }).from(priceBookItems).where(inArray(priceBookItems.id, bookIds)) : []
  const storedOf = (i: QuoteItem) => {
    const live = before.find((b) => b.id === i.id)
    if (live) return live
    const k = kept.get(i.id)
    if (k) return k
    const b = i.priceBookItemId ? book.find((x) => x.id === i.priceBookItemId) : undefined
    return b ? { ...b, rebateMinor: 0 } : null
  }
  if (!sight.costs || !sight.rebate) items = items.map((i) => (i && typeof i === 'object' && i.kind !== 'group' ? withKeptCost({ ...i, costMinor: Number(i.costMinor) || 0, markupMinor: Number(i.markupMinor) || 0, rebateMinor: Number(i.rebateMinor) || 0 }, storedOf(i), sight) : i))
  await keepCosts(before.filter((b) => !incomingIds.includes(b.id)))
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
      /* (parity §8.2 · E-32, REG-623) Undo used to write a line back without these four — a section lost its one-line print, a line its rebate. */
      printOneLine: set.printOneLine ?? false, rebateMinor: set.rebateMinor ?? 0, vendor: set.vendor ?? null, link: set.link ?? null,
      /* (S44T — calls C1 · C2) Undo writes a section back priced after the contract, and a name back with its emphasis */
      pricedAfter: i.kind === 'group' && !(i.parentId && ids.has(i.parentId)) && i.pricedAfter === true, nameHtml: set.nameHtml ?? null,   // (S44I — call C2) through the allowlist and narrowed to a name's marks, as every save
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
export async function updateQuotePricing(quoteId: string, patch: PricingPatch): Promise<{ updatedAt: number; amountMinor: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const q = await quoteOf(quoteId)
  /* (S44I — S43D's NB-06, 1.0's INV-051) A quote a project bills from keeps its issuing entity: the project's invoices are issued from it */
  if (patch.issuingEntity !== undefined && (patch.issuingEntity ?? null) !== (q.issuingEntity ?? null)) {
    const { billsProjectOf } = await import('@/lib/quotes/bills-project')
    const bills = await billsProjectOf(q)
    if (bills) return refuse(bills.rule)
  }
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
export async function updateItemsPrefs(quoteId: string, patch: ItemsPrefsPatch): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const q = await quoteOf(quoteId)
  const set: Partial<typeof quotes.$inferInsert> = {}
  if (patch.itemsView !== undefined) { if (!isItemsView(patch.itemsView)) throw new Error('bad view'); set.itemsView = patch.itemsView }
  if (patch.itemsDensity !== undefined) { if (!isDensity(patch.itemsDensity)) throw new Error('bad density'); set.itemsDensity = patch.itemsDensity }
  if (patch.itemsColumns !== undefined) set.itemsColumns = JSON.stringify(parseColumns(JSON.stringify(patch.itemsColumns)))
  if (patch.itemsLabels !== undefined) set.itemsLabels = JSON.stringify(parseLabels(JSON.stringify(patch.itemsLabels)))
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId)
}

/** The quote's lines as stored — the editor reloads them after structural edits (duplicate, group, re-parent). (pending modules S41b-1) As the
    member may see them. */
export async function listQuoteItems(quoteId: string): Promise<QuoteItem[]> {
  if (await offDesk()) return []   // (S44Z) the editors' role rule: a list read answers nothing, as Who sees leads' below
  const v = await fetchViewer()
  const { canOpenLead } = await import('@/lib/leads/visibility')
  if (!(await canOpenLead(v, (await quoteOf(quoteId)).leadId))) return []   // (pending modules S41b-1 — found on the way) Who sees leads: a quote's lines, read by its id alone
  const s = sightOf(v)
  return (await linesOf(quoteId)).map((l) => seen(l, s))
}

/**
 * (S44T — call C1, as recommended, her UAT ask 2026-10-15; UAT rows 277 · 278 · 280 · 281 · 317 · 318 — Dyel's Estimation Direct) A section's
 * ⋮ › Priced after the contract: the section's work is estimated now and priced once the contract is signed. It leaves the quote's total, its
 * payment split and its margin; the print shows it after the main items as its own part; the client's pages call it an estimate. Marked, the
 * section moves to the end of the table, where the marked ones gather. A section at the top only — a sub-section follows its section — and
 * never on a variation order (it is priced in full).
 */
export async function setSectionPricedAfter(itemId: string, on: boolean): Promise<{ updatedAt: number; amountMinor: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a line is read
  const i = await itemOf(itemId)
  if (i.kind !== 'group' || i.parentId) return refuse('Only a section at the top of the table can be priced after the contract')
  const q = await quoteOf(i.quoteId)
  if (q.kind === 'variation') return refuse('A variation order is priced in full — it has no work priced after the contract')
  if (!!i.pricedAfter === !!on) return sync(i.quoteId)
  await db.update(quoteItems).set({ pricedAfter: !!on, updatedAt: new Date() }).where(eq(quoteItems.id, itemId))
  if (on) {   // to the end of the table, after the sections already marked
    const top = await renumber(i.quoteId, null)
    const rest = top.filter((t) => t.id !== itemId)
    const order = [...rest, top.find((t) => t.id === itemId)!]
    for (let k = 0; k < order.length; k++) if (order[k]!.position !== k) await db.update(quoteItems).set({ position: k }).where(eq(quoteItems.id, order[k]!.id))
  }
  return sync(i.quoteId)
}
