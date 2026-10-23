// Quotes on the move · K4 — the pure rules behind the phone card (components/leads/quotes/quote-card-words.ts) and the tablet default set
// (components/om/table-columns.ts). Run by verify-rq-k4.cjs through tsx; every line is a rule, never a count from one round of data.
import { readFileSync } from 'node:fs'
import { cardChip, sinceWords, remindMessage, whenWord, canRemind } from '../../../components/leads/quotes/quote-card-words'
import { tabletDefaultColumns, defaultColumns, type TableColumnDef } from '../../../components/om/table-columns'
/* the table's defs, read from its source (the module pulls CSS modules in, which node can't load): every `{ key: '…', … }` row of QUOTE_COLUMN_DEFS */
const src = readFileSync(new URL('../../../components/leads/quotes/quotes-table.tsx', import.meta.url), 'utf8')
const defsStart = src.indexOf('= [', src.indexOf('export const QUOTE_COLUMN_DEFS'))
const defsText = src.slice(defsStart, src.indexOf('\n]', defsStart))
const QUOTE_COLUMN_DEFS: TableColumnDef[] = [...defsText.matchAll(/\{\s*key:\s*'([a-z]+)'[^}]*\}/g)].map((m) => ({ key: m[1]!, label: m[1]!, track: 'auto', locked: /locked:\s*true/.test(m[0]), tabletHidden: /tabletHidden:\s*true/.test(m[0]) }))

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const DAY = 86_400_000
const now = new Date(2026, 9, 22, 10, 0).getTime()   // Thu 22 Oct 2026
const d = (days: number) => new Date(now + days * DAY)
const base = { id: 'q', number: 'OM-1', title: 'T', visibility: 'Shared', amountMinor: 100, createdAt: d(-20), updatedAt: d(-1), dueAt: null, validUntil: null, sentAt: null, clientSentAt: null, clientLastViewedAt: null, confirmedAt: null, signedAt: null, approvedAt: null, submittedAt: null } as any
const q = (o: Record<string, unknown>) => ({ ...base, ...o }) as any
const words = (o: Record<string, unknown>) => sinceWords(q(o), now).map((w) => w.text).join(' · ')

console.log('pure · the chip')
ok(cardChip(q({ status: 'Draft' }), now).label === 'Draft' && cardChip(q({ status: 'Draft' }), now).color === 'default', 'a Draft wears a plain chip')
ok(cardChip(q({ status: 'Sent to Client', clientSentAt: d(-3) }), now).color === 'blue', 'Sent to client wears the "went out" blue')
ok(cardChip(q({ status: 'Signed' }), now).color === 'green' && cardChip(q({ status: 'Confirmed' }), now).color === 'green', 'Confirmed and Signed wear green')
const expired = cardChip(q({ status: 'Sent to Client', clientSentAt: d(-30), validUntil: d(-2) }), now)
ok(expired.expired && expired.color === 'yellow' && /^Expired /.test(expired.label), 'out with the client past its Valid until → "Expired {date}" in yellow')
ok(!cardChip(q({ status: 'Confirmed', clientSentAt: d(-30), validUntil: d(-2) }), now).expired, 'a Confirmed quote never reads Expired')

console.log('pure · the since')
ok(words({ status: 'Draft', updatedAt: d(0) }) === 'edited today' && words({ status: 'Draft', updatedAt: d(-1) }) === 'edited yesterday', 'a Draft says when it was edited (today · yesterday)')
ok(/^edited \d+ \w+ ’\d\d$/.test(words({ status: 'Draft', updatedAt: d(-9) })), '…and the date further back')
ok(/^for approval since /.test(words({ status: 'Sent for Approval', submittedAt: d(-2) })), 'Sent for Approval says since when')
ok(words({ status: 'Approved', approvedAt: d(-4) }).includes('not sent'), 'Approved and never sent says "not sent"')
ok(/^sent .* · not opened/.test(words({ status: 'Sent to Client', clientSentAt: d(-3) })), 'sent, not yet opened: "sent {date} · not opened"')
ok(/^opened /.test(words({ status: 'Sent to Client', clientSentAt: d(-3), clientLastViewedAt: d(-1) })), 'opened since the send: "opened {date}" leads')
ok(words({ status: 'Sent to Client', clientSentAt: d(-3), clientLastViewedAt: d(-1), validUntil: d(4) }).endsWith('expires in 4 days'), '…then "expires in n days" inside two weeks')
ok(words({ status: 'Sent to Client', clientSentAt: d(-3), validUntil: d(0) }).endsWith('expires today'), '"expires today" on the day')
ok(/valid until /.test(words({ status: 'Sent to Client', clientSentAt: d(-3), validUntil: d(40) })), '"valid until {date}" further out')
ok(!/expires|valid until/.test(words({ status: 'Sent to Client', clientSentAt: d(-30), validUntil: d(-2) })), 'past its Valid until the chip says Expired — the line does not repeat it')
ok(words({ status: 'Sent to Client', clientSentAt: d(-3), dueAt: d(-1) }).includes('due ') && sinceWords(q({ status: 'Sent to Client', clientSentAt: d(-3), dueAt: d(-1) }), now).some((w) => w.tone === 'red'), 'a late follow-up reads red')
ok(!words({ status: 'Sent to Client', clientSentAt: d(-3), validUntil: d(4), dueAt: d(2) }).includes('due '), 'a follow-up not yet due stays off a line that already names the next date')
ok(words({ status: 'Confirmed', confirmedAt: d(-2) }).startsWith('confirmed ') && words({ status: 'Signed', signedAt: d(-2) }).startsWith('signed '), 'Confirmed / Signed say their day')
ok(sinceWords(q({ status: 'Sent to Client', clientSentAt: d(-3), validUntil: d(4), dueAt: d(-1) }), now).length <= 3, 'never more than three pieces')
ok(whenWord(d(0), now) === 'today', 'whenWord: today')

console.log('pure · Remind')
ok(canRemind(q({ status: 'Sent to Client', clientSentAt: d(-3) })) && !canRemind(q({ status: 'Draft' })) && !canRemind(q({ status: 'Signed', clientSentAt: d(-3) })), 'Remind only while the client holds the quote unanswered')
const m = remindMessage({ clientFirst: 'Serena', studio: 'Demo Studio', number: 'OM-10007', link: 'https://x/confirm/t' })
ok(m.startsWith('Hi Serena') && m.includes('OM-10007') && m.includes('https://x/confirm/t') && !/undefined|null/.test(m), 'the nudge names the client, the quote and the link')

console.log('pure · the tablet default set')
const tab = tabletDefaultColumns(QUOTE_COLUMN_DEFS).filter((c) => c.visible).map((c) => c.key)
ok(tab.join(' ') === 'title client status total due', `a touch tablet opens with Title · Client · Status · Total · Due (${tab.join(' · ')})`)
ok(defaultColumns(QUOTE_COLUMN_DEFS).filter((c) => c.visible).length === QUOTE_COLUMN_DEFS.length, 'the desk keeps every column by default')
ok(tabletDefaultColumns(QUOTE_COLUMN_DEFS).find((c) => c.key === 'title')?.pinned === true, 'Title stays pinned on a tablet')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
