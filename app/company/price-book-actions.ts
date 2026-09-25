'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { priceBookChanges, priceBookItems, priceBookSections, quoteItems, quotes, type PriceBookItem, type PriceBookSection } from '@/lib/db/schema'
import { cleanLink, cleanSectionTags, htmlToPlain, isItemKind, parseSavedSection, UNITS, type SavedSection } from '@/lib/quotes/items-model'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import type { PasteLine } from '@/lib/quotes/clipboard'
import { fetchViewer } from '@/lib/leads/visibility'
import { members } from '@/lib/db/schema'
import { BOOK_RULE, SECTION_RULE, itemChangeBlock, newItemStatus, runsBook } from '@/lib/company/price-book-rules'
import { diffItem, fetchItemHistory, logBookChange } from '@/lib/company/price-book-history'
import type { ItemChange } from '@/lib/company/price-book-changes'

/* Company › Price book (REG-594): the studio's items and sections, edited outside any quote. Every write revalidates the page
   the quote editor reads from on its next load. Deletes are soft (REG-502's rule): a deleted entry leaves the Add Item popover
   and can be restored from Deleted Items / Deleted Sections; a line already on a quote keeps what it copied. */

const HERE = ['/company/price-book', '/company/price-book/sections']
const touch = () => { for (const p of HERE) revalidatePath(p); revalidatePath('/quotes', 'layout') }

/* (REG-652, price book parity Q-03 · Q-04) Owners and Admins change the book; a Designer proposes a new item and changes only their own
   proposal; My Sections are the Owners' and Admins'. Every change is kept in the item's history (Q-05). */
const who = async () => { const v = await fetchViewer(); return { id: v.id, role: v.role } }
async function assertRunsBook(rule = BOOK_RULE) { const v = await who(); if (!runsBook(v)) throw new Error(rule); return v }
async function assertMayChange(ids: string[]) {
  const v = await who()
  if (runsBook(v)) return v
  const rows = ids.length ? await db.select({ status: priceBookItems.status, createdBy: priceBookItems.createdBy }).from(priceBookItems).where(inArray(priceBookItems.id, ids)) : []
  if (rows.some((r) => itemChangeBlock(v, r))) throw new Error(BOOK_RULE)
  return v
}
const nameOf = async (id: string | null) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)))[0]?.name ?? 'Someone' : 'Someone')
const clean = (v: string | null | undefined, max = 200) => { const s = (v ?? '').trim().slice(0, max); return s || null }
const minor = (v: number | undefined, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback)

export type PriceBookItemInput = { name: string; description?: string | null; kind?: string; unit?: string; costMinor?: number; markupMinor?: number; category?: string | null; vendor?: string | null
  /** (REG-653, price book parity Q-08) the formatted description (its plain text is `description`), a product or spec page, the photo */
  descriptionHtml?: string | null; link?: string | null; thumb?: string | null }

/* (REG-653, Q-08) A formatted description goes through the house allowlist (the contracts' one); plain paragraphs need no HTML.
   A photo is the picture itself, downscaled in the browser (the brand kit's rule) — a data URL of an image, or a path the app serves. */
const cleanHtml = (v: string | null | undefined) => { if (!v) return null; const s = sanitizeContractHtml(v).slice(0, 12000); return /<(ul|ol|li|b|strong|i|em|u|s|a)\b/i.test(s) ? s : null }
const cleanThumb = (v: string | null | undefined) => (typeof v === 'string' && (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 1_500_000 || /^\/[\w\-./]+\.(png|jpe?g|webp|gif|svg)$/i.test(v)) ? v : null)

const row = (id: string, i: PriceBookItemInput, now: Date, createdAt = now) => {
  const html = cleanHtml(i.descriptionHtml)
  return {
    id, name: clean(i.name) ?? 'Item', description: html ? clean(htmlToPlain(html), 2000) : clean(i.description, 2000), descriptionHtml: html, kind: isItemKind(i.kind) ? i.kind : 'purchase', unit: clean(i.unit, 40) ?? 'Pieces',
    costMinor: Math.max(0, minor(i.costMinor)), markupMinor: Math.max(-Math.max(0, minor(i.costMinor)), minor(i.markupMinor)), category: clean(i.category, 60), thumb: cleanThumb(i.thumb), vendor: clean(i.vendor, 80),
    link: cleanLink(i.link) ?? null,
    createdAt, updatedAt: now, deletedAt: null as Date | null,
  }
}
/** (REG-653, price book parity Q-11) The entries a live quote came from — they wait in the trash, never deleted for good (the libraries' rule). */
async function inUse(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const rows = await db.selectDistinct({ id: quoteItems.priceBookItemId }).from(quoteItems).innerJoin(quotes, eq(quotes.id, quoteItems.quoteId)).where(and(inArray(quoteItems.priceBookItemId, ids), isNull(quotes.deletedAt)))
  return new Set(rows.map((r) => r.id).filter((x): x is string => !!x))
}

export async function createPriceBookItem(input: PriceBookItemInput): Promise<PriceBookItem> {
  const v = await who()
  const now = new Date(), id = randomUUID()
  const status = newItemStatus(v)
  await db.insert(priceBookItems).values({ ...row(id, input, now), status, createdBy: v.id, updatedBy: v.id })
  await logBookChange(id, 'created', v.id, null, null, now)
  if (status === 'proposed') await proposeNotice(id, v.id)
  touch()
  const [r] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return r!
}

export async function updatePriceBookItem(id: string, patch: Partial<PriceBookItemInput>, note?: string | null): Promise<PriceBookItem> {
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur) throw new Error('item not found')
  const v = await who()
  const block = itemChangeBlock(v, cur)
  if (block) throw new Error(block)
  const keep = <K extends keyof PriceBookItemInput>(k: K, fallback: PriceBookItemInput[K]) => (patch[k] === undefined ? fallback : patch[k])
  /* a new plain description without its formatted copy drops the old formatting — the plain words are what was typed */
  const html = patch.descriptionHtml !== undefined ? patch.descriptionHtml : patch.description !== undefined ? null : cur.descriptionHtml
  const next = row(id, { name: patch.name ?? cur.name, description: keep('description', cur.description), descriptionHtml: html, kind: patch.kind ?? cur.kind, unit: patch.unit ?? cur.unit, costMinor: patch.costMinor ?? cur.costMinor, markupMinor: patch.markupMinor ?? cur.markupMinor, category: keep('category', cur.category), vendor: keep('vendor', cur.vendor), link: keep('link', cur.link), thumb: keep('thumb', cur.thumb) }, new Date(), cur.createdAt)
  await db.update(priceBookItems).set({ name: next.name, description: next.description, descriptionHtml: next.descriptionHtml, kind: next.kind, unit: next.unit, costMinor: next.costMinor, markupMinor: next.markupMinor, category: next.category, vendor: next.vendor, link: next.link, thumb: next.thumb, updatedAt: next.updatedAt, updatedBy: v.id }).where(eq(priceBookItems.id, id))
  await logBookChange(id, 'edited', v.id, diffItem(cur, next), note ?? null, next.updatedAt)
  touch()
  const [r] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return r!
}

export async function renamePriceBookItem(id: string, name: string): Promise<void> { await updatePriceBookItem(id, { name }) }

export async function duplicatePriceBookItem(id: string): Promise<string> {
  const v = await assertRunsBook()
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur) throw new Error('item not found')
  const now = new Date(), nid = randomUUID()
  await db.insert(priceBookItems).values({ ...row(nid, { ...cur, name: `${cur.name} (copy)` }, now), status: 'live', createdBy: v.id, updatedBy: v.id })
  await logBookChange(nid, 'created', v.id, null, `Copied from ${cur.name}`, now)
  touch()
  return nid
}

/** Import from a spreadsheet (REG-594 on REG-476's mapping): every mapped row becomes an item; `vendor` fills the rows without one.
    (REG-653, price book parity Q-13) At most 500 rows; a row that repeats an earlier one (the same name from the same vendor) is
    dropped; a row that matches a live item updates its price (and whatever else the row brings), is added as new, or is skipped —
    the one choice the preview asked; every write is kept in History; an unknown category joins the trades. */
export async function importPriceBookItems(lines: PasteLine[], vendor?: string | null, onMatch: 'update' | 'new' | 'skip' = 'update'): Promise<{ added: number; updated: number; skipped: number }> {
  const v = await assertRunsBook()
  const now = new Date()
  const key = (name: string, ven: string | null | undefined) => `${name.trim().toLowerCase()}|${(ven ?? '').trim().toLowerCase()}`
  const live = await db.select().from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live')))
  const shelf = new Map<string, PriceBookItem>()
  for (const it of live) if (!shelf.has(key(it.name, it.vendor))) shelf.set(key(it.name, it.vendor), it)
  const seen = new Set<string>()
  let skipped = 0, updated = 0
  const fresh: ReturnType<typeof row>[] = []
  for (const [i, l] of lines.filter((x) => x.name.trim()).slice(0, 500).entries()) {
    const ven = l.vendor?.trim().slice(0, 80) || vendor || null   // (REG-623) a mapped Vendor column wins over the one typed for all
    const k = key(l.name, ven)
    if (seen.has(k)) { skipped++; continue }
    seen.add(k)
    const unit = l.unit ? (UNITS.find((u) => u.toLowerCase() === l.unit!.toLowerCase()) ?? l.unit) : undefined
    const hit = shelf.get(k)
    if (hit && onMatch === 'skip') { skipped++; continue }
    if (hit && onMatch === 'update') {
      await updatePriceBookItem(hit.id, { ...(l.costMinor !== undefined ? { costMinor: l.costMinor } : {}), ...(l.markupMinor !== undefined ? { markupMinor: l.markupMinor } : {}), ...(unit ? { unit } : {}), ...(l.description ? { description: l.description } : {}), ...(l.category ? { category: l.category } : {}), ...(l.kind ? { kind: l.kind } : {}), ...(l.link ? { link: l.link } : {}) }, 'Imported')
      updated++
      continue
    }
    fresh.push(row(randomUUID(), { name: l.name, description: l.description ?? null, kind: l.kind ?? 'purchase', unit: unit ?? 'Pieces', costMinor: l.costMinor ?? 0, markupMinor: l.markupMinor ?? 0, category: l.category ?? null, vendor: ven, link: l.link ?? null }, new Date(now.getTime() + i)))
  }
  const rows = fresh.map((r) => ({ ...r, status: 'live', createdBy: v.id, updatedBy: v.id }))
  if (rows.length) {
    for (let at = 0; at < rows.length; at += 100) await db.insert(priceBookItems).values(rows.slice(at, at + 100))
    for (let at = 0; at < rows.length; at += 100) await db.insert(priceBookChanges).values(rows.slice(at, at + 100).map((r) => ({ id: randomUUID(), itemId: r.id, kind: 'imported', changes: null, note: null, by: v.id, at: r.createdAt })))
  }
  /* (REG-651, price book parity Q-07) An imported category the studio doesn't list joins its trades. */
  const cats = [...new Set(lines.map((l) => l.category?.trim()).filter((c): c is string => !!c))]
  if (cats.length) { try { const { addTrades } = await import('@/app/settings/actions'); await addTrades(cats) } catch { /* the trades are the Owners' and Admins' (REG-646) */ } }
  touch()
  return { added: rows.length, updated, skipped }
}

/** (REG-653, price book parity Q-15) The list's bulk changes: a category, a vendor, or a markup as a share of each item's cost (the item is
    re-priced — 1.0's vendor markup, without its bug of storing a markup nothing read). Owners and Admins; each change kept in History. */
export async function bulkUpdatePriceBookItems(ids: string[], change: { category?: string | null; vendor?: string | null; markupPct?: number }): Promise<number> {
  await assertRunsBook()
  if (!ids.length) return 0
  const items = await db.select().from(priceBookItems).where(and(inArray(priceBookItems.id, ids), isNull(priceBookItems.deletedAt)))
  const pct = typeof change.markupPct === 'number' && Number.isFinite(change.markupPct) ? Math.min(1000, Math.max(-100, change.markupPct)) : null
  for (const it of items) {
    const patch: Partial<PriceBookItemInput> = {}
    if (change.category !== undefined) patch.category = change.category
    if (change.vendor !== undefined) patch.vendor = change.vendor
    if (pct !== null) patch.markupMinor = Math.round(it.costMinor * pct / 100)
    await updatePriceBookItem(it.id, patch, 'Bulk change')
  }
  return items.length
}

/** (sweep S5 #11) A bulk change's Undo: the one field it changed, put back on each item as it was (History keeps both steps). */
export async function undoBulkPriceBook(prev: { id: string; category?: string | null; vendor?: string | null; markupMinor?: number }[]): Promise<number> {
  await assertRunsBook()
  let n = 0
  for (const p of prev.slice(0, 1000)) {
    const patch: Partial<PriceBookItemInput> = {}
    if (p.category !== undefined) patch.category = p.category
    if (p.vendor !== undefined) patch.vendor = p.vendor
    if (typeof p.markupMinor === 'number') patch.markupMinor = p.markupMinor
    await updatePriceBookItem(p.id, patch, 'Undo'); n++
  }
  return n
}

/** Delete · restore: an Owner or an Admin — or a Designer withdrawing their own proposal. */
export async function deletePriceBookItems(ids: string[]): Promise<void> {
  const v = await assertMayChange(ids)
  if (ids.length) { const now = new Date(); await db.update(priceBookItems).set({ deletedAt: now, updatedBy: v.id }).where(inArray(priceBookItems.id, ids)); for (const id of ids) await logBookChange(id, 'deleted', v.id, null, null, now) }
  touch()
}
export async function restorePriceBookItems(ids: string[]): Promise<void> {
  const v = await assertMayChange(ids)
  if (ids.length) {
    const now = new Date()
    await db.update(priceBookItems).set({ deletedAt: null, updatedBy: v.id }).where(inArray(priceBookItems.id, ids))
    /* A sent-back proposal brought back waits again: its old answer stays in History, not on the item. */
    await db.update(priceBookItems).set({ reviewedBy: null, reviewedAt: null, reviewNote: null }).where(and(inArray(priceBookItems.id, ids), eq(priceBookItems.status, 'proposed')))
    for (const id of ids) await logBookChange(id, 'restored', v.id, null, null, now)
    /* A proposal its proposer brings back (after a send-back, say) is proposed again — the reviewers hear of it once more. */
    if (!runsBook(v)) { const back = await db.select({ id: priceBookItems.id, status: priceBookItems.status }).from(priceBookItems).where(inArray(priceBookItems.id, ids)); for (const b of back) if (b.status === 'proposed') await proposeNotice(b.id, v.id) }
  }
  touch()
}
/** Delete forever · Empty Trash: an Owner or an Admin, and never an item a live quote came from (REG-653, Q-11 — it waits to be restored). */
export async function deletePriceBookItemsForever(ids: string[]): Promise<void> {
  await assertRunsBook()
  const used = await inUse(ids)
  const gone = ids.filter((id) => !used.has(id))
  if (gone.length) { await db.delete(priceBookItems).where(and(inArray(priceBookItems.id, gone), isNotNull(priceBookItems.deletedAt))); await db.delete(priceBookChanges).where(inArray(priceBookChanges.itemId, gone)) }
  touch()
}
export async function emptyPriceBookItemTrash(): Promise<void> {
  await assertRunsBook()
  const trash = (await db.select({ id: priceBookItems.id }).from(priceBookItems).where(isNotNull(priceBookItems.deletedAt))).map((r) => r.id)
  await deletePriceBookItemsForever(trash)
}

/* ── (REG-652, price book parity Q-04) Proposals: an Owner or an Admin approves one, or sends it back with a note ── */
async function proposeNotice(itemId: string, by: string | null) {
  const { notify } = await import('@/lib/notifications/emit')
  const { studioRunnerIds } = await import('@/lib/notifications/queries')
  const [it] = await db.select({ name: priceBookItems.name }).from(priceBookItems).where(eq(priceBookItems.id, itemId))
  await notify('price_book_proposed', await studioRunnerIds(), { title: `${await nameOf(by)} proposed “${it?.name ?? 'an item'}” for My Items`, body: 'Approve it, or send it back with a note', href: '/company/price-book', actorId: by })
}
export async function approvePriceBookItem(id: string): Promise<void> {
  const v = await assertRunsBook()
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur || cur.status !== 'proposed') return
  const now = new Date()
  await db.update(priceBookItems).set({ status: 'live', reviewedBy: v.id, reviewedAt: now, reviewNote: null, updatedAt: now, updatedBy: v.id }).where(eq(priceBookItems.id, id))
  await logBookChange(id, 'approved', v.id, null, null, now)
  const { notify } = await import('@/lib/notifications/emit')
  if (cur.createdBy) await notify('price_book_answered', [cur.createdBy], { title: `${await nameOf(v.id)} approved “${cur.name}” — it’s in My Items for the studio`, href: '/company/price-book', actorId: v.id })
  touch()
}
export async function sendBackPriceBookItem(id: string, note: string): Promise<void> {
  const v = await assertRunsBook()
  const text = note.trim().slice(0, 500)
  if (!text) throw new Error('a note is needed')
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur || cur.status !== 'proposed') return
  const now = new Date()
  await db.update(priceBookItems).set({ deletedAt: now, reviewedBy: v.id, reviewedAt: now, reviewNote: text, updatedBy: v.id }).where(eq(priceBookItems.id, id))
  await logBookChange(id, 'sent_back', v.id, null, text, now)
  const { notify } = await import('@/lib/notifications/emit')
  if (cur.createdBy) await notify('price_book_answered', [cur.createdBy], { title: `${await nameOf(v.id)} sent “${cur.name}” back`, body: text, href: '/company/price-book', actorId: v.id })
  touch()
}
/** The item's history, newest first — every member reads it. */
export async function listItemHistory(id: string): Promise<ItemChange[]> { return fetchItemHistory(id) }

/* ── sections ── */

/** The section's editor saves the whole body: its name, description and lines (with their sub-sections), reordered or trimmed. */
export type SectionInput = { name?: string; description?: string | null; /** (REG-653, Q-10) the note as it prints */ descriptionHtml?: string | null; body?: SavedSection; /** (REG-619, parity Q-27) */ propertyType?: string | null; tags?: string[] }
export async function updatePriceBookSection(id: string, input: SectionInput): Promise<PriceBookSection> {
  const v = await assertRunsBook(SECTION_RULE)
  const [cur] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  if (!cur) throw new Error('section not found')
  const body = input.body ? parseSavedSection(JSON.stringify(input.body)) : parseSavedSection(cur.linesJson)
  if (!body) throw new Error('section unreadable')
  const name = clean(input.name ?? cur.name) ?? cur.name
  /* (REG-653, Q-10 · E-68) The note is kept as it prints: a formatted note and its plain words change together. */
  const html = input.descriptionHtml !== undefined ? cleanHtml(input.descriptionHtml) : input.description !== undefined ? null : body.descriptionHtml
  const description = html ? clean(htmlToPlain(html), 2000) : input.description === undefined ? cur.description : clean(input.description, 2000)
  const next: SavedSection = { ...body, name, description, descriptionHtml: html, lines: body.lines.slice(0, 200), subs: body.subs.slice(0, 50).map((s) => ({ ...s, descriptionHtml: s.descriptionHtml ? cleanHtml(s.descriptionHtml) : null, lines: s.lines.slice(0, 200) })) }
  // (REG-619, parity Q-27) The property type is one of the leads' list (anything else reads as none); the tags are short words.
  const propertyType = input.propertyType === undefined ? cur.propertyType : input.propertyType && (PROPERTY_TYPES as readonly string[]).includes(input.propertyType) ? input.propertyType : null
  const tags = input.tags === undefined ? cur.tags : JSON.stringify(cleanSectionTags(input.tags))
  await db.update(priceBookSections).set({ name, description, linesJson: JSON.stringify(next), propertyType, tags, updatedAt: new Date(), updatedBy: v.id }).where(eq(priceBookSections.id, id))
  touch()
  const [r] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  return r!
}
export async function renamePriceBookSection(id: string, name: string): Promise<void> { await updatePriceBookSection(id, { name }) }
export async function duplicatePriceBookSection(id: string): Promise<string> {
  const v = await assertRunsBook(SECTION_RULE)
  const [cur] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  if (!cur) throw new Error('section not found')
  const body = parseSavedSection(cur.linesJson)
  if (!body) throw new Error('section unreadable')
  const now = new Date(), nid = randomUUID(), name = `${cur.name} (copy)`
  await db.insert(priceBookSections).values({ id: nid, name, description: cur.description, linesJson: JSON.stringify({ ...body, name }), propertyType: cur.propertyType, tags: cur.tags, createdAt: now, updatedAt: now, createdBy: v.id, updatedBy: v.id })
  touch()
  return nid
}
export async function deletePriceBookSections(ids: string[]): Promise<void> { await assertRunsBook(SECTION_RULE); if (ids.length) await db.update(priceBookSections).set({ deletedAt: new Date() }).where(inArray(priceBookSections.id, ids)); touch() }
export async function restorePriceBookSections(ids: string[]): Promise<void> { await assertRunsBook(SECTION_RULE); if (ids.length) await db.update(priceBookSections).set({ deletedAt: null }).where(inArray(priceBookSections.id, ids)); touch() }
export async function deletePriceBookSectionsForever(ids: string[]): Promise<void> {
  await assertRunsBook(SECTION_RULE)
  const used = await inUse(ids)   // (REG-653, Q-11) a section a live quote came from waits in the trash
  const gone = ids.filter((id) => !used.has(id))
  if (gone.length) await db.delete(priceBookSections).where(and(inArray(priceBookSections.id, gone), isNotNull(priceBookSections.deletedAt)))
  touch()
}
export async function emptyPriceBookSectionTrash(): Promise<void> {
  await assertRunsBook(SECTION_RULE)
  await deletePriceBookSectionsForever((await db.select({ id: priceBookSections.id }).from(priceBookSections).where(isNotNull(priceBookSections.deletedAt))).map((r) => r.id))
}

/** New section (REG-653, Q-10 · E-70): written on Save with what the editor holds — Cancel leaves nothing behind. The usual way in is a
    quote's "Save section to My Sections" (REG-566). */
export async function createPriceBookSection(input: SectionInput): Promise<string> {
  const v = await assertRunsBook(SECTION_RULE)
  const now = new Date(), id = randomUUID(), n = clean(input.name, 120) ?? 'New section'
  const blank: SavedSection = { name: n, description: null, descriptionHtml: null, lines: [], subs: [] }
  await db.insert(priceBookSections).values({ id, name: n, description: null, linesJson: JSON.stringify(input.body ? { ...input.body, name: n } : blank), createdAt: now, updatedAt: now, createdBy: v.id, updatedBy: v.id })
  await updatePriceBookSection(id, { ...input, name: n })
  return id
}
