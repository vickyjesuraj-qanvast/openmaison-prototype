// Activity by date (2026-10-24, lane A) — the pure rules: a line's type glyph (lib/leads/activity-glyph.ts), the quote trail's glyphs
// (lib/quotes/activity.ts QUOTE_GLYPH), the day's words (components/leads/activity/activity-days.ts), and every glyph name inside the icon
// subset (public/fonts/ICONS.txt — a name outside it renders as the word). Run: npx tsx design-source/verify/responsive-all/rwd-a-pure.mts
import fs from 'node:fs'
import path from 'node:path'
import { CONTACT_LOG_GLYPH, KIND_GLYPH, activityGlyph } from '../../../lib/leads/activity-glyph'
import { QUOTE_GLYPH } from '../../../lib/quotes/activity'
import { dayLabel, feedDays } from '../../../components/leads/activity/activity-days'

let pass = 0, fail = 0
const ok = (cond: boolean, name: string) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const ICONS = new Set(fs.readFileSync(path.join(REPO, 'public/fonts/ICONS.txt'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean))

// ── the four kinds wear their kind's icon, whatever the line's own ──
ok(KIND_GLYPH.tasks === 'task_alt' && KIND_GLYPH.files === 'folder' && KIND_GLYPH.notes === 'sticky_note_2' && KIND_GLYPH.stage === 'swap_horiz', 'the kinds: Tasks task_alt · Files folder · Notes sticky_note_2 · Stage swap_horiz')
ok(activityGlyph({ icon: 'ballot', group: 'tasks' }) === 'task_alt' && activityGlyph({ icon: 'comment', group: 'tasks' }) === 'task_alt', 'a task line — made, done, commented on — wears Tasks’ icon')
ok(activityGlyph({ icon: 'image', group: 'files' }) === 'folder' && activityGlyph({ icon: 'delete', group: 'files' }) === 'folder' && activityGlyph({ icon: 'wand_shine', group: 'files' }) === 'folder', 'a file line — an upload, a trash, a render saved — wears Files’ folder')
ok(activityGlyph({ icon: 'sticky_note_2', group: 'notes' }) === 'sticky_note_2' && activityGlyph({ icon: 'delete', group: 'notes' }) === 'sticky_note_2', 'a note line wears the note')
ok(activityGlyph({ icon: CONTACT_LOG_GLYPH, group: 'notes' }) === 'call_log', 'a contact log keeps its call_log (REG-278: one entity, one mark)')
ok(activityGlyph({ icon: 'swap_horiz', group: 'stage' }) === 'swap_horiz' && activityGlyph({ icon: 'business_center', group: 'stage' }) === 'swap_horiz' && activityGlyph({ icon: 'content_copy', group: 'stage' }) === 'swap_horiz', 'a stage line — a move, the project made, a duplicate — wears Stage’s')
ok(activityGlyph({ icon: 'scan' }) === 'scan' && activityGlyph({ icon: 'docs' }) === 'docs' && activityGlyph({ icon: 'payments', group: 'money' }) === 'payments' && activityGlyph({ icon: 'help', group: null }) === 'help', 'every other line wears its own event’s icon (a project’s Money line too)')

// ── every name the feed can draw is inside the subset ──
const kinds = [...Object.values(KIND_GLYPH), CONTACT_LOG_GLYPH]
ok(kinds.every((n) => ICONS.has(n)), `the kinds’ icons are in the subset (${kinds.join(' · ')})`)
const quoteNames = Object.values(QUOTE_GLYPH)
ok(quoteNames.every((n) => ICONS.has(n)), `the quote trail’s icons are in the subset (${quoteNames.join(' · ')})`)
/* the lead feed's own icons: every quoted name an `icon:` expression can yield (a literal after `icon: `, `? ` or `: `, never a kind compared) */
const src = fs.readFileSync(path.join(REPO, 'lib/leads/activity.ts'), 'utf8')
const names = new Set<string>()
for (const m of src.matchAll(/icon: ([^\n]*?)(?:, (?:text|at|link|id)\b|\s*\/\*|$)/gm)) for (const t of (m[1] ?? '').matchAll(/(?:^|\? |: )'([a-z0-9_]+)'/g)) names.add(t[1]!)
for (const m of src.matchAll(/const icon = ([^\n]*)(?:\n\s+: [^\n]*)*/gm)) for (const t of m[0].matchAll(/(?:\? |: )'([a-z0-9_]+)'/g)) names.add(t[1]!)   // the kinds' chains
const missing = [...names].filter((n) => !ICONS.has(n))
ok(names.size > 40 && missing.length === 0, `the lead feed’s ${names.size} event icons are all in the subset${missing.length ? ` — missing: ${missing.join(', ')}` : ''}`)
/* the quote trail: every line it writes has its glyph */
const qsrc = fs.readFileSync(path.join(REPO, 'lib/quotes/activity.ts'), 'utf8')
const ids = [...new Set([...qsrc.matchAll(/ev\.push\(\{ id: '([a-z-]+)'/g), ...qsrc.matchAll(/\[\{ id: '([a-z-]+)'/g)].map((m) => m[1]!))]
ok(ids.length >= 10 && ids.every((id) => id in QUOTE_GLYPH) && 'rev' in QUOTE_GLYPH, `every line of the quote trail has its glyph (${ids.join(' · ')} · rev-…)`)

// ── the day's words: the house long date at every width ──
const NOW = new Date(2026, 9, 24, 15, 0).getTime()
ok(dayLabel(new Date(2026, 9, 24, 9), NOW) === 'Today' && dayLabel(new Date(2026, 9, 23, 23, 59), NOW) === 'Yesterday', 'Today · Yesterday')
ok(dayLabel(new Date(2026, 9, 2, 16, 42), NOW) === 'Fri, 2 Oct ’26', 'then the house long date — "Fri, 2 Oct ’26"')
ok(dayLabel(new Date(2025, 11, 31, 9), NOW) === 'Wed, 31 Dec ’25', 'another year — its year, as every day')
type Ev = { id: string; at: Date; icon: string; text: string; actor: string; group?: 'tasks' }
const ev = (id: string, d: number, h: number, text: string): Ev => ({ id, at: new Date(2026, 9, d, h), icon: 'ballot', text, actor: 'Dane', group: 'tasks' })
const desk = feedDays([ev('a', 24, 14, 'Dane created the task “A”.'), ev('b', 24, 9, 'Dane created the task “B”.'), ev('c', 24, 8, 'Dane created the task “C”.'), ev('d', 2, 16, 'Dane created the task “D”.')], NOW, Infinity, { fold: false })
ok(desk.days.map((d) => `${d.label}:${d.items.length}`).join(' | ') === 'Today:3 | Fri, 2 Oct ’26:1' && desk.days[0]!.items.every((x) => x.kind === 'one' && /^\d{1,2}:\d{2} [AP]M$/.test(x.time)), 'the desk: the days, every line its own row with its time only')

console.log(`rwd-a-pure: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
