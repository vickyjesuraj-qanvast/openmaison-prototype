// Quotes on the move, K1 — the pure rules: Q-07's one primary per state and the Next line (lib/quotes/next-step.ts), the reminder's draft.
// Run: npx tsx design-source/verify/responsive-quotes/rq-k1-pure.mts  (verify-rq-k1.cjs counts its ✓ / ✗ lines)
import { nextStep, reminderMessage, type QuoteFacts } from '../../../lib/quotes/next-step'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const NOW = Date.UTC(2026, 9, 22, 10, 0, 0)
const base: QuoteFacts = { status: 'Draft', variation: false, version: 1, approval: 'required', canApprove: true, clientFirst: 'Olivia', validityEnded: null, at: null, opened: null, waiting: null, changes: null, confirmedBy: null, markedBy: null, contract: null, leadStage: 'Quote Sent', signedTotal: null }
const f = (o: Partial<QuoteFacts>) => nextStep({ ...base, ...o }, NOW)

ok(f({}).primary === 'send' && f({}).lead === 'Next' && /send it to Olivia for confirmation/.test(f({}).text), 'Draft → Send ▾, "send it to Olivia for confirmation, or with the T&Cs for signature"')
ok(f({ canApprove: false }).primary === 'send' && /for approval/.test(f({ canApprove: false }).text), 'Draft, approval required, not an approver → Send (for approval), the line says so')
ok(f({ approval: 'not-required', canApprove: false }).primary === 'send' && /for confirmation/.test(f({ approval: 'not-required', canApprove: false }).text), 'Draft, no approval step → Send ▾ to the client')
ok(f({ changes: { by: 'Hui Min', at: NOW - 3600_000, note: 'Lower the tiles' } }).primary === 'send' && /Hui Min asked for changes .*Lower the tiles/.test(f({ changes: { by: 'Hui Min', at: NOW - 3600_000, note: 'Lower the tiles' } }).text), 'Draft sent back → the note on the line, Send')
ok(f({ status: 'Sent for Approval', waiting: { by: 'Germaine', at: NOW - 7200_000 } }).primary === 'approve' && f({ status: 'Sent for Approval', waiting: { by: 'Germaine', at: NOW - 7200_000 } }).label === 'Approve', 'Sent for Approval, an approver → Approve')
ok(f({ status: 'Sent for Approval', canApprove: false, waiting: { by: 'Germaine', at: NOW } }).primary === null && /Waiting for an Owner/.test(f({ status: 'Sent for Approval', canApprove: false, waiting: { by: 'Germaine', at: NOW } }).text), 'Sent for Approval, anyone else → no primary, "Waiting for an Owner…"')
ok(f({ status: 'Approved' }).primary === 'send' && /approved — send it/.test(f({ status: 'Approved' }).text), 'Approved → Send ▾')
const sent = f({ status: 'Sent to Client', at: NOW - 3 * 86_400_000, opened: { at: NOW - 86_400_000, count: 2 } })
ok(sent.primary === 'remind' && sent.label === 'Remind' && /sent 3d ago, opened twice/.test(sent.text) && /waiting for Olivia to confirm/.test(sent.text) && !!sent.more, 'Sent to Client → Remind; "sent 3d ago, opened twice … waiting for Olivia to confirm", the longer words one tap further')
const expired = f({ status: 'Sent to Client', at: NOW - 40 * 86_400_000, validityEnded: '16 Sep ’26' })
ok(expired.primary === 'revise' && expired.label === 'Revise' && /validity ended on 16 Sep ’26/.test(expired.text), 'Expired (validity passed while the client has it) → Revise')
ok(f({ status: 'Confirmed', confirmedBy: 'Olivia Martinez', at: NOW - 86_400_000 }).primary === 'signature' && /confirmed version 1/.test(f({ status: 'Confirmed', confirmedBy: 'Olivia Martinez', at: NOW - 86_400_000 }).text), 'Confirmed → Send for signature')
ok(/Marked confirmed by Dane/.test(f({ status: 'Confirmed', markedBy: 'Dane', at: NOW }).text), 'Confirmed by hand → "Marked confirmed by Dane"')
ok(f({ status: 'Confirmed', variation: true, confirmedBy: 'Ryan', at: NOW }).primary === null && /approved .* the contract value has moved/.test(f({ status: 'Confirmed', variation: true, confirmedBy: 'Ryan', at: NOW }).text), 'A variation order approved → nothing left to do; the contract moved')
ok(f({ status: 'Signed', contract: { title: 'Interior Design Service Agreement', status: 'Signed' }, at: NOW }).primary === 'contract' && f({ status: 'Signed', contract: { title: 'Interior Design Service Agreement', status: 'Signed' }, at: NOW }).label === 'Open contract', 'Signed with a contract → Open contract')
// (REG-2601, the Contracts audit's C-21) a contract raised from the quote and not yet signed is the live path — never a second Send for signature
ok(f({ status: 'Confirmed', confirmedBy: 'Serena', at: NOW, contract: { title: 'Interior Design Service Agreement', status: 'Sent to Client' } }).primary === 'contract' && /with Olivia for signature/.test(f({ status: 'Confirmed', confirmedBy: 'Serena', at: NOW, contract: { title: 'Interior Design Service Agreement', status: 'Sent to Client' } }).text), 'Confirmed with a contract out for signature → Open contract, the line says it is with the client')
ok(f({ status: 'Approved', contract: { title: 'Interior Design Service Agreement', status: 'Draft' } }).primary === 'send', 'Approved with a contract still in Draft → the quote’s own Send (the drafted contract is the chip’s, P-11)')
ok(f({ status: 'Approved', contract: { title: 'Interior Design Service Agreement', status: 'Sent to Client' } }).primary === 'contract', 'Approved with a contract out for signature → Open contract')
ok(f({ status: 'Confirmed', confirmedBy: 'Serena', at: NOW, contract: null }).primary === 'signature', 'Confirmed with no contract → Send for signature, as before')
ok(f({ status: 'Signed', leadStage: 'Met', at: NOW }).primary === 'won' && f({ status: 'Signed', leadStage: 'Met', at: NOW }).label === 'Move to Won', 'Signed, no contract, the lead before Won → Move to Won')
ok(f({ status: 'Signed', leadStage: 'Won', at: NOW }).primary === null && f({ status: 'Signed', leadStage: 'Won', at: NOW }).lead === null, 'Signed, no contract, the lead Won → nothing to do, no "Next"')
ok(/signed for S\$77,900\.12/.test(f({ status: 'Signed', leadStage: 'Won', at: NOW, signedTotal: 'S$77,900.12' }).more ?? ''), 'Signed with edits since → the signed total in the longer words')
ok(f({ status: 'Sent to Client', variation: true, at: NOW }).primary === 'remind' && /approve the change/.test(f({ status: 'Sent to Client', variation: true, at: NOW }).text), 'A variation order with the client → Remind, "approve the change"')
const draft = reminderMessage({ clientFirst: 'Serena', studio: 'Demo Studio', number: 'OM-10007', link: 'https://x/confirm/abc', variation: false, validUntil: '28 Oct ’26' })
ok(/^Hi Serena, a gentle reminder on quote OM-10007 from Demo Studio: https:\/\/x\/confirm\/abc It stands until 28 Oct ’26\./.test(draft), 'the reminder draft: the client, the number, the studio, the link, the date it stands until')
ok(/variation order VO-1/.test(reminderMessage({ clientFirst: 'Ryan', studio: 'S', number: 'VO-1', link: 'l', variation: true, validUntil: null })), '…a variation order is named as one')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
