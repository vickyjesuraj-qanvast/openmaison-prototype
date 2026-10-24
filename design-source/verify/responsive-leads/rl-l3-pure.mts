// Leads on the move, L3 — the pure words and rules of the listing and the ways a lead arrives: the phone card's Last · Next · Lost lines and its
// WhatsApp link (components/leads/lead-card-words.ts), the Tasks sheet's due presets (lib/leads/quick-due.ts), the "to call today" scope
// (lib/leads/filters.ts `isCallTodayLead`, the address keeps it — lib/leads/listing-url.ts), the tablet's default columns (components/leads/table.tsx
// TABLET_COLUMNS), and a pasted WhatsApp message read into a new lead (lib/leads/message-fill.ts).
// Run: npx tsx design-source/verify/responsive-leads/rl-l3-pure.mts  (verify-rl-l3.cjs counts its ✓ / ✗ lines)
import { cardLines, dueWhen, nextTask, parked, pastWhen, waHref } from '../../../components/leads/lead-card-words'
import { DUE_PRESETS, PRESET_HOUR, presetDue } from '../../../lib/leads/quick-due'
import { ATTENTION_LABEL, inAttention, isCallTodayLead, isOverdueLead } from '../../../lib/leads/filters'
import { readListing, writeListing } from '../../../lib/leads/listing-url'
import { readLeadMessage } from '../../../lib/leads/message-fill'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const DAY = 86_400_000
const NOW = new Date(2026, 9, 23, 11, 0, 0).getTime()   // Fri 23 Oct 2026, 11:00
const at = (days: number, h = 10, m = 0) => { const d = new Date(NOW); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, h, m, 0, 0) }
type Row = Parameters<typeof cardLines>[0] & { assignees: { id: string }[]; seenAt: Date | null }
const task = (dueAt: Date | null, title = 'Call back') => ({ id: Math.random().toString(36), title, dueAt }) as unknown as Row['tasks'][number]
const row = (o: Partial<Row>): Row => ({ stage: 'Contacted', lastContact: null, tasks: [], onHoldFollowUp: null, stageSince: at(-4), parked: null, assignees: [{ id: 'm1' }], seenAt: new Date(NOW), ...o } as Row)

// ── the card's lines ──
const fresh = cardLines(row({ stage: 'New' }), NOW)
ok(fresh.length === 1 && fresh[0]!.label === 'Last' && fresh[0]!.text === 'Not contacted yet', 'a lead nobody has spoken to: "Last  Not contacted yet", no Next line')
const called = cardLines(row({ lastContact: { at: at(-4, 16, 10), channel: 'Call', outcome: 'Callback requested' }, tasks: [task(at(1))] }), NOW)
ok(called[0]!.text === 'Call · Callback requested · Mon', `Last: the channel · outcome · the day ("${called[0]!.text}")`)
ok(called[1]!.label === 'Next' && called[1]!.text === 'Tomorrow 10:00 AM' && !called[1]!.late, `Next: the earliest follow-up's day and time ("${called[1]!.text}")`)
const late = cardLines(row({ tasks: [task(at(-3))] }), NOW)
ok(late[1]!.late === true && late[1]!.text === '20 Oct · 3 days late', `a late follow-up reads by its day and how late, red ("${late[1]!.text}") — never a bare "Tue" that reads as next week`)
ok(cardLines(row({ tasks: [task(null)] }), NOW).length === 1, 'an undated task gives no Next line (the task box names it)')
ok(pastWhen(at(0, 9, 5), NOW) === 'Today 9:05 AM' && pastWhen(at(-1), NOW) === 'Yesterday' && pastWhen(at(-20), NOW) === '3 Oct', 'the Last day: Today h:mm · Yesterday · the weekday · "3 Oct"')
ok(dueWhen(at(3), NOW) === 'Mon 10:00 AM' && dueWhen(at(12, 0, 0), NOW) === '4 Nov', 'the Next day: this coming week by weekday, later by date (a date-only due has no time)')
const lost = cardLines(row({ stage: 'Lost', stageSince: at(-51), parked: { reason: 'Others: moved overseas', competitor: 'Studio Lim' } }), NOW)
ok(lost.length === 1 && lost[0]!.label === 'Lost' && lost[0]!.text === '51 days ago · moved overseas · went with Studio Lim', `a Lost card says why and when ("${lost[0]!.text}")`)
const hold = cardLines(row({ stage: 'On Hold', onHoldFollowUp: at(20).toISOString() }), NOW)
ok(hold[1]!.text === 'Follow up on 12 Nov' && !hold[1]!.late, `an On Hold card names its follow-up ("${hold[1]!.text}")`)
ok(parked({ stage: 'Lost' }) && parked({ stage: 'On Hold' }) && !parked({ stage: 'Met' }), 'a parked lead wears no Overdue tag (its follow-ups wait)')
ok(waHref('91234567') === 'https://wa.me/6591234567' && waHref('+65 9123 4567') === 'https://wa.me/6591234567' && waHref('') === null, 'WhatsApp opens wa.me with the Singapore number; no number, no link')
ok(nextTask(row({ tasks: [task(null, 'a'), task(at(2), 'b')] }))?.title === 'b', 'Next is the first DATED task')

// ── the due presets ──
const t = presetDue('tomorrow', NOW), three = presetDue('in3', NOW), week = presetDue('nextWeek', NOW)
ok(t.getDate() === at(1).getDate() && t.getHours() === PRESET_HOUR && t.getMinutes() === 0, 'Tomorrow 10:00 AM is tomorrow at ten')
ok(three.getTime() === at(3).getTime(), 'In 3 days is three days on, at ten')
ok(week.getDay() === 1 && week.getTime() > NOW && week.getTime() - NOW <= 8 * DAY, 'Next week is the coming Monday at ten')
ok(presetDue('nextWeek', at(-4, 9).getTime()).getTime() - at(-4, 9).getTime() >= 6 * DAY, 'asked on a Monday, Next week is the Monday after')
ok(DUE_PRESETS.map((p) => p.label).join(' · ') === 'Tomorrow 10:00 AM · In 3 days · Next week', 'the three presets, in the brief\'s order')

// ── to call today ──
const ctx = { now: NOW, viewerId: 'm1', unseen: () => false }
ok(isCallTodayLead(row({ tasks: [task(at(0, 15))] }), NOW) && isCallTodayLead(row({ tasks: [task(at(-2))] }), NOW), 'due today or late → to call today')
ok(!isCallTodayLead(row({ tasks: [task(at(1))] }), NOW), 'tomorrow is not today')
ok(!isCallTodayLead(row({ stage: 'Lost', tasks: [task(at(-2))] }), NOW) && !isCallTodayLead(row({ stage: 'On Hold', tasks: [task(at(0))] }), NOW), 'parked and Lost leads wait (the Overdue rule)')
ok(inAttention(row({ tasks: [task(at(0))] }) as never, 'today', ctx) && !isOverdueLead(row({ tasks: [task(at(0, 15))] }) as never, NOW), 'the scope holds today\'s calls, which are not yet overdue')
ok(ATTENTION_LABEL.today === 'To call today', 'the pill names the scope "To call today"')
const back = readListing(new URLSearchParams(writeListing({ stage: null, attention: 'today', query: '', filters: { sort: 'newest', quick: [], propertyTypes: [], sources: [], assignees: [], datePreset: null, from: '', to: '' }, sort: null }, '')), (k): k is string => k === 'name')
ok(back.attention === 'today', 'the address keeps "to call today" (Back from a lead lands on it)')

// ── a pasted message ──
const ctxF = { sources: ['Instagram', 'Website', 'Referral'], ownEmails: ['dane@demostudio.sg'], ownPhones: ['91110000'], memberNames: ['Dane', 'Sarah'] }
const m1 = readLeadMessage("Hi, I'm Rachel Ong. Looking to renovate my 4-room HDB at Blk 123 Bedok North Ave 1 #08-12. Call me at 9334 1209 or rachel.ong@gmail.com", ctxF)
ok(m1.ok && m1.fill.name === 'Rachel Ong' && m1.fill.phone === '93341209' && m1.fill.email === 'rachel.ong@gmail.com', `a first-person message: the name, the mobile, the email (${JSON.stringify(m1.ok ? m1.fill : m1)})`)
ok(m1.ok && m1.fill.propertyAddress === 'Blk 123 Bedok North Ave 1 #08-12', 'the address inside a sentence, from the block to the unit')
ok(m1.ok && m1.fill.propertyType === 'HDB 4-Room', 'the home named with its size')
const m2 = readLeadMessage('[23/10/26, 10:15:12 AM] Kelvin Tan: Hello, saw your Instagram, want to do up my condo\n[23/10/26, 10:16:02 AM] Dane: Sure! What is your number?\n[23/10/26, 10:17:40 AM] Kelvin Tan: 8123 4567', ctxF)
ok(m2.ok && m2.fill.name === 'Kelvin Tan' && m2.fill.phone === '81234567', 'a copied chat: the sender is the name (never the studio\'s own reply)')
const m3 = readLeadMessage('ok see you then', ctxF)
ok(!m3.ok, 'a message with no client details fills nothing (it is said, never guessed)')
const m4 = readLeadMessage("Hi, I'm looking for a designer for my 5-room. 9001 2345", ctxF)
ok(m4.ok && !m4.fill.name, '"I\'m looking" is not a name')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
