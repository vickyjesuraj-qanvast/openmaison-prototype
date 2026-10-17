'use server'

import { fetchLeadSources, fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { fetchViewer } from '@/lib/leads/visibility'
import { diffFields, logLeadEvent, logTaskEvent, printField } from '@/lib/leads/events'
import { notify } from '@/lib/notifications/emit'
import { leadDeskIds, leadMemberIds } from '@/lib/notifications/queries'   // (S44R) studioRunnerIds moved with notifyStageChange (lib/leads/stage-notify.ts)
import { assignHint, assignableIds, runsStudio } from '@/lib/leads/assign-policy'
import { and, eq, inArray, isNotNull, isNull, sql, gte, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { db, type Db } from '@/lib/db'
import { contracts, leadAssignees, leadCustomFieldValues, leadCustomFields, leadFiles, leadNotes, leads, members, noteAttachments, questions, quotes, studioScopeQuestions } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { ALL_STAGES, TASK_KINDS, type Stage } from '@/lib/leads/enums'
// (REG-287) The app's one phone rule and one strict d/m/yyyy parser — the CSV import used to carry private copies
// of both, and the date copy accepted impossible dates (32/13/2026) the UI refuses.
import { formatInputDateTime, parseInputDate, phoneDigits, titleCaseName } from '@/lib/format'
import type { ContactLog, MeetingLog, WizardData } from '@/lib/leads/stage-data'
import { bodyText } from '@/lib/leads/note-model'
import { revalidateEveryLead, revalidateLead, revalidateLeadListings } from '@/lib/leads/queries'
import { leadColumns, leadInputBlock, type LeadFormInput } from '@/lib/leads/lead-input'   // (pending modules S41b-3) one place for the form's columns
import { keepQuoteSentUpload, recordWonUpload, splitStageFiles } from '@/lib/contracts/won'
import { ensureProjectForLead } from '@/lib/projects/create'
import { LEAD_HAS_PROJECT, leadHasProjectNamed, leadsHaveProjects } from '@/lib/projects/handover-model'   // (Projects round 7, Q-27)
import { isActiveStage, projectHoldsWon, roleStageBlock } from '@/lib/leads/stage-policy'   // (fix-E, A-01) · (S42F) a lead past New needs a member
import { purgeLeads, type KeptLead } from '@/lib/leads/purge'   // (fix-E, E-01 · E-09)
import { adjustedPhrase, countChanges, readAmount, readArea, readDate, readDistrict, readImportRecord, readPropertyType, readSource, readStage, type AdjustedCount, type ImportAdjustment } from '@/lib/leads/import-values'
import { projects as projectRows } from '@/lib/db/schema'   // (fix-A, A-05 · A-21) a lead's project, for the words and the address
import { isProjectStage, TEAM_NEEDED, type ProjectStage } from '@/lib/projects/model'
import { syncPreparedSnapshot } from '@/lib/quotes/prepared-server'   // (pending modules S04)
import { notifyStageChange } from '@/lib/leads/stage-notify'   // (S44R) one writer for every move

/* (REG-286 · REG-667 · pending modules S43A) Every write stamp is the signed-in member — this browser's (`sessionMemberId()`), read before a
   transaction opens and passed in as a value. */

/**
 * (REG-286) A server action is a public endpoint: its TypeScript parameter types are not runtime guarantees, and a
 * stage string lands in `leads.stage` and `stage_logs`, where every policy helper, filter and kanban column reads it
 * back. A value outside the mock's vocabulary makes a lead that no column shows and no policy can move. Reject it.
 * (Same shape as the `kind` guard REG-285 added to updateTask; the vocabulary itself stays in lib/leads/enums.ts.)
 */
const isStage = (s: unknown): s is string => typeof s === 'string' && (ALL_STAGES as readonly string[]).includes(s)
function assertStage(...stages: unknown[]): void {
  for (const s of stages) if (!isStage(s)) throw new Error(`Unknown stage: ${String(s)}`)
}

/** The transaction handle Drizzle hands a `db.transaction` callback. */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Replaces a lead's assignees. One writer for both doors — the Assign popover and the Lead form's Assign member
 * field (REG-231) — and de-duplicated, because `lead_assignees` carries unique(leadId, memberId).
 */
async function writeAssignees(tx: Tx, leadId: string, memberIds: string[], by: string): Promise<void> {
  // (REG-335) A diff, not a wipe: members who stay keep their assigned_at, newcomers are stamped now, the rest go.
  const ids = [...new Set(memberIds)]
  const have = (await tx.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.memberId)
  const gone = have.filter((m) => !ids.includes(m))
  const fresh = ids.filter((m) => !have.includes(m))
  if (gone.length) await tx.delete(leadAssignees).where(and(eq(leadAssignees.leadId, leadId), inArray(leadAssignees.memberId, gone)))
  /* (parity P-13) who added them — Activity names the actor ("Dane added Germaine to the lead") */
  if (fresh.length) await tx.insert(leadAssignees).values(fresh.map((m) => ({ id: randomUUID(), leadId, memberId: m, assignedAt: new Date(), assignedBy: by })))
}

export async function assignMembers(leadId: string, memberIds: string[]): Promise<void> {
  /* (REG-601) The role's reach, checked here as well as in the popover: a Designer reassigns nobody; a Manager changes only their team and themselves. */
  const [viewer, team, current] = await Promise.all([fetchViewer(), db.select().from(members), db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))])
  if (assignHint(viewer)) throw new Error('not allowed to assign')
  const allowed = new Set(assignableIds(viewer, team))
  const before = new Set(current.map((c) => c.memberId)), after = new Set(memberIds)
  const changed = [...new Set([...before, ...after])].filter((id) => before.has(id) !== after.has(id))
  if (changed.some((id) => !allowed.has(id))) throw new Error('outside your team')
  await keepsAMember(leadId, memberIds)   // (S42F)
  await db.transaction((tx) => writeAssignees(tx, leadId, memberIds, viewer.id))   // atomic: no window with the rows deleted
  /* (REG-613, parity Q-20) A removal leaves no row — the event log keeps it for Activity. */
  for (const id of [...before].filter((x) => !after.has(x))) await logLeadEvent(db, leadId, 'member_removed', { memberId: id, name: team.find((m) => m.id === id)?.name ?? id })
  /* (REG-604) The members just added hear it. */
  const added = memberIds.filter((id) => !before.has(id))
  if (added.length) {
    const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)); const who = team.find((m) => m.id === viewer.id)?.name ?? 'A member'
    /* (fix-A, A-05) a lead whose work carries on as a project: the team change speaks of the project and opens it */
    const pr = (await liveProjectsOf([leadId])).get(leadId)
    await notify('assigned', added, pr ? { title: `${pr.name} is now yours`, body: `${pr.number} · Assigned by ${who}`, href: `/projects/${pr.id}`, leadId } : { title: `${titleCaseName(l?.name ?? 'A lead')} is now yours`, body: `Assigned by ${who}`, href: `/leads/${leadId}`, leadId })
  }
  revalidateLead(leadId)
}

/**
 * (REG-610, parity Q-31 · I-14 · I-16) The listing's bulk Assign: ADDS the chosen members to every selected lead (the owner's call —
 * never a replace, so nobody loses a lead they hold). The role's reach applies as in `assignMembers`; the members added hear it
 * once (2.0 notifies where 1.0's bulk path stayed silent, E-44). Returns how many leads gained someone.
 */
export async function addLeadMembers(leadIds: string[], memberIds: string[]): Promise<{ assigned: number }> {
  const ids = [...new Set(leadIds)].filter(Boolean).slice(0, 2000)   // 1.0's cap
  const adds = [...new Set(memberIds)].filter(Boolean)
  if (!ids.length || !adds.length) return { assigned: 0 }
  const [viewer, team] = await Promise.all([fetchViewer(), db.select().from(members)])
  if (assignHint(viewer)) throw new Error('not allowed to assign')
  const allowed = new Set(assignableIds(viewer, team))
  if (adds.some((id) => !allowed.has(id))) throw new Error('outside your team')
  const live = await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(inArray(leads.id, ids), isNull(leads.deletedAt)))
  const have = await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, live.map((l) => l.id)))
  const now = new Date()
  const fresh: { id: string; leadId: string; memberId: string; assignedAt: Date; assignedBy: string }[] = []
  for (const l of live) for (const m of adds) if (!have.some((h) => h.leadId === l.id && h.memberId === m)) fresh.push({ id: randomUUID(), leadId: l.id, memberId: m, assignedAt: now, assignedBy: viewer.id })   // (parity P-13) who added them
  if (fresh.length) await db.insert(leadAssignees).values(fresh)
  const touched = [...new Set(fresh.map((f) => f.leadId))]
  const who = team.find((m) => m.id === viewer.id)?.name ?? 'A member'
  /* (fix-A, A-05) projects' leads (the Projects listing's bulk Assign) speak of the projects and open them */
  const prs = await liveProjectsOf(touched)
  for (const m of adds) {
    const mine = fresh.filter((f) => f.memberId === m)
    if (!mine.length) continue
    const one = mine.length === 1 ? live.find((l) => l.id === mine[0]!.leadId) : null
    const allProjects = mine.every((f) => prs.has(f.leadId))
    const pr = one ? prs.get(one.id) : null
    await notify('assigned', [m], one
      ? pr ? { title: `${pr.name} is now yours`, body: `${pr.number} · Assigned by ${who}`, href: `/projects/${pr.id}`, leadId: one.id } : { title: `${titleCaseName(one.name)} is now yours`, body: `Assigned by ${who}`, href: `/leads/${one.id}`, leadId: one.id }
      : allProjects ? { title: `${mine.length} projects are now yours`, body: `Assigned from the listing by ${who}`, href: '/projects' }
      : { title: `${mine.length} leads are now yours`, body: `Assigned from the listing by ${who}`, href: '/leads' })
  }
  for (const id of touched) revalidateLead(id)
  revalidateLeadListings()
  return { assigned: touched.length }
}

/** (fix-A, A-05) The live (not deleted) projects of these leads — a team change on one speaks of the project. */
async function liveProjectsOf(leadIds: string[]): Promise<Map<string, { id: string; name: string; number: string }>> {
  if (!leadIds.length) return new Map()
  const rows = await db.select({ id: projectRows.id, leadId: projectRows.leadId, name: projectRows.name, number: projectRows.number }).from(projectRows).where(and(inArray(projectRows.leadId, leadIds), isNull(projectRows.deletedAt)))
  return new Map(rows.map((r) => [r.leadId, { id: r.id, name: r.name, number: r.number }]))
}

/** (REG-608) A task the Move stage window raises with the move: a plain title (General, undated) or the Contacted reminder — a dated Follow-up for the lead's members. */
export type MoveTask = string | { title: string; kind?: string; dueAt?: string | null; assignLeadMembers?: boolean }

export async function moveStage(input: {
  leadId: string
  fromStage: string
  toStage: string
  payload: unknown
  tasks: MoveTask[]
  followUpAt?: string | null
}): Promise<{ logId: string; stamped: string | null; /** (REG-911) the project a Won move made (or the lead already had) */ projectId: string | null; /** (REG-1052) its number, for the one sentence "Project P-… created" */ projectNumber: string | null; /** (pending modules S23) the meeting a Contacted log's in-person next step planned — its snackbar says so */ planned?: { id: string; at: number } | null } | { error: string }> {
  assertStage(input.fromStage, input.toStage)   // (REG-286)
  { const byRole = roleStageBlock((await fetchViewer()).role, input.toStage); if (byRole) return { error: byRole } }   // (S44O — call C6) never Marketing's
  const held = await projectHoldFor(input.leadId, input.toStage)   // (fix-E, A-01) a lead whose project is live stays Won
  if (held) return { error: held }
  const nobody = await teamNeededFor(input.leadId, input.toStage)   // (S42F)
  if (nobody) return { error: nobody }
  const incomplete = await stageFieldsRefusal(input.toStage, input.payload, true)   // (S43B · F1-07) the window's own checks, on the server
  if (incomplete) return { error: incomplete }
  /* (pending modules S03) the Won step's picked PDF travels inside the payload and is kept with its contract — never in the stage log */
  const won = splitStageFiles(input.payload)   // (pending modules S05) the two steps' uploaded quotes too
  input = { ...input, payload: won.payload }
  const { leads, stageLogs, leadTasks } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  const logId = uuid()   // (REG-607, parity Q-33) handed back so the On Hold / Lost snackbars can Undo the move, as a quick move's can
  const assigned: { id: string; title: string; memberIds: string[] }[] = []   // (REG-608) the reminder's members, notified after the write
  const me = await sessionMemberId()   // (pending modules S43A) who moved it — read before the transaction
  // (REG-286) One transaction: the lead's new stage, the log that records the move and the suggested tasks are one
  // fact. Unwrapped, a failure after the update left a lead sitting in a stage its journey has no log for — which is
  // what `resumeStage`, the stage timeline and Activity all read.
  await db.transaction(async (tx) => {
    await tx.update(leads)
      .set({ stage: input.toStage, updatedAt: now })
      .where(eq(leads.id, input.leadId))
    await tx.insert(stageLogs).values({
      id: logId, leadId: input.leadId,
      fromStage: input.fromStage, toStage: input.toStage,
      payload: input.payload as object, createdAt: now,
      movedBy: me,   // (parity P-13) Activity names who moved it
    })
    // Suggested tasks are raised by the signed-in member, like every task createTask() writes. Unstamped they read
    // "System created the task" in Activity, left the drawer's Creator row blank and hid under Filters › Creators › Dane.
    // (REG-608) The Contacted reminder arrives as a dated Follow-up for the lead's members — 1.0's follow-up task.
    for (const x of input.tasks) {
      const t = typeof x === 'string' ? { title: x } : x
      const kind = t.kind && (TASK_KINDS as readonly string[]).includes(t.kind) ? t.kind : 'General'
      const due = t.dueAt ? new Date(t.dueAt) : null
      const id = uuid()
      await tx.insert(leadTasks).values({
        id, leadId: input.leadId, title: t.title, kind,
        dueAt: due && !Number.isNaN(due.getTime()) ? due : null, done: false, createdAt: now, creatorId: me, updatedAt: now,
      })
      if (t.assignLeadMembers) {
        const { taskAssignees } = await import('@/lib/db/schema')
        const memberIds = (await tx.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, input.leadId))).map((r) => r.memberId)
        if (memberIds.length) { await tx.insert(taskAssignees).values(memberIds.map((memberId) => ({ taskId: id, memberId }))); assigned.push({ id, title: t.title, memberIds }) }
      }
    }
  })
  const planned = input.toStage === 'Contacted' ? await planFromContactLog(input.leadId, input.payload, now) : null   // (pending modules S23) an in-person next step is a planned meeting
  if (input.toStage === 'Won') await recordWonUpload(input.leadId, input.payload, now, won.file)   // (REG-632, contracts parity Q-14) the uploaded signed contract is a contract — (S03) its PDF kept
  /* (REG-911, Projects Q-02) Won creates the project in the same press — after the uploaded contract above, so the project names it. */
  const made = input.toStage === 'Won' ? await ensureProjectForLead(input.leadId, { payload: input.payload, at: now, wonQuoteFile: won.wonQuoteFile }) : null
  if (input.toStage === 'Quote Sent') await keepQuoteSentUpload(input.leadId, input.payload, won.quoteFile, now)   // (pending modules S05) the uploaded quote, kept with its bytes
  const projectId = made?.id ?? null
  const stamped = input.toStage === 'Quote Sent' ? await stampQuoteSent(input.leadId, input.payload) : null   // (UX audit 2026-09-30, Q1)
  /* (REG-608, parity Q-23) The lead's stage changed — Owners, Admins and the lead's members hear it (never the actor); the reminder's members hear their new task. */
  await notifyStageChange(input.leadId, input.fromStage, input.toStage, input.payload)
  for (const a of assigned) await notify('task_assigned', a.memberIds, { title: `New task: ${a.title}`, body: `On ${await leadName(input.leadId)}`, href: `/leads/${input.leadId}/tasks?open=${a.id}`, leadId: input.leadId })
  revalidateLead(input.leadId)
  return { logId, stamped, projectId, projectNumber: made?.number ?? null, planned }
}

/* ── (UX audit 2026-09-30, Q1 · C1 · L2) The deal moves with its documents ─────────────────────────────────────────────────── */

/** What the Quote Sent step needs to know about sending: the studio's approval rule, and whether this member's own send approves
    (REG-624 — an approver's send is the approval). */
/** (pending modules S05 — Manage Stages) What the studio set the steps to ask for — the Move stage window reads it as it opens. */
export async function fetchStageAsks(): Promise<{ contactNextStep: boolean; wonContract: boolean }> {
  const { fetchLeadStageRules } = await import('@/lib/settings/queries')
  return fetchLeadStageRules()
}

export async function fetchQuoteSendRule(): Promise<{ approvalRequired: boolean; approver: boolean }> {
  const [approval, viewer] = await Promise.all([fetchQuoteApproval(), fetchViewer()])
  return { approvalRequired: approval === 'required', approver: await isApprover(viewer.id, viewer.role) }
}

/**
 * A Quote Sent move that attaches a system quote says that quote went to the client: an Approved quote — or a Draft where the studio
 * needs no approval, or whose sender approves (REG-624) — becomes Sent to Client, stamped Sent and shared (the quote editor's own send,
 * `sendQuote`); one already out keeps its status and gains the client stamp it lacked. A quote still waiting for an approval is left
 * as it is — the step refused it before Save (the window's `quoteNeedsApproval`). Returns the number of a quote whose status moved.
 */
async function stampQuoteSent(leadId: string, payload: unknown): Promise<string | null> {
  const p = (payload && typeof payload === 'object' ? payload : {}) as Partial<WizardData>
  if (p.quoteTab !== 'system' || (!p.quoteSelectedId && !p.quoteSelected)) return null
  const rows = await db.select().from(quotes).where(and(eq(quotes.leadId, leadId), isNull(quotes.deletedAt), isNull(quotes.archivedAt)))
  const q = (p.quoteSelectedId ? rows.find((r) => r.id === p.quoteSelectedId) : undefined) ?? rows.find((r) => r.title === p.quoteSelected)
  if (!q) return null
  const now = new Date()
  if (q.status === 'Sent to Client' || q.status === 'Confirmed' || q.status === 'Signed') {
    if (!q.clientSentAt) { await db.update(quotes).set({ clientSentAt: now, sentAt: q.sentAt ?? now, updatedAt: now }).where(eq(quotes.id, q.id)); await syncPreparedSnapshot(q.id) }   // (pending modules S04)
    return null
  }
  const [approval, viewer] = await Promise.all([fetchQuoteApproval(), fetchViewer()])
  const selfApproves = q.status === 'Draft' && approval === 'required' && await isApprover(viewer.id, viewer.role)
  if (!(q.status === 'Approved' || (q.status === 'Draft' && approval !== 'required') || selfApproves)) return null
  await db.update(quotes).set({ status: 'Sent to Client', sentAt: q.sentAt ?? now, clientSentAt: q.clientSentAt ?? now, visibility: 'Shared', ...(selfApproves ? { approvedAt: q.approvedAt ?? now, approvedBy: viewer.id } : {}), updatedAt: now }).where(eq(quotes.id, q.id))
  await syncPreparedSnapshot(q.id)   // (pending modules S04) the paper keeps its preparer as it goes out
  revalidatePath(`/quotes/${q.id}`); revalidatePath('/quotes')
  return q.number
}

/**
 * The hand-off's documents, read for the Move stage window (`?move=<step>&quote=|contract=|log=`, lib/leads/move-link.ts): the quote,
 * the contract and the quote it was raised from (C1: a signed contract's quote is the Won step's source), and a Notes-tab contact log
 * as a Contacted entry (L2). Only this lead's records answer — an id from another lead resolves to nothing.
 */
export async function resolveMoveHandoff(leadId: string, pick: { quote?: string | null; contract?: string | null; log?: string | null; /** (pending modules S23) */ meeting?: string | null }): Promise<{ quoteId: string | null; contractId: string | null; log: ContactLog | null; meeting: MeetingLog | null }> {
  const [q, c, n] = await Promise.all([
    pick.quote ? db.select({ id: quotes.id }).from(quotes).where(and(eq(quotes.id, pick.quote), eq(quotes.leadId, leadId), isNull(quotes.deletedAt))).limit(1) : Promise.resolve([]),
    pick.contract ? db.select({ id: contracts.id, fromQuoteId: contracts.fromQuoteId }).from(contracts).where(and(eq(contracts.id, pick.contract), eq(contracts.leadId, leadId), isNull(contracts.deletedAt))).limit(1) : Promise.resolve([]),
    pick.log ? db.select().from(leadNotes).where(and(eq(leadNotes.id, pick.log), eq(leadNotes.leadId, leadId), eq(leadNotes.kind, 'contact'))).limit(1) : Promise.resolve([]),
  ])
  const note = n[0]
  let log: ContactLog | null = null
  if (note) {
    const files = await db.select({ id: leadFiles.id, name: leadFiles.name }).from(noteAttachments).innerJoin(leadFiles, eq(leadFiles.id, noteAttachments.fileId)).where(and(eq(noteAttachments.noteId, note.id), isNull(leadFiles.deletedAt)))
    log = {
      channel: note.channel, when: note.contactedAt ? formatInputDateTime(note.contactedAt) : '', outcome: note.outcome ?? '',
      nextStepWhen: note.nextStepAt ? formatInputDateTime(note.nextStepAt) : '', nextStepMode: note.nextStepMode ?? '',
      files: files.map((f) => f.name), fileIds: files.map((f) => f.id), notes: bodyText(note.body).trim(), noteId: note.id,   // (pending modules S05) the ids too
    }
  }
  /* (pending modules S23) a held meeting arrives as the Met step's log: where, when, its brief's summary as the remarks, its documents — and its id */
  let meeting: MeetingLog | null = null
  if (pick.meeting) {
    /* (S42G) one reading of a held meeting as the Met step's log — the Move stage window's own carry into Met reads it the same way */
    const { heldMeetingLog } = await import('@/lib/meetings/queries')
    meeting = await heldMeetingLog(leadId, pick.meeting)
    /* (S42E, call E·3) …and, for a lead whose next step is Contacted (New under Linear — lib/leads/stage-policy.ts `heldMeetingStep`), the
       same meeting as its first contact log: In person (a showroom too; a video call is Others), when, Connected, the summary as the remarks */
    if (meeting && !log) log = { channel: meeting.where === 'Video call' ? 'Others' : 'In person', when: meeting.when, outcome: 'Connected', nextStepWhen: '', nextStepMode: '', files: meeting.files, fileIds: meeting.fileIds, notes: meeting.notes }
  }
  return { quoteId: q[0]?.id ?? c[0]?.fromQuoteId ?? null, contractId: c[0]?.id ?? null, log, meeting }
}

const leadName = async (leadId: string): Promise<string> => { const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)); return l ? titleCaseName(l.name) : 'A lead' }

/* (REG-608) The stage-changed event — one writer, lib/leads/stage-notify.ts (S44R: a signed agreement's move uses it too). */

/** (REG-608, parity Q-03) Set a follow-up from the Overview: one dated Follow-up task on the lead, assigned to its members (you, when it has none). */
export async function setFollowUp(leadId: string, input: { title: string; dueAt: string }): Promise<string> {
  const { leadTasks, taskAssignees } = await import('@/lib/db/schema')
  const due = new Date(input.dueAt)
  if (Number.isNaN(due.getTime())) throw new Error('bad date')
  const title = input.title.trim().slice(0, 120) || `Follow up with ${await leadName(leadId)}`
  const members = await leadMemberIds(leadId)
  const me = await sessionMemberId()
  const assignees = members.length ? members : [me]
  const id = randomUUID(); const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(leadTasks).values({ id, leadId, title, kind: 'Follow-up', dueAt: due, done: false, createdAt: now, creatorId: me, seenAt: null, updatedAt: now })
    await tx.insert(taskAssignees).values(assignees.map((memberId) => ({ taskId: id, memberId })))
  })
  await notify('task_assigned', assignees, { title: `New task: ${title}`, body: `On ${await leadName(leadId)}`, href: `/leads/${leadId}/tasks?open=${id}`, leadId })
  revalidateLead(leadId); revalidatePath('/tasks')
  return id
}

/** (REG-607, parity Q-41) Only Owners and Admins delete leads — 1.0's default for `leads.delete`; the menus hide the item, the server refuses it. */
async function assertCanDelete(): Promise<void> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) throw new Error('Only Owners and Admins can delete leads')
}

/** (REG-607, parity Q-04) What Delete warns about, as 1.0's archive did: contracts of these leads whose signing link is still live with the client. */
export async function countLiveSigningLinks(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0
  const { contracts, contractBundles } = await import('@/lib/db/schema')
  const [cs, bs] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(contracts).where(and(inArray(contracts.leadId, leadIds), eq(contracts.status, 'Sent to Client'), isNull(contracts.deletedAt))),
    db.select({ n: sql<number>`count(*)` }).from(contractBundles).where(and(inArray(contractBundles.leadId, leadIds), isNotNull(contractBundles.sentAt), isNull(contractBundles.signedAt))),
  ])
  return Number(cs[0]?.n ?? 0) + Number(bs[0]?.n ?? 0)
}

/** (wave E, E8) What Delete — and Return Lead — also stop: these leads' client render links that open today (the AI Visualizer's
    `/renders` links close with their lead; lib/visualizer/queries.ts `countLiveRenderLinks`). Read by the two dialogs when they open. */
export async function countLeadRenderLinks(leadIds: string[]): Promise<number> {
  const ids = leadIds.filter((id) => typeof id === 'string' && id)
  if (!ids.length) return 0
  const { countLiveRenderLinks } = await import('@/lib/visualizer/queries')
  return countLiveRenderLinks(ids)
}

/** (Projects round 7, Q-27) Leads whose project is live (not in Deleted projects) — every lead delete path refuses them. (fix-E, E-08) With
    the one holder's name, so a refused bulk delete says which lead kept it. */
async function leadsWithProjects(leadIds: string[]): Promise<{ n: number; projectId: string | null; name: string | null }> {
  if (!leadIds.length) return { n: 0, projectId: null, name: null }
  const { projects } = await import('@/lib/db/schema')
  const rows = await db.select({ id: projects.id, leadId: projects.leadId, name: leads.name }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt)))
  return { n: new Set(rows.map((r) => r.leadId)).size, projectId: rows.length === 1 ? rows[0]!.id : null, name: rows.length === 1 ? titleCaseName(rows[0]!.name) : null }
}
/** The refusal, with the project to open when it is one. (fix-E, E-08) Several leads picked: the one that holds it is named, and the line
    says nothing was deleted — the whole batch refuses (REG-1027). */
const projectRefusal = (leadIds: string[], h: { n: number; projectId: string | null; name: string | null }) => ({
  error: leadIds.length === 1 ? LEAD_HAS_PROJECT : h.n === 1 && h.name ? leadHasProjectNamed(h.name) : leadsHaveProjects(h.n),
  projectId: h.projectId,
})
/** (fix-E, A-01) Why a lead may not move to `toStage`: its project is live and the lead stays Won. */
async function projectHoldFor(leadId: string, toStage: string): Promise<string | null> {
  if (toStage === 'Won') return null
  const { projects } = await import('@/lib/db/schema')
  const [p] = await db.select({ number: projects.number }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  return p ? projectHoldsWon(p.number) : null
}
/**
 * (S42F — the owner's "Dane Testing" was made with nobody on it) A lead past New needs a member: the stage menu, the kanban and the Move stage
 * window refuse it before the press (`blockedReason`, REG-130 · REG-334) and the server now does too — Won makes the project, and a project
 * without its team reaches nobody. Lost and On Hold stay open to a lead nobody holds yet.
 */
async function teamNeededFor(leadId: string, toStage: string): Promise<string | null> {
  if (!isActiveStage(toStage) || toStage === 'New') return null
  const [a] = await db.select({ id: leadAssignees.id }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId)).limit(1)
  return a ? null : TEAM_NEEDED
}
/** (S42F) The same rule for a change of members: past New, the last member never leaves (the Assign popover's `requireOne`, the form's
    `requireAssignee`) — said on the server as the popover says it. */
async function keepsAMember(leadId: string, memberIds: readonly string[]): Promise<void> {
  if (memberIds.length) return
  const [l] = await db.select({ stage: leads.stage }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (l && l.stage !== 'New') throw new Error(TEAM_NEEDED)
}

export async function deleteLead(leadId: string, reason: string): Promise<void | { error: string; projectId: string | null }> {
  await assertCanDelete()   // (REG-607)
  const held = await leadsWithProjects([leadId])
  if (held.n) return projectRefusal([leadId], held)   // (Projects round 7, Q-27)
  const { leads } = await import('@/lib/db/schema')
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) return
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: lead.stage })
    .where(eq(leads.id, leadId))
  revalidateLead(leadId)
}

/**
 * (REG-609, parity Q-18 · C-13) The duplicate pre-check behind Create New Lead: a live lead with the same phone (the bare
 * eight digits — 1.0's raw-or-E.164 exact match) else the same email, case-insensitive. Deleted leads are in the trash for
 * thirty days and never match (1.0 counted archived rows with a note; 2.0 has no archive). The form turns a hit into
 * "A lead with this phone already exists" — Open existing lead · Create anyway. No studio switch (the owner's call).
 */
export async function findDuplicateLead(input: { phone: string; email: string; excludeId?: string | null }): Promise<{ id: string; name: string; phone: string; email: string | null; stage: string; matchedOn: 'phone' | 'email'; project?: { id: string; number: string; stage: ProjectStage } | null } | null> {
  const phone = phoneDigits(input.phone)
  const email = input.email.trim().toLowerCase()
  if (!phone && !email) return null
  const live = (await db.select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, stage: leads.stage }).from(leads).where(isNull(leads.deletedAt)))
    .filter((l) => l.id !== input.excludeId)
  const byPhone = phone.length >= 6 ? live.find((l) => l.phone === phone) : undefined
  const byEmail = byPhone ? undefined : email ? live.find((l) => (l.email ?? '').trim().toLowerCase() === email) : undefined
  const hit = byPhone ?? byEmail
  if (!hit) return null
  /* (fix-A, A-21) a client who is a project is named by the project — its number and stage — and opened there */
  const [p] = await db.select({ id: projectRows.id, number: projectRows.number, stage: projectRows.stage }).from(projectRows).where(and(eq(projectRows.leadId, hit.id), isNull(projectRows.deletedAt))).limit(1)
  return { ...hit, matchedOn: byPhone ? 'phone' : 'email', project: p ? { id: p.id, number: p.number, stage: isProjectStage(p.stage) ? p.stage : 'setting_up' } : null }
}

/* (REG-612, parity Q-25) The lead's custom values, written whole: only active fields, only shapes the field takes; an empty value clears the row. */
async function writeCustomValues(tx: Tx, leadId: string, values: Record<string, string | string[]> | undefined): Promise<void> {
  if (!values) return
  const defs = await tx.select({ id: leadCustomFields.id, fieldType: leadCustomFields.fieldType }).from(leadCustomFields).where(eq(leadCustomFields.isActive, true))
  /* (REG-647, settings parity Q-13 · E-91) Only the active fields' values are rewritten — an inactive field keeps its value, as the card promises. */
  if (defs.length) await tx.delete(leadCustomFieldValues).where(and(eq(leadCustomFieldValues.leadId, leadId), inArray(leadCustomFieldValues.fieldId, defs.map((d) => d.id))))
  const rows = defs.flatMap((d) => {
    const v = values[d.id]
    if (v === undefined) return []
    if (d.fieldType === 'multi_select') { const list = Array.isArray(v) ? v.map(String).filter(Boolean) : []; return list.length ? [{ id: randomUUID(), leadId, fieldId: d.id, value: JSON.stringify(list.slice(0, 20)) }] : [] }
    const str = Array.isArray(v) ? v[0] ?? '' : String(v)
    return str.trim() ? [{ id: randomUUID(), leadId, fieldId: d.id, value: JSON.stringify(str.trim().slice(0, 300)) }] : []
  })
  if (rows.length) await tx.insert(leadCustomFieldValues).values(rows)
}

export async function createLead(input: LeadFormInput): Promise<string> {
  { const why = leadInputBlock(input); if (why) throw new Error(why) }   // (S42 B-06) the form's own checks, on the server
  const now = new Date()
  const id = randomUUID()
  /* (REG-609, parity C-07) A Designer's new lead is their own — the server twin of the form's locked Assign member field. (sweep S4 · U-11)
     The signed-in member decides it (`fetchViewer`, the house way — the fixed session id checked everyone as Dane), and a Manager's pick
     keeps to their reach, as the Assign popover's does (`assignableIds`). */
  const [viewer, team] = await Promise.all([fetchViewer(), db.select({ id: members.id, isActive: members.isActive, role: members.role }).from(members)])   // (parity map, FB-114) the role, so Accounting is never put on it
  const reach = new Set(assignableIds(viewer, team))
  const assignees = viewer.role === 'Designer' ? [viewer.id] : input.assignees.filter((m) => reach.has(m))
  const files = (input.files ?? []).map((n) => n.trim()).filter(Boolean).slice(0, 20)
  // One transaction: a lead is never visible without the owners it was created with, so a retry cannot leave two.
  await db.transaction(async (tx) => {
    await tx.insert(leads).values({ id, ...leadColumns(input), stage: 'New', createdAt: now, updatedAt: now })   // every new lead carries the band until someone clicks it (user 2026-08-29)
    await writeAssignees(tx, id, assignees, viewer.id)
    await writeCustomValues(tx, id, input.customValues)   /* (REG-612) */
    /* (REG-612, parity Q-21) A new lead starts with the studio's enabled questions — 1.0 shows the bank on every lead. */
    const bank = await tx.select().from(studioScopeQuestions).where(eq(studioScopeQuestions.isEnabled, true)).orderBy(asc(studioScopeQuestions.sortOrder))
    if (bank.length) {
      const { isBankType, leadOptions, parseBankOptions, toLeadType } = await import('@/lib/company/question-bank')
      await tx.insert(questions).values(bank.map((q, i) => { const t = isBankType(q.questionType) ? q.questionType : 'text'; const opts = leadOptions(t, parseBankOptions(q.options)); return { id: randomUUID(), leadId: id, text: q.question, type: toLeadType(t), options: opts.length ? JSON.stringify(opts) : null, sortOrder: i, createdAt: now, required: q.isRequired } }))   // (REG-647) the bank's Required rides along
    }
    /* (REG-609, parity C-08) Documents attached at creation land in the Files tab — the row files-actions' uploadFile writes, in the same act. */
    if (files.length) await tx.insert(leadFiles).values(files.map((name) => {
      const pdf = /\.pdf$/i.test(name)
      return { id: randomUUID(), leadId: id, kind: pdf ? 'pdf' : 'image', name, thumb: pdf ? null : '/figma-assets/file-thumb-1.png', createdAt: now, parentId: null, ownerId: viewer.id, sizeBytes: 728064, mime: pdf ? 'application/pdf' : 'image/jpeg', updatedAt: now }
    }))
  })
  /* (REG-604) Owners and Admins hear of every new lead; the members it was created with hear it is theirs. */
  await notify('new_lead', await leadDeskIds(), { title: `New lead: ${titleCaseName(input.name)}`, body: `${input.source} · ${input.propertyType}`, href: `/leads/${id}`, leadId: id })
  if (assignees.length) await notify('assigned', assignees, { title: `${titleCaseName(input.name)} is now yours`, body: 'Assigned when the lead was created', href: `/leads/${id}`, leadId: id })
  revalidateLead(id)
  return id
}

export async function updateLead(leadId: string, input: LeadFormInput): Promise<void> {
  { const why = leadInputBlock(input); if (why) throw new Error(why) }   // (S42 B-06)
  const [before] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  /* (sweep S4 · U-11) The form's members change under the same reach as the Assign popover (assignMembers): only who may be assigned by this member moves. */
  const [viewer, team, current] = await Promise.all([fetchViewer(), db.select({ id: members.id, isActive: members.isActive, role: members.role }).from(members), db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))])   // (parity map, FB-114) the role
  const was = new Set(current.map((c) => c.memberId)), now = new Set(input.assignees)
  const moved = [...new Set([...was, ...now])].filter((id) => was.has(id) !== now.has(id))
  if (moved.length) { const reach = new Set(assignableIds(viewer, team)); if (assignHint(viewer) || moved.some((id) => !reach.has(id))) throw new Error('outside your team') }
  await keepsAMember(leadId, input.assignees)   // (S42F)
  const cols = leadColumns(input)
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ ...cols, updatedAt: new Date() }).where(eq(leads.id, leadId))
    await writeAssignees(tx, leadId, input.assignees, viewer.id)
    await writeCustomValues(tx, leadId, input.customValues)   /* (REG-612) */
  })
  /* (REG-613, parity Q-20) An edit leaves no row of its own — the changed fields go to the event log, in the form's words. */
  const changes = before ? diffFields(before as unknown as Record<string, unknown>, cols as unknown as Record<string, unknown>) : []
  /* (fix-G, G-02) the client's portal sign-in moves with the lead's phone — the number Client access shows is the one that opens it */
  const { movePortalSignIn } = await import('@/lib/portal/sign-in')
  const portalMoved = before ? await movePortalSignIn(leadId, before.phone, cols.phone) : null
  if (changes.length) await logLeadEvent(db, leadId, 'field_edited', portalMoved ? { fields: changes, phone: portalMoved.replace(/(\d{4})(\d{4})/, '$1 $2') } : { fields: changes })
  revalidateLead(leadId)
}

export async function addTask(leadId: string, title: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  const now = new Date()
  // Stamped like createTask(): without a creator the same task read as 'System' in Activity and '—' in the drawer.
  await db.insert(leadTasks).values({
    id: randomUUID(), leadId, title, kind: 'General', createdAt: now, creatorId: await sessionMemberId(), updatedAt: now,
  })
  revalidateLead(leadId)
}

/** The task's own lead, so the Tasks and Activity tabs are evicted too (REG-286) — the listing popover knows only the task id. */
async function leadOfTask(taskId: string): Promise<string | null> {
  const { leadTasks } = await import('@/lib/db/schema')
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId)).limit(1)
  return t?.leadId ?? null
}

/* (REG-339) Both popover writes stamp `updated_at`, as the Tasks tab's updateTask does on every edit: the Activity
   feed reads "You completed the task …" / "You updated the task …" only when updated_at sits more than a minute past
   created_at, so a completion or a due date set from the listing's Tasks popover or the Overview's My Tasks card used
   to leave no trace there. */
export async function completeTask(taskId: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  const [was] = await db.select({ done: leadTasks.done }).from(leadTasks).where(eq(leadTasks.id, taskId))
  await db.update(leadTasks).set({ done: true, updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
  if (was && !was.done) await logTaskEvent(taskId, 'task_completed')   // (UX audit 2026-09-30, T10) Activity names who completed it
  if (was && !was.done) await (await import('@/lib/compliance/sync')).syncComplianceFromTasks([taskId])   // (gaps build I, I-Q11)
  const leadId = await leadOfTask(taskId)
  if (leadId) revalidateLead(leadId); else revalidateLeadListings()
}

export async function setTaskDue(taskId: string, due: Date): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  const [was] = await db.select({ dueAt: leadTasks.dueAt }).from(leadTasks).where(eq(leadTasks.id, taskId))
  await db.update(leadTasks).set({ dueAt: due, updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
  if (was && was.dueAt?.getTime() !== due.getTime()) await logTaskEvent(taskId, 'task_edited', { fields: [{ key: 'dueAt', label: 'Due date', from: printField('dueAt', was.dueAt), to: printField('dueAt', due) }] })   // (T10)
  const leadId = await leadOfTask(taskId)
  if (leadId) revalidateLead(leadId); else revalidateLeadListings()
}

/** Bulk soft delete — one statement; SQLite evaluates SET against the pre-update row. */
export async function deleteLeads(leadIds: string[], reason: string): Promise<void | { error: string; projectId: string | null }> {
  await assertCanDelete()   // (REG-607)
  if (leadIds.length === 0) return
  const held = await leadsWithProjects(leadIds)   // (Projects round 7, Q-27) the whole delete refuses, so nothing half-happens
  if (held.n) return projectRefusal(leadIds, held)
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: sql`stage` })
    .where(and(inArray(leads.id, leadIds), isNull(leads.deletedAt)))
  revalidateEveryLead()   // (REG-286) a bulk op touches many leads: one layout revalidate beats a path per lead per tab
}

/** Bulk restore — returns how many leads were actually still in the trash. */
export async function restoreLeads(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0
  const res = await db.update(leads)
    .set({ deletedAt: null, deleteReason: null, stage: sql`coalesce(stage_before_delete, stage)`, stageBeforeDelete: null })
    .where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt)))
  revalidateEveryLead()   // (REG-286)
  return res.rowsAffected
}

/** Permanent removal (Deleted Leads → Delete Forever / Empty Trash).
 *  Resolves the target set SERVER-SIDE to leads still in the trash, so a stale
 *  client snapshot (Undo/Restore raced, another tab) can never purge a live lead. */
/**
 * (fix-E, E-01 · E-09) Deleted Leads purges only what it lists — never a direct project's client record (that leaves with its project, from
 * Deleted Projects) — and never a lead whose project still exists: a live one (delete the project first, Q-27) or one in Deleted Projects
 * (`projects.lead_id` cascades, so purging the lead took the project with it, unseen). Those stay, and the answer names them; the rest go.
 */
async function purgeListed(leadIds: string[]): Promise<{ removed: number; kept: KeptLead[] }> {
  const { projects } = await import('@/lib/db/schema')
  const listed = leadIds.length ? await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt), eq(leads.direct, false))) : []
  if (!listed.length) return { removed: 0, kept: [] }
  const projs = await db.select({ id: projects.id, leadId: projects.leadId, number: projects.number, deletedAt: projects.deletedAt }).from(projects).where(inArray(projects.leadId, listed.map((l) => l.id)))
  const kept: KeptLead[] = []
  const free: string[] = []
  for (const l of listed) {
    const p = projs.find((x) => x.leadId === l.id)
    if (p) kept.push({ name: titleCaseName(l.name), projectId: p.id, number: p.number, deleted: !!p.deletedAt })
    else free.push(l.id)
  }
  const removed = await purgeLeads(free)
  revalidateEveryLead()   // (REG-286)
  return { removed, kept }
}

export async function deleteForever(leadIds: string[]): Promise<{ removed: number; kept: KeptLead[] }> {
  await assertCanDelete()   // (REG-607)
  return purgeListed([...new Set(leadIds)].filter((id) => typeof id === 'string' && id).slice(0, 2000))
}

export async function emptyTrash(): Promise<{ removed: number; kept: KeptLead[] }> {
  await assertCanDelete()   // (REG-607)
  const gone = await db.select({ id: leads.id }).from(leads).where(and(isNotNull(leads.deletedAt), eq(leads.direct, false)))   // (fix-E, E-01) what Deleted Leads lists
  return purgeListed(gone.map((g) => g.id))
}

export type ImportDestination = 'listing' | 'review'
/** `batchSource` (UX audit L4): step 2's one lead source for the whole file — every row gets it. */
type ImportPayloadInput = { fileName: string; headers: string[]; mapping: (string | null)[]; rows: string[][]; destination?: ImportDestination; batchSource?: string | null }

/** Import wizard step 3 → 4: persists the batch + every row into the review
 *  queue (M8). Rows without a Lead Name are skipped; phone/email matches
 *  against live leads (or earlier rows in the file) are flagged as duplicates.
 *  (UX audit L4) Each row is READ as it is stored (lib/leads/import-values.ts): k / m amounts, property types, sources, stages and districts
 *  by their synonyms — the queue and the leads hold the values the lead gets, and what didn't land as typed comes back counted (`adjusted`),
 *  listed (`changes`, the first 50) and written on the import's history line. (L5) `leadIds` = the leads the listing destination added,
 *  for the last step's "Assign these n". */
export async function importLeads(input: ImportPayloadInput): Promise<{
  importId: string; total: number; imported: number; skipped: number; duplicates: number
  destination: ImportDestination; approved: number; flagged: number
  adjusted: AdjustedCount[]; changes: ImportAdjustment[]; leadIds: string[]
}> {
  const { imports, importRows } = await import('@/lib/db/schema')
  const studioSources = (await fetchLeadSources()).sources.map((s) => s.name)
  /* The batch's one source must be one of the studio's; anything else is ignored and each row keeps its own. */
  const batchSource = input.batchSource ? studioSources.find((s) => s === input.batchSource) ?? null : null
  const allChanges: ImportAdjustment[] = []
  const existing = await db.select({ id: leads.id, phone: leads.phone, email: leads.email }).from(leads).where(isNull(leads.deletedAt))
  const byPhone = new Map<string, string>()
  const byEmail = new Map<string, string>()
  for (const l of existing) {
    if (l.phone) byPhone.set(phoneDigits(l.phone), l.id)
    if (l.email) byEmail.set(l.email.trim().toLowerCase(), l.id)
  }
  const importId = randomUUID()
  const now = new Date()
  const rowsOut: { id: string; importId: string; data: Record<string, string>; status: string; duplicateOfLeadId: string | null; matchedOn: string | null }[] = []
  let skipped = 0, duplicates = 0
  const seenPhone = new Set<string>(), seenEmail = new Set<string>()
  // Rows already waiting for review count as seen, so a re-import is flagged instead of queued twice.
  const queued = await db.select({ data: importRows.data }).from(importRows).where(inArray(importRows.status, ['pending', 'duplicate']))
  for (const qd of queued) {
    const d = qd.data as Record<string, string>
    const p = phoneDigits(d['Lead Phone Number'] ?? ''); if (p) seenPhone.add(p)
    const e = (d['Lead Email'] ?? '').trim().toLowerCase(); if (e) seenEmail.add(e)
  }
  for (const [rowIndex, raw] of input.rows.entries()) {
    const typedRec: Record<string, string> = {}
    input.mapping.forEach((f, i) => { if (f && f !== 'Ignore') typedRec[f] = (raw[i] ?? '').trim() })
    const name = typedRec['Lead Name'] ?? ''
    if (!name) {
      skipped++
      rowsOut.push({ id: randomUUID(), importId, data: { ...typedRec, __reason: 'Missing Lead Name' }, status: 'skipped', duplicateOfLeadId: null, matchedOn: null })
      continue
    }
    /* (UX audit L4) The row as the lead will hold it; what the file said for a changed cell rides along under `__typed`. */
    const { record: rec, changes } = readImportRecord(typedRec, studioSources, batchSource)
    if (changes.length) {
      rec.__typed = JSON.stringify(Object.fromEntries(changes.map((c) => [c.field, c.typed])))
      for (const c of changes) allChanges.push({ ...c, row: rowIndex + 1, name: titleCaseName(name) })
    }
    const phone = phoneDigits(rec['Lead Phone Number'] ?? '')
    if (rec['Lead Phone Number'] !== undefined) rec['Lead Phone Number'] = phone
    const email = (rec['Lead Email'] ?? '').toLowerCase()
    let dupOf: string | null = null, matchedOn: string | null = null
    if (phone && (byPhone.has(phone) || seenPhone.has(phone))) { dupOf = byPhone.get(phone) ?? null; matchedOn = 'phone' }
    else if (email && (byEmail.has(email) || seenEmail.has(email))) { dupOf = byEmail.get(email) ?? null; matchedOn = 'email' }
    if (phone) seenPhone.add(phone)
    if (email) seenEmail.add(email)
    if (matchedOn) duplicates++
    rowsOut.push({ id: randomUUID(), importId, data: rec, status: matchedOn ? 'duplicate' : 'pending', duplicateOfLeadId: dupOf, matchedOn })
  }
  const total = input.rows.length
  const imported = total - skipped
  const adjusted = countChanges(allChanges)
  const phrase = adjustedPhrase(adjusted)
  // One transaction, chunked rows (500 × 6 params ≪ SQLite's 32,766 cap): no orphan batch on failure.
  await db.transaction(async (tx) => {
    await tx.insert(imports).values({
      id: importId, fileName: input.fileName, totalRows: total, importedRows: imported, skippedRows: skipped,
      /* (UX audit L4) The history line says what the reader changed, beside what it skipped. */
      errorNote: [skipped ? `${skipped} error${skipped === 1 ? '' : 's'} detected across ${skipped} skipped lead${skipped === 1 ? '' : 's'}` : '', phrase ? `${phrase} adjusted` : ''].filter(Boolean).join(' · ') || null,
      createdAt: now,
    })
    const CHUNK = 500
    for (let i = 0; i < rowsOut.length; i += CHUNK) {
      await tx.insert(importRows).values(rowsOut.slice(i, i + CHUNK))
    }
  })
  // "Add to my lead listing": clean rows go straight in as leads; duplicates stay in the review queue.
  const destination: ImportDestination = input.destination ?? 'review'
  let approved = 0, flagged = 0
  let leadIds: string[] = []
  if (destination === 'listing') {
    const pending = await db.select({ id: importRows.id }).from(importRows).where(and(eq(importRows.importId, importId), eq(importRows.status, 'pending')))
    const res = await approveImportRows(pending.map((r) => r.id))
    approved = res.approved; flagged = res.flagged; leadIds = res.leadIds
  }
  revalidateLeadListings()   // (REG-286) Qanvast Ops lists imported Qanvast leads too
  revalidatePath('/leads/imports')
  return { importId, total, imported, skipped, duplicates, destination, approved, flagged, adjusted, changes: allChanges.slice(0, 50), leadIds }
}

/* ---------- Review imported leads (M8) ---------- */

/** Imported row → lead columns; enum values outside the vocabulary fall back to 'Others' / 'New'.
 *  (UX audit L4) Through the import's one reader (lib/leads/import-values.ts), so a row queued before the reader existed — "S$80k",
 *  "4rm HDB" — is read the way a new import is: k / m amounts, synonyms onto the vocabulary. A value already read passes through unchanged. */
async function leadFromImport(data: Record<string, string>) {
  const { KEY_COLLECTION_OPTIONS } = await import('@/lib/leads/enums')
  const now = new Date()
  const budget = readAmount(data['Estimated Budget (S$)'] ?? '').value
  const startDate = readDate(data['Estimated Start Date'] ?? '').value
  const areaSize = readArea(data['Area Size'] ?? '').value
  return {
    name: titleCaseName(data['Lead Name'] ?? ''),   // (REG-329) imported in any case, saved as "Farah Ahmad"
    phone: phoneDigits(data['Lead Phone Number'] ?? ''),
    email: (data['Lead Email'] ?? '').trim() || null,
    source: readSource(data['Lead Source'] ?? '', (await fetchLeadSources()).sources.map((s) => s.name)) ?? 'Others',   // (REG-599) the studio's list, retired names included so an old export still maps
    stage: readStage(data['Lead Stage'] ?? '') ?? 'New',   // the full vocabulary: STAGES is active-only, so an imported 'On Hold' / 'Lost' row landed silently in New
    propertyType: readPropertyType(data['Property Type'] ?? '') ?? 'Others',
    propertyAddress: (data['Property Address'] ?? '').trim() || null,
    leadAddress: (data['Lead Address'] ?? '').trim() || null,
    budgetMinor: budget && budget > 0 ? budget * 100 : 0,   // 0 = no budget known (the listing shows "--", UX audit L8)
    // (REG-287) The STRICT shared parser. The `parseDMY` copy that stood here accepted 32/13/2026 and rolled it into
    // a real Date, so a CSV could put a date on a lead that no field in the UI would ever have taken.
    estimatedStartDate: parseInputDate(startDate),
    style: (data['Style'] ?? '').trim() || null,
    // (REG-607) The key-collection vocabulary is 1.0's five since the parity round; an old sheet's "Not yet collected" reads as "Later".
    keyCollection: (() => { const raw = (data['Key Collection'] ?? '').trim(); if (!raw) return null; if (/^not yet/i.test(raw)) return 'Later'; return KEY_COLLECTION_OPTIONS.find((k) => k.toLowerCase() === raw.toLowerCase()) ?? raw })(),
    condition: (data['Condition'] ?? '').trim() || null,
    areaSqft: areaSize || null,
    notes: (data['Remarks'] ?? '').trim() || null,   // the import vocabulary's Remarks (REG-266); the DB column stays `notes`
    area: readDistrict(data['District'] ?? '') ?? null,   // (REG-607) 1.0's Area / District
    createdAt: now, updatedAt: now,
  }
}

/** Approve → real leads (also used by 'Keep Both', which approves a 'duplicate' row deliberately).
 *  Pending rows are RE-MATCHED against live leads at approval time: a lead created since the
 *  import (or by an earlier row in this batch) turns the row into a duplicate instead of a twin. */
export async function approveImportRows(rowIds: string[]): Promise<{ approved: number; flagged: number; leadIds: string[] }> {
  if (rowIds.length === 0) return { approved: 0, flagged: 0, leadIds: [] }
  const arrivals: { id: string; name: string; source: string }[] = []   /* (REG-604) */
  const { importRows } = await import('@/lib/db/schema')
  let approved = 0, flagged = 0
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(importRows)
      .where(and(inArray(importRows.id, rowIds), inArray(importRows.status, ['pending', 'duplicate'])))
    const live = await tx.select({ id: leads.id, phone: leads.phone, email: leads.email }).from(leads).where(isNull(leads.deletedAt))
    const byPhone = new Map<string, string>(), byEmail = new Map<string, string>()
    for (const l of live) {
      if (l.phone) byPhone.set(phoneDigits(l.phone), l.id)
      if (l.email) byEmail.set(l.email.trim().toLowerCase(), l.id)
    }
    for (const r of rows) {
      const cols = await leadFromImport(r.data as Record<string, string>)
      if (!cols.name) continue
      if (r.status === 'pending') {
        const hitPhone = cols.phone ? byPhone.get(cols.phone) : undefined
        const hitEmail = cols.email ? byEmail.get(cols.email.toLowerCase()) : undefined
        if (hitPhone || hitEmail) {
          await tx.update(importRows)
            .set({ status: 'duplicate', duplicateOfLeadId: hitPhone ?? hitEmail ?? null, matchedOn: hitPhone ? 'phone' : 'email' })
            .where(eq(importRows.id, r.id))
          flagged++
          continue
        }
      }
      const id = randomUUID()
      await tx.insert(leads).values({ id, ...cols })
      arrivals.push({ id, name: cols.name, source: cols.source })
      if (cols.phone) byPhone.set(cols.phone, id)
      if (cols.email) byEmail.set(cols.email.toLowerCase(), id)
      await tx.update(importRows).set({ status: 'approved' }).where(eq(importRows.id, r.id))
      approved++
    }
  })
  /* (REG-604) Every lead that just arrived through an import or the capture reaches the Owners and Admins. */
  if (arrivals.length) { const runners = await leadDeskIds(); for (const a of arrivals.slice(0, 20)) await notify('new_lead', runners,   /* (S44O — C6) the lead desk hears it too */ { title: `New lead: ${titleCaseName(a.name)}`, body: a.source, href: `/leads/${a.id}`, leadId: a.id, actorId: null }) }
  revalidateLeadListings()   // (REG-286)
  return { approved, flagged, leadIds: arrivals.map((a) => a.id) }   /* (UX audit L5) the new leads, for the import's "Assign these n" */
}

export async function rejectImportRows(rowIds: string[]): Promise<number> {
  if (rowIds.length === 0) return 0
  const { importRows } = await import('@/lib/db/schema')
  const res = await db.update(importRows).set({ status: 'rejected' })
    .where(and(inArray(importRows.id, rowIds), inArray(importRows.status, ['pending', 'duplicate'])))
  revalidateLeadListings()   // (REG-286)
  return res.rowsAffected
}

/** Merge a duplicate into its existing lead: fields where the reviewer picked 'new' overwrite the existing lead. */
export async function mergeImportRow(rowId: string, picks: Record<string, 'existing' | 'new'>): Promise<boolean> {
  const { importRows } = await import('@/lib/db/schema')
  const [row] = await db.select().from(importRows).where(eq(importRows.id, rowId)).limit(1)
  if (!row || !row.duplicateOfLeadId || !['pending', 'duplicate'].includes(row.status)) return false
  // Server-side re-validation: never merge into a trashed lead (client snapshot may be stale).
  const [existing] = await db.select().from(leads).where(and(eq(leads.id, row.duplicateOfLeadId), isNull(leads.deletedAt))).limit(1)
  if (!existing) return false
  const incoming = await leadFromImport(row.data as Record<string, string>)
  const patch: Record<string, unknown> = {}
  const map: Record<string, keyof typeof incoming> = {
    'Lead name': 'name', Phone: 'phone', Email: 'email', 'Budget (S$)': 'budgetMinor',
    Source: 'source', 'Property type': 'propertyType', Address: 'propertyAddress',
    /* (REG-609, parity I-04) the rest of the mapped fields — the review sheet's merge table lists them all */
    District: 'area', 'Lead address': 'leadAddress', Condition: 'condition', Style: 'style', 'Area size': 'areaSqft',
    'Key collection': 'keyCollection', 'Start date': 'estimatedStartDate', Remarks: 'notes',
  }
  const empty = (v: unknown) => v === '' || v === null || v === undefined || v === 0
  for (const [label, choice] of Object.entries(picks)) {
    const key = map[label]
    if (!key || choice !== 'new' || key === 'notes') continue   // Remarks are appended below, never swapped
    const v = incoming[key]
    // An empty incoming value never overwrites a real one.
    if (empty(v)) continue
    patch[key] = v
  }
  /* (REG-609, parity I-04) 1.0's merge fills every field the original lacks from the duplicate; the radios only settle the
     ones both sides carry. The sheet's Merged result column shows the same rule (existing, else new). */
  for (const key of Object.values(map)) {
    if (key === 'notes' || key in patch) continue
    const v = incoming[key]
    if (empty(v) || !empty((existing as Record<string, unknown>)[key])) continue
    patch[key] = v
  }
  // The mock promises the other phone is "kept as alt": keep it (and any import notes) in Notes.
  const keptPhone = picks.Phone === 'new' && incoming.phone ? incoming.phone : existing.phone
  const altPhone = keptPhone === existing.phone ? incoming.phone : existing.phone
  const noteBits: string[] = []
  if (altPhone && keptPhone && altPhone !== keptPhone) noteBits.push(`Alt phone: ${altPhone}`)
  if (incoming.notes && incoming.notes !== existing.notes) noteBits.push(incoming.notes)
  if (noteBits.length) patch.notes = [existing.notes, ...noteBits].filter(Boolean).join('\n')
  await db.transaction(async (tx) => {
    if (Object.keys(patch).length) await tx.update(leads).set({ ...patch, updatedAt: new Date() }).where(eq(leads.id, existing.id))
    await tx.update(importRows).set({ status: 'merged' }).where(eq(importRows.id, rowId))
  })
  revalidateLead(existing.id)
  return true
}

/** Flexible stage movement (and linear moves backwards / out of On Hold): the lead moves at once; no details are captured. */
export async function quickMoveStage(input: { leadId: string; fromStage: string; toStage: string }): Promise<{ logId: string } | { error: string }> {
  assertStage(input.fromStage, input.toStage)   // (REG-286)
  { const byRole = roleStageBlock((await fetchViewer()).role, input.toStage); if (byRole) return { error: byRole } }   // (S44O — call C6)
  const held = await projectHoldFor(input.leadId, input.toStage)   // (fix-E, A-01)
  if (held) return { error: held }
  const nobody = await teamNeededFor(input.leadId, input.toStage)   // (S42F)
  if (nobody) return { error: nobody }
  const { leads, stageLogs } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  const logId = uuid()
  const me = await sessionMemberId()   // (pending modules S43A) read before the transaction
  // (REG-286) Atomic, like moveStage: the stage and the log that lets Undo take it back are one fact — half of it
  // is a lead that moved with no way home.
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ stage: input.toStage, updatedAt: now }).where(eq(leads.id, input.leadId))
    await tx.insert(stageLogs).values({
      id: logId, leadId: input.leadId, fromStage: input.fromStage, toStage: input.toStage,
      payload: { quick: true }, createdAt: now, movedBy: me,   // (parity P-13)
    })
  })
  await notifyStageChange(input.leadId, input.fromStage, input.toStage, null)   /* (REG-608) */
  if (input.toStage === 'Won') await ensureProjectForLead(input.leadId, { at: now })   // (REG-911) Won always makes its project, whatever path reached it
  revalidateLead(input.leadId)
  return { logId }
}

/** Snackbar Undo for a quick move: the lead returns to where it was and the move leaves no trace in its journey. */
export async function undoStageMove(input: { leadId: string; logId: string; toStage: string }): Promise<void | { error: string }> {
  assertStage(input.toStage)   // (REG-286)
  const held = await projectHoldFor(input.leadId, input.toStage)   // (fix-E, A-01) an Undo never parks a lead whose project is live
  if (held) return { error: held }
  const { leads, stageLogs, notifications } = await import('@/lib/db/schema')
  await db.transaction(async (tx) => {   // (REG-286) both halves of the undo, or neither
    const [log] = await tx.select({ createdAt: stageLogs.createdAt }).from(stageLogs).where(eq(stageLogs.id, input.logId)).limit(1)
    await tx.update(leads).set({ stage: input.toStage, updatedAt: new Date() }).where(eq(leads.id, input.leadId))
    await tx.delete(stageLogs).where(eq(stageLogs.id, input.logId))
    /* (REG-608) The move's "stage changed" rows go with its log — an undone move never happened, so nobody should read that it did. */
    if (log) await tx.delete(notifications).where(and(eq(notifications.kind, 'stage_changed'), eq(notifications.leadId, input.leadId), gte(notifications.createdAt, log.createdAt)))
  })
  revalidateLead(input.leadId)
}

/** Corrections to a completed stage (Move stage window, linear movement): the stage's latest log takes the new details. */
export async function updateStageDetails(input: { leadId: string; stage: string; data: unknown }): Promise<{ ok: true } | { error: string }> {
  assertStage(input.stage)   // (REG-286)
  { const byRole = roleStageBlock((await fetchViewer()).role, input.stage); if (byRole) return { error: byRole } }   // (S44O — call C6)
  const incomplete = await stageFieldsRefusal(input.stage, input.data, false)   // (S43B · F1-07) a correction is checked as the window checks it
  if (incomplete) return { error: incomplete }
  const { stageLogs } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const { desc } = await import('drizzle-orm')
  const [latest] = await db.select({ id: stageLogs.id }).from(stageLogs)
    .where(and(eq(stageLogs.leadId, input.leadId), eq(stageLogs.toStage, input.stage)))
    .orderBy(desc(stageLogs.createdAt)).limit(1)
  const won = splitStageFiles(input.data); input = { ...input, data: won.payload }   // (pending modules S03) the PDF kept, never in the log
  if (input.stage === 'Won') await recordWonUpload(input.leadId, input.data, new Date(), won.file)   // (REG-632, contracts parity Q-14)
  if (input.stage === 'Quote Sent') await keepQuoteSentUpload(input.leadId, input.data, won.quoteFile, new Date())   // (pending modules S05)
  if (input.stage === 'Won' && won.wonQuoteFile) {   // (pending modules S05) a corrected Won step's new upload, kept with its bytes once the project names it
    const d = input.data as { wonQuoteTab?: string; wonQuoteUploaded?: string | null }
    if (d.wonQuoteTab === 'upload' && d.wonQuoteUploaded) { const { fileWonQuote } = await import('@/lib/projects/create'); await fileWonQuote(input.leadId, d.wonQuoteUploaded, new Date(), won.wonQuoteFile) }
  }
  if (input.stage === 'Quote Sent') await stampQuoteSent(input.leadId, input.data)   // (UX audit 2026-09-30, Q1) a corrected pick is the quote that went
  if (input.stage === 'Contacted') await planFromContactLog(input.leadId, input.data, new Date())   // (pending modules S23) a log added with an in-person next step plans it too
  if (latest) {
    await db.update(stageLogs).set({ payload: input.data as object }).where(eq(stageLogs.id, latest.id))
  } else {
    // A stage the lead reached before any log existed (seeded data): record the details against it.
    await db.insert(stageLogs).values({
      id: uuid(), leadId: input.leadId, fromStage: input.stage, toStage: input.stage,
      payload: input.data as object, createdAt: new Date(), movedBy: await sessionMemberId(),   // (parity P-13) who recorded the details
    })
  }
  revalidateLead(input.leadId)
  return { ok: true }
}

/**
 * (S43B · F1-07 — her "fix all the pending things" 2026-10-15, as recommended; S05's note for the developers: the server took the window's
 * payload as sent) A stage's fields checked on the server with the window's own `validateStage` and the studio's two asks (Settings › Lead
 * management › Lead stages) — the same rule the window applies: the next call or meeting is asked for only on the way INTO Contacted, never on a
 * correction of a stage passed long ago; the signed contract on every Won save. On Hold and Lost carry their own reason, not a step's fields.
 * The refusal is the house's `{ error }`, named by its field (`stageRefusal`); the window never sends one, a bypassed client does.
 */
async function stageFieldsRefusal(stage: string, payload: unknown, entering: boolean): Promise<string | null> {
  const { isWizardPayload, stageRefusal, validateStage } = await import('@/lib/leads/stage-data')
  if (!isActiveStage(stage as Stage) || !isWizardPayload(payload)) return null
  const asks = await fetchStageAsks()
  return stageRefusal(stage as Stage, validateStage(stage as Stage, payload, { wonContract: asks.wonContract, contactNextStep: entering && stage === 'Contacted' ? asks.contactNextStep : false }))
}

/** The left band marks a lead nobody has opened or clicked yet (user 2026-08-29); the first interaction clears it. */
export async function markLeadSeen(leadId: string): Promise<void> {
  const { leads } = await import('@/lib/db/schema')
  await db.update(leads).set({ seenAt: new Date() }).where(and(eq(leads.id, leadId), isNull(leads.seenAt)))
  revalidatePath('/leads')
}

/** (S42 audit A-17) How many studios were started on this prototype — Reset's confirmation says they go too. */
export async function prototypeStudioCount(): Promise<number> {
  const { madeStudioKeys } = await import('@/lib/studios/registry')
  return (await madeStudioKeys()).length
}

/** Maison AI › "Reset prototype": every table back to fixtures/baseline.json (user 2026-08-29). */
export async function resetPrototype(): Promise<{ rows: number }> {
  /* (pending modules S31) the base is the demo studio alone: the demo opens again and the studios started on this prototype go */
  const { clearPrototypeStudios } = await import('@/lib/studios/registry')
  await clearPrototypeStudios()
  /* (pending modules S41b-3) …and keeps no visitor's free-trial work: the website's no-account workspaces go, with this browser's name for one */
  const { trialStore } = await import('@/lib/trial/store')
  await trialStore().clear().catch(() => 0)
  const { forgetWorkspaceCookie } = await import('@/lib/trial/server')
  await forgetWorkspaceCookie()
  const { restoreBaseline } = await import('@/lib/db/baseline')
  const r = await restoreBaseline()
  /* (pending modules S30) the base state is Dane signed in: this browser forgets any sign-in or sign-out of its own (the sessions' records
     went with the reset) and is the demo's own session again */
  const { clearStudioCookies } = await import('@/lib/auth/session')
  await clearStudioCookies()
  // (REG-286) Every table changed, so every cached page is wrong — including the lead detail routes, which the old
  // three paths never named and `staleTimes.dynamic = 300` then served for five minutes after a reset.
  revalidatePath('/', 'layout')
  return { rows: r.rows }
}

/**
 * (pending modules S23) A contact log whose next step is to meet in person (REG-319's schedule pair, mode "In person") plans that meeting: it
 * lists under the lead's Meetings, ready for its prep and the co-pilot, and the reminder task the step already raised ("Meet the client on …")
 * becomes the meeting's reminder — one meeting, one reminder, nothing typed twice. A time already planned is never planned again.
 */
async function planFromContactLog(leadId: string, payload: unknown, at: Date): Promise<{ id: string; at: number } | null> {
  const { isWizardPayload } = await import('@/lib/leads/stage-data')
  if (!isWizardPayload(payload)) return null
  const { inPersonNext, planInPerson } = await import('@/lib/meetings/plan-from-log')
  const { parseInputDateTime } = await import('@/lib/format')
  const next = inPersonNext(payload)
  const when = next ? parseInputDateTime(next) : null
  const id = await planInPerson(leadId, when, at)   // the callers revalidate the lead (its Meetings tab with it)
  return id && when ? { id, at: when.getTime() } : null
}
