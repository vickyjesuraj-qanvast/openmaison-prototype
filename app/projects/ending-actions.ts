'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, gte, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadEvents, leads, members, notifications, projects, quotes, scheduleTemplates, settings, type Project } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { revalidateEveryLead, revalidateLead } from '@/lib/leads/queries'
import { dropLeadEvents } from '@/lib/leads/events'
import { titleCaseName } from '@/lib/format'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { logProjectEvent } from '@/lib/projects/events'
import { carryLeadFloorPlans, carryLeadLayouts, ensureProjectForLead, markNumberGiven } from '@/lib/projects/create'
import { CHANGE_RULE, mayChangeProject, seesMoney } from '@/lib/projects/policy'
import { closingSummaryOf, fetchHandoverRules, handoverFactsOf, moneyRecordedOn } from '@/lib/projects/handover'
import {
  ANYWAY_RULE, DELETE_RULE, HANDOVER_RULES_KEY, REOPEN_RULE, REVIEW_RULE, SCHEDULE_DEFAULTS_KEY, SETTINGS_RULE, checklistMet, completesAnyway, completesAtOnce,
  deleteBlock, deletesProject, handoverChecklist, openItemsOf, remakeRefusal, reopensProject, reviewsHandover, type ChecklistItem, type HandoverRules, type ScheduleDefaults,
  allDeferred, deferralsOf, deferredReason, parseDeferred, type ClosingSummary, type DeferredItem,   // (gaps build, package A)
  type FixViewer,   // (simplify S-19)
} from '@/lib/projects/handover-model'
import { workspaceRefusal, offWorkspace } from '@/lib/settings/desk'   // (S45C) the workspace's role rule
/* (simplify S-19 · Q-15) the Hand over sheet's in-place fixes follow money's and the updates' own rules; the client's facts for Tell */
import { fetchInvoiceRules } from '@/lib/projects/money-queries'
import { sendsAtOnce } from '@/lib/projects/invoices-model'
import { fetchUpdateReviewers } from '@/lib/projects/updates'
import { mayReviewUpdate } from '@/lib/projects/updates-model'
import { clientTellFacts, type ClientTellFacts } from '@/lib/projects/schedule-moments'
import { tellClientEvent } from '@/lib/portal/client-tells'   // (simplify Q-13) handed over
/* (simplify round 2, R2-C) "handed over" waits out Q-15's Undo (held in the outbox); the Undo — or a Reopen inside it — deletes it */
import { cancelHeldEvent, cancelHeldMessages, holdClientMail } from '@/lib/notifications/delivery'
import type { HeldMail } from '@/lib/notifications/held'
import { runsStudio } from '@/lib/leads/assign-policy'
import { holdOf } from '@/lib/projects/hold'   // (parity P-36)
import { STAGE_LABEL, TEAM_NEEDED, type ProjectStage } from '@/lib/projects/model'
import { purgeLeads } from '@/lib/leads/purge'   // (fix-E, E-01)
import { afterProjectCompleted } from '@/lib/finance/commission-close'   // (parity map, FB-055) P-C's
import { leadTasks } from '@/lib/db/schema'
import { PROJECT_START_KEY, parseProjectStart, type ProjectStartRule } from '@/lib/projects/start-rule'   // (S44R, C7)
import { completionLetterFor, issueCompletionLetter, withdrawCompletionLetter, type IssuedLetter, type LetterSent, type LetterTemplate } from '@/lib/projects/completion-letter'   // (S44R, C9)
import { createContractDoc } from '@/app/contracts/actions'
import { orThrow } from '@/lib/company/template-rules'   // (S44Z) the editors' answers, a refusal thrown on

/*
 * (Projects round 7 — Q-24 · Q-26 · Q-27) A project's ending on the server: Complete handover with its checklist and the owner's review,
 * Reopen, the soft Delete with Restore and Delete forever, Make the project again for a Won lead whose project was deleted, and the two
 * settings this round adds. Who sees a project is its lead's rule (`canOpenLead`); who hands it over is the project's team; who reviews,
 * completes anyway, reopens and deletes is an Owner or an Admin (lib/projects/handover-model.ts — Settings › Who may do what reads the same
 * functions). Every refusal answers `{ error: <the rule> }`; every step writes its `project_…` event, so Activity keeps the whole trail.
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x
const clean = (s: string | null | undefined, max: number) => (s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const REASON_MAX = 300

type Ctx = { p: Project; lead: { id: string; name: string; direct: boolean; deletedAt: Date | null; stage: string }; viewer: Awaited<ReturnType<typeof fetchViewer>>; team: string[] }
/** The project (deleted ones only when asked), its lead and team, after the viewer may see it. */
async function forProject(projectId: string, o: { deleted?: boolean } = {}): Promise<Ctx | Refusal> {
  const [row] = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), o.deleted ? isNotNull(projects.deletedAt) : isNull(projects.deletedAt))).limit(1)
  if (!row || (!o.deleted && row.l.deletedAt)) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.l.id))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.l.id))).map((r) => r.memberId)
  return { p: row.p, lead: { id: row.l.id, name: titleCaseName(row.l.name), direct: row.l.direct, deletedAt: row.l.deletedAt, stage: row.l.stage }, viewer, team }
}
function touch(projectId: string, leadId: string) {
  revalidatePath('/projects', 'layout')
  revalidatePath(`/projects/${projectId}`)
  revalidateLead(leadId)
}
const ev = (c: Ctx) => ({ name: c.p.name, number: c.p.number })
const nameOf = async (id: string | null) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1))[0]?.name ?? 'Someone' : 'Someone')
const href = (projectId: string) => `/projects/${projectId}`

async function checklistOf(c: Ctx, viewer?: FixViewer): Promise<ChecklistItem[]> {
  return handoverChecklist(await handoverFactsOf(c.p, c.lead.name, Date.now(), { figures: runsStudio(c.viewer.role) }), viewer)   // (parity map, PR-121) the vendors' sum for Owners and Admins
}

/* ── Complete handover (Q-24) ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export type HandoverRead = {
  project: { id: string; name: string; number: string; stage: string; client: string; /** (simplify S-19) Remind's record */ leadId?: string }
  items: ChecklistItem[]
  met: boolean
  rules: HandoverRules
  /** `atOnce`: this viewer's handover completes now (else it waits for review); `runs`: an Owner or an Admin. */
  viewer: { runs: boolean; atOnce: boolean }
  request: { by: string; at: number; note: string | null; mine: boolean; /** (gaps build, package A) the asker's deferrals */ deferred?: DeferredItem[] } | null
  /** (gaps build, package A) The closing summary to today — money only for whoever sees it (F-17). */
  summary?: ClosingSummary
  /** (simplify S-19) The client, for the sheet's ☑ Tell {client} it's handed over and its Remind — null when they can't be messaged. */
  client?: ClientTellFacts | null
  /** (simplify round 2, R2-C) When the team last reminded the client of a waiting item, by the portal need's key (`stage:<milestone>` …) — the
      Invite to Portal panel's and With {client}'s own map (lib/portal/access.ts), so "reminded …" reads the same wherever the need shows. */
  reminded?: Record<string, number>
  /** (S44R — UAT row 359, call C9) the studio's handover template (Company › Templates › Contracts › Use at handover) and the letter this
      project already has — the sheet offers "Send {client} the completion letter" with it */
  letter?: { template: LetterTemplate; sent: LetterSent | null } | null
}

/** The handover dialog's data: the checklist as the records stand now, and what this viewer's press will do. The project's team only. */
export async function readHandover(projectId: string): Promise<HandoverRead | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  /* (simplify S-19) who presses decides what the sheet fixes in place: an invoice sent or submitted (money's rule — only for whoever sees
     money), an update approved here or left to its reviewers */
  const money = seesMoney(c.viewer, c.team)
  const [invoiceRules, reviewers] = await Promise.all([fetchInvoiceRules(), fetchUpdateReviewers()])
  const fixer: FixViewer = { sends: sendsAtOnce(c.viewer.role, invoiceRules), approvesUpdates: mayReviewUpdate(c.viewer.role, { id: c.viewer.id, reviewers }) }
  const [raw, rules, summary, client, reminders] = await Promise.all([checklistOf(c, fixer), fetchHandoverRules(), closingSummaryOf(c.p, { withMoney: money }), clientTellFacts(c.lead.id),
    db.select({ at: leadEvents.at, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, c.lead.id), eq(leadEvents.kind, 'portal_reminded')))])   // (simplify round 2, R2-C)
  const items = money ? raw : raw.map((i) => (i.key === 'money' || i.key === 'refund' ? { ...i, fixes: undefined } : i))
  const pending = !!c.p.handoverRequestedAt
  return {
    summary, client,
    project: { id: c.p.id, name: c.p.name, number: c.p.number, stage: c.p.stage, client: c.lead.name, leadId: c.lead.id },
    items, met: checklistMet(items), rules,
    viewer: { runs: runsStudio(c.viewer.role), atOnce: completesAtOnce(c.viewer.role, rules) },
    request: pending ? { by: await nameOf(c.p.handoverRequestedBy), at: c.p.handoverRequestedAt!.getTime(), note: c.p.handoverNote, mine: c.p.handoverRequestedBy === c.viewer.id, deferred: deferralsOf(items, parseDeferred(c.p.handoverDeferred)) } : null,
    reminded: reminders.reduce<Record<string, number>>((m, r) => { const key = (r.detail as { id?: string } | null)?.id; if (key) m[key] = Math.max(m[key] ?? 0, r.at.getTime()); return m }, {}),   // (simplify round 2, R2-C) access.ts's own fold
    letter: await completionLetterFor(c.lead.id),   // (S44R, C9)
  }
}
/** (S44R — UAT row 359, call C9) The sheet's ask: the completion letter, its defects period and whether the client signs it or reads it. */
export type LetterAsk = { months: number; toRead: boolean }
const letterAskOf = (x: unknown): LetterAsk | null => {
  const o = x && typeof x === 'object' ? x as { months?: unknown; toRead?: unknown } : null
  return o ? { months: typeof o.months === 'number' && Number.isFinite(o.months) ? o.months : 12, toRead: o.toRead === true } : null
}
/** The letter, made and sent with the press that completed the project — never a reason the completion fails. */
async function sendLetter(c: Ctx, ask: LetterAsk | null, by: string): Promise<IssuedLetter | null> {
  if (!ask) return null
  try { return await issueCompletionLetter({ leadId: c.lead.id, at: new Date(), months: ask.months, toRead: ask.toRead, by, makeDoc: (leadId, templateId) => orThrow(createContractDoc({ leadId, templateId })) }) }   // (S44Z) the editors' refusal thrown on
  catch { return null }
}

/** (fix-E, E-04) A handover's review rows in every approver's bell go once the request is answered — approved, sent back, completed over
    it, taken back or reopened past it — as an invoice's review rows do (money-actions). */
const clearReviewRows = (projectId: string) => db.delete(notifications).where(and(eq(notifications.kind, 'handover_review'), eq(notifications.href, href(projectId))))

/** Completed: the stage, who, the note, why with items open; any request answered. (fix-E, E-03) The open items are kept as they stood
    open ("4 milestones not done"); (E-04) the review rows go; (E-20) the project's team hears it — all but whoever pressed and whoever asked
    (the asker hears "approved"). */
/** (simplify Q-15) A completion's way back, for the snackbar's life: the request and the hold as they were, its line. */
export type HandoverUndo = { projectId: string; at: number
  before: { requestedBy: string | null; requestedAt: number | null; note: string | null; deferred: unknown; reviewNote: string | null; reviewedBy: string | null; reviewedAt: number | null
    onHoldAt: number | null; onHoldReason: string | null; onHoldUntil: number | null; onHoldBy: string | null }
  /** (simplify round 2, R2-C) the client's "handed over" email, held for the Undo's minutes — the outbox rows */
  held?: string[]
  /** (parity map, FB-055) the Owners' "Set commission for {project}" task the completion raised — the Undo takes it back */
  commissionTaskId?: string | null
  /** (S44R — UAT row 359, call C9) the completion letter the press sent — the Undo takes it back to Deleted Contracts */
  letterId?: string | null }
const undoOfCompletion = (p: Project, at: number): HandoverUndo => ({ projectId: p.id, at, before: {
  requestedBy: p.handoverRequestedBy, requestedAt: p.handoverRequestedAt?.getTime() ?? null, note: p.handoverNote, deferred: p.handoverDeferred ?? null, reviewNote: p.handoverReviewNote,
  reviewedBy: p.handoverReviewedBy, reviewedAt: p.handoverReviewedAt?.getTime() ?? null, onHoldAt: p.onHoldAt?.getTime() ?? null, onHoldReason: p.onHoldReason, onHoldUntil: p.onHoldUntil, onHoldBy: p.onHoldBy } })
/** How long a completion's Undo holds — the snackbar's life with room to spare; after it, Reopen (an Owner or an Admin) as today. */
const UNDO_MINUTES = 10

async function complete(c: Ctx, items: ChecklistItem[], o: { note: string | null; reason: string | null; requester?: string | null; requesterId?: string | null; deferred?: DeferredItem[] }): Promise<{ held: string[]; commissionTaskId: string | null }> {
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const now = new Date()
  const open = openItemsOf(items)
  /* (gaps build, package A) the deferred items, each with its own reason, stay on the record; with every open item deferred and no other
     reason typed, their reasons are the record's reason. A hold ends with the project. */
  const deferred = open.length ? (o.deferred ?? []) : []
  const reason = open.length ? (o.reason || (deferred.length ? deferredReason(deferred) : null)) : null
  await db.update(projects).set({
    stage: 'completed', completedAt: now, completedBy: stampBy, completeNote: o.note, completeReason: reason, handoverDeferred: deferred.length ? deferred : null,
    handoverRequestedBy: null, handoverRequestedAt: null, handoverNote: null, handoverReviewNote: null, handoverReviewedBy: null, handoverReviewedAt: null,
    onHoldAt: null, onHoldReason: null, onHoldUntil: null, onHoldBy: null, updatedAt: now,
  }).where(and(eq(projects.id, c.p.id), eq(projects.stage, 'in_progress')))
  await logProjectEvent(db, c.lead.id, c.p.id, 'project_completed', { ...ev(c), ...(open.length ? { open, reason: o.reason || null } : {}), ...(deferred.length ? { deferred: deferred.map((d) => ({ item: d.item, reason: d.reason })) } : {}), ...(o.note ? { note: o.note } : {}), ...(o.requester ? { requester: o.requester } : {}) })
  /* (simplify Q-13) the client hears it by their switches — (simplify round 2, R2-C) held for Q-15's Undo, which now takes it back */
  const { held } = await holdClientMail(UNDO_MINUTES * 60_000, () => tellClientEvent('handed_over', { projectId: c.p.id }))
  await clearReviewRows(c.p.id)
  const who = await nameOf(c.viewer.id)
  await notify('project_completed', c.team.filter((id) => id !== o.requesterId), {
    title: `${c.p.name} is completed`, body: open.length ? `${who} completed it with ${open.length === 1 ? 'one item' : `${open.length} items`} open${o.reason ? ` — “${o.reason.replace(/[.!?]+$/, '')}”` : ''}` : `${who} completed the handover`,
    href: href(c.p.id), leadId: c.lead.id, actorId: c.viewer.id,
  })
  /* (parity map, FB-055 — 1.0 D-301) nothing decides its commission (the studio pays none by default and the project has no rule): each Owner
     gets "Set commission for {project}" — P-C's rule, best effort (a completion never fails for it) */
  const commission = await afterProjectCompleted(c.p.id, c.viewer.id)
  return { held: held.ids, commissionTaskId: commission?.taskId ?? null }   // (simplify round 2, R2-C) what the Undo may still take back
}

/**
 * The handover. Met, it completes at once — an Owner's or an Admin's, or the team's while the review is off; with the review on, a Designer's
 * or a Manager's waits for an Owner or an Admin. Items still open: only an Owner or an Admin completes it anyway, with a reason.
 */
export async function completeHandover(projectId: string, input: { note?: string | null; reason?: string | null; /** (gaps build, package A) open items deferred, each with its reason */ deferred?: { key: string; reason: string }[]
  /** (S44R, C9) send the completion letter with it */ letter?: LetterAsk | null } = {}): Promise<{ state: 'completed' | 'requested'; /** (simplify Q-15) */ undo?: HandoverUndo; /** (S44R, C9) */ letter?: IssuedLetter | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  if (c.p.stage === 'completed') return { error: 'This project is already completed' }
  if (c.p.stage !== 'in_progress') return { error: 'Start the project before its handover' }
  const [items, rules] = await Promise.all([checklistOf(c), fetchHandoverRules()])
  const met = checklistMet(items)
  const note = clean(input.note, 500) || null
  const deferred = deferralsOf(items, input.deferred)   // (gaps build, package A) only open items, each with a reason
  /* (fix-E, E-13) A Designer or a Manager with items still open asks an Owner or an Admin to complete it anyway — whatever the review
     setting; the request lands in their bell and Needs my review, and they approve it with a reason. (E-14) A request already waiting
     while the review was switched off since is completed over: `complete` answers it. */
  if (!completesAtOnce(c.viewer.role, rules) || (!met && !completesAnyway(c.viewer.role))) {
    if (c.p.handoverRequestedAt) return { error: 'The handover already waits for review' }
    const now = new Date()
    const open = openItemsOf(items)
    await db.update(projects).set({ handoverRequestedBy: stampBy, handoverRequestedAt: now, handoverNote: note, handoverReviewNote: null, handoverReviewedBy: null, handoverReviewedAt: null, handoverDeferred: deferred.length ? deferred : null, updatedAt: now }).where(eq(projects.id, c.p.id))
    await logProjectEvent(db, c.lead.id, c.p.id, 'project_handover_requested', { ...ev(c), note, ...(open.length ? { open } : {}), ...(deferred.length ? { deferred: deferred.map((d) => ({ item: d.item, reason: d.reason })) } : {}) })
    await notify('handover_review', await studioRunnerIds(), { title: `Handover to review: ${c.p.name}`, body: `${await nameOf(c.viewer.id)} asked to complete ${c.lead.name}’s project${open.length ? ` with ${open.length === 1 ? 'one item' : `${open.length} items`} open` : ''}`, href: href(c.p.id), leadId: c.lead.id, actorId: c.viewer.id })
    touch(c.p.id, c.lead.id)
    return { state: 'requested' }
  }
  const reason = clean(input.reason, REASON_MAX) || null
  if (!met) {
    if (!completesAnyway(c.viewer.role)) return { error: ANYWAY_RULE }
    if (!reason && !allDeferred(items, deferred)) return { error: 'Say why it is completed with items still open' }   // (gaps build, package A) or defer each, with its reason
  }
  const requesterId = c.p.handoverRequestedBy && c.p.handoverRequestedBy !== c.viewer.id ? c.p.handoverRequestedBy : null
  const undo = undoOfCompletion(c.p, Date.now())
  const done = await complete(c, items, { note, reason, requester: requesterId ? await nameOf(requesterId) : null, requesterId, deferred })
  undo.held = done.held; undo.commissionTaskId = done.commissionTaskId
  if (requesterId) await notify('handover_approved', [requesterId], { title: `${c.p.name} is completed`, body: `${await nameOf(c.viewer.id)} completed the handover you asked for`, href: href(c.p.id), leadId: c.lead.id, actorId: c.viewer.id })
  const letter = await sendLetter(c, letterAskOf(input.letter), stampBy)   // (S44R, C9)
  undo.letterId = letter?.id ?? null
  touch(c.p.id, c.lead.id)
  return { state: 'completed', undo, letter }
}

/** An Owner or an Admin approves a handover waiting for review — with a reason when the checklist still has items open. */
export async function approveHandover(projectId: string, input: { reason?: string | null; /** (gaps build, package A) the deferrals as approved (the asker's, or the reviewer's own) */ deferred?: { key: string; reason: string }[]
  /** (S44R, C9) send the completion letter with it */ letter?: LetterAsk | null } = {}): Promise<{ ok: true; /** (simplify Q-15) */ undo?: HandoverUndo; /** (S44R, C9) */ letter?: IssuedLetter | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (S44R) who sends the letter — read before any write
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!reviewsHandover(c.viewer.role)) return { error: REVIEW_RULE }
  if (c.p.stage !== 'in_progress' || !c.p.handoverRequestedAt) return { error: 'No handover waits for review on this project' }
  const items = await checklistOf(c)
  const reason = clean(input.reason, REASON_MAX) || null
  const deferred = deferralsOf(items, input.deferred ?? parseDeferred(c.p.handoverDeferred))   // (gaps build, package A)
  if (!checklistMet(items) && !reason && !allDeferred(items, deferred)) return { error: 'Say why it is completed with items still open' }
  const requesterId = c.p.handoverRequestedBy
  const requester = await nameOf(requesterId)
  const undo = undoOfCompletion(c.p, Date.now())
  const done = await complete(c, items, { note: c.p.handoverNote, reason, requester, requesterId, deferred })   // (fix-E, E-04) answers every approver's review row
  undo.held = done.held; undo.commissionTaskId = done.commissionTaskId
  if (requesterId) await notify('handover_approved', [requesterId], { title: `${c.p.name} is completed`, body: `${await nameOf(c.viewer.id)} approved your handover`, href: href(c.p.id), leadId: c.lead.id, actorId: c.viewer.id })
  const letter = await sendLetter(c, letterAskOf(input.letter), stampBy)   // (S44R, C9)
  undo.letterId = letter?.id ?? null
  touch(c.p.id, c.lead.id)
  return { ok: true, undo, letter }
}

/**
 * (simplify Q-15, the owner's pick 2026-10-09) Undo after Complete handover, for the snackbar's life: whoever completed it puts it back In
 * progress — the request and the hold as they were, its line and the bell rows it raised gone. After the Undo's few minutes, Reopen (an Owner
 * or an Admin, with a reason) as today.
 */
export async function undoCompleteHandover(u: HandoverUndo): Promise<{ ok: true; /** (simplify round 2, R2-C) the held email it kept from going */ unsent: HeldMail } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(typeof u?.projectId === 'string' ? u.projectId : ''); if (isRefusal(c)) return c
  if (c.p.stage !== 'completed' || !c.p.completedAt) return { error: 'This project is not completed' }
  const at = typeof u.at === 'number' && Number.isFinite(u.at) ? u.at : 0
  if (c.p.completedBy !== c.viewer.id || c.p.completedAt.getTime() < at - 60_000 || Date.now() - c.p.completedAt.getTime() > UNDO_MINUTES * 60_000) {
    return { error: reopensProject(c.viewer.role) ? 'It’s past its Undo — reopen it instead' : 'It’s past its Undo — an Owner or an Admin can reopen it' }
  }
  const b = u.before ?? ({} as HandoverUndo['before'])
  const day = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? new Date(x) : null)
  const str = (x: unknown) => (typeof x === 'string' ? x : null)
  const since = new Date(c.p.completedAt.getTime() - 2000)
  await db.update(projects).set({
    stage: 'in_progress', completedAt: null, completedBy: null, completeNote: null, completeReason: null,
    handoverDeferred: (Array.isArray(b.deferred) ? b.deferred : null) as typeof projects.$inferInsert['handoverDeferred'],
    handoverRequestedBy: str(b.requestedBy), handoverRequestedAt: day(b.requestedAt), handoverNote: str(b.note), handoverReviewNote: str(b.reviewNote), handoverReviewedBy: str(b.reviewedBy), handoverReviewedAt: day(b.reviewedAt),
    onHoldAt: day(b.onHoldAt), onHoldReason: str(b.onHoldReason), onHoldUntil: typeof b.onHoldUntil === 'number' ? b.onHoldUntil : null, onHoldBy: str(b.onHoldBy), updatedAt: new Date(),
  }).where(and(eq(projects.id, c.p.id), eq(projects.stage, 'completed')))
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_completed'), gte(leadEvents.at, since)))
  await db.delete(notifications).where(and(inArray(notifications.kind, ['project_completed', 'handover_approved']), eq(notifications.href, href(c.p.id)), gte(notifications.createdAt, since)))
  /* a request that waited goes back to its reviewers' bell, as it stood */
  if (b.requestedAt && b.requestedBy) await notify('handover_review', await studioRunnerIds(), { title: `Handover to review: ${c.p.name}`, body: `${await nameOf(b.requestedBy)} asked to complete ${c.lead.name}’s project`, href: href(c.p.id), leadId: c.lead.id, actorId: b.requestedBy })
  const unsent = await cancelHeldMessages(u.held, c.lead.id)   // (simplify round 2, R2-C) "handed over", still held, never goes
  if (typeof u.letterId === 'string' && u.letterId) await withdrawCompletionLetter(u.letterId, c.viewer.id)   // (S44R, C9) the letter the press sent goes back with it
  /* (parity map, FB-055) the commission task the completion raised goes with it — only that one: on this project, made since, not done */
  if (typeof u.commissionTaskId === 'string' && u.commissionTaskId) {
    const [t] = await db.select({ id: leadTasks.id }).from(leadTasks).where(and(eq(leadTasks.id, u.commissionTaskId), eq(leadTasks.leadId, c.lead.id), eq(leadTasks.done, false), gte(leadTasks.createdAt, since))).limit(1)
    if (t) {
      await db.delete(notifications).where(and(eq(notifications.kind, 'task_assigned'), eq(notifications.href, `/projects/${c.p.id}?commission=1`), gte(notifications.createdAt, since)))
      await db.delete(leadTasks).where(eq(leadTasks.id, t.id))
    }
  }
  touch(c.p.id, c.lead.id)
  return { ok: true, unsent }
}

/** Sent back with a note — the request is answered; whoever asked reads the note on the project until they ask again. */
export async function sendBackHandover(projectId: string, input: { note: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const note = clean(input?.note, REASON_MAX)
  if (!note) return { error: 'Say what the handover still needs' }
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!reviewsHandover(c.viewer.role)) return { error: REVIEW_RULE }
  if (c.p.stage !== 'in_progress' || !c.p.handoverRequestedAt) return { error: 'No handover waits for review on this project' }
  const now = new Date()
  const requesterId = c.p.handoverRequestedBy
  await db.update(projects).set({ handoverRequestedBy: null, handoverRequestedAt: null, handoverNote: null, handoverDeferred: null, handoverReviewNote: note, handoverReviewedBy: stampBy, handoverReviewedAt: now, updatedAt: now }).where(eq(projects.id, c.p.id))
  await logProjectEvent(db, c.lead.id, c.p.id, 'project_handover_sent_back', { ...ev(c), note, ...(requesterId ? { memberId: requesterId } : {}) })
  await clearReviewRows(c.p.id)   // (fix-E, E-04) the request is answered — no approver keeps it in their bell
  if (requesterId) await notify('handover_sent_back', [requesterId], { title: `Handover sent back: ${c.p.name}`, body: note, href: href(c.p.id), leadId: c.lead.id, actorId: c.viewer.id })
  touch(c.p.id, c.lead.id)
  return { ok: true }
}

/** Whoever asked (or an Owner or an Admin) takes the request back — as an invoice's submission is withdrawn: its line and its bell rows go. */
export async function withdrawHandover(projectId: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const at = c.p.handoverRequestedAt
  if (!at) return { error: 'No handover waits for review on this project' }
  if (c.p.handoverRequestedBy !== c.viewer.id && !reviewsHandover(c.viewer.role)) return { error: 'Only whoever asked, an Owner or an Admin takes a handover request back' }
  await db.update(projects).set({ handoverRequestedBy: null, handoverRequestedAt: null, handoverNote: null, handoverDeferred: null, updatedAt: new Date() }).where(eq(projects.id, c.p.id))
  const since = new Date(at.getTime() - 2000)
  const lines = await db.select({ id: leadEvents.id }).from(leadEvents).where(and(eq(leadEvents.projectId, c.p.id), eq(leadEvents.kind, 'project_handover_requested'), gte(leadEvents.at, since)))
  await dropLeadEvents(lines.map((l) => l.id))
  await db.delete(notifications).where(and(eq(notifications.kind, 'handover_review'), eq(notifications.href, href(c.p.id)), gte(notifications.createdAt, since)))
  touch(c.p.id, c.lead.id)
  return { ok: true }
}

/** (Q-24 — 1.0 had no way back, D-309) Reopen: an Owner or an Admin, with a reason; back to In progress, the schedule and money open again. */
export async function reopenProject(projectId: string, input: { reason: string }): Promise<{ ok: true; /** (simplify round 2, R2-C) */ unsent: HeldMail } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const reason = clean(input?.reason, REASON_MAX)
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!reopensProject(c.viewer.role)) return { error: REOPEN_RULE }
  if (c.p.stage !== 'completed') return { error: 'This project is not completed' }
  if (!reason) return { error: 'Say why the project is reopened' }
  const now = new Date()
  await db.update(projects).set({ stage: 'in_progress', completedAt: null, completedBy: null, completeNote: null, completeReason: null, handoverDeferred: null, reopenedBy: stampBy, reopenedAt: now, reopenReason: reason, updatedAt: now })
    .where(and(eq(projects.id, c.p.id), eq(projects.stage, 'completed')))
  await logProjectEvent(db, c.lead.id, c.p.id, 'project_reopened', { ...ev(c), reason })
  await clearReviewRows(c.p.id)   // (fix-E, E-04) nothing waits for review on a project that was completed
  /* (fix-E, E-20) the project's team hears that their project is open again, and why */
  await notify('project_reopened', c.team, { title: `${c.p.name} is in progress again`, body: `${await nameOf(c.viewer.id)} reopened it — “${reason.replace(/[.!?]+$/, '')}”`, href: href(c.p.id), leadId: c.lead.id, actorId: c.viewer.id })
  /* (simplify round 2, R2-C) reopened inside the completion's Undo minutes: the "handed over" email still held never goes */
  const unsent = await cancelHeldEvent(c.lead.id, 'client_handed_over')
  touch(c.p.id, c.lead.id)
  return { ok: true, unsent }
}

/* ── Delete · Restore · Delete forever (Q-26) ───────────────────────────────────────────────────────────────────────────────────── */

export type DeleteRead = { name: string; number: string; client: string; direct: boolean; block: string | null; /** (parity P-36) the stage the dialog's subtitle names — On hold while held */ stage: string }
/** The delete dialog's facts: who it is for, whether its client's record goes with it, and the money that keeps it. */
export async function readProjectDelete(projectId: string): Promise<DeleteRead | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!deletesProject(c.viewer.role)) return { error: DELETE_RULE }
  return { name: c.p.name, number: c.p.number, client: c.lead.name, direct: c.lead.direct, block: deleteBlock(await moneyRecordedOn(c.p)), stage: holdOf(c.p) ? 'On hold' : STAGE_LABEL[c.p.stage as ProjectStage] ?? 'In progress' }
}

/**
 * Soft: the row keeps everything for Restore. A direct project's client record (its `direct` lead) goes with it; a Won lead stays Won, and
 * its page offers Make the project again. Refused while money is recorded against the project. Answers what Undo needs.
 */
export async function deleteProject(projectId: string): Promise<{ eventId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const c = await forProject(projectId); if (isRefusal(c)) return c
  if (!deletesProject(c.viewer.role)) return { error: DELETE_RULE }
  const block = deleteBlock(await moneyRecordedOn(c.p))
  if (block) return { error: block }
  const now = new Date()
  await db.update(projects).set({ deletedAt: now, deletedBy: stampBy, updatedAt: now }).where(and(eq(projects.id, c.p.id), isNull(projects.deletedAt)))
  if (c.lead.direct) await db.update(leads).set({ deletedAt: now, deleteReason: 'Its project was deleted', stageBeforeDelete: c.lead.stage }).where(and(eq(leads.id, c.lead.id), isNull(leads.deletedAt)))
  const eventId = await logProjectEvent(db, c.lead.id, c.p.id, 'project_deleted', { ...ev(c), direct: c.lead.direct })
  touch(c.p.id, c.lead.id)
  return { eventId }
}

/** Restore a deleted project (and a direct project's client record with it). A Won lead that was deleted since must come back first. */
async function restoreOne(c: Ctx, o: { log: boolean }): Promise<string | null> {
  if (!c.lead.direct && c.lead.deletedAt) return `${c.lead.name}’s lead is deleted — restore it from Deleted Leads first`
  const now = new Date()
  await db.update(projects).set({ deletedAt: null, deletedBy: null, updatedAt: now }).where(eq(projects.id, c.p.id))
  if (c.lead.direct && c.lead.deletedAt) await db.update(leads).set({ deletedAt: null, deleteReason: null, stage: sql`coalesce(stage_before_delete, stage)`, stageBeforeDelete: null }).where(eq(leads.id, c.lead.id))
  if (o.log) await logProjectEvent(db, c.lead.id, c.p.id, 'project_restored', { ...ev(c) })
  await carryLeadLayouts(db, c.lead.id, { id: c.p.id, name: c.p.name, number: c.p.number }, now)   // (pending modules S07) a layout started on the lead while the project was in the trash joins it
  await carryLeadFloorPlans(db, c.lead.id, { id: c.p.id, name: c.p.name, number: c.p.number }, now)   // (pending modules S28) and the floor-plan photo it was traced on
  touch(c.p.id, c.lead.id)
  return null
}

/** Delete's Undo: the project back as it was, the delete's line gone (the house Undo, REG-608's undoStageMove). */
export async function undoDeleteProject(projectId: string, o: { eventId: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId, { deleted: true }); if (isRefusal(c)) return c
  if (!deletesProject(c.viewer.role)) return { error: DELETE_RULE }
  const refused = await restoreOne(c, { log: false })
  if (refused) return { error: refused }
  if (o?.eventId) await dropLeadEvents([o.eventId])
  return { ok: true }
}

export type DeletedProjectRow = { id: string; name: string; number: string; client: string; stage: string; direct: boolean; deletedAt: number | null; deletedByName: string | null; mine: boolean }
/** The Deleted projects sheet: the deleted projects this viewer may see, newest first. `mine` = may restore and delete forever. */
export async function listDeletedProjects(): Promise<DeletedProjectRow[]> {
  if (await offWorkspace()) return []   // (S45C) the workspace's role rule: Marketing reads nothing here
  const viewer = await fetchViewer()
  const rows = await db.select({ p: projects, l: leads }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(isNotNull(projects.deletedAt)).orderBy(desc(projects.deletedAt))
  const people = new Map((await db.select({ id: members.id, name: members.name }).from(members)).map((m) => [m.id, m.name]))
  const out: DeletedProjectRow[] = []
  for (const { p, l } of rows) {
    if (!(await canOpenLead(viewer, l.id))) continue
    out.push({ id: p.id, name: p.name, number: p.number, client: titleCaseName(l.name), stage: p.stage, direct: l.direct, deletedAt: p.deletedAt?.getTime() ?? null, deletedByName: p.deletedBy ? people.get(p.deletedBy) ?? null : null, mine: deletesProject(viewer.role) })
  }
  return out
}

/** Restore from the sheet. Answers how many came back and, when one could not, why. */
export async function restoreProjects(ids: string[]): Promise<{ restored: number; refused: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!deletesProject(viewer.role)) return { error: DELETE_RULE }
  let restored = 0
  let refused: string | null = null
  for (const id of [...new Set(ids)].slice(0, 200)) {
    const c = await forProject(id, { deleted: true })
    if (isRefusal(c)) continue
    const r = await restoreOne(c, { log: true })
    if (r) refused = refused ?? r
    else restored++
  }
  return { restored, refused }
}

/** Gone for good: a Won lead's project row and what hangs off it (its milestones, updates, choices, invoices — cascaded — and its variation
    orders); a direct project takes its client record with it. Only projects already in the trash. */
export async function deleteProjectsForever(ids: string[]): Promise<{ removed: number; /** (simplify S-25 (3)) kept for the money recorded on them */ kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!deletesProject(viewer.role)) return { error: DELETE_RULE }
  let removed = 0, kept = 0
  const directLeads: string[] = []
  for (const id of [...new Set(ids)].slice(0, 200)) {
    const c = await forProject(id, { deleted: true })
    if (isRefusal(c)) continue
    if (deleteBlock(await moneyRecordedOn(c.p))) { kept++; continue }   // money recorded since — never purged; (simplify S-25 (3)) and the sheet says so
    await db.delete(quotes).where(and(eq(quotes.projectId, c.p.id), eq(quotes.kind, 'variation')))
    await markNumberGiven(c.p.number)   // (fix-A, A-06) its number is never given again
    await db.delete(notifications).where(sql`${notifications.href} = ${`/projects/${c.p.id}`} OR ${notifications.href} LIKE ${`/projects/${c.p.id}/%`} OR ${notifications.href} LIKE ${`/projects/${c.p.id}?%`}`)   // (fix-A, A-23) no bell row opens a project that is gone
    await db.delete(projects).where(and(eq(projects.id, c.p.id), isNotNull(projects.deletedAt)))
    if (c.lead.direct) directLeads.push(c.lead.id)
    else await logProjectEvent(db, c.lead.id, c.p.id, 'project_purged', { ...ev(c) })
    removed++
  }
  /* (fix-E, E-01) a direct project's client record leaves only with its project, here — Deleted Leads never lists or purges it */
  if (directLeads.length) await purgeLeads(directLeads)
  revalidatePath('/projects', 'layout')
  revalidateEveryLead()
  return { removed, kept }
}

export async function emptyProjectTrash(): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const rows = await listDeletedProjects()
  return deleteProjectsForever(rows.filter((r) => r.mine).map((r) => r.id))
}

/**
 * (Q-26) A Won lead whose project was deleted stays Won; its page offers Make the project again. A project still in Deleted projects is
 * removed for good first (a lead never has two — `projects.lead_id` is unique), so that step is an Owner's or an Admin's.
 */
export async function remakeLeadProject(leadId: string): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return { error: 'This lead is not there any more' }
  const [l] = await db.select({ stage: leads.stage, direct: leads.direct }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  if (!l) return { error: 'This lead is not there any more' }
  if (l.stage !== 'Won' || l.direct) return { error: 'Win the lead first — Won creates its project' }
  const [old] = await db.select().from(projects).where(eq(projects.leadId, leadId)).limit(1)
  if (old && !old.deletedAt) return { id: old.id }
  /* (S42F) a project needs a member — asked before anything is removed, so a refused remake leaves the old project where it was */
  const [someone] = await db.select({ id: leadAssignees.id }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId)).limit(1)
  if (!someone) return { error: TEAM_NEEDED }
  if (old) {
    if (!deletesProject(viewer.role)) return { error: remakeRefusal(old.number) }   // (fix-E, E-05) the lead page says the same before the press
    const r = await deleteProjectsForever([old.id])
    if (isRefusal(r)) return r
    if (!r.removed) return { error: `${old.number} still has money recorded — restore it instead` }
  }
  const made = await ensureProjectForLead(leadId, { remade: !!old })   // (fix-E, E-06) its line says it was made again
  touch(made.id, leadId)
  return { id: made.id }
}

/* ── Settings › Projects (Owners and Admins change them) ────────────────────────────────────────────────────────────────────────── */

async function putSetting(key: string, value: unknown) {
  const v = JSON.stringify(value)
  await db.insert(settings).values({ key, value: v, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: v, updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/projects', 'layout')
}

/** Settings › Projects › Stages and handover › *Handover needs an owner's review*. */
export async function setHandoverReview(o: { on: boolean }): Promise<{ on: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  { const lock = await requirePlan('internal_approvals'); if (lock) return lock }   // (pending modules S19) approvals are Pro
  await putSetting(HANDOVER_RULES_KEY, { review: o?.on === true })
  return { on: o?.on === true }
}

/** (S44R — UAT row 358, call C7, as recommended — her UAT ask 2026-10-15) Settings › Projects › *When a project starts*: the quote is signed
    (today's) · the agreement is signed (a signed agreement moves its lead to Won through the Won step's rules — lib/leads/won-on-signing.ts). */
export async function setProjectStart(o: { startsWhen: string }): Promise<ProjectStartRule | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  const rule = parseProjectStart({ startsWhen: o?.startsWhen })
  await putSetting(PROJECT_START_KEY, rule)
  revalidatePath('/contracts', 'layout')
  return rule
}

/** Settings › Projects › Schedule defaults: the schedule template a new schedule starts from (null = the signed quote's stages). */
export async function setScheduleDefaults(o: { templateId: string | null }): Promise<ScheduleDefaults | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  const id = typeof o?.templateId === 'string' && o.templateId ? o.templateId : null
  if (id) {
    const [t] = await db.select({ id: scheduleTemplates.id }).from(scheduleTemplates).where(and(eq(scheduleTemplates.id, id), isNull(scheduleTemplates.deletedAt))).limit(1)
    if (!t) return { error: 'That schedule template is not there any more' }
  }
  await putSetting(SCHEDULE_DEFAULTS_KEY, { templateId: id })
  return { templateId: id }
}
