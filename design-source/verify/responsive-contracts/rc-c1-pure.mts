// Contracts on the move, C1 — the pure rules: Q-07's one primary per contract state and the Next line (lib/contracts/next-step.ts), the
// clauses a document splits into (lib/contracts/clauses.ts), the Activity fold's moments.
// Run: npx tsx design-source/verify/responsive-contracts/rc-c1-pure.mts  (verify-rc-c1.cjs counts its ✓ / ✗ lines)
import { contractNextStep, contractTimeline, type ContractFacts } from '../../../lib/contracts/next-step'
import { clausesOf, signsLine } from '../../../lib/contracts/clauses'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const NOW = Date.UTC(2026, 9, 22, 10, 0, 0)
const DAY = 86_400_000
const base: ContractFacts = { status: 'Draft', clientFirst: 'Olivia', toRead: false, uploaded: false, blocker: null, sentAt: null, viewedAt: null, expiresAt: null, signedAt: null, signedBy: null, quoteNumber: 'OM-10001', leadStage: 'Quote Sent', bundled: false, linkDays: 7 }
const f = (o: Partial<ContractFacts>) => contractNextStep({ ...base, ...o }, NOW)

// ── Q-07's map ──
ok(f({}).primary === 'send' && f({}).label === 'Send' && f({}).lead === 'Next' && /send it to Olivia for signature — the client signature box is in place/.test(f({}).text), 'Draft → Send, "send it to Olivia for signature — the client signature box is in place"')
ok(f({ blocker: 'No client signature field yet — add one in Edit › Signature fields' }).primary === 'send' && /^no client signature field yet/.test(f({ blocker: 'No client signature field yet — add one in Edit › Signature fields' }).text), 'Draft with a blocker → Send stays the primary, the line is the blocker')
ok(/send the letter to Olivia/.test(f({ toRead: true }).text) && f({ toRead: true }).primary === 'send', 'a letter to read → "send the letter … nothing to sign"')
ok(/send the PDF to Olivia/.test(f({ uploaded: true }).text), 'an uploaded PDF → "send the PDF … sign under it"')
const sent = f({ status: 'Sent to Client', sentAt: NOW - 20 * 60_000, expiresAt: NOW + 7 * DAY })
ok(sent.primary === 'remind' && sent.label === 'Remind' && sent.lead === null && /^With Olivia for signature — sent 20 min ago · not opened yet · link open until 29 Oct ’26\.$/.test(sent.text) && !!sent.more, `Sent → Remind; "${sent.text}"`)
const opened = f({ status: 'Sent to Client', sentAt: NOW - 3 * DAY, viewedAt: NOW - 2 * DAY, expiresAt: NOW + 4 * DAY })
ok(/* (the calm UI build 2026-10-27, a deliberate change) 1-24: lib/templates/ago spells the span out */ /sent 3 days ago · opened 2 days ago · link open until/.test(opened.text), 'Sent and opened → "sent 3 days ago · opened 2 days ago · link open until …"')
const soon = f({ status: 'Sent to Client', sentAt: NOW - 6 * DAY, expiresAt: NOW + 5 * 3_600_000 })
ok(/link closes in 5 h/.test(soon.text) && soon.primary === 'remind', 'a link closing within a day → "link closes in 5 h", still Remind')
const expired = f({ status: 'Sent to Client', sentAt: NOW - 9 * DAY, expiresAt: NOW - 2 * DAY })
ok(expired.primary === 'resend' && expired.label === 'Send again' && expired.lead === 'Next' && /the link closed on 20 Oct ’26 — send it again so Olivia can sign/.test(expired.text), 'Expired → Send again, "the link closed on 20 Oct ’26 — send it again"')
ok(/sent together/.test(f({ status: 'Sent to Client', sentAt: NOW, expiresAt: NOW + DAY, bundled: true }).text), 'sent together says so')
const letterSent = f({ status: 'Sent to Client', toRead: true, sentAt: NOW - DAY })
ok(letterSent.primary === null && /Sent to Olivia to read and keep/.test(letterSent.text), 'a letter sent → nothing to do, "to read and keep"')
const signedOnline = f({ status: 'Signed', signedAt: NOW - 30 * DAY, signedBy: 'Ryan D’Souza', leadStage: 'Quote Sent', quoteNumber: 'OM-10004' })
ok(signedOnline.primary === 'won' && signedOnline.label === 'Move to Won' && /^Signed on 22 Sep ’26 by Ryan D’Souza online · OM-10004 is signed through it · the lead is still in Quote Sent\.$/.test(signedOnline.text), `Signed online, lead before Won → Move to Won; "${signedOnline.text}"`)
const signedWon = f({ status: 'Signed', signedAt: NOW - 2 * DAY, signedBy: null, leadStage: 'Won' })
ok(signedWon.primary === 'download' && signedWon.label === 'Download signed copy' && /* (the calm UI build 2026-10-27, a deliberate change) 1-24: lib/templates/ago spells the span out */ /Signed 2 days ago · marked by the studio · OM-10001 is signed through it\.$/.test(signedWon.text) && !/lead is still/.test(signedWon.text), 'Marked signed, lead Won → Download signed copy, no "lead is still"')
ok(/An Owner or Admin can undo the signing from the status menu/.test(signedWon.more ?? '')   /* (the calm UI build 2026-10-27, a deliberate change) 4-51's words */ && /stays signed; duplicate it/.test(signedOnline.more ?? ''), 'the longer words: the desk banner’s, by who signed')
ok(f({ status: 'Signed', signedAt: NOW, leadStage: 'Lost' }).primary === 'download', 'Signed on a Lost lead → Download signed copy, never Move to Won')

// ── the clauses ──
const html = '<h1>Interior Design Service Agreement</h1><p>This Agreement is made on 22 October 2026.</p><h2>1. Scope of works</h2><p>The Designer shall…</p><h2></h2><p>loose</p><h2>2. Contract sum</h2><p>S$49,838.00</p><h2>Signatures</h2><p><span class="om-sign" data-sign="studio-signature" contenteditable="false">Studio signature</span></p><p><span class="om-sign" data-sign="client-signature" contenteditable="false">Client signature</span></p>'
const split = clausesOf(html)
ok(split.lead === '' && split.clauses.length === 4, `four cards (the empty heading is none): ${split.clauses.map((c) => c.title).join(' | ')}`)
ok(split.clauses[0]!.title === 'Interior Design Service Agreement' && split.clauses[0]!.level === 1 && /made on 22 October 2026/.test(split.clauses[0]!.html), 'the title is the first card, the preamble its words')
ok(split.clauses[1]!.index === 1 && /loose/.test(split.clauses[1]!.html), 'the empty heading’s words ride with the clause before it; the index is the Outline’s')
ok(split.clauses[2]!.index === 3 && split.clauses[2]!.title === '2. Contract sum', 'the numbering skips the empty heading, as outlineOf does')
ok(split.clauses[3]!.signs.join(',') === 'studio-signature,client-signature' && signsLine(split.clauses[3]!.signs) === 'Studio · Client — placed', 'the Signatures card reads "Studio · Client — placed"')
ok(signsLine([]) === null && signsLine(['client-initial']) === 'Client initials — placed', 'no fields → no line; initials named as such')
const lead = clausesOf('<p>Hello</p><h2>A</h2><p>x</p>')
ok(lead.lead === '<p>Hello</p>' && lead.clauses.length === 1, 'words before the first heading are the lead')
ok(clausesOf('').clauses.length === 0 && clausesOf('<p>only words</p>').lead === '<p>only words</p>', 'no headings → no cards, the words as the lead')

// ── the moments ──
const tl = contractTimeline({ createdAt: NOW - 5 * DAY, createdByName: null, sentAt: NOW - 3 * DAY, recipient: 'Olivia Martinez', viewedAt: NOW - 2 * DAY, acceptedAt: NOW - DAY, signedAt: NOW - DAY + 60_000, signedBy: 'Olivia Martinez', toRead: false })
ok(tl.length === 5 && tl[0]!.text === 'Signed by Olivia Martinez online' && tl[4]!.text === 'Created' && tl[1]!.text === 'Olivia Martinez ticked the words', `the moments newest first: ${tl.map((m) => m.text).join(' | ')}`)
ok(contractTimeline({ createdAt: NOW, createdByName: null, sentAt: null, recipient: 'A', viewedAt: null, acceptedAt: null, signedAt: NOW, signedBy: null, toRead: false })[0]!.text === 'Marked signed by the studio', 'a studio mark reads as one')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
