/* S44I · the Items table — the pure rules the grid, the bulk bar, the drag and the server share (no database, no browser).
   Run: npx tsx design-source/verify/pending-modules/verify-pm2-s44i-logic.ts */
import { carried, flattenItems, groupLevel, GROUP_DEPTH_RULE, moveTargets, numberItems, quoteTotals, sectionWordOf, whyNoNumber, withSectionWords } from '@/lib/quotes/math'
import { keptText, nameFromHtml, narrowNameHtml, plainToHtml } from '@/lib/quotes/items-model'
import { stripListMark, toLines } from '@/lib/quotes/clipboard'
import { sanitizeRichHtml } from '@/lib/rich-html'
import { parseUnits, studioUnit } from '@/lib/settings/units'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

type Row = { id: string; parentId: string | null; kind: 'item' | 'group'; position: number; status: string; qty: number; costMinor: number; markupMinor: number; discountPct: number; gstPct: number; optional?: boolean; printAs?: string | null; printAsText?: string | null; noNumber?: boolean; visibility?: string; pricedAfter?: boolean }
const line = (id: string, parentId: string | null, position: number, extra: Partial<Row> = {}): Row => ({ id, parentId, kind: 'item', position, status: 'Pending', qty: 1, costMinor: 1000, markupMinor: 500, discountPct: 0, gstPct: 9, visibility: 'visible', ...extra })
const group = (id: string, parentId: string | null, position: number, extra: Partial<Row> = {}): Row => ({ ...line(id, parentId, position, extra), kind: 'group', qty: 1, costMinor: 0, markupMinor: 0 })
/* K(itchen) › a, b, S(ub) › c, d ; B(athrooms) › e ; t1, t2 at the top ; E(mpty sub) in B */
const items: Row[] = [
  group('K', null, 0), line('a', 'K', 0), line('b', 'K', 1), group('S', 'K', 2), line('c', 'S', 0), line('d', 'S', 1),
  group('B', null, 1), line('e', 'B', 0), group('E', 'B', 1), line('t1', null, 2), line('t2', null, 3),
]

console.log('\nB1 · what Group into makes')
ok(groupLevel(items, ['t1', 't2']) === 'section', 'two top lines → a section')
ok(groupLevel(items, ['a', 'b']) === 'sub-section', 'two lines of one section → a sub-section there')
ok(groupLevel(items, ['a', 'e']) === 'section', 'lines from two sections → a section at the top')
const r = groupLevel(items, ['c', 'd'])
ok(typeof r === 'object' && r.refused === GROUP_DEPTH_RULE, 'two lines of one sub-section → refused with the rule')
ok(groupLevel(items, []) === 'section', 'nothing ticked → an empty section (New section)')

console.log('\nB1 · carried rows and Move to section targets')
ok(carried(items, ['K', 'a', 'c', 'e']).join(',') === 'K,e', 'a row under a ticked section travels with it')
const tLines = moveTargets(items, ['t1']).map((g) => g.id).join(',')
ok(tLines === 'K,S,B,E', `a line may join every section and sub-section (${tLines})`)
ok(!moveTargets(items, ['a', 'b']).some((g) => g.id === 'K'), 'a section every ticked line already sits in is left out')
ok(moveTargets(items, ['K']).length === 0, 'a section holding a sub-section moves nowhere (it stays at the top)')
ok(moveTargets(items, ['S']).map((g) => g.id).join(',') === 'B', 'a sub-section may join another top section only')
ok(moveTargets([...items, group('P', null, 9, { pricedAfter: true })], ['P']).length === 0, 'a section priced after the contract stays at the top')

console.log('\nB7 · a typed or pasted list drops its own marks')
ok(['• Hacking', '- Hacking', '* Hacking', '· Hacking', '1. Hacking', '12) Hacking'].every((v) => stripListMark(v) === 'Hacking'), 'the six list marks are stripped')
ok(stripListMark('1.5 m skirting') === '1.5 m skirting', '"1.5 m skirting" keeps its words')
const lines = toLines([['• Hacking', '1', 'LOT', '1200'], ['2. Plastering', '2', 'lot', '300']], ['name', 'qty', 'unit', 'cost'], false, ['Lot', 'sq m'])
ok(lines.map((l) => l.name).join('|') === 'Hacking|Plastering' && lines.every((l) => l.unit === 'Lot'), 'names without marks; a unit takes the studio’s spelling (M9)')

console.log('\nM3 · descriptions keep their shape')
ok(keptText('<p>One</p><p>Two</p>', false).html === '<p>One</p><p>Two</p>', 'two paragraphs keep their HTML')
ok(keptText('<p style="text-align: center">Centred</p>', false).html !== null, 'an alignment keeps its HTML')
ok(keptText('<p>One</p><p><br></p><p>Two</p>', false).html !== null, 'a blank line keeps its HTML')
ok(keptText('<p>Plain words</p>', false).html === null, 'one plain paragraph stays plain')
ok(plainToHtml('One\n\nTwo') === '<p>One</p><p><br></p><p>Two</p>', 'a plain blank line opens as a blank line')

console.log('\nC2 · a line’s name: emphasis, breaks and kit colours, through the house allowlist')
const n1 = narrowNameHtml(sanitizeRichHtml('<p><b>Feature</b> wall</p><p>with <span data-kit="accent" style="color: #ff0000">cove light</span></p><script>alert(1)</script>'))
ok(n1 === '<b>Feature</b> wall<br>with <span data-kit="accent">cove light</span>', `narrowed to a name's marks (${n1})`)
ok(narrowNameHtml(sanitizeRichHtml('<p>Just words</p>')) === null, 'plain words keep no HTML')
ok(narrowNameHtml(sanitizeRichHtml('<span data-kit="#ff0000">x</span><b>y</b>'))?.includes('data-kit') === false, 'a free hex never passes — kit keys only')
ok(nameFromHtml('<b>Feature</b> wall<br>with cove light') === 'Feature wall with cove light', 'the plain name for search, the X-Ray and exports')

console.log('\n308 · the grid numbers what the print numbers')
const num = numberItems(items as never)
ok(num.get('E') === '' && whyNoNumber(items as never, items.find((i) => i.id === 'E') as never) === 'empty', 'an empty sub-section carries no number')
const hid = [...items.filter((i) => i.id !== 'a'), line('a', 'K', 0, { visibility: 'hidden' })]
const nh = numberItems(hid as never)
ok(nh.get('a') === '' && nh.get('b') === '1.1', 'a line hidden from the client is passed over (the next takes 1.1)')

console.log('\nM17 · a section that prints a word')
const foc = items.map((i) => (i.id === 'B' ? { ...i, printAs: 'foc' } : i))
ok(sectionWordOf(foc as never, foc.find((i) => i.id === 'e') as never)?.id === 'B', 'a line in a FOC section prints under its word')
const withWord = quoteTotals(foc as never, { additionalDiscountMode: 'pct', additionalDiscountValue: 0, gstEnabled: false })
const without = quoteTotals(items as never, { additionalDiscountMode: 'pct', additionalDiscountValue: 0, gstEnabled: false })
ok(without.subtotalMinor - withWord.subtotalMinor === 1500, 'its lines leave the subtotal')
ok(withWord.costMinor === without.costMinor, 'FOC work still costs the studio — the margin counts it')
const kiv = items.map((i) => (i.id === 'B' ? { ...i, printAs: 'kiv' } : i))
ok(quoteTotals(kiv as never, { additionalDiscountMode: 'pct', additionalDiscountValue: 0, gstEnabled: false }).costMinor === without.costMinor - 1000, 'KIV work costs nothing yet')
ok((withSectionWords(foc as never).find((i) => i.id === 'e') as Row).printAs === 'foc', 'the line counts as the word does')

console.log('\nC1 · sections priced after the contract stand last')
const later = [...items.map((i) => (i.id === 'K' ? { ...i, pricedAfter: true } : i))]
ok(flattenItems(later as never).map((i) => i.id).slice(-6).join(',') === 'K,a,b,S,c,d', 'the marked section and its rows come after the rest')

console.log('\nM9 · the studio’s units')
ok(parseUnits([' sqft ', 'SQFT', 'Lot', '', 7, 'm²']).join('|') === 'sqft|Lot|m²', 'trimmed, once each whatever the case')
ok(studioUnit(['Lot', 'sq m'], 'SQ M') === 'sq m', 'a typed unit takes the studio’s spelling')

console.log(`\nPROBE_TALLY S44I-logic pass=${pass} fail=${fail}`)
process.exit(fail ? 1 : 0)
