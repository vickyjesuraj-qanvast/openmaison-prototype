/**
 * (pending modules S22 — cards studio:dashboard · held:dashboard · api:industry-news · public:industry-news-feed; her "build all of them"
 * 2026-10-11 lifted the Dashboard's hold) **The Dashboard** — 1.0's front door (`/dashboard`, its rail's first item, the logo, the dock's Home),
 * rebuilt in 2.0's shape: ONE page that answers **What needs me → What's next → Where it stands** for whoever is signed in, built from what
 * the studio already works out, every row and tile a door into the thing's one home (`?from=/dashboard` where the home has a Back). Nothing
 * here is a second copy of a list or a number computed another way:
 *
 *   · **Needs you** — one row per PLACE that waits on you: each project's own Needs you (lib/projects/needs-you.ts, its top row and how many
 *     more), Finance › To do (its count, `todoCountOf`), the approvals the rail counts (`railBadges`: quotes, templates, the Price book, AI
 *     credits), the Leads listing's own to-do scopes (Unassigned · Overdue follow-ups, `inAttention`), the meetings to write up (S23's
 *     `standingOf`), the projects' compliance still to do in their phase (`complianceCountsOf`, 1.0's Compliance Alerts) and, for an Owner
 *     or an Admin while it is open, Set up your studio (S08's list) — approvals first under *Needs your OK*, then Q-03's order, red only for
 *     what is past its day and ours;
 *   · **My tasks** — the lead's MY TASKS card over the viewer's own open tasks (the rail badge's rule);
 *   · **Coming up** — this week and next: the projects' own Coming up (milestones, outside people, the client's meetings), the viewer's
 *     meetings, the Hangouts the studio takes part in; Accounting's is the money due in the window (To do's own rows);
 *   · **Where it stands** — the house tiles over the listings' and Reports' own numbers (Leads · Projects · Messages · Owed to you · Profit
 *     this month), by role; the team's load (Projects › Workload's lines) for whoever sees it; the latest site updates for an Owner or an
 *     Admin; and one article from Market Insights (1.0's Industry News card — one reader, S25).
 *
 * Pure and client-safe: the server assembles the facts (lib/dashboard/queries.ts), the page and its ghost read them.
 * INVENTED COPY (logged REG-S22.*): every row's, tile's and card's words below — *Needs you* · *Needs your OK* · *Where it stands* · *Coming up*
 * keep the project Overview's own words.
 */
import type { Brief } from '@/lib/leads/briefs'
import { runsStudio, isAccounting, isMarketing } from '@/lib/settings/roles'

export const DASHBOARD = '/dashboard'

export type DashTone = 'late' | 'approve' | 'neutral'
/** A Needs you row: what waits, where it lives, and its one button. `open` = the words' door (the place); `action` = the button's (the step). */
export type DashRow = {
  key: string
  kind: string
  /** Needs your OK — an approval waiting on this viewer (the group label above them, the primary on the icon). */
  ok: boolean
  icon: string
  title: string
  caption?: string
  tone: DashTone
  open: string
  action: { label: string; href: string }
  /** Q-03's place: 1 ok · 2 money · 3 stage · 4 the client waiting · 5 late work · 6 telling the client · 7 set-up leftovers · 8 compliance · 9 the studio's set-up */
  rank: number
  /** A project's row: the Needs you row it stands for (its glyph is the project card's, components/projects/overview/needs-card.tsx `needIcon`). */
  need?: { kind: string; tab: string }
  /** How the brief names the row when it is the first — a project's row says which project ("Condo 3-bedder — Marcus Teo is on hold"). */
  phrase?: string
}
/** A Where it stands tile — `StatTile`'s words and its door. */
export type DashTile = { key: string; label: string; value: string; help?: string; grade?: 'good' | 'warn' | 'bad'; href: string; aria: string }
/** A Coming up row: a day number (lib/projects/schedule-model.ts `dayOf`), its words and the record it opens. */
export type DashComing = { key: string; day: number; title: string; caption?: string; icon: string; href: string }
/** The team's load: Projects › Workload's line (projects against capacity) and the member's open leads (`fetchMemberStats().active`). */
export type DashPerson = { key: string; name: string; caption: string; meta?: string; over: boolean }
export type DashUpdate = { key: string; title: string; caption: string; icon: string; href: string }
export type DashArticle = { id: string; title: string; caption: string; href: string }

/** What the ghost draws for this viewer (the app shell's seed reads the same rules, lib/ghost-shapes.server.ts `dashboardShape`). */
export type DashboardShape = { tiles: number; team: boolean; updates: boolean; article: boolean }

export type DashboardData = {
  viewer: { id: string; first: string; role: string }
  now: number
  today: number
  brief: Brief
  /** The brief's two questions and the page's others — each asked of Maison AI (its sheet answers from the records). */
  asks: string[]
  needs: DashRow[]
  /** The viewer's open tasks (MY TASKS), and where each one is — a lead's or a project's name. */
  tasks: import('@/lib/db/schema').LeadTask[]
  where: Record<string, string>
  coming: DashComing[]
  tiles: DashTile[]
  team: DashPerson[] | null
  updates: DashUpdate[] | null
  article: DashArticle | null
  shape: DashboardShape
}

/** How many Needs you rows show before "Show n more" — the project Overview's own (lib/projects/needs-you.ts NEEDS_SHOWN / _PHONE). */
export { NEEDS_SHOWN, NEEDS_SHOWN_PHONE, COMING_UP_SHOWN_PHONE } from '@/lib/projects/needs-you'
/** Coming up's rows at a desk before its fold — the project's card shows six (lib/projects/queries.ts `comingUp`). */
export const COMING_SHOWN = 6
/** The team's rows before the fold — Projects › Workload lists everyone. */
export const TEAM_SHOWN = 5
/** The latest site updates: the last fortnight's three newest (1.0's owner feed kept twenty; Updates keeps them all). */
export const UPDATES_SHOWN = 3
export const UPDATES_WINDOW_DAYS = 14

/** Who sees the team's load — Projects › Workload's rule (lib/projects/workload.ts `seesWorkload`, I-Q1). */
export const seesTeam = (role: string | null | undefined) => role === 'Owner' || role === 'Admin' || role === 'Manager'
/** Who sees the latest site updates — 1.0's owner feed; in 2.0 the studio's runners (Owners and Admins share every rule but the plan). */
export const seesSiteUpdates = (role: string | null | undefined) => runsStudio(role)
/** Where it stands' tiles for a role, by their captions: the studio's (Leads · Sales · Response time · Open projects · Contractors · Tickets ·
    Messages · Owed to you · Profit this month — S45A added Reports › Leads' two, S45B Contractors, S46B Tickets), a
    Manager's three over their team, a Designer's three over their own, the books' three (Reports › Finance's Owed to you · You owe, the P&L's
    profit). The page and its ghost read the same list. */
export function tileLabelsFor(role: string | null | undefined, /** (pending modules S41b-1) sees costs and margins — else no Profit tile */ costs = true): string[] {
  if (isAccounting(role)) return costs ? ['Owed to you', 'You owe', 'Profit this month'] : ['Owed to you', 'You owe']
  /* (pending modules S45A — H-UHD-3) Reports › Leads' Sales (Owners and Admins) and Response time (whoever reads the report) beside Leads */
  if (isMarketing(role)) return ['Leads', 'Response time']   // (S44O — call C6) the lead desk's figures: the pipeline, the listing's own count
  /* (pending modules S45B — H-UHD-2) the Workload view's Contractors after Open projects, for whoever reads the Workload view */
  /* (pending modules S46B, M1) Projects › Tickets' figure after the projects' own, for whoever opens projects — the Projects ⋮ row's count */
  if (runsStudio(role)) return costs ? ['Leads', 'Sales', 'Response time', 'Open projects', 'Contractors', 'Tickets', 'Messages', 'Owed to you', 'Profit this month'] : ['Leads', 'Sales', 'Response time', 'Open projects', 'Contractors', 'Tickets', 'Messages', 'Owed to you']
  if (role === 'Manager') return ['Leads', 'Open projects', 'Contractors', 'Tickets', 'Messages']
  return ['My leads', 'My projects', 'Tickets', 'Messages']
}
export const tileCountFor = (role: string | null | undefined, costs = true) => tileLabelsFor(role, costs).length
export const shapeFor = (role: string | null | undefined, o: { updates: boolean; article: boolean; costs?: boolean }): DashboardShape =>
  ({ tiles: tileCountFor(role, o.costs !== false), team: seesTeam(role), updates: seesSiteUpdates(role) && o.updates, article: !isAccounting(role) && o.article })

/** "Good morning" · "Good afternoon" · "Good evening" — 1.0's greeting (chat-first-home.tsx `getGreeting`), by the studio's clock. */
export const greetingOf = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')

const clip = (s: string, n = 48) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t }

/**
 * The page's MAISON AI BRIEF (the lead's mocked card, 858:24867): the greeting, then what the page holds in one sentence — how many things
 * need you and the first of them, else that nothing does, and the day's tasks. Two lines at most (the card clamps them). Invented copy.
 */
export function dashboardBrief(o: { greeting: string; first: string; dayLabel: string; needs: DashRow[]; overdue: number; dueToday: number; meetingsToday: number; asks: [string, string] }): Brief {
  const n = o.needs.length
  const top = o.needs[0]
  const text: Brief['text'] = [{ t: `${o.greeting}, ${o.first}. ` }]
  const first = top ? clip(top.phrase ?? top.title, 72) : ''
  if (n === 1 && top) text.push({ t: 'One thing needs you: ' }, { t: first, bold: true }, { t: '.' })
  else if (n && top) text.push({ t: `${n} things need you`, bold: true }, { t: ' — first, ' }, { t: first, bold: true }, { t: '.' })
  else text.push({ t: 'Nothing waits on you', bold: true }, { t: '.' })
  const day: string[] = []
  if (o.overdue) day.push(o.overdue === 1 ? '1 task is overdue' : `${o.overdue} tasks are overdue`)
  if (o.dueToday) day.push(o.dueToday === 1 ? '1 task is due today' : `${o.dueToday} tasks are due today`)
  if (o.meetingsToday) day.push(o.meetingsToday === 1 ? '1 meeting today' : `${o.meetingsToday} meetings today`)
  if (day.length) text.push({ t: ' ' }, { t: day.join(' · '), bold: false }, { t: '.' })
  return { tag: `Today · ${o.dayLabel}`, text, actions: o.asks }
}

/** The brief's two questions, by role — each answered by Maison AI from the records (lib/maison-ai/intents.ts: missed · overview · team ·
    next_meeting · owed · leads_attention). Invented copy. */
export function asksFor(role: string, o: { meetingAhead: boolean }): [string, string] {
  if (isAccounting(role)) return ['What did I miss?', 'Who owes the studio money?']
  if (isMarketing(role)) return ['What did I miss?', 'Which leads need attention?']   // (S44O — C6)
  if (runsStudio(role)) return ['What did I miss?', 'How is the studio doing?']
  if (role === 'Manager') return ['What did I miss?', 'Who on my team is busy?']
  return ['What did I miss?', o.meetingAhead ? 'Prepare me for my next meeting' : 'Which leads need attention?']
}
/** The page's other questions (the FAB sheet lists them after the brief's two) — 1.0's capability chips a role reaches for, its "Site Update"
    chip among them (Maison AI lists the running projects, each opening its Updates composer). */
export function moreAsksFor(role: string, o: { setupOpen: boolean }): string[] {
  if (isAccounting(role)) return ['What are my tasks today?', 'What’s the GST this quarter?']
  if (isMarketing(role)) return ['What are my tasks today?']   // (S44O — C6) no site update to draft, no studio set-up to run
  return ['What are my tasks today?', ...(o.setupOpen ? ['What’s left to set up?'] : []), 'Which leads need attention?', 'Draft a site update']
}

/** Needs you's order: Needs your OK first, then Q-03's places; inside a place, what is late first, then as its producer listed it. */
export function orderNeeds(rows: DashRow[]): DashRow[] {
  const toneRank = (r: DashRow) => (r.tone === 'late' ? 0 : 1)
  return rows.map((r, i) => ({ r, i })).sort((a, b) => Number(b.r.ok) - Number(a.r.ok) || a.r.rank - b.r.rank || toneRank(a.r) - toneRank(b.r) || a.i - b.i).map(({ r }) => r)
}

/** A project's Needs you row's place (lib/projects/needs-you.ts `rankOf`, Q-03), on the Dashboard's scale: a hold's Resume and Start
    first, then money, Complete handover, the client waiting on us, late work, telling the client, set-up leftovers. */
export function rankOfNeed(group: string, kind: string): number {
  if (group === 'stage') return kind === 'handover' ? 3 : 1
  return ({ ok: 1, money: 2, client: 4, late: 5, tell: 6, setup: 7 } as Record<string, number>)[group] ?? 7
}

/** "this week and next": the end of next week (Sunday), as a project's Coming up counts it (lib/projects/queries.ts `windowEnd`). */
export const comingWindowEnd = (today: number, weekday: number) => today + ((7 - weekday) % 7) + 7

/** Coming up's list: what falls in the window, else the next three (the project card's rule), soonest first, each once. */
export function comingList(items: DashComing[], today: number, windowEnd: number): DashComing[] {
  const seen = new Set<string>()
  const all = items.filter((x) => x.day >= today && !seen.has(x.key) && seen.add(x.key)).sort((a, b) => a.day - b.day || a.title.localeCompare(b.title))
  const soon = all.filter((x) => x.day <= windowEnd)
  return soon.length >= 3 ? soon : all.slice(0, 3)
}
