import { displayTime, startOfDay } from '@/lib/format'
import type { ActivityEvent } from '@/lib/leads/activity'

/*
 * (Leads on the move, L4 — P-12 · C-12, his marks 2026-10-23 "continue the leads") The Activity feed on a phone or a tablet, pure: the day as a
 * header ("Today", "Yesterday", "Fri 23 Oct") with the time on each row, and a run of the same thing folded into one line — ten "James uploaded
 * the file “Q-101”." in a row read "James uploaded 10 files." and open on a tap. Every word comes from the feed's own sentences.
 */

const DAY = 86_400_000
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The day's header: Today · Yesterday · "Fri 23 Oct" · "Fri 23 Oct ’25" in another year. */
export function dayLabel(d: Date, now: number): string {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(d)) / DAY)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  const same = d.getFullYear() === new Date(now).getFullYear()
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${same ? '' : ` ’${String(d.getFullYear()).slice(2)}`}`
}

/** What makes two lines "the same thing": the sentence with its quoted names taken out, and who did it. */
export function foldKey(e: Pick<ActivityEvent, 'text' | 'actor'>): string {
  return `${e.actor}|${e.text.replace(/“[^”]*”/g, '“”').replace(/\s*\.$/, '')}`
}

const plural = (noun: string) => (/(s|x|ch|sh)$/.test(noun) ? `${noun}es` : /[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`)
/** A run folds from three of the same thing — two lines are read as fast as one that opens. */
export const RUN_MIN = 3

/** A run's one line: "James uploaded the file “Q-101”." ×10 → "James uploaded 10 files." — the same name every time → "… — 3 times." —
 *  otherwise the first sentence and how many more. */
export function runWords(events: Pick<ActivityEvent, 'text' | 'link'>[]): string {
  const first = events[0]?.text ?? ''
  const n = events.length
  /* the same record each time (one task commented on three times — the lines open the same place): "… — 3 times." */
  const href = events[0]?.link?.href
  if (href && events.every((e) => e.link?.href === href)) return `${first.replace(/\s*\.$/, '')} — ${n} times.`
  /* "The task “X” was completed." — "3 tasks were completed." */
  const passive = /^The (\w+) “[^”]*” was (.+?)\.?$/.exec(first)
  if (passive && !/“/.test(passive[2] ?? '')) return `${n} ${plural(passive[1]!)} were ${passive[2]}.`
  /* "… the file “X”." — n records of a kind, whatever they are called (a studio's files are often all "Q-101") */
  const m = /^(.*?) the (\w+) “[^”]*”(.*)$/.exec(first)
  if (m && !/“/.test(m[3] ?? '')) return `${m[1]} ${n} ${plural(m[2]!)}${(m[3] ?? '').replace(/^\s*\.?\s*$/, '.')}`
  const names = events.map((e) => (e.text.match(/“[^”]*”/g) ?? []).join('|'))
  if (names.every((x) => x === names[0])) return `${first.replace(/\s*\.$/, '')} — ${n} times.`
  return `${first.replace(/\s*\.$/, '')} — and ${n - 1} more like it.`
}

export type FeedItem = { kind: 'one'; event: ActivityEvent; time: string } | { kind: 'run'; key: string; events: ActivityEvent[]; text: string; time: string }
export type FeedDay = { key: string; label: string; items: FeedItem[] }

/** The feed (newest first) as days, each day's runs of three or more of the same thing folded; `limit` keeps the newest that many items. */
export function feedDays(events: ActivityEvent[], now: number, limit = Infinity): { days: FeedDay[]; total: number; shown: number } {
  const items: { day: string; label: string; item: FeedItem }[] = []
  let i = 0
  while (i < events.length) {
    const e = events[i]!
    const at = new Date(e.at)
    const day = String(startOfDay(at))
    let j = i + 1
    /* a run: the same thing, the same day, one after another — and only lines that open nothing of their own, or open the same place */
    while (j < events.length && foldKey(events[j]!) === foldKey(e) && String(startOfDay(new Date(events[j]!.at))) === day && !events[j]!.card && !e.card) j++
    const time = displayTime(at)
    if (j - i >= RUN_MIN) items.push({ day, label: dayLabel(at, now), item: { kind: 'run', key: `${e.id}-run`, events: events.slice(i, j), text: runWords(events.slice(i, j)), time } })
    else { items.push({ day, label: dayLabel(at, now), item: { kind: 'one', event: e, time } }); j = i + 1 }   // too short to fold: this line alone, the next one next
    i = j
  }
  const kept = items.slice(0, limit)
  const days: FeedDay[] = []
  for (const k of kept) {
    const last = days[days.length - 1]
    if (last && last.key === k.day) last.items.push(k.item)
    else days.push({ key: k.day, label: k.label, items: [k.item] })
  }
  return { days, total: items.length, shown: kept.length }
}
