import 'server-only'   // libSQL never reaches the browser
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { copilotObjectionLog, leads, meetings, members, projects, stageLogs } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { askAbout } from './brief'
import { idsOf, parseBrief, parseState } from './model'
import { metEntries } from './queries'
import { outcomeOf, type MeetingFact, type ObjectionFact, type ReportPerson } from './report-model'

/**
 * (pending modules S23 — card studio:meetings-copilot: "for Owners and Admins Analytics with coaching and an Objections report") Company ›
 * Reports › Meetings' facts: every held meeting on a live lead, its outcome derived from the lead's records (lib/meetings/report-model.ts
 * `outcomeOf`), and every objection logged in them. Owners and Admins only (1.0's Analytics was the Owner's, its Objections report the Owners'
 * and Admins' — 2.0 gives both to whoever runs the studio); anyone else gets null and the tab's gate. Owners and Admins see every lead, so no
 * Who-sees-leads narrowing applies. The report itself is pure and derives per range in the browser.
 * (S42 audit C-02, call C·1 as recommended — her "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for her review) "A meeting
 * held IS the Met log" (S23's own rule): every Met log no meeting holds counts as a meeting held too — on its day (the log's when, else when it
 * was written), for whoever logged it — the very rows the meetings lists show (`meetingRows`), so "held" is one number on both pages. A log has
 * no brief: no score, no checklist, no co-pilot; the tiles say how many of the meetings held carry those.
 */
export type MeetingReportsData = { facts: MeetingFact[]; objections: ObjectionFact[]; team: ReportPerson[]; now: number }

export async function fetchMeetingReports(): Promise<MeetingReportsData | null> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return null
  const rows = await db.select({
    id: meetings.id, leadId: meetings.leadId, startsAt: meetings.startsAt, startedAt: meetings.startedAt, endedAt: meetings.endedAt,
    startedBy: meetings.startedBy, createdBy: meetings.createdBy, memberIds: meetings.memberIds, source: meetings.source,
    briefJson: meetings.briefJson, stateJson: meetings.stateJson, leadName: leads.name, stage: leads.stage,
  }).from(meetings).innerJoin(leads, eq(leads.id, meetings.leadId))
    .where(and(eq(meetings.status, 'held'), isNull(meetings.deletedAt), isNull(leads.deletedAt)))
  /* (S42 C-02) the Met logs no meeting holds — the lists' rule (lib/meetings/queries.ts `meetingRows`), on live leads */
  const [entries, kept] = await Promise.all([metEntries(null), db.select({ id: meetings.id }).from(meetings).where(isNull(meetings.deletedAt))])
  const keptIds = new Set(kept.map((k) => k.id))
  const loose = entries.filter((e) => !(e.meetingId && keptIds.has(e.meetingId)))
  const logLeads = loose.length ? await db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(and(inArray(leads.id, [...new Set(loose.map((e) => e.leadId))]), isNull(leads.deletedAt))) : []
  const logLead = new Map(logLeads.map((l) => [l.id, l]))
  const logs = loose.filter((e) => logLead.has(e.leadId))
  const leadIds = [...new Set([...rows.map((r) => r.leadId), ...logs.map((e) => e.leadId)])]
  const meetingIds = rows.map((r) => r.id)
  const [wins, projectRows, logged, people] = await Promise.all([
    leadIds.length ? db.select({ leadId: stageLogs.leadId, createdAt: stageLogs.createdAt }).from(stageLogs).where(and(inArray(stageLogs.leadId, leadIds), eq(stageLogs.toStage, 'Won'))) : Promise.resolve([]),
    leadIds.length ? db.select({ leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt))) : Promise.resolve([]),
    meetingIds.length ? db.select().from(copilotObjectionLog).where(inArray(copilotObjectionLog.meetingId, meetingIds)) : Promise.resolve([]),
    db.select({ id: members.id, name: members.name, role: members.role, color: members.color }).from(members),
  ])
  const wonAt = new Map<string, number[]>()
  for (const w of wins) { const a = wonAt.get(w.leadId); if (a) a.push(w.createdAt.getTime()); else wonAt.set(w.leadId, [w.createdAt.getTime()]) }
  const withProject = new Set(projectRows.map((p) => p.leadId))
  /* the must-ask items as something to find out — "Budget range discussed" → "the budget range" (the brief's own next-step words) */
  const asked = new Map<string, string>()
  const ask = (label: string) => { let a = asked.get(label); if (!a) { a = askAbout(label); asked.set(label, a) } return a }

  const facts: MeetingFact[] = rows.map((r) => {
    const at = (r.startedAt ?? r.startsAt).getTime()
    const live = r.source === 'live'
    const brief = parseBrief(r.briefJson)
    const state = parseState(r.stateJson)
    const shown = new Set([...Object.keys(state.seen), ...state.acted])
    const checklist = brief && brief.checklist && Number.isFinite(brief.checklist.total) && brief.checklist.total > 0 ? { done: Math.max(0, Math.min(brief.checklist.total, brief.checklist.done)), total: brief.checklist.total } : null
    return {
      id: r.id, leadId: r.leadId, leadName: r.leadName, at,
      memberId: r.startedBy ?? r.createdBy ?? idsOf(r.memberIds)[0] ?? null,
      live,
      lengthMs: live && r.startedAt && r.endedAt && r.endedAt.getTime() > r.startedAt.getTime() ? r.endedAt.getTime() - r.startedAt.getTime() : null,
      /* a written-up meeting's score is the same rule over the same words — the meetings list shows it, so Reports counts it */
      score: brief && typeof brief.score === 'number' && Number.isFinite(brief.score) && brief.score > 0 ? brief.score : null,
      checklist,
      missed: checklist && Array.isArray(brief?.checklist.missed) ? brief!.checklist.missed.filter((x): x is string => typeof x === 'string' && !!x.trim()).map(ask) : [],
      tipsSeen: shown.size, tipsActed: new Set(state.acted).size,
      outcome: outcomeOf({ stage: r.stage, hasProject: withProject.has(r.leadId), wonAt: wonAt.get(r.leadId) ?? [] }, at),
    }
  })
  const known = new Set(people.map((p) => p.id))
  for (const e of logs) {
    const l = logLead.get(e.leadId)!
    const at = e.when ?? e.loggedAt
    facts.push({
      id: `met:${e.logId}:${e.index}`, leadId: e.leadId, leadName: l.name, at,
      memberId: e.loggedBy && known.has(e.loggedBy) ? e.loggedBy : null,
      live: false, lengthMs: null, score: null, checklist: null, missed: [], tipsSeen: 0, tipsActed: 0,
      outcome: outcomeOf({ stage: l.stage, hasProject: withProject.has(e.leadId), wonAt: wonAt.get(e.leadId) ?? [] }, at),
    })
  }
  const byMeeting = new Map(facts.map((f) => [f.id, f]))
  const objections: ObjectionFact[] = logged.flatMap((o) => {
    const m = byMeeting.get(o.meetingId)
    if (!m) return []
    return [{
      id: o.id, meetingId: o.meetingId, leadId: m.leadId, leadName: m.leadName, at: m.at, memberId: o.memberId ?? m.memberId,
      kind: o.objectionType, said: o.objectionDescription, competitor: o.competitorName?.trim() || null, answer: o.recommendedResponse?.trim() || null, outcome: m.outcome,
    }]
  })
  return { facts, objections, team: people, now: Date.now() }
}
