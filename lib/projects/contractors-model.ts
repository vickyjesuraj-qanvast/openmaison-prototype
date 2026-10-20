/**
 * (S45B · H-UHD-2 — his "build everything and complete it" 2026-10-17; 1.0's Contractor Dashboard for Urban Home Design, req. B4:
 * `src/lib/contractors/allocation.ts` · `trades.ts`, commit 4da810229) Contractors on site, in 2.0's shape — pure and client-safe, read by the
 * server actions, the project's Schedule, the Projects listing's Workload view and Finance › Vendors alike, so a word on one screen is the
 * word on every other.
 *
 * - **A contractor is a vendor** (Company › Finance › Vendors — one home, REG-1360…1380) marked as working on site, with the studio's trades
 *   they do (Settings › Quotes & pricing › Trades — one vocabulary, never a second list), how many sites they run at once and a code.
 * - **A crew row** = a contractor on a project for a trade: on one of its milestones (the window IS the milestone's dates, read when shown,
 *   so a move of the schedule moves it — nothing is copied) or on its own dates. Planned · On site · Done; a milestone marked done reads its
 *   crew done. "Leader checked" is a stamp on the row.
 * - **The board** (1.0's `computeAllocation`, its definitions kept): over the next seven days, a contractor is *free* with no work in them;
 *   *free within 7 days* when everything they are on ends inside them; *over capacity* when, on any of those days, more sites have them than
 *   they run at once (a day-by-day count — 1.0 counted the week, its own "later refinement"); and a milestone that reads as a trade some
 *   contractor does, starting within the seven days (or under way) with nobody of that trade on it, is *no contractor yet*. A row whose
 *   window has passed while its work is not done keeps its contractor until it is marked done ("running late"). A site on hold or handed over
 *   keeps nobody busy.
 * - **A milestone reads as a trade** by its words: "Masonry & tiling" is Masonry's and Tiling's, "Carpentry fabrication" Carpentry's — a
 *   word of the trade's name, its ending aside (1.0's keyword lists, from the studio's own trade names). Only trades some active contractor
 *   does count, so a studio that never marks a contractor never hears of a gap.
 *
 * INVENTED COPY (REG-S45B rows): every sentence below — the states, the windows, the refusals.
 */
import { dayMonth, plural, rangeLabel } from './schedule-model'
import { isAccounting, isMarketing, runsStudio } from '@/lib/settings/roles'

/* ── the record ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type CrewStatus = 'planned' | 'on_site' | 'done'
export const CREW_STATUSES: readonly CrewStatus[] = ['planned', 'on_site', 'done']
export const CREW_STATUS_LABEL: Record<CrewStatus, string> = { planned: 'Planned', on_site: 'On site', done: 'Done' }
export const isCrewStatus = (v: unknown): v is CrewStatus => v === 'planned' || v === 'on_site' || v === 'done'
/** 1.0's IDLE_WINDOW_DAYS: how far "free" and "no contractor yet" look ahead. */
export const LOOK_AHEAD_DAYS = 7
export const CREW_CAPACITY_MIN = 1
export const CREW_CAPACITY_MAX = 20
export const CODE_MAX = 20
export const CREW_NOTE_MAX = 600

/** A contractor as every screen reads them: a vendor marked as working on site. */
export type Contractor = { id: string; name: string; trades: string[]; capacity: number; code: string | null; phone: string | null; isActive: boolean }
/** A crew row. Days are day numbers (lib/projects/schedule-model.ts `dayOf`); `checkedAt` a moment (ms). */
export type CrewRow = {
  id: string; projectId: string; vendorId: string; vendorName: string; trade: string; milestoneId: string | null; ownStart: number | null; ownEnd: number | null
  status: CrewStatus; note: string | null; checkedBy: string | null; checkedByName: string | null; checkedAt: number | null
}
export type SiteMilestone = { id: string; title: string; start: number; end: number; status: string }
/** A project as the board reads it — `visible`: the viewer sees it (Who sees leads); `mayAssign`: they may put a contractor on it. */
export type Site = { id: string; name: string; number: string; client: string; stage: string; onHold: boolean; visible: boolean; mayAssign: boolean; milestones: SiteMilestone[] }

/* ── words ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A company's name without its "Pte Ltd" — the name a crew chip and a sentence read. */
export const shortVendor = (name: string): string => {
  const s = name.replace(/\b(pte\.?|ltd\.?|private|limited|llp|sdn\.?\s*bhd\.?)(?=\s|$)/gi, '').replace(/\s+/g, ' ').trim().replace(/[\s,&.-]+$/, '')
  return s || name.trim()
}
/** "Carpentry · Tiling" — a contractor's trades in a line. */
export const tradesLine = (c: Pick<Contractor, 'trades'>): string => (c.trades.length ? c.trades.join(' · ') : 'No trade set')
/** The studio's trade names are compared case-blind. */
export const sameTrade = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
export const doesTrade = (c: Pick<Contractor, 'trades'>, trade: string) => c.trades.some((t) => sameTrade(t, trade))
/** A contractor's trades as stored (`vendors.trades_json`): a JSON list of names, the studio's spelling kept, empties and twins dropped. */
export function parseCrewTrades(v: unknown): string[] {
  let raw: unknown = v
  if (typeof v === 'string') { try { raw = JSON.parse(v) } catch { raw = [] } }
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>(), out: string[] = []
  for (const x of raw) { if (typeof x !== 'string') continue; const t = x.trim().replace(/\s+/g, ' ').slice(0, 60); if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t) } }
  return out.slice(0, 20)
}
export const clampCrewCapacity = (n: unknown): number | null => {
  const v = typeof n === 'number' ? n : typeof n === 'string' && n.trim() ? Number(n) : NaN
  return Number.isFinite(v) && v >= CREW_CAPACITY_MIN && v <= CREW_CAPACITY_MAX ? Math.round(v) : null
}

/* ── who may (the *Who may do what* rows in lib/settings/permissions.ts read these) ───────────────────────────────────────────── */

/** The Workload view's Contractors: everyone who works on projects — Owners, Admins, Managers and Designers (1.0: owner · admin · id). */
export const seesContractors = (role: string | null | undefined) => !isAccounting(role) && !isMarketing(role)
/** Putting a contractor on a project, changing or removing them: whoever changes the project (lib/projects/policy.ts `mayChangeProject`). */
export const ASSIGN_RULE = 'Only the project’s team, their Managers, Owners and Admins put contractors on a project'
/** "Leader checked": a sign-off — Owners, Admins and Managers (1.0's sheet: a supervisor's column), on a project they change. */
export const checksCrew = (role: string | null | undefined) => runsStudio(role) || role === 'Manager'
export const CHECK_RULE = 'Only an Owner, an Admin or a Manager marks a contractor’s work Leader checked'
export const ROLE_RULE = 'Contractors are put on projects by the people who run them — Accounting and Marketing don’t'

/* ── windows and states ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A row's window: its milestone's dates while it is on one, else its own. `null` sides are open. */
export function windowOf(r: Pick<CrewRow, 'milestoneId' | 'ownStart' | 'ownEnd'>, m: Pick<SiteMilestone, 'start' | 'end'> | null | undefined): { start: number | null; end: number | null } {
  if (r.milestoneId && m) return { start: m.start, end: m.end }
  return { start: r.ownStart, end: r.ownEnd }
}
/** A row's status as read: a milestone marked done reads its crew done. */
export const statusOf = (r: Pick<CrewRow, 'status'>, m: Pick<SiteMilestone, 'status'> | null | undefined): CrewStatus => (m?.status === 'done' ? 'done' : r.status)
/** "16 Sep – 10 Oct" · "From 3 Nov" · "Until 7 Nov" · "No dates". */
export function windowWords(w: { start: number | null; end: number | null }): string {
  if (w.start !== null && w.end !== null) return rangeLabel(w.start, w.end)
  if (w.start !== null) return `From ${dayMonth(w.start)}`
  if (w.end !== null) return `Until ${dayMonth(w.end)}`
  return 'No dates'
}
/** A site keeps a contractor busy while it runs: not handed over, not on hold. */
export const siteRuns = (s: Pick<Site, 'stage' | 'onHold'>) => s.stage !== 'completed' && !s.onHold

/** One crew row with everything a screen says of it. */
export type CrewJob = CrewRow & { start: number | null; end: number | null; state: CrewStatus; milestone: SiteMilestone | null; site: Site | null; late: boolean }
export function jobOf(r: CrewRow, sites: ReadonlyMap<string, Site>, today: number): CrewJob {
  const site = sites.get(r.projectId) ?? null
  const milestone = r.milestoneId ? site?.milestones.find((m) => m.id === r.milestoneId) ?? null : null
  const w = windowOf(r, milestone)
  const state = statusOf(r, milestone)
  return { ...r, start: w.start, end: w.end, state, milestone, site, late: state !== 'done' && w.end !== null && w.end < today }
}
/** A row whose milestone was deleted from the schedule keeps nobody busy (its Undo brings both back); the row says so. */
const orphan = (j: CrewJob) => !!j.milestoneId && !j.milestone
/** Whether the row keeps its contractor busy on `day`: not done, on a running site, the day inside its window — a window that passed while
    the work is not done runs on until it is marked done. */
export function busyOn(j: CrewJob, day: number): boolean {
  if (j.state === 'done' || !j.site || !siteRuns(j.site) || orphan(j)) return false
  if (j.start !== null && day < j.start) return false
  if (j.end !== null && day > j.end && !j.late) return false
  return true
}
/** How many SITES keep them busy on a day — two trades on one project are one site (crew capacity counts sites, 1.0's "concurrent sites"). */
const sitesOn = (jobs: CrewJob[], day: number) => new Set(jobs.filter((j) => busyOn(j, day)).map((j) => j.projectId)).size
const busyIn = (j: CrewJob, from: number, to: number) => {
  if (j.state === 'done' || !j.site || !siteRuns(j.site) || orphan(j)) return false
  const end = j.late || j.end === null ? Infinity : j.end
  return (j.start === null || j.start <= to) && end >= from
}

export type CrewState = 'free' | 'room' | 'full' | 'over'
export type ContractorLine = {
  contractor: Contractor
  /** What keeps them busy in the next seven days, by start. */
  jobs: CrewJob[]
  /** Booked after the seven days. */
  later: CrewJob[]
  /** The most sites they are on, on any one of the seven days. */
  peak: number
  state: CrewState
  /** The day after everything in the seven days ends; null while free, or when a site runs late or has no end. */
  freeFrom: number | null
  words: string
  /** The line under the chip: "1 of 2 sites · free from 24 Oct". */
  detail: string
}
export const CREW_TONE: Record<CrewState, 'green' | 'yellow' | 'red'> = { free: 'green', room: 'green', full: 'yellow', over: 'red' }

/** (1.0's Window chips — This week · Next 2 weeks · Next 30 days) how far the board looks for who is busy; free-within and the gaps keep
    1.0's seven days whatever the window. */
export const CREW_WINDOWS = [{ days: 7, label: 'This week', words: 'this week' }, { days: 14, label: 'Next 2 weeks', words: 'in the next 2 weeks' }, { days: 30, label: 'Next 30 days', words: 'in the next 30 days' }] as const
export const windowWordsOf = (days: number) => CREW_WINDOWS.find((w) => w.days === days)?.words ?? 'this week'

export function lineOf(c: Contractor, jobs: CrewJob[], today: number, days: number = LOOK_AHEAD_DAYS): ContractorLine {
  const to = today + days - 1
  const mine = jobs.filter((j) => j.vendorId === c.id)
  const now = mine.filter((j) => busyIn(j, today, to)).sort((a, b) => (a.start ?? -Infinity) - (b.start ?? -Infinity))
  const later = mine.filter((j) => j.state !== 'done' && !!j.site && siteRuns(j.site) && !orphan(j) && j.start !== null && j.start > to).sort((a, b) => a.start! - b.start!)
  let peak = 0
  for (let d = today; d <= to; d++) peak = Math.max(peak, sitesOn(now, d))
  const open = now.some((j) => j.late || j.end === null)
  const freeFrom = now.length && !open ? Math.max(...now.map((j) => j.end!)) + 1 : null
  const cap = Math.max(1, c.capacity)
  const state: CrewState = now.length === 0 ? 'free' : peak > cap ? 'over' : peak === cap ? 'full' : 'room'
  const lateSite = now.find((j) => j.late)
  const words = state === 'free' ? `Free ${windowWordsOf(days)}`
    : state === 'over' ? `${peak - cap} over`
      : state === 'full' ? 'Full'
        : `Room for ${cap - peak} more`
  const when = freeFrom !== null ? `free from ${dayMonth(freeFrom)}` : lateSite ? `${lateSite.site?.visible ? `${lateSite.site.client}’s site` : 'a site'} runs late` : now.length ? 'no end date' : later[0]?.start != null ? `next on ${dayMonth(later[0].start)}` : 'nothing booked'
  /* the Members view's count grammar — "2 of 1" — then when they are free */
  return { contractor: c, jobs: now, later, peak, state, freeFrom, words, detail: `${peak} of ${cap} · ${when}` }
}

/** A milestone that reads as a trade some contractor does, starting within the seven days (or already under way), with nobody of that trade on it. */
export type Unstaffed = { key: string; site: Site; milestone: SiteMilestone; trade: string; started: boolean }

/** Every word of a name, lower case. */
const wordsOf = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter(Boolean)
const SUFFIXES = ['ings', 'ians', 'ers', 'ing', 'ian', 'ery', 'ry', 'er', 'al', 's']
const stem = (w: string) => { for (const s of SUFFIXES) if (w.endsWith(s) && w.length - s.length >= 3) return w.slice(0, -s.length); return w }
const wordsMatch = (a: string, b: string) => { if (a === b) return true; const x = stem(a), y = stem(b); return x === y || (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x))) }
/** The trades (of `trades`) a milestone's name reads as — "Electrical & plumbing" → Electrical, Plumbing. */
export function tradesOfTitle(title: string, trades: readonly string[]): string[] {
  const tw = wordsOf(title)
  return trades.filter((t) => wordsOf(t).some((w) => w.length >= 3 && tw.some((x) => wordsMatch(w, x))))
}
/** Whether a crew row covers this milestone for its trade: on it, or its own window meets the milestone's. */
const covers = (j: CrewJob, m: SiteMilestone) => j.milestoneId === m.id || (j.start !== null && j.end !== null && j.start <= m.end && j.end >= m.start) || (j.start === null && j.end === null && !j.milestoneId)

export function unstaffedOf(sites: Site[], jobs: CrewJob[], trades: readonly string[], today: number): Unstaffed[] {
  const to = today + LOOK_AHEAD_DAYS - 1
  const out: Unstaffed[] = []
  if (!trades.length) return out
  for (const s of sites) {
    if (!siteRuns(s)) continue
    for (const m of s.milestones) {
      if (m.status === 'done' || m.start > to) continue
      for (const t of tradesOfTitle(m.title, trades)) {
        if (jobs.some((j) => j.projectId === s.id && sameTrade(j.trade, t) && covers(j, m))) continue
        out.push({ key: `${s.id}:${m.id}:${t.toLowerCase()}`, site: s, milestone: m, trade: t, started: m.start <= today })
      }
    }
  }
  return out.sort((a, b) => a.milestone.start - b.milestone.start || a.site.name.localeCompare(b.site.name))
}
/** "Starts Wed 21 Oct" · "Started 14 Oct" — the gap's day, plainly. */
export const startWords = (u: Pick<Unstaffed, 'milestone' | 'started'>, today: number): string =>
  u.milestone.start === today ? 'starts today'
    : u.started ? (u.milestone.status === 'not_started' ? `was to start ${dayMonth(u.milestone.start)}` : `started ${dayMonth(u.milestone.start)}`)
      : u.milestone.start === today + 1 ? 'starts tomorrow' : `starts in ${plural(u.milestone.start - today, 'day')}`

export type ContractorBoard = {
  lines: ContractorLine[]
  unstaffed: Unstaffed[]
  kpis: { freeNow: number; freeSoon: number; over: number; unstaffed: number; contractors: number; sites: number }
  /** The trades a contractor does or a crew row names — the By site view's columns, in the studio's order. */
  trades: string[]
}
/** The board: one line per active contractor — free first, then over capacity, then the rest by name (1.0's order) — the gaps, the figures. */
export function boardOf(contractors: Contractor[], crew: CrewRow[], sites: Site[], studioTrades: readonly string[], today: number, days: number = LOOK_AHEAD_DAYS): ContractorBoard {
  const bySite = new Map(sites.map((s) => [s.id, s]))
  const jobs = crew.map((r) => jobOf(r, bySite, today))
  const live = contractors.filter((c) => c.isActive)
  const rank: Record<CrewState, number> = { free: 0, over: 1, full: 2, room: 3 }
  const lines = live.map((c) => lineOf(c, jobs, today, days)).sort((a, b) => rank[a.state] - rank[b.state] || a.contractor.name.localeCompare(b.contractor.name))
  const covered = staffedTrades(live, studioTrades)
  const unstaffed = unstaffedOf(sites, jobs, covered, today)
  const trades = [...covered, ...crew.map((r) => r.trade)].filter((t, i, a) => a.findIndex((x) => sameTrade(x, t)) === i)
  const to = today + LOOK_AHEAD_DAYS - 1
  return {
    lines, unstaffed, trades,
    kpis: {
      freeNow: lines.filter((l) => l.state === 'free').length,
      freeSoon: lines.filter((l) => l.state !== 'free' && l.freeFrom !== null && l.freeFrom <= to + 1).length,
      over: lines.filter((l) => l.state === 'over').length,
      unstaffed: unstaffed.length,
      contractors: lines.length,
      sites: sites.filter(siteRuns).length,
    },
  }
}
/** The trades the studio staffs with contractors: the studio's own list first (its order), then any a contractor names that the list lacks. */
export function staffedTrades(contractors: Pick<Contractor, 'trades' | 'isActive'>[], studioTrades: readonly string[]): string[] {
  const named = contractors.filter((c) => c.isActive).flatMap((c) => c.trades)
  const inList = studioTrades.filter((t) => named.some((n) => sameTrade(n, t)))
  const rest = named.filter((n, i) => !studioTrades.some((t) => sameTrade(t, n)) && named.findIndex((x) => sameTrade(x, n)) === i)
  return [...inList, ...rest]
}

/* ── the Assign dialog's words ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** How a contractor stands over a window — the Assign dialog's line under each name: "Free on these days" · "Room for 1 more on these days"
    · "Full on these days — on Ryan’s carpentry fabrication". `except` = the row being moved (it doesn't count against itself). */
export function availabilityOver(c: Contractor, jobs: CrewJob[], from: number, to: number, except?: string | null): { state: CrewState; words: string } {
  const mine = jobs.filter((j) => j.vendorId === c.id && j.id !== except && busyIn(j, from, to))
  const last = Math.min(to, from + 90)
  let peak = 0
  for (let d = from; d <= last; d++) peak = Math.max(peak, sitesOn(mine, d))
  const cap = Math.max(1, c.capacity)
  if (!mine.length) return { state: 'free', words: 'Free on these days' }
  const on = mine.find((j) => j.site?.visible)
  const where = on ? ` — on ${on.site!.client}’s ${on.milestone ? on.milestone.title.toLowerCase() : on.trade.toLowerCase()}` : ''
  if (peak < cap) return { state: 'room', words: `Room for ${cap - peak} more on these days${where}` }
  return { state: peak > cap ? 'over' : 'full', words: `Full on these days${where}` }
}

/** The schedule row's crew words: "Woodcraft Carpentry on site" · "Bright Spark Electrical and AquaFlow Plumbing Works booked" · "3
    contractors" — null when nobody is on it. */
export function crewWords(jobs: CrewJob[]): string | null {
  if (!jobs.length) return null
  const names = [...new Set(jobs.map((j) => shortVendor(j.vendorName)))]
  const who = names.length > 2 ? `${names.length} contractors` : names.join(' and ')
  const states = new Set(jobs.map((j) => j.state))
  const one = states.size === 1 ? [...states][0] : null
  return one === 'on_site' ? `${who} on site` : one === 'planned' ? `${who} booked` : one === 'done' ? `${who} done` : who
}
