import 'server-only'
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadTasks, leads, members, notifications, settings, projects, stageLogs, taskAssignees } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'   // (pending modules S43A) this browser's member, never the standing flag
import { DEFAULT_RULES, DEFAULT_TEMPLATES, parseRules, parseTemplates, type Channel, type FeedAct, type FeedRow, type MessageTemplate, type NotificationRules } from '@/lib/notifications/model'
import { runsStudio } from '@/lib/leads/assign-policy'
import { fetchContactedLeadIds } from '@/lib/leads/queries'
import { isUntouchedLead } from '@/lib/leads/filters'
import { runsLeads, runsMoney } from '@/lib/settings/roles'
import { displayDate, isOverdue, startOfDay, titleCaseName } from '@/lib/format'

/* (REG-604) Notifications: the rules and messages (settings), the feed (stored rows + the follow-ups derived now). */

export const RULES_KEY = 'notification_rules'
export const TEMPLATES_KEY = 'message_templates'

export async function fetchNotificationRules(): Promise<NotificationRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, RULES_KEY)).limit(1)
  if (!row) return DEFAULT_RULES
  try { return parseRules(JSON.parse(row.value)) } catch { return DEFAULT_RULES }
}
export async function fetchMessageTemplates(): Promise<MessageTemplate[]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TEMPLATES_KEY)).limit(1)
  if (!row) return DEFAULT_TEMPLATES
  try { return parseTemplates(JSON.parse(row.value)) } catch { return DEFAULT_TEMPLATES }
}

const CLOSED = new Set(['Won', 'Lost', 'On Hold'])
const SOON_MS = 30 * 60_000   // (REG-608) "due in 30 minutes"

/**
 * The follow-ups due right now for `memberId`, derived — never stored, so they leave the feed the moment the work is done:
 * a New lead untouched past the delay (theirs, or unassigned when they run the studio), a task past its due date (theirs).
 */
export async function derivedDue(memberId: string, role: string, rules: NotificationRules, now = Date.now()): Promise<FeedRow[]> {
  const out: FeedRow[] = []
  if (rules.channels.untouched.in_app) {
    const [rows, links] = await Promise.all([
      db.select({ id: leads.id, name: leads.name, stage: leads.stage, createdAt: leads.createdAt }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.stage, 'New'))),
      db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
    ])
    /* (pending modules S27) "has had contact" is the listing's own rule (`lastContactOf`: a contact log, a Contacted entry, a meeting held — a
       Hangout chat at the studio's table) — so the bell never calls a lead untouched while Last contact names a contact */
    const contacted = await fetchContactedLeadIds(rows.map((l) => l.id))
    for (const l of rows) {
      if (!isUntouchedLead({ stage: l.stage, createdAt: l.createdAt, contacted: contacted.has(l.id) }, now, rules.untouchedMinutes)) continue   // (the Dashboard redesigned, P-13) the one rule, shared with the Dashboard
      if (rules.stopWhenClosed && CLOSED.has(l.stage)) continue
      const mine = links.filter((x) => x.leadId === l.id).map((x) => x.memberId)
      if (!(mine.includes(memberId) || (mine.length === 0 && runsLeads(role)))) continue   // (S44O — C6) an unassigned lead's: the lead desk's too
      const ago = Math.round((now - l.createdAt.getTime()) / 60_000)
      out.push({ id: `untouched-${l.id}`, kind: 'untouched', title: `${l.name} has had no contact yet`, body: ago >= 1440 ? `Arrived ${Math.floor(ago / 1440)} day${Math.floor(ago / 1440) === 1 ? '' : 's'} ago, nothing logged` : ago >= 60 ? `Arrived ${Math.floor(ago / 60)} h ago, nothing logged` : `Arrived ${ago} min ago, nothing logged`, href: `/leads/${l.id}`, at: l.createdAt.getTime() + rules.untouchedMinutes * 60_000, readAt: null, channels: channelsOf(rules, 'untouched'), derived: true })
    }
  }
  /* (REG-608, parity Q-23) Two rows from one pass over the open tasks: overdue (past due) and due soon (within 30 minutes) — the
     latter is 1.0's T−30 reminder for follow-ups and tasks alike, now that a follow-up is a task. */
  const soonOn = rules.channels.task_due_soon.in_app, dueOn = rules.channels.task_due.in_app
  /* (gaps build, package C — 15) Settings › Projects › Schedule › Alerts lead time: how many days ahead a project's task and a milestone's last day ring */
  const alertDays = (await (await import('@/lib/projects/schedule')).fetchScheduleRules()).alertDays
  if (soonOn || dueOn) {
    const [tasks, ta, leadRows, live] = await Promise.all([
      db.select({ id: leadTasks.id, title: leadTasks.title, kind: leadTasks.kind, leadId: leadTasks.leadId, dueAt: leadTasks.dueAt }).from(leadTasks).where(eq(leadTasks.done, false)),
      db.select({ taskId: taskAssignees.taskId, memberId: taskAssignees.memberId }).from(taskAssignees),
      db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(isNull(leads.deletedAt)),
      db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(isNull(projects.deletedAt), ne(projects.stage, 'completed'))),
    ])
    const leadById = new Map(leadRows.map((l) => [l.id, l]))
    /* (REG-920, Projects Q-29) A Won lead's tasks carry on as its project's: reminders keep coming while the project runs, and open there. */
    const projectOf = new Map(live.map((p) => [p.leadId, p.id]))
    for (const t of tasks) {
      if (!t.dueAt) continue
      const lead = t.leadId ? leadById.get(t.leadId) : null
      if (t.leadId && !lead) continue
      const pid = lead ? projectOf.get(lead.id) : undefined
      if (lead && rules.stopWhenClosed && CLOSED.has(lead.stage) && !pid) continue
      const mine = ta.filter((x) => x.taskId === t.id).map((x) => x.memberId)
      if (!(mine.includes(memberId) || (mine.length === 0 && runsStudio(role)))) continue
      const due = t.dueAt.getTime()
      const href = pid ? `/projects/${pid}/tasks?open=${t.id}` : lead ? `/leads/${lead.id}/tasks?open=${t.id}` : `/tasks?open=${t.id}`
      /* (the calm UI build 2026-10-27 — the audit's 1-20 · W-073: one date a row, in its time line) the task's own words, then whose — the due
         day is the row's meta (`dueLine`), never a second time in its title (was "Due today: … / On Cheryl Lim / Due today") */
      const where = lead ? lead.name : 'A general task'
      /* (the Dashboard redesigned, 2026-10-26 — P-13 "one overdue clock", his Build mark) Overdue is the task lists' own rule, `isOverdue`: due
         on a day before today — never the moment its time passed (a date-only task read "Overdue" from the midnight of its own day while My
         tasks said Due today). Stamped at its due day's local midnight, so the line's "n days late" counts calendar days as the lists do. A task
         due today whose time has gone (or that has none) is "Due today": the due-soon row's words and glyph, riding the channels the overdue
         notice rode at that moment — so nothing new is sent. */
      if (isOverdue(t.dueAt, now)) { if (dueOn) out.push({ id: `task-${t.id}`, kind: 'task_due', title: t.title, body: where, href, at: startOfDay(t.dueAt), readAt: null, channels: channelsOf(rules, 'task_due'), derived: true, fields: { '{task}': t.title } }) }
      else if (due <= now) { if (dueOn) out.push({ id: `task-soon-${t.id}`, kind: 'task_due_soon', title: t.title, body: where, href, at: due, due, readAt: null, channels: channelsOf(rules, 'task_due'), derived: true, fields: { '{task}': t.title, '{when}': 'today' } }) }
      else if (soonOn && due - now <= SOON_MS) { const m = Math.max(1, Math.round((due - now) / 60_000)); out.push({ id: `task-soon-${t.id}`, kind: 'task_due_soon', title: t.title, body: where, href, at: due - SOON_MS, due, readAt: null, channels: channelsOf(rules, 'task_due_soon'), derived: true, fields: { '{task}': t.title, '{when}': `in ${m} ${m === 1 ? 'minute' : 'minutes'}` } }) }
      /* (gaps build, package C — 15) a running project's task, the lead time before its due day — "Due tomorrow" · "Due in 3 days" (the day count is by local midnights, as the row's own) */
      else if (soonOn && pid) {
        const days = Math.round((new Date(t.dueAt.getFullYear(), t.dueAt.getMonth(), t.dueAt.getDate()).getTime() - new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime()) / 86_400_000)
        if (days >= 0 && days <= alertDays) out.push({ id: `task-soon-${t.id}`, kind: 'task_due_soon', title: t.title, body: where, href, at: Math.max(due - alertDays * 86_400_000, now - 60_000), due, readAt: null, channels: channelsOf(rules, 'task_due_soon'), derived: true, fields: { '{task}': t.title, '{when}': days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days` } })   // (pending modules S18) `due`: the bell's due line read "Due in 29 min" on a task due days ahead
      }
    }
  }
  /* (Projects round 2) Reminders from the schedule's dates, never from someone opening a page (1.0 raised its at-risk tasks only while the
     Gantt was open, E-285): an unfinished milestone of a running project, three days before its last day and once it has passed — for the
     project's team (its lead's members), or the studio's runners when it has none. Each opens the milestone on the Schedule. */
  const dueOn2 = rules.channels.milestone_due.in_app, lateOn = rules.channels.milestone_late.in_app
  if (dueOn2 || lateOn) {
    const { projectMilestones } = await import('@/lib/db/schema')
    const { dayOf } = await import('@/lib/projects/schedule-model')
    const [ms, live, links] = await Promise.all([
      db.select({ id: projectMilestones.id, projectId: projectMilestones.projectId, title: projectMilestones.title, endDate: projectMilestones.endDate, status: projectMilestones.status })
        .from(projectMilestones).where(and(isNull(projectMilestones.deletedAt), ne(projectMilestones.status, 'done'))),
      db.select({ id: projects.id, leadId: projects.leadId, name: projects.name }).from(projects).where(and(isNull(projects.deletedAt), eq(projects.stage, 'in_progress'), isNull(projects.onHoldAt))),   // (gaps build, package A — M-01) a project on hold has no milestone reminders
      db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
    ])
    const byProject = new Map(live.map((p) => [p.id, p]))
    const today = dayOf(new Date(now))
    for (const m of ms) {
      const p = byProject.get(m.projectId)
      if (!p) continue
      const team = links.filter((x) => x.leadId === p.leadId).map((x) => x.memberId)
      if (!(team.includes(memberId) || (team.length === 0 && runsStudio(role)))) continue
      const end = dayOf(m.endDate), left = end - today
      /* (REG-1072) One day count for the bell and the row (`lateBy`: today − its last day, by local midnights, the way a task due on a day
         counts): a late row comes due at its last day's local midnight, so "Due Sat 3 Oct · 3 days late" reads what the row's "3 days
         overdue" does at any hour (17:00 made it a day short until 5 pm); a row still running is due to the end of its last day, so "Ends
         today" is never "late" before midnight. */
      const lastDay = new Date(m.endDate.getFullYear(), m.endDate.getMonth(), m.endDate.getDate())
      const at = left < 0 ? lastDay.getTime() : new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59).getTime()
      const href = `/projects/${p.id}/schedule?open=${m.id}`
      if (left < 0 && lateOn) out.push({ id: `ms-late-${m.id}`, kind: 'milestone_late', title: `Overdue: ${m.title}`, body: p.name, href, at, readAt: null, channels: channelsOf(rules, 'milestone_late'), derived: true, fields: { '{milestone}': m.title } })
      else if (left >= 0 && left <= alertDays && dueOn2) out.push({ id: `ms-due-${m.id}`, kind: 'milestone_due', title: left === 0 ? `Ends today: ${m.title}` : `Ends in ${left} ${left === 1 ? 'day' : 'days'}: ${m.title}`, body: p.name, href, at, readAt: null, channels: channelsOf(rules, 'milestone_due'), derived: true, fields: { '{milestone}': m.title } })
    }
  }
  /* (REG-608, parity Q-06) An On Hold lead whose follow-up date has come round — 1.0's 09:00 revisit ping, derived here. */
  if (rules.channels.hold_due.in_app) {
    const [held, logs, links] = await Promise.all([
      db.select({ id: leads.id, name: leads.name }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.stage, 'On Hold'))),
      db.select({ leadId: stageLogs.leadId, payload: stageLogs.payload, createdAt: stageLogs.createdAt }).from(stageLogs).where(eq(stageLogs.toStage, 'On Hold')),
      db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
    ])
    for (const l of held) {
      const log = logs.filter((g) => g.leadId === l.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      const p = (log?.payload && typeof log.payload === 'object' ? log.payload : {}) as { followUpAt?: string; reason?: string }
      const at = p.followUpAt ? new Date(p.followUpAt).getTime() : NaN
      if (!Number.isFinite(at) || at > now) continue
      const mine = links.filter((x) => x.leadId === l.id).map((x) => x.memberId)
      if (!(mine.includes(memberId) || (mine.length === 0 && runsLeads(role)))) continue   // (S44O — C6)
      out.push({ id: `hold-${l.id}`, kind: 'hold_due', title: `Hold ended — revisit ${l.name}`, body: `${p.reason ? `${p.reason} · ` : ''}the follow-up was due ${displayDate(new Date(at))}`, href: `/leads/${l.id}`, at, readAt: null, channels: channelsOf(rules, 'hold_due'), derived: true })
    }
  }
  /* (gaps build, package A — M-01) A project on hold whose resume day has come round — the lead's hold_due, for a project: for its team (its
     lead's members), else the studio's runners; it leaves the feed the moment the project resumes or takes a new date. */
  if (rules.channels.project_hold_due?.in_app) {
    const [held, links] = await Promise.all([
      db.select({ id: projects.id, leadId: projects.leadId, name: projects.name, until: projects.onHoldUntil, reason: projects.onHoldReason }).from(projects)
        .where(and(isNull(projects.deletedAt), ne(projects.stage, 'completed'), sql`${projects.onHoldAt} IS NOT NULL AND ${projects.onHoldUntil} IS NOT NULL`)),
      db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
    ])
    for (const p of held) {
      const until = p.until ?? Infinity
      const d = new Date(until)
      if (!Number.isFinite(until) || new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() > now) continue
      const team = links.filter((x) => x.leadId === p.leadId).map((x) => x.memberId)
      if (!(team.includes(memberId) || (team.length === 0 && runsStudio(role)))) continue
      out.push({ id: `project-hold-${p.id}`, kind: 'project_hold_due', title: `Time to resume ${p.name}`, body: `${p.reason ? `${p.reason} · ` : ''}it was to resume ${displayDate(d)}`, href: `/projects/${p.id}`, at: until, readAt: null, channels: channelsOf(rules, 'project_hold_due'), derived: true })
    }
  }
  /* (Projects round 6, F-14) An invoice past its due day and not paid — for the project's team, gone the moment it is paid (or a client's
     proof waits for the confirmer). Derived from the date like a task's, never stored. */
  if (rules.channels.payment_overdue.in_app) {
    const { derivedPaymentRows } = await import('@/lib/projects/payments')
    out.push(...await derivedPaymentRows(memberId, role, rules, now))
  }
  /* (gaps build B, item 5) A stage's invoice ready to send — its milestone done — for the project's team, gone once it is sent or submitted. */
  if (rules.channels.invoice_ready?.in_app) {
    const { derivedReadyRows } = await import('@/lib/projects/payments')
    out.push(...await derivedReadyRows(memberId, role, rules, now))
  }
  /* (gaps build F1 — F1-Q15) A supplier bill three days from its due day, or past it, and not paid — for the studio's Owners and Admins (who pay);
     gone the moment it is paid. Derived from the date, never stored. */
  if (rules.channels.bill_due?.in_app && runsMoney(role)) {   // (parity map, MO-098) and Accounting, who pays them
    const { derivedBillRows } = await import('@/lib/finance/bell')
    out.push(...await derivedBillRows(rules, now))
  }
  /* (parity map, MO-094 · PR-089) A PO's delivery late — for whoever made it and the project's members; gone once it is marked delivered. */
  if (rules.channels.po_delivery_late?.in_app) {
    const { derivedPoLateRows } = await import('@/lib/finance/bell')
    out.push(...await derivedPoLateRows(memberId, role, rules, now))
  }
  /* (gaps build F2 — F2-Q13 · Q15) A push to Xero that failed and waits for Retry — for Owners and Admins; gone once it goes through. */
  if (rules.channels.xero_failed?.in_app && runsMoney(role)) {   // (parity map, FB-114) and Accounting, who runs Xero
    const { derivedXeroRows } = await import('@/lib/finance/xero-server')
    out.push(...await derivedXeroRows(rules))
  }
  return out
}

export const channelsOf = (rules: NotificationRules, kind: keyof NotificationRules['channels']): Channel[] => (Object.entries(rules.channels[kind]) as [Channel, boolean][]).filter(([, on]) => on).map(([c]) => c)

/** The feed for one member: stored rows newest first, the derived follow-ups woven in by time.
    (pending modules S18) A reminder of a kind the member muted for themselves is left out of their feed — and so of its email and WhatsApp
    (`deliverDerived` reads this feed) and of their daily summary; the rows they were sent before muting stay, as what happened. */
export async function fetchFeed(memberId: string, role: string): Promise<{ rows: FeedRow[]; unread: number }> {
  const rules = await fetchNotificationRules()
  const { noticePrefsOf } = await import('@/lib/notifications/prefs-server')
  const [stored, due, prefs] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.memberId, memberId)).orderBy(desc(notifications.createdAt)).limit(60),
    derivedDue(memberId, role, rules),
    noticePrefsOf([memberId]),
  ])
  const muted = prefs.get(memberId)?.muted
  /* (pending modules S18) a row whose email waits for the member's daily summary says so — stored that way when it was raised; a reminder
     derived now follows how their emails come now (its email goes in the summary's Due part, never on its own) */
  const { waitsForSummary } = await import('@/lib/notifications/personal')
  const mode = prefs.get(memberId)?.email ?? 'each'
  const derivedRow = (r: FeedRow): FeedRow => (r.channels.includes('email') && waitsForSummary(mode, r.kind) ? { ...r, channels: r.channels.filter((c) => c !== 'email'), summary: true } : r)
  const storedRow = (n: (typeof stored)[number]): FeedRow => {
    const list = n.channels.split(',').filter(Boolean)
    return { id: n.id, kind: n.kind as FeedRow['kind'], title: n.title, body: n.body, href: n.href, at: n.createdAt.getTime(), readAt: n.readAt?.getTime() ?? null, channels: list.filter((c) => c !== 'summary') as Channel[], derived: false, ...(list.includes('summary') ? { summary: true } : {}) }
  }
  const rows: FeedRow[] = [
    ...stored.map(storedRow),
    ...(muted?.size ? due.filter((r) => !muted.has(r.kind)) : due).map(derivedRow),
  ].sort((a, b) => b.at - a.at)
  await approvalActs(rows, memberId, role)   // (simplify round 2 · P2 §6.7)
  /* (pending modules S41b-4) an upgrade offer shows only while it is the Owner's live one (on Free, unanswered) — its one way on rides the row;
     a row its record no longer stands behind never shows */
  if (rows.some((r) => r.kind === 'upgrade_offer')) {
    const { liveOffer } = await import('@/lib/credits/nudges')
    const live = await liveOffer(memberId).catch(() => null)
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i]!
      if (r.kind !== 'upgrade_offer') continue
      if (live && r.id === live.id) r.offer = { trigger: live.trigger, primary: live.primary, label: live.label }
      else rows.splice(i, 1)
    }
  }
  /* (UX audit V8) unread = the notices nobody has opened; a follow-up that is due is work, listed apart, and never in the count */
  return { rows, unread: rows.filter((r) => r.readAt === null && !r.derived).length }
}

/* ── (simplify round 2 · P2 §6.7) The bell's approval rows act in the row ─────────────────────────────────────────────────────────── */

/** The approvals the bell answers in place, by the address each was stored with (the actions' own `href`s). */
const ASK_KINDS = new Set<string>(['update_review', 'po_review', 'expense_review', 'invoice_review', 'schedule_ask', 'handover_review'])
const addressOf = (href: string) => { try { const u = new URL(href, 'http://bell'); return { path: u.pathname.split('/').filter(Boolean), open: u.searchParams.get('open'), share: u.searchParams.get('share') === '1' } } catch { return null } }
const moneyDoor = (projectId: string, id: string) => `/projects/${projectId}/money?open=${encodeURIComponent(id)}&do=approve`

/**
 * Each stored approval row this member may answer, whose record STILL waits, gets its `act` (lib/notifications/model.ts `FeedAct`): the record's
 * id and the words its Send back dialog names. Who may answer is the record's own rule — Owners and Admins for every kind; an update also its
 * named reviewers (Settings › Projects) — and the action checks it again when pressed. A row answered elsewhere, or one this member may not
 * answer, gets none and stays a link to the record. One read per kind, whatever the feed's length.
 */
async function approvalActs(rows: FeedRow[], memberId: string, role: string): Promise<void> {
  const asks = rows.map((r) => ({ r, a: !r.derived && ASK_KINDS.has(r.kind) && r.href ? addressOf(r.href) : null })).filter((x): x is { r: FeedRow; a: NonNullable<ReturnType<typeof addressOf>> } => !!x.a)
  if (!asks.length) return
  const runs = runsStudio(role)
  const { fetchUpdateReviewers } = await import('@/lib/projects/updates')
  const reviews = runs || (await fetchUpdateReviewers()).includes(memberId)
  if (!runs && !reviews) return
  const { expenses, projectInvoices, projectMilestoneExtensions, projectMilestones, projectShareRequests, projectUpdates, purchaseOrders } = await import('@/lib/db/schema')
  const { parsePending, pendingWaits } = await import('@/lib/projects/updates-model')
  const { dayOf } = await import('@/lib/projects/schedule-model')
  const ids = (kind: string, test?: (a: (typeof asks)[number]['a']) => boolean) => [...new Set(asks.filter((x) => x.r.kind === kind && (!test || test(x.a))).map((x) => x.a.open).filter((v): v is string => !!v))]
  const pidOf = (a: (typeof asks)[number]['a']) => (a.path[0] === 'projects' ? a.path[1] ?? null : null)
  const none = ['-']
  const [ups, invs, pos, exps, mss, shareProjects] = [ids('update_review'), ids('invoice_review'), ids('po_review'), ids('expense_review'), ids('schedule_ask'), [...new Set(asks.filter((x) => x.r.kind === 'schedule_ask' && x.a.share).map((x) => pidOf(x.a)).filter((v): v is string => !!v))]]
  const [updateRows, invoiceRows, poRows, expenseRows, milestoneRows, extensionRows, shareRows] = await Promise.all([
    reviews ? db.select({ id: projectUpdates.id, projectId: projectUpdates.projectId, title: projectUpdates.title, status: projectUpdates.status, pending: projectUpdates.pending, submittedBy: projectUpdates.submittedBy, authorId: projectUpdates.authorId, deletedAt: projectUpdates.deletedAt }).from(projectUpdates).where(inArray(projectUpdates.id, ups.length ? ups : none)) : [],
    runs ? db.select({ id: projectInvoices.id, projectId: projectInvoices.projectId, stageName: projectInvoices.stageName, status: projectInvoices.status, submittedAt: projectInvoices.submittedAt, submittedBy: projectInvoices.submittedBy }).from(projectInvoices).where(inArray(projectInvoices.id, invs.length ? invs : none)) : [],
    runs ? db.select({ id: purchaseOrders.id, projectId: purchaseOrders.projectId, number: purchaseOrders.number, status: purchaseOrders.status, submittedAt: purchaseOrders.submittedAt, submittedBy: purchaseOrders.submittedBy, createdBy: purchaseOrders.createdBy, deletedAt: purchaseOrders.deletedAt }).from(purchaseOrders).where(inArray(purchaseOrders.id, pos.length ? pos : none)) : [],
    runs ? db.select({ id: expenses.id, projectId: expenses.projectId, description: expenses.description, status: expenses.status, createdBy: expenses.createdBy, deletedAt: expenses.deletedAt }).from(expenses).where(inArray(expenses.id, exps.length ? exps : none)) : [],
    runs ? db.select({ id: projectMilestones.id, projectId: projectMilestones.projectId, title: projectMilestones.title, status: projectMilestones.status, endDate: projectMilestones.endDate, doneAskedAt: projectMilestones.doneAskedAt, doneAskedBy: projectMilestones.doneAskedBy, deletedAt: projectMilestones.deletedAt }).from(projectMilestones).where(inArray(projectMilestones.id, mss.length ? mss : none)) : [],
    runs ? db.select({ id: projectMilestoneExtensions.id, milestoneId: projectMilestoneExtensions.milestoneId, requestedBy: projectMilestoneExtensions.requestedBy }).from(projectMilestoneExtensions).where(and(inArray(projectMilestoneExtensions.milestoneId, mss.length ? mss : none), eq(projectMilestoneExtensions.status, 'pending'))) : [],
    runs ? db.select({ id: projectShareRequests.id, projectId: projectShareRequests.projectId, milestoneIds: projectShareRequests.milestoneIds, note: projectShareRequests.note, requestedBy: projectShareRequests.requestedBy }).from(projectShareRequests).where(and(inArray(projectShareRequests.projectId, shareProjects.length ? shareProjects : none), eq(projectShareRequests.status, 'pending'))) : [],
  ])
  /* the projects behind them (a live one only — a completed or deleted project answers nothing) and their clients' first names */
  const pids = [...new Set([...asks.map((x) => pidOf(x.a)), ...updateRows.map((u) => u.projectId), ...invoiceRows.map((i) => i.projectId), ...poRows.map((p) => p.projectId), ...expenseRows.map((e) => e.projectId), ...milestoneRows.map((m) => m.projectId)].filter((v): v is string => !!v))]
  const projectRows = pids.length ? await db.select({ id: projects.id, name: projects.name, stage: projects.stage, deletedAt: projects.deletedAt, handoverRequestedAt: projects.handoverRequestedAt, handoverRequestedBy: projects.handoverRequestedBy, client: leads.name })
    .from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(inArray(projects.id, pids)) : []
  const project = new Map(projectRows.filter((p) => !p.deletedAt).map((p) => [p.id, p]))
  const live = (id: string | null) => { const p = id ? project.get(id) : undefined; return p && p.stage !== 'completed' ? p : null }
  const client = (id: string | null) => { const p = id ? project.get(id) : undefined; return p ? (titleCaseName(p.client).split(/\s+/)[0] ?? null) : null }
  const team = await db.select({ id: members.id, name: members.name }).from(members)
  const nameOf = (id: string | null | undefined) => (id ? team.find((m) => m.id === id)?.name ?? null : null)

  for (const { r, a } of asks) {
    let act: FeedAct | null = null
    if (r.kind === 'update_review' && a.open) {
      const u = updateRows.find((x) => x.id === a.open)
      const held = u ? parsePending(u.pending) : null
      if (u && !u.deletedAt && live(u.projectId) && (u.status === 'in_review' || (u.status === 'published' && pendingWaits(held)))) {
        act = { kind: 'update', id: u.id, projectId: u.projectId, title: held && u.status === 'published' ? held.title : u.title, by: nameOf(held && u.status === 'published' ? held.by : u.submittedBy ?? u.authorId), client: client(u.projectId) }
      }
    } else if (r.kind === 'invoice_review' && a.open) {
      const i = invoiceRows.find((x) => x.id === a.open)
      if (i && i.status === 'draft' && i.submittedAt && live(i.projectId)) act = { kind: 'invoice', id: i.id, projectId: i.projectId, door: moneyDoor(i.projectId, i.id), title: i.stageName, by: nameOf(i.submittedBy), client: client(i.projectId) }
    } else if (r.kind === 'po_review' && a.open) {
      const o = poRows.find((x) => x.id === a.open)
      if (o && !o.deletedAt && o.status === 'draft' && o.submittedAt && live(o.projectId)) act = { kind: 'po', id: o.id, projectId: o.projectId, door: moneyDoor(o.projectId, o.id), title: o.number, by: nameOf(o.submittedBy ?? o.createdBy), client: client(o.projectId) }
    } else if (r.kind === 'expense_review' && a.open) {
      const e = expenseRows.find((x) => x.id === a.open)
      if (e && !e.deletedAt && e.status === 'pending' && (e.projectId === null || live(e.projectId))) act = { kind: 'expense', id: e.id, projectId: e.projectId, title: e.description, by: nameOf(e.createdBy), client: client(e.projectId) }
    } else if (r.kind === 'schedule_ask' && a.share) {
      const pid = pidOf(a)
      const w = shareRows.find((x) => x.projectId === pid)
      if (w && pid && live(pid)) act = { kind: 'share', id: w.id, projectId: pid, title: live(pid)!.name, by: nameOf(w.requestedBy), client: client(pid), only: Array.isArray(w.milestoneIds) ? (w.milestoneIds as unknown[]).filter((x): x is string => typeof x === 'string') : [], note: w.note }
    } else if (r.kind === 'schedule_ask' && a.open) {
      const m = milestoneRows.find((x) => x.id === a.open)
      if (m && !m.deletedAt && live(m.projectId)) {
        const more = extensionRows.find((x) => x.milestoneId === m.id)
        /* the row's own words tell its ask apart (schedule-actions' `tellRunners`): "… done — approve it?" or "… more on …" */
        const doneAsk = / done — approve it\?$/.test(r.title)
        if (doneAsk && m.doneAskedAt && m.status !== 'done') act = { kind: 'done', id: m.id, projectId: m.projectId, title: m.title, by: nameOf(m.doneAskedBy), client: client(m.projectId) }
        else if (!doneAsk && more) act = { kind: 'more_time', id: more.id, projectId: m.projectId, title: m.title, by: nameOf(more.requestedBy), client: client(m.projectId), end: dayOf(m.endDate) }
      }
    } else if (r.kind === 'handover_review') {
      const pid = pidOf(a)
      const p = live(pid)
      if (pid && p && a.path.length === 2 && p.stage === 'in_progress' && p.handoverRequestedAt) act = { kind: 'handover', id: pid, projectId: pid, title: p.name, by: nameOf(p.handoverRequestedBy), client: client(pid) }
    }
    if (act) r.act = act
  }
}

/** The rail's badge (UX audit V8): the signed-in member's unread notices — not the follow-ups due, which the bell lists apart (and the Tasks
    item already counts), so Mark all as read clears it. One count, no derivation. */
export async function unreadCount(): Promise<number> {
  const [me] = await db.select({ id: members.id }).from(members).where(eq(members.id, await sessionMemberId())).limit(1)
  if (!me) return 0
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.memberId, me.id), isNull(notifications.readAt)))
  return Number(row?.n ?? 0)
}

/** Members of a lead (its assignees), for the events addressed to "the lead's members". */
export async function leadMemberIds(leadId: string): Promise<string[]> {
  const rows = await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  return rows.map((r) => r.memberId)
}
/** (D2, verify round 1) Who hears a client's answer on shared renders (render_feedback) and gets their call back: the lead's members and
    whoever shared the link — the page names the sharer ("Dane will call you back"), so the sharer hears it too; once each. A link with no
    lead and a sharer who has left falls back to the studio's Owners and Admins. */
export async function renderFeedbackIds(link: { leadId: string | null; createdBy: string | null }): Promise<string[]> {
  const leadIds = link.leadId ? await leadMemberIds(link.leadId) : []
  const sharer = link.createdBy ? (await db.select({ id: members.id }).from(members).where(and(eq(members.id, link.createdBy), eq(members.isActive, true))))[0]?.id ?? null : null
  const to = [...new Set([...leadIds, ...(sharer ? [sharer] : [])])]
  return to.length ? to : studioRunnerIds()
}
export async function studioRunnerIds(): Promise<string[]> {
  const rows = await db.select({ id: members.id }).from(members).where(and(inArray(members.role, ['Owner', 'Admin']), eq(members.isActive, true)))   // (REG-646)
  return rows.map((r) => r.id)
}
/** (S44O — call C6) Who hears a lead come in — the members who hand leads out: Owners, Admins and Marketing (lib/settings/roles.ts `runsLeads`). */
export async function leadDeskIds(): Promise<string[]> {
  const rows = await db.select({ id: members.id }).from(members).where(and(inArray(members.role, ['Owner', 'Admin', 'Marketing']), eq(members.isActive, true)))
  return rows.map((r) => r.id)
}
/** (parity map, MI-007 · FB-114) Who runs the studio's money — Owners, Admins and Accounting: told that an invoice went out, that one is still
    unpaid after its third reminder. Approvals stay `studioRunnerIds` (Accounting approves nothing). */
export async function moneyRunnerIds(): Promise<string[]> {
  const rows = await db.select({ id: members.id }).from(members).where(and(inArray(members.role, ['Owner', 'Admin', 'Accounting']), eq(members.isActive, true)))
  return rows.map((r) => r.id)
}
/** (parity map, MI-007 · FR-040 — 1.0's verify) The studio's Accounting members: told of every client payment to confirm, beside its confirmers. */
export async function bookkeeperIds(): Promise<string[]> {
  const rows = await db.select({ id: members.id }).from(members).where(and(eq(members.role, 'Accounting'), eq(members.isActive, true)))
  return rows.map((r) => r.id)
}
