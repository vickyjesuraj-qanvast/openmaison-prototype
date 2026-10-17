// S45C · the pure parts, on sample rows (no server, no database): drag-fill's series (lib/quotes/fill-series.ts) and the port of 1.0's
// per-vendor prices (lib/port/price-book-vendor-prices.ts). Run: npx tsx design-source/verify/pending-modules/pm2-s45c-pure.mts
// (verify-pm2-s45c.cjs runs it and counts its checks). Each check asserts the rule, with the sample row it reads.
import { seriesFill, isNumberRun } from '../../../lib/quotes/fill-series.ts'
import { directoryLookup, dollarsOf, entryIdFor, linkedVendorIds, minorOf, portVendorPrices, pricePair, vendorEntries, type V1PriceBookItem, type V1VendorPrice } from '../../../lib/port/price-book-vendor-prices.ts'

let pass = 0, fail = 0
const ok = (cond: boolean, name: string) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

console.log('Drag-fill continues a series (lib/quotes/fill-series.ts)')
{
  const r = seriesFill([1, 2], 2, 2)
  ok(same(r.below, [3, 4]) && r.step === 1, '1, 2 → 3, 4 below')
  ok(same(r.above, [0, -1]), '…and 0, −1 above, nearest first')
  ok(same(seriesFill([10, 20], 2, 0).below, [30, 40]), '10, 20 → 30, 40')
  ok(same(seriesFill([5, 3], 3, 0).below, [1, -1, -3]) && seriesFill([5, 3], 1, 0).step === -2, '5, 3 counts down by 2')
  ok(same(seriesFill([0.1, 0.2], 2, 0).below, [0.3, 0.4]), '0.1, 0.2 → 0.3, 0.4 (the run’s own decimals, never 0.30000000000000004)')
  ok(same(seriesFill([1, 2, 4], 1, 0).below, [5.5]) && seriesFill([1, 2, 4], 1, 0).step === 1.5, 'an uneven run goes on by its average step (1, 2, 4 → 5.5)')
  ok(same(seriesFill([3, 3], 2, 0).below, [3, 3]) && seriesFill([3, 3], 0, 0).step === 0, 'a flat run copies (step 0)')
  ok(same(seriesFill([100000, 150000], 2, 0).below, [200000, 250000]), 'cents: S$1,000, S$1,500 → S$2,000, S$2,500')
  const t = seriesFill(['Living', 'Kitchen'], 3, 1)
  ok(same(t.below, ['Living', 'Kitchen', 'Living']) && t.step === null, 'words repeat in turn: Living, Kitchen → Living, Kitchen, Living')
  ok(same(t.above, ['Kitchen']), '…and above the run in reverse (Kitchen)')
  ok(same(seriesFill([5, null], 3, 0).below, [5, null, 5]) && !isNumberRun([5, null]), 'a run with an empty cell repeats — it is not a series')
  ok(same(seriesFill([2, 4], 0, 0), { below: [], above: [], step: 2 }), 'no rows reached: nothing to fill')
}

console.log('1.0’s per-vendor prices → each vendor’s own Price book entry (lib/port/price-book-vendor-prices.ts)')
const vendors = [
  { id: 'v-tile', name: 'Tile Gallery' }, { id: 'v-hafele', name: 'Hafele SG' }, { id: 'v-lim', name: 'Lim Hardware ' },
  { id: 'v-old', name: 'Tile Gallery (old)', mergedInto: 'v-tile' },
]
const vendorFor = directoryLookup(vendors)
const plank: V1PriceBookItem = { id: '11111111-1111-4111-8111-111111111111', name: 'Vinyl plank, 5 mm', unit: 'sqft', unit_price: '6.50', cost_price: 4.2, category: 'Flooring', vendor_id: 'v-tile', vendor_ids: ['v-tile', 'v-hafele', 'v-lim'] }
const prices: V1VendorPrice[] = [
  { price_book_item_id: plank.id, vendor_id: 'v-tile', cost_price: 4.0, unit_price: 6.0 },
  { price_book_item_id: plank.id, vendor_id: 'v-hafele', cost_price: '4.40', unit_price: null },
]
{
  const { entries, notes } = vendorEntries(plank, prices, vendorFor)
  ok(entries.length === 3, 'an item with three vendors becomes three entries — one per vendor')
  ok(entries.every((e) => e.name === plank.name && e.unit === 'sqft' && e.category === 'Flooring'), '…each keeping its name, unit and category')
  ok(same(entries.map((e) => e.vendor), ['Tile Gallery', 'Hafele SG', 'Lim Hardware']), '…its vendor named from Finance › Vendors, in 1.0’s order (trimmed)')
  ok(entries[0]!.costMinor === 400 && entries[0]!.markupMinor === 200 && entries[0]!.priced === 'vendor', 'Tile Gallery’s own cost and sell: S$4.00 + S$2.00 mark-up')
  ok(entries[1]!.costMinor === 440 && entries[1]!.markupMinor === 210 && entries[1]!.priced === 'vendor', 'Hafele’s own cost, the item’s sell (blank side = base): S$4.40 + S$2.10')
  ok(entries[2]!.costMinor === 420 && entries[2]!.markupMinor === 230 && entries[2]!.priced === 'base', 'Lim Hardware has no price of its own: the item’s base S$4.20 + S$2.30')
  ok(entries[0]!.id === plank.id && entries[1]!.id === entryIdFor(plank.id, 'v-hafele') && entries[2]!.id === entryIdFor(plank.id, 'v-lim'), 'the first vendor’s entry keeps the 1.0 id; the others get ids derived from (item, vendor)')
  ok(notes.length === 0, 'a clean item writes nothing to the port log')
  ok(same(vendorEntries(plank, prices, vendorFor), vendorEntries(plank, prices, vendorFor)), 'a second run answers the same rows (INSERT OR IGNORE)')
}
{
  const id = entryIdFor('a', 'b')
  ok(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) && id === entryIdFor('a', 'b') && id !== entryIdFor('a', 'c'), 'a derived id is a UUID, the same for the same pair, different for another vendor')
}
{
  const loose: V1PriceBookItem = { id: 'item-loose', name: 'Design fee', unit: null, unit_price: 120, cost_price: null, category: null, vendor_id: null, vendor_ids: null }
  const { entries, notes } = vendorEntries(loose, [], vendorFor)
  ok(entries.length === 1 && entries[0]!.id === 'item-loose' && entries[0]!.vendor === null && entries[0]!.unit === 'Pieces', 'an item with no vendor is one entry with none (unit: the schema’s Pieces)')
  ok(entries[0]!.costMinor === 12000 && entries[0]!.markupMinor === 0 && notes.some((n) => n.kind === 'sell-no-cost'), 'a sell with no cost costs the sell, no mark-up — logged (D-153)')
}
{
  const single: V1PriceBookItem = { id: 'item-single', name: 'Hinge, soft-close', unit: 'pc', unit_price: 3, cost_price: 1.5, category: 'Carpentry', vendor_id: 'v-hafele', vendor_ids: [] }
  const extra: V1VendorPrice[] = [{ price_book_item_id: 'item-single', vendor_id: 'v-lim', cost_price: 1.2, unit_price: 2.8 }]
  const { entries, notes } = vendorEntries(single, extra, vendorFor)
  ok(same(linkedVendorIds(single), ['v-hafele']), 'an empty vendor_ids falls back to vendor_id (1.0’s vendorsOfItem)')
  ok(entries.length === 2 && entries[1]!.vendor === 'Lim Hardware' && entries[1]!.costMinor === 120 && entries[1]!.markupMinor === 160, 'a vendor price for a vendor no longer linked still lands as its entry — nothing priced is lost')
  ok(notes.some((n) => n.kind === 'price-for-unlinked-vendor' && n.vendorId === 'v-lim'), '…and is logged')
}
{
  const merged: V1PriceBookItem = { id: 'item-merged', name: 'Wall tile 300×600', unit: 'sqft', unit_price: 9, cost_price: 6, category: 'Tiling', vendor_id: null, vendor_ids: ['v-old', 'v-tile'] }
  const mp: V1VendorPrice[] = [
    { price_book_item_id: 'item-merged', vendor_id: 'v-old', cost_price: 5, unit_price: 8 },
    { price_book_item_id: 'item-merged', vendor_id: 'v-tile', cost_price: 5.5, unit_price: 8.5 },
  ]
  const { entries, notes } = vendorEntries(merged, mp, vendorFor)
  ok(entries.length === 1 && entries[0]!.vendor === 'Tile Gallery' && entries[0]!.costMinor === 550 && entries[0]!.markupMinor === 300, 'two 1.0 vendors merged into one make one entry, at the kept vendor’s own price (1.0’s repoint rule)')
  ok(entries[0]!.id === 'item-merged' && notes.some((n) => n.kind === 'same-vendor-twice' && n.vendorId === 'v-old'), '…the 1.0 id kept, the other noted')
}
{
  const lost: V1PriceBookItem = { id: 'item-lost', name: 'Grout', unit: 'bag', unit_price: 12, cost_price: 7, category: 'Tiling', vendor_id: 'v-gone', vendor_ids: null }
  const { entries, notes } = vendorEntries(lost, [], vendorFor)
  ok(entries.length === 1 && entries[0]!.vendor === null && notes.some((n) => n.kind === 'vendor-not-in-directory'), 'a vendor Finance › Vendors doesn’t know lands with no vendor and a note — never a made-up name')
}
{
  ok(dollarsOf('6.50') === 6.5 && dollarsOf('') === null && dollarsOf(null) === null && dollarsOf('x') === null, 'NUMERIC read as a number or a string; blank is blank')
  ok(minorOf(10.005) === 1001 && minorOf(-10.005) === -1001 && minorOf(2.8) === 280, 'cents round half away from zero (D-155)')
  const r = pricePair(10.005, 3.333)
  ok(r.costMinor === 333 && r.markupMinor === 668 && r.notes.includes('rounded'), 'a sub-cent figure is rounded once and logged')
  ok(pricePair(5, 8).markupMinor === -300, 'a sell under its cost keeps its minus mark-up (never below −cost)')
  ok(same(pricePair(null, 7), { costMinor: 700, markupMinor: 0, notes: ['cost-no-sell'] }), 'a cost with no sell is priced at its cost — logged, never a sell made up')
  ok(same(pricePair(null, null), { costMinor: 0, markupMinor: 0, notes: ['no-price'] }), 'no price at all: 0 + 0, logged')
}
{
  const all = portVendorPrices([plank], [...prices, { price_book_item_id: 'not-ported', vendor_id: 'v-tile', cost_price: 1, unit_price: 2 }], vendorFor)
  ok(all.entries.length === 3 && all.notes.some((n) => n.kind === 'orphan-price' && n.itemId === 'not-ported'), 'the whole book: a vendor price whose item isn’t in the port is noted, never written')
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
