import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadTasks, leads, meetings, projects } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { DEFAULT_LENGTH_MIN } from './model'
import { queueCalendarSync } from './calendar-sync'   // (pending modules S34)

/**
 * (pending modules S23 — the Contacted step's schedule pair, REG-319) A contact log whose next step is to meet in person, on a day still
 * ahead, is a planned meeting on the lead: a first consultation at the lead's address, for the lead's members — the Move stage window's
 * Contacted log (on the move and on Add Log) and the Notes tab's contact log both say it. Once per day and time: a log saved again, or the
 * same time written twice, never plans it twice. The Contacted reminder (a Follow-up due at that very time, REG-608) becomes the meeting's
 * reminder, so it moves with the meeting and closes when it starts. Returns the meeting's id, or null when nothing was planned.
 */
export async function planInPerson(leadId: string, when: Date | null, at: Date): Promise<string | null> {
  if (!when || Number.isNaN(when.getTime()) || when.getTime() <= at.getTime()) return null
  const [lead] = await db.select({ propertyAddress: leads.propertyAddress, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead || lead.deletedAt) return null
  const [has] = await db.select({ id: meetings.id }).from(meetings).where(and(eq(meetings.leadId, leadId), eq(meetings.status, 'planned'), eq(meetings.startsAt, when), isNull(meetings.deletedAt))).limit(1)
  if (has) return null
  const people = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.memberId)
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  const me = await sessionMemberId()
  const id = randomUUID()
  await db.insert(meetings).values({ id, leadId, projectId: project?.id ?? null, aim: 'first_consultation', whereKind: 'In person', place: lead.propertyAddress ?? null, startsAt: when, endsAt: new Date(when.getTime() + DEFAULT_LENGTH_MIN * 60_000), status: 'planned', memberIds: JSON.stringify(people.length ? people : [me]), createdBy: me, createdAt: at, updatedAt: at })
  queueCalendarSync(leadId)   // (pending modules S34) the studio's own calendar — after the response; nothing on the stand-in
  await db.update(leadTasks).set({ meetingId: id }).where(and(eq(leadTasks.leadId, leadId), eq(leadTasks.kind, 'Follow-up'), eq(leadTasks.dueAt, when), isNull(leadTasks.meetingId), eq(leadTasks.done, false)))
  return id
}

/** A Follow-up raised at a planned meeting's very time (the Notes tab's reminder, made after its contact log planned the meeting) becomes that
    meeting's reminder — once: a meeting that has one keeps it. */
export async function linkReminder(leadId: string, taskId: string, dueAt: Date): Promise<void> {
  const [m] = await db.select({ id: meetings.id }).from(meetings).where(and(eq(meetings.leadId, leadId), eq(meetings.status, 'planned'), eq(meetings.startsAt, dueAt), isNull(meetings.deletedAt))).limit(1)
  if (!m) return
  const [has] = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.meetingId, m.id), eq(leadTasks.done, false))).limit(1)
  if (has) return
  await db.update(leadTasks).set({ meetingId: m.id }).where(and(eq(leadTasks.id, taskId), isNull(leadTasks.meetingId)))
}

/** The in-person next step a Contacted log asks for — the newest log that has one. */
export function inPersonNext(payload: unknown): string | null {
  const logs = (payload as { logs?: { nextStepMode?: string; nextStepWhen?: string }[] } | null)?.logs
  if (!Array.isArray(logs)) return null
  return [...logs].reverse().find((l) => l?.nextStepMode === 'In person' && l.nextStepWhen)?.nextStepWhen ?? null
}
