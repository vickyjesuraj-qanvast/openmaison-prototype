import 'server-only'   // libSQL never reaches the browser
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  leadAssignees, leadFiles, leadTasks, leads, meetings, members, projectRooms, projects, quoteComparisons, quotes, renderJobs, settings, stageLogs, studioChecklistItems,
  studioCompetitorList, studioObjectionResponses, subscriptions, visualizerDesigns, type Meeting, type Member,
} from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { fetchViewer, visibleLeadIds, canOpenLead } from '@/lib/leads/visibility'
import { isAccounting } from '@/lib/settings/roles'
import { runsStudio } from '@/lib/leads/assign-policy'
import { fetchBrand } from '@/lib/templates/queries'
import { isWizardPayload, type MeetingLog } from '@/lib/leads/stage-data'
import { STAGES } from '@/lib/leads/enums'
import { formatInputDateTime, parseInputDateTime } from '@/lib/format'
import { heldMeetingStep } from '@/lib/leads/stage-policy'   // (S42G)
import { fetchStageMovement } from '@/lib/settings/queries'
import type { MeetingStep } from './next-step'
import { answersFrom, type ObjectionAnswer } from './objections'
import { parseWords, type OwnItem } from './checklists'
import { readMeeting, type Reading } from './engine'
import { prepOf, type Prep } from './prep'
import type { PortfolioProject } from './portfolio'
import { workOf, workPictureHref } from '@/lib/portfolio/queries'   // (pending modules S27)
import {
  COPILOT_SETTINGS_KEY, DEFAULT_COPILOT, DEFAULT_LENGTH_MIN, FREE_BLOCKS, aimLabel, idsOf, parseBrief, parseCopilotSettings, parseShare, parseState, standingOf, type CopilotSettings,
  type MeetingBrief, type MeetingState, type MeetingStatus, type ShareOptions,
} from './model'

/*
 * (pending modules S23) What the meeting pages read. One home: a meeting is its lead's (or its project's — the project carries the lead's Meetings
 * on, as Tasks); the studio's Meetings page is the tab unpinned (REG-466's pattern), never a copy. Who sees a meeting = who sees its lead (Who
 * sees leads, lib/leads/visibility.ts — 1.0 let a designer see only the sessions they ran; 2.0's one rule is the lead's).
 */

export async function fetchCopilotSettings(): Promise<CopilotSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, COPILOT_SETTINGS_KEY)).limit(1)
  if (!row) return DEFAULT_COPILOT
  try { return parseCopilotSettings(JSON.parse(row.value)) } catch { return DEFAULT_COPILOT }
}

export type Competitor = { id: string; name: string; notes: string | null }
export type Playbook = { answers: ObjectionAnswer[]; competitors: Competitor[]; own: (OwnItem & { sortOrder: number })[] }
/** The studio's objection answers (its defaults with its edits, then its own), its competitors and its own checklist items. */
export async function fetchPlaybook(): Promise<Playbook> {
  const [rows, rivals, items] = await Promise.all([
    db.select().from(studioObjectionResponses),
    db.select().from(studioCompetitorList).where(isNull(studioCompetitorList.deletedAt)).orderBy(asc(studioCompetitorList.competitorName)),
    db.select().from(studioChecklistItems).where(isNull(studioChecklistItems.deletedAt)).orderBy(asc(studioChecklistItems.sortOrder), asc(studioChecklistItems.createdAt)),
  ])
  return {
    answers: answersFrom(rows),
    competitors: rivals.map((r) => ({ id: r.id, name: r.competitorName, notes: r.notes })),
    own: items.map((i) => ({ id: i.id, label: i.label, category: i.category, aims: idsOf(i.objectiveTypes), words: idsOf(i.detectionKeywords).length ? idsOf(i.detectionKeywords) : parseWords(i.label), sortOrder: i.sortOrder })),
  }
}

/** Whether the lead's journey has reached Met (a held meeting then joins the Met step's log list). */
export const reachedMet = (stage: string, resumeStage?: string | null) => {
  const s = (STAGES as readonly string[]).includes(stage) ? stage : resumeStage ?? 'New'
  return STAGES.indexOf(s as (typeof STAGES)[number]) >= STAGES.indexOf('Met')
}

/**
 * (S42G) Where a meeting held before Met offers to take its lead — the studio's own stage rule (`heldMeetingStep`, lib/leads/stage-policy.ts):
 * Met where the rule lets the lead go there now (a lead on hold resumes there), Contacted for a lead still in New under one stage at a time —
 * the meeting its first contact; null where the rule would refuse. The meeting page, End and every write-up ask this, never "Met" on its own.
 */
export async function meetingStepFor(leadId: string): Promise<MeetingStep | null> {
  const [[lead], links, logs, [project], mode] = await Promise.all([
    db.select({ stage: leads.stage }).from(leads).where(eq(leads.id, leadId)).limit(1),
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId)),
    db.select({ fromStage: stageLogs.fromStage, toStage: stageLogs.toStage }).from(stageLogs).where(eq(stageLogs.leadId, leadId)).orderBy(asc(stageLogs.createdAt)),
    db.select({ id: projects.id, number: projects.number }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1),
    fetchStageMovement(),
  ])
  if (!lead) return null
  const active = (STAGES as readonly string[]).includes(lead.stage)
  /* a parked lead resumes from the stage it left (lib/leads/queries.ts `resumeStageOf`) */
  const left = active ? null : logs.filter((g) => g.toStage === lead.stage).at(-1)?.fromStage ?? null
  const resumeStage = left && (STAGES as readonly string[]).includes(left) ? left : null
  /* the policy reads only the stage, where a parked lead left, how many members and the project */
  const step = heldMeetingStep({ stage: lead.stage, resumeStage, assignees: links, project: project ?? null } as unknown as Parameters<typeof heldMeetingStep>[0], mode)
  return step ? { step, resume: !active } : null
}

/**
 * (S42G — S23's rule "a meeting held IS the Met log", kept wherever Met is reached) A held meeting as the Met step's log — where, when, its brief's
 * summary as the remarks, its documents and its id: `meetingId` names it, else the lead's latest held meeting that no Met log holds yet. The Move
 * stage window takes it as it enters Met by any door (the stage pill, the header, the listing, Maison AI), as the meeting's own offer does.
 */
export async function heldMeetingLog(leadId: string, meetingId?: string | null): Promise<MeetingLog | null> {
  const rows = await db.select().from(meetings).where(and(eq(meetings.leadId, leadId), eq(meetings.status, 'held'), isNull(meetings.deletedAt), ...(meetingId ? [eq(meetings.id, meetingId)] : []))).orderBy(desc(meetings.startsAt))
  if (!rows.length) return null
  const held = meetingId ? new Set<string>() : new Set((await metEntries([leadId])).map((e) => e.meetingId).filter((x): x is string => !!x))
  const m = rows.find((r) => !held.has(r.id))
  if (!m) return null
  const ids = idsOf(m.fileIds)
  const files = ids.length ? await db.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles).where(and(inArray(leadFiles.id, ids), isNull(leadFiles.deletedAt))) : []
  return { where: m.whereKind, when: formatInputDateTime(m.startsAt), files: files.map((f) => f.name), fileIds: files.map((f) => f.id), notes: parseBrief(m.briefJson)?.summary ?? '', meetingId: m.id }
}

/* ── the Met step's own logs — read from the latest Met row the wizard wrote (lib/leads/notes.ts reads them the same way) ── */
export type MetEntry = { leadId: string; logId: string; index: number; where: string; when: number | null; notes: string; fileIds: string[]; meetingId: string | null
  /** (S42 audit C-02) when the Met row was written and who wrote it (`stage_logs.moved_by`) — Reports › Meetings counts the log as a meeting held */
  loggedAt: number; loggedBy: string | null }
export async function metEntries(leadIds: string[] | null): Promise<MetEntry[]> {
  const rows = await db.select().from(stageLogs).where(leadIds ? and(eq(stageLogs.toStage, 'Met'), inArray(stageLogs.leadId, leadIds.length ? leadIds : ['-'])) : eq(stageLogs.toStage, 'Met')).orderBy(desc(stageLogs.createdAt))
  const seen = new Set<string>()
  const out: MetEntry[] = []
  for (const r of rows) {
    if (seen.has(r.leadId)) continue
    if (!isWizardPayload(r.payload) || !Array.isArray((r.payload as { meetings?: unknown }).meetings)) continue
    seen.add(r.leadId)
    type M = { where?: string; when?: string; notes?: string; fileIds?: string[]; meetingId?: string }
    ;((r.payload as { meetings: M[] }).meetings).forEach((m, index) => {
      if (!m.where && !m.when) return
      out.push({ leadId: r.leadId, logId: r.id, index, where: m.where ?? 'In person', when: m.when ? parseInputDateTime(m.when)?.getTime() ?? null : null, notes: m.notes ?? '', fileIds: Array.isArray(m.fileIds) ? m.fileIds : [], meetingId: m.meetingId ?? null,
        loggedAt: r.createdAt.getTime(), loggedBy: r.movedBy ?? null })
    })
  }
  return out
}

/** One row of a meetings list — a meeting, or a Met log no meeting holds yet (`fromLog`). */
export type MeetingRow = {
  id: string
  fromLog: boolean
  leadId: string
  leadName: string
  projectId: string | null
  aim: string
  title: string
  whereKind: string
  place: string | null
  startsAt: number
  endsAt: number | null
  status: MeetingStatus
  memberIds: string[]
  briefAt: number | null
  briefSavedAt: number | null
  score: number | null
  source: string | null
  notes: boolean
  sharedAt: number | null
  clientAnswer: string | null
  createdBy: string | null
  /** the Met log behind the row (a log row, or a meeting the log holds) */
  log: { logId: string; index: number } | null
  /** (S42 audit C-19) its invitation went — the meeting page's ghost keeps the Invitation card then */
  invited?: boolean
}
const metTitle = 'Meeting'
export function rowOf(m: Meeting, leadName: string, entry?: MetEntry | null): MeetingRow {
  const brief = parseBrief(m.briefJson)
  return {
    id: m.id, fromLog: false, leadId: m.leadId, leadName, projectId: m.projectId, aim: m.aim, title: aimLabel(m.aim),
    /* a meeting the Met log holds reads its where and when from the log — the log is the record of them */
    whereKind: entry?.where ?? m.whereKind, place: m.place, startsAt: entry?.when ?? m.startsAt.getTime(), endsAt: m.endsAt?.getTime() ?? null,
    status: m.status as MeetingStatus, memberIds: idsOf(m.memberIds), briefAt: m.briefAt?.getTime() ?? null, briefSavedAt: m.briefSavedAt?.getTime() ?? null,
    score: brief?.score ?? null, source: m.source, notes: !!m.notes.trim(), sharedAt: m.shareStoppedAt ? null : m.sharedAt?.getTime() ?? null, clientAnswer: m.clientAnswer, createdBy: m.createdBy,
    log: entry ? { logId: entry.logId, index: entry.index } : null, invited: !!m.invitedAt,
  }
}
/** The rows for these leads (null = every lead): each meeting once, and each Met log no meeting holds — newest first. */
export async function meetingRows(leadIds: string[] | null): Promise<MeetingRow[]> {
  const scope = leadIds ? (leadIds.length ? leadIds : ['-']) : null
  const [rows, entries, names] = await Promise.all([
    db.select().from(meetings).where(scope ? and(isNull(meetings.deletedAt), inArray(meetings.leadId, scope)) : isNull(meetings.deletedAt)),
    metEntries(scope),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(scope ? inArray(leads.id, scope) : isNull(leads.deletedAt)),
  ])
  const nameOf = new Map(names.map((n) => [n.id, n.name]))
  const held = new Map(rows.map((m) => [m.id, m]))
  const byMeeting = new Map(entries.filter((e) => e.meetingId && held.has(e.meetingId)).map((e) => [e.meetingId!, e]))
  const out: MeetingRow[] = rows.map((m) => rowOf(m, nameOf.get(m.leadId) ?? '', byMeeting.get(m.id)))
  for (const e of entries) {
    if (e.meetingId && held.has(e.meetingId)) continue
    out.push({
      id: `met:${e.logId}:${e.index}`, fromLog: true, leadId: e.leadId, leadName: nameOf.get(e.leadId) ?? '', projectId: null, aim: 'other', title: metTitle,
      whereKind: e.where, place: null, startsAt: e.when ?? 0, endsAt: null, status: 'held', memberIds: [], briefAt: null, briefSavedAt: null, score: null,
      source: null, notes: !!e.notes.trim(), sharedAt: null, clientAnswer: null, createdBy: null, log: { logId: e.logId, index: e.index },
    })
  }
  return out.sort((a, b) => b.startsAt - a.startsAt)
}

/** The studio's active members — the house member picker (AssigneeField) takes the row as it is. */
export type TeamMember = Member
const teamOf = async (): Promise<TeamMember[]> => (await db.select().from(members).then(withYou)).filter((m) => m.isActive !== false)

/** May this member change meetings on this lead (start one, write one up, save its brief)? Accounting reads the books only. */
export async function mayChangeLead(viewer: Awaited<ReturnType<typeof fetchViewer>>, leadId: string): Promise<boolean> {
  return !isAccounting(viewer.role) && await canOpenLead(viewer, leadId)
}
/** Delete: whoever made the meeting, an Owner or an Admin (contracts' rule, REG-634). */
export const mayDeleteMeeting = (viewer: { id: string; role: string }, createdBy: string | null) => runsStudio(viewer.role) || (!!createdBy && createdBy === viewer.id)

export type LeadMeetingsData = {
  lead: { id: string; name: string; phone: string; email: string | null; stage: string; propertyType: string; propertyAddress: string | null; reachedMet: boolean }
  project: { id: string; number: string } | null
  meetings: MeetingRow[]
  team: TeamMember[]
  viewer: { id: string; role: string }
  mayChange: boolean
  studioName: string
  now: number
}
/** The lead's Meetings tab (and its project's Client › Meetings). Safe on an id that is not a lead: an empty set. */
export async function fetchLeadMeetings(leadId: string): Promise<LeadMeetingsData> {
  const [[lead], [project], rows, team, viewer, brand] = await Promise.all([
    db.select().from(leads).where(eq(leads.id, leadId)).limit(1),
    db.select({ id: projects.id, number: projects.number }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1),
    meetingRows([leadId]),
    teamOf(),
    fetchViewer(),
    fetchBrand(),
  ])
  const stageRows = lead ? await db.select({ id: stageLogs.id }).from(stageLogs).where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Met'))).limit(1) : []
  return {
    lead: { id: leadId, name: lead?.name ?? '', phone: lead?.phone ?? '', email: lead?.email ?? null, stage: lead?.stage ?? '', propertyType: lead?.propertyType ?? '', propertyAddress: lead?.propertyAddress ?? null, reachedMet: !!lead && (stageRows.length > 0 || reachedMet(lead.stage)) },
    project: project ?? null, meetings: rows, team, viewer: { id: viewer.id, role: viewer.role },
    mayChange: lead ? await mayChangeLead(viewer, leadId) : false, studioName: brand.details.name, now: Date.now(),
  }
}

export type StudioMeetingsData = {
  meetings: MeetingRow[]
  /** the leads a meeting can be started for — Start a meeting's picker (live leads the viewer sees, the direct projects' clients after) */
  leads: { id: string; name: string; stage: string; project: string | null; phone: string; email: string | null; propertyType: string; propertyAddress: string | null }[]
  team: TeamMember[]
  viewer: { id: string; role: string }
  mayChange: boolean
  studioName: string
  now: number
}
/** Tools › Meeting Copilot — every meeting the viewer may see. */
export async function fetchStudioMeetings(): Promise<StudioMeetingsData> {
  const viewer = await fetchViewer()
  const seen = await visibleLeadIds(viewer)
  const [all, team, projectRows, brand] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, stage: leads.stage, direct: leads.direct, phone: leads.phone, email: leads.email, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    teamOf(),
    db.select({ leadId: projects.leadId, number: projects.number }).from(projects).where(isNull(projects.deletedAt)),
    fetchBrand(),
  ])
  const ids = all.filter((l) => !seen || seen.has(l.id)).map((l) => l.id)
  const projectOf = new Map(projectRows.map((p) => [p.leadId, p.number]))
  const rows = await meetingRows(ids)
  const pick = all.filter((l) => (!seen || seen.has(l.id)) && l.stage !== 'Lost').map((l) => ({ id: l.id, name: l.name, stage: l.direct ? 'Project' : l.stage, project: projectOf.get(l.id) ?? null, phone: l.phone, email: l.email, propertyType: l.propertyType, propertyAddress: l.propertyAddress }))
  return { meetings: rows, leads: [...pick.filter((l) => l.stage !== 'Project'), ...pick.filter((l) => l.stage === 'Project')], team, viewer: { id: viewer.id, role: viewer.role }, mayChange: !isAccounting(viewer.role), studioName: brand.details.name, now: Date.now() }
}

/* ── the meeting itself ── */
export type MeetingFull = {
  id: string; leadId: string; projectId: string | null; aim: string; aimNote: string | null; whereKind: string; place: string | null
  startsAt: number; endsAt: number | null; status: MeetingStatus; memberIds: string[]
  consentAt: number | null; consentBy: string | null; consentKind: string | null
  startedAt: number | null; endedAt: number | null; blocks: number; freeBlocks: number; pausedAt: number | null
  source: string | null; notes: string; fileIds: string[]; recordingFileId: string | null
  state: MeetingState; brief: MeetingBrief | null; briefAt: number | null; briefSavedAt: number | null; quoteId: string | null
  clientToken: string | null; invitedAt: number | null; invitedVia: string | null; clientAnswer: string | null; clientAnswerAt: number | null; clientAnswerNote: string | null; clientViewedAt: number | null
  sharedAt: number | null; shareStoppedAt: number | null; share: ShareOptions
  createdBy: string | null; createdAt: number
}
const ms = (d: Date | null | undefined) => (d ? d.getTime() : null)
export function fullOf(m: Meeting, entry?: MetEntry | null): MeetingFull {
  return {
    id: m.id, leadId: m.leadId, projectId: m.projectId, aim: m.aim, aimNote: m.aimNote, whereKind: entry?.where ?? m.whereKind, place: m.place,
    startsAt: entry?.when ?? m.startsAt.getTime(), endsAt: ms(m.endsAt), status: m.status as MeetingStatus, memberIds: idsOf(m.memberIds),
    consentAt: ms(m.consentAt), consentBy: m.consentBy, consentKind: m.consentKind, startedAt: ms(m.startedAt), endedAt: ms(m.endedAt), blocks: m.blocks, freeBlocks: m.freeBlocks,
    pausedAt: ms(m.pausedAt), source: m.source, notes: m.notes, fileIds: [...new Set([...idsOf(m.fileIds), ...(entry?.fileIds ?? [])])], recordingFileId: m.recordingFileId,
    state: parseState(m.stateJson), brief: parseBrief(m.briefJson), briefAt: ms(m.briefAt), briefSavedAt: ms(m.briefSavedAt), quoteId: m.quoteId,
    clientToken: m.clientToken, invitedAt: ms(m.invitedAt), invitedVia: m.invitedVia, clientAnswer: m.clientAnswer, clientAnswerAt: ms(m.clientAnswerAt), clientAnswerNote: m.clientAnswerNote,
    clientViewedAt: ms(m.clientViewedAt), sharedAt: ms(m.sharedAt), shareStoppedAt: ms(m.shareStoppedAt), share: parseShare(m.shareJson), createdBy: m.createdBy, createdAt: m.createdAt.getTime(),
  }
}
export async function entryOf(m: { id: string; leadId: string }): Promise<MetEntry | null> {
  return (await metEntries([m.leadId])).find((e) => e.meetingId === m.id) ?? null
}

/** The reading the server makes the brief from — the very reading the meeting page drew. */
export async function serverReading(m: MeetingFull, o: { leadName: string; team?: TeamMember[]; playbook?: Playbook; copilot?: CopilotSettings }): Promise<Reading> {
  const [team, playbook, copilot] = await Promise.all([o.team ?? teamOf(), o.playbook ?? fetchPlaybook(), o.copilot ?? fetchCopilotSettings()])
  return readMeeting({
    notes: m.notes, aim: m.aim, client: o.leadName, members: team.map((t) => t.name), own: playbook.own, state: m.state, answers: playbook.answers,
    competitors: playbook.competitors.map((c) => c.name), weights: copilot.weights, features: copilot.features,
  })
}

export type PortfolioCard = PortfolioProject
export type RoomFile = { id: string; name: string; kind: string; thumb: string | null }
export type MeetingRoomData = {
  meeting: MeetingFull
  lead: { id: string; name: string; phone: string; email: string | null; stage: string; propertyType: string; propertyAddress: string | null; areaSqft: number | null; budgetMinor: number; style: string | null; keyCollection: string | null; reachedMet: boolean; direct: boolean
    /** (S42G) where a meeting held before Met offers to take the lead, by the studio's stage rule (`meetingStepFor`); null once it has reached Met,
        is on its project, or where the rule would refuse */
    next: MeetingStep | null }
  project: { id: string; number: string; name: string } | null
  team: TeamMember[]
  prep: Prep
  playbook: Playbook
  copilot: CopilotSettings
  files: RoomFile[]
  /** the lead's designs worked on in the AI Visualizer while the meeting ran — its pictures */
  designs: { id: string; name: string; at: number; renders: number }[]
  /** X-Ray readings made for the lead while the meeting ran */
  readings: { id: string; title: string; at: number }[]
  portfolio: PortfolioCard[]
  credits: { free: boolean; freeLeft: number }
  /** an open follow-up on the lead that isn't this meeting's — Save to the lead says so rather than add a second (1.0's rule) */
  followUp: { title: string; dueAt: number | null } | null
  /** the lead's members — the meeting's people by default */
  leadMembers: string[]
  viewer: { id: string; role: string; name: string }
  mayChange: boolean
  mayDelete: boolean
  studioName: string
  linkedToLog: boolean
  quoteNumber: string | null
  now: number
}
export async function fetchMeetingRoom(id: string): Promise<MeetingRoomData | null> {
  const [m] = await db.select().from(meetings).where(and(eq(meetings.id, id), isNull(meetings.deletedAt))).limit(1)
  if (!m) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, m.leadId))) return null
  const [[lead], [project], team, playbook, copilot, brand, entry, earlier, sub, freeUsed] = await Promise.all([
    db.select().from(leads).where(eq(leads.id, m.leadId)).limit(1),
    db.select({ id: projects.id, number: projects.number, name: projects.name }).from(projects).where(and(eq(projects.leadId, m.leadId), isNull(projects.deletedAt))).limit(1),
    teamOf(), fetchPlaybook(), fetchCopilotSettings(), fetchBrand(), entryOf(m),
    db.select().from(meetings).where(and(eq(meetings.leadId, m.leadId), isNull(meetings.deletedAt), ne(meetings.id, m.id), eq(meetings.status, 'held'))).orderBy(desc(meetings.startsAt)),
    db.select({ planId: subscriptions.planId }).from(subscriptions).where(isNull(subscriptions.cancelledAt)).orderBy(desc(subscriptions.createdAt)).limit(1),
    db.select({ n: meetings.freeBlocks }).from(meetings),
  ])
  if (!lead) return null
  const full = fullOf(m, entry)
  const lastBriefed = earlier.find((e) => e.briefJson && e.startsAt.getTime() < full.startsAt)
  const lastBrief = lastBriefed ? parseBrief(lastBriefed.briefJson) : null
  /* the meeting's own time: from its start to its end — a meeting on now runs to now; one written up after, to its planned end */
  const winFrom = full.startedAt ?? full.startsAt, winTo = full.endedAt ?? (full.status === 'live' ? Date.now() : full.endsAt ?? full.startsAt + DEFAULT_LENGTH_MIN * 60_000)
  const [fileRows, designRows, readingRows, others, quoteRow, metRow] = await Promise.all([
    full.fileIds.length || full.recordingFileId ? db.select({ id: leadFiles.id, name: leadFiles.name, kind: leadFiles.kind, thumb: leadFiles.thumb }).from(leadFiles).where(and(inArray(leadFiles.id, [...full.fileIds, ...(full.recordingFileId ? [full.recordingFileId] : [])]), isNull(leadFiles.deletedAt))) : Promise.resolve([]),
    db.select({ jobId: renderJobs.id, createdAt: renderJobs.createdAt, designId: projectRooms.designId, name: visualizerDesigns.name }).from(renderJobs).innerJoin(projectRooms, eq(projectRooms.id, renderJobs.roomId)).innerJoin(visualizerDesigns, eq(visualizerDesigns.id, projectRooms.designId)).where(and(eq(renderJobs.leadId, m.leadId), gte(renderJobs.createdAt, new Date(winFrom - 60_000)), lte(renderJobs.createdAt, new Date(winTo + 60_000)))),
    db.select({ id: quoteComparisons.id, other: quoteComparisons.otherStudio, createdAt: quoteComparisons.createdAt }).from(quoteComparisons).where(and(eq(quoteComparisons.leadId, m.leadId), gte(quoteComparisons.createdAt, new Date(winFrom)), lte(quoteComparisons.createdAt, new Date(winTo + 60_000)))),
    db.select({ id: projects.id, number: projects.number, name: projects.name, stage: projects.stage, leadId: projects.leadId, propertyType: leads.propertyType, style: leads.style, budgetMinor: leads.budgetMinor }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), ne(projects.leadId, m.leadId))),
    full.quoteId ? db.select({ number: quotes.number }).from(quotes).where(eq(quotes.id, full.quoteId)).limit(1) : Promise.resolve([]),
    db.select({ id: stageLogs.id }).from(stageLogs).where(and(eq(stageLogs.leadId, m.leadId), eq(stageLogs.toStage, 'Met'))).limit(1),
  ])
  /* the designs rendered for the lead while it ran — each once, with how many renders */
  const designs = [...new Map(designRows.map((d) => [d.designId, { id: d.designId, name: d.name, at: d.createdAt.getTime(), renders: designRows.filter((x) => x.designId === d.designId).length }])).values()]
  /* the portfolio's pictures: each project's first image in its lead's Files */
  const pics = others.length ? await db.select({ leadId: leadFiles.leadId, thumb: leadFiles.thumb, createdAt: leadFiles.createdAt }).from(leadFiles).where(and(inArray(leadFiles.leadId, others.map((o) => o.leadId)), eq(leadFiles.kind, 'image'), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)) : []
  /* (pending modules S27 — the steps' note for S23: the meeting page's portfolio tool) the team's own work joins the studio's projects: a
     project a member shows on their public card takes that work's cover picture; a piece of work tied to no project is a candidate of its own,
     its kind of home and style matched as a project's are */
  const team0 = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.isActive, true))
  const work = await workOf(team0.map((t) => t.id), workPictureHref)
  const shown = [...work.entries()].flatMap(([memberId, list]) => list.map((w) => ({ memberId, w })))
  const portfolio: PortfolioCard[] = [
    ...others.map((o) => {
      const own = shown.find((x) => x.w.projectId === o.id && x.w.pictures[0])
      return { id: o.id, number: o.number, name: o.name, propertyType: o.propertyType, style: o.style, budgetMinor: o.budgetMinor, stage: o.stage, picture: own?.w.pictures[0]?.src ?? pics.find((p) => p.leadId === o.leadId && p.thumb)?.thumb ?? null, href: `/projects/${o.id}` }
    }),
    ...shown.filter((x) => !x.w.projectId).map(({ memberId, w }) => ({ id: `work:${w.id}`, number: team0.find((t) => t.id === memberId)?.name ?? 'Work', name: w.title, propertyType: w.propertyType, style: w.style, budgetMinor: 0, stage: '', picture: w.pictures[0]?.src ?? null, href: `/company/members/${memberId}/profile` })),
  ]
  const [fu, leadPeople] = await Promise.all([
    db.select({ title: leadTasks.title, dueAt: leadTasks.dueAt, meetingId: leadTasks.meetingId }).from(leadTasks).where(and(eq(leadTasks.leadId, m.leadId), eq(leadTasks.kind, 'Follow-up'), eq(leadTasks.done, false))).orderBy(asc(leadTasks.dueAt)),
    leadMemberIds(m.leadId),
  ])
  const otherFollowUp = fu.find((t) => t.meetingId !== m.id) ?? null
  const reached = metRow.length > 0 || reachedMet(lead.stage)
  const next = !reached && !project ? await meetingStepFor(m.leadId) : null   // (S42G)
  const free = (sub[0]?.planId ?? 'free') === 'free'
  const usedFree = freeUsed.reduce((n, r) => n + r.n, 0)
  return {
    meeting: full,
    lead: { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, stage: lead.stage, propertyType: lead.propertyType, propertyAddress: lead.propertyAddress, areaSqft: lead.areaSqft, budgetMinor: lead.budgetMinor, style: lead.style, keyCollection: lead.keyCollection, reachedMet: reached, direct: lead.direct, next },
    project: project ?? null,
    team,
    prep: prepOf({ lead: { propertyType: lead.propertyType, areaSqft: lead.areaSqft, budgetMinor: lead.budgetMinor, style: lead.style, keyCollection: lead.keyCollection }, aim: full.aim, last: lastBrief && lastBriefed ? { brief: lastBrief, at: lastBriefed.startsAt.getTime() } : null, count: earlier.filter((e) => e.briefJson).length }),
    playbook, copilot,
    files: fileRows.map((f) => ({ id: f.id, name: f.name, kind: f.kind, thumb: f.thumb })),
    designs,
    readings: readingRows.map((r) => ({ id: r.id, title: `Compared with ${r.other || 'another studio'}`, at: r.createdAt.getTime() })),
    portfolio,
    credits: { free, freeLeft: Math.max(0, FREE_BLOCKS - usedFree) },
    followUp: otherFollowUp ? { title: otherFollowUp.title, dueAt: otherFollowUp.dueAt?.getTime() ?? null } : null,
    leadMembers: leadPeople,
    viewer: { id: viewer.id, role: viewer.role, name: team.find((t) => t.id === viewer.id)?.name ?? 'You' },
    mayChange: await mayChangeLead(viewer, m.leadId),
    mayDelete: mayDeleteMeeting(viewer, m.createdBy),
    studioName: brand.details.name,
    linkedToLog: !!entry,
    quoteNumber: quoteRow[0]?.number ?? null,
    now: Date.now(),
  }
}

/** The members of a lead — the meeting's people by default, the brief's follow-up's. */
export async function leadMemberIds(leadId: string): Promise<string[]> {
  return (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.id)
}

/** (Maison AI — S10's note: "prepare me for my next meeting" answers from the records) The viewer's next planned meeting: theirs first (they're in
    it), else the next on a lead they see; with its prep. */
export async function nextMeetingFor(viewer: Awaited<ReturnType<typeof fetchViewer>>, now = Date.now()): Promise<{ row: MeetingRow; prep: Prep } | null> {
  const seen = await visibleLeadIds(viewer)
  const ahead = await db.select().from(meetings).where(and(isNull(meetings.deletedAt), eq(meetings.status, 'planned'), gte(meetings.startsAt, new Date(now - 30 * 60_000)))).orderBy(asc(meetings.startsAt))
  const mine = ahead.filter((m) => !seen || seen.has(m.leadId))
  const next = mine.find((m) => idsOf(m.memberIds).includes(viewer.id)) ?? mine[0]
  if (!next) return null
  const room = await fetchMeetingRoom(next.id)
  if (!room) return null
  return { row: rowOf(next, room.lead.name), prep: room.prep }
}

/** The meeting's people, for the bell — its members and whoever planned it. Server-only (a 'use server' export would be callable by anyone). */
export async function meetingPeople(id: string): Promise<string[]> {
  const [m] = await db.select({ memberIds: meetings.memberIds, createdBy: meetings.createdBy }).from(meetings).where(eq(meetings.id, id)).limit(1)
  return m ? [...new Set([...idsOf(m.memberIds), ...(m.createdBy ? [m.createdBy] : [])])] : []
}

/** What waits on the studio on a lead's Meetings (the tab's count, REG-1182's rule): briefs to save to the lead, and meetings whose planned end
    has passed with no notes in. */
export async function meetingsWaiting(leadId: string, now = Date.now()): Promise<number> {
  const rows = await db.select({ status: meetings.status, startsAt: meetings.startsAt, endsAt: meetings.endsAt, briefAt: meetings.briefAt, briefSavedAt: meetings.briefSavedAt }).from(meetings).where(and(eq(meetings.leadId, leadId), isNull(meetings.deletedAt)))
  return rows.filter((r) => standingOf({ status: r.status, startsAt: r.startsAt.getTime(), endsAt: r.endsAt?.getTime() ?? null, briefAt: r.briefAt?.getTime() ?? null, briefSavedAt: r.briefSavedAt?.getTime() ?? null }, now).waits).length
}
