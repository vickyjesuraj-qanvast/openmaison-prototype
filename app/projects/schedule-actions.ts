'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leadEvents, leadTasks, leads, members, projectMilestones, projectScheduleShares, projects, quotePayments, scheduleTemplateItems, scheduleTemplates } from '@/lib/db/schema'
import { notifications, projectMilestoneExtensions, projectMilestoneLinks, projectShareRequests, settings } from '@/lib/db/schema'   // (gaps build, package C)
import { projectInvoices, projectUpdates } from '@/lib/db/schema'   // (simplify S-18) the Mark done sheet's invoice and photos
import { sessionMemberId } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { runsStudio } from '@/lib/leads/assign-policy'
import { PROJECT_TYPES } from '@/lib/projects/model'
import { SETTINGS_RULE } from '@/lib/projects/handover-model'
import { ALERT_DAYS_MAX, ALERT_DAYS_MIN, ANSWER_RULE, MORE_TIME_RULE, SCHEDULE_RULES_KEY, TYPE_DEFAULTS_KEY, answersSchedule, asksForTime, asksPastEnd, doneAtOnce, parseScheduleRules, parseTypeDefaults, sharesAtOnce, type ScheduleRules } from '@/lib/projects/schedule-rules'
import { titleCaseName } from '@/lib/format'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { revalidateLead } from '@/lib/leads/queries'
import { createTask } from '@/app/leads/tasks-actions'
import { logProjectEvent } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject, seesMoney } from '@/lib/projects/policy'
import { fetchScheduleRules, fetchScheduleRulesStored, milestonesOf, paymentOptionsOf, quoteSourcesOf, quoteTrades, latestShares, templateOptions } from '@/lib/projects/schedule'
import {
  CLIENT_NOTE_MAX, DAY_MS, DESCRIPTION_MAX, MILESTONE_COLORS, RESOLVE_MAX, STATUS_LABEL, TITLE_MAX, WAITING_ON, clientRows, dateOfDay, dayLabel, dayMonth, dayOf, dayOfIso, dayOfStored, handoverOf, isMilestoneStatus, moveSentence, moveWith, snapshotFor,
  changeWords, followersOf,   // (simplify S-18)
  listWords, nextWeekday, plural, rangeLabel, rebuildPlan, saveSentence, scheduleChanges, shortTitle, spanWord, wouldCycle,
  daysWord,   // (parity map, SC-094)
  type FieldChange, type Milestone, type MilestoneStatus, type WaitingOn,
} from '@/lib/projects/schedule-model'
import { draftsFromPhases, draftsFromQuote, draftsFromTemplate, itemsFromMilestones, phasesFor, type Draft } from '@/lib/projects/schedule-phases'
import { completedBlock } from '@/lib/projects/handover-model'
import { tellScheduleShared } from '@/lib/portal/client-tells'   // (gaps build H)
import { draftTimeline } from '@/lib/projects/schedule-ai'   // (gaps build I)
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule
/* (simplify S-18 · Q-18) the Mark done sheet runs today's own actions — the share, the photos' update, the stage's invoice — under their rules */
import { clientTellFacts, invoiceBefore, invoiceRevertBlock, parseDoneTicks, revertInvoice, ticksCarry, type DoneTicks, type InvoiceRevert } from '@/lib/projects/schedule-moments'
import { fetchInvoiceRules, moneySummaryOf } from '@/lib/projects/money-queries'
import { sendsAtOnce } from '@/lib/projects/invoices-model'
import { fetchUpdateReview, fetchUpdateReviewers } from '@/lib/projects/updates'
import { publishesAtOnce } from '@/lib/projects/updates-model'
import { sendInvoice, submitInvoice } from './money-actions'
import { deleteProjectUpdate, saveProjectUpdate, withdrawProjectUpdate } from './updates-actions'
/* (simplify round 2, R2-C) the client's emails a Done raises wait out its Undo (held, then released); an approval's photos are the asker's */
import { cancelHeldMessages, holdClientMail } from '@/lib/notifications/delivery'
import { UNDO_SNACKBAR_MS, type HeldMail } from '@/lib/notifications/held'
import { asAskedBy } from '@/lib/projects/acting-author'
/* (parity map, P-E) a variation order's days on the schedule; suggested tasks; this package's own Activity lines */
import { quotes } from '@/lib/db/schema'
import { VO_DAYS_EVENT } from '@/lib/projects/schedule'
import { logParityEvent } from '@/lib/projects/create'
import { suggestFromQuote, type QuoteTaskGroup } from '@/lib/projects/task-suggestions'

/*
 * (Projects round 2 — the Schedule) The schedule's server actions. Who sees a schedule is its lead's rule (`canOpenLead`); who changes it is the
 * project's team, Owners and Admins (`mayChangeProject`). The rules live here, not in the browser (1.0 wrote whatever array it was sent): dates
 * are real days with the start on or before the end, a milestone never follows itself, a move carries what follows it (`moveWith`, the model
 * the page previews with), and nothing reaches the client until Share changes stores what they will see. A refusal answers `{ error }`.
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'
const GONE = 'This milestone is not there any more'
const DAYS_MAX = 3650

type Project = typeof projects.$inferSelect
type Row = typeof projectMilestones.$inferSelect

/** The project and its lead, after the viewer's two checks — or the refusal to hand back. */
async function forProject(projectId: string, o: { read?: boolean } = {}): Promise<{ p: Project; viewer: Viewer } | Refusal> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  /* (Projects round 7, Q-24) a completed project's schedule is read-only — Reopen opens it again; saving it as a template only reads it */
  const shut = o.read ? null : completedBlock(p.stage, 'schedule'); if (shut) return { error: shut }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  if (!mayChangeProject(viewer, team)) return { error: CHANGE_RULE }
  return { p, viewer }
}
async function forMilestone(id: string): Promise<{ p: Project; row: Row; list: Milestone[]; viewer: Viewer } | Refusal> {
  const [row] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, id), isNull(projectMilestones.deletedAt))).limit(1)
  if (!row) return { error: GONE }
  const g = await forProject(row.projectId)
  if ('error' in g) return g
  return { p: g.p, row, list: (await milestonesOf([g.p.id])).get(g.p.id) ?? [], viewer: g.viewer }
}
function touch(projectId: string, leadId: string) {
  revalidatePath('/projects', 'layout')
  revalidatePath(`/projects/${projectId}/schedule`)
  revalidateLead(leadId)
}
const clean = (s: string | null | undefined, max: number) => (s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const dayArg = (iso: string | null | undefined): number | null => {
  const n = typeof iso === 'string' ? dayOfIso(iso) : null
  return n !== null && n > 10_000 && n < 60_000 ? n : null   // 1997 … 2134: a real day, never a stray number
}
const ev = (p: Project) => ({ name: p.name, number: p.number })

/** The project's target end follows its schedule: the handover's last day (the Overview's Status card and the listing read it). */
async function syncTarget(projectId: string) {
  const list = (await milestonesOf([projectId])).get(projectId) ?? []
  const h = handoverOf(list)
  if (h) await db.update(projects).set({ targetEndDate: dateOfDay(h.end) }).where(eq(projects.id, projectId))
}
/** Positions 0…n in list order. */
async function renumber(projectId: string, order?: string[]) {
  const rows = await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt))).orderBy(asc(projectMilestones.position), asc(projectMilestones.createdAt))
  const ids = order ?? rows.map((r) => r.id)
  for (const [i, id] of ids.entries()) await db.update(projectMilestones).set({ position: i }).where(eq(projectMilestones.id, id))
}

/* ── Starting a schedule (Start.dc.html) ────────────────────────────────────────────────────────────────────────────────────── */

export type ScheduleSource = 'quote' | 'blank' | { template: string }
  /* (gaps build, package C — 4) any of the lead's quotes, or an uploaded quote read in the browser by Upload a quote's reader (its trades and
     sections only — no AI credits: Q-30, no metered press in Projects) */
  | { quote: string } | { upload: { name: string; trades: string[]; sections: string[] } }
  /* (gaps build I, I-Q13 · I-Q14) Drafted by Maison AI from one of the lead's quotes, the scope and the kind of home — drafted again here from the
     records, without the milestones the studio unticked in the review (`skip`, the draft's keys); curated and free (Q-30) */
  | { ai: { quote: string; skip?: string[] } }

/** The milestones a source makes from works start — the Start card's "What you will get" draws the same through the same functions. */
async function draftsFor(p: Project, source: ScheduleSource, start: number): Promise<{ drafts: Draft[]; words: string; templateId?: string } | Refusal> {
  if (source === 'blank') return { drafts: [], words: '' }
  if (source === 'quote') {
    if (!p.quoteId) return { error: 'This project has no signed quote to start from' }
    return { drafts: draftsFromPhases(phasesFor(await quoteTrades(p.quoteId)), start), words: 'from the signed quote' }
  }
  if ('quote' in source) {
    const q = (await quoteSourcesOf(p.leadId, p.quoteId)).find((x) => x.id === source.quote)
    if (!q) return { error: 'That quote is not on this project any more' }
    const drafts = draftsFromQuote({ trades: q.trades, sections: q.sections }, start)
    return { drafts, words: q.id === p.quoteId ? 'from the signed quote' : `from the quote ${q.number}` }
  }
  if ('ai' in source) {   // (gaps build I)
    const want = source.ai ?? { quote: '' }
    const q = (await quoteSourcesOf(p.leadId, p.quoteId)).find((x) => x.id === want.quote)
    if (!q) return { error: 'That quote is not on this project any more' }
    if (!q.lines) return { error: 'That quote has no lines to draft from' }
    const [lead] = await db.select({ propertyType: leads.propertyType, name: leads.name }).from(leads).where(eq(leads.id, p.leadId)).limit(1)
    const skip = (Array.isArray(want.skip) ? want.skip : []).filter((x): x is string => typeof x === 'string').slice(0, 40)
    const { parseScope } = await import('@/lib/projects/model')
    const plan = draftTimeline({ lines: q.items ?? [], rooms: parseScope(p.scope), propertyType: lead?.propertyType ?? null, projectType: p.projectType, quoteNumber: q.number, client: lead ? titleCaseName(lead.name).split(/\s+/)[0] ?? null : null }, start, skip)
    if (!plan.drafts.length) return { error: 'Every milestone was left out — tick at least one' }
    return { drafts: plan.drafts, words: `drafted by Maison AI from ${q.number}` }
  }
  if ('upload' in source) {
    const u = source.upload ?? { name: '', trades: [], sections: [] }
    const list = (v: unknown, n: number) => (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string').map((x) => clean(x, 80)).filter(Boolean).slice(0, n)
    const trades = list(u.trades, 600), sections = list(u.sections, 40)
    if (!trades.length && !sections.length) return { error: 'That file has no lines we could read' }
    return { drafts: draftsFromQuote({ trades, sections }, start), words: `from the uploaded quote “${clean(u.name, 80) || 'quote'}”` }
  }
  const t = (await templateOptions()).find((x) => x.id === source.template)
  if (!t) return { error: 'That template is not there any more' }
  if (!t.items.length) return { error: 'That template has no milestones yet' }
  return { drafts: draftsFromTemplate(t.items, start), words: `from the template “${t.name}”`, templateId: t.id }
}

/** (Q-13 · B-07) Payments follow the payment schedule — the signed quote's, or a direct project's agreed split — whatever the milestones came
    from: the first stage after signing falls due as works start, the last at the handover, the others on the milestone that ends nearest the
    stage's estimate (else spread evenly). A stage due on signing (the deposit) is paid already and ties to nothing. (gaps build, package C —
    2) `taken` stages keep the milestone they are on; only the free ones are tied, and only to rows `free` says may take one. */
async function tiesFor(p: Project, rows: { end: number }[], o: { taken?: Set<string>; free?: (i: number) => boolean } = {}): Promise<Map<number, { ref: string; due: 'start' | 'end' }>> {
  const ties = new Map<number, { ref: string; due: 'start' | 'end' }>()
  const all = (await paymentOptionsOf(p)).filter((s) => !s.onSigning)
  const stages = all.filter((s) => !o.taken?.has(s.ref))
  const may = (i: number) => (o.free ? o.free(i) : true)
  if (!rows.length || !stages.length) return ties
  const wants = p.quoteId ? new Map((await db.select({ id: quotePayments.id, dueAt: quotePayments.dueAt }).from(quotePayments).where(eq(quotePayments.quoteId, p.quoteId))).map((r) => [r.id, r.dueAt ? dayOf(r.dueAt) : null])) : new Map<string, number | null>()
  const last = rows.length - 1
  stages.forEach((s) => {
    const k = all.indexOf(s)
    const place = (at: number, due: 'start' | 'end') => { if (may(at) && !ties.has(at)) ties.set(at, { ref: s.ref, due }) }
    if (k === 0) { place(0, 'start'); return }
    if (k === all.length - 1) { place(last, 'end'); return }
    const want = wants.get(s.ref) ?? null
    const at = want === null ? Math.round((k * last) / Math.max(1, all.length - 1)) : rows.reduce((b, d, i) => (Math.abs(d.end - want) < Math.abs(rows[b]!.end - want) ? i : b), 0)
    place(at, 'end')
  })
  return ties
}

export async function createSchedule(projectId: string, input: { start: string; source: ScheduleSource }): Promise<{ n: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const start = dayArg(input.start)
  if (start === null) return { error: 'Choose the day works start' }
  const g = await forProject(projectId)
  if ('error' in g) return g
  const { p } = g
  const have = await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(eq(projectMilestones.projectId, p.id), isNull(projectMilestones.deletedAt))).limit(1)
  if (have.length) return { error: 'This project already has a schedule' }
  const made = await draftsFor(p, input.source, start)
  if ('error' in made) return made
  /* (B-37) "Nothing yet" makes nothing here: the page opens Add milestone, and the first milestone added makes the schedule */
  if (!made.drafts.length) return { n: 0 }
  const now = new Date()
  const today = dayOf(now)
  const ids = made.drafts.map(() => randomUUID())
  const ties = await tiesFor(p, made.drafts)
  /* (B-06) A schedule set up mid-job knows what already happened: a milestone that ended before today starts as Done, the one running today
     as In progress (as R69 lays out the demo) — the Start card says so before Create. (gaps build, package C — 10) one under way has started. */
  const statusOf = (d: Draft) => (d.end < today ? 'done' : d.start <= today ? 'in_progress' : 'not_started')
  await db.insert(projectMilestones).values(made.drafts.map((d, i) => ({
    id: ids[i]!, projectId: p.id, title: d.title, position: i, startDate: dateOfDay(d.start), endDate: dateOfDay(d.end), status: statusOf(d),
    doneAt: statusOf(d) === 'done' ? dateOfDay(d.end) : null, startedAt: statusOf(d) !== 'not_started' ? dateOfDay(d.start) : null,
    followsId: d.follows !== null ? ids[d.follows]! : null, gapDays: d.gap, paymentRef: ties.get(i)?.ref ?? null, paymentDue: ties.get(i)?.due ?? 'end',
    clientVisible: true, confirmAskedAt: d.askConfirm ? now : null, createdBy: stampBy, updatedBy: stampBy, createdAt: now, updatedAt: now,
    /* (parity map, SC-016) a template's item keeps its words and its colour on the milestone it makes */
    description: d.description ?? null, color: d.color && MILESTONE_COLORS.some((c) => c.key === d.color) ? d.color : null,
  })))
  /* (parity map, SC-016) …and the further milestones it waits on, by position — each with the gap the layout gave it */
  const links = made.drafts.flatMap((d, i) => (d.links ?? []).filter((l) => l.at !== d.follows && ids[l.at]).map((l, k) => ({ id: randomUUID(), projectId: p.id, milestoneId: ids[i]!, afterId: ids[l.at]!, gapDays: Math.round(l.gap), createdAt: new Date(now.getTime() + k * 1000) })))
  if (links.length) await db.insert(projectMilestoneLinks).values(links)
  /* works start is the project's start date when it has none yet; the handover becomes its target end */
  if (!p.startDate) await db.update(projects).set({ startDate: dateOfDay(start), updatedAt: now }).where(eq(projects.id, p.id))
  await syncTarget(p.id)
  /* (REG-1071) the template it started from, by id — Company › Templates › Schedules counts its "Used by" from it, a rename and all */
  await logProjectEvent(db, p.leadId, p.id, 'project_schedule_created', { ...ev(p), n: made.drafts.length, source: made.words, ...(made.templateId ? { templateId: made.templateId } : {}) })
  touch(p.id, p.leadId)
  return { n: made.drafts.length }
}

/* ── (gaps build, package C — 2) Rebuild a schedule, or put a template on one that exists ─────────────────────────────────────────── */

/** What a rebuild changed, for its Undo: every milestone's place, links and payment as they were; the ones it added and dropped; its line. */
export type RebuildUndo = { projectId: string; rows: { id: string; position: number; followsId: string | null; gap: number; paymentRef: string | null; paymentDue: string }[]; added: string[]; dropped: string[]; eventId: string | null }

/**
 * A new list of milestones over the one there is — from the signed quote, any of the lead's quotes, an uploaded quote or a template. A
 * milestone the new list names (by its name, case and spaces aside) is KEPT — its id, dates, status, tasks, payment and answers stay; a new one
 * is added after the one before it in the new list (at the source's gap); the rest go (their tasks stay on the project, in no milestone). The
 * page names how many go before this runs, and its answer offers Undo.
 */
export async function rebuildSchedule(projectId: string, input: { start?: string | null; source: ScheduleSource }): Promise<{ sentence: string; undo: RebuildUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forProject(projectId)
  if ('error' in g) return g
  const { p } = g
  const list = (await milestonesOf([p.id])).get(p.id) ?? []
  if (!list.length) return { error: 'This project has no schedule yet — set it up instead' }
  if (input.source === 'blank') return { error: 'Pick where the new milestones come from' }
  const start = (input.start ? dayArg(input.start) : null) ?? Math.min(...list.map((m) => m.start))
  const made = await draftsFor(p, input.source, start)
  if ('error' in made) return made
  if (!made.drafts.length) return { error: 'That source gives no milestones' }
  const plan = rebuildPlan(list, made.drafts)
  const by = new Map(list.map((m) => [m.id, m]))
  const rowsBefore = await db.select().from(projectMilestones).where(and(eq(projectMilestones.projectId, p.id), isNull(projectMilestones.deletedAt)))
  const now = new Date()
  const today = dayOf(now)
  /* the new order: each kept milestone as it is; each new one placed after the row before it at the source's own gap and length */
  type Placed = { id: string; title: string; start: number; end: number; keep: boolean; followsId: string | null; gap: number; askConfirm: boolean; description?: string | null; color?: string | null }
  const placed: Placed[] = []
  for (const r of plan.rows) {
    const prev = placed[placed.length - 1]
    if (r.keep) {
      const m = by.get(r.keep)!
      const keepsLead = !!m.followsId && placed.some((x) => x.id === m.followsId)
      const followsId = keepsLead ? m.followsId : prev?.id ?? null
      const lead = followsId ? placed.find((x) => x.id === followsId) ?? null : null
      placed.push({ id: m.id, title: m.title, start: m.start, end: m.end, keep: true, followsId, gap: lead ? m.start - lead.end : 0, askConfirm: false })
    } else {
      const d = r.draft
      const s = prev ? prev.end + (d.follows !== null ? d.gap : 1) : d.start
      placed.push({ id: randomUUID(), title: d.title, start: s, end: s + (d.end - d.start), keep: false, followsId: prev?.id ?? null, gap: prev ? s - prev.end : 0, askConfirm: d.askConfirm, description: d.description ?? null, color: d.color ?? null })   // (parity map, SC-016)
    }
  }
  /* payments: what the kept milestones carry stays; a stage that was on a dropped one goes to the new ones by the usual rule */
  const keptRefs = new Set(list.filter((m) => plan.rows.some((x) => x.keep === m.id) && m.paymentRef).map((m) => m.paymentRef!))
  const ties = await tiesFor(p, placed, { taken: keptRefs, free: (i) => !placed[i]!.keep })
  const statusOf = (x: Placed) => (x.end < today ? 'done' : x.start <= today ? 'in_progress' : 'not_started')
  const added = placed.filter((x) => !x.keep)
  if (added.length) await db.insert(projectMilestones).values(added.map((x) => {
    const i = placed.indexOf(x)
    return { id: x.id, projectId: p.id, title: x.title, position: i, startDate: dateOfDay(x.start), endDate: dateOfDay(x.end), status: statusOf(x),
      doneAt: statusOf(x) === 'done' ? dateOfDay(x.end) : null, startedAt: statusOf(x) !== 'not_started' ? dateOfDay(x.start) : null,
      followsId: x.followsId, gapDays: x.gap, paymentRef: ties.get(i)?.ref ?? null, paymentDue: ties.get(i)?.due ?? 'end',
      clientVisible: true, confirmAskedAt: x.askConfirm ? now : null, createdBy: stampBy, updatedBy: stampBy, createdAt: now, updatedAt: now,
      description: x.description ?? null, color: x.color && MILESTONE_COLORS.some((c) => c.key === x.color) ? x.color : null }   // (parity map, SC-016) a template's words and colour
  }))
  for (const [i, x] of placed.entries()) if (x.keep) await db.update(projectMilestones).set({ position: i, followsId: x.followsId, gapDays: x.gap, updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, x.id))
  if (plan.drop.length) await db.update(projectMilestones).set({ deletedAt: now, updatedBy: stampBy, updatedAt: now }).where(inArray(projectMilestones.id, plan.drop))
  await renumber(p.id, placed.map((x) => x.id))
  await syncTarget(p.id)
  const dropped = plan.drop.map((id) => by.get(id)!.title)
  const eventId = await logProjectEvent(db, p.leadId, p.id, 'project_schedule_rebuilt', { ...ev(p), source: made.words, kept: placed.length - added.length, added: added.map((x) => x.title), dropped, ...(made.templateId ? { templateId: made.templateId } : {}) })
  touch(p.id, p.leadId)
  const parts = [`${plural(placed.length - added.length, 'milestone')} kept`, added.length ? `${added.length} added` : '', dropped.length ? `${dropped.length} taken off` : ''].filter(Boolean)
  return {
    sentence: `Schedule rebuilt ${made.words} — ${listWords(parts)}.`,
    undo: { projectId: p.id, rows: rowsBefore.map((r) => ({ id: r.id, position: r.position, followsId: r.followsId, gap: r.gapDays, paymentRef: r.paymentRef, paymentDue: r.paymentDue })), added: added.map((x) => x.id), dropped: plan.drop, eventId },
  }
}
/** The rebuild's Undo: the added milestones go (softly, so nothing that pointed at them breaks), the dropped ones come back, every kept one has
    its place, links and payment as they were, and the rebuild's line leaves Activity. */
export async function undoRebuild(u: RebuildUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(typeof u?.projectId === 'string' ? u.projectId : '')
  if ('error' in g) return g
  const now = new Date()
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  const mine = async (list: string[]) => (list.length ? (await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(inArray(projectMilestones.id, list), eq(projectMilestones.projectId, g.p.id)))).map((r) => r.id) : [])
  const added = await mine(ids(u.added)), dropped = await mine(ids(u.dropped))
  if (added.length) await db.update(projectMilestones).set({ deletedAt: now, updatedAt: now }).where(inArray(projectMilestones.id, added))
  if (dropped.length) await db.update(projectMilestones).set({ deletedAt: null, updatedAt: now }).where(inArray(projectMilestones.id, dropped))
  const rows = Array.isArray(u.rows) ? u.rows : []
  const own = new Set(await mine(rows.map((r) => r.id).filter((x): x is string => typeof x === 'string')))
  for (const r of rows) if (own.has(r.id)) await db.update(projectMilestones).set({ position: Math.round(r.position) || 0, followsId: typeof r.followsId === 'string' ? r.followsId : null, gapDays: Math.round(r.gap) || 0, paymentRef: typeof r.paymentRef === 'string' ? r.paymentRef : null, paymentDue: r.paymentDue === 'start' ? 'start' : 'end', updatedAt: now }).where(eq(projectMilestones.id, r.id))
  await renumber(g.p.id)
  await syncTarget(g.p.id)
  if (typeof u.eventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, g.p.id)))
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── Milestones ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A new milestone at the end of the list (or after `afterId`): it follows that one and starts the next weekday after it, five days long. */
export async function addMilestone(projectId: string, input: { title: string; afterId?: string | null; start?: string | null }): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const title = clean(input.title, TITLE_MAX)
  if (!title) return { error: 'Give the milestone a name' }
  const g = await forProject(projectId)
  if ('error' in g) return g
  const { p } = g
  const list = (await milestonesOf([p.id])).get(p.id) ?? []
  if (input.afterId && !list.some((m) => m.id === input.afterId)) return { error: GONE }
  const after = (input.afterId ? list.find((m) => m.id === input.afterId) : undefined) ?? list[list.length - 1]
  /* (B-37) the first milestone of a blank schedule starts on works start — the day the Start card was given, else the project's */
  const first = !after ? dayArg(input.start) ?? (p.startDate ? dayOfStored(p.startDate) : dayOf(new Date())) : null
  const start = after ? nextWeekday(after.end) : first!
  const now = new Date()
  if (!after && !p.startDate) await db.update(projects).set({ startDate: dateOfDay(start), updatedAt: now }).where(eq(projects.id, p.id))
  const id = randomUUID()
  const at = after ? after.position + 1 : 0
  await db.insert(projectMilestones).values({ id, projectId: p.id, title, position: at, startDate: dateOfDay(start), endDate: dateOfDay(start + 4), status: 'not_started',
    followsId: after?.id ?? null, gapDays: after ? start - after.end : 0, clientVisible: true, createdBy: stampBy, updatedBy: stampBy, createdAt: now, updatedAt: now })
  const order = list.map((m) => m.id)
  order.splice(at, 0, id)
  await renumber(p.id, order)
  await syncTarget(p.id)
  await logProjectEvent(db, p.leadId, p.id, 'project_milestone_added', { ...ev(p), title, id })
  touch(p.id, p.leadId)
  return { id }
}

export async function renameMilestone(id: string, name: string): Promise<{ title: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const title = clean(name, TITLE_MAX)
  if (!title) return { error: 'Give the milestone a name' }
  const g = await forMilestone(id)
  if ('error' in g) return g
  if (title === g.row.title) return { title }
  await db.update(projectMilestones).set({ title, updatedBy: stampBy, updatedAt: new Date() }).where(eq(projectMilestones.id, id))
  await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_renamed', { ...ev(g.p), id, from: g.row.title, to: title, title })
  touch(g.p.id, g.p.leadId)
  return { title }
}

/** What a move changed, kept by the page for its Undo: every milestone's dates and gap as they were, the open tasks inside that moved with
    them (their due as it was, ms — B-26), and the move's line in Activity. */
export type MoveUndo = { projectId: string; rows: { id: string; start: string; end: string; gap: number; /** (gaps build, package C — 6) its further links' gaps */ after?: { id: string; gap: number }[] }[]; tasks?: { id: string; due: number }[]; eventId: string | null }
const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

/** Writes a list's new dates and gaps where they differ from `before`. (B-26) The open tasks inside a milestone whose last day moved move
    with it by the same days — a task due on its last day stays due on its last day. Answers what was, for the Undo. */
async function writeDates(before: Milestone[], after: Milestone[], keepTasksOf: string | null = null): Promise<{ prev: Milestone[]; tasks: { id: string; due: number }[] }> {
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const was = new Map(before.map((m) => [m.id, m]))
  const sameLinks = (a: Milestone, b: Milestone) => JSON.stringify(a.after ?? []) === JSON.stringify(b.after ?? [])
  const changed = after.filter((m) => { const w = was.get(m.id); return !!w && (w.start !== m.start || w.end !== m.end || w.gap !== m.gap || !sameLinks(w, m)) })
  const now = new Date()
  for (const m of changed) await db.update(projectMilestones).set({ startDate: dateOfDay(m.start), endDate: dateOfDay(m.end), gapDays: m.gap, updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, m.id))
  /* (gaps build, package C — 6) the further links keep the gaps the move read again */
  for (const m of changed) for (const a of m.after ?? []) { const w = was.get(m.id)!.after?.find((x) => x.id === a.id); if (!w || w.gap !== a.gap) await db.update(projectMilestoneLinks).set({ gapDays: a.gap }).where(and(eq(projectMilestoneLinks.milestoneId, m.id), eq(projectMilestoneLinks.afterId, a.id))) }
  const shifts = new Map(changed.filter((m) => m.id !== keepTasksOf).map((m) => [m.id, m.end - was.get(m.id)!.end] as const).filter(([, d]) => d !== 0))
  const tasks: { id: string; due: number }[] = []
  if (shifts.size) {
    const open = await db.select({ id: leadTasks.id, milestoneId: leadTasks.milestoneId, dueAt: leadTasks.dueAt }).from(leadTasks)
      .where(and(inArray(leadTasks.milestoneId, [...shifts.keys()]), eq(leadTasks.done, false)))
    for (const t of open) {
      if (!t.dueAt || !t.milestoneId) continue
      const d = shifts.get(t.milestoneId)!
      tasks.push({ id: t.id, due: t.dueAt.getTime() })
      await db.update(leadTasks).set({ dueAt: new Date(t.dueAt.getTime() + d * DAY_MS), updatedAt: now }).where(eq(leadTasks.id, t.id))
    }
  }
  return { prev: changed.map((m) => was.get(m.id)!), tasks }
}
/** (B-26) "3 open tasks moved with them." — said only when tasks moved. */
const tasksWord = (n: number, many: boolean) => (n ? ` ${plural(n, 'open task')} moved with ${many ? 'them' : 'it'}.` : '')

/**
 * (The canvas's drag) New dates for one milestone — a moved bar or a dragged end — and the move carried to everything that follows it. Answers
 * the one sentence the page says ("Carpentry moved 1 week later. 3 milestones followed.") and what Undo needs.
 */
export async function moveMilestone(id: string, input: { start: string; end: string }): Promise<{ sentence: string; undo: MoveUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const start = dayArg(input.start), end = dayArg(input.end)
  if (start === null || end === null) return { error: 'Choose real dates' }
  if (end < start) return { error: 'A milestone ends on or after the day it starts' }
  if (end - start > DAYS_MAX) return { error: 'A milestone runs ten years at most' }
  const g = await forMilestone(id)
  if ('error' in g) return g
  const me = g.list.find((m) => m.id === id)!
  if (me.start === start && me.end === end) return { sentence: '', undo: { projectId: g.p.id, rows: [], eventId: null } }
  if (asksPastEnd(g.viewer.role, me, dayOf(new Date()), end)) return { error: MORE_TIME_RULE }   // (simplify Q-18) the page asks for more time instead
  const { list, followed } = moveWith(g.list, id, start, end)
  const w = await writeDates(g.list, list)
  await syncTarget(g.p.id)
  const sentence = moveSentence(me.title, me, { start, end }, followed.length) + tasksWord(w.tasks.length, followed.length > 0)
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_moved', { ...ev(g.p), id, title: me.title, from: rangeLabel(me.start, me.end), to: rangeLabel(start, end), n: followed.length })
  touch(g.p.id, g.p.leadId)
  return { sentence, undo: undoOf(g.p.id, w, eventId) }
}
const undoOf = (projectId: string, w: { prev: Milestone[]; tasks: { id: string; due: number }[] }, eventId: string | null): MoveUndo =>
  ({ projectId, rows: w.prev.map((m) => ({ id: m.id, start: iso(m.start), end: iso(m.end), gap: m.gap, ...(m.after?.length ? { after: m.after.map((a) => ({ id: a.id, gap: a.gap })) } : {}) })), tasks: w.tasks, eventId })

/** Puts a move's dates back: the milestones (this project's only) and the tasks that moved with them (this project's lead's only). */
async function restoreDates(p: Project, undo: Pick<MoveUndo, 'rows' | 'tasks'>) {
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const now = new Date()
  const rows = Array.isArray(undo.rows) ? undo.rows : []
  const ids = rows.map((r) => r.id).filter((x): x is string => typeof x === 'string')
  const mine = ids.length ? new Set((await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(inArray(projectMilestones.id, ids), eq(projectMilestones.projectId, p.id)))).map((r) => r.id)) : new Set<string>()
  for (const r of rows) {
    const s = dayArg(r.start), e = dayArg(r.end)
    if (!mine.has(r.id) || s === null || e === null || e < s) continue
    await db.update(projectMilestones).set({ startDate: dateOfDay(s), endDate: dateOfDay(e), gapDays: Math.round(r.gap) || 0, updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, r.id))
    for (const a of Array.isArray(r.after) ? r.after : []) if (typeof a?.id === 'string' && Number.isFinite(a.gap)) await db.update(projectMilestoneLinks).set({ gapDays: Math.round(a.gap) }).where(and(eq(projectMilestoneLinks.milestoneId, r.id), eq(projectMilestoneLinks.afterId, a.id)))
  }
  const tasks = (Array.isArray(undo.tasks) ? undo.tasks : []).filter((t) => typeof t?.id === 'string' && Number.isFinite(t.due))
  if (tasks.length) {
    const ours = new Set((await db.select({ id: leadTasks.id }).from(leadTasks).where(and(inArray(leadTasks.id, tasks.map((t) => t.id)), eq(leadTasks.leadId, p.leadId)))).map((r) => r.id))
    for (const t of tasks) if (ours.has(t.id)) await db.update(leadTasks).set({ dueAt: new Date(t.due), updatedAt: now }).where(eq(leadTasks.id, t.id))
  }
}

/** Undo for a move: every milestone back on the dates it had, the tasks that moved with them too, and the move's line taken out of Activity. */
export async function undoMove(undo: MoveUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(undo.projectId)
  if ('error' in g) return g
  await restoreDates(g.p, undo)
  if (undo.eventId) await db.delete(leadEvents).where(and(eq(leadEvents.id, undo.eventId), eq(leadEvents.projectId, g.p.id)))
  await syncTarget(g.p.id)
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

export type StatusUndo = { id: string; status: MilestoneStatus; doneAt: number | null; eventId: string; move?: MoveUndo | null
  /** (gaps build, package C — 10) the day it started, as it was (ms) — a first start stamps it */
  startedAt?: number | null
  /** (gaps build, package C — 8) the Done waiting for approval, as it was (by · at ms) — an ask or an answer changes it */
  doneAsked?: { by: string | null; at: number } | null
  /** (simplify S-18) the ticks that rode with a waiting Done, as they were (`done_ask_json`) — an ask or an answer changes them */
  ticksBefore?: string | null
  /** (parity map, CP-064) a Blocked stage's expected restart, as it was (ms) — leaving Blocked clears it */
  resumeOn?: number | null }

/**
 * (B-09) Done before its last day: the milestone ends today (it never ends in the future once done; one not begun yet runs today alone).
 * What follows keeps its dates unless `bringForward` — then the move carries it, as every move does. Answers the new list and the sentence's
 * tail ("it ended today, 24 days early. Painting and 2 more now start sooner.").
 */
function doneEarly(list: Milestone[], id: string, today: number, bringForward: boolean,
  /** (simplify S-18) the Mark done sheet's own day: "it ended Mon 5 Oct" when it is not today */ o: { day?: string } = {}): { list: Milestone[]; words: string; followed: string[] } | null {
  const me = list.find((m) => m.id === id)
  if (!me || me.end <= today) return null
  const ns = Math.min(me.start, today), early = me.end - today
  let next: Milestone[]
  let followed: string[] = []
  if (bringForward) ({ list: next, followed } = moveWith(list, id, ns, today))
  else {
    /* followers keep their own dates: only their gaps are read again from the new end */
    next = list.map((m) => (m.id === id ? { ...m, start: ns, end: today } : m))
    next = next.map((m) => (m.followsId === id ? { ...m, gap: m.start - today } : m))
    /* (gaps build, package C — 6) and a further link to it reads its gap again too */
    next = next.map((m) => (m.after?.some((a) => a.id === id) ? { ...m, after: m.after.map((a) => (a.id === id ? { ...a, gap: m.start - today } : a)) } : m))
  }
  const names = followed.map((f) => list.find((m) => m.id === f)!.title)
  const ahead = names.length ? ` ${shortTitle(names[0]!)}${names.length > 1 ? ` and ${names.length - 1} more` : ''} now start${names.length > 1 ? '' : 's'} sooner.` : ''
  return { list: next, words: ` — it ended ${o.day ?? 'today'}, ${spanWord(early)} early.${ahead}`, followed }
}
/** (B-09) "8 of 14 tasks inside are still open." */
const openTasksWord = (m: Milestone | undefined) => (m && m.tasks.total > m.tasks.done ? ` ${m.tasks.total - m.tasks.done} of ${plural(m.tasks.total, 'task')} inside ${m.tasks.total - m.tasks.done === 1 ? 'is' : 'are'} still open.` : '')

/** A milestone's status — Not started · In progress · Blocked · Done. Done stamps the day; leaving Done clears it. (B-09) Done before its end
    ends it today — `bringForward` carries what follows forward with it — and the answer says so, and what is still open inside it.
    (gaps build, package C — 10) The first move to In progress logs the day it really started. (8) While Settings › Projects › Milestone
    completion needs approval is on, a Designer's or a Manager's Done waits for an Owner or an Admin (`asked`): the status stays, the ask is
    on the record and the bell, and its Undo takes the ask back. Any other status change ends a waiting ask. */
export async function setMilestoneStatus(id: string, status: MilestoneStatus, o: { bringForward?: boolean } = {}): Promise<{ undo: StatusUndo; sentence: string; asked?: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  if (!isMilestoneStatus(status)) return { error: 'Choose a status' }
  const g = await forMilestone(id)
  if ('error' in g) return g
  const was = g.row.status as MilestoneStatus
  if (was === status) return { error: `It is already ${STATUS_LABEL[status].toLowerCase()}` }
  const now = new Date()
  const me = g.list.find((m) => m.id === id)
  const before = { id, status: was, doneAt: g.row.doneAt?.getTime() ?? null, startedAt: g.row.startedAt?.getTime() ?? null, doneAsked: g.row.doneAskedAt ? { by: g.row.doneAskedBy, at: g.row.doneAskedAt.getTime() } : null,
    ...(g.row.resumeOn ? { resumeOn: g.row.resumeOn.getTime() } : {}) }   // (parity map, CP-064)
  if (status === 'done' && !doneAtOnce(g.viewer.role, await fetchScheduleRules())) {
    if (g.row.doneAskedAt) return { error: `${shortTitle(g.row.title)} already waits for an Owner or an Admin to approve it as done` }
    await db.update(projectMilestones).set({ doneAskedBy: stampBy, doneAskedAt: now, updatedAt: now }).where(eq(projectMilestones.id, id))
    const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_done_asked', { ...ev(g.p), id, title: g.row.title })
    await tellRunners(g.p, `${await actorName()} marked ${g.row.title} done — approve it?`, g.p.name, `/projects/${g.p.id}/schedule?open=${id}`)
    touch(g.p.id, g.p.leadId)
    return { undo: { ...before, eventId }, sentence: `${shortTitle(g.row.title)} waits for an Owner or an Admin to approve it as done.`, asked: true }
  }
  const early = status === 'done' ? doneEarly(g.list, id, dayOf(now), !!o.bringForward) : null
  /* (10) the day it started: the first In progress — or, marked straight done or blocked, its own first day (or today, were that later) */
  const started = g.row.startedAt ?? (status === 'in_progress' ? now : status === 'done' || status === 'blocked' ? (me && me.start <= dayOf(now) ? dateOfDay(me.start) : now) : null)
  await db.update(projectMilestones).set({ status, doneAt: status === 'done' ? now : null, startedAt: started, doneAskedBy: null, doneAskedAt: null, updatedBy: stampBy, updatedAt: now,
    ...(status !== 'blocked' ? { resumeOn: null } : {}) }).where(eq(projectMilestones.id, id))   // (parity map, CP-064) the restart day goes with the pause
  let move: MoveUndo | null = null
  if (early) { const w = await writeDates(g.list, early.list, id); move = undoOf(g.p.id, w, null); await syncTarget(g.p.id) }
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_status', { ...ev(g.p), id, title: g.row.title, from: STATUS_LABEL[was] ?? was, to: STATUS_LABEL[status] })
  touch(g.p.id, g.p.leadId)
  const sentence = `${shortTitle(g.row.title)} marked ${STATUS_LABEL[status].toLowerCase()}${early ? early.words : '.'}${status === 'done' ? openTasksWord(me) : ''}`
  return { undo: { ...before, eventId, move }, sentence }
}
export async function undoMilestoneStatus(u: StatusUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!isMilestoneStatus(u.status)) return { error: 'Choose a status' }
  const g = await forMilestone(u.id)
  if ('error' in g) return g
  const set: Partial<typeof projectMilestones.$inferInsert> = { status: u.status, doneAt: u.doneAt ? new Date(u.doneAt) : null, updatedAt: new Date() }
  if (u.startedAt !== undefined) set.startedAt = typeof u.startedAt === 'number' ? new Date(u.startedAt) : null
  if (u.doneAsked !== undefined) { set.doneAskedBy = u.doneAsked && typeof u.doneAsked.by === 'string' ? u.doneAsked.by : null; set.doneAskedAt = u.doneAsked && Number.isFinite(u.doneAsked.at) ? new Date(u.doneAsked.at) : null }
  if (u.ticksBefore !== undefined) set.doneAskJson = parseDoneTicks(u.ticksBefore) ? u.ticksBefore : null   // (simplify S-18)
  if (typeof u.resumeOn === 'number' && Number.isFinite(u.resumeOn) && u.status === 'blocked') set.resumeOn = new Date(u.resumeOn)   // (parity map, CP-064)
  await db.update(projectMilestones).set(set).where(eq(projectMilestones.id, u.id))
  if (u.move) { await restoreDates(g.p, u.move); await syncTarget(g.p.id) }
  await dropLine(g.p, u.eventId)
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── (gaps build, package C — 8) A Done that waits for an Owner or an Admin ──────────────────────────────────────────────────────── */

/** The Owner's or the Admin's approval of a waiting Done: the milestone is done on the day it was marked (ending then if it ran on past it —
    what follows keeps its dates, or comes forward with `bringForward`), and whoever asked hears it. One sentence, one Undo. */
export async function approveMilestoneDone(id: string, o: { bringForward?: boolean } = {}): Promise<{ undo: DoneUndo; sentence: string; told?: DoneTold } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(id)
  if ('error' in g) return g
  if (!answersSchedule(g.viewer.role)) return { error: ANSWER_RULE }
  if (!g.row.doneAskedAt) return { error: g.row.status === 'done' ? 'It is already done' : 'Nobody asked for it to be approved as done' }
  const now = new Date()
  const asked = g.row.doneAskedAt, by = g.row.doneAskedBy
  /* (simplify S-18) the ticks that rode with the ask: its day and whether what follows comes forward — then, once it is done, the rest of
     them run as this approver (today, approving ran none of them) */
  const ticks = parseDoneTicks(g.row.doneAskJson)
  const askedDay = Math.min(ticks?.day ?? dayOf(asked), dayOf(now))
  const before: Omit<StatusUndo, 'eventId'> = { id, status: g.row.status as MilestoneStatus, doneAt: g.row.doneAt?.getTime() ?? null, startedAt: g.row.startedAt?.getTime() ?? null, doneAsked: { by, at: asked.getTime() } }
  const me = g.list.find((m) => m.id === id)
  const early = doneEarly(g.list, id, askedDay, ticks ? ticks.bringForward : !!o.bringForward, { day: dayMonth(askedDay) })
  const doneAt = ticks ? (askedDay === dayOf(asked) ? asked : dateOfDay(askedDay)) : asked
  await db.update(projectMilestones).set({ status: 'done', doneAt, startedAt: g.row.startedAt ?? doneAt, doneAskedBy: null, doneAskedAt: null, doneAskJson: null, updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, id))
  let move: MoveUndo | null = null
  if (early) { const w = await writeDates(g.list, early.list, id); move = undoOf(g.p.id, w, null); await syncTarget(g.p.id) }
  const requester = await nameOf(by)
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_done_approved', { ...ev(g.p), id, title: g.row.title, requester: requester ?? undefined })
  await tellMember(by, g.p, `${await actorName()} approved ${g.row.title} as done`, g.p.name, `/projects/${g.p.id}/schedule?open=${id}`)
  /* (simplify round 2, R2-C) the client's emails the ticks raise wait out the snackbar's Undo; the photos post as the one who asked */
  const held = ticks && ticksCarry(ticks) ? await holdClientMail(UNDO_SNACKBAR_MS, () => runDoneTicks(g.p, id, ticks, g.viewer.role, now, { author: by })) : null
  const ran = held?.result ?? null
  touch(g.p.id, g.p.leadId)
  const head = `${shortTitle(g.row.title)} is done — approved${requester ? ` for ${requester.split(' ')[0]}` : ''}`
  const tail = ran?.parts.length ? `; ${ran.parts.join('; ')}` : ''
  return {
    undo: { ...before, eventId, move, at: now.getTime(), ticksBefore: g.row.doneAskJson ?? null, ...(ran?.undo ?? {}), held: held?.held.ids ?? [] },
    sentence: `${head}${tail}${early ? early.words.replace(/^ — it ended [^,]+/, `. It ended ${dayMonth(askedDay)}`) : '.'}${openTasksWord(me)}${ran?.refused.length ? ` ${ran.refused.join(' ')}` : ''}`,
    told: ran?.told,
  }
}
/** Sends a waiting Done back with a note: the milestone stays as it was, whoever asked reads the note in the bell. */
export async function sendBackMilestoneDone(id: string, input: { note: string }): Promise<{ undo: StatusUndo; sentence: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(id)
  if ('error' in g) return g
  if (!answersSchedule(g.viewer.role)) return { error: ANSWER_RULE }
  if (!g.row.doneAskedAt) return { error: 'Nobody asked for it to be approved as done' }
  const note = clean(input?.note, 300)
  if (!note) return { error: 'Say what is still to do' }
  const by = g.row.doneAskedBy
  const before: Omit<StatusUndo, 'eventId'> = { id, status: g.row.status as MilestoneStatus, doneAt: g.row.doneAt?.getTime() ?? null, doneAsked: { by, at: g.row.doneAskedAt.getTime() }, ticksBefore: g.row.doneAskJson ?? null }
  /* (simplify S-18) the ticks that rode with it go with the ask — whoever marks it done again ticks them again */
  await db.update(projectMilestones).set({ doneAskedBy: null, doneAskedAt: null, doneAskJson: null, updatedAt: new Date() }).where(eq(projectMilestones.id, id))
  const requester = await nameOf(by)
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_done_sent_back', { ...ev(g.p), id, title: g.row.title, note, requester: requester ?? undefined })
  await tellMember(by, g.p, `${await actorName()} sent ${g.row.title} back — not done yet`, `“${note}”`, `/projects/${g.p.id}/schedule?open=${id}`)
  touch(g.p.id, g.p.leadId)
  return { undo: { ...before, eventId }, sentence: `${shortTitle(g.row.title)} sent back${requester ? ` to ${requester.split(' ')[0]}` : ''} with your note.` }
}
/** Whoever asked takes the ask back (or an Owner or an Admin clears it). */
export async function withdrawMilestoneDone(id: string): Promise<{ undo: StatusUndo; sentence: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(id)
  if ('error' in g) return g
  if (!g.row.doneAskedAt) return { error: 'Nothing waits on it' }
  const me = await sessionMemberId()
  if (g.row.doneAskedBy !== me && !answersSchedule(g.viewer.role)) return { error: 'Only whoever asked, an Owner or an Admin takes the ask back' }
  const before: Omit<StatusUndo, 'eventId'> = { id, status: g.row.status as MilestoneStatus, doneAt: g.row.doneAt?.getTime() ?? null, doneAsked: { by: g.row.doneAskedBy, at: g.row.doneAskedAt.getTime() }, ticksBefore: g.row.doneAskJson ?? null }
  await db.update(projectMilestones).set({ doneAskedBy: null, doneAskedAt: null, doneAskJson: null, updatedAt: new Date() }).where(eq(projectMilestones.id, id))   // (simplify S-18) its ticks with it
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_done_withdrawn', { ...ev(g.p), id, title: g.row.title })
  touch(g.p.id, g.p.leadId)
  return { undo: { ...before, eventId }, sentence: `You took back the ask to approve ${shortTitle(g.row.title)} as done.` }
}

/* ── (simplify S-18, the owner's "build everything", 2026-10-09; P2 §6.3) The Mark done sheet ──────────────────────────────────────────
   One sheet for every Done — the row's Mark done, its ⋮, the panel's Status → Done, a phone row's Done, `?done=<id>`: the day it ended (today,
   back to its start), what follows brought forward, and the steps studios take with it as ticks — show it on the client's schedule as done
   (with the other changes ticked), ask them to confirm it, photos posted as an update, the stage's invoice sent (or submitted). Each tick runs
   today's own action under today's rule (`shareSchedule` · `saveProjectUpdate` · `sendInvoice` / `submitInvoice`); a Done that waits for an
   Owner's or an Admin's approval keeps its ticks on the record (`done_ask_json`) and they run when it is approved. One sentence, one Undo. */

/** What went out to the client — the browser drafts the WhatsApp from it (lib/projects/tell-client.ts). `link` is the invoice's no-login page. */
export type DoneTold = { shared: boolean; confirm: boolean; photos: boolean; invoice: { stage: string; amountMinor: number; number: string | null; dueAt: number | null; link: string | null } | null }
/** Mark done's Undo: the status's (the dates and the follows) and each tick's own way back. */
export type DoneUndo = StatusUndo & {
  /** When it ran (ms) — what came after it (the client's answer, a payment) refuses the Undo. */
  at?: number
  /** confirm_asked_at as it was (ms), when the tick asked the client. */
  confirmBefore?: number | null
  /** The share the tick stored, or the ask to share it made under share approval. */
  shareId?: string | null
  shareAskId?: string | null
  /** The update the photos posted. */
  updateId?: string | null
  /** The stage's invoice, sent or submitted. */
  invoice?: InvoiceRevert | null
  /** (simplify round 2, R2-C) the client's emails the ticks raised (the share's, the photos', the invoice's), held for the Undo — outbox rows */
  held?: string[]
}
export type MarkDoneRead = {
  projectId: string
  project: { name: string; client: string; first: string }
  milestone: { id: string; title: string; start: number; end: number; status: MilestoneStatus; tasksOpen: number; tasksTotal: number; doneAsked: boolean; confirmAsked: boolean; visible: boolean }
  today: number
  /** What moves with it and is not done — brought forward when it ends early. */
  followers: { id: string; title: string }[]
  /** It is the handover stage (the milestone that ends last). */
  handover: boolean
  /** Ask the client to confirm it — on for the handover stage and for a milestone that asks already (a template's item that asks). */
  askDefault: boolean
  /** This viewer's Done waits for an Owner or an Admin (Settings › Projects › Milestone completion needs approval). */
  approval: boolean
  /** 'ask' = this viewer's share asks an Owner or an Admin. `first` = the client has never been shown the schedule. `others` = the other changes
      they haven't seen, in Share changes' words. */
  share: { mode: 'now' | 'ask'; first: boolean; others: { id: string; title: string; was?: string; now: string }[] }
  portal: { live: boolean; withdrawn: boolean; phone: string | null; mobile: boolean; path: string; studio: string; paused: boolean }
  /** The photos' update goes for review (the update review rule, for this viewer). */
  review: boolean
  /** The stage's invoice still to send — only for whoever sees money (F-17). `mode`: send at once, submit for approval, or it waits already. */
  invoice: { id: string; stage: string; amountMinor: number; pct: number | null; mode: 'send' | 'submit' | 'awaiting' } | null
}

/** The sheet's facts for one milestone — its project's team (and their Managers), Owners and Admins only, as every schedule change. */
export async function readMarkDone(id: string): Promise<MarkDoneRead | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(id)
  if ('error' in g) return g
  const me = g.list.find((m) => m.id === id)
  if (!me) return { error: GONE }
  const now = new Date(), today = dayOf(now)
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, g.p.leadId)).limit(1)
  const client = titleCaseName(lead?.name ?? 'The client')
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, g.p.leadId))).map((r) => r.memberId)
  const [rules, shares, tell, review, reviewers] = await Promise.all([fetchScheduleRules(), latestShares([g.p.id]), clientTellFacts(g.p.leadId), fetchUpdateReview(), fetchUpdateReviewers()])
  const last = shares.get(g.p.id) ?? null
  const h = handoverOf(g.list)
  const changes = scheduleChanges(clientRows(g.list), last?.snapshot ?? null).filter((c) => c.id !== id)
  /* the stage's invoice: the live one on the payment stage tied to this milestone, not sent yet — money only for whoever sees it (F-17) */
  let invoice: MarkDoneRead['invoice'] = null
  if (me.paymentRef && seesMoney(g.viewer, team)) {
    const [summary, invoiceRules] = await Promise.all([moneySummaryOf(g.p), fetchInvoiceRules()])
    const stage = summary.stages.find((s) => s.ref === me.paymentRef)
    const i = stage?.invoice
    if (stage && i && (i.state === 'draft' || i.state === 'ready' || i.state === 'awaiting') && i.amountMinor > 0) {
      invoice = { id: i.id, stage: stage.name, amountMinor: i.amountMinor, pct: Number.isFinite(stage.pct) ? stage.pct : null,
        mode: i.state === 'awaiting' ? 'awaiting' : sendsAtOnce(g.viewer.role, invoiceRules) ? 'send' : 'submit' }
    }
  }
  return {
    projectId: g.p.id,
    project: { name: g.p.name, client, first: client.split(/\s+/)[0] ?? client },
    milestone: { id, title: me.title, start: me.start, end: me.end, status: me.status, tasksOpen: me.tasks.total - me.tasks.done, tasksTotal: me.tasks.total, doneAsked: !!me.doneAsked, confirmAsked: me.confirm.askedAt !== null, visible: me.clientVisible },
    today,
    followers: followersOf(g.list, id).map((f) => g.list.find((m) => m.id === f)).filter((m): m is Milestone => !!m && m.status !== 'done').map((m) => ({ id: m.id, title: m.title })),
    handover: h?.id === id,
    askDefault: h?.id === id || me.confirm.askedAt !== null,
    approval: !doneAtOnce(g.viewer.role, rules),
    share: { mode: sharesAtOnce(g.viewer.role, rules) ? 'now' : 'ask', first: !last, others: changes.map((c) => ({ id: c.id, title: c.title, ...changeWords(c, h?.id ?? null) })) },
    portal: tell ? { live: tell.live, withdrawn: tell.withdrawn, phone: tell.phone, mobile: tell.mobile, path: tell.path, studio: tell.studio, paused: tell.paused } : { live: false, withdrawn: false, phone: null, mobile: false, path: '', studio: '', paused: false },
    review: !publishesAtOnce(review, g.viewer.role, { id: g.viewer.id, reviewers }),
    invoice,
  }
}

export type MarkDoneInput = { day: string; bringForward: boolean; share: boolean; shareOnly: string[]; askConfirm: boolean; fileIds: string[]; invoiceId: string | null }
/** Mark done, with what the sheet ticked. Done at once — or, under approval, asked with its ticks kept for the approver. One sentence, one Undo. */
export async function markMilestoneDone(id: string, input: MarkDoneInput): Promise<{ sentence: string; undo: DoneUndo; asked?: boolean; told?: DoneTold } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(id)
  if ('error' in g) return g
  const me = g.list.find((m) => m.id === id)
  if (!me) return { error: GONE }
  if (g.row.status === 'done') return { error: `${shortTitle(g.row.title)} is already done` }
  const now = new Date(), today = dayOf(now)
  /* the day it ended: today, or back to its own first day — never later than today, never before it began */
  const asked = dayArg(input?.day)
  const day = Math.max(Math.min(me.start, today), Math.min(today, asked ?? today))
  const ticks: DoneTicks = { day, bringForward: input?.bringForward === true, share: input?.share === true, shareOnly: (Array.isArray(input?.shareOnly) ? input.shareOnly : []).filter((x): x is string => typeof x === 'string').slice(0, 60),
    askConfirm: input?.askConfirm === true, fileIds: (Array.isArray(input?.fileIds) ? input.fileIds : []).filter((x): x is string => typeof x === 'string').slice(0, 12), invoiceId: typeof input?.invoiceId === 'string' && input.invoiceId ? input.invoiceId : null }
  const before = { id, status: g.row.status as MilestoneStatus, doneAt: g.row.doneAt?.getTime() ?? null, startedAt: g.row.startedAt?.getTime() ?? null, doneAsked: g.row.doneAskedAt ? { by: g.row.doneAskedBy, at: g.row.doneAskedAt.getTime() } : null, ticksBefore: g.row.doneAskJson ?? null }
  /* (gaps build, package C — 8) a Designer's or a Manager's Done waits for an Owner or an Admin — now with its ticks on the record */
  if (!doneAtOnce(g.viewer.role, await fetchScheduleRules())) {
    if (g.row.doneAskedAt) return { error: `${shortTitle(g.row.title)} already waits for an Owner or an Admin to approve it as done` }
    await db.update(projectMilestones).set({ doneAskedBy: stampBy, doneAskedAt: now, doneAskJson: JSON.stringify(ticks), updatedAt: now }).where(eq(projectMilestones.id, id))
    const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_done_asked', { ...ev(g.p), id, title: g.row.title })
    await tellRunners(g.p, `${await actorName()} marked ${g.row.title} done — approve it?`, g.p.name, `/projects/${g.p.id}/schedule?open=${id}`)
    touch(g.p.id, g.p.leadId)
    return { undo: { ...before, eventId, at: now.getTime() }, asked: true,
      sentence: `${shortTitle(g.row.title)} waits for an Owner or an Admin to approve it as done${ticksCarry(ticks) ? ' — what you ticked runs when they do' : ''}.` }
  }
  const early = doneEarly(g.list, id, day, ticks.bringForward, { day: day === today ? 'today' : dayLabel(day) })
  const doneAt = day === today ? now : dateOfDay(day)
  const started = g.row.startedAt ?? (me.start <= day ? dateOfDay(me.start) : doneAt)
  await db.update(projectMilestones).set({ status: 'done', doneAt, startedAt: started, doneAskedBy: null, doneAskedAt: null, doneAskJson: null, updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, id))
  let move: MoveUndo | null = null
  if (early) { const w = await writeDates(g.list, early.list, id); move = undoOf(g.p.id, w, null); await syncTarget(g.p.id) }
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_status', { ...ev(g.p), id, title: g.row.title, from: STATUS_LABEL[before.status] ?? before.status, to: STATUS_LABEL.done })
  const held = ticksCarry(ticks) ? await holdClientMail(UNDO_SNACKBAR_MS, () => runDoneTicks(g.p, id, ticks, g.viewer.role, now)) : null   // (simplify round 2, R2-C)
  const ran = held?.result ?? null
  touch(g.p.id, g.p.leadId)
  const when = early ? '' : day < today ? ` on ${dayLabel(day)}` : ''
  const tail = ran?.parts.length ? ` — ${ran.parts.join('; ')}` : ''
  const sentence = `${shortTitle(g.row.title)} marked done${when}${tail}${early ? early.words.replace(/^ — it ended (today|[^,]+), /, tail ? '. It ended $1, ' : ' — it ended $1, ') : '.'}${openTasksWord(me)}${ran?.refused.length ? ` ${ran.refused.join(' ')}` : ''}`
  return { sentence, undo: { ...before, eventId, move, at: now.getTime(), ...(ran?.undo ?? {}), held: held?.held.ids ?? [] }, told: ran?.told }
}

/** The ticks, in the order the client meets them: the ask to confirm (so the share carries it — `waitsForClient` needs both), the share, the
    photos' update, the invoice (once the milestone is done its stage is ready). Each runs as the one who pressed (or approved); a refusal is
    said, never thrown, and the rest still run. */
async function runDoneTicks(p: Project, id: string, t: DoneTicks, role: string, at: Date,
  /** (simplify round 2, R2-C) under approval: the member who asked — the photos' update is theirs (`asAskedBy`), never a browser's say */ o: { author?: string | null } = {}): Promise<{ parts: string[]; refused: string[]; undo: Partial<DoneUndo>; told: DoneTold }> {
  const parts: string[] = [], refused: string[] = [], undo: Partial<DoneUndo> = {}
  const told: DoneTold = { shared: false, confirm: false, photos: false, invoice: null }
  const [row] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, id)).limit(1)
  if (!row) return { parts, refused, undo, told }
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, p.leadId)).limit(1)
  const first = titleCaseName(lead?.name ?? 'The client').split(/\s+/)[0] ?? 'the client'
  const say = (what: string, why: string) => refused.push(`Couldn’t ${what} — ${why.replace(/[.]+$/, '')}.`)
  /* 1 · ask the client to confirm it */
  if (t.askConfirm && !row.confirmAskedAt) {
    await db.update(projectMilestones).set({ confirmAskedAt: at, confirmAnswer: null, confirmNote: null, confirmAnsweredAt: null, confirmAnsweredBy: null, updatedAt: at }).where(eq(projectMilestones.id, id))
    undo.confirmBefore = null
  }
  const confirming = t.askConfirm || !!row.confirmAskedAt
  /* 2 · show it on their schedule as done — this milestone and the other changes ticked (Share changes' own action and rule) */
  let shared = false
  if (t.share) {
    const r = await shareSchedule(p.id, { note: '', only: [id, ...t.shareOnly.filter((x) => x !== id)] })
    if ('error' in r) say('share it', r.error)
    else if (r.asked) {
      const [ask] = await db.select({ id: projectShareRequests.id }).from(projectShareRequests).where(and(eq(projectShareRequests.projectId, p.id), eq(projectShareRequests.status, 'pending'))).orderBy(desc(projectShareRequests.requestedAt)).limit(1)
      undo.shareAskId = ask?.id ?? null
      parts.push(`an Owner or an Admin is asked to share it with ${first}`)
    } else {
      const [s] = await db.select({ id: projectScheduleShares.id }).from(projectScheduleShares).where(eq(projectScheduleShares.projectId, p.id)).orderBy(desc(projectScheduleShares.sharedAt)).limit(1)
      undo.shareId = s?.id ?? null
      shared = r.live
      told.shared = r.live
      parts.push(r.live ? `shown to ${first}${confirming ? `, who is asked to confirm it` : ''}` : `kept for ${first}, who sees it once invited`)
    }
  }
  if (t.askConfirm && !shared) parts.push(`${first} is asked to confirm it once it is shared`)
  told.confirm = shared && confirming
  /* 3 · the photos, as an update — "{milestone} is done", under the update review rule */
  if (t.fileIds.length) {
    const r = await asAskedBy(o.author, () => saveProjectUpdate(p.id, { title: `${row.title} is done`.slice(0, 120), html: '', milestoneId: id, fileIds: t.fileIds, intent: 'post' }))
    if ('error' in r) say('post the photos', r.error)
    else { undo.updateId = r.id; told.photos = r.status === 'published'; parts.push(r.status === 'published' ? `${t.fileIds.length === 1 ? 'its photo' : 'its photos'} posted` : `${t.fileIds.length === 1 ? 'its photo' : 'its photos'} sent for review`) }
  }
  /* 4 · the stage's invoice — sent, or submitted for approval (money's own rule) */
  if (t.invoiceId) {
    const [i] = await db.select().from(projectInvoices).where(and(eq(projectInvoices.id, t.invoiceId), eq(projectInvoices.projectId, p.id))).limit(1)
    if (!i || i.status !== 'draft' || (row.paymentRef && i.stageRef !== row.paymentRef)) say('send the invoice', 'it isn’t this stage’s Draft any more')
    else {
      const b = await invoiceBefore(i.id)
      const atOnce = sendsAtOnce(role, await fetchInvoiceRules())
      if (atOnce) {
        const r = await sendInvoice(i.id)
        if ('error' in r) say(`send the ${i.stageName} invoice`, r.error)
        else {
          if (b) undo.invoice = { invoiceId: i.id, projectId: p.id, kind: 'sent', at: at.getTime(), before: b }
          const [sent] = await db.select({ shareToken: projectInvoices.shareToken, amountMinor: projectInvoices.amountMinor }).from(projectInvoices).where(eq(projectInvoices.id, i.id)).limit(1)
          told.invoice = { stage: i.stageName, amountMinor: sent?.amountMinor ?? i.amountMinor, number: r.number, dueAt: r.dueAt, link: sent?.shareToken ? `/invoice/${sent.shareToken}` : null }
          parts.push(`${r.number} sent`)
        }
      } else if (i.submittedAt) parts.push(`the ${i.stageName} invoice already waits for approval`)
      else {
        const r = await submitInvoice(i.id)
        if ('error' in r) say(`submit the ${i.stageName} invoice`, r.error)
        else { if (b) undo.invoice = { invoiceId: i.id, projectId: p.id, kind: 'submitted', at: at.getTime(), before: b }; parts.push(`the ${i.stageName} invoice submitted for approval`) }
      }
    }
  }
  return { parts, refused, undo, told }
}

/** Mark done's Undo — every tick taken back, then the Done: refused once the client answered the stage or paid its invoice since, or saw the
    photos (a published update they opened stays). (simplify round 2, R2-C) The client's emails the ticks raised are still held for this Undo —
    they are deleted, so they never go (`unsent` says whose); one that went already (its window passed) can't be unsent. */
export async function undoMarkDone(u: DoneUndo): Promise<{ ok: true; unsent: HeldMail } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(typeof u?.id === 'string' ? u.id : '')
  if ('error' in g) return g
  if (!isMilestoneStatus(u.status)) return { error: 'Choose a status' }
  const at = typeof u.at === 'number' && Number.isFinite(u.at) ? u.at : Date.now()
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, g.p.leadId)).limit(1)
  const first = titleCaseName(lead?.name ?? 'The client').split(/\s+/)[0] ?? 'The client'
  /* what came after it keeps it */
  if (g.row.confirmAnsweredAt && g.row.confirmAnsweredAt.getTime() > at) return { error: `${first} has answered since — ${shortTitle(g.row.title)} stays done` }
  if (u.invoice && typeof u.invoice.invoiceId === 'string') {
    const block = await invoiceRevertBlock({ invoiceId: u.invoice.invoiceId, projectId: g.p.id }, first)
    if (block) return { error: block }
  }
  if (typeof u.updateId === 'string' && u.updateId) {
    const [up] = await db.select({ status: projectUpdates.status, clientOpenedAt: projectUpdates.clientOpenedAt }).from(projectUpdates).where(and(eq(projectUpdates.id, u.updateId), eq(projectUpdates.projectId, g.p.id))).limit(1)
    if (up?.status === 'published' && up.clientOpenedAt) return { error: `${first} has seen the photos since — ${shortTitle(g.row.title)} stays done` }
  }
  /* (simplify round 2, R2-C) the client's emails the ticks raised, still held — they never go */
  const unsent = await cancelHeldMessages(u.held, g.p.leadId)
  /* the invoice back to its Draft */
  if (u.invoice && u.invoice.projectId === g.p.id) await revertInvoice(u.invoice)
  /* the photos' update goes (withdrawn first when it went out — an update the client sees is never deleted under them) */
  if (typeof u.updateId === 'string' && u.updateId) {
    const [up] = await db.select({ status: projectUpdates.status }).from(projectUpdates).where(and(eq(projectUpdates.id, u.updateId), eq(projectUpdates.projectId, g.p.id), isNull(projectUpdates.deletedAt))).limit(1)
    if (up) {
      const lines: string[] = []
      if (up.status === 'published') { const w = await withdrawProjectUpdate(u.updateId); if (!('error' in w)) lines.push(w.eventId) }
      const d = await deleteProjectUpdate(u.updateId)
      if (!('error' in d)) lines.push(d.eventId)
      await db.delete(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), inArray(leadEvents.kind, ['project_update_posted', 'project_update_submitted']), gte(leadEvents.at, new Date(at - 2000)), sql`json_extract(${leadEvents.detail}, '$.id') = ${u.updateId}`))
      if (lines.length) await db.delete(leadEvents).where(inArray(leadEvents.id, lines))
    }
  }
  /* the share the tick stored — while it is still the newest — or the ask to share it */
  if (typeof u.shareId === 'string' && u.shareId) {
    const [newest] = await db.select({ id: projectScheduleShares.id }).from(projectScheduleShares).where(eq(projectScheduleShares.projectId, g.p.id)).orderBy(desc(projectScheduleShares.sharedAt)).limit(1)
    if (newest?.id === u.shareId) {
      await db.delete(projectScheduleShares).where(eq(projectScheduleShares.id, u.shareId))
      await db.delete(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), eq(leadEvents.kind, 'project_schedule_shared'), gte(leadEvents.at, new Date(at - 2000))))
      /* (parity map, SC-084) the team's "shared the schedule" rows go with the share they told of */
      await db.delete(notifications).where(and(eq(notifications.kind, 'schedule_shared'), eq(notifications.href, `/projects/${g.p.id}/schedule`), gte(notifications.createdAt, new Date(at - 2000))))
    }
  }
  if (typeof u.shareAskId === 'string' && u.shareAskId) {
    await db.delete(projectShareRequests).where(and(eq(projectShareRequests.id, u.shareAskId), eq(projectShareRequests.projectId, g.p.id), eq(projectShareRequests.status, 'pending')))
    await db.delete(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), eq(leadEvents.kind, 'project_schedule_share_asked'), gte(leadEvents.at, new Date(at - 2000))))
    await db.delete(notifications).where(and(eq(notifications.kind, 'schedule_ask'), eq(notifications.href, `/projects/${g.p.id}/schedule?share=1`), gte(notifications.createdAt, new Date(at - 2000))))
  }
  /* the ask to confirm, as it was */
  if (u.confirmBefore !== undefined) await db.update(projectMilestones).set({ confirmAskedAt: typeof u.confirmBefore === 'number' ? new Date(u.confirmBefore) : null, updatedAt: new Date() }).where(eq(projectMilestones.id, u.id))
  /* then the Done itself — the status, the dates, the ask and its ticks */
  const r = await undoMilestoneStatus(u)
  return 'error' in r ? r : { ...r, unsent }
}

/* ── the bell for the schedule's asks (gaps build, package C — 5 · 8) ── */
async function actorName(): Promise<string> {
  const id = await sessionMemberId()
  return (await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1))[0]?.name ?? 'A member'
}
async function nameOf(id: string | null): Promise<string | null> {
  return id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1))[0]?.name ?? null : null
}
/** An ask reaches the studio's Owners and Admins (never the one asking — `notify` leaves the actor out). */
async function tellRunners(p: Project, title: string, body: string, href: string) {
  await notify('schedule_ask', await studioRunnerIds(), { title, body, href, leadId: p.leadId })
}
/** An answer reaches whoever asked. */
async function tellMember(memberId: string | null, p: Project, title: string, body: string, href: string) {
  if (memberId) await notify('schedule_answer', [memberId], { title, body, href, leadId: p.leadId })
}
/** An Undo takes its own line away, and the bell rows that line raised (the same milestone's asks or answers, written with it). */
async function dropLine(p: Project, eventId: string | null | undefined) {
  if (typeof eventId !== 'string') return
  const [e] = await db.select({ at: leadEvents.at, kind: leadEvents.kind, detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.id, eventId), eq(leadEvents.projectId, p.id))).limit(1)
  await db.delete(leadEvents).where(and(eq(leadEvents.id, eventId), eq(leadEvents.projectId, p.id)))
  if (!e || !/_(asked|approved|declined|sent_back)$/.test(e.kind)) return
  const id = (e.detail as { id?: string } | null)?.id
  const since = new Date(e.at.getTime() - 1000)
  const href = id ? `/projects/${p.id}/schedule?open=${id}` : `/projects/${p.id}/schedule?share=1`
  await db.delete(notifications).where(and(inArray(notifications.kind, ['schedule_ask', 'schedule_answer']), eq(notifications.href, href), gte(notifications.createdAt, since)))
}

/** The milestone panel's Save: everything it shows, in one go — its name, status, dates (a move carries what follows), what it moves with,
    shown to the client, waiting on someone, the payment that falls due, and asking the client to confirm it. */
export type MilestonePatch = {
  title?: string
  status?: MilestoneStatus
  start?: string
  end?: string
  /** '' = keeps its own dates. */
  followsId?: string | null
  clientVisible?: boolean
  waiting?: { on: WaitingOn; memberId?: string | null; name?: string | null; note?: string | null; until?: string | null } | null
  payment?: { ref: string; due: 'start' | 'end' } | null
  askConfirm?: boolean
  /* (gaps build, package C) its words (12), its bar's colour (12, a MILESTONE_COLORS key; null = by status), the further milestones it waits on
     (6, ids — beside `followsId`), what the client reads about a pause on a Blocked stage */
  description?: string
  color?: string | null
  after?: string[]
  clientNote?: string
  /** (parity map, CP-064) a Blocked stage's expected restart, 'yyyy-mm-dd' (null clears it) — leaving Blocked clears it too */
  resumeOn?: string | null
}
/** (B-02) A save's way back, in one press: every field as it was — kept on the save's own Activity line, so the page never sends values to
    write — and the dates (the milestone's, its followers', the tasks that moved with them). */
export type SaveUndo = { id: string; eventId: string | null; move: MoveUndo | null }
/** The columns a panel Save may change, as they were (timestamps in ms). */
function beforeOf(row: Row): Record<string, string | number | boolean | null> {
  const ms = (d: Date | null) => (d ? d.getTime() : null)
  return {
    title: row.title, status: row.status, doneAt: ms(row.doneAt), followsId: row.followsId, gapDays: row.gapDays, clientVisible: row.clientVisible,
    waitingOn: row.waitingOn, waitingMemberId: row.waitingMemberId, waitingName: row.waitingName, waitingNote: row.waitingNote,
    waitingSince: ms(row.waitingSince), waitingUntil: ms(row.waitingUntil), paymentRef: row.paymentRef, paymentDue: row.paymentDue,
    confirmAskedAt: ms(row.confirmAskedAt), confirmAnswer: row.confirmAnswer, confirmNote: row.confirmNote, confirmAnsweredAt: ms(row.confirmAnsweredAt),
    confirmAnsweredBy: row.confirmAnsweredBy,
    /* (gaps build, package C) */
    description: row.description, color: row.color, startedAt: ms(row.startedAt), clientNote: row.clientNote, doneAskedBy: row.doneAskedBy, doneAskedAt: ms(row.doneAskedAt),
    resumeOn: ms(row.resumeOn),   // (parity map, CP-064)
  }
}
/** (gaps build, package C — 6) A milestone's further links as they were, for a save's Undo (JSON on its line). */
async function linksOf(id: string): Promise<{ id: string; gap: number }[]> {
  return (await db.select({ afterId: projectMilestoneLinks.afterId, gap: projectMilestoneLinks.gapDays }).from(projectMilestoneLinks).where(eq(projectMilestoneLinks.milestoneId, id)).orderBy(asc(projectMilestoneLinks.createdAt))).map((r) => ({ id: r.afterId, gap: r.gap }))
}
async function writeLinks(projectId: string, id: string, links: { id: string; gap: number }[]) {
  await db.delete(projectMilestoneLinks).where(eq(projectMilestoneLinks.milestoneId, id))
  const now = new Date()
  if (links.length) await db.insert(projectMilestoneLinks).values(links.map((l, i) => ({ id: randomUUID(), projectId, milestoneId: id, afterId: l.id, gapDays: Math.round(l.gap), createdAt: new Date(now.getTime() + i * 1000) })))
}
/** Text that keeps its lines: control characters out, at most two blank lines in a row, trimmed. */
const cleanText = (s: string | null | undefined, max: number) => (s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
export async function saveMilestone(id: string, patch: MilestonePatch): Promise<{ sentence: string; undo: SaveUndo | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(id)
  if ('error' in g) return g
  const { p, row } = g
  let list = g.list
  const me0 = list.find((m) => m.id === id)!
  const set: Partial<typeof projectMilestones.$inferInsert> = {}
  const fields: FieldChange[] = []
  const now = new Date()
  /* the dates are checked before anything is written — a refusal leaves the row as it was */
  let ns = patch.start !== undefined ? dayArg(patch.start) : me0.start, ne = patch.end !== undefined ? dayArg(patch.end) : me0.end
  if (ns === null || ne === null) return { error: 'Choose real dates' }
  if (ne < ns) return { error: 'A milestone ends on or after the day it starts' }
  if (ne - ns > DAYS_MAX) return { error: 'A milestone runs ten years at most' }
  if (patch.end !== undefined && asksPastEnd(g.viewer.role, me0, dayOf(now), ne)) return { error: MORE_TIME_RULE }   // (simplify Q-18) the panel asks for more time instead
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, p.leadId)).limit(1)
  const client = lead ? titleCaseName(lead.name).split(/\s+/)[0]! : 'the client'
  if (patch.title !== undefined) {
    const t = clean(patch.title, TITLE_MAX)
    if (!t) return { error: 'Give the milestone a name' }
    if (t !== row.title) { set.title = t; fields.push({ key: 'title', label: 'Name', from: row.title, to: t }) }
  }
  if (patch.status !== undefined && patch.status !== row.status) {
    if (!isMilestoneStatus(patch.status)) return { error: 'Choose a status' }
    /* (gaps build, package C — 8) a Designer's or a Manager's Done waits for an Owner or an Admin while the studio asks for approval */
    if (patch.status === 'done' && !doneAtOnce(g.viewer.role, await fetchScheduleRules())) {
      if (!row.doneAskedAt) { set.doneAskedAt = now; fields.push({ key: 'done_asked', label: 'Done', from: 'no', to: 'asked' }) }
    } else {
      set.status = patch.status; set.doneAt = patch.status === 'done' ? now : null
      set.doneAskedBy = null; set.doneAskedAt = null
      if (!row.startedAt && patch.status !== 'not_started') set.startedAt = patch.status === 'in_progress' || me0.start > dayOf(now) ? now : dateOfDay(me0.start)   // (10) the day it really started
      fields.push({ key: 'status', label: 'Status', from: STATUS_LABEL[row.status as MilestoneStatus] ?? row.status, to: STATUS_LABEL[patch.status] })
    }
  }
  /* what it moves with — re-read against its own dates, so changing it moves nothing */
  if (patch.followsId !== undefined && (patch.followsId || null) !== row.followsId) {
    const f = patch.followsId || null
    if (f && !list.some((m) => m.id === f)) return { error: 'That milestone is not there any more' }
    if (f && wouldCycle(list, id, f)) return { error: 'A milestone can’t move with one that moves with it' }
    const lead = f ? list.find((m) => m.id === f)! : null
    list = list.map((m) => (m.id === id ? { ...m, followsId: f, gap: lead ? m.start - lead.end : 0 } : m))
    set.followsId = f; set.gapDays = lead ? me0.start - lead.end : 0
    fields.push({ key: 'follows', label: 'Moves with', from: g.list.find((m) => m.id === row.followsId)?.title ?? 'nothing', to: lead?.title ?? 'nothing' })
  }
  /* (gaps build, package C — 6) the further milestones it waits on, each with its gap read from the dates as they are — so linking moves nothing */
  let newLinks: { id: string; gap: number }[] | null = null
  const linksBefore = await linksOf(id)
  if (patch.after !== undefined) {
    const primary = (patch.followsId !== undefined ? patch.followsId || null : row.followsId)
    const want = [...new Set((Array.isArray(patch.after) ? patch.after : []).filter((x): x is string => typeof x === 'string' && x !== id && x !== primary))].slice(0, 12)
    for (const a of want) {
      if (!list.some((m) => m.id === a)) return { error: 'That milestone is not there any more' }
      if (wouldCycle(list, id, a)) return { error: 'A milestone can’t wait on one that waits on it' }
    }
    const same = want.length === linksBefore.filter((l) => list.some((m) => m.id === l.id)).length && want.every((a) => linksBefore.some((l) => l.id === a))
    if (!same) {
      newLinks = want.map((a) => ({ id: a, gap: me0.start - list.find((m) => m.id === a)!.end }))
      list = list.map((m) => (m.id === id ? { ...m, after: newLinks! } : m))
      const names = (ids: string[]) => listWords(ids.map((x) => g.list.find((m) => m.id === x)?.title).filter((t): t is string => !!t)) || 'nothing'
      fields.push({ key: 'after', label: 'Also waits for', from: names(linksBefore.map((l) => l.id)), to: names(want) })
    }
  }
  if (patch.description !== undefined) {
    const d = cleanText(patch.description, DESCRIPTION_MAX) || null
    if (d !== (row.description ?? null)) { set.description = d; fields.push({ key: 'description', label: 'Description', from: '', to: '' }) }
  }
  if (patch.color !== undefined) {
    const c = patch.color && MILESTONE_COLORS.some((x) => x.key === patch.color) ? patch.color : null
    if (c !== (row.color ?? null)) { set.color = c; fields.push({ key: 'color', label: 'Colour', from: row.color ?? 'none', to: c ? MILESTONE_COLORS.find((x) => x.key === c)!.label : 'none' }) }
  }
  if (patch.clientNote !== undefined) {
    const n = clean(patch.clientNote, CLIENT_NOTE_MAX) || null
    if (n !== (row.clientNote ?? null)) { set.clientNote = n; fields.push({ key: 'client_note', label: 'What the client reads', from: row.clientNote ?? '', to: n ?? '' }) }
  }
  /* (parity map, CP-064) the expected restart: kept only while the stage is Blocked — set, changed or cleared from the panel; leaving Blocked
     clears it with the status (the client's "Resuming around …" goes with the pause) */
  const blockedAfter = (set.status ?? row.status) === 'blocked'
  if (patch.resumeOn !== undefined || (!blockedAfter && row.resumeOn)) {
    const day = blockedAfter && patch.resumeOn ? dayArg(patch.resumeOn) : blockedAfter && patch.resumeOn === undefined && row.resumeOn ? dayOfStored(row.resumeOn) : null
    if (blockedAfter && patch.resumeOn && day === null) return { error: 'Choose a real day for it to resume' }
    const was = row.resumeOn ? dayOfStored(row.resumeOn) : null
    if (day !== was) {
      set.resumeOn = day !== null ? dateOfDay(day) : null
      if (blockedAfter) fields.push({ key: 'resume', label: 'Expected to resume', from: was !== null ? dayLabel(was) : 'no day', to: day !== null ? dayLabel(day) : 'no day' })
    }
  }
  if (patch.clientVisible !== undefined && patch.clientVisible !== row.clientVisible) {
    set.clientVisible = patch.clientVisible
    fields.push({ key: 'shown', label: 'Shown to the client', from: row.clientVisible ? 'yes' : 'no', to: patch.clientVisible ? 'yes' : 'no' })
  }
  if (patch.waiting !== undefined) {
    const w = patch.waiting
    if (w && !(WAITING_ON as readonly string[]).includes(w.on)) return { error: 'Say who it is waiting on' }
    if (w?.on === 'member') {
      const [m] = w.memberId ? await db.select({ id: members.id }).from(members).where(eq(members.id, w.memberId)).limit(1) : []
      if (!m) return { error: 'Choose the member it is waiting on' }
    }
    if (w?.on === 'supplier' && !clean(w.name, 60)) return { error: 'Name the supplier it is waiting on' }
    const until = w?.until ? dayArg(w.until) : null
    const same = !!w && row.waitingOn === w.on
    set.waitingOn = w?.on ?? null; set.waitingMemberId = w?.on === 'member' ? w.memberId ?? null : null; set.waitingName = w?.on === 'supplier' ? clean(w.name, 60) : null
    set.waitingNote = w ? clean(w.note, 80) || null : null; set.waitingUntil = until !== null ? dateOfDay(until) : null
    set.waitingSince = w ? (same && row.waitingSince ? row.waitingSince : now) : null
    /* (B-40) who it waits on, in words — the client's first name, the member's, the supplier's */
    const whoOf = async (on: string | null, memberId: string | null, name: string | null) => (on === 'client' ? client : on === 'supplier' ? name || 'a supplier'
      : on === 'member' ? (memberId ? (await db.select({ name: members.name }).from(members).where(eq(members.id, memberId)).limit(1))[0]?.name.split(' ')[0] : null) ?? 'a member' : 'nobody')
    if ((row.waitingOn ?? null) !== (w?.on ?? null) || (w?.on === 'member' && w.memberId !== row.waitingMemberId) || (w?.on === 'supplier' && set.waitingName !== row.waitingName)) {
      fields.push({ key: 'waiting', label: 'Waiting on', from: await whoOf(row.waitingOn, row.waitingMemberId, row.waitingName), to: await whoOf(w?.on ?? null, set.waitingMemberId ?? null, set.waitingName ?? null) })
    }
  }
  if (patch.payment !== undefined) {
    const pay = patch.payment
    const opts = await paymentOptionsOf(p)
    if (pay) {
      const o = opts.find((x) => x.ref === pay.ref)
      if (!o) return { error: 'That payment stage is not on the schedule any more' }
      /* (B-23) the deposit is paid on signing — no milestone holds it (one tied before keeps it) */
      if (o.onSigning && pay.ref !== row.paymentRef) return { error: `${o.name} is paid on signing — it falls due on no milestone` }
      const other = list.find((m) => m.id !== id && m.paymentRef === pay.ref)
      if (other) return { error: `${o.name} already falls due on ${other.title}` }
    }
    if ((pay?.ref ?? null) !== row.paymentRef || (pay && pay.due !== row.paymentDue)) {
      set.paymentRef = pay?.ref ?? null; set.paymentDue = pay?.due === 'start' ? 'start' : 'end'
      const nameOf = (ref: string | null) => (ref ? opts.find((x) => x.ref === ref)?.name ?? 'tied' : 'none')
      fields.push({ key: 'payment', label: 'Payment', from: nameOf(row.paymentRef), to: nameOf(pay?.ref ?? null) })
    }
  }
  if (patch.askConfirm !== undefined && patch.askConfirm !== !!row.confirmAskedAt) {
    set.confirmAskedAt = patch.askConfirm ? now : null
    /* (B-24) stopping the ask clears the client's answer — the panel asks first when there is one, and the save's Undo brings it back */
    if (!patch.askConfirm) { set.confirmAnswer = null; set.confirmNote = null; set.confirmAnsweredAt = null; set.confirmAnsweredBy = null }   // (r4b) and who answered
    fields.push({ key: 'confirm', label: 'Client confirms', from: row.confirmAskedAt ? 'asked' : 'no', to: patch.askConfirm ? 'asked' : 'no' })
  }
  /* (B-09) marked done while it runs on past today, its dates untouched: it ends today; what follows keeps its own dates */
  let earlyWords = ''
  if (set.status === 'done' && patch.start === undefined && patch.end === undefined) {
    const e = doneEarly(list, id, dayOf(now), false)
    /* keep the milestone as this save left it (a new "moves with" link and its gap) — only its dates come from `doneEarly` */
    if (e) { const me1 = e.list.find((m) => m.id === id)!, meNow = list.find((m) => m.id === id)!; ns = me1.start; ne = me1.end; list = e.list.map((m) => (m.id === id ? meNow : m)); earlyWords = e.words }
  }
  const title = set.title ?? row.title
  if (Object.keys(set).length) await db.update(projectMilestones).set({ ...set, ...(set.doneAskedAt ? { doneAskedBy: stampBy } : {}), updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, id))
  if (newLinks) await writeLinks(p.id, id, newLinks)
  /* the dates last: a move carries what follows (with the follows link as just saved) */
  let move = '', moveUndo: MoveUndo | null = null
  if (ns !== me0.start || ne !== me0.end) {
    const moved = earlyWords ? { list: list.map((m) => (m.id === id ? { ...m, start: ns!, end: ne! } : m)), followed: [] as string[] } : moveWith(list, id, ns, ne)
    const w = await writeDates(g.list, moved.list, earlyWords ? id : null)   // done early: its own tasks keep their due days
    move = earlyWords ? `${shortTitle(title)} marked done${earlyWords}` : moveSentence(title, me0, { start: ns, end: ne }, moved.followed.length) + tasksWord(w.tasks.length, moved.followed.length > 0)
    const eventId = earlyWords ? null : await logProjectEvent(db, p.leadId, p.id, 'project_milestone_moved', { ...ev(p), id, title, from: rangeLabel(me0.start, me0.end), to: rangeLabel(ns, ne), n: moved.followed.length })
    moveUndo = undoOf(p.id, w, eventId)
  }
  const before = { ...beforeOf(row), afterLinks: JSON.stringify(linksBefore) }
  const said = earlyWords ? fields.filter((f) => f.key !== 'status') : fields
  const eventId = !fields.length ? null : await logProjectEvent(db, p.leadId, p.id, fields.length === 1 && fields[0]!.key === 'status' ? 'project_milestone_status' : 'project_milestone_edited',
    fields.length === 1 && fields[0]!.key === 'status' ? { ...ev(p), id, title, from: fields[0]!.from, to: fields[0]!.to, before } : { ...ev(p), id, title, fields, before })
  await syncTarget(p.id)
  touch(p.id, p.leadId)
  /* (B-02) one sentence names everything the save did, and one Undo puts all of it back */
  if (set.doneAskedAt) await tellRunners(p, `${await actorName()} marked ${title} done — approve it?`, p.name, `/projects/${p.id}/schedule?open=${id}`)
  const sentence = saveSentence(title, said, client, move) + (set.status === 'done' ? openTasksWord(me0) : '')
  const undo: SaveUndo | null = eventId || moveUndo ? { id, eventId, move: moveUndo } : null
  return { sentence, undo }
}

/** (B-02) The panel Save's Undo: every field back as its line kept it, the dates and the tasks that moved with them back, its lines gone. */
export async function undoMilestoneSave(u: SaveUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(typeof u?.id === 'string' ? u.id : '')
  if ('error' in g) return g
  const now = new Date()
  if (typeof u.eventId === 'string') {
    const [e] = await db.select({ detail: leadEvents.detail }).from(leadEvents)
      .where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, g.p.id), inArray(leadEvents.kind, ['project_milestone_edited', 'project_milestone_status']))).limit(1)
    const b = (e?.detail as { before?: Record<string, unknown>; id?: string } | null)
    if (b?.before && b.id === u.id) {
      const v = b.before
      const str = (x: unknown) => (typeof x === 'string' ? x : null)
      const at = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? new Date(x) : null)
      const status = isMilestoneStatus(v.status) ? v.status : g.row.status
      await db.update(projectMilestones).set({
        title: clean(str(v.title), TITLE_MAX) || g.row.title, status, doneAt: at(v.doneAt), followsId: str(v.followsId), gapDays: typeof v.gapDays === 'number' ? Math.round(v.gapDays) : g.row.gapDays,
        clientVisible: typeof v.clientVisible === 'boolean' ? v.clientVisible : g.row.clientVisible,
        waitingOn: str(v.waitingOn), waitingMemberId: str(v.waitingMemberId), waitingName: str(v.waitingName), waitingNote: str(v.waitingNote), waitingSince: at(v.waitingSince), waitingUntil: at(v.waitingUntil),
        paymentRef: str(v.paymentRef), paymentDue: v.paymentDue === 'start' ? 'start' : 'end',
        confirmAskedAt: at(v.confirmAskedAt), confirmAnswer: str(v.confirmAnswer), confirmNote: str(v.confirmNote), confirmAnsweredAt: at(v.confirmAnsweredAt), confirmAnsweredBy: str(v.confirmAnsweredBy),
        /* (gaps build, package C) — a line written before these were kept leaves them as they are */
        ...('description' in v ? { description: str(v.description) } : {}), ...('color' in v ? { color: str(v.color) } : {}), ...('startedAt' in v ? { startedAt: at(v.startedAt) } : {}),
        ...('clientNote' in v ? { clientNote: str(v.clientNote) } : {}), ...('doneAskedAt' in v ? { doneAskedAt: at(v.doneAskedAt), doneAskedBy: str(v.doneAskedBy) } : {}),
        ...('resumeOn' in v ? { resumeOn: at(v.resumeOn) } : {}),   // (parity map, CP-064)
        updatedBy: stampBy, updatedAt: now,
      }).where(eq(projectMilestones.id, u.id))
      if (typeof v.afterLinks === 'string') { try { const l = JSON.parse(v.afterLinks) as { id: string; gap: number }[]; if (Array.isArray(l)) await writeLinks(g.p.id, u.id, l.filter((x) => typeof x?.id === 'string' && Number.isFinite(x.gap))) } catch { /* a line with no links kept */ } }
      await dropLine(g.p, u.eventId)
    }
  }
  if (u.move) {
    await restoreDates(g.p, u.move)
    if (typeof u.move.eventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, u.move.eventId), eq(leadEvents.projectId, g.p.id)))
  }
  await syncTarget(g.p.id)
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/** (REG-1070) A reorder's way back: the list's order as it was. */
export type OrderUndo = { projectId: string; order: string[] }
/** One step up or down the list (the row's menu; Alt + ↑ / ↓ on a row). The order is the list's — dates never change with it. (REG-1070)
    Answers its place in words ("now 3rd of 7") and what Undo needs, as every other change on the schedule does. */
export async function reorderMilestone(id: string, dir: -1 | 1): Promise<{ place: number; of: number; undo: OrderUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(id)
  if ('error' in g) return g
  const before = g.list.map((m) => m.id)
  const order = [...before]
  const at = order.indexOf(id), to = at + (dir < 0 ? -1 : 1)
  if (to < 0 || to >= order.length) return { error: dir < 0 ? 'It is already first' : 'It is already last' }
  order.splice(at, 1); order.splice(to, 0, id)
  await renumber(g.p.id, order)
  touch(g.p.id, g.p.leadId)
  return { place: to + 1, of: order.length, undo: { projectId: g.p.id, order: before } }
}
/** (REG-1070) The reorder's Undo: the milestones back in the order they had — those still on the schedule; one added since goes last. */
export async function restoreMilestoneOrder(undo: OrderUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(typeof undo?.projectId === 'string' ? undo.projectId : '')
  if ('error' in g) return g
  const live = ((await milestonesOf([g.p.id])).get(g.p.id) ?? []).map((m) => m.id)
  const wanted = (Array.isArray(undo.order) ? undo.order : []).filter((x): x is string => typeof x === 'string' && live.includes(x))
  await renumber(g.p.id, [...wanted, ...live.filter((x) => !wanted.includes(x))])
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/** What a delete moved, for its Undo: the milestone, and the ones that followed it (now following what it followed, on their own dates). */
export type DeleteUndo = { id: string; relinked: { id: string; followsId: string | null; gap: number }[]; eventId: string }
export async function deleteMilestone(id: string): Promise<{ undo: DeleteUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(id)
  if ('error' in g) return g
  const me = g.list.find((m) => m.id === id)!
  const lead = me.followsId ? g.list.find((m) => m.id === me.followsId) : undefined
  const now = new Date()
  const relinked: DeleteUndo['relinked'] = []
  for (const f of g.list.filter((m) => m.followsId === id)) {
    relinked.push({ id: f.id, followsId: f.followsId, gap: f.gap })
    await db.update(projectMilestones).set({ followsId: lead?.id ?? null, gapDays: lead ? f.start - lead.end : 0, updatedAt: now }).where(eq(projectMilestones.id, f.id))
  }
  await db.update(projectMilestones).set({ deletedAt: now, updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, id))
  await renumber(g.p.id)
  await syncTarget(g.p.id)
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_deleted', { ...ev(g.p), id, title: me.title })
  touch(g.p.id, g.p.leadId)
  return { undo: { id, relinked, eventId } }
}
/** Undo for a delete: the milestone back where it was, the ones that followed it following it again — and the delete's line gone. */
export async function restoreMilestone(u: DeleteUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [row] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, u.id)).limit(1)
  if (!row) return { error: GONE }
  const g = await forProject(row.projectId)
  if ('error' in g) return g
  const now = new Date()
  await db.update(projectMilestones).set({ deletedAt: null, updatedAt: now }).where(eq(projectMilestones.id, u.id))
  for (const r of u.relinked) await db.update(projectMilestones).set({ followsId: r.followsId, gapDays: Math.round(r.gap) || 0, updatedAt: now }).where(and(eq(projectMilestones.id, r.id), eq(projectMilestones.projectId, g.p.id)))
  const rows = await db.select({ id: projectMilestones.id, position: projectMilestones.position }).from(projectMilestones).where(and(eq(projectMilestones.projectId, g.p.id), isNull(projectMilestones.deletedAt))).orderBy(asc(projectMilestones.position))
  const order = rows.filter((r) => r.id !== u.id).map((r) => r.id)
  order.splice(Math.min(row.position, order.length), 0, u.id)
  await renumber(g.p.id, order)
  await syncTarget(g.p.id)
  await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, g.p.id)))
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── Work inside (layer 3) ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/** A task inside a milestone: the project's lead's task, its members on it, due on the milestone's last day. */
export async function addMilestoneTask(milestoneId: string, title: string): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const t = clean(title, 200)
  if (!t) return { error: 'Give the task a name' }
  const g = await forMilestone(milestoneId)
  if ('error' in g) return g
  const due = dateOfDay(g.list.find((m) => m.id === milestoneId)!.end)
  due.setHours(17, 0, 0, 0)
  const id = await createTask(g.p.leadId, t, { dueAt: due, assignLeadMembers: true })
  await db.update(leadTasks).set({ milestoneId }).where(eq(leadTasks.id, id))
  touch(g.p.id, g.p.leadId)
  return { id }
}

/** (The Tasks tab's Milestone column) Put a task inside a milestone of its lead's project, or take it out. */
export async function setTaskMilestone(taskId: string, milestoneId: string | null): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [t] = await db.select({ leadId: leadTasks.leadId, milestoneId: leadTasks.milestoneId, title: leadTasks.title }).from(leadTasks).where(eq(leadTasks.id, taskId)).limit(1)
  if (!t?.leadId) return { error: 'This task is not there any more' }
  const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, t.leadId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: 'This task’s lead has no project' }
  const g = await forProject(p.id)
  if ('error' in g) return g
  let title: string | null = null
  if (milestoneId) {
    const [m] = await db.select({ id: projectMilestones.id, title: projectMilestones.title }).from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, p.id), isNull(projectMilestones.deletedAt))).limit(1)
    if (!m) return { error: GONE }
    title = m.title
  }
  if (t.milestoneId === milestoneId) return { ok: true }
  await db.update(leadTasks).set({ milestoneId, updatedAt: new Date() }).where(eq(leadTasks.id, taskId))
  /* (Projects round 7 — events for every action) the task's place in the schedule, as a line in Activity */
  const was = !milestoneId && t.milestoneId ? (await db.select({ title: projectMilestones.title }).from(projectMilestones).where(eq(projectMilestones.id, t.milestoneId)).limit(1))[0]?.title ?? null : null
  if (title || was) await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_task', { ...ev(g.p), id: milestoneId ?? t.milestoneId ?? undefined, title: title ?? was ?? '', task: t.title, out: !milestoneId })
  touch(p.id, t.leadId)
  return { ok: true }
}

/* ── Share changes (Q-15) ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Stores what the client will see — the snapshot the portal reads (round 4b), never the live rows — with the changes it carries and the note.
 * The first share also sets each milestone's plan dates (layer 7, plan against actual), as later shares do for a milestone shown for the first time.
 * (gaps build, package C — 7) `only` = the changes ticked: the client gets those, and keeps seeing the rest as they last saw them. (8) While
 * Settings › Projects › Schedule changes need approval is on, a Designer's or a Manager's press stores the ask instead (`asked`) and the
 * studio's Owners and Admins hear it; an Owner's or an Admin's share answers any ask that waits.
 */
export async function shareSchedule(projectId: string, input: { note: string; only?: string[] | null }): Promise<{ n: number; live: boolean; asked?: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forProject(projectId)
  if ('error' in g) return g
  const { p } = g
  const list = (await milestonesOf([p.id])).get(p.id) ?? []
  if (!list.length) return { error: 'Add a milestone before you share the schedule' }
  const last = (await latestShares([p.id])).get(p.id) ?? null
  const all = scheduleChanges(clientRows(list), last?.snapshot ?? null)
  if (last && !all.length) return { error: 'The client already sees this schedule' }
  const only = Array.isArray(input?.only) ? new Set(input.only.filter((x): x is string => typeof x === 'string')) : null
  const changes = last && only ? all.filter((c) => only.has(c.id)) : all
  if (last && !changes.length) return { error: 'Tick at least one change to share' }
  const note = clean(input?.note, 500) || null
  const now = new Date()
  if (!sharesAtOnce(g.viewer.role, await fetchScheduleRules())) {
    /* (8) the ask — one per project: a new one takes the place of the one waiting */
    await db.update(projectShareRequests).set({ status: 'withdrawn', answeredAt: now }).where(and(eq(projectShareRequests.projectId, p.id), eq(projectShareRequests.status, 'pending')))
    await db.insert(projectShareRequests).values({ id: randomUUID(), projectId: p.id, milestoneIds: changes.map((c) => c.id), note, status: 'pending', requestedBy: stampBy, requestedAt: now })
    await logProjectEvent(db, p.leadId, p.id, 'project_schedule_share_asked', { ...ev(p), n: changes.length, note })
    await tellRunners(p, `${await actorName()} asks to share ${plural(changes.length, 'schedule change')} with the client`, p.name, `/projects/${p.id}/schedule?share=1`)
    touch(p.id, p.leadId)
    return { n: changes.length, live: false, asked: true }
  }
  const snapshot = snapshotFor(list, last?.snapshot ?? null, last && only ? only : null)
  const shareId = randomUUID()
  await db.insert(projectScheduleShares).values({ id: shareId, projectId: p.id, snapshot, changes, note, sharedBy: stampBy, sharedAt: now })
  const shown = new Set(snapshot.rows.map((r) => r.id))
  for (const m of list.filter((x) => x.clientVisible && !x.plan && shown.has(x.id))) await db.update(projectMilestones).set({ planStartDate: dateOfDay(m.start), planEndDate: dateOfDay(m.end) }).where(eq(projectMilestones.id, m.id))
  await logProjectEvent(db, p.leadId, p.id, 'project_schedule_shared', { ...ev(p), n: last ? changes.length : 0, note })
  await tellScheduleShared(p.id)   // (gaps build H, H-Q17)
  /* (8) an ask that waited is answered by this share — whoever asked hears it */
  const waiting = await db.select().from(projectShareRequests).where(and(eq(projectShareRequests.projectId, p.id), eq(projectShareRequests.status, 'pending')))
  for (const w of waiting) {
    await db.update(projectShareRequests).set({ status: 'shared', answeredBy: stampBy, answeredAt: now, shareId }).where(eq(projectShareRequests.id, w.id))
    await tellMember(w.requestedBy, p, `${await actorName()} shared your schedule changes with the client`, p.name, `/projects/${p.id}/schedule`)
  }
  /* (parity map, SC-084 · UC-084 — 1.0's "Timeline Published to Homeowner", J-176) a share sent directly reaches the studio too: Owners, Admins
     and the project's members hear it — never whoever shared it (`notify` leaves the actor out), nor whoever asked for it (told above) */
  const asked = new Set(waiting.map((w) => w.requestedBy).filter((x): x is string => !!x))
  const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, p.leadId)).limit(1)
  const who = lead ? titleCaseName(lead.name) : 'the client'
  await notify('schedule_shared', [...(await studioRunnerIds()), ...(await leadMemberIds(p.leadId))].filter((id) => !asked.has(id)), {
    title: `${await actorName()} shared ${p.name}’s schedule with ${who}`,   // (invented copy)
    body: last ? `${plural(changes.length, 'change')}${note ? ` — “${note.replace(/[.!?]+$/, '')}”` : ''}` : `The first share${note ? ` — “${note.replace(/[.!?]+$/, '')}”` : ''}`,
    href: `/projects/${p.id}/schedule`, leadId: p.leadId,
  })
  touch(p.id, p.leadId)
  /* (B-01) whether it reaches anyone yet: the client sees it only once invited to the portal (and not withdrawn) */
  const [link] = await db.select({ invitedAt: homeownerLeadLinks.invitedAt, withdrawnAt: homeownerLeadLinks.withdrawnAt }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, p.leadId)).limit(1)
  return { n: changes.length, live: !!link?.invitedAt && !link.withdrawnAt }
}

/** (8) An Owner or an Admin sends an ask to share back with a note: nothing reaches the client; whoever asked reads the note. Undo puts the ask back. */
export async function sendBackShareAsk(askId: string, input: { note: string }): Promise<{ undo: { askId: string; eventId: string } } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const [a] = await db.select().from(projectShareRequests).where(eq(projectShareRequests.id, typeof askId === 'string' ? askId : '')).limit(1)
  if (!a || a.status !== 'pending') return { error: 'Nothing waits to be shared any more' }
  const g = await forProject(a.projectId)
  if ('error' in g) return g
  if (!answersSchedule(g.viewer.role)) return { error: ANSWER_RULE }
  const note = clean(input?.note, 300)
  if (!note) return { error: 'Say why it isn’t shared yet' }
  await db.update(projectShareRequests).set({ status: 'sent_back', answeredBy: stampBy, answeredAt: new Date(), answerNote: note }).where(eq(projectShareRequests.id, a.id))
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_schedule_share_sent_back', { ...ev(g.p), note, requester: (await nameOf(a.requestedBy)) ?? undefined })
  await tellMember(a.requestedBy, g.p, `${await actorName()} sent your schedule changes back — not shared yet`, `“${note}”`, `/projects/${g.p.id}/schedule?share=1`)
  touch(g.p.id, g.p.leadId)
  return { undo: { askId: a.id, eventId } }
}
/** (8) Whoever asked takes the ask back (or an Owner or an Admin clears it); `undo` puts a sent-back or withdrawn ask back to waiting. */
export async function withdrawShareAsk(askId: string): Promise<{ undo: { askId: string; eventId: string } } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const [a] = await db.select().from(projectShareRequests).where(eq(projectShareRequests.id, typeof askId === 'string' ? askId : '')).limit(1)
  if (!a || a.status !== 'pending') return { error: 'Nothing waits to be shared any more' }
  const g = await forProject(a.projectId)
  if ('error' in g) return g
  if (a.requestedBy !== (await sessionMemberId()) && !answersSchedule(g.viewer.role)) return { error: 'Only whoever asked, an Owner or an Admin takes the ask back' }
  await db.update(projectShareRequests).set({ status: 'withdrawn', answeredBy: stampBy, answeredAt: new Date() }).where(eq(projectShareRequests.id, a.id))
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_schedule_share_withdrawn', { ...ev(g.p) })
  touch(g.p.id, g.p.leadId)
  return { undo: { askId: a.id, eventId } }
}
export async function reopenShareAsk(u: { askId: string; eventId: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [a] = await db.select().from(projectShareRequests).where(eq(projectShareRequests.id, typeof u?.askId === 'string' ? u.askId : '')).limit(1)
  if (!a) return { error: 'Nothing waits to be shared any more' }
  const g = await forProject(a.projectId)
  if ('error' in g) return g
  await db.update(projectShareRequests).set({ status: 'pending', answeredBy: null, answeredAt: null, answerNote: null }).where(eq(projectShareRequests.id, a.id))
  await dropLine(g.p, u.eventId)
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── (gaps build, package C — 5) More time: an extension request ───────────────────────────────────────────────────────────────── */

/** A Designer or a Manager on the team asks for a new last day with a reason — on a milestone that is under way, blocked or late. Owners and
    Admins move the dates themselves. One open ask per milestone; the studio's Owners and Admins hear it in the bell. */
export async function askForMoreTime(milestoneId: string, input: { end: string; reason: string }): Promise<{ id: string; sentence: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(milestoneId)
  if ('error' in g) return g
  if (!asksForTime(g.viewer.role)) return { error: 'You move its dates yourself — open When' }
  const m = g.list.find((x) => x.id === milestoneId)!
  if (m.status === 'done') return { error: 'It is done — there is nothing to extend' }
  const end = dayArg(input?.end)
  if (end === null) return { error: 'Choose the new last day' }
  if (end <= m.end) return { error: `Choose a day after it ends now (${dayLabel(m.end)})` }
  const reason = clean(input?.reason, 300)
  if (!reason) return { error: 'Say why it needs more time' }
  const [open] = await db.select({ id: projectMilestoneExtensions.id }).from(projectMilestoneExtensions).where(and(eq(projectMilestoneExtensions.milestoneId, milestoneId), eq(projectMilestoneExtensions.status, 'pending'))).limit(1)
  if (open) return { error: `More time is already asked for ${shortTitle(m.title)}` }
  const id = randomUUID(), now = new Date()
  await db.insert(projectMilestoneExtensions).values({ id, projectId: g.p.id, milestoneId, fromEnd: dateOfDay(m.end), toEnd: dateOfDay(end), reason, status: 'pending', requestedBy: stampBy, requestedAt: now })
  await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_more_asked', { ...ev(g.p), id: milestoneId, title: m.title, from: dayLabel(m.end), to: dayLabel(end), reason })
  await tellRunners(g.p, `${await actorName()} asks for ${spanWord(end - m.end)} more on ${m.title}`, `To ${dayLabel(end)} — “${reason}”`, `/projects/${g.p.id}/schedule?open=${milestoneId}`)
  touch(g.p.id, g.p.leadId)
  return { id, sentence: `Asked for ${spanWord(end - m.end)} more on ${shortTitle(m.title)} — an Owner or an Admin answers it.` }
}

/** What an answer changed, for its Undo: the ask back to waiting, the dates as they were (an approval moves them), the draft update it wrote. */
export type MoreTimeUndo = { askId: string; eventId: string; move: MoveUndo | null; updateId: string | null }
/** Takes an ask back — its own Undo right after asking (`undo`: the ask and its line leave as if never made), or later from the panel. */
export async function withdrawMoreTime(askId: string, o: { undo?: boolean } = {}): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const [a] = await db.select().from(projectMilestoneExtensions).where(eq(projectMilestoneExtensions.id, typeof askId === 'string' ? askId : '')).limit(1)
  if (!a || a.status !== 'pending') return { error: 'That ask is answered already' }
  const g = await forMilestone(a.milestoneId)
  if ('error' in g) return g
  if (a.requestedBy !== (await sessionMemberId()) && !answersSchedule(g.viewer.role)) return { error: 'Only whoever asked, an Owner or an Admin takes the ask back' }
  if (o.undo) {
    const [line] = await db.select({ id: leadEvents.id }).from(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), eq(leadEvents.kind, 'project_milestone_more_asked'), gte(leadEvents.at, new Date(a.requestedAt.getTime() - 2000)))).orderBy(asc(leadEvents.at)).limit(1)
    await db.delete(projectMilestoneExtensions).where(eq(projectMilestoneExtensions.id, a.id))
    if (line) await dropLine(g.p, line.id)
  } else {
    await db.update(projectMilestoneExtensions).set({ status: 'withdrawn', answeredBy: stampBy, answeredAt: new Date() }).where(eq(projectMilestoneExtensions.id, a.id))
    await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_more_withdrawn', { ...ev(g.p), id: a.milestoneId, title: g.row.title })
  }
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}
/**
 * An Owner's or an Admin's answer. Approve: the milestone's last day moves to the day asked for and the move carries what follows (the one
 * sentence the schedule always says), and — when asked — a draft progress update for the client tells them the new day (the Updates tab holds
 * it to edit and post). Decline: with a note. Whoever asked hears it; one Undo puts it all back.
 */
export async function answerMoreTime(askId: string, input: { approve: boolean; note?: string; draftUpdate?: boolean }): Promise<{ sentence: string; undo: MoreTimeUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const [a] = await db.select().from(projectMilestoneExtensions).where(eq(projectMilestoneExtensions.id, typeof askId === 'string' ? askId : '')).limit(1)
  if (!a || a.status !== 'pending') return { error: 'That ask is answered already' }
  const g = await forMilestone(a.milestoneId)
  if ('error' in g) return g
  if (!answersSchedule(g.viewer.role)) return { error: ANSWER_RULE }
  const m = g.list.find((x) => x.id === a.milestoneId)!
  const note = clean(input?.note, 300) || null
  const requester = await nameOf(a.requestedBy)
  const now = new Date()
  if (!input?.approve) {
    await db.update(projectMilestoneExtensions).set({ status: 'declined', answeredBy: stampBy, answeredAt: now, answerNote: note }).where(eq(projectMilestoneExtensions.id, a.id))
    const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_more_declined', { ...ev(g.p), id: m.id, title: m.title, to: dayLabel(dayOfStored(a.toEnd)), note, requester: requester ?? undefined })
    await tellMember(a.requestedBy, g.p, `${await actorName()} declined more time on ${m.title}`, note ? `“${note}”` : `It still ends ${dayLabel(m.end)}`, `/projects/${g.p.id}/schedule?open=${m.id}`)
    touch(g.p.id, g.p.leadId)
    return { sentence: `More time on ${shortTitle(m.title)} declined${requester ? ` — ${requester.split(' ')[0]} hears it` : ''}.`, undo: { askId: a.id, eventId, move: null, updateId: null } }
  }
  const end = dayOfStored(a.toEnd)
  if (end < m.start) return { error: `The day asked for is before ${shortTitle(m.title)} starts — move its dates instead` }
  const { list, followed } = moveWith(g.list, m.id, m.start, end)
  const w = await writeDates(g.list, list)
  await syncTarget(g.p.id)
  let updateId: string | null = null
  if (input.draftUpdate) {
    const { saveProjectUpdate } = await import('./updates-actions')
    const html = `<p>${m.title} will now finish on ${dayLabel(end)}${followed.length ? ', and what follows it moves with it' : ''}. We’ll keep you posted as it goes.</p>`
    const r = await saveProjectUpdate(g.p.id, { title: `New finish date for ${m.title}`, html, milestoneId: m.id, fileIds: [], intent: 'draft' })
    if (!('error' in r)) updateId = r.id
  }
  await db.update(projectMilestoneExtensions).set({ status: 'approved', answeredBy: stampBy, answeredAt: now, answerNote: note, updateId }).where(eq(projectMilestoneExtensions.id, a.id))
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_milestone_more_approved', { ...ev(g.p), id: m.id, title: m.title, from: dayLabel(m.end), to: dayLabel(end), n: followed.length, requester: requester ?? undefined })
  await tellMember(a.requestedBy, g.p, `${await actorName()} approved more time on ${m.title}`, `It now ends ${dayLabel(end)}`, `/projects/${g.p.id}/schedule?open=${m.id}`)
  touch(g.p.id, g.p.leadId)
  const sentence = `${moveSentence(m.title, m, { start: m.start, end }, followed.length)}${tasksWord(w.tasks.length, followed.length > 0)}${updateId ? ' A draft update waits in Updates.' : ''}`
  return { sentence, undo: { askId: a.id, eventId, move: undoOf(g.p.id, w, null), updateId } }
}
export async function undoMoreTimeAnswer(u: MoreTimeUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [a] = await db.select().from(projectMilestoneExtensions).where(eq(projectMilestoneExtensions.id, typeof u?.askId === 'string' ? u.askId : '')).limit(1)
  if (!a) return { error: 'That ask is not there any more' }
  const g = await forMilestone(a.milestoneId)
  if ('error' in g) return g
  if (u.move) { await restoreDates(g.p, u.move); await syncTarget(g.p.id) }
  if (typeof u.updateId === 'string') {
    /* the draft the approval wrote goes with it — never one somebody has since posted */
    const { projectUpdates } = await import('@/lib/db/schema')
    await db.update(projectUpdates).set({ deletedAt: new Date() }).where(and(eq(projectUpdates.id, u.updateId), eq(projectUpdates.projectId, g.p.id), eq(projectUpdates.status, 'draft')))
    await db.delete(leadEvents).where(and(eq(leadEvents.projectId, g.p.id), eq(leadEvents.kind, 'project_update_drafted'), sql`json_extract(${leadEvents.detail}, '$.id') = ${u.updateId}`))
  }
  await db.update(projectMilestoneExtensions).set({ status: 'pending', answeredBy: null, answeredAt: null, answerNote: null, updateId: null }).where(eq(projectMilestoneExtensions.id, a.id))
  await dropLine(g.p, u.eventId)
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── (gaps build, package C — 9) "Not right", answered ──────────────────────────────────────────────────────────────────────────── */

export type ResolveUndo = { id: string; eventId: string; before: { resolvedNote: string | null; resolvedAt: number | null; resolvedBy: string | null; confirmAskedAt: number | null; confirmAnswer: string | null; confirmNote: string | null; confirmAnsweredAt: number | null; confirmAnsweredBy: string | null } }
/**
 * After "Something is not right": the studio marks it resolved with a note to the client — what was changed — kept on the stage
 * (`resolved_note` · `resolved_at`, which the client's schedule shows under it). It no longer raises the project. With `askAgain` (the
 * default) the client is asked to confirm it once more, as *Ask again* does.
 */
export async function resolveStage(id: string, input: { note: string; askAgain?: boolean }): Promise<{ sentence: string; undo: ResolveUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(id)
  if ('error' in g) return g
  if (g.row.confirmAnswer !== 'changes') return { error: 'The client hasn’t said anything is not right with it' }
  const note = cleanText(input?.note, RESOLVE_MAX)
  if (!note) return { error: 'Say what you changed — the client reads it' }
  const ms = (d: Date | null) => (d ? d.getTime() : null)
  const before = { resolvedNote: g.row.resolvedNote, resolvedAt: ms(g.row.resolvedAt), resolvedBy: g.row.resolvedBy, confirmAskedAt: ms(g.row.confirmAskedAt), confirmAnswer: g.row.confirmAnswer, confirmNote: g.row.confirmNote, confirmAnsweredAt: ms(g.row.confirmAnsweredAt), confirmAnsweredBy: g.row.confirmAnsweredBy }
  const now = new Date()
  const again = input?.askAgain !== false
  await db.update(projectMilestones).set({ resolvedNote: note, resolvedAt: now, resolvedBy: stampBy, ...(again ? { confirmAskedAt: now, confirmAnswer: null, confirmNote: null, confirmAnsweredAt: null, confirmAnsweredBy: null } : {}), updatedBy: stampBy, updatedAt: now }).where(eq(projectMilestones.id, id))
  const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, g.p.leadId)).limit(1)
  const client = l ? titleCaseName(l.name) : undefined
  const eventId = await logProjectEvent(db, g.p.leadId, g.p.id, 'project_stage_resolved', { ...ev(g.p), id, title: g.row.title, note, askedAgain: again, name: client })
  touch(g.p.id, g.p.leadId)
  const first = client?.split(' ')[0] ?? 'the client'
  return { sentence: `${shortTitle(g.row.title)} marked resolved — ${first} reads your note${again ? ` and is asked to confirm it again` : ''}.`, undo: { id, eventId, before } }
}
export async function undoResolveStage(u: ResolveUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(typeof u?.id === 'string' ? u.id : '')
  if ('error' in g) return g
  const b = u.before ?? ({} as ResolveUndo['before'])
  const str = (x: unknown) => (typeof x === 'string' ? x : null)
  const at = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? new Date(x) : null)
  await db.update(projectMilestones).set({ resolvedNote: str(b.resolvedNote), resolvedAt: at(b.resolvedAt), resolvedBy: str(b.resolvedBy), confirmAskedAt: at(b.confirmAskedAt), confirmAnswer: str(b.confirmAnswer), confirmNote: str(b.confirmNote), confirmAnsweredAt: at(b.confirmAnsweredAt), confirmAnsweredBy: str(b.confirmAnsweredBy), updatedAt: new Date() }).where(eq(projectMilestones.id, u.id))
  await dropLine(g.p, u.eventId)
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── (gaps build, package C — 13) A row dragged to a new place in the list ─────────────────────────────────────────────────────── */

/** The list's order only — dates never change with it (Move up / down's rule, REG-1070). Answers its place in words and the Undo. */
export async function moveMilestoneTo(id: string, index: number): Promise<{ place: number; of: number; undo: OrderUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(id)
  if ('error' in g) return g
  const before = g.list.map((m) => m.id)
  const at = before.indexOf(id)
  const to = Math.max(0, Math.min(before.length - 1, Math.round(Number(index)) || 0))
  if (to === at) return { error: 'It is already there' }
  const order = before.filter((x) => x !== id)
  order.splice(to, 0, id)
  await renumber(g.p.id, order)
  touch(g.p.id, g.p.leadId)
  return { place: to + 1, of: order.length, undo: { projectId: g.p.id, order: before } }
}

/* ── (gaps build, package C — 3 · 8 · 15) Settings › Projects › Schedule ─────────────────────────────────────────────────────────── */

async function putSetting(key: string, value: unknown) {
  const v = JSON.stringify(value), now = new Date()
  await db.insert(settings).values({ key, value: v, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value: v, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/projects', 'layout')
}
/** The two approvals and the alerts' lead time — Owners and Admins change them. */
export async function setScheduleRules(patch: Partial<ScheduleRules>): Promise<ScheduleRules | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  if (patch && typeof patch === 'object' && ('completionApproval' in patch || 'shareApproval' in patch)) { const lock = await requirePlan('internal_approvals'); if (lock) return lock }   // (pending modules S19) approvals are Pro
  const now = await fetchScheduleRulesStored()   // the studio's own rules (a Free plan reads the approvals off — never written back)
  const next = parseScheduleRules({ ...now, ...(patch && typeof patch === 'object' ? patch : {}) })
  if (typeof patch?.alertDays === 'number' && (patch.alertDays < ALERT_DAYS_MIN || patch.alertDays > ALERT_DAYS_MAX)) return { error: `Choose ${ALERT_DAYS_MIN} to ${ALERT_DAYS_MAX} days` }
  await putSetting(SCHEDULE_RULES_KEY, next)
  return next
}
/** Where a schedule starts for one project type: 'auto' · 'quote' · 'property' · a template's id. */
export async function setTypeDefault(input: { type: string; choice: string }): Promise<{ type: string; choice: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: SETTINGS_RULE }
  const type = (PROJECT_TYPES as readonly string[]).includes(input?.type) ? input.type : null
  if (!type) return { error: 'Choose a project type' }
  const choice = typeof input?.choice === 'string' && input.choice ? input.choice.slice(0, 80) : 'auto'
  if (!['auto', 'quote', 'property'].includes(choice)) {
    const [t] = await db.select({ id: scheduleTemplates.id }).from(scheduleTemplates).where(and(eq(scheduleTemplates.id, choice), isNull(scheduleTemplates.deletedAt))).limit(1)
    if (!t) return { error: 'That schedule template is not there any more' }
  }
  const [row] = await db.select().from(settings).where(eq(settings.key, TYPE_DEFAULTS_KEY)).limit(1)
  const all = row ? (() => { try { return parseTypeDefaults(JSON.parse(row.value)) } catch { return {} } })() : {}
  if (choice === 'auto') delete all[type]; else all[type] = choice
  await putSetting(TYPE_DEFAULTS_KEY, all)
  return { type, choice }
}

/* ── The client's answer (Projects round 4b — Q-16) ─────────────────────────────────────────────────────────────────────────────── */

/**
 * After "Something is not right": the studio has looked at it with the client and asks again — the answer is cleared (its line stays in
 * Activity), the ask is stamped anew and the stage waits on the client's portal once more. Only an answer of "something is not right"
 * is asked again; a confirmation stands.
 */
export async function askStageAgain(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const g = await forMilestone(id)
  if ('error' in g) return g
  if (g.row.confirmAnswer !== 'changes') return { error: g.row.confirmAnswer === 'confirmed' ? 'The client has already confirmed it' : 'The client hasn’t answered yet' }
  const now = new Date()
  await db.update(projectMilestones).set({ confirmAskedAt: now, confirmAnswer: null, confirmNote: null, confirmAnsweredAt: null, confirmAnsweredBy: null, updatedBy: stampBy, updatedAt: now })
    .where(and(eq(projectMilestones.id, id), eq(projectMilestones.confirmAnswer, 'changes')))
  const [l] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, g.p.leadId)).limit(1)
  await logProjectEvent(db, g.p.leadId, g.p.id, 'project_stage_asked', { ...ev(g.p), id, title: g.row.title, name: l ? titleCaseName(l.name) : undefined })
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── (parity map, SC-094 — 1.0's VO "timeline impact days", E-253) A variation order's extra days ──────────────────────────────────────────
   The order's General info says how many days it adds (`quotes.timeline_days`); once the client approves it, the Schedule counts them and a
   Needs you row asks "VO-3 adds 3 days — move what follows?". Move the schedule makes the milestone you pick that many days longer, and the
   move carries what follows (today's rule) — a Designer's or a Manager's press on a running stage asks an Owner or an Admin for the time
   instead (simplify Q-18's rule, kept). Not now leaves the dates as they are. Each answer is one `parity_e_vo_days` line with its Undo. */
const VO_DAYS_MAX = 365
const VO_GONE = 'This variation order is not there any more'
async function forVariationDays(quoteId: string): Promise<{ q: typeof quotes.$inferSelect; p: Project; viewer: Viewer; team: string[] } | Refusal> {
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, typeof quoteId === 'string' ? quoteId : ''), isNull(quotes.deletedAt))).limit(1)
  if (!q || q.kind !== 'variation' || !q.projectId) return { error: VO_GONE }
  const [p] = await db.select().from(projects).where(and(eq(projects.id, q.projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, p.leadId))) return { error: VO_GONE }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  return { q, p, viewer, team }
}
/** The days field's read: its value and, when it can't change, why (approved by the client · the project completed · not on the team). */
export async function readVariationDays(quoteId: string): Promise<{ days: number | null; locked: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forVariationDays(quoteId); if ('error' in c) return c
  const { isApprovedVariation } = await import('@/lib/projects/money')
  const locked = !mayChangeProject(c.viewer, c.team) ? CHANGE_RULE
    : isApprovedVariation(c.q.status) ? 'Approved by the client — revise the order to change it'
    : completedBlock(c.p.stage, 'money')
  return { days: c.q.timelineDays ?? null, locked }
}
/** The order's days, from its General info — whole days, 0 / empty = none. Refused once the client approved it (the variation order's rule). */
export async function setVariationDays(quoteId: string, o: { days: number | null }): Promise<{ days: number | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forVariationDays(quoteId); if ('error' in c) return c
  if (!mayChangeProject(c.viewer, c.team)) return { error: CHANGE_RULE }
  const { isApprovedVariation } = await import('@/lib/projects/money')
  if (isApprovedVariation(c.q.status)) return { error: `${c.q.number} is approved — revise it to change it` }
  const shut = completedBlock(c.p.stage, 'money'); if (shut) return { error: shut }
  const raw = o?.days
  const days = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : null
  if (days !== null && (days < 0 || days > VO_DAYS_MAX)) return { error: `Up to ${VO_DAYS_MAX} days` }
  const next = days ? days : null
  if (next === (c.q.timelineDays ?? null)) return { days: next }
  await db.update(quotes).set({ timelineDays: next, updatedAt: new Date() }).where(eq(quotes.id, c.q.id))
  revalidatePath(`/quotes/${c.q.id}`)
  touch(c.p.id, c.p.leadId)
  return { days: next }
}
/** What an answer did, for its Undo: its line, the dates it moved, the ask for more time it filed. */
export type VoDaysUndo = { projectId: string; eventId: string; move: MoveUndo | null; askId: string | null }
async function answeredAlready(projectId: string, quoteId: string): Promise<boolean> {
  const rows = await db.select({ detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.projectId, projectId), eq(leadEvents.kind, VO_DAYS_EVENT)))
  return rows.some((r) => (r.detail as { id?: unknown } | null)?.id === quoteId)
}
async function approvedVoDays(quoteId: string, projectId: string): Promise<{ q: typeof quotes.$inferSelect; days: number } | Refusal> {
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, typeof quoteId === 'string' ? quoteId : ''), eq(quotes.projectId, projectId), eq(quotes.kind, 'variation'), isNull(quotes.deletedAt))).limit(1)
  if (!q) return { error: VO_GONE }
  const { isApprovedVariation } = await import('@/lib/projects/money')
  if (!isApprovedVariation(q.status)) return { error: `${q.number} isn’t approved yet — its days count once ${'the client'} approves it` }
  if (!q.timelineDays || q.timelineDays <= 0) return { error: `${q.number} adds no days to the schedule` }
  if (await answeredAlready(projectId, q.id)) return { error: `${q.number}’s days are answered already` }
  return { q, days: q.timelineDays }
}
/** Move the schedule for an approved order: the milestone picked (the running one by default) runs that many days longer, and what follows moves. */
export async function moveForVariation(quoteId: string, input: { milestoneId: string }): Promise<{ sentence: string; undo: VoDaysUndo; asked?: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(typeof input?.milestoneId === 'string' ? input.milestoneId : '')
  if ('error' in g) return g
  const v = await approvedVoDays(quoteId, g.p.id); if ('error' in v) return v
  const me = g.list.find((m) => m.id === g.row.id)!
  if (me.status === 'done') return { error: 'Pick a milestone still to do — a done one keeps its dates' }
  const end = me.end + v.days
  const today = dayOf(new Date())
  /* (simplify Q-18) a running stage's end moves later only with an Owner's or an Admin's yes — the press asks for the time instead */
  if (asksPastEnd(g.viewer.role, me, today, end)) {
    const r = await askForMoreTime(me.id, { end: iso(end), reason: `${v.q.number} adds ${daysWord(v.days)} — ${v.q.title}` })
    if ('error' in r) return r
    const eventId = await logParityEvent(db, g.p.leadId, g.p.id, 'parity_e_vo_days', { id: v.q.id, number: v.q.number, days: v.days, answer: 'asked', milestoneId: me.id, title: me.title })
    return { sentence: `${r.sentence.replace(/\.$/, '')} — for ${v.q.number}.`, undo: { projectId: g.p.id, eventId, move: null, askId: r.id }, asked: true }
  }
  const { list, followed } = moveWith(g.list, me.id, me.start, end)
  const w = await writeDates(g.list, list)
  await syncTarget(g.p.id)
  const eventId = await logParityEvent(db, g.p.leadId, g.p.id, 'parity_e_vo_days', { id: v.q.id, number: v.q.number, days: v.days, answer: 'moved', milestoneId: me.id, title: me.title, to: dayLabel(end), n: followed.length })
  touch(g.p.id, g.p.leadId)
  /* (invented copy) */
  const sentence = `${shortTitle(me.title)} runs ${daysWord(v.days)} longer for ${v.q.number} — it ends ${dayLabel(end)}${followed.length ? `; ${plural(followed.length, 'milestone')} moved with it` : ''}.${tasksWord(w.tasks.length, followed.length > 0)}`
  return { sentence, undo: { projectId: g.p.id, eventId, move: undoOf(g.p.id, w, null), askId: null } }
}
/** Not now: the dates stay; the order leaves Needs you (the Schedule still counts its days). */
export async function notNowVariationDays(quoteId: string, projectId: string): Promise<{ sentence: string; undo: VoDaysUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(typeof projectId === 'string' ? projectId : '')
  if ('error' in g) return g
  const v = await approvedVoDays(quoteId, g.p.id); if ('error' in v) return v
  const eventId = await logParityEvent(db, g.p.leadId, g.p.id, 'parity_e_vo_days', { id: v.q.id, number: v.q.number, days: v.days, answer: 'not_now' })
  touch(g.p.id, g.p.leadId)
  return { sentence: `The schedule stays as it is — ${v.q.number}’s ${daysWord(v.days)} are still counted on it.`, undo: { projectId: g.p.id, eventId, move: null, askId: null } }   // (invented copy)
}
/** An answer's Undo: the dates back (a move), the ask taken back (an ask), its line gone — the order waits in Needs you again. */
export async function undoVariationDays(u: VoDaysUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(typeof u?.projectId === 'string' ? u.projectId : '')
  if ('error' in g) return g
  if (u.move) await restoreDates(g.p, u.move)
  if (typeof u.askId === 'string' && u.askId) { const r = await withdrawMoreTime(u.askId, { undo: true }); if ('error' in r && r.error !== 'That ask is answered already') return r }
  if (typeof u.eventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, g.p.id), eq(leadEvents.kind, VO_DAYS_EVENT)))
  await syncTarget(g.p.id)
  touch(g.p.id, g.p.leadId)
  return { ok: true }
}

/* ── (parity map, SC-056 · TD-022 · TD-023 — 1.0's "Suggest from quote") Suggested tasks, added ─────────────────────────────────────────────
   The suggestions are made BY RULE (lib/projects/task-suggestions.ts — a stand-in for 1.0's AI, no credits); the ticked ones are ordinary
   tasks: the project's lead's, its members on them, due on their milestone's last day (as a milestone's task is), one sentence and one Undo. */
export type SuggestedUndo = { projectId: string; ids: string[]; eventId: string; at: number }
async function addTasksTo(p: Project, rows: { title: string; milestoneId: string | null }[], list: Milestone[]): Promise<string[]> {
  const ids: string[] = []
  for (const r of rows) {
    const m = r.milestoneId ? list.find((x) => x.id === r.milestoneId) ?? null : null
    const due = m ? dateOfDay(m.end) : null
    if (due) due.setHours(17, 0, 0, 0)
    const id = await createTask(p.leadId, r.title, { dueAt: due, assignLeadMembers: true })
    if (m) await db.update(leadTasks).set({ milestoneId: m.id }).where(eq(leadTasks.id, id))
    ids.push(id)
  }
  return ids
}
/** A milestone's suggestions ticked in its panel: each a task inside it. */
export async function addMilestoneTasks(milestoneId: string, input: { titles: string[] }): Promise<{ sentence: string; undo: SuggestedUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forMilestone(milestoneId)
  if ('error' in g) return g
  const titles = [...new Set((Array.isArray(input?.titles) ? input.titles : []).filter((t): t is string => typeof t === 'string').map((t) => clean(t, 200)).filter(Boolean))].slice(0, 12)
  if (!titles.length) return { error: 'Tick at least one task' }
  const at = Date.now()
  const ids = await addTasksTo(g.p, titles.map((title) => ({ title, milestoneId })), g.list)
  const eventId = await logParityEvent(db, g.p.leadId, g.p.id, 'parity_e_tasks_suggested', { n: ids.length, id: milestoneId, title: g.row.title, source: 'milestone' })
  touch(g.p.id, g.p.leadId)
  return { sentence: `${plural(ids.length, 'task')} added to ${shortTitle(g.row.title)}`, undo: { projectId: g.p.id, ids, eventId, at } }
}
/** (TD-022) The signed quote's lines as tasks, ticked in the project's Tasks — each in the milestone its trade belongs to, else on the project. */
export async function readQuoteTaskSuggestions(projectId: string): Promise<{ quote: { id: string; number: string } | null; groups: QuoteTaskGroup[] } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(projectId)
  if ('error' in g) return g
  const quotesOf = await quoteSourcesOf(g.p.leadId, g.p.quoteId)
  const q = quotesOf.find((x) => x.id === g.p.quoteId) ?? quotesOf.find((x) => x.signed) ?? null
  if (!q) return { quote: null, groups: [] }
  const list = (await milestonesOf([g.p.id])).get(g.p.id) ?? []
  const existing = (await db.select({ title: leadTasks.title }).from(leadTasks).where(eq(leadTasks.leadId, g.p.leadId))).map((t) => t.title)
  return { quote: { id: q.id, number: q.number }, groups: suggestFromQuote({ lines: q.items ?? [], milestones: list.map((m) => ({ id: m.id, title: m.title, description: m.description, end: m.end, status: m.status })), existing }) }
}
export async function addQuoteTasks(projectId: string, input: { tasks: { title: string; milestoneId: string | null }[] }): Promise<{ sentence: string; undo: SuggestedUndo } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(projectId)
  if ('error' in g) return g
  const list = (await milestonesOf([g.p.id])).get(g.p.id) ?? []
  const rows = (Array.isArray(input?.tasks) ? input.tasks : []).slice(0, 80).flatMap((t) => {
    const title = clean(typeof t?.title === 'string' ? t.title : '', 200)
    const milestoneId = typeof t?.milestoneId === 'string' && list.some((m) => m.id === t.milestoneId) ? t.milestoneId : null
    return title ? [{ title, milestoneId }] : []
  })
  if (!rows.length) return { error: 'Tick at least one task' }
  const at = Date.now()
  const ids = await addTasksTo(g.p, rows, list)
  const eventId = await logParityEvent(db, g.p.leadId, g.p.id, 'parity_e_tasks_suggested', { n: ids.length, source: 'quote' })
  touch(g.p.id, g.p.leadId)
  revalidatePath(`/projects/${g.p.id}/tasks`)
  const into = new Set(rows.map((r) => r.milestoneId).filter(Boolean)).size
  return { sentence: `${plural(ids.length, 'task')} added from the quote${into ? ` — in ${plural(into, 'milestone')}` : ''}`, undo: { projectId: g.p.id, ids, eventId, at } }   // (invented copy)
}
/** The added tasks' Undo, for the snackbar's life: the tasks just made (by this member, on this project) and their line go. */
export async function undoSuggestedTasks(u: SuggestedUndo): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const g = await forProject(typeof u?.projectId === 'string' ? u.projectId : '')
  if ('error' in g) return g
  const ids = (Array.isArray(u.ids) ? u.ids : []).filter((x): x is string => typeof x === 'string').slice(0, 80)
  const since = new Date((typeof u.at === 'number' && Number.isFinite(u.at) ? u.at : Date.now()) - 2000)
  if (ids.length) {
    const mine = (await db.select({ id: leadTasks.id }).from(leadTasks).where(and(inArray(leadTasks.id, ids), eq(leadTasks.leadId, g.p.leadId), gte(leadTasks.createdAt, since)))).map((r) => r.id)
    if (mine.length) {
      await db.delete(notifications).where(and(eq(notifications.kind, 'task_assigned'), gte(notifications.createdAt, since), eq(notifications.leadId, g.p.leadId)))
      await db.delete(leadTasks).where(inArray(leadTasks.id, mine))
    }
  }
  if (typeof u.eventId === 'string') await db.delete(leadEvents).where(and(eq(leadEvents.id, u.eventId), eq(leadEvents.projectId, g.p.id), eq(leadEvents.kind, 'parity_e_tasks_suggested')))
  touch(g.p.id, g.p.leadId)
  revalidatePath(`/projects/${g.p.id}/tasks`)
  return { ok: true }
}

/* ── Save as a template (Company › Templates › Schedules) ──────────────────────────────────────────────────────────────────── */

export async function saveScheduleAsTemplate(projectId: string, name: string): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const n = clean(name, 80)
  if (!n) return { error: 'Give the template a name' }
  const g = await forProject(projectId, { read: true })
  if ('error' in g) return g
  const list = (await milestonesOf([g.p.id])).get(g.p.id) ?? []
  if (!list.length) return { error: 'Add a milestone before you save the schedule as a template' }
  const id = randomUUID()
  const now = new Date()
  /* (B-28) the schedule's real order and gaps — by when each starts — clamped as the template editor keeps them; the client's ask per milestone;
     (parity map, SC-016) each milestone's description, its colour and its links by position */
  const items = itemsFromMilestones(list)
  await db.insert(scheduleTemplates).values({ id, name: n, createdBy: stampBy, updatedBy: stampBy, createdAt: now, updatedAt: now })
  await db.insert(scheduleTemplateItems).values(items.map((it, i) => ({ id: randomUUID(), templateId: id, position: i, title: it.title, days: it.days, gapDays: it.gap, askConfirm: it.askConfirm,
    description: it.description ?? null, color: it.color ?? null, followsJson: it.follows?.length ? JSON.stringify(it.follows) : null })))
  revalidatePath('/company/templates/schedules')
  return { id }
}
