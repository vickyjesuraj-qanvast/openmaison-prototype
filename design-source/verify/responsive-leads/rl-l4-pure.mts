// Leads on the move, L4 — the pure words: a task's due chip and presets (components/leads/tasks/task-card-words.ts), the Activity feed by day
// with its folded runs (components/leads/activity/activity-days.ts). Run: npx tsx design-source/verify/responsive-leads/rl-l4-pure.mts
import { DUE_PRESETS, dueChip, pickedLabel, presetDate, presetOf, shortDay } from '../../../components/leads/tasks/task-card-words'
import { dayLabel, feedDays, foldKey, runWords } from '../../../components/leads/activity/activity-days'

let pass = 0, fail = 0
const ok = (cond: boolean, name: string) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }

// a Friday, 23 Oct 2026, 15:00 local
const NOW = new Date(2026, 9, 23, 15, 0).getTime()
const at = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m)

// ── due chip ──
ok(dueChip(null, false, NOW) === null, 'no date: no chip')
ok(dueChip(at(23, 10), false, NOW)?.text === 'Today · 10:00 AM' && dueChip(at(23, 10), false, NOW)?.tone === 'today', 'today keeps its time, toned today')
ok(dueChip(at(24, 10), false, NOW)?.text === 'Tomorrow · 10:00 AM', 'tomorrow says so')
ok(dueChip(at(19), false, NOW)?.text === 'Mon 19 Oct · late' && dueChip(at(19), false, NOW)?.tone === 'late', 'a past day is late, red, its day named')
ok(dueChip(at(19), true, NOW)?.tone === 'done', 'a completed task is never late')
ok(dueChip(at(29, 14, 30), false, NOW)?.text === 'Thu 29 Oct · 2:30 PM', 'a later day: the short day and its time')
ok(dueChip(at(29), false, NOW)?.text === 'Thu 29 Oct', 'a date with no time stays a date')
ok(shortDay(at(26)) === 'Mon 26 Oct' && shortDay(at(26), NOW) === 'Mon 26 Oct', 'the short day has no comma, and no year in this year')
ok(shortDay(new Date(2027, 0, 7), NOW) === 'Thu 7 Jan ’27' && dueChip(new Date(2027, 0, 7, 9), false, NOW)?.text === 'Thu 7 Jan ’27 · 9:00 AM', 'another year names its year')
ok(dueChip(at(19, 10), false, NOW)?.text === 'Mon 19 Oct · 10:00 AM · late', 'a late task keeps its hour (Dane UAT 5.13) and says late')

// ── presets ──
ok(DUE_PRESETS.map((p) => p.label).join(' · ') === 'Tomorrow 10:00 · In 3 days · Next week', 'the presets in the brief’s order and words')
ok(presetDate('tomorrow', NOW).getTime() === at(24, 10).getTime(), 'Tomorrow 10:00 is tomorrow at ten')
ok(presetDate('in3', NOW).getTime() === at(26, 10).getTime(), 'In 3 days is three days on at ten')
ok(presetDate('nextWeek', NOW).getTime() === at(26, 10).getTime(), 'Next week is the coming Monday at ten')
const MONDAY = new Date(2026, 9, 26, 9).getTime()
ok(presetDate('nextWeek', MONDAY).getTime() === new Date(2026, 10, 2, 10).getTime(), 'a Monday’s next week is the Monday after')
ok(presetOf(at(24, 10), NOW) === 'tomorrow' && presetOf(at(24, 11), NOW) === null, 'a preset is lit only on its exact moment')
ok(pickedLabel(null, NOW) === 'Pick a day' && pickedLabel(at(24, 10), NOW) === 'Pick a day', 'Pick a day until a calendar day is picked')
ok(pickedLabel(at(30, 9), NOW) === 'Fri 30 Oct · 9:00 AM', 'then it names the day picked')

// ── the feed by day ──
ok(dayLabel(at(23, 9), NOW) === 'Today' && dayLabel(at(22, 9), NOW) === 'Yesterday' && dayLabel(at(20, 9), NOW) === 'Tue 20 Oct', 'Today · Yesterday · the day')
ok(dayLabel(new Date(2025, 9, 20), NOW) === 'Mon 20 Oct ’25', 'another year names its year')
type Ev = { id: string; at: Date; icon: string; text: string; actor: string; link?: { label: string; href: string }; group?: 'files' }
const up = (i: number, name: string, h: number): Ev => ({ id: `f${i}`, at: at(22, h, i), icon: 'image', text: `James uploaded the file “${name}”.`, actor: 'James', link: { label: 'See', href: `/f/${i}` }, group: 'files' })
const ten = Array.from({ length: 10 }, (_, i) => up(10 - i, 'Q-101', 11))
ok(foldKey(ten[0]!) === foldKey(ten[9]!), 'the same thing by the same person folds, whatever its name')
ok(runWords(ten) === 'James uploaded 10 files.', '"James uploaded 10 files." — the plural of the thing')
const same: Ev[] = [1, 2, 3].map((i) => ({ id: `c${i}`, at: at(22, 10, i), icon: 'comment', text: 'Dane commented on the task “Call back”.', actor: 'Dane', link: { label: 'See', href: '/t/1' } }))
ok(runWords(same) === 'Dane commented on the task “Call back” — 3 times.', 'the same record three times says so')
const done3: Ev[] = ['A', 'B', 'C'].map((t, i) => ({ id: `d${i}`, at: at(22, 9, i), icon: 'task', text: `The task “${t}” was completed.`, actor: 'Dane', link: { label: 'See', href: `/t/${t}` } }))
ok(runWords(done3) === '3 tasks were completed.', '"The task “X” was completed." ×3 → "3 tasks were completed."')
ok(feedDays(ten.slice(0, 2), NOW).days[0]!.items.length === 2, 'two of the same thing stay two lines — a run folds from three')
const mixed = [...ten.slice(0, 3), { id: 'x', at: at(22, 9), icon: 'task', text: 'Dane created the task “Measure”.', actor: 'Dane' } as Ev, { id: 'y', at: at(20, 9), icon: 'task', text: 'Dane created the task “Order”.', actor: 'Dane' } as Ev]
const feed = feedDays(mixed, NOW)
ok(feed.days.length === 2 && feed.days[0]!.label === 'Yesterday' && feed.days[1]!.label === 'Tue 20 Oct', 'days in order, newest first')
ok(feed.days[0]!.items[0]!.kind === 'run' && feed.days[0]!.items.length === 2, 'a run folds; a different line stays its own')
ok(feed.days[1]!.items[0]!.kind === 'one', 'the same words on another day never join yesterday’s run')
const long = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, at: at(22, 8, i), icon: 'x', text: `Line ${i} by ${i % 2 ? 'Dane' : 'Sarah'}.`, actor: i % 2 ? 'Dane' : 'Sarah' }) as Ev)
const page1 = feedDays(long, NOW, 20)
ok(page1.shown === 20 && page1.total === 30, 'the newest 20 first, then Show older')

console.log(`rl-l4-pure: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
