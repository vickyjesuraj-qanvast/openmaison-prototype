// The Dashboard redesigned (2026-10-26), lane D3 — the pure rules of the grid's cards: a project's health by rule (lib/dashboard/health.ts — his
// P-08 · Q-10 "On track, at risk or late, by rule from the schedule and the money"), the Pipeline's going-quiet count, Your day's order,
// its ring and a meeting's length, Team's caption, load bar and contractors' line (lib/dashboard/cards.ts). Each rule asserted as the rule it is.
// (the calm pass 2026-10-26 — lane C3, brief-calm.md) + the short fact a project's line says (its stuck rule, § 2.5, went 2026-10-27), Team's segments
// (`loadOf`), the head's count of Your day (`leftOf`), On site's groups (`siteGroups`).
// Run: npx tsx design-source/verify/dashboard-2026-10-26/dash-d3-health-pure.mts  (verify-dash-d3.cjs counts its ✓ / ✗ lines)
import { AT_RISK_DAYS, HEALTH_ORDER, aheadWords, byHealth, healthOf, pastWords, type HealthFacts, type HealthMilestone } from '../../../lib/dashboard/health'
import { MAX_SEGMENTS, agendaOrder, clock, contractorsWords, dotsOf, leftOf, lengthWords, loadOf, loadScale, pipelineLine, pipelineOf, projectsHead, ringWords, siteGroups, teamCaption, type AgendaItem, type SitePhoto } from '../../../lib/dashboard/cards'
import { dayOf } from '../../../lib/projects/schedule-model'

let pass = 0, fail = 0
const ok = (c: boolean, name: string) => { if (c) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const NOW = new Date(2026, 9, 26, 10, 0, 0).getTime()   // Mon 26 Oct 2026, 10:00
const T = dayOf(new Date(NOW))
const DAY = 86_400_000
const m = (o: Partial<HealthMilestone> & { title: string }): HealthMilestone => ({ id: o.title, status: 'not_started', start: T + 2, end: T + 10, waitingOn: null, ...o })
const facts = (o: Partial<HealthFacts>): HealthFacts => ({ stage: 'in_progress', hold: null, milestones: [], today: T, targetEnd: null, moreTime: [], money: null, profit: null, ...o })

// ── health: the order of the rule ──
console.log('health by rule')
const onTrack = healthOf(facts({ milestones: [m({ title: 'Hacking', status: 'done', start: T - 20, end: T - 12 }), m({ title: 'Carpentry', status: 'in_progress', start: T - 3, end: T + 3 }), m({ title: 'Painting', start: T + 4, end: T + 9 })] }))
ok(onTrack.health === 'on_track' && onTrack.line === 'On track · Carpentry ends Thu', `nothing past its day, nothing asked: on track, its line the running milestone's end ("${onTrack.line}")`)
ok(onTrack.progress.done === 1 && onTrack.progress.total === 3 && onTrack.progress.pct === 33, 'progress is done of all (the listing’s Progress, the done ones only)')
const nextStart = healthOf(facts({ milestones: [m({ title: 'Hacking', start: T + 7, end: T + 12 })] }))
ok(nextStart.health === 'on_track' && nextStart.line === `On track · Hacking starts ${aheadWords(T + 7, T)}`, `nothing running: what starts next ("${nextStart.line}")`)
ok(healthOf(facts({})).line === 'On track · no milestones yet', 'no schedule yet says so')
const oursLate = healthOf(facts({ milestones: [m({ title: 'Hacking', status: 'not_started', start: T - 6, end: T - 3 })] }))
ok(oursLate.health === 'late' && oursLate.line === `Late · Hacking not started · was due ${pastWords(T - 3, T)}`, `a milestone of ours past its last day, not started: late ("${oursLate.line}")`)
const runningLate = healthOf(facts({ milestones: [m({ title: 'Tiling', status: 'in_progress', start: T - 9, end: T - 2 })] }))
ok(runningLate.health === 'late' && /Tiling was due .* · 2 days late/.test(runningLate.line), `a running one past its day: late, by how much ("${runningLate.line}")`)
const waitsClient = healthOf(facts({ milestones: [m({ title: 'Tiling', status: 'blocked', start: T - 9, end: T - 2, waitingOn: 'client', waitingWho: 'Ryan' })] }))
ok(waitsClient.health === 'at_risk' && waitsClient.line.startsWith('At risk · Tiling waits on Ryan'), `past its day but waiting on the client: at risk, never red (S-05) ("${waitsClient.line}")`)
const waitsSupplier = healthOf(facts({ milestones: [m({ title: 'Doors', status: 'blocked', start: T - 9, end: T - 1, waitingOn: 'supplier' })] }))
ok(waitsSupplier.health === 'at_risk' && /waits on a supplier/.test(waitsSupplier.line), 'a supplier’s wait: at risk, named')
const target = healthOf(facts({ targetEnd: NOW - 4 * DAY, milestones: [m({ title: 'Handover', status: 'in_progress', start: T - 2, end: T + 5 })] }))
ok(target.health === 'late' && target.line === 'Late · 4 days past the target end', `the target end passed with no late milestone: late ("${target.line}")`)
const targetPlus = healthOf(facts({ targetEnd: NOW - 4 * DAY, milestones: [m({ title: 'Hacking', start: T - 6, end: T - 1 })] }))
ok(targetPlus.reasons.filter((r) => /target end/.test(r)).length === 0, 'a late milestone already says it: the target end is not said twice')
const bill = healthOf(facts({ money: { ours: [{ what: 'Woodcraft’s bill WB-12', days: 5 }], client: [] }, milestones: [m({ title: 'Carpentry', status: 'in_progress', start: T - 1, end: T + 6 })] }))
// (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-31) the record first, no possessive built onto a company's name: "Bill WB-12 from Woodcraft"
ok(bill.health === 'late' && bill.line === 'Late · Bill WB-12 from Woodcraft is 5 days overdue', `money of ours past its due day: late ("${bill.line}")`)
const owed = healthOf(facts({ money: { ours: [], client: [{ days: 6 }] }, milestones: [m({ title: 'Carpentry', status: 'in_progress', start: T - 1, end: T + 6 })] }))
ok(owed.health === 'at_risk' && owed.line === 'At risk · A client payment is 6 days overdue', `a client's payment past its day: at risk — theirs, not ours ("${owed.line}")`)
const twoOwed = healthOf(facts({ money: { ours: [], client: [{ days: 6 }, { days: 2 }] } }))
ok(twoOwed.line === 'At risk · 2 client payments overdue', `two of them counted ("${twoOwed.line}")`)
const more = healthOf(facts({ moreTime: ['Carpentry fabrication'], milestones: [m({ title: 'Carpentry fabrication', status: 'in_progress', start: T - 1, end: T + 6 })] }))
ok(more.health === 'at_risk' && more.line === 'At risk · More time asked on Carpentry fabrication', `an ask for more time still open: at risk ("${more.line}")`)
const soon = healthOf(facts({ milestones: [m({ title: 'Electrical', start: T - 1, end: T + AT_RISK_DAYS })] }))
ok(soon.health === 'at_risk' && soon.line === `At risk · Electrical ends ${aheadWords(T + AT_RISK_DAYS, T)} · not started`, `ending within ${AT_RISK_DAYS} days and not started: at risk ("${soon.line}")`)
const notSoon = healthOf(facts({ milestones: [m({ title: 'Electrical', start: T + 1, end: T + AT_RISK_DAYS + 1 })] }))
ok(notSoon.health === 'on_track', `…a day further out: on track`)
const graded = (tier: 'healthy' | 'tight' | 'at_risk', marginPct: number) => healthOf(facts({ profit: { state: 'graded', tier, marginPct } }))
ok(graded('at_risk', 6).line === 'At risk · Costs leave under a tenth of the contract' && graded('at_risk', -3).line === 'At risk · Costs are over the contract', 'costs past the contract’s share: the books’ own At risk grade, a loss said as one')
ok(graded('tight', 15).health === 'on_track' && healthOf(facts({ profit: { state: 'early', tier: null, marginPct: 90 } })).health === 'on_track', 'a Tight margin or an early estimate is no risk')
/* (the calm pass 2026-10-26) the card's one line says the first reason short, without the health word (the state word says it) */
ok(runningLate.fact === 'Tiling 2 days late' && oursLate.fact === 'Hacking not started · 3 days late', `a late milestone's fact, short ("${runningLate.fact}" · "${oursLate.fact}")`)
ok(bill.fact === 'Bill WB-12 from Woodcraft — 5 days overdue' /* (the calm UI build 2026-10-27, a deliberate change) */ && waitsClient.fact === 'Tiling waits on Ryan' && owed.fact === 'A client payment 6 days overdue', `money and waits, short ("${bill.fact}" · "${waitsClient.fact}")`)
ok(onTrack.fact === 'Carpentry ends Thu' && healthOf(facts({})).fact === 'No milestones yet', `on track: the next fact, capitalised ("${onTrack.fact}")`)
ok(healthOf(facts({ hold: { line: 'Resumes 16 Nov ’26' } })).fact === 'Resumes 16 Nov ’26' && healthOf(facts({ stage: 'setting_up', setupNext: '3 things left to set up' })).fact === '3 things left to set up', 'on hold says when it resumes; setting up what is left')
const both = healthOf(facts({ moreTime: ['Tiling'], milestones: [m({ title: 'Hacking', start: T - 6, end: T - 3 })] }))
ok(both.health === 'late' && both.reasons.length === 2 && both.reasons[1] === 'More time asked on Tiling', 'late wins; its reasons keep the at-risk ones after, worst first')
const hold = healthOf(facts({ hold: { line: 'Resumes 16 Nov ’26' }, milestones: [m({ title: 'Hacking', start: T - 6, end: T - 3 })] }))
ok(hold.health === 'on_hold' && hold.line === 'On hold · resumes 16 Nov ’26', `on hold says so, whatever else is true — its reasons rest ("${hold.line}")`)
const setup = healthOf(facts({ stage: 'setting_up', setupNext: '3 things left to set up' }))
ok(setup.health === 'setting_up' && setup.line === 'Setting up · 3 things left to set up', `setting up says so ("${setup.line}")`)
const order = [{ health: 'on_hold' as const, client: 'A' }, { health: 'on_track' as const, client: 'B' }, { health: 'late' as const, client: 'C' }, { health: 'setting_up' as const, client: 'D' }, { health: 'at_risk' as const, client: 'E' }].sort(byHealth).map((x) => x.health)
ok(order.join(',') === 'late,at_risk,on_track,setting_up,on_hold' && HEALTH_ORDER.late === 0, `the card's order: late · at risk · on track · setting up · on hold (${order.join(' · ')})`)
ok(aheadWords(T, T) === 'today' && aheadWords(T + 1, T) === 'tomorrow' && /^\d+ [A-Z][a-z]{2}$/.test(aheadWords(T + 9, T)) && pastWords(T - 1, T) === 'yesterday' && /^\d+ [A-Z][a-z]{2}$/.test(pastWords(T - 3, T)), 'days in words: today · tomorrow · a weekday this week · "4 Nov" further; behind, yesterday or its date — never a bare weekday')

// ── Pipeline ── (2026-10-27, a deliberate change — his "take a call from our 2.0 consistency pov": the card's own stuck rule is gone; its
// one fact under the bars is Sales' Going quiet)
console.log('pipeline')
const lead = (stage: string, inStage: number, lastContact: number | null = 1) => ({ stage, createdAt: NOW - (inStage + 2) * DAY, lastContactAt: lastContact === null ? null : NOW - lastContact * DAY })
const pl = pipelineOf([lead('New', 2), lead('New', 15), lead('Contacted', 3, 40), lead('Met', 14), lead('Quote Sent', 30), lead('Won', 90), lead('On Hold', 50, 60), lead('Lost', 90, 90)], NOW, { quietDays: 30, href: (s) => `/leads?scope=${s}`, listHref: '/leads', quietHref: '' })!
ok(pl.stages.map((s) => s.stage).join(',') === 'New,Contacted,Met,Quote Sent,Won', 'the journey New → Won; On Hold and Lost wait outside it')
ok(pl.stages[0]!.count === 2 && pl.max === 2, 'each stage its count; the bars run to the largest')
ok(pl.quiet === 1, `going quiet = an open lead being worked with no contact for over 30 days — On Hold waits for its day (${pl.quiet})`)
ok(!('stuck' in pl) && pl.stages.every((s) => !('stuck' in s)), 'no stuck count of the card’s own — no other page knows one')
ok(pipelineLine(pl).quiet === '1 going quiet' && pipelineLine(pl).none === null && pipelineLine({ quiet: 0 }).none === 'Nothing going quiet' && pipelineLine({ quiet: 0 }).quiet === null, 'the line under the bars: "n going quiet", or that nothing is')
ok(pl.open === 5, `the head's fact: the leads in the open stages drawn — On Hold waits outside (${pl.open})`)
ok(pipelineOf([lead('Lost', 3)], NOW, { quietDays: 30, href: () => '', listHref: '', quietHref: '' }) === null, 'no lead on the journey: no card')

// ── Your day ──
console.log('your day')
const it = (o: Partial<AgendaItem>): AgendaItem => ({ key: Math.random().toString(36), kind: 'task', day: T, title: 'x', href: '/', icon: 'task_alt', ...o })
const day = [it({ title: 'Install', kind: 'milestone' }), it({ title: '2 PM meeting', kind: 'meeting', time: '2:00 PM' }), it({ title: 'Late task', late: true }), it({ title: '10 AM visit', kind: 'meeting', time: '10:00 AM' }), it({ title: 'Tomorrow', day: T + 1, time: '9:00 AM' })].sort(agendaOrder).map((x) => x.title)
ok(day.join(' | ') === 'Late task | 10 AM visit | 2 PM meeting | Install | Tomorrow', `a day's order: ours and late first, then the clock, then the untimed (${day.join(' · ')})`)
ok(clock('2:00 PM') === 14 * 60 && clock('12:30 AM') === 30 && clock('12:00 PM') === 12 * 60, 'the clock reads AM / PM')
ok(lengthWords(NOW, NOW + 45 * 60_000) === '45 min' && lengthWords(NOW, NOW + 90 * 60_000) === '1 h 30 min' && lengthWords(NOW, null) === '1 h', 'a meeting’s length: "45 min" · "1 h 30 min" · the one-hour default')
ok(ringWords(2, 5) === '2 of 5 done' && ringWords(0, 0) === '', 'the ring’s words; nothing today — no ring')
ok(dotsOf(0) === 0 && dotsOf(2) === 2 && dotsOf(9) === 3, 'a day draws its count in dots, three at most')

// ── Team ──
console.log('team')
// (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-33, W-461) "active leads" (was "open leads")
ok(teamCaption({ openLeads: 3, accepting: true }) === '3 active leads' && teamCaption({ openLeads: 1, accepting: false }) === '1 active lead · closed to new leads' && teamCaption({ openLeads: 0, accepting: true }) === 'No active leads', 'a member’s caption: active leads, and only a closed door said')
const sc = loadScale(5, 4)
ok(sc.fill === 80 && sc.mark === 64 && loadScale(1, 4).mark === 80 && loadScale(1, 4).fill === 20, 'a load bar runs to the larger of load and capacity with room past it — over capacity shows past the tick')
ok(loadScale(1, 4, 5).mark === 64 && loadScale(5, 4, 5).fill === 80, 'one scale for the card: a member’s tick and fill read against the card’s largest')
// (the calm pass 2026-10-26, a deliberate change) the line drops "starting with no contractor" — Needs you's `crew-gap` row says it (one place for each thing)
// (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-33, W-502) "4 free this week, 1 overbooked"
ok(contractorsWords({ contractors: 4, freeNow: 3, over: 1 }) === '3 free this week, 1 overbooked' && contractorsWords({ contractors: 2, freeNow: 2, over: 0 }) === '2 free this week', 'the contractors’ line — S45B’s tile’s words')
ok(contractorsWords({ contractors: 0, freeNow: 0, over: 0 }) === 'None yet — mark the vendors who work on site', '…and with none yet, the way to mark them')
/* (the calm pass 2026-10-26) Team load's segments: one per project a member can carry */
const seg = (n: number, c: number) => loadOf(n, c).segments.join('')
// (the calm UI build 2026-10-27, a deliberate change) (the audit's 1-33, W-462) the figures in words: "2 of 3 projects", "Full (2 of 2)", "0 of 4 projects"
ok(seg(2, 3) === 'filledfilledempty' && loadOf(2, 3).figure === '2 of 3 projects' && !loadOf(2, 3).full, `under capacity: "2 of 3 projects", one segment per project they can carry (${seg(2, 3)})`)
ok(loadOf(2, 2).figure === 'Full (2 of 2)' && loadOf(2, 2).full && seg(2, 2) === 'filledfilled', 'at capacity: "Full (2 of 2)"')
ok(loadOf(4, 3).figure === '1 over' && loadOf(4, 3).over && seg(4, 3) === 'filledfilledfilledover', 'over capacity: the segments run on past it, the one past it amber — Workload’s "1 over"')
ok(loadOf(0, 4).figure === '0 of 4 projects' /* (the calm UI build 2026-10-27, a deliberate change) */ && loadOf(0, 0).segments.length === 1 && loadOf(20, 12).segments.length === MAX_SEGMENTS, `nothing carried reads 0; a large capacity is ${MAX_SEGMENTS} segments, never slivers`)

// ── (the calm pass 2026-10-26) the heads' counts, On site's groups ──
console.log('heads and groups')
ok(leftOf([{ done: true }, { ended: true }, {}, {}]) === 2, 'Your day’s count: what is still ahead on the day shown — not ticked, not over')
ok(projectsHead({ running: 4, late: 2 }) === '4 running · 2 late' && projectsHead({ running: 3, late: 0 }) === '3 running', 'Projects’ head: "4 running · 2 late", the late part only when there is one')
const ph = (key: string, update: string): SitePhoto => ({ key, update, src: '/x.jpg', alt: '', caption: '', href: '/', title: update, where: 'Ben', when: 'today', photos: 2 })
ok(siteGroups([ph('a', 'u1'), ph('b', 'u1'), ph('c', 'u2')]).map((g) => `${g.update}:${g.photos.length}`).join(' ') === 'u1:2 u2:1', 'an update’s photos sit together under one caption, in order')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
