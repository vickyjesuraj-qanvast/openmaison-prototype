import 'server-only'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { hangoutDesigners, leadTasks, leads, meetings, members, projects, taskAssignees, type LeadTask } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { isAccounting, isMarketing, opensWorkspace, runsStudio, seesBooks } from '@/lib/settings/roles'
import { seesProfit } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1) the Profit tile is the books' and the cost switch's
import { displayTime, durationWords, isDueToday, isOverdue } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import { dayLabel, dayOf, plural, weekdayOf } from '@/lib/projects/schedule-model'
import { holdSplit, type NeedRow } from '@/lib/projects/needs-you'
import { MONEY_NEED_KINDS } from '@/lib/projects/money-needs'
import { fetchProjectDetail, fetchProjectRows, type ProjectDetail } from '@/lib/projects/queries'
import { projectHref } from '@/lib/projects/tabs'
import { DEFAULT_CAPACITY, capacityOf, workloadOf } from '@/lib/projects/workload'
import { fetchDefaultCapacity } from '@/lib/projects/workload-queries'
import { complianceCountsOf } from '@/lib/compliance/queries'
import { phaseLabel, phaseOfStage } from '@/lib/compliance/model'
import { fetchLeadRows } from '@/lib/leads/queries'
import { fetchInsights } from '@/lib/leads/insights'   // (pending modules S45A — H-UHD-3) Reports › Leads' own facts
import { fetchSales } from '@/lib/leads/sales-queries'
import { DEFAULT_RANGE, insightsReport, rangeLabel, rangeParam } from '@/lib/leads/tat'
import { salesReport, salesTile } from '@/lib/leads/sales'
import { boardOf } from '@/lib/projects/contractors-model'   // (pending modules S45B — H-UHD-2) the Contractors tile
import { ticketTally } from '@/lib/projects/tickets'   // (pending modules S46B, M1) the Tickets tile — the rail's Tickets count (S46, REG-2524)
import { EMPTY_FILTERS, applyFilters, isOverdueLead } from '@/lib/leads/filters'
import { railBadges } from '@/lib/leads/tasks'
import { fetchMemberStats } from '@/lib/company/members'
import { fetchStudioSetup } from '@/lib/studio-setup/queries'
import { SETUP_HREF, callName } from '@/lib/studio-setup/model'
import { fetchFinanceTodo } from '@/lib/finance/todo-server'
import { TODO_GROUP, todoInputOf, todoRows, type TodoGroupKey, type TodoRow } from '@/lib/finance/todo'
import { buildReport } from '@/lib/finance/reports'
import { money2 } from '@/lib/quotes/math'
import { recentSiteUpdates } from './updates'
import { entityOptions } from '@/lib/finance/entity-scope'
import { countUnreadChats } from '@/lib/projects/messages'
import { fetchHangouts } from '@/lib/hangouts/queries'
import { liveArticles } from '@/lib/market-insights/queries'
import { categoryLabel, featuredOf, readWords } from '@/lib/market-insights/model'
import { aimLabel, idsOf, standingOf } from '@/lib/meetings/model'
import { fetchListingRead } from '@/lib/qanvast-listing/queries'   // (pending modules S37)
import {
  COMING_SHOWN, DASHBOARD, asksFor, comingList, comingWindowEnd, dashboardBrief, greetingOf, moreAsksFor, orderNeeds, rankOfNeed,
  seesSiteUpdates, seesTeam, shapeFor, type DashArticle, type DashComing, type DashPerson, type DashRow, type DashTile, type DashUpdate, type DashboardData,
} from './model'

/*
 * (pending modules S22) The Dashboard as its page reads it, for the signed-in member — every part read through the home it opens (the house
 * rule "never a number computed differently"): a project's Needs you through `fetchProjectDetail` (its own registry, scoped to this viewer),
 * the Leads listing's rows and to-do scopes through `fetchLeadRows` + Who sees leads, Finance › To do through `fetchFinanceTodo` + `todoRows`
 * (its own count), the approvals through `railBadges` (the rail's own counts), the money tiles through Reports › Finance's `buildReport`, the
 * team's load through Projects › Workload's `workloadOf`. Nothing is written.
 */

const MONEY_KINDS = new Set<string>(MONEY_NEED_KINDS)
const from = (to: string) => withFrom(to, DASHBOARD)
/** An approval's row opens its record to read before answering (the Overview's `recordOf`): never its Approve or Send step from here. */
const recordOf = (href: string) => href.replace(/&(?:do=[^&#]*|send=1)/g, '')

/** The viewer's open tasks — the rail badge's rule (`countOverdueTasks`): assigned to them, not done, on a lead they see or the studio's own. */
export async function myOpenTasks(viewerId: string, seen: Set<string> | null): Promise<LeadTask[]> {   // (S42 audit A-16) the ghost's seed reads it too
  const rows = await db.select({ t: leadTasks }).from(leadTasks).innerJoin(taskAssignees, eq(taskAssignees.taskId, leadTasks.id))
    .where(and(eq(leadTasks.done, false), eq(taskAssignees.memberId, viewerId)))
  const out = rows.map((r) => r.t).filter((t) => !t.leadId || !seen || seen.has(t.leadId))
  /* soonest first, undated last — MY TASKS keeps the loader's order inside each group */
  return out.sort((a, b) => (a.dueAt ? a.dueAt.getTime() : Infinity) - (b.dueAt ? b.dueAt.getTime() : Infinity) || a.createdAt.getTime() - b.createdAt.getTime())
}

/** Where each task is: its project's name once the lead is won into one, else the lead's; the studio's own say so. */
async function whereOf(tasks: LeadTask[]): Promise<Record<string, string>> {
  const ids = [...new Set(tasks.map((t) => t.leadId).filter((x): x is string => !!x))]
  if (!ids.length) return Object.fromEntries(tasks.map((t) => [t.id, 'Studio task']))
  const [ls, ps] = await Promise.all([
    db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, ids)),
    db.select({ leadId: projects.leadId, name: projects.name }).from(projects).where(and(inArray(projects.leadId, ids), isNull(projects.deletedAt))),
  ])
  const lead = new Map(ls.map((l) => [l.id, l.name])), project = new Map(ps.map((p) => [p.leadId, p.name]))
  return Object.fromEntries(tasks.map((t) => [t.id, t.leadId ? project.get(t.leadId) ?? lead.get(t.leadId) ?? '' : 'Studio task']))
}

/** The meetings this member is in (or planned) on the leads they see — S23's records. */
async function myMeetings(viewerId: string, seen: Set<string> | null) {
  const rows = await db.select({ m: meetings, leadName: leads.name }).from(meetings).innerJoin(leads, eq(leads.id, meetings.leadId))
    .where(and(isNull(meetings.deletedAt), isNull(leads.deletedAt)))
  return rows.filter((r) => (!seen || seen.has(r.m.leadId)) && (idsOf(r.m.memberIds).includes(viewerId) || r.m.createdBy === viewerId))
}

/** A project's row: its Needs you's top (the header's filled button, S-02) and how many more wait there. `inTodo` = the records Finance ›
    To do already lists for this viewer — a money row about one of them is To do's (its own row below), never said twice; a money row To do
    doesn't list (a margin that slipped, an invoice out of step, a credit to use) stays the project's. */
function projectRow(d: ProjectDetail, inTodo: Set<string> | null): DashRow | null {
  const { kept } = holdSplit(d.needs, d.project.hold ?? null)
  const top = (inTodo ? kept.filter((r) => !(MONEY_KINDS.has(r.kind) && r.ref && inTodo.has(r.ref))) : kept)[0]
  if (!top) return null
  const more = kept.length - 1
  const base = projectHref(d.project.id)
  const action = actionOf(top, base)
  return {
    key: `project:${d.project.id}`, kind: `need:${top.kind}`, ok: top.group === 'ok', icon: '', title: top.title,
    caption: [d.project.name, more > 0 ? `${more} more` : null].filter(Boolean).join(' · '),
    tone: top.tone === 'late' ? 'late' : top.tone === 'approve' ? 'approve' : 'neutral',
    open: from(base), action, rank: rankOfNeed(top.group, top.kind), need: { kind: top.kind, tab: top.tab },
    phrase: top.kind === 'hold' ? `${d.project.name} is on hold` : top.kind === 'start' ? `start ${d.project.name}` : `${top.title} — ${d.project.name}`,
  }
}
/** A row's button: its record (an approval — read it there), its own address, or the project's own flow by the frame's `?run=` landing. */
function actionOf(r: NeedRow, base: string): DashRow['action'] {
  if (r.inline) return { label: 'Review', href: from(recordOf(r.action.href ?? base)) }   // (S-20) never approved unread
  if (r.action.href) return { label: r.action.label, href: r.action.href.startsWith('tel:') ? r.action.href : from(r.action.href) }
  if (r.action.run) return { label: r.action.label, href: from(`${base}?run=${encodeURIComponent(r.action.run)}`) }
  return { label: r.action.label, href: from(base) }
}

export async function fetchDashboard(): Promise<DashboardData> {
  const viewer = await fetchViewer()
  const role = viewer.role
  const now = Date.now()
  const today = dayOf(new Date(now))
  const workspace = opensWorkspace(role), books = seesBooks(role), runs = runsStudio(role)
  /* (S44O — call C6) Marketing's Dashboard: the leads' own — Unassigned and Overdue follow-ups under Needs you, their tasks, the Leads figure */
  const desk = isMarketing(role)
  const [me] = await db.select({ name: members.name }).from(members).where(eq(members.id, viewer.id)).limit(1)
  const first = callName(me?.name) || 'there'   // (S42 audit A-05) the name as the studio wrote it — the welcome's rule
  const seen = await visibleLeadIds(viewer)

  /* (the rail's rule, parity map 2026-10-10) a part that can't be read leaves its card out — never a failed page: each module's read is its own */
  const [badges, list, leadData, todo, setup, tasks, mine, hangouts, articles, unread, team, capacity, stats] = await Promise.all([
    railBadges().catch(() => ({} as Record<string, number>)),
    workspace ? fetchProjectRows().catch(() => null) : Promise.resolve(null),
    workspace || desk ? fetchLeadRows().catch(() => null) : Promise.resolve(null),
    books ? fetchFinanceTodo().catch(() => null) : Promise.resolve(null),
    runs ? fetchStudioSetup().catch(() => null) : Promise.resolve(null),
    myOpenTasks(viewer.id, seen),
    workspace ? myMeetings(viewer.id, seen).catch(() => []) : Promise.resolve([]),
    workspace ? fetchHangouts(now).catch(() => null) : Promise.resolve(null),
    workspace ? liveArticles().catch(() => []) : Promise.resolve([]),
    workspace ? countUnreadChats().catch(() => 0) : Promise.resolve(0),
    db.select().from(members),
    fetchDefaultCapacity().catch(() => DEFAULT_CAPACITY),
    seesTeam(role) ? fetchMemberStats(now).catch(() => null) : Promise.resolve(null),
  ])
  const rows = list?.rows ?? []
  const details = (await Promise.all(rows.map((r) => fetchProjectDetail(r.id).catch(() => null)))).filter((d): d is ProjectDetail => !!d)

  /* ── Needs you ── */
  const needs: DashRow[] = []
  const todoList = todo ? todoRows(todoInputOf(todo.todo)).filter((r) => r.group !== 'waiting') : []
  const inTodo = todo ? new Set(todoList.flatMap((r) => [r.ref, ...(r.invoiceId ? [r.invoiceId] : [])])) : null
  for (const d of details) { const r = projectRow(d, inTodo); if (r) needs.push(r) }
  /* Finance › To do — the money desk's own count (its tab badge, `todoCountOf`): approvals, bills to pay, payments to collect, what is stuck */
  if (todo) {
    if (todoList.length) {
      const order: TodoGroupKey[] = ['approve', 'pay', 'collect', 'stuck', 'drafts', 'sent_back', 'answered', 'claims']
      const parts = order.map((g) => [g, todoList.filter((r) => r.group === g).length] as const).filter(([, n]) => n > 0).map(([g, n]) => `${n} ${TODO_GROUP[g].chip.toLowerCase()}`)
      const approve = todoList.some((r) => r.group === 'approve')
      needs.push({ key: 'finance', kind: 'finance', ok: approve, icon: 'payments', title: `${plural(todoList.length, 'thing')} in Finance’s To do`, caption: parts.join(' · '),
        tone: todoList.some((r) => r.late) ? 'late' : approve ? 'approve' : 'neutral', open: '/company/finance', action: { label: 'Open', href: '/company/finance' }, rank: 2 })   // To do is a page of its own (L1): the rail is its way back
    }
  }
  /* the approvals the rail counts — each its own home (Tools › Quotes' chip, the galleries, Plan & AI credits); a template waits on whoever
     publishes (REG-501: Owners and Admins) — the rail's Company count is everyone's, its approval is not */
  const count = (k: string) => badges[k] ?? 0
  if (count('tools')) needs.push({ key: 'quotes', kind: 'quotes', ok: true, icon: 'request_quote', title: count('tools') === 1 ? '1 quote waits for your approval' : `${count('tools')} quotes wait for your approval`, caption: 'Quotes · Sent for approval', tone: 'approve', open: '/quotes?todo=approval', action: { label: 'Review', href: '/quotes?todo=approval' }, rank: 1 })
  if (runs && count('company:templates')) needs.push({ key: 'templates', kind: 'templates', ok: true, icon: 'style', title: count('company:templates') === 1 ? '1 template waits for your approval' : `${count('company:templates')} templates wait for your approval`, caption: 'Company › Templates', tone: 'approve', open: from('/company/templates/quotes'), action: { label: 'Review', href: from('/company/templates/quotes') }, rank: 1 })
  if (count('company:price-book')) needs.push({ key: 'price-book', kind: 'price-book', ok: true, icon: 'list_alt', title: count('company:price-book') === 1 ? '1 item proposed for the Price book' : `${count('company:price-book')} items proposed for the Price book`, caption: 'Company › Price book', tone: 'approve', open: from('/company/price-book'), action: { label: 'Review', href: from('/company/price-book') }, rank: 1 })
  if (count('company:plan')) needs.push({ key: 'credits', kind: 'credits', ok: true, icon: 'diamond', title: count('company:plan') === 1 ? '1 ask for AI credits' : `${count('company:plan')} asks for AI credits`, caption: 'Company › Plan & AI credits', tone: 'approve', open: from('/company/plan'), action: { label: 'Answer', href: from('/company/plan') }, rank: 1 })
  /* the Leads listing's own to-do scopes, for whoever puts members on leads (Owners, Admins, a Manager for their team) */
  const visibleLeads = leadData ? (seen ? leadData.rows.filter((r) => seen.has(r.id)) : leadData.rows) : []
  if (runs || role === 'Manager' || desk) {
    const unassigned = visibleLeads.filter((r) => r.assignees.length === 0).length
    const overdue = visibleLeads.filter((r) => isOverdueLead(r, now)).length
    if (overdue) needs.push({ key: 'leads-overdue', kind: 'leads-overdue', ok: false, icon: 'flag', title: overdue === 1 ? '1 lead has an overdue follow-up' : `${overdue} leads have an overdue follow-up`, caption: 'Leads · Overdue follow-ups', tone: 'late', open: '/leads?scope=overdue', action: { label: 'Open', href: '/leads?scope=overdue' }, rank: 5 })
    if (unassigned) needs.push({ key: 'leads-unassigned', kind: 'leads-unassigned', ok: false, icon: 'person_add', title: unassigned === 1 ? '1 lead has no member yet' : `${unassigned} leads have no member yet`, caption: 'Leads · Unassigned', tone: 'neutral', open: '/leads?scope=unassigned', action: { label: 'Assign', href: '/leads?scope=unassigned' }, rank: 4 })
  }
  /* S23's meetings: notes to write up once a planned meeting is over (late, ours), a brief to save to the lead */
  for (const { m, leadName } of mine) {
    const st = standingOf({ status: m.status, startsAt: m.startsAt.getTime(), endsAt: m.endsAt?.getTime() ?? null, briefAt: m.briefAt?.getTime() ?? null, briefSavedAt: m.briefSavedAt?.getTime() ?? null }, now)
    if (!st.waits) continue
    const lead = leadName.split(/\s+/)[0] ?? leadName
    needs.push({ key: `meeting:${m.id}`, kind: `meeting-${st.waits}`, ok: false, icon: 'notes', title: st.waits === 'write' ? `Write up the meeting with ${lead}` : `Save the brief of the meeting with ${lead}`,
      caption: `${aimLabel(m.aim)} · ${dayLabel(dayOf(m.startsAt))}`, tone: st.late ? 'late' : 'neutral', open: from(`/meetings/${m.id}`), action: { label: st.waits === 'write' ? 'Write up' : 'Open', href: from(`/meetings/${m.id}`) }, rank: 5 })
  }
  /* 1.0's Compliance Alerts: a project's mandatory items still to do in the phase it is in (its Compliance view's own count) */
  const counted = details.filter((d) => d.mayChange && d.project.stage !== 'completed')
  const compliance = counted.length ? await complianceCountsOf(counted.map((d) => ({ id: d.project.id, stage: d.project.stage, propertyType: d.lead.propertyType }))).catch(() => new Map<string, number>()) : new Map<string, number>()
  for (const d of counted) {
    const n = compliance.get(d.project.id) ?? 0
    if (!n) continue
    needs.push({ key: `compliance:${d.project.id}`, kind: 'compliance', ok: false, icon: 'verified_user', title: `${plural(n, 'compliance item')} to do · ${phaseLabel(phaseOfStage(d.project.stage))}`, caption: d.project.name,
      tone: 'neutral', open: from(projectHref(d.project.id, 'compliance')), action: { label: 'Open', href: from(projectHref(d.project.id, 'compliance')) }, rank: 8 })
  }
  /* S08: Set up your studio, while it is open for this Owner or Admin — a door to Settings › Studio's list, never a copy */
  if (setup && setup.mode === 'open') {
    const next = setup.rows.find((r) => !r.done)
    needs.push({ key: 'setup', kind: 'setup', ok: false, icon: 'task_alt', title: 'Set up your studio', caption: `${setup.done} of ${setup.rows.length} done${next ? ` · next: ${next.label}` : ''}`,
      tone: 'neutral', open: setupDoor(), action: { label: 'Continue', href: setupDoor() }, rank: 9 })
  }
  /* (pending modules S37) Qanvast asked for changes to the studio's listing — it waits on an Owner or an Admin: a door to Company › Profile's
     Listed on Qanvast card, never a copy (ours to fix, not late) */
  const listing = runs ? await fetchListingRead().catch(() => null) : null
  if (listing?.asked) {
    const door = `${withFrom('/company/profile', DASHBOARD)}#qanvast`
    const title = listing.listed ? 'Qanvast asks for changes to your listing update' : 'Qanvast asks for changes to your listing application'
    needs.push({ key: 'qanvast-listing', kind: 'qanvast-listing', ok: false, icon: 'storefront', title, caption: listing.asked.note ?? 'Company › Profile › Listed on Qanvast',
      tone: 'neutral', open: door, action: { label: 'Fix', href: door }, rank: 7, phrase: title })
  }
  const ordered = orderNeeds(needs)

  /* ── My tasks ── */
  const where = await whereOf(tasks)
  const overdueTasks = tasks.filter((t) => isOverdue(t.dueAt, now)).length
  const dueToday = tasks.filter((t) => isDueToday(t.dueAt, now)).length

  /* ── Coming up: this week and next ── */
  const windowEnd = comingWindowEnd(today, weekdayOf(today))
  const coming: DashComing[] = []
  for (const d of details) {
    if (!d.mayChange || d.project.stage !== 'in_progress' || d.project.hold) continue
    for (const x of d.comingUp) if (x.day !== null) coming.push({ key: x.key, day: x.day, title: x.title, caption: [d.project.name, x.caption].filter(Boolean).join(' · '), icon: x.icon, href: from(x.href) })
  }
  for (const { m, leadName } of mine) {
    if (m.status !== 'planned' || dayOf(m.startsAt) < today) continue
    const lead = leadName.split(/\s+/)[0] ?? leadName
    coming.push({ key: `meeting:${m.id}`, day: dayOf(m.startsAt), title: `${aimLabel(m.aim) === 'Other' ? 'Meeting' : aimLabel(m.aim)} with ${lead}`, caption: `${displayTime(m.startsAt)} · ${m.whereKind}`, icon: 'event', href: from(`/meetings/${m.id}`) })
  }
  if (hangouts) {
    const onPlan = runs ? null : new Set((await db.select({ eventId: hangoutDesigners.eventId, shiftIds: hangoutDesigners.shiftIds }).from(hangoutDesigners).where(eq(hangoutDesigners.memberId, viewer.id)).catch(() => [])).filter((x) => idsOf(x.shiftIds).length > 0).map((x) => x.eventId))
    for (const e of hangouts.events) {
      if (e.participation !== 'confirmed' || (e.phase !== 'today' && e.phase !== 'ahead') || (onPlan && !onPlan.has(e.id))) continue
      /* the day is the row's own (its meta); a Hangout over several days says which */
      coming.push({ key: `hangout:${e.id}`, day: Math.max(today, dayOf(new Date(e.startsOn))), title: e.name, caption: e.daysLine.includes('–') ? `${e.daysLine} · ${e.hoursLine}` : e.hoursLine, icon: 'group', href: from(`/qanvast-ops/hangouts/${e.id}`) })
    }
  }
  /* Accounting has no project of their own: their next fortnight is the money due in it — To do's own rows (To pay · To collect) */
  if (isAccounting(role) && todo) {
    for (const r of todoRows(todoInputOf(todo.todo))) {
      if ((r.group !== 'pay' && r.group !== 'collect') || !r.due || r.late) continue
      coming.push({ key: `todo:${r.key}`, day: dayOf(new Date(r.due)), title: r.title, caption: [r.project, r.amountMinor ? moneyWords(r) : null].filter(Boolean).join(' · '), icon: r.group === 'collect' ? 'payments' : 'receipt_long', href: todoHref(r) })
    }
  }
  const comingUp = comingList(coming, today, windowEnd)
  const meetingsToday = coming.filter((x) => x.key.startsWith('meeting:') && x.day === today).length

  /* ── Where it stands ── */
  const tiles: DashTile[] = []
  if ((workspace || desk) && leadData) {
    const mineOnly = !runs && role !== 'Manager' && !desk
    const base = mineOnly ? visibleLeads.filter((r) => r.assignees.some((m) => m.id === viewer.id)) : visibleLeads
    const added = applyFilters(base, { ...EMPTY_FILTERS, datePreset: '7d' }, now).length
    /* 1.0's Studio Pulse (Owners and Admins): this week against the one before — the listing's own date rule, the custom range of the 7 days before */
    const dmy = (t: number) => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` }
    const day0 = new Date(now); const midnight = new Date(day0.getFullYear(), day0.getMonth(), day0.getDate()).getTime()
    const before = runs || desk ? applyFilters(base, { ...EMPTY_FILTERS, datePreset: 'custom', from: dmy(midnight - 13 * 86_400_000), to: dmy(midnight - 7 * 86_400_000) }, now).length : null
    const href = mineOnly ? '/leads?scope=mine' : '/leads'
    tiles.push({ key: 'leads', label: mineOnly ? 'My leads' : 'Leads', value: String(base.length),
      help: `${added ? `${added} added in the last 7 days` : 'None added in the last 7 days'}${before !== null && (added || before) ? ` · ${before} the week before` : ''}`, href, aria: `${mineOnly ? 'My leads' : 'Leads'}: ${base.length} — open the Leads listing` })
  }
  /* (pending modules S45A — H-UHD-3; 1.0's Sales Reports and Response Time widgets, 4da810229) Reports › Leads' own figures on the range it opens
     on, each a door into its report there — Sales for Owners and Admins (its home's readers), Response time for whoever reads Reports › Leads
     (Owners, Admins, Marketing). Worked out by the report's own functions over the report's own facts: never a second count. */
  if (runs || desk) {
    const insights = await fetchInsights().catch(() => null)
    const sales = runs && insights ? await fetchSales({ insights, rows: leadData?.rows }).catch(() => null) : null
    const span = rangeLabel(DEFAULT_RANGE)
    if (sales) {
      const t = salesTile(salesReport(sales, DEFAULT_RANGE))
      tiles.push({ key: 'sales', label: 'Sales', value: t.value, help: t.help, href: from(`/company/reports/leads?report=sales&range=${rangeParam(DEFAULT_RANGE)}`), aria: `Sales: ${t.value} won — open the Sales report` })
    }
    if (insights) {
      const leg = insightsReport(insights.facts, insights.team, insights.now, DEFAULT_RANGE).legs.outreach
      const value = durationWords(leg.median)
      tiles.push({ key: 'response', label: 'Response time', value, help: leg.count ? `Median from assignment to first contact · ${span.toLowerCase()}` : `No first contact logged · ${span.toLowerCase()}`,
        href: from(`/company/reports/leads?range=${rangeParam(DEFAULT_RANGE)}`), aria: `Response time: ${value} — open the Response time report` })
    }
  }
  if (workspace && list) {
    const mineOnly = !runs && role !== 'Manager'
    const set = mineOnly ? rows.filter((r) => r.team.some((m) => m.id === viewer.id)) : rows.filter((r) => r.stage !== 'completed')
    const attention = set.filter((r) => r.attention.length > 0).length
    const running = set.filter((r) => r.stage === 'in_progress').length
    tiles.push({ key: 'projects', label: mineOnly ? 'My projects' : 'Open projects', value: String(set.length),
      help: attention ? `${attention} ${attention === 1 ? 'needs' : 'need'} attention` : mineOnly ? `${running} in progress` : 'Nothing needs attention',
      href: mineOnly ? '/projects?scope=mine' : attention ? '/projects?scope=attention' : '/projects', aria: `${mineOnly ? 'My projects' : 'Open projects'}: ${set.length} — open the Projects listing` })
  }
  /* (pending modules S45B · H-UHD-2 — 1.0's Contractors widget: idle now · over capacity · unstaffed soon, a door to /contractors) the Workload
     view's Contractors in one figure, for whoever reads the Workload view (Owners, Admins, Managers): the contractors free this week, its line
     the over-capacity and the work starting with nobody — the view's own board over the listing's own records (never a second count). The door
     is the listing's view, as Open projects' is; a studio that keeps no contractor yet is sent to Finance › Vendors to mark them. */
  if (workspace && list?.contractors && seesTeam(role)) {
    const cb = list.contractors
    const b = boardOf(cb.contractors, cb.crew, cb.sites, cb.trades, dayOf(new Date(cb.now)))
    const k = b.kpis
    const gaps = b.unstaffed.filter((g) => g.site.visible).length
    const help = !k.contractors ? 'None yet — mark the vendors who work on site'
      : [`free this week`, k.over ? `${k.over} over capacity` : null, gaps ? `${gaps} starting with no contractor` : null].filter(Boolean).join(' · ')
    tiles.push({ key: 'contractors', label: 'Contractors', value: k.contractors ? String(k.freeNow) : '--', help,
      href: k.contractors ? '/projects?view=workload&of=contractors' : from('/company/finance/vendors'),
      aria: k.contractors ? `Contractors: ${k.freeNow} free this week — open the contractors` : 'Contractors: none yet — open Finance › Vendors' })
  }
  /* (pending modules S46B — his "fix everything" 2026-10-19 after the findability audit, M1; 1.0's rail "Escalations (3)" and Studio Pulse's
     escalations) the studio's tickets in one figure, for whoever opens projects: the tickets waiting on the studio — the Projects ⋮'s Tickets
     row's own count (`countTicketsToAnswer` reads the same tally) — its line how many are open in all and escalated; the door is Projects ›
     Tickets with the way back. No colour: a ticket left waiting is red on its project's Needs you, where it is answered. */
  if (workspace) {
    const tt = await ticketTally().catch(() => null)
    if (tt) {
      const rest = [tt.open > tt.toAnswer ? `${tt.open} open` : null, tt.escalated ? `${tt.escalated} escalated` : null].filter(Boolean)
      const help = tt.toAnswer ? ['waiting on you', ...rest].join(' · ') : tt.open ? ['Nothing waits on you', ...rest].join(' · ') : 'No open tickets'
      tiles.push({ key: 'tickets', label: 'Tickets', value: String(tt.toAnswer), help, href: from('/tickets'),
        aria: `Tickets: ${tt.toAnswer} waiting on you — open Tickets` })
    }
  }
  if (workspace) tiles.push({ key: 'messages', label: 'Messages', value: String(unread), help: unread ? `${unread === 1 ? 'conversation' : 'conversations'} with something unread` : 'You’re up to date', href: unread ? '/chat?show=unread' : '/chat', aria: `Messages: ${unread} unread — open Messages` })
  if (books && todo?.books) {
    const b = todo.books
    const input = { projects: b.projects, overhead: b.overhead, vendors: b.vendors, people: b.people, commission: b.commission, now: b.now, entities: entityOptions(b.entities) }
    const ar = buildReport('ar', input, 'this_month'), pl = buildReport('pl', input, 'this_month')
    const owed = ar.tiles[0], youOwe = ar.tiles[1], profit = pl.tiles[2], margin = pl.tiles[3]
    /* the tiles say where the studio stands — no colour: red is only for what is late and ours (S-05), and a client's debt is theirs */
    if (owed) tiles.push({ key: 'owed', label: owed.label, value: owed.value, help: owed.help, href: from('/company/reports/finance?report=ar'), aria: `${owed.label}: ${owed.value} — open the report` })
    if (isAccounting(role) && youOwe) tiles.push({ key: 'owe', label: youOwe.label, value: youOwe.value, help: youOwe.help, href: from('/company/reports/finance?report=ar'), aria: `${youOwe.label}: ${youOwe.value} — open the report` })
    /* the month's revenue says what the profit is out of; a margin only when something was invoiced (credit notes can take a month below nothing) */
    const revenue = pl.tiles[0]
    const invoiced = !!revenue && !revenue.value.startsWith('−') && revenue.value !== money2(0)
    /* (S42 call A·3) a month the credit notes took below nothing says so in a studio's words — never "Revenue −S$…" */
    const below = !!revenue && revenue.value.startsWith('−')
    if (profit && seesProfit(viewer)) tiles.push({ key: 'profit', label: 'Profit this month', value: profit.value, help: invoiced && margin && margin.value !== '--' ? `Margin ${margin.value} on ${revenue.value} invoiced` : below ? `Credit notes ${revenue.value.slice(1)} more than invoiced this month` : revenue ? `Revenue ${revenue.value} this month` : profit.help,
      href: from('/company/reports/finance?report=pl&period=this_month'), aria: `Profit this month: ${profit.value} — open the profit and loss` })
  }

  /* ── the team's load: Projects › Workload's lines, and each member's open leads (the Assign box's suggestion reads the same) ── */
  let teamRows: DashPerson[] | null = null
  if (seesTeam(role) && list) {
    const people = team.map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, isActive: m.isActive, managerId: m.managerId, projectCapacity: m.projectCapacity }))
    const lines = workloadOf(rows.map((r) => ({ id: r.id, name: r.name, number: r.number, stage: r.stage, team: r.team, attention: r.attention, hold: r.hold ?? null })), people, { id: viewer.id, role, teamIds: viewer.teamIds }, capacity).lines
    teamRows = lines.map((l) => {
      if (!l.person) return { key: 'nobody', name: 'No one yet', caption: l.words, over: true }
      const open = stats?.[l.person.id]?.active ?? 0
      return { key: l.person.id, name: l.person.name, caption: `${l.count} of ${plural(capacityOf(l.person, capacity), 'project')} · ${l.words}`, meta: open ? plural(open, 'open lead') : undefined, over: l.state === 'over' }
    })
  }

  /* ── the latest site updates (1.0's owner feed): the last fortnight's published updates, newest first ── */
  const updates: DashUpdate[] | null = seesSiteUpdates(role)
    ? (await recentSiteUpdates(viewer, now).catch(() => [])).map((u) => ({ key: u.id, title: u.title, caption: [u.projectName, u.author, dayLabel(dayOf(new Date(u.at)))].filter(Boolean).join(' · '), icon: u.files ? 'photo_camera' : 'article', href: from(projectHref(u.projectId, `updates?open=${encodeURIComponent(u.id)}`)) }))
    : null

  /* ── From Market Insights (1.0's Industry News card — S25: one reader): the featured article, else the newest ── */
  const top = featuredOf(articles) ?? articles[0] ?? null
  const article: DashArticle | null = top ? { id: top.id, title: top.title, caption: [categoryLabel(top.category), top.sample ? 'Sample' : null, readWords(top.readMinutes)].filter(Boolean).join(' · '), href: from(`/market-insights/${top.id}`) } : null

  const meetingAhead = mine.some(({ m }) => m.status === 'planned' && m.startsAt.getTime() >= now - 30 * 60_000)
  const asks = asksFor(role, { meetingAhead })
  const hour = new Date(now).getHours()
  return {
    viewer: { id: viewer.id, first, role }, now, today,
    brief: dashboardBrief({ greeting: greetingOf(hour), first, dayLabel: dayLabel(today), needs: ordered, overdue: overdueTasks, dueToday, meetingsToday, asks }),
    asks: [...new Set([...asks, ...moreAsksFor(role, { setupOpen: setup?.mode === 'open' })])],
    needs: ordered, tasks, where, coming: comingUp.slice(0, Math.max(COMING_SHOWN, comingUp.length)), tiles,
    team: teamRows, updates, article,
    shape: shapeFor(role, { updates: !!updates?.length, article: !!article, costs: seesProfit(viewer) }),   // (pending modules S41b-1)
  }
}

const setupDoor = () => {
  const [path, hash] = SETUP_HREF.split('#')
  return `${withFrom(path ?? SETUP_HREF, DASHBOARD)}${hash ? `#${hash}` : ''}`
}
const moneyWords = (r: TodoRow) => (r.amountMinor ? money2(r.amountMinor) : '')
/** To do's own opener (components/finance/todo/todo-workspace.tsx `opener`): money in on its project's Money, money out where To do lists it. */
const todoHref = (r: TodoRow) => (r.projectId && (r.kind === 'invoice' || r.kind === 'confirm' || r.kind === 'check' || r.kind === 'remind' || r.kind === 'send')
  ? from(`/projects/${r.projectId}/money?open=${encodeURIComponent(r.invoiceId ?? r.ref)}`) : from('/company/finance'))
