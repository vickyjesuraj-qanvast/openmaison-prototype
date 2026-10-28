import 'server-only'
import { and, eq, gte, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hangoutDesigners, leadAssignees, leadFiles, leadTasks, leads, projectUpdateFiles, projects, taskAssignees, type LeadTask } from '@/lib/db/schema'
import { calendarDaysBetween, displayTime, isOverdue, startOfDay, titleCaseName } from '@/lib/format'
import { dayLabel, dayMonth, dayOf, listWords, plural, weekdayOf } from '@/lib/projects/schedule-model'
import { projectHref } from '@/lib/projects/tabs'
import { DEFAULT_CAPACITY, capacityOf, workloadOf } from '@/lib/projects/workload'
import { fetchDefaultCapacity } from '@/lib/projects/workload-queries'
import { milestonesOf, waitingWho } from '@/lib/projects/schedule'
import { boardOf } from '@/lib/projects/contractors-model'
import { telHref } from '@/lib/projects/invoices-kinds'
import { placeHref } from '@/lib/projects/messages-model'
import { resumeLine } from '@/lib/projects/hold'
/** A date written with this year's ’yy, without it (the house: the year only when it isn't this year). */
const thisYear = (line: string, now: number) => line.replace(/ ’(\d\d)\b/g, (m, yy: string) => (yy === String(new Date(now).getFullYear()).slice(2) ? '' : m))
import { waHref } from '@/components/leads/lead-card-words'
import { fetchMemberStats } from '@/lib/company/members'
import { fetchHangouts } from '@/lib/hangouts/queries'
import { aimLabel, idsOf } from '@/lib/meetings/model'
import { isAccounting, opensWorkspace, runsStudio } from '@/lib/settings/roles'
import { visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { todoInputOf, todoRows, type TodoRow } from '@/lib/finance/todo'
import { money2 } from '@/lib/quotes/math'
import { EMPTY_FILTERS } from '@/lib/leads/filters'
import { writeListing } from '@/lib/leads/listing-url'
import { QUIET_DAYS } from '@/lib/leads/sales'
import type { Stage } from '@/lib/leads/enums'
import { publishedSiteUpdateRows } from './updates'
import { seesTeam } from './model'
import type { DashCtx } from './context'
import { HEALTH_WORD, aheadWords, byHealth, healthOf, pastWords } from './health'
import {
  SITE_DAYS, SITE_MAX, agendaOrder, contractorsWords, lateWords, lengthWords, pipelineOf, progressWords,
  type AgendaItem, type DayData, type PipelineData, type ProjectLine, type ProjectsData, type SiteData, type SitePhoto, type TeamData,
} from './cards'

/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-06 · P-07 · P-08 · P-09 · P-14 · Q-10; lane D3 owns this file) The grid's cards, read
 * through each module's own rules from the context's shared reads (lib/dashboard/context.ts — each module read once per page): **Your day** from
 * the member's tasks (the rail badge's rule), their meetings, every project's whole Coming up (P-14: never its card's first six), the Hangouts and,
 * for Accounting, Finance › To do's money due; **Pipeline** from the Leads listing's rows (Who sees leads) by their stage, the listing's days in
 * stage and Sales' going-quiet rule; **Projects** from the listing's rows, each one's schedule and its own Money rows, through the health rule
 * (lib/dashboard/health.ts); **Team** from Projects › Workload's lines and its Contractors board; **On site** from the published site updates —
 * what each project's Updates tab shows its client — with their photos. A reader answers null when its card has nothing to say to this member.
 */

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const first = (name: string) => titleCaseName(name).split(/\s+/)[0] ?? name
const CALL_KINDS = new Set(['Call', 'Follow-up'])

/* ── Your day ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The member's tasks ticked done today — the agenda keeps them on their day, ticked (and the ring counts today's). */
async function doneToday(viewerId: string, seen: Set<string> | null, now: number): Promise<LeadTask[]> {
  const rows = await db.select({ t: leadTasks }).from(leadTasks).innerJoin(taskAssignees, eq(taskAssignees.taskId, leadTasks.id))
    .where(and(eq(leadTasks.done, true), eq(taskAssignees.memberId, viewerId), gte(leadTasks.updatedAt, new Date(startOfDay(new Date(now))))))
  return rows.map((r) => r.t).filter((t) => (!t.leadId || !seen || seen.has(t.leadId)) && !!t.dueAt)
}

/** Where each task is: its project's name once the lead is won into one, else the lead's; the studio's own say so (S22's rule) — and the
    lead's number, for a call. */
async function placesOf(tasks: LeadTask[]): Promise<Map<string, { where: string; phone: string | null; name: string | null }>> {
  const ids = [...new Set(tasks.map((t) => t.leadId).filter((x): x is string => !!x))]
  const [ls, ps] = ids.length ? await Promise.all([
    db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(inArray(leads.id, ids)),
    db.select({ leadId: projects.leadId, name: projects.name }).from(projects).where(and(inArray(projects.leadId, ids), isNull(projects.deletedAt))),
  ]) : [[], []]
  const lead = new Map(ls.map((l) => [l.id, l])), project = new Map(ps.map((p) => [p.leadId, p.name]))
  return new Map(tasks.map((t) => {
    const l = t.leadId ? lead.get(t.leadId) : undefined
    return [t.id, { where: t.leadId ? project.get(t.leadId) ?? (l ? titleCaseName(l.name) : '') : 'Studio task', phone: l?.phone ?? null, name: l ? titleCaseName(l.name) : null }]
  }))
}

/** Your day: the next seven days' meetings, calls and tasks, the projects' milestones and outside people, the Hangouts — Accounting's money due. */
export async function fetchDay(ctx: DashCtx): Promise<DayData | null> {
  const { today, now, role } = ctx
  const end = today + 6
  const [details, open, ticked, mine, todo, members] = await Promise.all([ctx.read.details(), ctx.read.tasks(), doneToday(ctx.viewer.id, ctx.seen, now).catch(() => []), ctx.read.meetings(), ctx.read.todo(), ctx.read.members()])
  const places = await placesOf([...open, ...ticked]).catch(() => new Map<string, { where: string; phone: string | null; name: string | null }>())
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  const items: AgendaItem[] = []
  const seenKeys = new Set<string>()
  const put = (x: AgendaItem) => { if (seenKeys.has(x.key)) return; seenKeys.add(x.key); items.push(x) }

  /* the member's own tasks — late first (on today, red), then each on its day; a call has its number and its WhatsApp */
  const taskItem = (t: LeadTask, done: boolean): AgendaItem | null => {
    if (!t.dueAt) return null
    const late = !done && isOverdue(t.dueAt, now)
    const day = late || (done && isOverdue(t.dueAt, now)) ? today : dayOf(t.dueAt)
    if (day < today || day > end) return null
    const p = places.get(t.id)
    const call = CALL_KINDS.has(t.kind) && !!p?.phone
    const timed = t.dueAt.getHours() !== 0 || t.dueAt.getMinutes() !== 0
    /* (the calm pass) the time column says when: "5 days late" (red), "by 4:30 PM" for a task due at its hour; the caption is where */
    const when = late ? lateWords(t.dueAt.getTime(), now) : timed && !done ? `by ${displayTime(t.dueAt)}` : undefined
    return {
      /* a timed task keeps its hour for the day's order */
      key: `task:${t.id}`, kind: call ? 'call' : 'task', day, title: t.title, ...(timed && !late && !done ? { time: displayTime(t.dueAt) } : {}),
      ...(when ? { when } : {}), caption: p?.where || undefined,
      icon: call ? 'call' : 'task_alt', href: ctx.from(`/tasks?open=${encodeURIComponent(t.id)}`), taskId: t.id, late, done,
      ...(call && !done ? { tel: telHref(p!.phone) ?? undefined, wa: waHref(p!.phone) ?? undefined, leadId: t.leadId ?? undefined, who: p!.name ? first(p!.name) : undefined } : {}),
    }
  }
  /* a meeting's reminder ("Meet Priya — first consultation") is the meeting itself on this card — one thing once (ST-17) */
  const meetingIds = new Set(mine.filter(({ m }) => m.status !== 'cancelled').map(({ m }) => m.id))
  for (const t of open) { if (t.meetingId && meetingIds.has(t.meetingId)) continue; const x = taskItem(t, false); if (x) put(x) }
  for (const t of ticked) { if (t.meetingId && meetingIds.has(t.meetingId)) continue; const x = taskItem(t, true); if (x) put(x) }

  /* the member's meetings: a planned one ahead says how long and offers Prepare me (a site visit, Directions); one held today counts as done */
  for (const { m, leadName } of mine) {
    const day = dayOf(m.startsAt)
    if (day < today || day > end || m.status === 'cancelled' || (m.status !== 'planned' && day !== today)) continue
    const client = titleCaseName(leadName)
    const aim = aimLabel(m.aim) === 'Other' ? 'Meeting' : aimLabel(m.aim)
    const others = idsOf(m.memberIds).filter((id) => id !== ctx.viewer.id).map((id) => first(nameOf.get(id) ?? '')).filter(Boolean)
    const endsAt = m.endsAt ?? null
    const ended = m.status !== 'planned' || now >= (endsAt?.getTime() ?? m.startsAt.getTime() + 3_600_000)
    const place = m.place?.trim() || null
    const visit = m.aim === 'site_visit_debrief'
    put({
      /* (the calm pass) the hour in the time column; where · with whom · how long in the caption */
      key: `meeting:${m.id}`, kind: 'meeting', day, time: displayTime(m.startsAt),
      title: `${aim} · ${client}`, caption: [m.status === 'held' ? 'Held' : place ?? m.whereKind, others.length ? `with ${listWords(others)}` : null, m.status === 'held' ? null : lengthWords(m.startsAt.getTime(), endsAt?.getTime() ?? null)].filter(Boolean).join(' · ') || undefined,
      icon: 'event', href: ctx.from(`/meetings/${m.id}`), done: m.status === 'held', ended,
      /* Maison AI's question names the meeting by its client and hour, and says "meeting" (lib/maison-ai/intents.ts `next_meeting`) */
      ...(!ended ? { prepare: `Prepare me for my meeting with ${first(client)} at ${displayTime(m.startsAt)}` } : {}),
      ...(!ended && (visit || m.whereKind === 'In person') && place ? { maps: placeHref(place) } : {}),
    })
  }

  /* the projects' whole Coming up (P-14) — milestones starting and ending, outside people, the client's meetings — on the running projects this
     member changes (Mine: their own) */
  for (const d of details) {
    if (!d.mayChange || d.project.stage !== 'in_progress' || d.project.hold) continue
    if (ctx.scope === 'mine' && !ctx.isMine(d.team.map((m) => m.id))) continue
    for (const x of d.comingAll ?? d.comingUp) {
      if (x.day === null || x.day < today || x.day > end) continue
      put({ key: x.key, kind: 'milestone', day: x.day, title: x.title, caption: [d.project.name, x.caption].filter(Boolean).join(' · '), icon: x.icon, href: ctx.from(x.href) })
    }
  }

  /* the Hangouts the studio takes part in (a Designer: the ones they are on the plan for) — Directions to the venue */
  if (ctx.workspace) {
    const hangouts = await fetchHangouts(now).catch(() => null)
    if (hangouts) {
      const onPlan = ctx.runs ? null : new Set((await db.select({ eventId: hangoutDesigners.eventId, shiftIds: hangoutDesigners.shiftIds }).from(hangoutDesigners).where(eq(hangoutDesigners.memberId, ctx.viewer.id)).catch(() => [])).filter((x) => idsOf(x.shiftIds).length > 0).map((x) => x.eventId))
      for (const e of hangouts.events) {
        if (e.participation !== 'confirmed' || (e.phase !== 'today' && e.phase !== 'ahead') || (onPlan && !onPlan.has(e.id))) continue
        const day = Math.max(today, dayOf(new Date(e.startsOn)))
        if (day > end) continue
        const [from, to] = e.hoursLine.split('–').map((s) => s.trim())
        put({ key: `hangout:${e.id}`, kind: 'hangout', day, time: from || undefined, title: e.name, caption: [e.venue, to ? `until ${to}` : null, e.daysLine.includes('–') ? e.daysLine : null].filter(Boolean).join(' · ') || undefined,
          icon: 'group', href: ctx.from(`/qanvast-ops/hangouts/${e.id}`), maps: e.venue ? placeHref(e.venue) : undefined })
      }
    }
  }

  /* Accounting has no project of their own: their week is the money due in it — To do's own rows (what is late is Needs you's) */
  if (isAccounting(role) && todo) {
    for (const r of todoRows(todoInputOf(todo.todo))) {
      if ((r.group !== 'pay' && r.group !== 'collect') || !r.due || r.late) continue
      const day = dayOf(new Date(r.due))
      if (day >= today && day <= end) put({ key: `todo:${r.key}`, kind: 'money', day, title: r.title, caption: [r.group === 'collect' ? 'To collect' : 'To pay', r.project, r.amountMinor ? money2(r.amountMinor) : null].filter(Boolean).join(' · '), icon: r.group === 'collect' ? 'payments' : 'receipt_long', href: todoHref(ctx, r) })
    }
  }

  items.sort(agendaOrder)
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = today + i
    const date = new Date(now + i * 86_400_000)
    return { day, weekday: WEEKDAY[weekdayOf(day)] ?? '', date: String(date.getDate()), full: `${WEEKDAY_LONG[weekdayOf(day)] ?? ''} ${date.getDate()} ${MONTH[date.getMonth()] ?? ''}`, count: items.filter((x) => x.day === day).length }
  })
  /* the ring: today's own — the member's tasks due by today and today's meetings — and how many of them are done */
  const todays = items.filter((x) => x.day === today && (x.taskId || x.kind === 'meeting'))
  return { today, week, items, done: todays.filter((x) => x.done).length, total: todays.length, addHref: ctx.from('/tasks?add=1') }
}

/** To do's own opener (components/finance/todo/todo-workspace.tsx `opener`): money in on its project's Money, money out where To do lists it. */
const todoHref = (ctx: DashCtx, r: TodoRow) => (r.projectId && (r.kind === 'invoice' || r.kind === 'confirm' || r.kind === 'check' || r.kind === 'remind' || r.kind === 'send')
  ? ctx.from(`/projects/${r.projectId}/money?open=${encodeURIComponent(r.invoiceId ?? r.ref)}`) : '/company/finance')

/* ── Pipeline ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Pipeline (P-07): the visible leads by stage — the Leads listing's own rows and scopes — and the ones going quiet (Sales' own rule). */
export async function fetchPipeline(ctx: DashCtx): Promise<PipelineData | null> {
  if (!ctx.workspace && !ctx.desk) return null
  const rows = await ctx.read.visibleLeads()
  const mine = ctx.scope === 'mine'
  const set = mine ? rows.filter((r) => r.assignees.some((a) => a.id === ctx.viewer.id)) : rows
  const listing = (stage: Stage | null) => {
    const q = writeListing({ stage, attention: null, query: '', filters: mine ? { ...EMPTY_FILTERS, assignees: [ctx.viewer.id] } : EMPTY_FILTERS, sort: null })
    return ctx.from(q ? `/leads?${q}` : '/leads')
  }
  return pipelineOf(set.map((r) => ({ stage: r.stage, createdAt: r.createdAt.getTime(), lastContactAt: r.lastContact?.at.getTime() ?? null })), ctx.now, {
    quietDays: QUIET_DAYS, href: (s) => listing(s as Stage), listHref: listing(null),
    /* Sales' Going quiet reads every lead (All time) — the same count — and is an Owner's and an Admin's report; anyone else's line is words */
    quietHref: runsStudio(ctx.role) && !mine ? ctx.from('/company/reports/leads?report=sales&range=all') : '',
  })
}

/* ── Projects ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Projects (P-08 · Q-10): one line per open project this member sees — its health by rule, its progress and its next fact. */
export async function fetchProjectsHealth(ctx: DashCtx): Promise<ProjectsData | null> {
  if (!ctx.workspace) return null
  const list = await ctx.read.projects()
  if (!list) return null
  /* a Designer's card is their own projects (the old My projects tile); Mine narrows an Owner's or an Admin's */
  const ownOnly = ctx.scope === 'mine' || (!ctx.runs && ctx.role !== 'Manager')
  const rows = list.rows.filter((r) => r.stage !== 'completed' && (!ownOnly || ctx.isMine(r.team.map((m) => m.id))))
  if (!rows.length) return null
  const [ms, details] = await Promise.all([milestonesOf(rows.map((r) => r.id)), ctx.read.details()])
  const detail = new Map(details.map((d) => [d.project.id, d]))
  const team = list.team.map((m) => ({ id: m.id, name: m.name }))
  const lines: ProjectLine[] = rows.map((r) => {
    const d = detail.get(r.id)
    const live = ms.get(r.id) ?? []
    const money = d?.money ? {
      ours: d.needs.filter((n) => n.kind === 'cost-bill-overdue' || n.kind === 'cost-po-overdue').map((n) => ({ what: n.title, days: daysIn(n.meta) })),
      client: d.money.summary.invoices.filter((i) => i.overdueMinor > 0 && i.dueAt !== null).map((i) => ({ days: Math.max(1, calendarDaysBetween(i.dueAt!, ctx.now)) })),
    } : null
    const open = d?.setup.filter((s) => !s.done).length ?? 0
    const startDay = r.startDate ? dayOf(r.startDate) : null
    const h = healthOf({
      stage: r.stage, today: ctx.today, targetEnd: r.targetEndDate ? r.targetEndDate.getTime() : null,
      /* (the calm UI build 2026-10-27 — the audit's 1-24, T-11) a day this year without its year, as the card's other dates ("Starts 5 Nov" beside
         "Resumes 29 Nov", never "29 Nov ’26") */
      hold: r.hold ? { line: thisYear(resumeLine(r.hold, ctx.now), ctx.now) } : null,
      milestones: live.map((m) => ({ id: m.id, title: m.title, status: m.status, start: m.start, end: m.end, position: m.position, waitingOn: m.waiting?.on ?? null, waitingWho: m.waiting ? waitingWho(m, first(r.client), team) : null })),
      moreTime: r.schedule?.asks?.more ?? [],
      money,
      profit: r.profit ? { state: r.profit.state, tier: r.profit.tier, marginPct: r.profit.marginPct } : null,
      setupNext: startDay !== null && startDay >= ctx.today ? `starts ${startDay === ctx.today ? 'today' : dayLabel(startDay)}` : open ? `${plural(open, 'thing')} left to set up` : 'ready to start',
    })
    /* (the calm pass) the health as a word at the line's right — a project setting up says when it starts —, under the bar the progress and the
       first reason (or the next fact) in short words; the tooltip and the row's label say it in full */
    const pw = progressWords(h.progress.done, h.progress.total)
    const state = h.health === 'setting_up' ? (startDay !== null && startDay >= ctx.today ? `Starts ${startDay - ctx.today < 2 ? aheadWords(startDay, ctx.today) : dayMonth(startDay)}` : HEALTH_WORD.setting_up) : HEALTH_WORD[h.health]
    const setupWords = open ? `${plural(open, 'thing')} left to set up` : 'Ready to start'
    const caption = h.health === 'on_hold' ? h.fact
      : h.health === 'setting_up' ? (state === HEALTH_WORD.setting_up ? setupWords : `Setting up · ${setupWords.replace(/^R/, 'r')}`)
      : `${h.progress.pct}% · ${h.fact}`
    const captionFull = h.health === 'on_hold' || h.health === 'setting_up' ? caption : [`${h.progress.pct}% · ${pw}`, ...(h.reasons.length ? h.reasons : [h.fact])].join(' · ')
    return { id: r.id, name: r.name, client: r.client, health: h.health, healthWhy: h.reasons.join(' · '), line: h.line, state: state.replace(/^./, (c) => c.toUpperCase()), caption, captionFull, progress: h.progress.pct, progressWords: pw, href: ctx.from(projectHref(r.id)) }
  })
  lines.sort(byHealth)
  return { lines, running: rows.length, late: lines.filter((l) => l.health === 'late').length, href: ctx.from(ownOnly ? '/projects?scope=mine' : '/projects') }
}
/** "5 days overdue" · "A day overdue" — the days a Money row's own words name (0 when they name none). */
const daysIn = (meta: string | undefined): number => { const m = /(\d+) days? overdue/.exec(meta ?? ''); return m ? Number(m[1]) : /a day overdue/i.test(meta ?? '') ? 1 : 0 }

/* ── Team ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Team (P-09): Projects › Workload's lines (projects against each one's capacity) with each member's open leads and whether they take new ones,
    the projects with no one on them, and the contractors' line from Workload › Contractors. */
export async function fetchTeam(ctx: DashCtx): Promise<TeamData | null> {
  if (!seesTeam(ctx.role)) return null
  const [list, team, capacity, stats] = await Promise.all([ctx.read.projects(), ctx.read.members(), fetchDefaultCapacity().catch(() => DEFAULT_CAPACITY), fetchMemberStats(ctx.now).catch(() => null)])
  if (!list) return null
  const people = team.map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, isActive: m.isActive, managerId: m.managerId, projectCapacity: m.projectCapacity }))
  const accepting = new Map(team.map((m) => [m.id, m.acceptingLeads !== false]))
  const workload = ctx.from('/projects?view=workload')
  const all = workloadOf(list.rows.map((r) => ({ id: r.id, name: r.name, number: r.number, stage: r.stage, team: r.team, attention: r.attention, hold: r.hold ?? null })), people, { id: ctx.viewer.id, role: ctx.role, teamIds: ctx.viewer.teamIds }, capacity).lines
  const lines = all.filter((l) => l.person).map((l) => {
    const p = l.person!
    return { id: p.id, name: p.name, initials: p.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase(), color: p.color ?? null, count: l.count, capacity: capacityOf(p, capacity), over: l.state === 'over', words: l.words, openLeads: stats?.[p.id]?.active ?? 0, accepting: accepting.get(p.id) ?? true, href: workload }
  })
  const nobody = all.find((l) => !l.person)
  /* (S45B's Contractors tile, moved here — brief § 4) the Workload view's board over the listing's own records, for whoever reads the view */
  let contractors: TeamData['contractors'] = null
  const cb = list.contractors
  if (cb) {
    const b = boardOf(cb.contractors, cb.crew, cb.sites, cb.trades, dayOf(new Date(cb.now)))
    /* (the calm pass) work starting with no contractor is Needs you's row (`crew-gap`) — one place for each thing; the line says who is free */
    contractors = b.kpis.contractors
      ? { words: contractorsWords(b.kpis), href: ctx.from('/projects?view=workload&of=contractors'), none: false }
      : { words: contractorsWords(b.kpis), href: ctx.from('/company/finance/vendors'), none: true }
  }
  if (!lines.length && !nobody) return null
  return { lines, href: workload, nobody: nobody ? { count: nobody.count, href: workload } : null, contractors }
}

/* ── On site ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** On site (P-09): the photos of the site updates published in the last seven days on the projects this member sees — an Owner's and an
    Admin's every project, anyone else's their own (a Manager's, their team's too) — newest first; each opens its update. Nothing published → null. */
export async function fetchSite(ctx: DashCtx): Promise<SiteData | null> {
  if (!ctx.workspace) return null
  const since = new Date(startOfDay(new Date(ctx.now - (SITE_DAYS - 1) * 86_400_000)))
  const [ups, list] = await Promise.all([publishedSiteUpdateRows(since), ctx.read.projects()])
  const ownOnly = ctx.scope === 'mine' || !ctx.runs
  const reach = new Set([ctx.viewer.id, ...(ctx.role === 'Manager' ? ctx.viewer.teamIds : [])])
  const allowed = new Set((list?.rows ?? []).filter((r) => !ownOnly || r.team.some((m) => reach.has(m.id))).map((r) => r.id))
  const shown = ups.filter((u) => (!ctx.seen || ctx.seen.has(u.leadId)) && allowed.has(u.projectId))
  if (!shown.length) return null
  const [files, names] = await Promise.all([
    db.select({ updateId: projectUpdateFiles.updateId, position: projectUpdateFiles.position, id: leadFiles.id, name: leadFiles.name, kind: leadFiles.kind, mime: leadFiles.mime, thumb: leadFiles.thumb })
      .from(projectUpdateFiles).innerJoin(leadFiles, eq(leadFiles.id, projectUpdateFiles.fileId))
      .where(and(inArray(projectUpdateFiles.updateId, shown.map((u) => u.id)), isNull(leadFiles.deletedAt))),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, [...new Set(shown.map((u) => u.leadId))])),
  ])
  const clientOf = new Map(names.map((l) => [l.id, titleCaseName(l.name)]))
  const isPhoto = (f: (typeof files)[number]) => f.kind === 'image' || (f.mime ?? '').startsWith('image/')
  const photos: SitePhoto[] = []
  for (const u of shown) {
    const href = ctx.from(projectHref(u.projectId, `updates?open=${encodeURIComponent(u.id)}`))
    /* (the calm pass) a caption is the update's title, whose home it is (the client, as the project is known) and when — "yesterday" · "21 Oct",
       never a bare weekday (a day gone by is its date, the lead card's rule) */
    const day = dayOf(u.publishedAt ?? new Date(ctx.now))
    const when = day >= ctx.today ? 'today' : pastWords(day, ctx.today)
    const where = clientOf.get(u.leadId) ?? u.projectName
    const mine = files.filter((f) => f.updateId === u.id && isPhoto(f)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const base = { href, update: u.id, title: u.title, where, when, photos: mine.length, caption: [u.title, u.projectName, dayLabel(day)].join(' · ') }
    /* an update with no photo still shows: its tile is its glyph and its words */
    if (!mine.length) { photos.push({ ...base, key: `u:${u.id}`, src: null, alt: u.title }); continue }
    for (const f of mine) photos.push({ ...base, key: `f:${f.id}`, src: f.thumb ?? `/files/img/${f.id}`, alt: `${u.title} — ${u.projectName}` })
  }
  const count = photos.filter((p) => p.src).length
  return { photos: photos.slice(0, SITE_MAX), count, updates: shown.length, href: shown.length === 1 ? photos[0]!.href : null }
}

/** (for the app shell's ghost seed — lib/ghost-shapes.server.ts, lane D1) Whether On site has something to show this member: an update
    published in its seven days on a project they reach (an Owner's or an Admin's every one; anyone else's own, a Manager's team's too) — the
    card's own rule, read light, so the loader draws the card exactly when the page will (the studio's scope aside). */
export async function siteThisWeek(viewer: Viewer, now = Date.now()): Promise<boolean> {
  if (!opensWorkspace(viewer.role)) return false
  const since = new Date(startOfDay(new Date(now - (SITE_DAYS - 1) * 86_400_000)))
  const [ups, seen] = await Promise.all([publishedSiteUpdateRows(since), visibleLeadIds(viewer)])
  const live = ups.filter((u) => !seen || seen.has(u.leadId))
  if (!live.length) return false
  if (runsStudio(viewer.role)) return true
  const reach = [viewer.id, ...(viewer.role === 'Manager' ? viewer.teamIds : [])]
  const on = new Set((await db.select({ leadId: leadAssignees.leadId }).from(leadAssignees).where(inArray(leadAssignees.memberId, reach))).map((r) => r.leadId))
  return live.some((u) => on.has(u.leadId))
}
