// Contracts on the move, C2 — the pure rules of placing a signature field by choosing where (lib/contracts/tokens.ts, P-04 · B-04 · B-05):
// the top-level blocks read from the string, the places from the Outline, the block inserted after a clause (never inside a word), the
// summary line. Run: npx tsx design-source/verify/responsive-contracts/rc-c2-pure.mts  (verify-rc-c2.cjs counts its ✓ / ✗ lines)
import { fieldPlaceWords, insertSignFieldAfter, outlineOf, placeWords, signFieldsIn, signFieldsSummary, signPlaces, topBlocks } from '../../../lib/contracts/tokens'
import { agreementHtml } from '../../../lib/contracts/agreement'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const slices = (html: string) => topBlocks(html).map((b) => html.slice(b.start, b.end))

// ── topBlocks: the editor's top-level pieces, read from the string ──
const simple = '<h1>Title</h1><p>One</p>\n<ul><li>a</li><li>b</li></ul>loose text<img src="x"><p>Two <strong>bold</strong></p>'
const parts = slices(simple)
ok(parts.length === 6, `six top-level blocks in a heading · paragraph · list · loose text · picture · paragraph (${parts.length})`)
ok(parts[2] === '<ul><li>a</li><li>b</li></ul>', 'a list with its items is one block')
ok(parts[3] === 'loose text', 'loose text between blocks is a block of its own')
ok(parts[4] === '<img src="x">', 'a picture (a void tag) is a block')
ok(parts[5] === '<p>Two <strong>bold</strong></p>', 'an inline run inside a paragraph stays inside it')
ok(slices('<p>a</p>\n\n<p>b</p>').length === 2, 'whitespace between blocks is not a block')
ok(slices('').length === 0, 'an empty document has no blocks')
ok(slices('<p>unclosed').length === 1 && slices('<p>unclosed')[0] === '<p>unclosed', 'an unclosed block runs to the end')
ok(slices('<p>a &lt; b</p><!-- note --><p>c</p>').length === 2, 'a comment is nobody’s block')
ok(slices('<div><h2>In a div</h2><p>x</p></div><p>y</p>').length === 2, 'a heading wrapped in a div belongs to the div’s block')

// ── signPlaces: the Outline's clauses, Signatures picked for you ──
const agreement = agreementHtml()
const places = signPlaces(agreement)
const outline = outlineOf(agreement)
ok(places.length === outline.length + 1, `one place per heading plus "At the end" (${places.length} for ${outline.length} headings)`)
ok(places[0]!.label === 'After Interior Design Service Agreement', `the first reads "After {title}" ("${places[0]!.label}")`)
ok(places[1]!.label === 'After 1. Scope of works', `a clause reads "After 1. Scope of works" ("${places[1]!.label}")`)
const under = places.find((p) => p.suggested)!
ok(under.label === 'Under Signatures' && under.place === outline.length - 1, `the Signatures heading reads "Under Signatures" and is picked for you ("${under.label}")`)
ok(places[places.length - 1]!.label === 'At the end' && !places[places.length - 1]!.suggested, 'the last is "At the end", not picked while Signatures exists')
ok(places.filter((p) => p.suggested).length === 1, 'exactly one place is picked for you')
const noSig = signPlaces('<h2>1. Scope</h2><p>x</p><h2>2. Sum</h2><p>y</p>')
ok(noSig[noSig.length - 1]!.suggested && noSig.filter((p) => p.suggested).length === 1, 'with no Signatures heading, "At the end" is the pick')
ok(placeWords(under) === 'under Signatures' && placeWords(places[1]!) === 'after 1. Scope of works' && placeWords(noSig[noSig.length - 1]!) === 'at the end', 'placeWords: "under Signatures" · "after 1. Scope of works" · "at the end"')

// ── insertSignFieldAfter: its own block after the clause, never inside a word ──
const doc = '<h1>T</h1><p>intro</p><h2>1. One</h2><p>The con tract sum.</p><h3>1a. Sub</h3><p>sub text</p><h2>2. Two</h2><p>two text</p><h2>Signatures</h2><p>Signed by.</p><p><span class="om-sign" data-sign="studio-signature" contenteditable="false">Studio signature</span></p>'
const r1 = insertSignFieldAfter(doc, 1, 'client-initial')   // heading index 1 = "1. One" (h2), whose clause holds the h3 sub-clause
const b1 = slices(r1.html)
ok(b1[r1.index] === '<p><span class="om-sign" data-sign="client-initial" contenteditable="false">Client initial</span></p>', 'the field is its own <p> block')
ok(b1[r1.index - 1] === '<p>sub text</p>' && b1[r1.index + 1] === '<h2>2. Two</h2>', 'after "1. One" it lands after the clause’s sub-clause, before "2. Two"')
ok(!/con[^<]*<span class="om-sign"/.test(r1.html) && r1.html.includes('<p>The con tract sum.</p>'), 'never inside a word — the paragraph is untouched')
const r2 = insertSignFieldAfter(doc, 2, 'client-initial')   // heading index 2 = the h3 "1a. Sub"
const b2 = slices(r2.html)
ok(b2[r2.index - 1] === '<p>sub text</p>' && b2[r2.index + 1] === '<h2>2. Two</h2>', 'after the h3 sub-clause: its own paragraphs, up to the next heading')
const sigIdx = outlineOf(doc).find((h) => h.text === 'Signatures')!.index
const r3 = insertSignFieldAfter(doc, sigIdx, 'client-signature')
const b3 = slices(r3.html)
ok(r3.index === b3.length - 1 && b3[r3.index]!.includes('data-sign="client-signature"'), 'under Signatures: after the clause’s existing boxes, the last block')
const r4 = insertSignFieldAfter(doc, 'end', 'client-signature')
ok(r4.index === slices(r4.html).length - 1 && r4.html.endsWith('Client signature</span></p>'), '"At the end" appends it')
const r5 = insertSignFieldAfter(doc, 99, 'client-signature')
ok(r5.html === r4.html, 'a heading that is gone falls back to the end')
const r6 = insertSignFieldAfter('', 'end', 'client-signature')
ok(r6.index === 0 && r6.html === '<p><span class="om-sign" data-sign="client-signature" contenteditable="false">Client signature</span></p>', 'an empty document takes it as its first block')
const spaced = '<h2>A</h2>\n<p>a</p>\n<h2>B</h2>\n<p>b</p>'
const r7 = insertSignFieldAfter(spaced, 0, 'client-signature')
ok(r7.html === '<h2>A</h2>\n<p>a</p><p><span class="om-sign" data-sign="client-signature" contenteditable="false">Client signature</span></p>\n<h2>B</h2>\n<p>b</p>', 'every byte around the blocks is kept (the newlines between them)')
ok(signFieldsIn(r3.html).includes('client-signature') && outlineOf(r3.html).length === outlineOf(doc).length, 'the inserted field is read back, and the outline is unchanged')
const lifted = '<h1>T</h1><p>x</p><span class="om-sign" data-sign="client-signature" contenteditable="false">Client signature</span>'   // a bare span at the top level — what the desk’s caret insert leaves at a paragraph’s end
ok(slices(lifted).length === 3 && fieldPlaceWords(lifted, 'client-signature') === 'under T', 'a bare field at the top level is a block, placed under the heading before it')

// ── the summary line ──
ok(signFieldsSummary('<p>x</p>') === 'Not placed yet — the client has nowhere to sign', 'no field: "Not placed yet — the client has nowhere to sign"')
ok(signFieldsSummary(agreement) === 'Studio · Client — placed under Signatures', `the agreement: "Studio · Client — placed under Signatures" ("${signFieldsSummary(agreement)}")`)
ok(signFieldsSummary(doc) === 'Studio — placed under Signatures · no Client signature yet', `a studio box alone says the client has none ("${signFieldsSummary(doc)}")`)
const spread = insertSignFieldAfter(doc, 1, 'client-signature').html
ok(signFieldsSummary(spread) === 'Studio · Client — placed', `fields under different clauses name no clause ("${signFieldsSummary(spread)}")`)
ok(fieldPlaceWords(agreement, 'client-signature') === 'under Signatures' && fieldPlaceWords(agreement, 'client-initial') === null, 'fieldPlaceWords: the clause a field sits under; null when not placed')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
