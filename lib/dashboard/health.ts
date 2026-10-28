/*
 * (the Dashboard redesigned, 2026-10-26 — his marks on https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY: P-08 · Q-10 "On track, at risk or late,
 * by rule from the schedule and the money"; lane D3) **A project's health, by rule** — pure and client-safe, one rule the Projects card reads and
 * the pure probe checks (design-source/verify/dashboard-2026-10-26/dash-d3-health-pure.mts). It reads the module's own facts and invents no number:
 * the schedule's milestones (lib/projects/schedule-model.ts), Money's own Needs you rows for money (lib/projects/money-needs.ts — a supplier's bill
 * or a PO past its due day is ours and late; a client's payment past its due day is theirs), the schedule's open asks for more time, and the
 * books' own grade of the profit (lib/finance/profit.ts — only for whoever sees profit).
 *
 * **Late** (red — S-05: past its day and ours to fix): a milestone of ours past its last day (not done, nobody it waits on), the target end passed
 * with no such milestone, money of ours past its due day.
 * **At risk** (amber): a milestone past its last day that waits on someone (the client, a supplier, a member — the wait is not the studio's own
 * lateness), a client's payment past its due day, an ask for more time still open, a milestone ending within three days that hasn't started,
 * costs past the contract's share (the profit graded At risk: under a tenth of the contract left, or a loss).
 * **On track** otherwise — its line is the next fact: what is running and when it ends, else what starts next.
 * **On hold** and **Setting up** say so, whatever else is true: a hold pauses the work (its reasons rest — lib/projects/attention.ts `HOLD_KEEPS`),
 * and a project still setting up has no schedule to be late on yet.
 *
 * INVENTED COPY (logged REG-D3.*): every sentence below; the three-day window (`AT_RISK_DAYS`).
 */
import { calendarDaysBetween, dayWords } from '@/lib/format'
import { dayMonth, isLate, plural, progressOf, weekdayOf, type MilestoneStatus } from '@/lib/projects/schedule-model'

export type ProjectHealth = 'on_track' | 'at_risk' | 'late' | 'on_hold' | 'setting_up'
export const HEALTH_WORD: Record<ProjectHealth, string> = { on_track: 'On track', at_risk: 'At risk', late: 'Late', on_hold: 'On hold', setting_up: 'Setting up' }
/** The card's order: what needs looking at first, then what runs, then what waits. */
export const HEALTH_ORDER: Record<ProjectHealth, number> = { late: 0, at_risk: 1, on_track: 2, setting_up: 3, on_hold: 4 }
/** A milestone ending this many days ahead (or sooner) that hasn't started is at risk. */
export const AT_RISK_DAYS = 3

export type HealthMilestone = { id: string; title: string; status: MilestoneStatus; start: number; end: number; position?: number
  /** who it waits on, if anyone — a wait is not our own lateness */ waitingOn: 'client' | 'member' | 'supplier' | null; waitingWho?: string | null }

export type HealthFacts = {
  stage: 'setting_up' | 'in_progress' | 'completed' | string
  /** on hold: the resume line already in the house words ("Resumes 16 Nov ’26" · "No resume date yet") */
  hold: { line: string } | null
  milestones: HealthMilestone[]
  /** today's day number (lib/projects/schedule-model.ts `dayOf`) */
  today: number
  /** the project's target end, as a moment (ms) — null without one */
  targetEnd: number | null
  /** milestones more time is asked on, still unanswered (their titles) */
  moreTime: string[]
  /** Money's own rows (null for whoever doesn't see the project's money): ours past their due day — a supplier's bill, a PO — and the
      client's payments past theirs, each with its days */
  money: { ours: { what: string; days: number }[]; client: { days: number }[] } | null
  /** the books' grade (null for whoever doesn't see profit): only a graded profit can be at risk */
  profit: { state: 'no_contract' | 'no_costs' | 'early' | 'graded'; tier: 'healthy' | 'tight' | 'at_risk' | null; marginPct: number } | null
  /** a project still setting up: its first thing left to do ("Add the start date"), else null */
  setupNext?: string | null
}

export type HealthRead = {
  health: ProjectHealth
  /** every reason that applies, worst first (late's, then at risk's) — the line says the first, the row's label all of them */
  reasons: string[]
  /** the second line: the health word, then the first reason or the next fact — "At risk · More time asked on Carpentry" */
  line: string
  /** (the calm pass, 2026-10-26 — lane C3) the first reason in its short words, or the next fact, capitalised and without the health word (the
      card says the health as a word of its own): "Carpentry 6 days late" · "Bill AF-7781 from AquaFlow — 14 days overdue" · "Carpentry ends Thu" */
  fact: string
  /** done of all, the listing's Progress (B-59: the done ones only) */
  progress: { done: number; total: number; pct: number }
}

/** "today" · "tomorrow" · "Thu" (this week) · "2 Nov" — a day ahead, as a line says it. */
export function aheadWords(day: number, today: number): string {
  const d = day - today
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d > 1 && d < 7) return WD[weekdayOf(day)] ?? dayMonth(day)
  return dayMonth(day)
}
/** "yesterday" · "20 Oct" — a day gone by, by its date (a bare "Tue" reads as next week — the lead card's rule, L3). */
export function pastWords(day: number, today: number): string {
  return today - day === 1 ? 'yesterday' : dayMonth(day)
}
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const lower = (s: string) => s.replace(/^./, (c) => c.toLowerCase())
const named = (t: string) => t.trim() || 'A milestone'
/** (the calm UI build 2026-10-27 — the audit's 1-31, W-005) the record first, its vendor after: "Bill AF-7781 from AquaFlow Plumbing Works" (was
    "AquaFlow Plumbing Works’s bill AF-7781" — the possessive built onto a company's name). A title already written so is left as it is. */
export function recordFirst(what: string): string {
  const m = /^(.+?)’s (bill|PO|purchase order) (.+)$/.exec(what.trim())
  if (!m) return what
  const kind = m[2] === 'bill' ? 'Bill' : m[2] === 'PO' ? 'PO' : 'Purchase order'
  return `${kind} ${m[3]} from ${m[1]}`
}

/** The project's health and its words. */
export function healthOf(f: HealthFacts): HealthRead {
  const progress = progressOf(f.milestones)
  /* each reason in full (the row's label, the tooltip) and short (the card's one line — the calm pass) */
  type Why = { full: string; short: string }
  const out = (health: ProjectHealth, why: Why[], next?: string): HealthRead => ({
    health, reasons: why.map((w) => w.full), progress,
    line: [HEALTH_WORD[health], why[0]?.full ?? next].filter(Boolean).join(' · '),
    fact: upper(why[0]?.short ?? next ?? ''),
  })
  if (f.hold) return out('on_hold', [], lower(f.hold.line))
  if (f.stage === 'setting_up') return out('setting_up', [], f.setupNext ? lower(f.setupNext) : 'getting ready to start')
  const open = f.milestones.filter((m) => m.status !== 'done')
  const t = f.today

  /* late — ours, past its day */
  const late: Why[] = []
  const oursLate = open.filter((m) => !m.waitingOn && isLate(m, t)).sort((a, b) => a.end - b.end)
  for (const m of oursLate) late.push(m.status === 'not_started'
    ? { full: `${named(m.title)} not started · was due ${pastWords(m.end, t)}`, short: `${named(m.title)} not started · ${dayWords(t - m.end)} late` }
    : { full: `${named(m.title)} was due ${pastWords(m.end, t)} · ${dayWords(t - m.end)} late`, short: `${named(m.title)} ${dayWords(t - m.end)} late` })
  if (!oursLate.length && f.targetEnd !== null && f.stage === 'in_progress') {
    const past = calendarDaysBetween(f.targetEnd, dayMs(t))
    if (past > 0) late.push(same(`${dayWords(past)} past the target end`))
  }
  for (const x of [...(f.money?.ours ?? [])].sort((a, b) => b.days - a.days)) {
    const what = recordFirst(x.what)
    late.push(x.days ? { full: `${what} is ${dayWords(x.days)} overdue`, short: `${what} — ${dayWords(x.days)} overdue` } : { full: `${what} is overdue`, short: `${what} — overdue` })
  }

  /* at risk — late, but not ours alone; or about to be */
  const risk: Why[] = []
  for (const m of open.filter((m) => m.waitingOn && isLate(m, t)).sort((a, b) => a.end - b.end)) {
    const who = m.waitingWho?.trim() || (m.waitingOn === 'client' ? 'the client' : m.waitingOn === 'supplier' ? 'a supplier' : 'the team')
    risk.push({ full: `${named(m.title)} waits on ${who} · was due ${pastWords(m.end, t)}`, short: `${named(m.title)} waits on ${who}` })
  }
  const owed = f.money?.client ?? []
  if (owed.length) { const worst = Math.max(...owed.map((x) => x.days)); risk.push(owed.length === 1 ? { full: `A client payment is ${dayWords(worst)} overdue`, short: `A client payment ${dayWords(worst)} overdue` } : same(`${plural(owed.length, 'client payment')} overdue`)) }
  for (const title of f.moreTime) risk.push(same(`More time asked on ${named(title)}`))
  for (const m of open.filter((m) => m.status === 'not_started' && m.end >= t && m.end - t <= AT_RISK_DAYS).sort((a, b) => a.end - b.end))
    risk.push(same(`${named(m.title)} ends ${aheadWords(m.end, t)} · not started`))
  if (f.profit?.state === 'graded' && f.profit.tier === 'at_risk') risk.push(same(f.profit.marginPct < 0 ? 'Costs are over the contract' : 'Costs leave under a tenth of the contract'))

  if (late.length) return out('late', [...late, ...risk])
  if (risk.length) return out('at_risk', risk)
  return out('on_track', [], nextFact(open, t, progress))
}
const same = (w: string) => ({ full: w, short: w })
const upper = (s: string) => s.replace(/^./, (c) => c.toUpperCase())

/** On track's line: what is running and when it ends, else what starts next — or that the schedule is done, or not made yet. */
function nextFact(open: HealthMilestone[], t: number, p: { total: number }): string {
  if (!p.total) return 'no milestones yet'
  if (!open.length) return 'every milestone done'
  const running = open.filter((m) => m.status === 'in_progress' || m.status === 'blocked').sort((a, b) => a.end - b.end)[0]
  if (running) return `${named(running.title)} ends ${aheadWords(running.end, t)}`
  const next = [...open].sort((a, b) => a.start - b.start || (a.position ?? 0) - (b.position ?? 0))[0]!
  return next.start >= t ? `${named(next.title)} starts ${aheadWords(next.start, t)}` : `${named(next.title)} ends ${aheadWords(next.end, t)}`
}

/** A day number's noon, as a moment — calendar days between it and a moment count the same either side of midnight. */
const dayMs = (day: number) => { const u = new Date(day * 86_400_000); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12).getTime() }

/** The card's order: late, at risk, on track, setting up, on hold — then the client's name. */
export const byHealth = <T extends { health: ProjectHealth; client: string }>(a: T, b: T) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || a.client.localeCompare(b.client)
