import 'server-only'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadNotes, leadTasks, leads, members, notifications, settings, stageLogs, taskAssignees } from '@/lib/db/schema'
import { DEFAULT_RULES, DEFAULT_TEMPLATES, parseRules, parseTemplates, type Channel, type FeedRow, type MessageTemplate, type NotificationRules } from '@/lib/notifications/model'
import { runsStudio } from '@/lib/leads/assign-policy'
import { displayDate } from '@/lib/format'

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
    const [rows, links, contacts, logs] = await Promise.all([
      db.select({ id: leads.id, name: leads.name, stage: leads.stage, createdAt: leads.createdAt }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.stage, 'New'))),
      db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
      db.select({ leadId: leadNotes.leadId }).from(leadNotes).where(eq(leadNotes.kind, 'contact')),
      db.select({ leadId: stageLogs.leadId }).from(stageLogs).where(eq(stageLogs.toStage, 'Contacted')),
    ])
    const contacted = new Set([...contacts.map((c) => c.leadId), ...logs.map((l) => l.leadId)])
    const limit = now - rules.untouchedMinutes * 60_000
    for (const l of rows) {
      if (contacted.has(l.id) || l.createdAt.getTime() > limit) continue
      if (rules.stopWhenClosed && CLOSED.has(l.stage)) continue
      const mine = links.filter((x) => x.leadId === l.id).map((x) => x.memberId)
      if (!(mine.includes(memberId) || (mine.length === 0 && runsStudio(role)))) continue
      const ago = Math.round((now - l.createdAt.getTime()) / 60_000)
      out.push({ id: `untouched-${l.id}`, kind: 'untouched', title: `${l.name} has had no contact yet`, body: ago >= 1440 ? `Arrived ${Math.floor(ago / 1440)} day${Math.floor(ago / 1440) === 1 ? '' : 's'} ago, nothing logged` : ago >= 60 ? `Arrived ${Math.floor(ago / 60)} h ago, nothing logged` : `Arrived ${ago} min ago, nothing logged`, href: `/leads/${l.id}`, at: l.createdAt.getTime() + rules.untouchedMinutes * 60_000, readAt: null, channels: channelsOf(rules, 'untouched'), derived: true })
    }
  }
  /* (REG-608, parity Q-23) Two rows from one pass over the open tasks: overdue (past due) and due soon (within 30 minutes) — the
     latter is 1.0's T−30 reminder for follow-ups and tasks alike, now that a follow-up is a task. */
  const soonOn = rules.channels.task_due_soon.in_app, dueOn = rules.channels.task_due.in_app
  if (soonOn || dueOn) {
    const [tasks, ta, leadRows] = await Promise.all([
      db.select({ id: leadTasks.id, title: leadTasks.title, kind: leadTasks.kind, leadId: leadTasks.leadId, dueAt: leadTasks.dueAt }).from(leadTasks).where(eq(leadTasks.done, false)),
      db.select({ taskId: taskAssignees.taskId, memberId: taskAssignees.memberId }).from(taskAssignees),
      db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(isNull(leads.deletedAt)),
    ])
    const leadById = new Map(leadRows.map((l) => [l.id, l]))
    for (const t of tasks) {
      if (!t.dueAt) continue
      const lead = t.leadId ? leadById.get(t.leadId) : null
      if (t.leadId && !lead) continue
      if (lead && rules.stopWhenClosed && CLOSED.has(lead.stage)) continue
      const mine = ta.filter((x) => x.taskId === t.id).map((x) => x.memberId)
      if (!(mine.includes(memberId) || (mine.length === 0 && runsStudio(role)))) continue
      const due = t.dueAt.getTime()
      const href = lead ? `/leads/${lead.id}/tasks?open=${t.id}` : `/tasks?open=${t.id}`
      const where = lead ? `On ${lead.name}` : 'A studio task'
      if (due <= now) { if (dueOn) out.push({ id: `task-${t.id}`, kind: 'task_due', title: `Overdue: ${t.title}`, body: where, href, at: due, readAt: null, channels: channelsOf(rules, 'task_due'), derived: true }) }
      else if (soonOn && due - now <= SOON_MS) { const m = Math.max(1, Math.round((due - now) / 60_000)); out.push({ id: `task-soon-${t.id}`, kind: 'task_due_soon', title: `${t.kind === 'Follow-up' ? 'Follow-up' : 'Due'} in ${m} min: ${t.title}`, body: where, href, at: due - SOON_MS, readAt: null, channels: channelsOf(rules, 'task_due_soon'), derived: true }) }
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
      if (!(mine.includes(memberId) || (mine.length === 0 && runsStudio(role)))) continue
      out.push({ id: `hold-${l.id}`, kind: 'hold_due', title: `Hold ended — revisit ${l.name}`, body: `${p.reason ? `${p.reason} · ` : ''}the follow-up was due ${displayDate(new Date(at))}`, href: `/leads/${l.id}`, at, readAt: null, channels: channelsOf(rules, 'hold_due'), derived: true })
    }
  }
  return out
}

export const channelsOf = (rules: NotificationRules, kind: keyof NotificationRules['channels']): Channel[] => (Object.entries(rules.channels[kind]) as [Channel, boolean][]).filter(([, on]) => on).map(([c]) => c)

/** The feed for one member: stored rows newest first, the derived follow-ups woven in by time. */
export async function fetchFeed(memberId: string, role: string): Promise<{ rows: FeedRow[]; unread: number }> {
  const rules = await fetchNotificationRules()
  const [stored, due] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.memberId, memberId)).orderBy(desc(notifications.createdAt)).limit(60),
    derivedDue(memberId, role, rules),
  ])
  const rows: FeedRow[] = [
    ...stored.map((n) => ({ id: n.id, kind: n.kind as FeedRow['kind'], title: n.title, body: n.body, href: n.href, at: n.createdAt.getTime(), readAt: n.readAt?.getTime() ?? null, channels: n.channels.split(',').filter(Boolean) as Channel[], derived: false })),
    ...due,
  ].sort((a, b) => b.at - a.at)
  return { rows, unread: rows.filter((r) => r.readAt === null).length }
}

/** The rail's badge: unread stored rows plus the follow-ups due, for the signed-in member. */
export async function unreadCount(): Promise<number> {
  const [me] = await db.select({ id: members.id, role: members.role }).from(members).where(eq(members.isYou, true)).limit(1)
  if (!me) return 0
  const { unread } = await fetchFeed(me.id, me.role)
  return unread
}

/** Members of a lead (its assignees), for the events addressed to "the lead's members". */
export async function leadMemberIds(leadId: string): Promise<string[]> {
  const rows = await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  return rows.map((r) => r.memberId)
}
export async function studioRunnerIds(): Promise<string[]> {
  const rows = await db.select({ id: members.id }).from(members).where(inArray(members.role, ['Owner', 'Admin']))
  return rows.map((r) => r.id)
}
