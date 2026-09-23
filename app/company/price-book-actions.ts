'use server'

import { randomUUID } from 'node:crypto'
import { eq, inArray, isNotNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { priceBookItems, priceBookSections, type PriceBookItem, type PriceBookSection } from '@/lib/db/schema'
import { isItemKind, parseSavedSection, UNITS, type SavedSection } from '@/lib/quotes/items-model'
import type { PasteLine } from '@/lib/quotes/clipboard'

/* Company › Price book (REG-594): the studio's items and sections, edited outside any quote. Every write revalidates the page
   the quote editor reads from on its next load. Deletes are soft (REG-502's rule): a deleted entry leaves the Add Item popover
   and can be restored from Deleted Items / Deleted Sections; a line already on a quote keeps what it copied. */

const HERE = ['/company/price-book', '/company/price-book/sections']
const touch = () => { for (const p of HERE) revalidatePath(p) }
const clean = (v: string | null | undefined, max = 200) => { const s = (v ?? '').trim().slice(0, max); return s || null }
const minor = (v: number | undefined, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback)

export type PriceBookItemInput = { name: string; description?: string | null; kind?: string; unit?: string; costMinor?: number; markupMinor?: number; category?: string | null; vendor?: string | null }

const row = (id: string, i: PriceBookItemInput, now: Date, createdAt = now) => ({
  id, name: clean(i.name) ?? 'Item', description: clean(i.description, 2000), kind: isItemKind(i.kind) ? i.kind : 'purchase', unit: clean(i.unit, 40) ?? 'Pieces',
  costMinor: Math.max(0, minor(i.costMinor)), markupMinor: Math.max(-Math.max(0, minor(i.costMinor)), minor(i.markupMinor)), category: clean(i.category, 60), thumb: null as string | null, vendor: clean(i.vendor, 80),
  createdAt, updatedAt: now, deletedAt: null as Date | null,
})

export async function createPriceBookItem(input: PriceBookItemInput): Promise<PriceBookItem> {
  const now = new Date(), id = randomUUID()
  await db.insert(priceBookItems).values(row(id, input, now))
  touch()
  const [r] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return r!
}

export async function updatePriceBookItem(id: string, patch: Partial<PriceBookItemInput>): Promise<PriceBookItem> {
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur) throw new Error('item not found')
  const next = row(id, { name: patch.name ?? cur.name, description: patch.description === undefined ? cur.description : patch.description, kind: patch.kind ?? cur.kind, unit: patch.unit ?? cur.unit, costMinor: patch.costMinor ?? cur.costMinor, markupMinor: patch.markupMinor ?? cur.markupMinor, category: patch.category === undefined ? cur.category : patch.category, vendor: patch.vendor === undefined ? cur.vendor : patch.vendor }, new Date(), cur.createdAt)
  await db.update(priceBookItems).set({ name: next.name, description: next.description, kind: next.kind, unit: next.unit, costMinor: next.costMinor, markupMinor: next.markupMinor, category: next.category, vendor: next.vendor, updatedAt: next.updatedAt }).where(eq(priceBookItems.id, id))
  touch()
  const [r] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return r!
}

export async function renamePriceBookItem(id: string, name: string): Promise<void> { await updatePriceBookItem(id, { name }) }

export async function duplicatePriceBookItem(id: string): Promise<string> {
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur) throw new Error('item not found')
  const now = new Date(), nid = randomUUID()
  await db.insert(priceBookItems).values({ ...row(nid, { ...cur, name: `${cur.name} (copy)` }, now), thumb: cur.thumb })
  touch()
  return nid
}

/** Import from a spreadsheet (REG-594 on REG-476's mapping): every mapped row becomes an item; `vendor` applies to all of them. */
export async function importPriceBookItems(lines: PasteLine[], vendor?: string | null): Promise<number> {
  const now = new Date()
  const rows = lines.filter((l) => l.name.trim()).slice(0, 500).map((l, i) => row(randomUUID(), {
    name: l.name, description: l.description ?? null, kind: 'purchase', unit: l.unit ? (UNITS.find((u) => u.toLowerCase() === l.unit!.toLowerCase()) ?? l.unit) : 'Pieces',
    costMinor: l.costMinor ?? 0, markupMinor: l.markupMinor ?? 0, category: l.category ?? null, vendor: vendor ?? null,
  }, new Date(now.getTime() + i)))
  if (rows.length) await db.insert(priceBookItems).values(rows)
  touch()
  return rows.length
}

export async function deletePriceBookItems(ids: string[]): Promise<void> { if (ids.length) await db.update(priceBookItems).set({ deletedAt: new Date() }).where(inArray(priceBookItems.id, ids)); touch() }
export async function restorePriceBookItems(ids: string[]): Promise<void> { if (ids.length) await db.update(priceBookItems).set({ deletedAt: null }).where(inArray(priceBookItems.id, ids)); touch() }
export async function deletePriceBookItemsForever(ids: string[]): Promise<void> { if (ids.length) await db.delete(priceBookItems).where(inArray(priceBookItems.id, ids)); touch() }
export async function emptyPriceBookItemTrash(): Promise<void> { await db.delete(priceBookItems).where(isNotNull(priceBookItems.deletedAt)); touch() }

/* ── sections ── */

/** The section's editor saves the whole body: its name, description and lines (with their sub-sections), reordered or trimmed. */
export async function updatePriceBookSection(id: string, input: { name?: string; description?: string | null; body?: SavedSection }): Promise<PriceBookSection> {
  const [cur] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  if (!cur) throw new Error('section not found')
  const body = input.body ? parseSavedSection(JSON.stringify(input.body)) : parseSavedSection(cur.linesJson)
  if (!body) throw new Error('section unreadable')
  const name = clean(input.name ?? cur.name) ?? cur.name
  const description = input.description === undefined ? cur.description : clean(input.description, 2000)
  const next: SavedSection = { ...body, name, description, lines: body.lines.slice(0, 200), subs: body.subs.slice(0, 50).map((s) => ({ ...s, lines: s.lines.slice(0, 200) })) }
  await db.update(priceBookSections).set({ name, description, linesJson: JSON.stringify(next), updatedAt: new Date() }).where(eq(priceBookSections.id, id))
  touch()
  const [r] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  return r!
}
export async function renamePriceBookSection(id: string, name: string): Promise<void> { await updatePriceBookSection(id, { name }) }
export async function duplicatePriceBookSection(id: string): Promise<string> {
  const [cur] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  if (!cur) throw new Error('section not found')
  const body = parseSavedSection(cur.linesJson)
  if (!body) throw new Error('section unreadable')
  const now = new Date(), nid = randomUUID(), name = `${cur.name} (copy)`
  await db.insert(priceBookSections).values({ id: nid, name, description: cur.description, linesJson: JSON.stringify({ ...body, name }), createdAt: now, updatedAt: now })
  touch()
  return nid
}
export async function deletePriceBookSections(ids: string[]): Promise<void> { if (ids.length) await db.update(priceBookSections).set({ deletedAt: new Date() }).where(inArray(priceBookSections.id, ids)); touch() }
export async function restorePriceBookSections(ids: string[]): Promise<void> { if (ids.length) await db.update(priceBookSections).set({ deletedAt: null }).where(inArray(priceBookSections.id, ids)); touch() }
export async function deletePriceBookSectionsForever(ids: string[]): Promise<void> { if (ids.length) await db.delete(priceBookSections).where(inArray(priceBookSections.id, ids)); touch() }
export async function emptyPriceBookSectionTrash(): Promise<void> { await db.delete(priceBookSections).where(isNotNull(priceBookSections.deletedAt)); touch() }

/** New section: an empty one to fill in the editor (the usual way in is a quote's "Save section to My Items", REG-566). */
export async function createPriceBookSection(name: string): Promise<string> {
  const now = new Date(), id = randomUUID(), n = clean(name, 120) ?? 'New section'
  const body: SavedSection = { name: n, description: null, descriptionHtml: null, lines: [], subs: [] }
  await db.insert(priceBookSections).values({ id, name: n, description: null, linesJson: JSON.stringify(body), createdAt: now, updatedAt: now })
  touch()
  return id
}
