'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { queueCalendarSync } from '@/lib/meetings/calendar-sync'   // (pending modules S34)
import { transcribeRecording, transcriberIsStandIn } from '@/lib/meetings/transcribe'   // (pending modules S34)
import { copilotObjectionLog, leadTasks, leads, meetings, members, projects, stageLogs, taskAssignees, type Meeting } from '@/lib/db/schema'
import { fetchViewer, canOpenLead } from '@/lib/leads/visibility'
import { isAccounting } from '@/lib/settings/roles'
import { revalidateLead } from '@/lib/leads/queries'
import { logLeadEvent, diffFields } from '@/lib/leads/events'
import { notify } from '@/lib/notifications/emit'
import { spendCredits, refundCredits, currentSubscription } from '@/lib/credits/ledger'
import { trustedRole } from '@/lib/credits/policy'
import { isWizardPayload } from '@/lib/leads/stage-data'
import { formatInputDateTime, titleCaseName } from '@/lib/format'
import { KEY_COLLECTION_OPTIONS, PROPERTY_TYPES, STYLE_OPTIONS } from '@/lib/leads/enums'
import { fetchBrand } from '@/lib/templates/queries'
import { siteConfig } from '@/lib/config'
import { deliver } from '@/lib/notifications/delivery'
import { fetchClientMessageRules } from '@/lib/portal/client-messages-send'
import { clientTemplateFor, composeClient } from '@/lib/portal/client-messages'
import { shortStudioName } from '@/lib/settings/types'
import type { Refusal } from '@/lib/company/template-rules'
import {
  BLOCK_MS, DEFAULT_LENGTH_MIN, DISCLOSURE, FREE_BLOCKS, RECORDING_CONSENT, aimLabel, blockRef, clientMeetingPath, firstOf, idsOf,
  isAim, isWhere, parseBrief, parseShare, parseState, type MeetingBrief, type ShareOptions,
} from '@/lib/meetings/model'
import { briefOf } from '@/lib/meetings/brief'
import { entryOf, fetchCopilotSettings, fetchPlaybook, fullOf, heldMeetingLog, leadMemberIds, mayDeleteMeeting, meetingStepFor, reachedMet, serverReading } from '@/lib/meetings/queries'
import type { MeetingStep } from '@/lib/meetings/next-step'
import type { MeetingLog } from '@/lib/leads/stage-data'
import { placeWords, whenWords } from '@/lib/meetings/words'
import { workspaceRefusal, offWorkspace } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (pending modules S23 — Meetings and the Meeting Co-Pilot) The studio's meeting actions. Every refusal answers `{ error: <the rule> }` in the
 * rule's words; long text (notes, a transcript, a recording) travels inside one object. A meeting held on a lead IS its Met log: ending one
 * (or writing one up) on a lead that has reached Met adds it to the Met step's log list; before Met, the studio is offered the stage its own rule
 * allows (S42G — lib/meetings/next-step.ts: Met where it may go there, else Contacted for a lead still in New under one stage at a time, the
 * meeting its first contact), which opens the Move stage window with this meeting as the log (lib/leads/move-link.ts `meeting`).
 */

type Err = { error: string }
const now = () => new Date()
const NOT_YOURS = 'This lead isn’t one you can open'
const READS_ONLY = 'Accounting reads the books — the studio’s team runs meetings'
const GONE = 'This meeting is gone'

async function viewerFor(leadId: string): Promise<Awaited<ReturnType<typeof fetchViewer>> | Err> {
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: READS_ONLY }
  if (!(await canOpenLead(viewer, leadId))) return { error: NOT_YOURS }
  return viewer
}
async function meetingFor(id: unknown): Promise<{ m: Meeting; viewer: Awaited<ReturnType<typeof fetchViewer>> } | Err> {
  const [m] = typeof id === 'string' ? await db.select().from(meetings).where(and(eq(meetings.id, id), isNull(meetings.deletedAt))).limit(1) : []
  if (!m) return { error: GONE }
  const viewer = await viewerFor(m.leadId)
  if ('error' in viewer) return viewer
  return { m, viewer }
}
const isErr = (x: unknown): x is Err => !!x && typeof x === 'object' && 'error' in x
function revalidateMeeting(leadId: string, id?: string) {
  queueCalendarSync(leadId)   // (pending modules S34) the studio's own calendar follows every write to a meeting — after the response; nothing on the stand-in
  revalidateLead(leadId)
  revalidatePath('/meetings')
  if (id) revalidatePath(`/meetings/${id}`)
  revalidatePath('/tasks')
}
async function leadOf(leadId: string) {
  const [l] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  return l ?? null
}
const liveProject = async (leadId: string) => (await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1))[0]?.id ?? null
/** The active members among these ids — never Accounting, who runs no meetings. */
async function teamIds(ids: unknown): Promise<string[]> {
  const want = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []
  if (!want.length) return []
  const rows = await db.select({ id: members.id, role: members.role, active: members.isActive }).from(members).where(inArray(members.id, want))
  return rows.filter((r) => r.active !== false && !isAccounting(r.role)).map((r) => r.id)
}
const reminderTitle = (aim: string, client: string) => `Meet ${firstOf(titleCaseName(client))} — ${aim === 'other' ? 'meeting' : aimLabel(aim).toLowerCase()}`
const token = () => randomBytes(18).toString('base64url')

/* ── plan ── */

export type PlanInput = { leadId: string; aim: string; aimNote?: string | null; whereKind: string; place?: string | null; startsAt: number; lengthMin?: number; memberIds: string[]; remind?: boolean }
function planOf(o: PlanInput): Err | { aim: string; aimNote: string | null; whereKind: string; place: string | null; startsAt: Date; endsAt: Date } {
  if (!o || typeof o !== 'object') return { error: 'Say when and where the meeting is' }
  if (!isAim(o.aim)) return { error: 'Pick what the meeting is for' }
  if (!isWhere(o.whereKind)) return { error: 'Pick where it is' }
  const at = Number(o.startsAt)
  if (!Number.isFinite(at) || at <= 0) return { error: 'Pick the date and time' }
  const len = Math.max(15, Math.min(8 * 60, Math.round(Number(o.lengthMin) || DEFAULT_LENGTH_MIN)))
  const place = typeof o.place === 'string' ? o.place.replace(/\s+/g, ' ').trim().slice(0, 200) || null : null
  const aimNote = typeof o.aimNote === 'string' ? o.aimNote.replace(/\s+/g, ' ').trim().slice(0, 200) || null : null
  return { aim: o.aim, aimNote, whereKind: o.whereKind, place, startsAt: new Date(at), endsAt: new Date(at + len * 60_000) }
}

/** Plan a meeting — and, unless it starts now, the reminder its people get: a dated task on the lead ("Meet Jonathan — first consultation"),
    due at the meeting, kept in step with it (moved with it, closed when it is held, gone when it is cancelled). */
export async function planMeeting(o: PlanInput): Promise<{ id: string; taskId: string | null } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await viewerFor(o?.leadId)
  if ('error' in viewer) return viewer
  const plan = planOf(o)
  if ('error' in plan) return plan
  const lead = await leadOf(o.leadId)
  if (!lead || lead.deletedAt) return { error: 'This lead is gone' }
  const people = await teamIds(o.memberIds)
  const memberIds = people.length ? people : [viewer.id]
  const id = randomUUID(), at = now()
  const projectId = await liveProject(o.leadId)
  let taskId: string | null = null
  await db.transaction(async (tx) => {
    await tx.insert(meetings).values({ id, leadId: o.leadId, projectId, aim: plan.aim, aimNote: plan.aimNote, whereKind: plan.whereKind, place: plan.place ?? (plan.whereKind === 'In person' ? lead.propertyAddress : null), startsAt: plan.startsAt, endsAt: plan.endsAt, status: 'planned', memberIds: JSON.stringify(memberIds), createdBy: viewer.id, createdAt: at, updatedAt: at })
    if (o.remind !== false && plan.startsAt.getTime() > at.getTime()) {
      taskId = randomUUID()
      await tx.insert(leadTasks).values({ id: taskId, leadId: o.leadId, title: reminderTitle(plan.aim, lead.name), kind: 'Follow-up', dueAt: plan.startsAt, done: false, createdAt: at, creatorId: viewer.id, updatedAt: at, meetingId: id })
      await tx.insert(taskAssignees).values(memberIds.map((memberId) => ({ taskId: taskId!, memberId })))
    }
  })
  if (taskId) await notify('task_assigned', memberIds, { title: `New task: ${reminderTitle(plan.aim, lead.name)}`, body: `On ${titleCaseName(lead.name)} · ${whenWords(plan.startsAt.getTime())}`, href: `/meetings/${id}`, leadId: o.leadId })
  revalidateMeeting(o.leadId, id)
  return { id, taskId }
}

/** Change a meeting's plan — its reminder moves with it. A held meeting the Met log holds changes the log's where and when too. */
export async function updateMeetingPlan(id: string, o: Omit<PlanInput, 'leadId'>): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status === 'cancelled') return { error: 'This meeting is cancelled — plan it again first' }
  const plan = planOf({ ...o, leadId: m.leadId })
  if ('error' in plan) return plan
  const people = await teamIds(o.memberIds)
  const memberIds = people.length ? people : idsOf(m.memberIds)
  const lead = await leadOf(m.leadId)
  await db.update(meetings).set({ aim: plan.aim, aimNote: plan.aimNote, whereKind: plan.whereKind, place: plan.place, startsAt: plan.startsAt, endsAt: plan.endsAt, memberIds: JSON.stringify(memberIds), updatedAt: now() }).where(eq(meetings.id, m.id))
  /* the reminder follows: its day, its words, its people */
  const tasks = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.meetingId, m.id), eq(leadTasks.done, false), eq(leadTasks.kind, 'Follow-up')))
  for (const t of tasks) {
    await db.update(leadTasks).set({ dueAt: plan.startsAt, title: reminderTitle(plan.aim, lead?.name ?? ''), updatedAt: now() }).where(eq(leadTasks.id, t.id))
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, t.id))
    if (memberIds.length) await db.insert(taskAssignees).values(memberIds.map((memberId) => ({ taskId: t.id, memberId })))
  }
  if (m.status === 'held') await writeLogEntry(m.leadId, m.id, { where: plan.whereKind, when: formatInputDateTime(plan.startsAt) })
  revalidateMeeting(m.leadId, m.id)
  return { ok: true }
}

type TaskSnapshot = { task: typeof leadTasks.$inferSelect; memberIds: string[] }
async function takeReminders(meetingId: string): Promise<TaskSnapshot[]> {
  const open = await db.select().from(leadTasks).where(and(eq(leadTasks.meetingId, meetingId), eq(leadTasks.done, false), eq(leadTasks.kind, 'Follow-up')))
  const out: TaskSnapshot[] = []
  for (const t of open) {
    const a = await db.select({ memberId: taskAssignees.memberId }).from(taskAssignees).where(eq(taskAssignees.taskId, t.id))
    out.push({ task: t, memberIds: a.map((x) => x.memberId) })
    await db.delete(leadTasks).where(eq(leadTasks.id, t.id))
  }
  return out
}
async function putBack(snaps: unknown): Promise<void> {
  if (!Array.isArray(snaps)) return
  for (const s of snaps as TaskSnapshot[]) {
    if (!s?.task?.id) continue
    const t = { ...s.task, dueAt: s.task.dueAt ? new Date(s.task.dueAt) : null, createdAt: new Date(s.task.createdAt), updatedAt: s.task.updatedAt ? new Date(s.task.updatedAt) : null, seenAt: s.task.seenAt ? new Date(s.task.seenAt) : null, externalSentAt: s.task.externalSentAt ? new Date(s.task.externalSentAt) : null }
    await db.insert(leadTasks).values(t).onConflictDoNothing()
    if (s.memberIds?.length) await db.insert(taskAssignees).values(s.memberIds.map((memberId) => ({ taskId: t.id, memberId }))).onConflictDoNothing()
  }
}

/** Cancel a planned meeting: its reminder goes with it. Undo puts both back. */
export async function cancelMeeting(id: string): Promise<{ ok: true; undo: TaskSnapshot[] } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status !== 'planned') return { error: m.status === 'live' ? 'This meeting is on — end it instead' : 'Only a meeting still ahead can be cancelled' }
  const undo = await takeReminders(m.id)
  await db.update(meetings).set({ status: 'cancelled', updatedAt: now() }).where(eq(meetings.id, m.id))
  revalidateMeeting(m.leadId, m.id)
  return { ok: true, undo }
}
export async function undoCancelMeeting(id: string, undo: TaskSnapshot[]): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  await db.update(meetings).set({ status: 'planned', updatedAt: now() }).where(eq(meetings.id, got.m.id))
  await putBack(undo)
  revalidateMeeting(got.m.leadId, got.m.id)
  return { ok: true }
}

/** Delete a meeting (whoever made it, an Owner or an Admin): it leaves the lists softly, its open reminder with it; Undo restores both. A Met
    log that held it keeps its where and when — the log is the stage's record, and lists again on its own. */
export async function deleteMeeting(id: string): Promise<{ ok: true; undo: TaskSnapshot[] } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m, viewer } = got
  if (!mayDeleteMeeting(viewer, m.createdBy)) return { error: 'Only whoever planned it, an Owner or an Admin can delete a meeting' }
  if (m.status === 'live') return { error: 'This meeting is on — end it first' }
  const undo = await takeReminders(m.id)
  await db.update(meetings).set({ deletedAt: now(), deletedBy: viewer.id }).where(eq(meetings.id, m.id))
  await logLeadEvent(db, m.leadId, 'meeting_deleted', { title: aimLabel(m.aim), when: m.startsAt.toISOString() })
  revalidateMeeting(m.leadId, m.id)
  return { ok: true, undo }
}
export async function restoreMeeting(id: string, undo: TaskSnapshot[]): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [m] = typeof id === 'string' ? await db.select().from(meetings).where(eq(meetings.id, id)).limit(1) : []
  if (!m) return { error: GONE }
  const viewer = await viewerFor(m.leadId); if (isErr(viewer)) return viewer
  await db.update(meetings).set({ deletedAt: null, deletedBy: null }).where(eq(meetings.id, m.id))
  await putBack(undo)
  revalidateMeeting(m.leadId, m.id)
  return { ok: true }
}

/* ── the co-pilot's time: a 10-minute block at a time (the credits audit's Q-45) ── */

type BlockOk = { ok: true; free: boolean; charged: number; n: number }
type BlockRefusal = Refusal | { error: 'free_used' } | Err
/** Take block `n` for the meeting: free on the Free plan while the studio's one 30-minute meeting lasts (three blocks, never refreshed — 1.0's plg
    branch); else 25 AI credits, idempotent on `meeting:<id>:<n>`. */
async function takeBlock(m: Meeting, memberId: string, role: string, n: number): Promise<BlockOk | BlockRefusal> {
  if (n <= m.blocks) return { ok: true, free: n <= m.freeBlocks, charged: 0, n }
  const sub = await currentSubscription()
  if ((sub?.planId ?? 'free') === 'free') {
    const used = (await db.select({ n: meetings.freeBlocks }).from(meetings)).reduce((t, r) => t + r.n, 0)
    if (used >= FREE_BLOCKS) return { error: 'free_used' }
    await db.update(meetings).set({ blocks: n, freeBlocks: m.freeBlocks + 1, pausedAt: null, updatedAt: now() }).where(eq(meetings.id, m.id))
    return { ok: true, free: true, charged: 0, n }
  }
  const out = await spendCredits({ memberId, action: 'copilot_block', count: 1, ref: blockRef(m.id, n), trusted: trustedRole(role) })
  if (!('ok' in out)) return out
  await db.update(meetings).set({ blocks: n, pausedAt: null, updatedAt: now() }).where(eq(meetings.id, m.id))
  revalidatePath('/company/plan', 'layout')
  return { ok: true, free: false, charged: out.charged, n }
}

/** Start the co-pilot: the client was told (1.0's Recording Reminder), the first block taken; the reminder task is done — the meeting is on. */
export async function startMeeting(id: string, o: { consent: boolean; aim?: string; aimNote?: string | null; whereKind?: string }): Promise<BlockOk | BlockRefusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m, viewer } = got
  if (m.status === 'live') return { ok: true, free: m.freeBlocks > 0, charged: 0, n: m.blocks }
  if (m.status !== 'planned') return { error: m.status === 'held' ? 'This meeting was held — open its brief' : 'This meeting is cancelled — plan it again first' }
  if (!o?.consent) return { error: 'Tell the client about the co-pilot first' }
  const aim = isAim(o.aim) ? o.aim : m.aim
  const whereKind = isWhere(o.whereKind) ? o.whereKind : m.whereKind
  const fresh = { ...m, aim, whereKind }
  const block = await takeBlock(fresh, viewer.id, viewer.role, 1)
  if (!('ok' in block)) return block
  const at = now()
  await db.update(meetings).set({
    status: 'live', aim, whereKind, aimNote: typeof o.aimNote === 'string' ? o.aimNote.trim().slice(0, 200) || null : m.aimNote,
    startsAt: at, startedAt: at, startedBy: viewer.id, consentKind: 'told', consentAt: at, consentBy: viewer.id, disclosureText: DISCLOSURE, source: 'live', updatedAt: at,
  }).where(eq(meetings.id, m.id))
  await db.update(leadTasks).set({ done: true, updatedAt: at }).where(and(eq(leadTasks.meetingId, m.id), eq(leadTasks.done, false), eq(leadTasks.kind, 'Follow-up')))
  revalidateMeeting(m.leadId, m.id)
  return block
}

/** The next 10 minutes — the member's "Keep going" at a block's check-in, or Resume after a pause. */
export async function takeMeetingBlock(id: string, n: number): Promise<BlockOk | BlockRefusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m, viewer } = got
  if (m.status !== 'live') return { error: 'This meeting isn’t on' }
  const want = Math.floor(Number(n))
  if (!Number.isFinite(want) || want < 1 || want > m.blocks + 1) return { error: 'That isn’t the next block' }
  const out = await takeBlock(m, viewer.id, viewer.role, want)
  if (!('ok' in out)) await db.update(meetings).set({ pausedAt: m.pausedAt ?? now() }).where(eq(meetings.id, m.id))
  return out
}
/** Wrap up: the co-pilot stops reading; the notes go on. */
export async function pauseCopilot(id: string): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  if (got.m.status !== 'live') return { error: 'This meeting isn’t on' }
  await db.update(meetings).set({ pausedAt: got.m.pausedAt ?? now() }).where(eq(meetings.id, got.m.id))
  return { ok: true }
}

/** Autosave: what was said and the co-pilot's working state (ticks, closed tips, tags, boards). */
export async function saveMeetingNotes(id: string, o: { notes: string; state: unknown; fileIds?: string[] }): Promise<{ ok: true; at: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status === 'cancelled') return { error: 'This meeting is cancelled' }
  const notes = typeof o?.notes === 'string' ? o.notes.slice(0, 100_000) : m.notes
  const state = parseState(o?.state ?? m.stateJson)
  const at = now()
  await db.update(meetings).set({ notes, stateJson: JSON.stringify(state), ...(Array.isArray(o?.fileIds) ? { fileIds: JSON.stringify([...new Set(o.fileIds.filter((x) => typeof x === 'string'))].slice(0, 60)) } : {}), updatedAt: at }).where(eq(meetings.id, m.id))
  return { ok: true, at: at.getTime() }
}

/* ── the Met log ── */

/** Write a meeting into the lead's Met step: the latest Met row the wizard wrote takes it as a log (its own entry if it is there already). */
async function writeLogEntry(leadId: string, meetingId: string, patch: { where?: string; when?: string; notes?: string; fileIds?: string[]; files?: string[] }, add = false): Promise<boolean> {
  const rows = await db.select().from(stageLogs).where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Met'))).orderBy(desc(stageLogs.createdAt))
  const row = rows.find((r) => isWizardPayload(r.payload) && Array.isArray((r.payload as { meetings?: unknown }).meetings))
  type M = { where: string; when: string; files: string[]; fileIds?: string[]; notes: string; collapsed?: boolean; meetingId?: string }
  if (!row) {
    if (!add) return false
    const payload = { assignees: [], logs: [], meetings: [{ where: patch.where ?? 'In person', when: patch.when ?? '', files: patch.files ?? [], fileIds: patch.fileIds ?? [], notes: patch.notes ?? '', collapsed: true, meetingId }] }
    await db.insert(stageLogs).values({ id: randomUUID(), leadId, fromStage: 'Met', toStage: 'Met', payload, createdAt: now(), movedBy: (await fetchViewer()).id })
    return true
  }
  const list = [...((row.payload as { meetings: M[] }).meetings)]
  const at = list.findIndex((x) => x.meetingId === meetingId)
  if (at >= 0) list[at] = { ...list[at]!, ...(patch.where ? { where: patch.where } : {}), ...(patch.when ? { when: patch.when } : {}) }
  else if (add) {
    const entry: M = { where: patch.where ?? 'In person', when: patch.when ?? '', files: patch.files ?? [], fileIds: patch.fileIds ?? [], notes: patch.notes ?? '', collapsed: true, meetingId }
    /* a Met step that holds one empty log (never filled) takes this one in its place */
    if (list.length === 1 && !list[0]!.where && !list[0]!.when) list[0] = entry; else list.push(entry)
  } else return false
  await db.update(stageLogs).set({ payload: { ...(row.payload as object), meetings: list } }).where(eq(stageLogs.id, row.id))
  return true
}

/** A meeting deleted for good lets go of its Met log: the log stands on its own again (where, when, remarks and documents are the log's). */
async function unhookLog(leadId: string, meetingId: string): Promise<void> {
  const rows = await db.select().from(stageLogs).where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Met')))
  for (const row of rows) {
    if (!isWizardPayload(row.payload)) continue
    const list = (row.payload as { meetings?: { meetingId?: string }[] }).meetings
    if (!Array.isArray(list) || !list.some((x) => x?.meetingId === meetingId)) continue
    const next = list.map((x) => { if (x?.meetingId !== meetingId) return x; const { meetingId: _gone, ...rest } = x; void _gone; return rest })
    await db.update(stageLogs).set({ payload: { ...(row.payload as object), meetings: next } }).where(eq(stageLogs.id, row.id))
  }
}

/** What a held meeting did on its lead: `logged` — it joined the Met step's logs (the lead has reached Met); `offer` — the lead may move now and
    `next` says where (S42G: the studio's stage rule, never "Met" on its own); `kept` — before Met, where the rule offers nothing now (a lost
    lead); `project` — the lead is on its project. */
export type HeldFiling = { filed: 'logged' | 'offer' | 'kept' | 'project'; next: MeetingStep | null }
/** A meeting the studio just held (or wrote up): on a lead that has reached Met and isn't on its project yet, it joins the Met log list. */
async function fileHeld(m: Meeting, summary: string): Promise<HeldFiling> {
  const lead = await leadOf(m.leadId)
  if (!lead) return { filed: 'kept', next: null }
  if (await liveProject(m.leadId)) return { filed: 'project', next: null }
  const metRows = await db.select({ id: stageLogs.id }).from(stageLogs).where(and(eq(stageLogs.leadId, m.leadId), eq(stageLogs.toStage, 'Met'))).limit(1)
  if (!metRows.length && !reachedMet(lead.stage)) {
    const next = await meetingStepFor(m.leadId)   // (S42G) the stage the rule allows — a New lead under Linear goes to Contacted first
    return next ? { filed: 'offer', next } : { filed: 'kept', next: null }
  }
  const files = await fileNames(idsOf(m.fileIds))
  await writeLogEntry(m.leadId, m.id, { where: m.whereKind, when: formatInputDateTime(m.startsAt), notes: summary, fileIds: files.map((f) => f.id), files: files.map((f) => f.name) }, true)
  return { filed: 'logged', next: null }
}

/**
 * (S42G — S23's rule "a meeting held IS the Met log", kept wherever Met is reached) The Move stage window entering Met by any door — the stage
 * pill, the header's next step, the listing, the kanban, Maison AI — asks for the lead's latest held meeting no Met log holds yet, and takes it as
 * the step's log (as the meeting's own offer does with `?meeting=`). Read only; who can't open the lead reads nothing.
 */
export async function fetchHeldMeetingForMet(leadId: string): Promise<MeetingLog | null> {
  if (typeof leadId !== 'string') return null
  const viewer = await viewerFor(leadId); if (isErr(viewer)) return null
  if (await liveProject(leadId)) return null
  return heldMeetingLog(leadId)
}
async function fileNames(ids: string[]) {
  if (!ids.length) return []
  const { leadFiles } = await import('@/lib/db/schema')
  return db.select({ id: leadFiles.id, name: leadFiles.name }).from(leadFiles).where(and(inArray(leadFiles.id, ids), isNull(leadFiles.deletedAt)))
}

/** Open a Met log no meeting holds yet: it becomes one — the same where, when, remarks and documents, its log carrying the meeting from now on. */
export async function openMetLog(leadId: string, logId: string, index: number): Promise<{ id: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await viewerFor(leadId); if (isErr(viewer)) return viewer
  const [row] = await db.select().from(stageLogs).where(and(eq(stageLogs.id, logId), eq(stageLogs.leadId, leadId))).limit(1)
  if (!row || !isWizardPayload(row.payload)) return { error: 'This log is gone' }
  type M = { where?: string; when?: string; notes?: string; files?: string[]; fileIds?: string[]; meetingId?: string }
  const list = [...((row.payload as { meetings?: M[] }).meetings ?? [])]
  const e = list[index]
  if (!e) return { error: 'This log is gone' }
  if (e.meetingId) { const [has] = await db.select({ id: meetings.id }).from(meetings).where(and(eq(meetings.id, e.meetingId), isNull(meetings.deletedAt))).limit(1); if (has) return { id: has.id } }
  const { parseInputDateTime } = await import('@/lib/format')
  const at = (e.when ? parseInputDateTime(e.when) : null) ?? row.createdAt
  const id = randomUUID(), t = now()
  const people = await leadMemberIds(leadId)
  await db.insert(meetings).values({ id, leadId, aim: 'other', whereKind: isWhere(e.where) ? e.where : 'In person', startsAt: at, endsAt: new Date(at.getTime() + DEFAULT_LENGTH_MIN * 60_000), status: 'held', memberIds: JSON.stringify(people), notes: e.notes ?? '', fileIds: JSON.stringify(e.fileIds ?? []), source: 'notes', createdBy: row.movedBy ?? viewer.id, createdAt: row.createdAt, updatedAt: t })
  list[index] = { ...e, meetingId: id }
  await db.update(stageLogs).set({ payload: { ...(row.payload as object), meetings: list } }).where(eq(stageLogs.id, row.id))
  revalidateMeeting(leadId, id)
  return { id }
}

/* ── the brief ── */

async function makeBrief(m: Meeting, madeFrom: MeetingBrief['madeFrom']): Promise<MeetingBrief> {
  const lead = await leadOf(m.leadId)
  const [playbook, copilot] = await Promise.all([fetchPlaybook(), fetchCopilotSettings()])
  const full = fullOf(m, await entryOf(m))
  const reading = await serverReading(full, { leadName: lead?.name ?? '', playbook, copilot })
  const brief = briefOf({ reading, meeting: { aim: full.aim, whereKind: full.whereKind, startsAt: full.startsAt }, lead: { name: lead?.name ?? '', propertyType: lead?.propertyType ?? null }, features: copilot.features, madeFrom, now: Date.now(), prior: parseBrief(m.briefJson) })
  /* every objection the client raised, with the studio's answer at the time — 1.0's objection log, rewritten whole with the brief */
  const at = now()
  await db.delete(copilotObjectionLog).where(eq(copilotObjectionLog.meetingId, m.id))
  if (brief.objections.length) await db.insert(copilotObjectionLog).values(brief.objections.slice(0, 40).map((o) => ({ id: randomUUID(), meetingId: m.id, leadId: m.leadId, memberId: m.startedBy ?? m.createdBy, objectionType: o.kind, objectionDescription: o.said, competitorName: o.competitor, recommendedResponse: o.answer, detectedAt: at })))
  return brief
}

export type HeldResult = { brief: MeetingBrief; receipt: { minutes: number; blocks: number; free: number; credits: number } } & HeldFiling
/** End the meeting: held, its brief made by rule from what was said, and filed as a Met log where the lead is past that step. */
export async function endMeeting(id: string): Promise<HeldResult | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status !== 'live') return { error: 'This meeting isn’t on' }
  const at = now()
  await db.update(meetings).set({ status: 'held', endedAt: at, pausedAt: null, updatedAt: at }).where(eq(meetings.id, m.id))
  const ended = { ...m, status: 'held', endedAt: at }
  const brief = await makeBrief(ended, 'live')
  await db.update(meetings).set({ briefJson: JSON.stringify(brief), briefAt: at }).where(eq(meetings.id, m.id))
  const filed = await fileHeld(ended, brief.summary)
  revalidateMeeting(m.leadId, m.id)
  const minutes = Math.max(1, Math.round((at.getTime() - (m.startedAt?.getTime() ?? at.getTime())) / 60_000))
  return { brief, ...filed, receipt: { minutes, blocks: m.blocks, free: m.freeBlocks, credits: (m.blocks - m.freeBlocks) * 25 } }
}

/** Stop a meeting that only just started and holds nothing yet: back to planned, its blocks given back (Q-31: work stopped before it was kept). */
export async function stopEarly(id: string): Promise<{ ok: true; refunded: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status !== 'live') return { error: 'This meeting isn’t on' }
  if (m.notes.trim()) return { error: 'Something was said already — end the meeting to keep it' }
  if (m.startedAt && Date.now() - m.startedAt.getTime() > BLOCK_MS) return { error: 'The first ten minutes are over — end the meeting instead' }
  let refunded = 0
  for (let n = 1; n <= m.blocks; n++) refunded += await refundCredits(blockRef(m.id, n))
  await db.update(meetings).set({ status: 'planned', startedAt: null, startedBy: null, consentAt: null, consentBy: null, consentKind: null, blocks: 0, freeBlocks: 0, pausedAt: null, source: null, updatedAt: now() }).where(eq(meetings.id, m.id))
  await db.update(leadTasks).set({ done: false, updatedAt: now() }).where(and(eq(leadTasks.meetingId, m.id), eq(leadTasks.kind, 'Follow-up')))
  revalidatePath('/company/plan', 'layout')
  revalidateMeeting(m.leadId, m.id)
  return { ok: true, refunded }
}

/**
 * Write a meeting up after it — from notes, or from an uploaded recording (1.0's "Analyze a Recording"). Nothing is metered (1.0 charged nothing,
 * and its live co-pilot is what Q-45 prices). The recording is kept in the lead's Files with its bytes; turning it into words isn't connected
 * (the stand-in is said in the dialog), so the transcript or the notes are pasted. On a planned meeting it becomes the held one.
 */
export async function writeUpMeeting(o: { leadId: string; meetingId?: string | null; notes: string; aim: string; whereKind: string; startsAt: number; memberIds: string[]; recording?: { name: string; data: string } | null; consent?: boolean }): Promise<{ id: string } & HeldResult | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await viewerFor(o?.leadId); if (isErr(viewer)) return viewer
  let notes = typeof o.notes === 'string' ? o.notes.slice(0, 100_000) : ''
  /* (pending modules S34) a real transcriber writes a recording's words when no notes came with it (lib/meetings/transcribe.ts) */
  if (!notes.trim() && o.recording && !transcriberIsStandIn() && o.consent) {
    const heard = await transcribeRecording({ name: String(o.recording.name ?? ''), dataUrl: String(o.recording.data ?? '') })
    if ('error' in heard) return { error: `The recording couldn’t be turned into words — ${heard.error}. Paste its transcript or your notes instead.` }
    notes = heard.text
  }
  if (!notes.trim()) return { error: o.recording ? 'Paste the recording’s transcript, or your notes from it' : 'Write what was said, or paste your notes' }
  if (!isAim(o.aim)) return { error: 'Pick what the meeting was for' }
  if (!isWhere(o.whereKind)) return { error: 'Pick where it was' }
  const at = Number(o.startsAt)
  if (!Number.isFinite(at) || at <= 0) return { error: 'Pick when it was' }
  if (o.recording && !o.consent) return { error: `Tick “${RECORDING_CONSENT}” first` }
  let recordingFileId: string | null = null
  if (o.recording) {
    const { uploadFile } = await import('@/app/leads/files-actions')
    const r = await uploadFile(o.leadId, { name: o.recording.name, data: o.recording.data })
    if (typeof r !== 'string') return r
    recordingFileId = r
  }
  const people = await teamIds(o.memberIds)
  const memberIds = people.length ? people : [viewer.id]
  const t = now()
  let id = typeof o.meetingId === 'string' ? o.meetingId : ''
  if (id) {
    const got = await meetingFor(id); if (isErr(got)) return got
    if (got.m.leadId !== o.leadId) return { error: GONE }
    if (got.m.status === 'live') return { error: 'This meeting is on — end it instead' }
    await db.update(meetings).set({ status: 'held', aim: o.aim, whereKind: o.whereKind, startsAt: new Date(at), notes, source: o.recording ? 'recording' : 'notes', recordingFileId: recordingFileId ?? got.m.recordingFileId, memberIds: JSON.stringify(memberIds), ...(o.recording ? { consentKind: 'recording', consentAt: t, consentBy: viewer.id, disclosureText: RECORDING_CONSENT } : {}), updatedAt: t }).where(eq(meetings.id, id))
    await db.update(leadTasks).set({ done: true, updatedAt: t }).where(and(eq(leadTasks.meetingId, id), eq(leadTasks.done, false), eq(leadTasks.kind, 'Follow-up')))
  } else {
    id = randomUUID()
    await db.insert(meetings).values({ id, leadId: o.leadId, projectId: await liveProject(o.leadId), aim: o.aim, whereKind: o.whereKind, startsAt: new Date(at), endsAt: new Date(at + DEFAULT_LENGTH_MIN * 60_000), status: 'held', memberIds: JSON.stringify(memberIds), notes, source: o.recording ? 'recording' : 'notes', recordingFileId, ...(o.recording ? { consentKind: 'recording', consentAt: t, consentBy: viewer.id, disclosureText: RECORDING_CONSENT } : {}), createdBy: viewer.id, createdAt: t, updatedAt: t })
  }
  const [m] = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1)
  const brief = await makeBrief(m!, o.recording ? 'recording' : 'notes')
  await db.update(meetings).set({ briefJson: JSON.stringify(brief), briefAt: t }).where(eq(meetings.id, id))
  const filed = await fileHeld(m!, brief.summary)
  revalidateMeeting(o.leadId, id)
  return { id, brief, ...filed, receipt: { minutes: 0, blocks: 0, free: 0, credits: 0 } }
}

/** Make the brief again from the notes as they are now — the parts edited by hand stay. */
export async function remakeBrief(id: string): Promise<{ brief: MeetingBrief } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status !== 'held') return { error: 'The brief comes once the meeting is held' }
  const brief = await makeBrief(m, (m.source as MeetingBrief['madeFrom']) ?? 'notes')
  await db.update(meetings).set({ briefJson: JSON.stringify(brief), briefAt: now(), updatedAt: now() }).where(eq(meetings.id, m.id))
  revalidateMeeting(m.leadId, m.id)
  return { brief }
}

/** Edit the brief's words (1.0's inline edit): the summary, the next steps, the follow-up message. */
export async function editBrief(id: string, o: { summary?: string; actions?: string[]; followUp?: string }): Promise<{ brief: MeetingBrief } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  const b = parseBrief(m.briefJson)
  if (!b) return { error: 'This meeting has no brief yet' }
  const next: MeetingBrief = { ...b, edited: [...b.edited] }
  if (typeof o?.summary === 'string') { next.summary = o.summary.trim().slice(0, 2000) || b.summary; if (!next.edited.includes('summary')) next.edited.push('summary') }
  if (Array.isArray(o?.actions)) { next.actions = o.actions.filter((a): a is string => typeof a === 'string').map((a) => a.trim().slice(0, 200)).filter(Boolean).slice(0, 8); if (!next.edited.includes('actions')) next.edited.push('actions') }
  if (typeof o?.followUp === 'string') { next.followUp = o.followUp.trim().slice(0, 2000) || b.followUp; if (!next.edited.includes('followUp')) next.edited.push('followUp') }
  await db.update(meetings).set({ briefJson: JSON.stringify(next), updatedAt: now() }).where(eq(meetings.id, m.id))
  revalidateMeeting(m.leadId, m.id)
  return { brief: next }
}

/* ── the brief to the lead (1.0's save-to-lead) ── */

export type BriefFields = { propertyType?: string; areaSqft?: number; budgetMinor?: number; style?: string; keyCollection?: string }
export type SaveUndo = { before: Record<string, unknown>; taskIds: string[]; savedAt: number | null }
/** The lead's details the brief heard (each one the member ticked), the follow-up task, the next steps as tasks — with an Undo. */
export async function saveBriefToLead(id: string, o: { fields: BriefFields; followUp: { title: string; dueAt: number } | null; tasks: string[] }): Promise<{ ok: true; fields: number; tasks: number; undo: SaveUndo } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m, viewer } = got
  const lead = await leadOf(m.leadId)
  if (!lead) return { error: 'This lead is gone' }
  const f = o?.fields ?? {}
  const cols: Record<string, unknown> = {}
  if (typeof f.propertyType === 'string' && PROPERTY_TYPES.includes(f.propertyType)) cols.propertyType = f.propertyType
  if (Number.isFinite(f.areaSqft) && f.areaSqft! >= 100 && f.areaSqft! <= 50_000) cols.areaSqft = Math.round(f.areaSqft!)
  if (Number.isFinite(f.budgetMinor) && f.budgetMinor! > 0 && f.budgetMinor! <= 1_000_000_000) cols.budgetMinor = Math.round(f.budgetMinor!)
  if (typeof f.style === 'string' && (STYLE_OPTIONS as readonly string[]).includes(f.style)) cols.style = f.style
  if (typeof f.keyCollection === 'string' && (KEY_COLLECTION_OPTIONS as readonly string[]).includes(f.keyCollection)) cols.keyCollection = f.keyCollection
  const before = Object.fromEntries(Object.keys(cols).map((k) => [k, (lead as Record<string, unknown>)[k] ?? null]))
  const at = now()
  const memberIds = await leadMemberIds(m.leadId)
  const people = memberIds.length ? memberIds : [viewer.id]
  const taskIds: string[] = []
  await db.transaction(async (tx) => {
    if (Object.keys(cols).length) await tx.update(leads).set({ ...cols, updatedAt: at }).where(eq(leads.id, m.leadId))
    if (o?.followUp && typeof o.followUp.title === 'string' && o.followUp.title.trim()) {
      const due = Number(o.followUp.dueAt)
      const tid = randomUUID(); taskIds.push(tid)
      await tx.insert(leadTasks).values({ id: tid, leadId: m.leadId, title: o.followUp.title.trim().slice(0, 200), kind: 'Follow-up', dueAt: Number.isFinite(due) && due > 0 ? new Date(due) : null, done: false, createdAt: at, creatorId: viewer.id, updatedAt: at, meetingId: m.id })
      await tx.insert(taskAssignees).values(people.map((memberId) => ({ taskId: tid, memberId })))
    }
    for (const title of (Array.isArray(o?.tasks) ? o.tasks : []).filter((t): t is string => typeof t === 'string' && !!t.trim()).slice(0, 8)) {
      const tid = randomUUID(); taskIds.push(tid)
      await tx.insert(leadTasks).values({ id: tid, leadId: m.leadId, title: title.trim().slice(0, 200), kind: 'General', dueAt: null, done: false, createdAt: at, creatorId: viewer.id, updatedAt: at, meetingId: m.id })
      await tx.insert(taskAssignees).values(people.map((memberId) => ({ taskId: tid, memberId })))
    }
    await tx.update(meetings).set({ briefSavedAt: at, briefSavedBy: viewer.id, updatedAt: at }).where(eq(meetings.id, m.id))
  })
  const changes = diffFields(before, cols)
  if (changes.length) await logLeadEvent(db, m.leadId, 'field_edited', { fields: changes })
  revalidateMeeting(m.leadId, m.id)
  return { ok: true, fields: Object.keys(cols).length, tasks: taskIds.length, undo: { before, taskIds, savedAt: m.briefSavedAt?.getTime() ?? null } }
}
export async function undoSaveBrief(id: string, undo: SaveUndo): Promise<{ ok: true } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  const back = Object.fromEntries(Object.entries(undo?.before ?? {}).filter(([k]) => ['propertyType', 'areaSqft', 'budgetMinor', 'style', 'keyCollection'].includes(k)))
  if (back.propertyType === null) delete back.propertyType   // a required column keeps a value
  if (back.budgetMinor === null) back.budgetMinor = 0
  const ids = Array.isArray(undo?.taskIds) ? undo.taskIds.filter((x) => typeof x === 'string') : []
  await db.transaction(async (tx) => {
    if (Object.keys(back).length) await tx.update(leads).set({ ...back, updatedAt: now() }).where(eq(leads.id, m.leadId))
    if (ids.length) await tx.delete(leadTasks).where(and(inArray(leadTasks.id, ids), eq(leadTasks.meetingId, m.id)))
    await tx.update(meetings).set({ briefSavedAt: undo?.savedAt ? new Date(undo.savedAt) : null, briefSavedBy: undo?.savedAt ? m.briefSavedBy : null }).where(eq(meetings.id, m.id))
  })
  revalidateMeeting(m.leadId, m.id)
  return { ok: true }
}

/** A draft quote from what the meeting heard — through Create Quote's Draft with Maison AI (S04): the works read from the words, priced from
    My Sections and My Items, anything the book lacks at S$0 to price. Never the rough estimate's guesses (1.0's "no tier may hand back a guessed
    number"). */
export async function draftQuoteFromMeeting(id: string): Promise<{ quoteId: string; lines: number; toPrice: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.quoteId) { const { quotes } = await import('@/lib/db/schema'); const [q] = await db.select({ id: quotes.id }).from(quotes).where(and(eq(quotes.id, m.quoteId), isNull(quotes.deletedAt))).limit(1); if (q) return { quoteId: q.id, lines: 0, toPrice: 0 } }
  const b = parseBrief(m.briefJson)
  const works = [...(b?.profile.rooms ?? []), ...(b?.estimate.lines.map((l) => l.name.replace(/ × \d+$/, '')) ?? [])]
  if (!works.length) return { error: 'The notes name no rooms or works yet — like “kitchen cabinets” or “redo both bathrooms”' }
  const { createQuoteFromDraft } = await import('@/app/quotes/draft-actions')
  const r = await createQuoteFromDraft({ leadId: m.leadId, brief: works.join(', ').slice(0, 600) })
  if ('error' in r) return r
  await db.update(meetings).set({ quoteId: r.id, updatedAt: now() }).where(eq(meetings.id, m.id))
  revalidateMeeting(m.leadId, m.id)
  return { quoteId: r.id, lines: r.lines, toPrice: r.toPrice }
}

/* ── the client's link ── */

async function ensureToken(m: Meeting): Promise<string> {
  if (m.clientToken) return m.clientToken
  const t = token()
  await db.update(meetings).set({ clientToken: t, clientTokenAt: now() }).where(and(eq(meetings.id, m.id), isNull(meetings.clientToken)))
  const [again] = await db.select({ t: meetings.clientToken }).from(meetings).where(eq(meetings.id, m.id)).limit(1)
  return again?.t ?? t
}
const absolute = (path: string) => `${siteConfig.url.replace(/\/$/, '')}${path}`

/** The meeting's client link — made once, sent nothing (Send and Share record what goes). */
export async function meetingLink(id: string): Promise<{ token: string; path: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const t = await ensureToken(got.m)
  return { token: t, path: clientMeetingPath(t) }
}

/** Share the notes with the client on the meeting's link: the summary and next steps, and — as ticked — the rough estimate and the mood boards. */
export async function shareMeeting(id: string, opts: ShareOptions): Promise<{ token: string; path: string } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status !== 'held' || !m.briefJson) return { error: 'The notes can be shared once the meeting is held and its brief made' }
  const t = await ensureToken(m)
  const at = now()
  /* (S42 audit C-06) only what the meeting has is kept as shared — no boards ticked on a meeting that kept none, no estimate without works */
  const asked = parseShare(opts), brief = parseBrief(m.briefJson)
  const share = { boards: asked.boards && parseState(m.stateJson).boards.length > 0, estimate: asked.estimate && (brief?.estimate?.lines?.length ?? 0) > 0 && (brief?.estimate?.highMinor ?? 0) > 0 }
  await db.update(meetings).set({ sharedAt: m.sharedAt && !m.shareStoppedAt ? m.sharedAt : at, shareStoppedAt: null, shareJson: JSON.stringify(share), updatedAt: at }).where(eq(meetings.id, m.id))
  revalidateMeeting(m.leadId, m.id)
  return { token: t, path: clientMeetingPath(t) }
}
/** Stop sharing: the link shows the invitation's day again, never the notes. Undo shares them again. */
export async function stopSharingMeeting(id: string): Promise<{ ok: true; share: ShareOptions } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (!m.sharedAt || m.shareStoppedAt) return { error: 'These notes aren’t shared' }
  await db.update(meetings).set({ shareStoppedAt: now(), updatedAt: now() }).where(eq(meetings.id, m.id))
  revalidateMeeting(m.leadId, m.id)
  return { ok: true, share: parseShare(m.shareJson) }
}

/** The invitation: the link made (and the time it was sent recorded); `email` sends the studio's "A meeting is booked" to the lead's email through
    the outbox. WhatsApp opens on the member's press, before this records it. */
export async function inviteClient(id: string, via: 'whatsapp' | 'email' | 'copy'): Promise<{ token: string; path: string; emailed: 'sent' | 'failed' | 'off' | 'no_address' | null } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const got = await meetingFor(id); if (isErr(got)) return got
  const { m } = got
  if (m.status === 'cancelled') return { error: 'This meeting is cancelled' }
  if (via !== 'whatsapp' && via !== 'email' && via !== 'copy') return { error: 'Pick how to send it' }
  const t = await ensureToken(m)
  let emailed: 'sent' | 'failed' | 'off' | 'no_address' | null = null
  if (via === 'email') {
    const lead = await leadOf(m.leadId)
    const rules = await fetchClientMessageRules()
    if (!rules.channels.client_meeting.email) emailed = 'off'
    else if (!lead?.email) emailed = 'no_address'
    else {
      const brand = await fetchBrand()
      const link = absolute(clientMeetingPath(t))
      const fields = { '{client}': firstOf(titleCaseName(lead.name)), '{studio}': shortStudioName(brand.details.name || 'Your studio'), '{when}': whenWords(m.startsAt.getTime()), '{where}': placeWords(m.whereKind, m.place), '{meeting}': m.aim === 'other' ? 'meeting' : aimLabel(m.aim).toLowerCase(), '{link}': link }
      const msg = composeClient('email', clientTemplateFor(rules.templates, 'client_meeting', 'email'), fields, { title: 'Your meeting', line: `${whenWords(m.startsAt.getTime())}, ${placeWords(m.whereKind, m.place)}` })
      const st = await deliver({ key: `c:client_meeting:${m.id}:${m.startsAt.getTime()}:email`, event: 'client_meeting', channel: 'email', to: { memberId: null, name: titleCaseName(lead.name), email: lead.email, phone: lead.phone }, subject: msg.subject, body: msg.body, href: link, leadId: m.leadId, notificationId: null })
      emailed = st === 'no_address' ? 'no_address' : st === 'failed' ? 'failed' : 'sent'
    }
  }
  if (via !== 'email' || emailed === 'sent') await db.update(meetings).set({ invitedAt: m.invitedAt ?? now(), invitedVia: via, updatedAt: now() }).where(eq(meetings.id, m.id))
  revalidateMeeting(m.leadId, m.id)
  return { token: t, path: clientMeetingPath(t), emailed }
}

/** The other planned meetings at the same time for any of these people — Plan's clash line. */
export async function clashesFor(o: { startsAt: number; lengthMin?: number; memberIds: string[]; except?: string | null }): Promise<{ client: string; at: number }[]> {
  if (await offWorkspace()) return []   // (S45C) the workspace's role rule: Marketing reads nothing here
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return []
  const from = Number(o?.startsAt), len = (Number(o?.lengthMin) || DEFAULT_LENGTH_MIN) * 60_000
  if (!Number.isFinite(from)) return []
  const rows = await db.select({ id: meetings.id, leadId: meetings.leadId, startsAt: meetings.startsAt, endsAt: meetings.endsAt, memberIds: meetings.memberIds }).from(meetings).where(and(isNull(meetings.deletedAt), eq(meetings.status, 'planned'), ...(o.except ? [ne(meetings.id, o.except)] : [])))
  const who = new Set(Array.isArray(o.memberIds) ? o.memberIds : [])
  const hits = rows.filter((r) => r.startsAt.getTime() < from + len && (r.endsAt?.getTime() ?? r.startsAt.getTime() + DEFAULT_LENGTH_MIN * 60_000) > from && idsOf(r.memberIds).some((x) => who.has(x)))
  if (!hits.length) return []
  const names = await db.select({ id: leads.id, name: leads.name }).from(leads).where(inArray(leads.id, hits.map((h) => h.leadId)))
  return hits.slice(0, 3).map((h) => ({ client: titleCaseName(names.find((n) => n.id === h.leadId)?.name ?? ''), at: h.startsAt.getTime() }))
}

/* ── Deleted Meetings (the house Deleted sheet, components/company/templates/library-deleted-sheet.tsx) ── */

export type DeletedMeeting = { id: string; title: string; leadName: string; startsAt: number; deletedAt: number; deletedBy: string | null; createdBy: string | null; status: string }
/** The deleted meetings of a lead (null = every lead the viewer sees). */
export async function listDeletedMeetings(leadId: string | null): Promise<DeletedMeeting[]> {
  if (await offWorkspace()) return []   // (S45C) the workspace's role rule: Marketing reads nothing here
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return []
  const { visibleLeadIds } = await import('@/lib/leads/visibility')
  const seen = await visibleLeadIds(viewer)
  const { isNotNull } = await import('drizzle-orm')
  const rows = await db.select({ m: meetings, leadName: leads.name }).from(meetings).innerJoin(leads, eq(leads.id, meetings.leadId)).where(leadId ? and(eq(meetings.leadId, leadId), isNotNull(meetings.deletedAt)) : isNotNull(meetings.deletedAt)).orderBy(desc(meetings.deletedAt))
  return rows.filter((r) => !seen || seen.has(r.m.leadId)).map((r) => ({ id: r.m.id, title: aimLabel(r.m.aim), leadName: titleCaseName(r.leadName), startsAt: r.m.startsAt.getTime(), deletedAt: r.m.deletedAt!.getTime(), deletedBy: r.m.deletedBy, createdBy: r.m.createdBy, status: r.m.status }))
}
/** Restore from the sheet: back in the lists; a meeting still ahead gets its reminder again. */
export async function restoreMeetings(ids: string[]): Promise<{ restored: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  let restored = 0
  for (const id of Array.isArray(ids) ? ids : []) {
    const [m] = typeof id === 'string' ? await db.select().from(meetings).where(eq(meetings.id, id)).limit(1) : []
    if (!m || !m.deletedAt) continue
    const viewer = await viewerFor(m.leadId); if (isErr(viewer)) return viewer
    await db.update(meetings).set({ deletedAt: null, deletedBy: null }).where(eq(meetings.id, m.id))
    if (m.status === 'planned' && m.startsAt.getTime() > Date.now()) {
      const [open] = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.meetingId, m.id), eq(leadTasks.done, false))).limit(1)
      if (!open) {
        const lead = await leadOf(m.leadId)
        const tid = randomUUID(), at = now(), people = idsOf(m.memberIds)
        await db.insert(leadTasks).values({ id: tid, leadId: m.leadId, title: reminderTitle(m.aim, lead?.name ?? ''), kind: 'Follow-up', dueAt: m.startsAt, done: false, createdAt: at, creatorId: viewer.id, updatedAt: at, meetingId: m.id })
        if (people.length) await db.insert(taskAssignees).values(people.map((memberId) => ({ taskId: tid, memberId })))
      }
    }
    restored++
    revalidateMeeting(m.leadId, m.id)
  }
  return { restored }
}
/** Delete for good — whoever made it, an Owner or an Admin; its objection log goes with it (cascade). */
export async function deleteMeetingsForever(ids: string[]): Promise<{ removed: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  let removed = 0
  for (const id of Array.isArray(ids) ? ids : []) {
    const [m] = typeof id === 'string' ? await db.select().from(meetings).where(eq(meetings.id, id)).limit(1) : []
    if (!m || !m.deletedAt) continue
    const viewer = await viewerFor(m.leadId); if (isErr(viewer)) return viewer
    if (!mayDeleteMeeting(viewer, m.createdBy)) return { error: 'Only whoever planned it, an Owner or an Admin can delete a meeting for good' }
    await db.update(leadTasks).set({ meetingId: null }).where(eq(leadTasks.meetingId, m.id))
    await unhookLog(m.leadId, m.id)
    await db.delete(meetings).where(eq(meetings.id, m.id))
    removed++
    revalidateMeeting(m.leadId)
  }
  return { removed }
}
export async function emptyMeetingTrash(leadId: string | null): Promise<{ removed: number } | Err> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const list = await listDeletedMeetings(leadId)
  const viewer = await fetchViewer()
  return deleteMeetingsForever(list.filter((d) => mayDeleteMeeting(viewer, d.createdBy)).map((d) => d.id))
}
