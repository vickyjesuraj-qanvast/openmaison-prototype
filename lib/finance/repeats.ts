/**
 * (pending modules S06 — card `held:finance`, her "build all of them" 2026-10-11) **An expense that repeats.** 1.0 had a *Recurring expense*
 * tick on an expense (`expenses.is_recurring`) that only drew an icon in the list — nothing ever logged the next one. 2.0 makes it do the job:
 * an expense says how often it repeats (every week, month, three months or year) and the next one is logged by rule when its day comes — the
 * same amount, category, vendor, who paid and what it was for; never its receipts (each one has its own). Pure and client-safe: the dialog's
 * helper, the rows' words and the server's raise (lib/finance/repeats-server.ts) read the same arithmetic.
 *
 * The rule lives on the series' first expense. Its days are counted from that expense's own day, so the 31st stays the month's last day
 * (31 Jan → 28 Feb → 31 Mar) and a change of rhythm keeps the day of the month. The first day it logs is the first one after the later of the
 * expense's own day and today — logging September's rent on 10 October starts the repeat in November, never a surprise October.
 */

export type RepeatEvery = 'week' | 'month' | 'quarter' | 'year'
export const REPEAT_EVERY: readonly RepeatEvery[] = ['week', 'month', 'quarter', 'year']
export const isRepeatEvery = (v: unknown): v is RepeatEvery => typeof v === 'string' && (REPEAT_EVERY as readonly string[]).includes(v)

/** The dialog's choices, in order — "Doesn't repeat" first (the default). */
export const REPEAT_OPTIONS: { value: RepeatEvery | 'none'; label: string }[] = [   // invented copy (pending modules S06)
  { value: 'none', label: 'Doesn’t repeat' },
  { value: 'week', label: 'Every week' },
  { value: 'month', label: 'Every month' },
  { value: 'quarter', label: 'Every 3 months' },
  { value: 'year', label: 'Every year' },
]
export const repeatLabel = (every: RepeatEvery | null | undefined) => REPEAT_OPTIONS.find((o) => o.value === (every ?? 'none'))?.label ?? 'Doesn’t repeat'
/** Inside a sentence: "every month", "every 3 months". */
export const repeatWords = (every: RepeatEvery) => repeatLabel(every).toLowerCase()

const DAY = 86_400_000
/** Local midnight of a moment (the expenses' days are local midnights — app/finance/cost-actions.ts `day`). */
export const dayOf = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

/** The k-th day after `anchor` in the rhythm (k = 0 is the anchor itself), a local midnight; a month's day is kept, or its last day. */
export function repeatDay(anchor: number, every: RepeatEvery, k: number): number {
  const a = new Date(anchor)
  if (every === 'week') return new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * k).getTime()
  const months = every === 'month' ? k : every === 'quarter' ? 3 * k : 12 * k
  const y = a.getFullYear() + Math.floor((a.getMonth() + months) / 12)
  const m = (((a.getMonth() + months) % 12) + 12) % 12
  return new Date(y, m, Math.min(a.getDate(), daysIn(y, m))).getTime()
}

/** The first day of the rhythm strictly after `after` (never the anchor itself). */
export function repeatAfter(anchor: number, every: RepeatEvery, after: number): number {
  const a = dayOf(anchor), t = dayOf(after)
  /* a first guess near the answer, then a step at a time — the weeks and months are never off by more than one */
  const approx = every === 'week' ? Math.floor((t - a) / (7 * DAY)) : Math.floor((t - a) / ((every === 'month' ? 30.44 : every === 'quarter' ? 91.31 : 365.25) * DAY))
  let k = Math.max(1, approx - 1)
  while (repeatDay(a, every, k) <= t) k++
  while (k > 1 && repeatDay(a, every, k - 1) > t) k--
  return repeatDay(a, every, k)
}

/** The day a new repeat first logs: the first one after the later of the expense's own day and today. */
export const firstRepeat = (spentOn: number, every: RepeatEvery, now: number) => repeatAfter(spentOn, every, Math.max(dayOf(spentOn), dayOf(now)))

/** At most this many logged by one read for one series — a studio away for a year still gets its 52 weeks, never a runaway loop. */
export const REPEAT_CATCH_UP = 60

/** What a repeat says about itself — the panel's fact and the row's sub-line. */
export type RepeatFacts = { every: RepeatEvery | null; next: number | null; stoppedAt: number | null; stoppedBy: string | null; rootId: string; isRoot: boolean }
/** "Every month · next on 5 Nov" — the words a live repeat wears; a stopped one says so. `day` formats a day. */
export function repeatLine(r: Pick<RepeatFacts, 'every' | 'next' | 'stoppedAt'>, day: (ms: number) => string): string | null {
  if (r.every && r.next && !r.stoppedAt) return `${repeatLabel(r.every)} · next on ${day(r.next)}`
  if (r.stoppedAt) return `Stopped repeating on ${day(r.stoppedAt)}`
  return null
}
