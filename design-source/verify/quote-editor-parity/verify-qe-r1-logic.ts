// Quote editor parity round 1 (REG-623) — the pure rules: export / paste columns, below cost, margin per category. Run: npx tsx design-source/verify/quote-editor-parity/verify-qe-r1-logic.ts
import { EXPORT_HEAD, EXPORT_MONEY_COLS, exportRows, guessHeader, parseBlock, toLines } from '../../../lib/quotes/clipboard'
import { belowCost, categoryShares } from '../../../lib/quotes/math'
const now = new Date()
const base = { quoteId: 'q', parentId: null, kind: 'item', position: 0, description: null, descriptionHtml: null, thumb: null, thumbCount: 0, icon: null, status: 'Pending', qty: 1, unit: null, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, room: null, category: null, section: null, visibility: 'visible', collapsed: false, priceBookItemId: null, optional: false, printAs: null, printAsText: null, highlight: null, noNumber: false, printOneLine: false, rebateMinor: 0, vendor: null, link: null, createdAt: now, updatedAt: now }
const items = [
  { ...base, id: 'a', name: 'Tiles', category: 'Masonry', qty: 10, costMinor: 1000, markupMinor: 500, vendor: 'Hafary', link: 'https://hafary.com.sg/x' },
  { ...base, id: 'b', name: 'Loss', category: 'Masonry', qty: 1, costMinor: 5000, markupMinor: -1000 },
  { ...base, id: 'c', name: 'Gift', category: 'Masonry', qty: 1, costMinor: 2000, markupMinor: 0, printAs: 'foc' },
  { ...base, id: 'd', name: 'Client buys', category: 'Fittings', qty: 1, costMinor: 3000, markupMinor: 500, printAs: 'client' },
  { ...base, id: 'e', name: 'Door', category: 'Fittings', qty: 2, costMinor: 1000, markupMinor: 1000, rebateMinor: 200 },
] as never[]
let fail = 0
const check = (name: string, pass: boolean, note = '') => { console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`); if (!pass) fail++ }
check('export head has Vendor/Sub + Website Link before Total', EXPORT_HEAD.join('|').endsWith('Vendor/Sub|Website Link|Total') && EXPORT_HEAD[EXPORT_MONEY_COLS[3]!] === 'Total')
const rows = exportRows(items)
check('every export row is as wide as the head', rows.every((r) => r.length === EXPORT_HEAD.length), String(rows[0]!.length))
check('export carries the vendor and link', rows[0]![13] === 'Hafary' && rows[0]![14] === 'https://hafary.com.sg/x')
const block = 'Item\tQty\tRate\tSupplier\tWebsite\nTiles\t10\t12.50\tHafary\thafary.com.sg/tiles\nGrout\t2\t8\tSoon Bee Huat\tnot a link'
const map = guessHeader(parseBlock(block))
check('paste header maps Supplier → vendor, Website → link', !!map && map[3] === 'vendor' && map[4] === 'link', JSON.stringify(map))
const lines = toLines(parseBlock(block), map!, true)
check('pasted vendor + cleaned link; a bad link is left out', lines[0]!.vendor === 'Hafary' && lines[0]!.link === 'https://hafary.com.sg/tiles' && lines[1]!.vendor === 'Soon Bee Huat' && lines[1]!.link === undefined, JSON.stringify(lines))
check('below cost: a loss line only', !belowCost(items[0]!) && belowCost(items[1]!) && !belowCost(items[2]!) && !belowCost(items[3]!))
const shares = categoryShares(items)
const mas = shares.find((s) => s.name === 'Masonry')!, fit = shares.find((s) => s.name === 'Fittings')!
// Masonry: revenue 15000 + 4000 = 19000; cost 10000 + 5000 + FOC 2000 = 17000 → 10.53 %
check('Masonry margin counts the FOC line’s cost', Math.abs(mas.marginPct! - (2000 / 19000) * 100) < 1e-9, mas.marginPct!.toFixed(2))
// Fittings: revenue 4000 (the By client line never counts); cost 2000 − rebate 400 = 1600 → 60 %
check('Fittings margin: By client out, rebate counted', Math.abs(fit.marginPct! - 60) < 1e-9 && fit.count === 1, fit.marginPct!.toFixed(2))
process.exit(fail ? 1 : 0)
