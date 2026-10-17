'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { priceBookChanges, priceBookItems, priceBookSections, quoteItems, quotes, type PriceBookItem, type PriceBookSection } from '@/lib/db/schema'
import { cleanLink, cleanSectionTags, htmlToPlain, isItemKind, parseSavedSection, UNITS, type SavedSection } from '@/lib/quotes/items-model'
import { cleanRichHtml, cleanSectionHtml } from '@/lib/rich-html'   // (S44Q, triage §12.1) a section's every line through the allowlist too
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import type { PasteLine } from '@/lib/quotes/clipboard'
import { fetchViewer } from '@/lib/leads/visibility'
import { members } from '@/lib/db/schema'
import { BOOK_RULE, SECTION_RULE, itemChangeBlock, newItemStatus, runsBook } from '@/lib/company/price-book-rules'
import { diffItem, fetchItemHistory, logBookChange } from '@/lib/company/price-book-history'
import type { ItemChange } from '@/lib/company/price-book-changes'
import { refuse, type Refusal } from '@/lib/company/template-rules'
import { landingFolder } from '@/lib/company/folder-landing'
import { nameKey, spellVendor } from '@/lib/finance/model'   // (one-home N-16)
import { vendorDirectory } from '@/app/finance/read-actions'
import { cleanWaste } from '@/lib/company/price-book-waste'   // (pending modules S12)
import { bookItemFor, keptCostOfTrue, keptCostPatch, sectionFor, sectionWithKeptCosts, sightOf } from '@/lib/quotes/cost-sight'   // (pending modules S41b-1)
import { COST_HIDDEN, seesCost } from '@/lib/settings/cost-visibility'
import { workspaceRefusal, offWorkspace } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/* Company › Price book (REG-594): the studio's items and sections, edited outside any quote. Every write revalidates the page
   the quote editor reads from on its next load. Deletes are soft (REG-502's rule): a deleted entry leaves the Add Item popover
   and can be restored from Deleted Items / Deleted Sections; a line already on a quote keeps what it copied. */

const HERE = ['/company/price-book', '/company/price-book/sections']
const touch = () => { for (const p of HERE) revalidatePath(p); revalidatePath('/quotes', 'layout') }

/* (REG-652, price book parity Q-03 · Q-04) Owners and Admins change the book; a Designer proposes a new item and changes only their own
   proposal; My Sections are the Owners' and Admins'. Every change is kept in the item's history (Q-05). */
const who = async () => { const v = await fetchViewer(); return { id: v.id, role: v.role, costs: seesCost(v) } }   // (pending modules S41b-1) whether they see costs
/* (wave E, E7) Each action answers its rule as `{ error }` — a thrown rule reached the page redacted ("please try again"): the viewer,
   and why they may not (else null). */
async function runner(rule = BOOK_RULE) { const v = await who(); return { v, block: runsBook(v) ? null : rule } }
async function changer(ids: string[]) {
  const v = await who()
  if (runsBook(v)) return { v, block: null }
  const rows = ids.length ? await db.select({ status: priceBookItems.status, createdBy: priceBookItems.createdBy }).from(priceBookItems).where(inArray(priceBookItems.id, ids)) : []
  return { v, block: rows.some((r) => itemChangeBlock(v, r)) ? BOOK_RULE : null }
}
const GONE = 'That item is gone from the price book'
const SECTION_GONE = 'That section is gone from My Sections'
const nameOf = async (id: string | null) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)))[0]?.name ?? 'Someone' : 'Someone')
const clean = (v: string | null | undefined, max = 200) => { const s = (v ?? '').trim().slice(0, max); return s || null }
const minor = (v: number | undefined, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback)

export type PriceBookItemInput = { name: string; description?: string | null; kind?: string; unit?: string; costMinor?: number; markupMinor?: number; category?: string | null; vendor?: string | null
  /** (REG-653, price book parity Q-08) the formatted description (its plain text is `description`), a product or spec page, the photo */
  descriptionHtml?: string | null; link?: string | null; thumb?: string | null
  /** (pending modules S12 — 1.0's waste_percent) the share a purchase order made from the quote adds on top: 0–50 */ wastePct?: number }

/* (REG-653, Q-08) A formatted description goes through the house allowlist (the contracts' one); plain paragraphs need no HTML.
   A photo is the picture itself, downscaled in the browser (the brand kit's rule) — a data URL of an image, or a path the app serves. */
/* (S44P — her UAT ask 2026-10-15; S44Q's note for this package, M3) the words keep the shape the editor sent — paragraphs, blank lines and
   alignment too, not only lists and marks (the editor's own rule, `keptText`, decides what it sends) — through the one allowlist (S44Q,
   lib/rich-html.ts: capped before it is read, null when nothing is left) */
const cleanHtml = (v: string | null | undefined) => cleanRichHtml(v)
const cleanThumb = (v: string | null | undefined) => (typeof v === 'string' && (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 1_500_000 || /^\/[\w\-./]+\.(png|jpe?g|webp|gif|svg)$/i.test(v)) ? v : null)

const row = (id: string, i: PriceBookItemInput, now: Date, createdAt = now) => {
  const html = cleanHtml(i.descriptionHtml)
  return {
    id, name: clean(i.name) ?? 'Item', description: html ? clean(htmlToPlain(html), 2000) : clean(i.description, 2000), descriptionHtml: html, kind: isItemKind(i.kind) ? i.kind : 'purchase', unit: clean(i.unit, 40) ?? 'Pieces',
    costMinor: Math.max(0, minor(i.costMinor)), markupMinor: Math.max(-Math.max(0, minor(i.costMinor)), minor(i.markupMinor)), category: clean(i.category, 60), thumb: cleanThumb(i.thumb), vendor: clean(i.vendor, 80),
    link: cleanLink(i.link) ?? null, wastePct: cleanWaste(i.wastePct),
    createdAt, updatedAt: now, deletedAt: null as Date | null,
  }
}
/** (REG-653, price book parity Q-11) The entries a live quote came from — they wait in the trash, never deleted for good (the libraries' rule). */
async function inUse(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const rows = await db.selectDistinct({ id: quoteItems.priceBookItemId }).from(quoteItems).innerJoin(quotes, eq(quotes.id, quoteItems.quoteId)).where(and(inArray(quoteItems.priceBookItemId, ids), isNull(quotes.deletedAt)))
  return new Set(rows.map((r) => r.id).filter((x): x is string => !!x))
}

/** (Dane UAT 3.03) A new item lands in the folder that was open (`folderId`, inside the one object — the photo makes the input long), filed
    by the book's rule for its maker (lib/company/folder-landing.ts); `refused` says why it went to the top instead, for the snackbar. */
export async function createPriceBookItem(input: PriceBookItemInput & { folderId?: string | null }): Promise<PriceBookItem & { refused: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const v = await who()
  const now = new Date(), id = randomUUID()
  const status = newItemStatus(v)
  /* (pending modules S41b-1) a member who doesn't see costs gives a price only: it sits in the cost, with no mark-up — a price-only row's
     convention (the import's, the paste's) — until an Owner or an Admin who sees costs sets them */
  if (!v.costs) input = { ...input, costMinor: Math.max(0, (input.costMinor ?? 0) + (input.markupMinor ?? 0)), markupMinor: 0 }
  const landed = await landingFolder('book-items', input.folderId, itemChangeBlock(v, { status, createdBy: v.id }))
  await db.insert(priceBookItems).values({ ...row(id, input, now), status, createdBy: v.id, updatedBy: v.id, folderId: landed.folderId })
  await logBookChange(id, 'created', v.id, null, null, now)
  if (status === 'proposed') await proposeNotice(id, v.id)
  touch()
  const [r] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return { ...bookItemFor(r!, sightOf(v)), refused: landed.refused }   // (pending modules S41b-1)
}

export async function updatePriceBookItem(id: string, patch: Partial<PriceBookItemInput>, note?: string | null): Promise<PriceBookItem | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur) return refuse(GONE)
  const v = await who()
  const block = itemChangeBlock(v, cur)
  if (block) return refuse(block)
  return bookItemFor(await writeItem(cur, patch, note ?? null, v), sightOf(v))   // (pending modules S41b-1)
}
/** The edit itself, once the rule has let it through (import, bulk changes and their Undo check the rule once for every item). `logged`
    collects the History row it wrote (UX audit S7: an import's Undo puts those changes back). */
async function writeItem(cur: PriceBookItem, patch: Partial<PriceBookItemInput>, note: string | null, v: { id: string | null; costs?: boolean }, logged?: string[], values: 'sent' | 'stored' = 'sent'): Promise<PriceBookItem> {
  const id = cur.id
  /* (pending modules S41b-1 — 1.0: "cost / markup changes dropped; markup re-derived when the sell price changes") a member who doesn't see
     costs moves only the price: what their browser sent (cost folded into the mark-up), or what a History entry held (`stored`), is read as the
     unit price, the stored cost stays, the mark-up takes the difference */
  if (v.costs === false) {
    const { costMinor: c, markupMinor: m, ...rest } = patch
    patch = { ...rest, ...(values === 'stored' ? keptCostOfTrue(cur, { costMinor: c, markupMinor: m }) : keptCostPatch(cur, { costMinor: c, markupMinor: m })) }
  }
  const keep = <K extends keyof PriceBookItemInput>(k: K, fallback: PriceBookItemInput[K]) => (patch[k] === undefined ? fallback : patch[k])
  /* a new plain description without its formatted copy drops the old formatting — the plain words are what was typed */
  const html = patch.descriptionHtml !== undefined ? patch.descriptionHtml : patch.description !== undefined ? null : cur.descriptionHtml
  const next = row(id, { name: patch.name ?? cur.name, description: keep('description', cur.description), descriptionHtml: html, kind: patch.kind ?? cur.kind, unit: patch.unit ?? cur.unit, costMinor: patch.costMinor ?? cur.costMinor, markupMinor: patch.markupMinor ?? cur.markupMinor, category: keep('category', cur.category), vendor: keep('vendor', cur.vendor), link: keep('link', cur.link), thumb: keep('thumb', cur.thumb), wastePct: patch.wastePct ?? cur.wastePct }, new Date(), cur.createdAt)
  await db.update(priceBookItems).set({ name: next.name, description: next.description, descriptionHtml: next.descriptionHtml, kind: next.kind, unit: next.unit, costMinor: next.costMinor, markupMinor: next.markupMinor, category: next.category, vendor: next.vendor, link: next.link, thumb: next.thumb, wastePct: next.wastePct, updatedAt: next.updatedAt, updatedBy: v.id }).where(eq(priceBookItems.id, id))
  const changeId = await logBookChange(id, 'edited', v.id, diffItem(cur, next), note, next.updatedAt)
  if (changeId && logged) logged.push(changeId)
  touch()
  const [r] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  return r!
}

/** (Dane UAT 3.10) History › Bring back: the values one History entry changed go back to what they were before it, through the item's own
    write (the book's rule, a Designer's own proposal, a History row of its own noted "Brought back"). Answers the item and that new row,
    whose own Bring back is the Undo. */
export async function bringBackPriceBookItem(id: string, changeId: string, note: 'Brought back' | 'Undo' = 'Brought back'): Promise<{ item: PriceBookItem; changeId: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur) return refuse(GONE)
  const v = await who()
  const block = itemChangeBlock(v, cur)
  if (block) return refuse(block)
  const [log] = await db.select().from(priceBookChanges).where(and(eq(priceBookChanges.id, changeId), eq(priceBookChanges.itemId, id)))
  if (!log) return refuse('That change is gone from the item’s History')
  let diff: Record<string, [unknown, unknown]> = {}
  try { diff = log.changes ? JSON.parse(log.changes) as Record<string, [unknown, unknown]> : {} } catch { diff = {} }
  const back: Record<string, unknown> = {}
  for (const [field, [before]] of Object.entries(diff)) back[field] = before ?? null
  if (!Object.keys(back).length) return refuse('That entry changed no values')
  const logged: string[] = []
  const item = await writeItem(cur, back as Partial<PriceBookItemInput>, note === 'Undo' ? 'Undo' : 'Brought back', v, logged, 'stored')
  return { item: bookItemFor(item, sightOf(v)), changeId: logged[0] ?? null }   // (pending modules S41b-1)
}

export async function renamePriceBookItem(id: string, name: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
   const r = await updatePriceBookItem(id, { name }); if ('error' in r) return r }

export async function duplicatePriceBookItem(id: string): Promise<string | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await runner(); if (block) return refuse(block)
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur) return refuse(GONE)
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
export type ImportBatch = { added: string[]; changes: string[] }
export async function importPriceBookItems(lines: PasteLine[], vendor?: string | null, onMatch: 'update' | 'new' | 'skip' = 'update', defaultKind?: string | null): Promise<{ added: number; updated: number; skipped: number; batch: ImportBatch; touched: string[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await runner(); if (block) return refuse(block)
  const now = new Date()
  /* (one-home N-16) the same item = the same name from the same vendor by the directory's rule (case, spaces and "Pte Ltd" aside — F1's
     nameKey), and a new row names its vendor as the directory spells it */
  const key = (name: string, ven: string | null | undefined) => `${name.trim().toLowerCase()}|${nameKey(ven ?? '')}`
  const directory = await vendorDirectory()
  const inBook = await db.select().from(priceBookItems).where(isNull(priceBookItems.deletedAt))
  const shelf = new Map<string, PriceBookItem>()
  for (const it of inBook) if (it.status === 'live' && !shelf.has(key(it.name, it.vendor))) shelf.set(key(it.name, it.vendor), it)
  /* (Dane UAT 3.11 · 3.12) A row that matches an item waiting for approval is skipped — never imported, never live: an import would have
     made a live copy of a proposal, round its approval (REG-652). */
  const waiting = new Set(inBook.filter((it) => it.status === 'proposed').map((it) => key(it.name, it.vendor)))
  const seen = new Set<string>()
  let skipped = 0, updated = 0
  const studioUnits = (await (await import('@/lib/settings/queries')).fetchUnits()).units   // (S44I — M9)
  const fresh: ReturnType<typeof row>[] = []
  /* (UX audit S7) What this import did, for its Undo — the rows it added and the History rows its updates wrote — and every item it touched
     (the list's "just imported" chip). A row without a Kind takes the one the member picked for the file (default Purchase). */
  const changes: string[] = [], updatedIds: string[] = []
  const kindFor = (k: string | undefined) => k ?? (isItemKind(defaultKind) ? defaultKind : 'purchase')
  for (const [i, l] of lines.filter((x) => x.name.trim()).slice(0, 500).entries()) {
    const ven = spellVendor(directory, l.vendor?.trim().slice(0, 80) || vendor || null)   // (REG-623) a mapped Vendor column wins over the one typed for all · (one-home N-16) spelt as the directory spells it
    const k = key(l.name, ven)
    if (seen.has(k)) { skipped++; continue }
    seen.add(k)
    const unit = l.unit ? ([...studioUnits, ...UNITS].find((u) => u.toLowerCase() === l.unit!.toLowerCase()) ?? l.unit) : undefined   // (S44I — M9) the studio's spelling
    const hit = shelf.get(k)
    if (!hit && waiting.has(k)) { skipped++; continue }
    if (hit && onMatch === 'skip') { skipped++; continue }
    if (hit && onMatch === 'update') {
      await writeItem(hit, { ...(l.costMinor !== undefined ? { costMinor: l.costMinor } : {}), ...(l.markupMinor !== undefined ? { markupMinor: l.markupMinor } : {}), ...(unit ? { unit } : {}), ...(l.description ? { description: l.description } : {}), ...(l.category ? { category: l.category } : {}), ...(l.kind ? { kind: l.kind } : {}), ...(l.link ? { link: l.link } : {}), ...(l.wastePct !== undefined ? { wastePct: l.wastePct } : {}) }, 'Imported', v, changes)
      updatedIds.push(hit.id)
      updated++
      continue
    }
    /* (pending modules S41b-1) a member who doesn't see costs imports prices only — each new row's price sits in its cost (the price-only convention) */
    const price = v.costs ? null : Math.max(0, (l.costMinor ?? 0) + (l.markupMinor ?? 0))
    fresh.push(row(randomUUID(), { name: l.name, description: l.description ?? null, kind: kindFor(l.kind), unit: unit ?? 'Pieces', costMinor: price ?? l.costMinor ?? 0, markupMinor: price === null ? l.markupMinor ?? 0 : 0, category: l.category ?? null, vendor: ven, link: l.link ?? null, wastePct: l.wastePct ?? 0 }, new Date(now.getTime() + i)))
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
  return { added: rows.length, updated, skipped, batch: { added: rows.map((r) => r.id), changes }, touched: [...rows.map((r) => r.id), ...updatedIds] }
}

/** (UX audit S7) An import's Undo: the items it added leave the book (for good — nothing quotes them yet; one a quote took meanwhile goes to
    Deleted Items instead), and every item it updated takes back the values its History row says it had, field by field, where nothing has
    changed them since (History keeps both steps). Owners and Admins, as the import. */
export async function undoPriceBookImport(batch: ImportBatch): Promise<{ removed: number; restored: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await runner(); if (block) return refuse(block)
  const added = (batch?.added ?? []).filter((x): x is string => typeof x === 'string').slice(0, 1000)
  const changeIds = (batch?.changes ?? []).filter((x): x is string => typeof x === 'string').slice(0, 1000)
  let removed = 0, restored = 0
  if (added.length) {
    const used = await inUse(added)
    const gone = added.filter((id) => !used.has(id)), kept = added.filter((id) => used.has(id))
    if (gone.length) {
      await db.delete(priceBookChanges).where(inArray(priceBookChanges.itemId, gone))
      await db.delete(priceBookItems).where(inArray(priceBookItems.id, gone))
    }
    if (kept.length) {
      const now = new Date()
      await db.update(priceBookItems).set({ deletedAt: now, updatedAt: now, updatedBy: v.id }).where(inArray(priceBookItems.id, kept))
      for (const id of kept) await logBookChange(id, 'deleted', v.id, null, 'Import undone', now)
    }
    removed = added.length
  }
  if (changeIds.length) {
    const logs = await db.select().from(priceBookChanges).where(inArray(priceBookChanges.id, changeIds))
    for (const log of logs) {
      const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, log.itemId))
      if (!cur || cur.deletedAt) continue
      let diff: Record<string, [unknown, unknown]> = {}
      try { diff = log.changes ? JSON.parse(log.changes) as Record<string, [unknown, unknown]> : {} } catch { diff = {} }
      const back: Record<string, unknown> = {}
      for (const [field, [before, after]] of Object.entries(diff)) if (((cur as Record<string, unknown>)[field] ?? null) === (after ?? null)) back[field] = before
      if (!Object.keys(back).length) continue
      await writeItem(cur, back as Partial<PriceBookItemInput>, 'Import undone', v, undefined, 'stored')
      restored++
    }
  }
  touch()
  return { removed, restored }
}

/** (REG-653, price book parity Q-15) The list's bulk changes: a category, a vendor, or a markup as a share of each item's cost (the item is
    re-priced — 1.0's vendor markup, without its bug of storing a markup nothing read). Owners and Admins; each change kept in History. */
export async function bulkUpdatePriceBookItems(ids: string[], change: { category?: string | null; vendor?: string | null; markupPct?: number }): Promise<number | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await runner(); if (block) return refuse(block)
  if (!ids.length) return 0
  /* (pending modules S12 — card held:price-book, "Bulk Set vendor … free text, not Finance › Vendors · revisit (one vendor list, N-16)") the
     vendor set on many items is spelt as Company › Finance › Vendors spells it — the item dialog's and the import's rule */
  if (typeof change.vendor === 'string') change = { ...change, vendor: spellVendor(await vendorDirectory(), change.vendor.trim().slice(0, 80)) }
  const items = await db.select().from(priceBookItems).where(and(inArray(priceBookItems.id, ids), isNull(priceBookItems.deletedAt)))
  const pct = typeof change.markupPct === 'number' && Number.isFinite(change.markupPct) ? Math.min(1000, Math.max(-100, change.markupPct)) : null
  if (pct !== null && !v.costs) return refuse(COST_HIDDEN)   // (pending modules S41b-1) a markup is a share of the cost
  for (const it of items) {
    const patch: Partial<PriceBookItemInput> = {}
    if (change.category !== undefined) patch.category = change.category
    if (change.vendor !== undefined) patch.vendor = change.vendor
    if (pct !== null) patch.markupMinor = Math.round(it.costMinor * pct / 100)
    await writeItem(it, patch, 'Bulk change', v)
  }
  return items.length
}

/** (sweep S5 #11) A bulk change's Undo: the one field it changed, put back on each item as it was (History keeps both steps). */
export async function undoBulkPriceBook(prev: { id: string; category?: string | null; vendor?: string | null; markupMinor?: number }[]): Promise<number | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await runner(); if (block) return refuse(block)
  let n = 0
  for (const p of prev.slice(0, 1000)) {
    const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, p.id))
    if (!cur) continue   // deleted for good since — nothing to put back
    const patch: Partial<PriceBookItemInput> = {}
    if (p.category !== undefined) patch.category = p.category
    if (p.vendor !== undefined) patch.vendor = p.vendor
    if (typeof p.markupMinor === 'number') patch.markupMinor = p.markupMinor
    await writeItem(cur, patch, 'Undo', v); n++
  }
  return n
}

/** Delete · restore: an Owner or an Admin — or a Designer withdrawing their own proposal. */
export async function deletePriceBookItems(ids: string[]): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await changer(ids); if (block) return refuse(block)
  if (ids.length) { const now = new Date(); await db.update(priceBookItems).set({ deletedAt: now, updatedBy: v.id }).where(inArray(priceBookItems.id, ids)); for (const id of ids) await logBookChange(id, 'deleted', v.id, null, null, now) }
  touch()
}
export async function restorePriceBookItems(ids: string[]): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await changer(ids); if (block) return refuse(block)
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
export async function deletePriceBookItemsForever(ids: string[]): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { block } = await runner(); if (block) return refuse(block)
  const used = await inUse(ids)
  const gone = ids.filter((id) => !used.has(id))
  if (gone.length) { await db.delete(priceBookItems).where(and(inArray(priceBookItems.id, gone), isNotNull(priceBookItems.deletedAt))); await db.delete(priceBookChanges).where(inArray(priceBookChanges.itemId, gone)) }
  touch()
  return { removed: gone.length, kept: ids.length - gone.length }   // (wave E, E7) the sheet's line reads what stayed (a live quote came from it)
}
export async function emptyPriceBookItemTrash(): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { block } = await runner(); if (block) return refuse(block)
  const trash = (await db.select({ id: priceBookItems.id }).from(priceBookItems).where(isNotNull(priceBookItems.deletedAt))).map((r) => r.id)
  return deletePriceBookItemsForever(trash)
}

/* ── (REG-652, price book parity Q-04) Proposals: an Owner or an Admin approves one, or sends it back with a note ── */
async function proposeNotice(itemId: string, by: string | null) {
  const { notify } = await import('@/lib/notifications/emit')
  const { studioRunnerIds } = await import('@/lib/notifications/queries')
  const [it] = await db.select({ name: priceBookItems.name }).from(priceBookItems).where(eq(priceBookItems.id, itemId))
  await notify('price_book_proposed', await studioRunnerIds(), { title: `${await nameOf(by)} proposed “${it?.name ?? 'an item'}” for My Items`, body: 'Approve it, or send it back with a note', href: `/company/price-book?open=${encodeURIComponent(itemId)}`, actorId: by })   // (UX audit V11) the item itself, not the grid (REG-709's ?open=)
}
export async function approvePriceBookItem(id: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await runner(); if (block) return refuse(block)
  const [cur] = await db.select().from(priceBookItems).where(eq(priceBookItems.id, id))
  if (!cur || cur.status !== 'proposed') return
  const now = new Date()
  await db.update(priceBookItems).set({ status: 'live', reviewedBy: v.id, reviewedAt: now, reviewNote: null, updatedAt: now, updatedBy: v.id }).where(eq(priceBookItems.id, id))
  await logBookChange(id, 'approved', v.id, null, null, now)
  const { notify } = await import('@/lib/notifications/emit')
  if (cur.createdBy) await notify('price_book_answered', [cur.createdBy], { title: `${await nameOf(v.id)} approved “${cur.name}” — it’s in My Items for the studio`, href: `/company/price-book?open=${encodeURIComponent(cur.id)}`, actorId: v.id })   // (UX audit V11) the item itself
  touch()
}
export async function sendBackPriceBookItem(id: string, note: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const { v, block } = await runner(); if (block) return refuse(block)
  const text = note.trim().slice(0, 500)
  if (!text) return refuse('Say what to change — a note goes back with it')
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
export async function listItemHistory(id: string): Promise<ItemChange[]> {
  if (await offWorkspace()) return []   // (S45C) the workspace's role rule: Marketing reads nothing here
   return fetchItemHistory(id, sightOf(await fetchViewer())) }   // (pending modules S41b-1) a price, never a cost, for a member who doesn't see costs

/* ── sections ── */

/** The section's editor saves the whole body: its name, description and lines (with their sub-sections), reordered or trimmed. */
export type SectionInput = { name?: string; description?: string | null; /** (REG-653, Q-10) the note as it prints */ descriptionHtml?: string | null; body?: SavedSection; /** (REG-619, parity Q-27) */ propertyType?: string | null; tags?: string[] }
export async function updatePriceBookSection(id: string, input: SectionInput): Promise<PriceBookSection | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  { const lock = await requirePlan('package_creation'); if (lock) return lock }   // (pending modules S19) My Sections are Pro
  const { v, block } = await runner(SECTION_RULE); if (block) return refuse(block)
  const [cur] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  if (!cur) return refuse(SECTION_GONE)
  const sent = input.body ? parseSavedSection(JSON.stringify(input.body)) : null
  /* (pending modules S41b-1 — 1.0's mergeStoredPackageCost) a body from a member who doesn't see costs (or a rebate from anyone but an Owner)
     keeps each stored line's cost and rebate — matched by its My Items entry, then its name and category; a new line linked to My Items takes
     that item's cost */
  const sight = sightOf(await fetchViewer())
  const linked = sent && !sight.costs ? [...new Set([...sent.lines, ...sent.subs.flatMap((g) => g.lines)].map((l) => l.priceBookItemId).filter((x): x is string => !!x))] : []
  const bookRows = linked.length ? await db.select({ id: priceBookItems.id, costMinor: priceBookItems.costMinor, markupMinor: priceBookItems.markupMinor }).from(priceBookItems).where(inArray(priceBookItems.id, linked)) : []
  const body = sent ? sectionWithKeptCosts(sent, parseSavedSection(cur.linesJson), sight, (bid) => bookRows.find((b) => b.id === bid) ?? null) : parseSavedSection(cur.linesJson)
  if (!body) throw new Error('section unreadable')
  const name = clean(input.name ?? cur.name) ?? cur.name
  /* (REG-653, Q-10 · E-68) The note is kept as it prints: a formatted note and its plain words change together. */
  const html = input.descriptionHtml !== undefined ? cleanHtml(input.descriptionHtml) : input.description !== undefined ? null : body.descriptionHtml
  const description = html ? clean(htmlToPlain(html), 2000) : input.description === undefined ? cur.description : clean(input.description, 2000)
  const next: SavedSection = cleanSectionHtml({ ...body, name, description, descriptionHtml: html, lines: body.lines.slice(0, 200), subs: body.subs.slice(0, 50).map((s) => ({ ...s, descriptionHtml: s.descriptionHtml ? cleanHtml(s.descriptionHtml) : null, lines: s.lines.slice(0, 200) })) })   // (S44Q) its lines' words were stored as sent
  // (REG-619, parity Q-27) The property type is one of the leads' list (anything else reads as none); the tags are short words.
  const propertyType = input.propertyType === undefined ? cur.propertyType : input.propertyType && (PROPERTY_TYPES as readonly string[]).includes(input.propertyType) ? input.propertyType : null
  const tags = input.tags === undefined ? cur.tags : JSON.stringify(cleanSectionTags(input.tags))
  await db.update(priceBookSections).set({ name, description, linesJson: JSON.stringify(next), propertyType, tags, updatedAt: new Date(), updatedBy: v.id }).where(eq(priceBookSections.id, id))
  touch()
  const [r] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  return sectionFor(r!, sight, parseSavedSection)   // (pending modules S41b-1)
}
export async function renamePriceBookSection(id: string, name: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
   const r = await updatePriceBookSection(id, { name }); if ('error' in r) return r }
export async function duplicatePriceBookSection(id: string): Promise<string | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  { const lock = await requirePlan('package_creation'); if (lock) return lock }   // (pending modules S19) My Sections are Pro
  const { v, block } = await runner(SECTION_RULE); if (block) return refuse(block)
  const [cur] = await db.select().from(priceBookSections).where(eq(priceBookSections.id, id))
  if (!cur) return refuse(SECTION_GONE)
  const body = parseSavedSection(cur.linesJson)
  if (!body) throw new Error('section unreadable')
  const now = new Date(), nid = randomUUID(), name = `${cur.name} (copy)`
  await db.insert(priceBookSections).values({ id: nid, name, description: cur.description, linesJson: JSON.stringify({ ...body, name }), propertyType: cur.propertyType, tags: cur.tags, createdAt: now, updatedAt: now, createdBy: v.id, updatedBy: v.id })
  touch()
  return nid
}
export async function deletePriceBookSections(ids: string[]): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
   { const lock = await requirePlan('package_creation'); if (lock) return lock } const { block } = await runner(SECTION_RULE); if (block) return refuse(block); if (ids.length) await db.update(priceBookSections).set({ deletedAt: new Date() }).where(inArray(priceBookSections.id, ids)); touch() }
export async function restorePriceBookSections(ids: string[]): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
   { const lock = await requirePlan('package_creation'); if (lock) return lock } const { block } = await runner(SECTION_RULE); if (block) return refuse(block); if (ids.length) await db.update(priceBookSections).set({ deletedAt: null }).where(inArray(priceBookSections.id, ids)); touch() }
export async function deletePriceBookSectionsForever(ids: string[]): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  { const lock = await requirePlan('package_creation'); if (lock) return lock }   // (pending modules S19) My Sections are Pro
  const { block } = await runner(SECTION_RULE); if (block) return refuse(block)
  const used = await inUse(ids)   // (REG-653, Q-11) a section a live quote came from waits in the trash
  const gone = ids.filter((id) => !used.has(id))
  if (gone.length) await db.delete(priceBookSections).where(and(inArray(priceBookSections.id, gone), isNotNull(priceBookSections.deletedAt)))
  touch()
  return { removed: gone.length, kept: ids.length - gone.length }
}
export async function emptyPriceBookSectionTrash(): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  { const lock = await requirePlan('package_creation'); if (lock) return lock }   // (pending modules S19) My Sections are Pro
  const { block } = await runner(SECTION_RULE); if (block) return refuse(block)
  return deletePriceBookSectionsForever((await db.select({ id: priceBookSections.id }).from(priceBookSections).where(isNotNull(priceBookSections.deletedAt))).map((r) => r.id))
}

/** New section (REG-653, Q-10 · E-70): written on Save with what the editor holds — Cancel leaves nothing behind. The usual way in is a
    quote's "Save section to My Sections" (REG-566). */
export async function createPriceBookSection(input: SectionInput & { /** (Dane UAT 3.03) the folder open in My Sections */ folderId?: string | null }): Promise<{ id: string; folderId: string | null; refused: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  { const lock = await requirePlan('package_creation'); if (lock) return lock }   // (pending modules S19) My Sections are Pro
  const { v, block } = await runner(SECTION_RULE); if (block) return refuse(block)
  const now = new Date(), id = randomUUID(), n = clean(input.name, 120) ?? 'New section'
  const blank: SavedSection = { name: n, description: null, descriptionHtml: null, lines: [], subs: [] }
  /* (Dane UAT 3.03) made inside a folder of My Sections, it is filed there — whoever saves sections may file them */
  const { folderId: asked, ...fields } = input
  const landed = await landingFolder('book-sections', asked, null)
  /* (pending modules S41b-1) for a member who doesn't see costs the body is written by the update below, which gives its lines their costs */
  await db.insert(priceBookSections).values({ id, name: n, description: null, linesJson: JSON.stringify(input.body && v.costs ? cleanSectionHtml(parseSavedSection(JSON.stringify({ ...input.body, name: n })) ?? blank) : blank), createdAt: now, updatedAt: now, createdBy: v.id, updatedBy: v.id, folderId: landed.folderId })
  await updatePriceBookSection(id, { ...fields, name: n })
  return { id, folderId: landed.folderId, refused: landed.refused }
}
