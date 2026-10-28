/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-06 · P-07 · P-08 · P-09 · Q-10 · lane D3) The grid's cards, pure and client-safe: **Your
 * day** (the week as seven days and a day's agenda: meetings, calls, the member's tasks, milestones, Hangouts — Accounting's money due), **Pipeline**
 * (leads by stage, the ones going quiet), **Projects** (one line each: health by rule — lib/dashboard/health.ts —, progress, the next fact),
 * **Team** (each member's load against their capacity, the contractors' line) and **On site** (the week's site photos). Read by
 * lib/dashboard/cards-queries.ts; the cards draw what they are given. The contract: brief.md § The cards. Lane D3 owns this file.
 * (the calm pass, 2026-10-26 — his "too busy … simplify" and the Claude Design option, with the six corrections; brief-calm.md, lane C3) The same
 * facts in fewer, quieter words: a time column for Your day (`when`), Team's segmented capacity (`loadOf`), On site's photos grouped by the
 * update they belong to. (2026-10-27) Pipeline's own stuck rule (§ 2.5) is gone for Sales' Going quiet — see `PipelineData.quiet`.
 *
 * INVENTED COPY (logged REG-D3.* · REG-C3.*): every sentence a card says that its module's page doesn't (the quiet line's "Nothing going quiet",
 * the contractors' line's lead-in, the empty days).
 */
import { calendarDaysBetween, dayWords } from '@/lib/format'
import { plural } from '@/lib/projects/schedule-model'
import type { ProjectHealth } from './health'

export type { ProjectHealth } from './health'

/* ── Your day ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type AgendaKind = 'meeting' | 'call' | 'task' | 'milestone' | 'hangout' | 'money'
export type AgendaItem = {
  key: string
  kind: AgendaKind
  day: number
  /** "10:00 AM" — the item's hour: the day's order, and what the time column says unless `when` says more. */
  time?: string
  /** (the calm pass) What the time column says when it isn't the plain hour: "by 4:30 PM" (a task due at its hour), "5 days late" (red). */
  when?: string
  title: string
  /** One line under the title: where · with whom · how long ("SkyOasis @ Dawson · with Germaine · 45 min"). */
  caption?: string
  href: string
  icon: string
  /** A task past its day (ours, late — red: the overdue clock is `isOverdue`). */
  late?: boolean
  /** A task: tick it done here (Undo). */
  taskId?: string
  /** A task ticked today — kept in the agenda, ticked, so the day reads as done. */
  done?: boolean
  /** A meeting whose time has passed (its write-up is Needs you's — one place for each thing). */
  ended?: boolean
  /** A call: the number to ring and its WhatsApp — and the lead it is with, so the call can be logged on return. */
  tel?: string
  wa?: string
  leadId?: string
  /** Who is rung, by first name ("Log the call with Farah"). */
  who?: string
  /** A meeting: Maison AI's "Prepare me" question for it. */
  prepare?: string
  /** A site visit or a Hangout: the place's map, for Directions. */
  maps?: string
}
export type WeekDay = {
  day: number
  /** "Mon" */
  weekday: string
  /** "26" */
  date: string
  /** "Monday 26 October" — the day's name in full (its button's label, the agenda's head) */
  full: string
  /** what the day holds (the dots, three at most) */
  count: number
}
export type DayData = {
  today: number
  /** Seven days from today (a phone scrolls them). */
  week: WeekDay[]
  /** Everything in the seven days, each day's own in order (late first, then by the clock, then the untimed) — a day pressed shows its own. */
  items: AgendaItem[]
  /** Today's done of today's: the member's tasks due today (late ones too) and today's meetings; a task ticked or a meeting held counts. */
  done: number
  total: number
  /** Where "Add a task" goes on a quiet week (the Tasks page, with the way back). */
  addHref: string
}

/** How many dots a day draws: what it holds, three at most. */
export const dotsOf = (count: number) => Math.min(3, Math.max(0, count))
/** The ring's words: "2 of 5 done" (nothing today — no ring). Kept for the record's readers; the calm pass draws the head's count instead. */
export const ringWords = (done: number, total: number) => (total ? `${done} of ${total} done` : '')
/** (the calm pass) The head's count beside "Your day": what is still ahead of you on the day shown — its rows not ticked, not held, not over. */
export const leftOf = (items: Pick<AgendaItem, 'done' | 'ended'>[]) => items.filter((x) => !x.done && !x.ended).length
/** A day's agenda in the card's order: what is ours and late first, then the clock, then the rest (milestones, untimed tasks) by title. */
export function agendaOrder(a: AgendaItem, b: AgendaItem): number {
  return a.day - b.day || Number(!!b.late) - Number(!!a.late) || Number(!a.time) - Number(!b.time) || clock(a.time) - clock(b.time) || a.title.localeCompare(b.title)
}
/** "10:00 AM" → minutes after midnight (untimed → the day's end). */
export function clock(t: string | undefined): number {
  const m = t ? /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim()) : null
  if (!m) return 24 * 60
  const h = Number(m[1]) % 12 + (m[3]!.toUpperCase() === 'PM' ? 12 : 0)
  return h * 60 + Number(m[2])
}
/** A meeting's length in the house words: "45 min" · "1 h" · "1 h 30 min" — from its planned start and end (else the one-hour default). */
export function lengthWords(startMs: number, endMs: number | null | undefined, fallbackMin = 60): string {
  const min = Math.max(5, Math.round(((endMs ?? startMs + fallbackMin * 60_000) - startMs) / 60_000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), r = min % 60
  return r ? `${h} h ${r} min` : `${h} h`
}
/** "5 days late" — a task's lateness, in the house's calendar days. */
export const lateWords = (dueMs: number, now: number) => `${dayWords(Math.max(1, calendarDaysBetween(dueMs, now)))} late`

/* ── Pipeline ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The journey the card draws, New → Won (On Hold and Lost wait outside it — the listing's own scopes). */
export const PIPELINE_JOURNEY = ['New', 'Contacted', 'Met', 'Quote Sent', 'Won'] as const
/** (the calm UI build 2026-10-27 — the audit's 1-34, T-17) the stage list's own labels — "Quote Sent", as the listing, the stage pill and the Move
    stage window write it (was "Quote sent" here alone) */
export const PIPELINE_WORD: Record<(typeof PIPELINE_JOURNEY)[number], string> = { New: 'New', Contacted: 'Contacted', Met: 'Met', 'Quote Sent': 'Quote Sent', Won: 'Won' }
export type PipelineStage = { stage: string; label: string; count: number; href: string }
export type PipelineData = {
  stages: PipelineStage[]
  /** going quiet — 2.0's one word for a lead that needs a nudge (Sales' rule: open, no contact for over QUIET_DAYS). (2026-10-27, his "take a
      call from our 2.0 consistency pov": the card's own "stuck" rule is gone — no other page knew it, Finance › To do's Stuck means waiting
      on someone else, and it opened no list) */
  quiet: number
  quietDays: number
  /** (the calm pass) the head's fact: the leads in the open stages the card draws (New → Quote sent) — On Hold waits outside, as on the bars */
  open: number
  /** the listing (every stage) — and Sales' Going quiet, where the quiet count is its own */
  href: string
  quietHref: string
  /** the largest stage — the bars' 100% */
  max: number
}
/** The facts a lead brings to the card: the listing row's stage, and its last contact (`lastContactOf`). */
export type PipelineLead = { stage: string; createdAt: number; lastContactAt: number | null }

/** Leads by stage: the listing's count for each stage, and the open ones going quiet (Sales' `quietDays` rule). */
export function pipelineOf(leads: PipelineLead[], now: number, o: { quietDays: number; href: (stage: string) => string; listHref: string; quietHref: string }): PipelineData | null {
  const stages = PIPELINE_JOURNEY.map((s) => ({ stage: s, label: PIPELINE_WORD[s], count: leads.filter((l) => l.stage === s).length, href: o.href(s) }))
  if (!stages.some((s) => s.count)) return null
  const working = leads.filter((l) => l.stage !== 'Won' && l.stage !== 'Lost' && l.stage !== 'On Hold')
  const quiet = working.filter((l) => calendarDaysBetween(l.lastContactAt ?? l.createdAt, now) > o.quietDays).length
  return {
    stages, quiet, quietDays: o.quietDays, open: stages.filter((s) => s.stage !== 'Won').reduce((n, s) => n + s.count, 0),
    href: o.listHref, quietHref: o.quietHref, max: Math.max(...stages.map((s) => s.count)),
  }
}
/** The line under the bars: "2 going quiet" — or, with none, that none is. */
export function pipelineLine(p: Pick<PipelineData, 'quiet'>): { quiet: string | null; none: string | null } {
  return { quiet: p.quiet ? `${p.quiet} going quiet` : null, none: p.quiet ? null : 'Nothing going quiet' }
}

/* ── Projects ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ProjectLine = {
  id: string
  /** "HDB 5-Room — Benjamin Han" — the project's own name, as its listing and its page say it */
  name: string
  client: string
  health: ProjectHealth
  /** every reason, worst first — the row's label says them all */
  healthWhy: string
  /** the health line in full: "At risk · More time asked on Carpentry" (the row's label) */
  line: string
  /** (the calm pass) the word at the line's right: "Late" · "At risk" · "On track" · "Starts 4 Nov" · "Setting up" · "On hold" */
  state: string
  /** (the calm pass) under the bar, one line: "62% · AquaFlow’s bill AF-7781 14 days overdue" · "Resumes 28 Nov ’26" — and in full, for its tooltip */
  caption: string
  captionFull: string
  /** done of all milestones, % (the listing's Progress) — and its words, "3 of 7 done" */
  progress: number
  progressWords: string
  href: string
}
/** `running` = the open projects (the old Open projects tile — not completed), whatever the card shows; `late` = those of them late by rule. */
export type ProjectsData = { lines: ProjectLine[]; running: number; late: number; href: string }
/** The card's rows before "Show n more" (a phone shows four). */
export const PROJECTS_SHOWN = 6
export const PROJECTS_SHOWN_PHONE = 4
export const progressWords = (done: number, total: number) => (total ? `${done} of ${total} done` : 'No milestones yet')
/** The head's fact: "4 running · 2 late" (the late part only when there is one). */
export const projectsHead = (p: Pick<ProjectsData, 'running' | 'late'>) => [`${p.running} running`, p.late ? `${p.late} late` : null].filter(Boolean).join(' · ')

/* ── Team ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type TeamLine = {
  id: string
  name: string
  initials: string
  /** the member's colour (or photo) as the house Avatar takes it */
  color: string | null
  count: number
  capacity: number
  /** over capacity — amber, never red: a load, not a lateness */
  over: boolean
  /** "Room for 1 more" · "Full" · "1 over" (Workload's own words) */
  words: string
  openLeads: number
  /** Open to new leads (Company › Members' switch) — the line says only when they're not */
  accepting: boolean
  href: string
}
export type TeamData = {
  lines: TeamLine[]
  href: string
  /** projects with no one on their team (Workload's "No one yet" row) */
  nobody: { count: number; href: string } | null
  /** the contractors' line from Workload › Contractors' board (`boardOf`) — or the door to mark them when the studio keeps none */
  contractors: { words: string; href: string; none: boolean } | null
}
export const TEAM_SHOWN = 5
/** A member's caption: "3 active leads" · "Closed to new leads" (Company › Members' words). (the calm UI build 2026-10-27 — the audit's 1-33,
    W-066) "active leads" (was "open leads" — "Open to new leads" a click away means taking leads). */
export function teamCaption(l: Pick<TeamLine, 'openLeads' | 'accepting'>): string {
  return [l.openLeads ? plural(l.openLeads, 'active lead') : 'No active leads', l.accepting ? null : 'closed to new leads'].filter(Boolean).join(' · ')
}
/** The contractors' line (S45B's tile, moved here; the calm pass): "3 free this week · 1 over capacity" — work starting with no contractor is
    Needs you's row (`crew-gap`, one place for each thing). */
export function contractorsWords(k: { contractors: number; freeNow: number; over: number }): string {
  if (!k.contractors) return 'None yet — mark the vendors who work on site'
  /* (the calm UI build 2026-10-27 — the audit's 1-33, W-072) "4 free this week, 1 overbooked" (was "4 free this week · 1 over capacity") */
  return [`${k.freeNow} free this week`, k.over ? `${k.over} overbooked` : null].filter(Boolean).join(', ')
}
/** A load bar's fill and its capacity mark, as shares of the bar (the first pass's continuous bar — kept for its readers). */
export function loadScale(count: number, capacity: number, top = Math.max(count, capacity)): { fill: number; mark: number } {
  const span = Math.max(1, top) * 1.25
  return { fill: Math.min(100, (count / span) * 100), mark: Math.min(100, (capacity / span) * 100) }
}
/** Past this many segments a capacity reads as one bar — a segment would be thinner than a dot. */
export const MAX_SEGMENTS = 8
/**
 * (the calm pass — the Claude Design option's "Team load") A member's load as segments: one per project they can carry, filled for each they
 * carry; over capacity the segments run on past it, the ones past it amber. The figure beside it: "Full" at capacity, "1 over" past it
 * (Workload's own words), else "2/3" — under the head's key "projects / capacity".
 */
export function loadOf(count: number, capacity: number): { segments: ('filled' | 'over' | 'empty')[]; figure: string; full: boolean; over: boolean; label: string } {
  const cap = Math.max(0, capacity), n = Math.max(0, count)
  const total = Math.max(1, cap, n)
  const segments = Array.from({ length: Math.min(total, MAX_SEGMENTS) }, (_, i) => {
    const at = total > MAX_SEGMENTS ? ((i + 0.5) / MAX_SEGMENTS) * total : i
    return at < Math.min(n, cap) ? 'filled' as const : at < n ? 'over' as const : 'empty' as const
  })
  const over = n > cap, full = n === cap && cap > 0
  /* (the calm UI build 2026-10-27 — the audit's 1-33, T-09 · W-067) the figure in words: "2 of 3 projects" · "Full (2 of 2)" · "1 over" (was
     "2/3" · "Full" under a "projects / capacity" key) */
  return { segments, over, full, figure: over ? `${n - cap} over` : full ? `Full (${n} of ${cap})` : `${n} of ${plural(cap, 'project')}`, label: `${plural(n, 'project')} of ${cap}${over ? ` — ${n - cap} over capacity` : full ? ' — full' : ''}` }
}

/* ── On site ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type SitePhoto = {
  key: string
  src: string | null
  alt: string
  /** the photo's words in full (its tooltip): "Kitchen cabinets are in · HDB 5-Room — Benjamin Han · 21 Oct" */
  caption: string
  href: string
  /** (the calm pass) the update it belongs to — the card groups a update's photos under one caption — its title, whose it is, and when */
  update: string
  title: string
  where: string
  when: string
  /** the update's photos in all (a group shows "· 5 photos" when it shows fewer) */
  photos: number
}
export type SiteData = {
  photos: SitePhoto[]
  /** the photos in the window and how many updates they came from */
  count: number
  updates: number
  href: string | null
}
/** The window: the last seven days, today included (the head says "this week"). */
export const SITE_DAYS = 7
/** (the calm pass) The tiles at rest — one row: three across in a card a column wide (two on a phone); "All n photos" shows the rest in place. */
export const SITE_SHOWN = 3
export const SITE_SHOWN_PHONE = 2
/** The most the card ever holds (the window's newest). */
export const SITE_MAX = 24
/** A run of tiles under one caption: the update's photos, in the order shown. */
export type SiteGroup = { update: string; photos: SitePhoto[] }
/** The tiles grouped by their update, in order (an update's photos sit side by side under its one caption). */
export function siteGroups(photos: SitePhoto[]): SiteGroup[] {
  const out: SiteGroup[] = []
  for (const p of photos) {
    const last = out[out.length - 1]
    if (last && last.update === p.update) last.photos.push(p); else out.push({ update: p.update, photos: [p] })
  }
  return out
}
