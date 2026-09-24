/*
 * (REG-611, parity R-01 · R-02 · R-03) Turnaround — 1.0's TAT report and Response time card, derived from 2.0's own records
 * (no write-once stamps): created → the first assignment (lead_assignees.assigned_at) → the first outreach (the earliest contact
 * log: a Contacted-stage log's entry or a Notes-tab contact log) → Won (the Won stage log; 1.0's Signed). Pure and client-safe:
 * the Insights page recomputes per range in the browser, the Overview prints one lead's line.
 */
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
export type Range = 30 | 90 | null
export const RANGES: { key: Range; label: string }[] = [{ key: 30, label: 'Last 30 days' }, { key: 90, label: 'Last 90 days' }, { key: null, label: 'All time' }]

const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000
const clamp = (ms: number) => Math.max(0, ms)   // 1.0 clamps a backdated leg to zero

export function legMs(f: LeadFacts, leg: LegKey): number | null {
  if (leg === 'assignment') return f.assignedAt === null ? null : clamp(f.assignedAt - f.createdAt)
  if (leg === 'outreach') return f.assignedAt === null || f.outreachAt === null ? null : clamp(f.outreachAt - f.assignedAt)
  return f.outreachAt === null || f.wonAt === null ? null : clamp(f.wonAt - f.outreachAt)
}
export const median = (xs: number[]): number | null => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2   // an even count = the mean of the two middles (1.0)
}
export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** 1.0's formatTatDuration: under an hour in minutes, under two days in hours (one decimal unless whole), else days; null → "—". */
export function formatTat(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`
  if (ms < 48 * HOUR) { const r = Math.round((ms / HOUR) * 10) / 10; return `${Number.isInteger(r) ? r : r.toFixed(1)}h` }
  return `${Math.round(ms / DAY)}d`
}
/** 1.0's tatGrade, for the assignment → outreach leg only: within 8 hours good, within a day warn, else bad. */
export type Grade = 'good' | 'warn' | 'bad'
export const tatGrade = (ms: number | null): Grade | null => (ms === null ? null : ms <= 8 * HOUR ? 'good' : ms <= 24 * HOUR ? 'warn' : 'bad')

export type StageStat = { median: number | null; mean: number | null; count: number; /** % vs the prior window; null when either side is missing or the change is 0 */ delta: number | null }
export type MemberRow = { id: string; name: string; role: string; color: string; leads: number; outreachMedian: number | null; outreachMean: number | null; outreachCount: number; wonMedian: number | null; won: number; awaitingOutreach: number }
export type Report = { days: Range; inRange: number; legs: Record<LegKey, StageStat>; awaitingAssignment: number; awaitingOutreach: number; members: MemberRow[] }
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
  const awaitingAssignment = cur.filter((f) => isOpen(f.stage) && f.assignedAt === null).length
  const awaitingOutreach = cur.filter((f) => isOpen(f.stage) && f.assignedAt !== null && f.outreachAt === null).length
  /* Leads count every current assignee; outreach and conversion go to whoever made the first outreach (1.0's attribution). */
  const members: MemberRow[] = team.map((m) => {
    const mine = cur.filter((f) => f.assigneeIds.includes(m.id))
    const reached = cur.filter((f) => f.outreachBy === m.id)
    const o = stat(reached, 'outreach'), w = stat(reached, 'won')
    return { id: m.id, name: m.name, role: m.role, color: m.color, leads: mine.length, outreachMedian: o.median, outreachMean: o.mean, outreachCount: o.count, wonMedian: w.median, won: reached.filter((f) => f.wonAt !== null).length, awaitingOutreach: mine.filter((f) => isOpen(f.stage) && f.outreachAt === null).length }
  }).filter((r) => r.leads > 0 || r.outreachCount > 0 || r.won > 0).sort((a, b) => b.leads - a.leads || a.name.localeCompare(b.name))
  return { days, inRange: cur.length, legs, awaitingAssignment, awaitingOutreach, members }
}

/** (R-03) One lead's three legs for the Overview: done · running (the clock still going) · pending. */
export type ResponseLeg = { key: LegKey; label: string; state: 'done' | 'running' | 'pending'; ms: number | null }
export type ResponseTime = { legs: ResponseLeg[]; total: number | null; age: number }
export function responseTime(f: Pick<LeadFacts, 'stage' | 'createdAt' | 'assignedAt' | 'outreachAt' | 'wonAt'>, now: number): ResponseTime {
  const running = f.stage !== 'Lost'
  const legs: ResponseLeg[] = [
    { key: 'assignment', label: 'Assigned', state: f.assignedAt !== null ? 'done' : running ? 'running' : 'pending', ms: f.assignedAt !== null ? clamp(f.assignedAt - f.createdAt) : running ? clamp(now - f.createdAt) : null },
    { key: 'outreach', label: 'First contact', state: f.outreachAt !== null ? 'done' : f.assignedAt !== null && running ? 'running' : 'pending', ms: f.outreachAt !== null ? clamp(f.outreachAt - (f.assignedAt ?? f.createdAt)) : f.assignedAt !== null && running ? clamp(now - f.assignedAt) : null },
    { key: 'won', label: 'Won', state: f.wonAt !== null ? 'done' : f.outreachAt !== null && running ? 'running' : 'pending', ms: f.wonAt !== null ? clamp(f.wonAt - (f.outreachAt ?? f.createdAt)) : f.outreachAt !== null && running ? clamp(now - f.outreachAt) : null },
  ]
  return { legs, total: f.wonAt !== null ? clamp(f.wonAt - f.createdAt) : null, age: clamp(now - f.createdAt) }
}
/** The Overview's one line: "Assigned in 30m · First contact in 1.2h · Won in 12d"; a running leg reads "First contact — 3d running". */
export function responseLine(r: ResponseTime): string {
  const parts = r.legs.filter((l) => l.state !== 'pending').map((l) => (l.state === 'done' ? `${l.label} in ${formatTat(l.ms)}` : `${l.label} — ${formatTat(l.ms)} running`))
  return parts.length ? parts.join(' · ') : 'Nothing logged yet'
}
