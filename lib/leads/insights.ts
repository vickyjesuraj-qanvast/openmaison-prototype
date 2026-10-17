import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: the page hands the client plain facts
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadNotes, leads, members, stageLogs } from '@/lib/db/schema'
import { parseInputDateTime } from '@/lib/format'
import type { LeadFacts } from './tat'
import { onLeads } from '@/lib/settings/roles'

/* (REG-611) Insights — the facts every turnaround derives from, per live lead. The report itself is pure (lib/leads/tat.ts). */

export type InsightsTeam = { id: string; name: string; role: string; color: string }
export type InsightsData = { facts: LeadFacts[]; team: InsightsTeam[]; now: number }

type LogRow = { toStage: string; payload: unknown; createdAt: Date }
type AssignRow = { memberId: string; assignedAt: Date | null }
type NoteRow = { contactedAt: Date | null; createdAt: Date; authorId: string | null }

/**
 * One lead's facts. The first outreach is the earliest contact anyone logged: a Contacted-stage log's first entry (its own "when",
 * as 1.0 re-stamps a backdated attempt earlier) or a Notes-tab contact log; it is attributed to the member the log names, else
 * the lead's first member. Won is the Won stage log.
 */
export function factsFrom(lead: { id: string; name: string; stage: string; createdAt: Date }, assigns: AssignRow[], logs: LogRow[], notes: NoteRow[]): LeadFacts {
  const stamped = assigns.filter((a) => a.assignedAt).sort((a, b) => a.assignedAt!.getTime() - b.assignedAt!.getTime())
  const assignedAt = stamped[0]?.assignedAt?.getTime() ?? (assigns.length ? lead.createdAt.getTime() : null)   // a row with no stamp = assigned at creation (REG-335)
  const firstMember = stamped[0]?.memberId ?? assigns[0]?.memberId ?? null
  const candidates: { at: number; by: string | null }[] = []
  for (const l of logs) {
    if (l.toStage !== 'Contacted') continue
    const p = (l.payload && typeof l.payload === 'object' ? l.payload : {}) as { logs?: { when?: string }[]; assignees?: string[] }
    const when = p.logs?.[0]?.when ? parseInputDateTime(p.logs[0].when)?.getTime() ?? null : null
    candidates.push({ at: when ?? l.createdAt.getTime(), by: p.assignees?.[0] ?? firstMember })
  }
  for (const n of notes) candidates.push({ at: (n.contactedAt ?? n.createdAt).getTime(), by: n.authorId ?? firstMember })
  candidates.sort((a, b) => a.at - b.at)
  const won = logs.filter((l) => l.toStage === 'Won').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
  return {
    id: lead.id, name: lead.name, stage: lead.stage, createdAt: lead.createdAt.getTime(),
    assignedAt, assigneeIds: assigns.map((a) => a.memberId),
    outreachAt: candidates[0]?.at ?? null, outreachBy: candidates[0]?.by ?? null,
    wonAt: won?.createdAt.getTime() ?? null,
  }
}

export async function fetchInsights(): Promise<InsightsData> {
  const rows = await db.select({ id: leads.id, name: leads.name, stage: leads.stage, createdAt: leads.createdAt }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))).orderBy(asc(leads.createdAt))   // (REG-911) a direct project never was a lead
  const ids = rows.map((l) => l.id)
  const [assigns, logs, notes, team] = await Promise.all([
    ids.length ? db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId, assignedAt: leadAssignees.assignedAt }).from(leadAssignees).where(inArray(leadAssignees.leadId, ids)) : Promise.resolve([]),
    ids.length ? db.select({ leadId: stageLogs.leadId, toStage: stageLogs.toStage, payload: stageLogs.payload, createdAt: stageLogs.createdAt }).from(stageLogs).where(and(inArray(stageLogs.leadId, ids), inArray(stageLogs.toStage, ['Contacted', 'Won']))) : Promise.resolve([]),
    ids.length ? db.select({ leadId: leadNotes.leadId, contactedAt: leadNotes.contactedAt, createdAt: leadNotes.createdAt, authorId: leadNotes.authorId }).from(leadNotes).where(and(inArray(leadNotes.leadId, ids), eq(leadNotes.kind, 'contact'))) : Promise.resolve([]),
    db.select({ id: members.id, name: members.name, role: members.role, color: members.color }).from(members),
  ])
  const facts = rows.map((l) => factsFrom(l, assigns.filter((a) => a.leadId === l.id), logs.filter((g) => g.leadId === l.id), notes.filter((n) => n.leadId === l.id)))
  return { facts, team: team.filter((m) => onLeads(m.role)), now: Date.now() }   // (parity map, FB-114) Accounting is on no lead — no row By team member
}
