// Contracts on the move, C4 — the pure words of the lists, the templates and the photo (P-07 · P-10 · P-12): the phone card's chip, its
// "since" and its signs line (components/leads/contracts/contract-card-words.ts), a template's gallery facts, standing and status row and its
// clauses as rows (components/contracts/template-screen/template-words.ts), and the photo's checks and names (lib/contracts/picture.ts).
// Run: npx tsx design-source/verify/responsive-contracts/rc-c4-pure.mts  (verify-rc-c4.cjs counts its ✓ / ✗ lines)
import { contractCardChip, contractSignsLine, contractSinceWords } from '../../../components/leads/contracts/contract-card-words'
import { clauseRows, galleryFacts, gatesWords, plainWords, stateWords, statusWords } from '../../../components/contracts/template-screen/template-words'
import { checkPickedPicture, isPictureData, isPictureFile, pictureNameOf, titleOfFile } from '../../../lib/contracts/picture'
import { agreementHtml } from '../../../lib/contracts/agreement'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const DAY = 86_400_000
const NOW = new Date('2026-10-22T10:00:00+08:00').getTime()
const base = { title: 'Interior Design Service Agreement', toRead: false, source: 'composed', signedBy: null, sentAt: null, viewedAt: null, signedAt: null, signExpiresAt: null, updatedAt: new Date(NOW - 3 * DAY), createdAt: new Date(NOW - 9 * DAY) } as const
type C = Parameters<typeof contractSinceWords>[0] & Parameters<typeof contractCardChip>[0] & Parameters<typeof contractSignsLine>[0]
const c = (o: Partial<C> & { status: string }): C => ({ ...base, ...o } as C)

// ── the card's chip: read-only, the house tones ──
ok(contractCardChip(c({ status: 'Draft' }), NOW).label === 'Draft' && contractCardChip(c({ status: 'Draft' }), NOW).color === 'default', 'a Draft reads "Draft", plain')
ok(contractCardChip(c({ status: 'Sent to Client', sentAt: new Date(NOW - 2 * DAY), signExpiresAt: new Date(NOW + 5 * DAY) }), NOW).color === 'blue', 'out with the client is blue')
ok(/^Link expired \d+ \w+ ’\d\d$/.test(contractCardChip(c({ status: 'Sent to Client', sentAt: new Date(NOW - 9 * DAY), signExpiresAt: new Date(NOW - DAY) }), NOW).label) && contractCardChip(c({ status: 'Sent to Client', sentAt: new Date(NOW - 9 * DAY), signExpiresAt: new Date(NOW - DAY) }), NOW).color === 'yellow', 'a link past its window reads "Link expired {day}", yellow (the Quotes card’s "Expired {day}")')
ok(contractCardChip(c({ status: 'Signed', signedAt: new Date(NOW - DAY) }), NOW).color === 'green', 'Signed is green')
ok(contractCardChip(c({ status: 'Sent to Client', toRead: true, signExpiresAt: new Date(NOW - DAY) }), NOW).label === 'Sent to client', 'a letter to read never "expires" (it signs nothing)')

// ── the since: what the card can say about where it stands today ──
const sent = contractSinceWords(c({ status: 'Sent to Client', sentAt: new Date(NOW - 2 * DAY), signExpiresAt: new Date(NOW + 5 * DAY) }), NOW).map((w) => w.text)
ok(sent.join(' · ') === 'sent 2d ago · not opened', `sent and not opened ("${sent.join(' · ')}")`)
const opened = contractSinceWords(c({ status: 'Sent to Client', sentAt: new Date(NOW - 2 * DAY), viewedAt: new Date(NOW - 3 * 3_600_000), signExpiresAt: new Date(NOW + 5 * DAY) }), NOW).map((w) => w.text)
ok(opened.join(' · ') === 'sent 2d ago · opened 3h ago', `opened ("${opened.join(' · ')}")`)
const expired = contractSinceWords(c({ status: 'Sent to Client', sentAt: new Date(NOW - 9 * DAY), signExpiresAt: new Date(NOW - DAY) }), NOW).map((w) => w.text)
ok(expired.join(' · ') === 'sent 9d ago · not opened', `an expired link’s since is still when it went and whether it was opened — the chip says it expired ("${expired.join(' · ')}")`)
ok(/^signed \d+ \w+ ’\d\d$/.test(contractSinceWords(c({ status: 'Signed', signedAt: new Date(NOW - 40 * DAY) }), NOW)[0]!.text), 'Signed says the day it was signed')
ok(contractSinceWords(c({ status: 'Draft', updatedAt: new Date(NOW - 3_600_000) }), NOW)[0]!.text === 'edited today' && contractSinceWords(c({ status: 'Draft', updatedAt: new Date(NOW - DAY) }), NOW)[0]!.text === 'edited yesterday', 'a Draft says when it was last edited (today · yesterday)')
ok(contractSinceWords(c({ status: 'Sent to Client', toRead: true, sentAt: new Date(NOW - DAY) }), NOW)[0]!.text === 'sent to read 1d ago', 'a letter to read says it went to be read')

// ── the signs line ──
ok(contractSignsLine(c({ status: 'Draft' }), 'OM-10008', true) === 'Signs OM-10008 · Interior Design Service Agreement', 'Tools: "Signs OM-10008 · {title}"')
ok(contractSignsLine(c({ status: 'Draft' }), 'OM-10008', false) === 'Signs OM-10008', 'the lead’s tab: "Signs OM-10008" under the title')
ok(contractSignsLine(c({ status: 'Draft', source: 'uploaded' }), null, false) === 'A PDF', 'an uploaded one with no quote: "A PDF"')
ok(contractSignsLine(c({ status: 'Draft', toRead: true }), null, false) === 'A letter to read', 'a letter to read says so')

// ── a template's words (P-10) ──
const agreement = agreementHtml()
const facts = galleryFacts({ kind: 'document', usedBy: 5, body: agreement }, '14 Aug ’26')
ok(/^\d+ headings · used by 5 · edited 14 Aug ’26$/.test(facts), `the row's facts ("${facts}")`)
ok(galleryFacts({ kind: 'document', usedBy: 0, body: agreement }, 'today').includes('not used yet'), 'unused says "not used yet"')
ok(galleryFacts({ kind: 'pdf', usedBy: 2, body: '', size: '1 KB' }, 'today') === 'PDF · 1 KB · added to signings · used by 2 · edited today', 'a standard PDF says what it is')
ok(stateWords({ isDefault: true, useAtHandover: true }) === 'Default · At handover' && stateWords({ isDefault: false, useAtHandover: false }) === null, 'the standing as words, or nothing')
const st = statusWords({ isDefault: true, useAtHandover: false, kind: 'document', usedBy: 5, body: agreement })
ok(/^Default · used by 5 · fills \d+ fields · client signs ✓$/.test(st.text) && !st.warn, `the status row ("${st.text}")`)
const noSign = statusWords({ isDefault: false, useAtHandover: false, kind: 'document', usedBy: 0, body: '<h2>1. Scope</h2><p>Words</p>' })
ok(noSign.warn && !/client signs/.test(noSign.text), 'a template with nowhere for the client to sign warns')
const rows = clauseRows(agreement)
ok(rows.length >= 10 && rows.some((r) => /Signatures/.test(r.title)), `the clauses as rows, Signatures among them (${rows.length})`)
ok(rows.every((r) => r.words.length > 0 && r.words.length <= 160), 'every row has its first words, at most 160 characters')
ok(plainWords('<p>Hi <span class="om-token" data-token="client.name" contenteditable="false">Client name</span>&nbsp;, welcome</p>') === 'Hi [Client name], welcome', 'a field reads as [Client name], never its chip markup')
ok(gatesWords({ requiresScroll: true, requiresAccept: false, acceptLabel: null }, false) === 'Read to the end' && gatesWords({ requiresScroll: false, requiresAccept: false, acceptLabel: null }, false) === 'No rules before signing', 'the gates in one line')

// ── the photo (P-12, Q-04) ──
const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]).toString('base64')}`
ok(isPictureData(jpeg) && !isPictureData('data:application/pdf;base64,JVBERi0='), 'a picture is told from a PDF by what travels')
ok(isPictureFile({ name: 'IMG_0001.HEIC', type: '' }) && !isPictureFile({ name: 'a.pdf', type: 'application/pdf' }), 'a HEIC with no type is still a picture')
ok(pictureNameOf('Contract_OliviaM_signed.pdf', jpeg) === 'Contract_OliviaM_signed.jpg', 'a photo keeps the step’s name with its own extension')
ok(titleOfFile('Signed contract.jpg') === 'Signed contract' && titleOfFile('Agreement.pdf') === 'Agreement', 'the title drops the extension')
ok(checkPickedPicture({ name: 'a.jpg', data: jpeg, thumb: null }, () => 100) === null, 'the server takes a real JPEG')
ok(checkPickedPicture({ name: 'a.jpg', data: 'data:image/jpeg;base64,JVBERi0xLjQK', thumb: null }, () => 100) !== null, 'the server refuses bytes that are not the picture they say (a PDF named .jpg)')
ok(checkPickedPicture({ name: 'a.jpg', data: jpeg, thumb: null }, () => 99 * 1024 * 1024) !== null, 'the server refuses a picture over the cap')

console.log(`\nrc-c4 pure: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
