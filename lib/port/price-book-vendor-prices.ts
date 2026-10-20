import { createHash } from 'node:crypto'

/**
 * (S45C — S43D's note to the developers, 1.0's newer branch `deployment/qanvast` 340cbc74f; as recommended — his ask 2026-10-17) THE PORT OF
 * 1.0's PER-VENDOR PRICES. Pure: no database, no clock — a port script reads 1.0's rows, calls this, and writes what it answers.
 *
 * 1.0 (migration 425, `price_book_vendor_prices`): one price-book item links several vendors (`vendor_ids`, else `vendor_id`), and each linked
 * vendor may carry its own cost and its own sell price; a blank side is the item's base price (`resolveVendorPricing`,
 * src/lib/price-book-vendor-pricing.ts). 2.0 already holds the same product from two vendors as two Price book entries, each with its own cost
 * and mark-up (REG-594 · D-158), the vendor picked from Company › Finance › Vendors (one-home N-16). So:
 *
 *   · a 1.0 item with N vendors becomes N entries — one per vendor — keeping its name, unit and category; each entry's cost and sell are that
 *     vendor's own (its blank side the item's base), as cost + mark-up in cents (map 14 D-152: cost = round(C × 100), mark-up = round(S × 100) −
 *     cost; a sell with no cost costs the sell — no mark-up, logged; round half away from zero, D-155);
 *   · the vendor is the Finance › Vendors entry the port's `vendorFor` answers for 1.0's vendor id (after the vendors' own port, merges
 *     followed); a vendor the directory doesn't know lands with no vendor and a note — never a made-up name;
 *   · the first vendor's entry keeps the 1.0 item's id (quote lines and saved sections point at it); the k-th gets an id derived from
 *     (item, vendor), so a second run writes the same rows (`INSERT OR IGNORE`, D-150);
 *   · two 1.0 vendors that are one Finance › Vendors entry (a merge) make one entry: the kept vendor's own price if it had one (1.0's
 *     `repointVendorPrices`), else the first price found — the other is noted;
 *   · a vendor price for a vendor no longer linked to the item still lands as that vendor's entry (nothing priced is lost) — noted;
 *   · an item with no vendor at all is one entry with no vendor, at its base price.
 *
 * Everything else an item carries (kind, description, link, picture, status, who made it, its folder) is the item's own port (map 14 §4 step 2)
 * and is copied onto each of its entries by the caller.
 */

/** A 1.0 price-book item, as the port reads it (`studio_price_book`): the category already joined to its name (map 14 D-84). */
export type V1PriceBookItem = {
  id: string
  name: string
  unit: string | null
  /** dollars; NUMERIC comes as a number or a string */
  unit_price: number | string | null
  cost_price: number | string | null
  category: string | null
  vendor_id: string | null
  vendor_ids: readonly string[] | null
}

/** A row of 1.0's `price_book_vendor_prices` (migration 425): a blank side is the item's base price. */
export type V1VendorPrice = {
  price_book_item_id: string
  vendor_id: string
  cost_price: number | string | null
  unit_price: number | string | null
}

/** A Company › Finance › Vendors entry, as the vendors' port left it. */
export type PortVendor = { id: string; name: string }

/** One 2.0 Price book entry's vendor-split columns (`price_book_items`). */
export type VendorEntry = {
  id: string
  /** the 1.0 item it came from, and the 1.0 vendor (null: no vendor) */
  sourceItemId: string
  sourceVendorId: string | null
  name: string
  unit: string
  category: string | null
  /** the Finance › Vendors name (`price_book_items.vendor`), null when none */
  vendor: string | null
  vendorId: string | null
  costMinor: number
  markupMinor: number
  /** `vendor` — at least one side came from the vendor's own price; `base` — the item's base price */
  priced: 'vendor' | 'base'
}

export type PortNoteKind =
  | 'sell-no-cost'               // a sell with no cost: the cost is the sell, no mark-up (D-153 (a))
  | 'no-price'                   // neither a sell nor a cost: 0 + 0 (D-153)
  | 'cost-no-sell'               // a cost with no sell: priced at its cost, no mark-up
  | 'rounded'                    // a figure had more than two decimals (D-155)
  | 'vendor-not-in-directory'    // 1.0's vendor isn't in Finance › Vendors: the entry has no vendor
  | 'price-for-unlinked-vendor'  // a vendor price for a vendor the item no longer links: kept as its entry
  | 'same-vendor-twice'          // two 1.0 vendors are one Finance › Vendors entry: one entry kept
  | 'orphan-price'               // a vendor price whose item isn't in the port

export type PortNote = { kind: PortNoteKind; itemId: string; vendorId: string | null }

/** The unit 2.0 gives an item with none (the schema's default). */
export const DEFAULT_UNIT = 'Pieces'

/** A 1.0 money figure (dollars) as a number, or null when blank. */
export function dollarsOf(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return typeof v === 'string' && !String(v).trim() ? null : Number.isFinite(n) ? n : null
}

/** Dollars → cents, half away from zero (D-155). */
export function minorOf(dollars: number): number {
  const c = dollars * 100
  return Math.sign(c) * Math.round(Math.abs(c) + 1e-9)
}

const hasSubCent = (d: number | null) => d !== null && Math.abs(d * 100 - Math.round(d * 100)) > 1e-6

/** A sell and a cost (dollars, either blank) as 2.0's cost + mark-up in cents (D-152 · D-153), with what the port log should say. */
export function pricePair(sell: number | null, cost: number | null): { costMinor: number; markupMinor: number; notes: PortNoteKind[] } {
  const notes: PortNoteKind[] = []
  if (hasSubCent(sell) || hasSubCent(cost)) notes.push('rounded')
  if (cost === null && sell === null) return { costMinor: 0, markupMinor: 0, notes: [...notes, 'no-price'] }
  if (cost === null) return { costMinor: minorOf(sell!), markupMinor: 0, notes: [...notes, 'sell-no-cost'] }
  const costMinor = minorOf(cost)
  if (sell === null) return { costMinor, markupMinor: 0, notes: [...notes, 'cost-no-sell'] }   // priced at its cost — never a sell made up
  return { costMinor, markupMinor: Math.max(-costMinor, minorOf(sell) - costMinor), notes }
}

/** The id of the k-th vendor's entry (k ≥ 2): a UUID derived from (item, vendor), the same on every run (D-150). */
export function entryIdFor(itemId: string, vendorId: string): string {
  const h = createHash('sha1').update(`openmaison:price-book-vendor:${itemId}:${vendorId}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`
}

/** The item's vendors in 1.0's own order (`vendorsOfItem`): `vendor_ids`, else `vendor_id`, else none. */
export function linkedVendorIds(item: Pick<V1PriceBookItem, 'vendor_id' | 'vendor_ids'>): string[] {
  const ids = item.vendor_ids && item.vendor_ids.length ? item.vendor_ids : item.vendor_id ? [item.vendor_id] : []
  return [...new Set(ids.filter((x) => typeof x === 'string' && x))]
}

/** One 1.0 item → its 2.0 entries, one per vendor, each at that vendor's own price. */
export function vendorEntries(item: V1PriceBookItem, prices: readonly V1VendorPrice[], vendorFor: (v1VendorId: string) => PortVendor | null): { entries: VendorEntry[]; notes: PortNote[] } {
  const notes: PortNote[] = []
  const note = (kind: PortNoteKind, vendorId: string | null) => notes.push({ kind, itemId: item.id, vendorId })
  const own = prices.filter((p) => p.price_book_item_id === item.id)
  const priceOf = new Map(own.map((p) => [p.vendor_id, p]))
  const linked = linkedVendorIds(item)
  for (const p of own) if (!linked.includes(p.vendor_id)) note('price-for-unlinked-vendor', p.vendor_id)
  const order = [...linked, ...own.map((p) => p.vendor_id).filter((v, i, a) => !linked.includes(v) && a.indexOf(v) === i)]
  const baseSell = dollarsOf(item.unit_price), baseCost = dollarsOf(item.cost_price)
  const unit = item.unit?.trim() || DEFAULT_UNIT
  const make = (id: string, vendorId: string | null, v: PortVendor | null): VendorEntry => {
    const vp = vendorId ? priceOf.get(vendorId) : undefined
    const vSell = dollarsOf(vp?.unit_price), vCost = dollarsOf(vp?.cost_price)
    const fromVendor = vSell !== null || vCost !== null
    const pair = pricePair(vSell ?? baseSell, vCost ?? baseCost)
    for (const k of pair.notes) note(k, vendorId)
    return { id, sourceItemId: item.id, sourceVendorId: vendorId, name: item.name, unit, category: item.category, vendor: v ? v.name.trim().slice(0, 80) : null, vendorId: v?.id ?? null,
      costMinor: pair.costMinor, markupMinor: pair.markupMinor, priced: fromVendor ? 'vendor' : 'base' }
  }
  if (!order.length) return { entries: [make(item.id, null, null)], notes }

  /* one entry per Finance › Vendors entry: 1.0 vendors merged into one keep one — the kept vendor's own price first, then the first priced */
  const groups = new Map<string, { vendor: PortVendor | null; ids: string[] }>()
  for (const vid of order) {
    const v = vendorFor(vid)
    if (!v) note('vendor-not-in-directory', vid)
    const key = v ? `v:${v.id}` : 'none'
    const g = groups.get(key)
    if (g) g.ids.push(vid); else groups.set(key, { vendor: v, ids: [vid] })
  }
  const entries: VendorEntry[] = []
  for (const g of groups.values()) {
    const priced = (vid: string) => { const p = priceOf.get(vid); return !!p && (dollarsOf(p.unit_price) !== null || dollarsOf(p.cost_price) !== null) }
    const pick = g.ids.find((vid) => g.vendor && vid === g.vendor.id && priced(vid)) ?? g.ids.find(priced) ?? g.ids[0]!
    for (const vid of g.ids) if (vid !== pick) note('same-vendor-twice', vid)
    entries.push(make(entries.length === 0 ? item.id : entryIdFor(item.id, pick), pick, g.vendor))
  }
  return { entries, notes }
}

/** Every item of a studio's book → its entries; a vendor price whose item isn't in the port is noted, never written. */
export function portVendorPrices(items: readonly V1PriceBookItem[], prices: readonly V1VendorPrice[], vendorFor: (v1VendorId: string) => PortVendor | null): { entries: VendorEntry[]; notes: PortNote[] } {
  const byItem = new Map<string, V1VendorPrice[]>()
  for (const p of prices) { const l = byItem.get(p.price_book_item_id); if (l) l.push(p); else byItem.set(p.price_book_item_id, [p]) }
  const known = new Set(items.map((i) => i.id))
  const out = { entries: [] as VendorEntry[], notes: [] as PortNote[] }
  for (const p of prices) if (!known.has(p.price_book_item_id)) out.notes.push({ kind: 'orphan-price', itemId: p.price_book_item_id, vendorId: p.vendor_id })
  for (const item of items) { const r = vendorEntries(item, byItem.get(item.id) ?? [], vendorFor); out.entries.push(...r.entries); out.notes.push(...r.notes) }
  return out
}

/** A `vendorFor` over the Finance › Vendors entries the vendors' port wrote, keyed by 1.0's vendor id (`idOf` maps it; the same id by
    default), following merges (`mergedInto`) to the entry that was kept. */
export function directoryLookup(vendors: readonly (PortVendor & { mergedInto?: string | null })[], idOf: (v1VendorId: string) => string | null = (x) => x): (v1VendorId: string) => PortVendor | null {
  const byId = new Map(vendors.map((v) => [v.id, v]))
  return (v1) => {
    let id = idOf(v1)
    for (let hop = 0; id && hop < 10; hop++) {
      const v = byId.get(id)
      if (!v) return null
      if (!v.mergedInto) return { id: v.id, name: v.name }
      id = v.mergedInto
    }
    return null
  }
}
