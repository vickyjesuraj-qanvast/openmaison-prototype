/*
 * (REG-611, parity R-01 · R-02 · R-03) Turnaround — 1.0's TAT report and Response time card, derived from 2.0's own records
 * (no write-once stamps): created → the first assignment (lead_assignees.assigned_at) → the first outreach (the earliest contact
 * log: a Contacted-stage log's entry or a Notes-tab contact log) → Won (the Won stage log; 1.0's Signed). Pure and client-safe:
 * the Insights page recomputes per range in the browser, the Overview prints one lead's line.
 * (parity P-28 · P-29 · Q-13 · Q-14, 2026-10-08) Written and counted the house way (lib/format.ts): "30m" · "26.3h" under two days, else
 * calendar days in words, "12 days" — never 1.0's "12d" — so a lead's Response time and its report never disagree.
 */
import { BLANK } from './row-text'
import { calendarDaysBetween, durationWords } from '@/lib/format'

export type LeadFacts = {
  id: string; name: string; stage: string
  createdAt: number; assignedAt: number | null; assigneeIds: string[]
  outreachAt: number | null; outreachBy: string | null; wonAt: number | null
}
export type LegKey = 'assignment' | 'outreach' | 'won'
export const LEGS: { key: LegKey; label: string }[] = [
  { key: 'assignment', label: 'Creation → Assignment' },
  { key: 'outreach', label: 'Assignment → First outreach' },
  { key: 'won', label: 'First outreach → Won' },
]
/** (parity P-31 · Q-16) Reports › Leads and › Projects share one set of ranges and both open on 90 days; Finance keeps its calendar periods. */
export type Range = 30 | 90 | 365 | null
export const RANGES: { key: Range; label: string }[] = [{ key: 30, label: 'Last 30 days' }, { key: 90, label: 'Last 90 days' }, { key: 365, label: 'Last 12 months' }, { key: null, label: 'All time' }]
export const DEFAULT_RANGE: Range = 90
export const rangeLabel = (r: Range): string => RANGES.find((x) => x.key === r)?.label ?? 'All time'
/** (pending modules S39) A report's range in its address — `?range=30|90|365|all` — so a door from another report (Studio health's tiles)
    lands on the same window and Back returns to it; anything else reads as the default. */
export function readRange(v: string | null | undefined): Range {
  if (v === 'all') return null
  const n = Number(v)
  return n === 30 || n === 90 || n === 365 ? n : DEFAULT_RANGE
}
export const rangeParam = (r: Range): string => (r === null ? 'all' : String(r))
/** (pending modules S45A · REG-708 · REG-817) What Response time drew on the range it opens on — each leg's change against the span before, the
    awaiting chips and the members' rows — so its ghost (components/leads/insights/insights-ghost.tsx) draws the same, as Studio health's does. */
export const INSIGHTS_SHAPE = {
  delta: (leg: LegKey) => `om.shape.insights.delta.${leg}`, assign: 'om.shape.insights.awaitAssign', outreach: 'om.shape.insights.awaitOutreach', members: 'om.count.insights.members',
} as const
/** (parity P-35 · C-13) The reports' one footnote opens with this sentence; each page adds its own second one. */
export const MEDIANS_NOTE = 'Medians shown as headline (robust to one long job).'

const HOUR = 3_600_000, DAY = 86_400_000
const clamp = (ms: number) => Math.max(0, ms)   // 1.0 clamps a backdated leg to zero

/** (parity P-29 · Q-14) A span as the house counts it: under two days its own minutes and hours, else whole calendar days — so one lead's
    report figure reads what its record's line reads (`spanWords`), and medians mix the two honestly. */
export const countedMs = (from: number, to: number): number => { const ms = clamp(to - from); return ms < 48 * HOUR ? ms : Math.max(0, calendarDaysBetween(from, to)) * DAY }

export function legMs(f: LeadFacts, leg: LegKey): number | null {
  if (leg === 'assignment') return f.assignedAt === null ? null : countedMs(f.createdAt, f.assignedAt)
  if (leg === 'outreach') return f.assignedAt === null || f.outreachAt === null ? null : countedMs(f.assignedAt, f.outreachAt)
  return f.outreachAt === null || f.wonAt === null ? null : countedMs(f.outreachAt, f.wonAt)
}
export const median = (xs: number[]): number | null => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2   // an even count = the mean of the two middles (1.0)
}
export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/* (parity P-28 · Q-13) 1.0's formatTatDuration ("30m" · "26.3h" · "12d") gave way to the house formatter, `durationWords` in lib/format.ts:
   the minutes and hours stay under two days, then "n days" in words — never "12d"; null → the house "--" (P-35). */
/** 1.0's tatGrade, for the assignment → outreach leg only: within 8 hours good, within a day warn, else bad. */
export type Grade = 'good' | 'warn' | 'bad'
export const tatGrade = (ms: number | null): Grade | null => (ms === null ? null : ms <= 8 * HOUR ? 'good' : ms <= 24 * HOUR ? 'warn' : 'bad')

export type StageStat = { median: number | null; mean: number | null; count: number; /** % vs the prior window; null when either side is missing or the change is 0 */ delta: number | null }
export type MemberRow = { id: string; name: string; role: string; color: string; leads: number; outreachMedian: number | null; outreachMean: number | null; outreachCount: number; wonMedian: number | null; wonMean: number | null; won: number; awaitingOutreach: number }
/** (parity P-33) A lead behind "awaiting assignment" — what Maison AI lists when asked. */
export type WaitingLead = { id: string; name: string; stage: string; createdAt: number }
export type Report = { days: Range; inRange: number; legs: Record<LegKey, StageStat>; awaitingAssignment: number; awaitingOutreach: number; unassigned: WaitingLead[]; members: MemberRow[] }
const isOpen = (stage: string) => stage !== 'Won' && stage !== 'Lost'
const stat = (facts: LeadFacts[], leg: LegKey) => { const xs = facts.map((f) => legMs(f, leg)).filter((x): x is number => x !== null); return { median: median(xs), mean: mean(xs), count: xs.length } }

/** The report for one range: the window is on the lead's created date, the prior window is the equal span before it (none for all time). */
export function insightsReport(all: LeadFacts[], team: { id: string; name: string; role: string; color: string }[], now: number, days: Range): Report {
  const span = days === null ? null : days * DAY
  const cur = span === null ? all : all.filter((f) => f.createdAt >= now - span)
  const prior = span === null ? [] : all.filter((f) => f.createdAt >= now - 2 * span && f.createdAt < now - span)
  const legs = {} as Record<LegKey, StageStat>
  for (const { key } of LEGS) {
    const a = stat(cur, key), b = span === null ? null : stat(prior, key)
    let delta: number | null = null
    if (b && a.median !== null && b.median !== null && b.median > 0) { const d = Math.round(((a.median - b.median) / b.median) * 100); delta = d === 0 ? null : d }
    legs[key] = { ...a, delta }
  }
  const unassigned = cur.filter((f) => isOpen(f.stage) && f.assignedAt === null).sort((a, b) => a.createdAt - b.createdAt).map((f) => ({ id: f.id, name: f.name, stage: f.stage, createdAt: f.createdAt }))
  const awaitingAssignment = unassigned.length
  const awaitingOutreach = cur.filter((f) => isOpen(f.stage) && f.assignedAt !== null && f.outreachAt === null).length
  /* Leads count every current assignee; outreach and conversion go to whoever made the first outreach (1.0's attribution). */
  const members: MemberRow[] = team.map((m) => {
    const mine = cur.filter((f) => f.assigneeIds.includes(m.id))
    const reached = cur.filter((f) => f.outreachBy === m.id)
    const o = stat(reached, 'outreach'), w = stat(reached, 'won')
    return { id: m.id, name: m.name, role: m.role, color: m.color, leads: mine.length, outreachMedian: o.median, outreachMean: o.mean, outreachCount: o.count, wonMedian: w.median, wonMean: w.mean, won: reached.filter((f) => f.wonAt !== null).length, awaitingOutreach: mine.filter((f) => isOpen(f.stage) && f.outreachAt === null).length }
  }).filter((r) => r.leads > 0 || r.outreachCount > 0 || r.won > 0).sort((a, b) => b.leads - a.leads || a.name.localeCompare(b.name))
  return { days, inRange: cur.length, legs, awaitingAssignment, awaitingOutreach, unassigned, members }
}

/** (R-03) One lead's three legs for the Overview: done · running (the clock still going) · pending. */
export type ResponseLeg = { key: LegKey; label: string; state: 'done' | 'running' | 'pending'; ms: number | null }
export type ResponseTime = { legs: ResponseLeg[]; total: number | null; age: number }
export function responseTime(f: Pick<LeadFacts, 'stage' | 'createdAt' | 'assignedAt' | 'outreachAt' | 'wonAt'>, now: number): ResponseTime {
  const running = f.stage !== 'Lost'
  const legs: ResponseLeg[] = [
    { key: 'assignment', label: 'Assigned', state: f.assignedAt !== null ? 'done' : running ? 'running' : 'pending', ms: f.assignedAt !== null ? countedMs(f.createdAt, f.assignedAt) : running ? countedMs(f.createdAt, now) : null },
    { key: 'outreach', label: 'First contact', state: f.outreachAt !== null ? 'done' : f.assignedAt !== null && running ? 'running' : 'pending', ms: f.outreachAt !== null ? countedMs(f.assignedAt ?? f.createdAt, f.outreachAt) : f.assignedAt !== null && running ? countedMs(f.assignedAt, now) : null },
    { key: 'won', label: 'Won', state: f.wonAt !== null ? 'done' : f.outreachAt !== null && running ? 'running' : 'pending', ms: f.wonAt !== null ? countedMs(f.outreachAt ?? f.createdAt, f.wonAt) : f.outreachAt !== null && running ? countedMs(f.outreachAt, now) : null },
  ]
  return { legs, total: f.wonAt !== null ? countedMs(f.createdAt, f.wonAt) : null, age: countedMs(f.createdAt, now) }
}
/** The Overview's one line: "Assigned in 30m · First contact in 1.2h · Won in 12 days"; a running leg reads "First contact — 3 days running"
    (parity P-28: the house words, never "12d"). */
export function responseLine(r: ResponseTime): string {
  const parts = r.legs.filter((l) => l.state !== 'pending').map((l) => (l.state === 'done' ? `${l.label} in ${durationWords(l.ms)}` : `${l.label} — ${durationWords(l.ms)} running`))
  return parts.length ? parts.join(' · ') : 'Nothing logged yet'
}

/* ── (parity Q-20) The house Export, as Finance's reports have it: the page's numbers as one sheet (Finance's `reportSheet` shape) ── */
const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
/** Reports › Leads as rows: the three legs, what waits, By team member — the screen's own words and figures. */
export function insightsSheet(r: Report): { head: string[]; body: string[][] } {
  const body: string[][] = [['Turnaround'], ['Leg', 'Median', 'Average', 'Leads']]
  for (const { key, label } of LEGS) { const s = r.legs[key]; body.push([label, durationWords(s.median), durationWords(s.mean), String(s.count)]) }
  body.push([], ['Waiting now'], ['Leads awaiting assignment', String(r.awaitingAssignment)], ['Assigned, no outreach logged yet', String(r.awaitingOutreach)])
  body.push([], ['By team member'], ['Member', 'Role', 'Leads', 'Assign → First outreach', 'Average', 'First outreach → Won', 'Average', 'Won', 'Awaiting outreach'])
  for (const m of r.members) body.push([m.name, m.role, String(m.leads), durationWords(m.outreachMedian), durationWords(m.outreachMean), durationWords(m.wonMedian), durationWords(m.wonMean), String(m.won), m.awaitingOutreach ? String(m.awaitingOutreach) : BLANK])
  return { head: [`Leads · ${rangeLabel(r.days)} · ${plural(r.inRange, 'lead')} in range`], body }
}
