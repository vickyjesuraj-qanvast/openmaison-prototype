/**
 * (gaps build I, I-Q6 · I-Q7) Projects › Insights — the Leads Insights page's pattern (lib/leads/tat.ts) on a project's own records: every
 * number derives, per range, from the facts the loader hands over. Pure and client-safe.
 *
 * - **Projects started** — started (Start the project) in the range. **Completed** — completed in the range.
 * - **Start → Completed** — (parity P-32 · C-03: named for its span, as Leads names its legs; it was "Average duration" over a median) for the
 *   projects completed in the range: the median as the headline (robust to one long job), the average under it (Leads' rule).
 * - **Late milestones** — (parity P-32 · C-07) milestones that FINISHED LATE (done after their planned last day) in the range, as Leads' tiles
 *   count completed legs only; the ones overdue now are the waiting chips' (`late.now`), never folded into the tile.
 * - **Collection days** — an invoice sent → paid in full (the day its confirmed payments reach its amount), for invoices paid in full in the
 *   range: the median. Money — Owners and Admins only (`seesStudioMoney`); null for anyone else.
 * (parity P-29 · Q-14) Every span is counted in calendar days (`calendarDaysBetween`, the record's own count, REG-1131), so a project's record
 * and its report never disagree; (P-28 · Q-13) written "n days", never weeks.
 */
import { median, mean, RANGES, type Range } from '@/lib/leads/tat'
import { calendarDaysBetween, dayWords } from '@/lib/format'
import { BLANK } from '@/lib/leads/row-text'

export const DAY = 86_400_000
/** (parity P-31 · Q-16) The Leads report's ranges, shared — Last 30 · Last 90 · Last 12 months · All time, both opening on 90. */
export type InsightsRange = Range
export const INSIGHT_RANGES = RANGES

export type ProjectFacts = {
  id: string; name: string; number: string; stage: string; teamIds: string[]
  startedAt: number | null; completedAt: number | null
  /** Each milestone's planned last day and the day it was done (day numbers, lib/projects/schedule-model.ts), null while open. */
  milestones: { end: number; doneAt: number | null }[]
  /** Each sent invoice: when it was sent and when its confirmed payments first covered it (null while owed). Empty when money is hidden. */
  invoices: { sentAt: number; paidAt: number | null }[]
}
export type Team = { id: string; name: string; role: string; color: string; capacity: number }
export type Stat = { median: number | null; mean: number | null; count: number; /** % vs the prior window (a decrease improves); null when either side is missing */ delta: number | null }
export type MemberInsight = { id: string; name: string; role: string; color: string; running: number; capacity: number; started: number; completed: number; durationMedian: number | null; durationMean: number | null; late: number }
export type ProjectsReport = {
  /** (parity P-31 · C-06) projects whose start or completion falls in the range — the caption's count */
  inRange: number
  started: number; completed: number; duration: Stat
  /** finished late in the range · milestones finished in the range · (P-32) overdue now, on the running projects — the waiting chip */
  late: { ended: number; due: number; now: number }
  collection: Stat | null; members: MemberInsight[]; running: number
}

const within = (at: number | null, lo: number, hi: number) => at !== null && at >= lo && at < hi
/** (parity P-29) whole calendar days from one moment to another — the record's count (dayOf), never ms / 24 h */
const daysOf = (from: number, to: number) => Math.max(0, calendarDaysBetween(from, to))
const statOf = (xs: number[]): Omit<Stat, 'delta'> => ({ median: median(xs), mean: mean(xs), count: xs.length })
const deltaOf = (a: Omit<Stat, 'delta'>, b: Omit<Stat, 'delta'> | null): number | null => {
  if (!b || a.median === null || b.median === null || b.median <= 0) return null
  const d = Math.round(((a.median - b.median) / b.median) * 100)
  return d === 0 ? null : d
}
/** (parity P-34) A milestone FINISHED LATE when it was done after its last day (done on the day is on time); it is OVERDUE while open past it. */
const finishedLate = (m: { end: number; doneAt: number | null }) => m.doneAt !== null && m.doneAt > m.end
const overdue = (m: { end: number; doneAt: number | null }, today: number) => m.doneAt === null && m.end < today
const doneMs = (m: { doneAt: number | null }) => (m.doneAt === null ? null : m.doneAt * DAY)

export function projectsReport(all: ProjectFacts[], team: Team[], now: number, range: InsightsRange, withMoney: boolean, today: number = Math.floor(now / DAY)): ProjectsReport {
  const span = range === null ? Infinity : range * DAY
  const lo = range === null ? -Infinity : now - span, hi = now + 1
  const plo = range === null ? null : now - 2 * span
  const durations = (from: number, to: number) => all.filter((p) => within(p.completedAt, from, to) && p.startedAt !== null).map((p) => daysOf(p.startedAt!, p.completedAt!))
  const collections = (from: number, to: number) => all.flatMap((p) => p.invoices.filter((i) => within(i.paidAt, from, to)).map((i) => daysOf(i.sentAt, i.paidAt!)))
  const d = statOf(durations(lo, hi)), dPrev = plo === null ? null : statOf(durations(plo, lo))
  const c = statOf(collections(lo, hi)), cPrev = plo === null ? null : statOf(collections(plo, lo))
  const running = all.filter((p) => p.stage !== 'completed')
  const lateEnded = all.reduce((n, p) => n + p.milestones.filter((m) => finishedLate(m) && within(doneMs(m), lo, hi)).length, 0)
  const lateNow = running.reduce((n, p) => n + p.milestones.filter((m) => overdue(m, today)).length, 0)
  const doneIn = all.reduce((n, p) => n + p.milestones.filter((m) => within(doneMs(m), lo, hi)).length, 0)
  const onTeam = (id: string) => all.filter((p) => p.teamIds.includes(id))
  const members = team.map((m) => {
    const mine = onTeam(m.id)
    const ds = mine.filter((p) => within(p.completedAt, lo, hi) && p.startedAt !== null).map((p) => daysOf(p.startedAt!, p.completedAt!))
    return {
      id: m.id, name: m.name, role: m.role, color: m.color, capacity: m.capacity,
      running: mine.filter((p) => p.stage !== 'completed').length,
      started: mine.filter((p) => within(p.startedAt, lo, hi)).length,
      completed: mine.filter((p) => within(p.completedAt, lo, hi)).length,
      durationMedian: median(ds), durationMean: mean(ds),
      /* (parity P-32) the tile's rule, per person: milestones that finished late in the range — the overdue-now count is the chips row's */
      late: mine.reduce((n, p) => n + p.milestones.filter((x) => finishedLate(x) && within(doneMs(x), lo, hi)).length, 0),
    }
  }).filter((m) => m.running + m.started + m.completed + m.late > 0 || m.role === 'Designer' || m.role === 'Manager')
    .sort((a, b) => b.running - a.running || b.completed - a.completed || a.name.localeCompare(b.name))
  return {
    inRange: all.filter((p) => within(p.startedAt, lo, hi) || within(p.completedAt, lo, hi)).length,
    started: all.filter((p) => within(p.startedAt, lo, hi)).length,
    completed: all.filter((p) => within(p.completedAt, lo, hi)).length,
    duration: { ...d, delta: deltaOf(d, dPrev) },
    late: { ended: lateEnded, due: doneIn, now: lateNow },
    collection: withMoney ? { ...c, delta: deltaOf(c, cPrev) } : null,
    members, running: running.length,
  }
}

/** "34 days" · "293 days" — a median or an average of whole calendar days, in the house words (parity P-28 · Q-13: `dayWords`, never weeks);
    none → the house "--" (P-35). */
export const daysWords = (days: number | null): string => (days === null ? BLANK : dayWords(Math.round(days)))

/* ── (parity Q-20) The house Export, as Finance's reports have it: the page's numbers as one sheet (Finance's `reportSheet` shape) ── */
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
/** Reports › Projects as rows: the tiles, what is overdue now, By team member — the screen's own words and figures. */
export function projectsSheet(r: ProjectsReport, range: InsightsRange): { head: string[]; body: string[][] } {
  const label = RANGES.find((x) => x.key === range)?.label ?? 'All time'
  const body: string[][] = [['Projects'], ['Figure', 'Value', 'Detail'],
    ['Projects started', String(r.started), ''],
    ['Completed', String(r.completed), ''],
    ['Start → Completed', daysWords(r.duration.median), r.duration.count ? `median · avg ${daysWords(r.duration.mean)} · ${plural(r.duration.count, 'project')}` : ''],
    ['Late milestones', String(r.late.ended), r.late.due ? `finished late, of ${r.late.due} finished in this range` : ''],
    ...(r.collection ? [['Collection days', daysWords(r.collection.median), r.collection.count ? `median, sent → paid in full · ${plural(r.collection.count, 'invoice')}` : '']] : []),
    [], ['Waiting now'], ['Milestones overdue', String(r.late.now), ''],
    [], ['By team member'], ['Member', 'Role', 'Running', 'Capacity', 'Started', 'Completed', 'Start → Completed', 'Average', 'Late milestones'],
  ]
  for (const m of r.members) body.push([m.name, m.role, String(m.running), String(m.capacity), String(m.started), String(m.completed), daysWords(m.durationMedian), daysWords(m.durationMean), m.late ? String(m.late) : BLANK])
  return { head: [`Projects · ${label} · ${plural(r.inRange, 'project')} in range`], body }
}
