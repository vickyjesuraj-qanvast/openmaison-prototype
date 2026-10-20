/**
 * (pending modules S39 — card studio:studio-health: 1.0's Accounts › Studio › Studio Health, "how your team is using OpenMaison"; his "build all
 * of them" 2026-10-11, in its right form) Company › Reports › **Studio health** — 1.0's page on the house Reports pattern (lib/leads/tat.ts,
 * lib/projects/insights-model.ts, lib/meetings/report-model.ts): the loader hands over each record's moment once (lib/studio-health/queries.ts)
 * and every figure derives per range in the browser. Pure and client-safe.
 *
 * 1.0 built it on page-view tracking, fire-and-forget usage events and a nightly rollup (`usage_events` · `usage_daily_rollup` · the 03:00
 * cron). His Accounts Setup Q-16 answer declined that telemetry; 2.0's records already name who did what and when, so the page reads them and
 * nothing new is tracked. **No number is worked out twice**: each figure is the same count another page shows —
 *   - **Active members** — members with at least one act in the range (lib/studio-health/sources.ts: every record that names its doer — a
 *     stage moved, a note, a task, a quote, a file, a message, an AI run, a sign-in…), of the studio's active members (Company › Members).
 *   - **Sign-ins** — sign-ins started in the range (`studio_sessions`, S30) and how many members made them.
 *   - **AI runs** — Plan › Usage's own rule: each charge is one run (its "Times used"), the credits net of refunds (its "Used").
 *   - **Leads added** — Reports › Leads' "leads in range" (its `insightsReport`, the same facts). **Projects started · completed** — Reports ›
 *     Projects' tiles (its `projectsReport`, the same facts).
 *   - **Quotes sent** — quotes (not variation orders) as they stand sent to the client, by the day they went (`client_sent_at`), on live leads.
 *     **Invoices sent** — project invoices sent in the range, on live projects.
 *   - **Tasks done** — a done task, on the day its own record says it was ticked (its `task_completed` line in Activity, else its last change),
 *     against the tasks added in the range; a task counts for whoever ticked it.
 *   - **Tickets resolved** — a ticket resolved or closed in the range, against those raised in it. **Site updates** — the Dashboard's rule
 *     (published, on live projects). **Hangout chats** — chats held at a Hangout (its "Chats held").
 *   - **Your clients** — Qanvast Ops › Studios' four usage figures (lib/platform-studios.ts): portal sign-ins, issues raised, messages from
 *     clients, choices made — the same rows, per range.
 *   - **Over time** — active members and AI runs each day (30 days), each week from Monday (90 days) or each month — the AI runs add up to
 *     the tile; active members count each person once a point. (1.0 drew sign-ins too; on one scale a week's sign-ins dwarf the people, and a
 *     sign-in that lasts 30 days says little week by week — they stay a tile and a column.)
 *   - **By team member** — each member's last act (any time), the days they did something, their sign-ins, AI runs, quotes sent (as Creator),
 *     tasks done and site updates written, in the range (sign-ins a column Column settings adds).
 * Kept out, with his reason (the platform's telemetry): page views, top pages, feature funnels (opened → succeeded), minutes per session.
 * *(invented copy: every title, help line and caption on the page — the tiles' labels keep 1.0's where 2.0 has the thing)*
 */
import { insightsReport, RANGES, DEFAULT_RANGE, rangeLabel, readRange, rangeParam, type LeadFacts, type Range } from '@/lib/leads/tat'
import { projectsReport, type ProjectFacts } from '@/lib/projects/insights-model'
import { calendarDay, displayDate } from '@/lib/format'
import { shortDay } from '@/lib/portal/model'
import { BLANK } from '@/lib/leads/row-text'
import type { ChartSpec } from '@/lib/market-insights/markdown'

export { RANGES, DEFAULT_RANGE, rangeLabel, readRange, rangeParam }
export type HealthRange = Range

const DAY = 86_400_000
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** One act: who (members.id) and when (ms). */
export type Act = { m: string; at: number }
/** A moment some member may own (null when the record names no one). */
export type Stamp = { m: string | null; at: number }
export type HealthPerson = { id: string; name: string; role: string; color: string; active: boolean }

export type HealthFacts = {
  now: number
  team: HealthPerson[]
  acts: Act[]
  signIns: Act[]
  /** each charge (a run) and each refund, with its credits as the ledger keeps them (a charge negative) */
  ai: { m: string | null; at: number; credits: number; run: boolean }[]
  leads: LeadFacts[]
  projects: ProjectFacts[]
  quotesSent: Stamp[]
  invoicesSent: Stamp[]
  tasksAdded: number[]
  tasksDone: Stamp[]
  tickets: { at: number; doneAt: number | null }[]
  updates: (Stamp & { projectId: string })[]
  chats: (Stamp & { eventId: string })[]
  clients: { signIns: { c: string; at: number }[]; issues: { at: number; open: boolean }[]; messages: { c: string | null; at: number }[]; choices: { at: number }[] }
  /** shown only when it applies: the studio runs projects · takes part in Hangouts · has invited a client to the portal */
  has: { projects: boolean; hangouts: boolean; portal: boolean }
}

export type TileKey =
  | 'active' | 'signIns' | 'ai'
  | 'leads' | 'projects' | 'quotes' | 'invoices'
  | 'tasks' | 'tickets' | 'updates' | 'chats'
  | 'portalSignIns' | 'issues' | 'messages' | 'choices'
export type Tile = { key: TileKey; label: string; value: string; help: string | null }
export type TileGroup = { key: 'team' | 'work' | 'done' | 'clients'; title: string; help: string; tiles: Tile[] }

/** The groups and their tiles, in the page's order — the ghost draws these words too. (invented copy, 1.0's labels where 2.0 has the thing) */
export const GROUPS: readonly { key: TileGroup['key']; title: string; help: string; tiles: readonly { key: TileKey; label: string }[] }[] = [
  { key: 'team', title: 'Your team', help: 'Who used OpenMaison — from what they did, not the pages they opened', tiles: [
    { key: 'active', label: 'Active members' }, { key: 'signIns', label: 'Sign-ins' }, { key: 'ai', label: 'AI runs' }] },
  { key: 'work', title: 'New work', help: 'What came in and what went out to clients', tiles: [
    { key: 'leads', label: 'Leads added' }, { key: 'projects', label: 'Projects started' }, { key: 'quotes', label: 'Quotes sent' }, { key: 'invoices', label: 'Invoices sent' }] },
  { key: 'done', title: 'Work done', help: 'What the team finished', tiles: [
    { key: 'tasks', label: 'Tasks done' }, { key: 'tickets', label: 'Tickets resolved' }, { key: 'updates', label: 'Site updates' }, { key: 'chats', label: 'Hangout chats' }] },
  { key: 'clients', title: 'Your clients', help: 'What clients did on their portal', tiles: [
    { key: 'portalSignIns', label: 'Portal sign-ins' }, { key: 'issues', label: 'Issues reported' }, { key: 'messages', label: 'Messages' }, { key: 'choices', label: 'Choices made' }] },
]

export type MemberHealth = {
  id: string; name: string; role: string; color: string; active: boolean
  /** the member's last act, at any time — null when the records name them nowhere */
  lastActive: number | null
  days: number; signIns: number; aiRuns: number; quotesSent: number; tasksDone: number; updates: number
}

export type HealthReport = {
  range: HealthRange
  /** members active in the range · the studio's active members */
  active: number; total: number
  groups: TileGroup[]
  trend: ChartSpec | null
  members: MemberHealth[]
  /** the studio's active members who did nothing in the range — Maison AI's "who hasn't…" */
  idle: MemberHealth[]
  /** the figures behind the tiles, for the probe and Maison AI */
  n: Record<TileKey, number>
}

/** The range's window: [lo, now]; the prior window is the equal span before it (none for all time). */
export function windowOf(range: HealthRange, now: number): { lo: number; hi: number; plo: number | null } {
  if (range === null) return { lo: -Infinity, hi: now + 1, plo: null }
  const span = range * DAY
  return { lo: now - span, hi: now + 1, plo: now - 2 * span }
}
const within = (at: number, lo: number, hi: number) => at >= lo && at < hi

/** The tiles that compare with the equal span before — "Up from 3" · "Down from 9" · "Same as before" (1.0's +n% chips in words, uncoloured: a
    count going up is not good or bad by itself); nothing for all time. */
export const PRIOR_KEYS: ReadonlySet<TileKey> = new Set<TileKey>(['leads', 'quotes', 'invoices', 'choices'])
const priorLine = (now: number, before: number | null): string | null => (before === null ? null : now > before ? `Up from ${before.toLocaleString('en-SG')}` : now < before ? `Down from ${before.toLocaleString('en-SG')}` : 'Same as before')
/** Whether a tile carries a help line on this range — every tile does, but the comparing ones on all time (the ghost draws the same). Each
    help is a few words, one line at a phone's two-up tiles. */
export const helpShown = (key: TileKey, range: HealthRange) => !(PRIOR_KEYS.has(key) && range === null)
/** Over time's subtitle on a range — the page's and its ghost's words. */
export const trendSubtitle = (range: HealthRange) => `${range === 30 ? 'Each day' : range === 90 ? 'Each week, from Monday' : 'Each month'} — active members and AI runs`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
type Bucket = { label: string; lo: number; hi: number }
/** Calendar days (30 days), weeks from Monday (90), else months — the first and last cut to the range, so the points add up to the tiles. */
function bucketsOf(range: HealthRange, now: number, first: number): { buckets: Bucket[] } {
  const from = range === null ? Math.min(first, now) : now - range * DAY
  const out: Bucket[] = []
  if (range === 30) {
    const d = new Date(from); d.setHours(0, 0, 0, 0)
    for (let t = d.getTime(); t <= now; ) {
      const next = new Date(t); next.setDate(next.getDate() + 1)
      out.push({ label: shortDay(t), lo: Math.max(t, from), hi: Math.min(next.getTime(), now + 1) })
      t = next.getTime()
    }
    return { buckets: out }
  }
  if (range === 90) {
    const d = new Date(from); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))   // back to Monday
    for (let t = d.getTime(); t <= now; ) {
      const next = new Date(t); next.setDate(next.getDate() + 7)
      out.push({ label: shortDay(t), lo: Math.max(t, from), hi: Math.min(next.getTime(), now + 1) })
      t = next.getTime()
    }
    return { buckets: out }
  }
  const d = new Date(from); d.setHours(0, 0, 0, 0); d.setDate(1)
  for (let t = d.getTime(); t <= now; ) {
    const at = new Date(t), next = new Date(t); next.setMonth(next.getMonth() + 1)
    out.push({ label: `${MONTHS[at.getMonth()]} ’${String(at.getFullYear()).slice(2)}`, lo: Math.max(t, from), hi: Math.min(next.getTime(), now + 1) })
    t = next.getTime()
  }
  return { buckets: out }
}

/** The report for one range. */
export function healthReport(f: HealthFacts, range: HealthRange): HealthReport {
  const { now } = f
  const { lo, hi, plo } = windowOf(range, now)
  const inR = (at: number) => within(at, lo, hi)
  const inP = (at: number) => plo !== null && within(at, plo, lo)
  const count = <T extends { at: number }>(xs: readonly T[]) => xs.filter((x) => inR(x.at)).length
  const prior = <T extends { at: number }>(xs: readonly T[]) => (plo === null ? null : xs.filter((x) => inP(x.at)).length)
  const known = new Map(f.team.map((p) => [p.id, p]))
  const acts = f.acts.filter((a) => known.has(a.m))

  /* ── your team ── */
  const activeIds = new Set(acts.filter((a) => inR(a.at)).map((a) => a.m))
  const staff = f.team.filter((p) => p.active)
  const active = staff.filter((p) => activeIds.has(p.id)).length
  const signIns = f.signIns.filter((s) => inR(s.at))
  const runs = f.ai.filter((r) => r.run && inR(r.at))
  const credits = Math.max(0, -f.ai.filter((r) => inR(r.at)).reduce((s, r) => s + r.credits, 0))   // Plan › Usage's "Used": charges net of refunds

  /* ── new work: Reports › Leads' and Reports › Projects' own figures ── */
  const leads = insightsReport(f.leads, [], now, range).inRange
  const leadsPrior = plo === null ? null : f.leads.filter((l) => l.createdAt >= plo && l.createdAt < lo).length   // Reports › Leads' prior window
  const proj = projectsReport(f.projects, [], now, range, false)

  /* ── work done ── */
  const done = count(f.tasksDone), added = f.tasksAdded.filter(inR).length
  const resolved = f.tickets.filter((t) => t.doneAt !== null && inR(t.doneAt)).length, raised = f.tickets.filter((t) => inR(t.at)).length
  const updates = f.updates.filter((u) => inR(u.at))
  const chats = f.chats.filter((c) => inR(c.at))

  /* ── your clients: Qanvast Ops › Studios' rule ── */
  const cSign = f.clients.signIns.filter((s) => inR(s.at)), cIssues = f.clients.issues.filter((s) => inR(s.at)), cMsgs = f.clients.messages.filter((s) => inR(s.at)), cChoices = count(f.clients.choices)

  const n: Record<TileKey, number> = {
    active, signIns: signIns.length, ai: runs.length, leads, projects: proj.started, quotes: count(f.quotesSent), invoices: count(f.invoicesSent),
    tasks: done, tickets: resolved, updates: updates.length, chats: chats.length,
    portalSignIns: cSign.length, issues: cIssues.length, messages: cMsgs.length, choices: cChoices,
  }
  const sitting = staff.length - active
  const help: Record<TileKey, string | null> = {
    active: sitting ? `${sitting.toLocaleString('en-SG')} did nothing` : 'Everyone took part',
    signIns: signIns.length ? `by ${plural(new Set(signIns.map((s) => s.m)).size, 'member')}` : 'No one signed in',
    ai: runs.length || credits ? `${credits.toLocaleString('en-SG')} credits used` : 'No AI tool used',
    leads: priorLine(leads, leadsPrior),
    projects: `${proj.completed} completed`,
    quotes: priorLine(count(f.quotesSent), prior(f.quotesSent)),
    invoices: priorLine(count(f.invoicesSent), prior(f.invoicesSent)),
    tasks: `of ${added.toLocaleString('en-SG')} added`,
    tickets: `of ${raised.toLocaleString('en-SG')} raised`,
    updates: updates.length ? `on ${plural(new Set(updates.map((u) => u.projectId)).size, 'project')}` : 'None published',
    chats: chats.length ? `at ${plural(new Set(chats.map((c) => c.eventId)).size, 'Hangout')}` : 'None held',
    portalSignIns: cSign.length ? `by ${plural(new Set(cSign.map((s) => s.c)).size, 'client')}` : 'No client signed in',
    issues: cIssues.length ? `${cIssues.filter((i) => i.open).length.toLocaleString('en-SG')} still open` : 'None reported',
    messages: cMsgs.length ? `from ${plural(new Set(cMsgs.map((s) => s.c ?? '?')).size, 'client')}` : 'None from clients',
    choices: priorLine(cChoices, prior(f.clients.choices)),
  }
  const value = (k: TileKey) => (k === 'active' ? `${active} of ${staff.length}` : n[k].toLocaleString('en-SG'))
  const shown = (k: TileKey) => !(((k === 'tickets' || k === 'updates' || k === 'projects') && !f.has.projects) || (k === 'chats' && !f.has.hangouts))
  const groups: TileGroup[] = GROUPS.filter((g) => g.key !== 'clients' || f.has.portal).map((g) => ({
    key: g.key, title: g.title, help: g.help, tiles: g.tiles.filter((t) => shown(t.key)).map((t) => ({ key: t.key, label: t.label, value: value(t.key), help: help[t.key] })),
  }))

  /* ── over time ── */
  const first = Math.min(...acts.map((a) => a.at), ...f.signIns.map((s) => s.at), ...f.ai.map((r) => r.at))
  const { buckets } = bucketsOf(range, now, Number.isFinite(first) ? first : now)
  const inB = (b: Bucket, at: number) => at >= b.lo && at < b.hi
  const anything = activeIds.size > 0 || runs.length > 0
  const trend: ChartSpec | null = anything && buckets.length > 1 ? {
    kind: 'line', title: 'Over time', subtitle: trendSubtitle(range), source: null, sourceUrl: null, prefix: '', suffix: '',
    labels: buckets.map((b) => b.label),
    series: [
      { key: 'active', label: 'Active members', values: buckets.map((b) => new Set(acts.filter((a) => inB(b, a.at)).map((a) => a.m)).size) },
      { key: 'ai', label: 'AI runs', values: buckets.map((b) => f.ai.filter((r) => r.run && inB(b, r.at)).length) },
    ],
  } : null

  /* ── by team member: the studio's active members, and anyone who acted in the range ── */
  const people = f.team.filter((p) => p.active || activeIds.has(p.id))
  const last = new Map<string, number>()
  for (const a of acts) if (a.at <= now && a.at > (last.get(a.m) ?? -Infinity)) last.set(a.m, a.at)
  const mine = <T extends { m: string | null; at: number }>(xs: readonly T[], id: string) => xs.filter((x) => x.m === id && inR(x.at)).length
  const members: MemberHealth[] = people.map((p) => ({
    id: p.id, name: p.name, role: p.role, color: p.color, active: p.active,
    lastActive: last.get(p.id) ?? null,
    days: new Set(acts.filter((a) => a.m === p.id && inR(a.at)).map((a) => calendarDay(a.at))).size,
    signIns: mine(f.signIns, p.id), aiRuns: mine(f.ai.filter((r) => r.run), p.id), quotesSent: mine(f.quotesSent, p.id),
    tasksDone: mine(f.tasksDone, p.id), updates: mine(f.updates, p.id),
  })).sort((a, b) => b.days - a.days || (b.lastActive ?? 0) - (a.lastActive ?? 0) || a.name.localeCompare(b.name))
  const idle = members.filter((m) => m.active && m.days === 0)
  return { range, active, total: staff.length, groups, trend, members, idle, n }
}

/** "3 days ago" · "today" · "--" — when the member last did something. */
export function lastActiveWords(at: number | null, now: number): string {
  if (at === null) return BLANK
  const d = Math.max(0, calendarDay(now) - calendarDay(at))
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : displayDate(new Date(at))
}

/** (invented copy) The page's caption, the foot note and the empty lines. */
export const FOOT_NOTE = 'Counted from the studio’s own records — a lead moved, a note written, a task ticked, a quote or a message sent, a sign-in. “Up from” and “Down from” compare with the same span just before. OpenMaison doesn’t track the pages people open.'
export const MEMBERS_HELP = 'What each person did in this range, as the records name them'
export const TREND_EMPTY = 'Nothing happened in this range'
/** The bar's caption — what the range filters on, the house reports' grammar ("Filtering on lead created date · …") */
export const CAPTION = 'Filtering on the day each thing was done'

/** The ghost's blocks remember what the page drew last on its opening range (REG-708 · REG-817). */
export const SHAPE = { trend: 'om.shape.health.trend', clients: 'om.shape.health.clients', projects: 'om.shape.health.projects', hangouts: 'om.shape.health.hangouts', members: 'om.shape.health.members' } as const

/* ── (parity Q-20) the house Export: the page's numbers as one sheet ── */
export function healthSheet(r: HealthReport, now: number): { head: string[]; body: string[][] } {
  const body: string[][] = []
  for (const g of r.groups) {
    body.push([g.title], ['Figure', 'Value', 'Detail'])
    for (const t of g.tiles) body.push([t.label, t.value, t.help ?? ''])
    body.push([])
  }
  if (r.trend) {
    body.push([r.trend.title, r.trend.subtitle ?? ''], ['', ...r.trend.series.map((s) => s.label)])
    r.trend.labels.forEach((l, i) => body.push([l, ...r.trend!.series.map((s) => String(s.values[i] ?? 0))]))
    body.push([])
  }
  body.push(['By team member'], ['Member', 'Role', 'Last active', 'Days active', 'Sign-ins', 'AI runs', 'Quotes sent', 'Tasks done', 'Site updates'])
  for (const m of r.members) body.push([m.name, m.role, lastActiveWords(m.lastActive, now), String(m.days), String(m.signIns), String(m.aiRuns), String(m.quotesSent), String(m.tasksDone), String(m.updates)])
  return { head: [`Studio health · ${rangeLabel(r.range)} · ${r.active} of ${plural(r.total, 'member')} active`], body }
}
