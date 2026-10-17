'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { storedBytes } from '@/lib/leads/file-store'   // (pending modules S34)
import { leadAssignees, leadFiles, leads, projectMilestones, projectSelectionOptions, projectSelections, projects, quoteItems, type ProjectSelection, type ProjectSelectionOption } from '@/lib/db/schema'
import { createStudioMaterial } from '@/app/company/materials-actions'
import { createPriceBookItem } from '@/app/company/price-book-actions'
import { UNITS } from '@/lib/quotes/items-model'
import { GENERIC_CATEGORIES } from '@/lib/visualizer/catalogue'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { revalidateLead } from '@/lib/leads/queries'
import { dropLeadEvents } from '@/lib/leads/events'
import type { Viewer } from '@/lib/leads/assign-policy'
import { isDataImage } from '@/lib/visualizer/images'
import { logProjectEvent, type ProjectEventDetail, type ProjectEventKind } from '@/lib/projects/events'
import { CHANGE_RULE, mayChangeProject } from '@/lib/projects/policy'
import { endWaitForPick, endWaitSetByShare, fetchChoiceSources, keepOptionPicture, pickGstPct, putBackShareWait, restoreWaitForPick, sourcePicture, startWaitForShare } from '@/lib/projects/choices'
import { applyPickVariation, planPickVariation, undoPickVariation } from '@/lib/projects/pick-variation'
import { keepLineCosts, keptCostsOf } from '@/lib/quotes/kept-costs'   // (pending modules S41b-1)
import { seesCost } from '@/lib/settings/cost-visibility'
import { fileSelectionReceipt } from '@/lib/projects/choice-receipt'
import { isChoiceAnswer, type ChoiceAnswer } from '@/lib/projects/decline'
import { dayOf } from '@/lib/projects/schedule-model'
import { titleCaseName } from '@/lib/format'
import { tellChoiceShared } from '@/lib/portal/client-tells'   // (simplify S-21 · Q-13) "A choice to make"
import {
  CLIENT_NOTE_MAX, NOTE_MAX, OPTION_DESC_MAX, OPTION_NAME_MAX, PRICE_MAX_MINOR, PROJECT_DONE, ROOM_MAX, STUDIO_NOTE_DEFAULT, STUDIO_NOTE_MAX, TITLE_MAX, VENDOR_MAX,
  SHARE_WAIT_NOTE_MAX, deleteBlock, isChoiceSource, isChoiceStatus, normPrice, optionsBlock, pickBlock, shareBlock, unshareBlock, waitSetByShare,
  type ChoiceMilestone, type ChoiceSource, type ChoiceSources, type ChoiceStatus, type PickUndo,
} from '@/lib/projects/choices-model'
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (Projects round 8) A choice's actions on the studio's side. Who sees a project is its lead's rule (`canOpenLead`); who adds, edits, shares,
 * takes back, picks with the client and deletes is the project's team, Owners and Admins (`mayChangeProject`, the project's one rule). Every
 * refusal answers `{ error: <the rule> }`; every step writes its `project_choice_*` event so Activity reads the whole trail; a picture travels
 * inside the one object argument (the F205 rule). The client's own pick is app/portal/choices-actions.ts.
 */
type Refusal = { error: string }
const NOT_FOUND = 'This project is not there any more'
const GONE = 'This choice is not there any more'
const OPTION_GONE = 'This option is not there any more'
const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x

type Ctx = { p: typeof projects.$inferSelect; viewer: Viewer; team: string[] }
async function forProject(projectId: string, o: { change?: boolean } = { change: true }): Promise<Ctx | Refusal> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))).map((r) => r.memberId)
  if (o.change !== false && !mayChangeProject(viewer, team)) return { error: CHANGE_RULE }
  /* (REG-1069) a completed project's choices stay as they were — every change, not only adding, sharing and picking (round 8's three): the
     tab reads only (`fetchChoices` mayChange), the bar under the tabs names Reopen */
  if (o.change !== false && p.stage === 'completed') return { error: PROJECT_DONE }
  return { p, viewer, team }
}
type ChoiceCtx = Ctx & { s: ProjectSelection; options: ProjectSelectionOption[]; status: ChoiceStatus; milestone: ChoiceMilestone | null }
async function forChoice(selectionId: string): Promise<ChoiceCtx | Refusal> {
  const [s] = await db.select().from(projectSelections).where(and(eq(projectSelections.id, selectionId), isNull(projectSelections.deletedAt))).limit(1)
  if (!s) return { error: GONE }
  const c = await forProject(s.projectId); if (isRefusal(c)) return c
  const [options, [m]] = await Promise.all([
    db.select().from(projectSelectionOptions).where(and(eq(projectSelectionOptions.selectionId, s.id), isNull(projectSelectionOptions.deletedAt))).orderBy(asc(projectSelectionOptions.position), asc(projectSelectionOptions.createdAt)),
    s.milestoneId ? db.select().from(projectMilestones).where(and(eq(projectMilestones.id, s.milestoneId), isNull(projectMilestones.deletedAt))).limit(1) : Promise.resolve([]),
  ])
  return { ...c, s, options, status: isChoiceStatus(s.status) ? s.status : 'draft', milestone: m ? { id: m.id, title: m.title, status: m.status, start: dayOf(m.startDate), position: m.position } : null }
}
const touch = (leadId: string) => revalidateLead(leadId)   // the lead's tabs and every /projects page (its layout): the tab, the listing, Activity
const log = (c: Ctx, kind: ProjectEventKind, s: { id: string; title: string }, extra: ProjectEventDetail = {}) =>
  logProjectEvent(db, c.p.leadId, c.p.id, kind, { id: s.id, title: s.title, name: c.p.name, number: c.p.number, ...extra })
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max + 1) : '')
const cleanBlock = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max + 1) : '')
/** The option's picture address for an event's summary card (Activity) — the lead file's own. */
const thumbOf = async (fileId: string | null) => (fileId ? (await db.select({ thumb: leadFiles.thumb }).from(leadFiles).where(eq(leadFiles.id, fileId)).limit(1))[0]?.thumb ?? null : null)
const clientFirstOf = async (leadId: string) => { const n = titleCaseName((await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)).limit(1))[0]?.name ?? 'The client'); return n.split(/\s+/)[0] ?? n }
/** (fix-C, C-02) a pick's variation order lives on the quote editor and the Money tab too */
const touchVo = (projectId: string, quoteId: string) => { revalidatePath(`/quotes/${quoteId}`); revalidatePath(`/projects/${projectId}/money`) }

/* ── a choice ────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ChoiceInput = {
  /** The choice being edited; absent = a new one. */
  id?: string | null
  title: string
  room: string
  milestoneId: string | null
  /** Local midnight, ms; null = no date. */
  neededBy: number | null
  note: string
  /** (gaps build D, item 11 — 1.0 F-162) the team's own note — never on the portal; absent = left as it is */
  studioNote?: string
}

/** Add a choice (a Draft) or change its words, its room, its milestone, its date. */
export async function saveChoice(projectId: string, input: ChoiceInput): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  const title = clean(input.title, TITLE_MAX)
  if (!title) return { error: 'Give the choice a name' }
  if (title.length > TITLE_MAX) return { error: `Keep the name to ${TITLE_MAX} characters` }
  const room = clean(input.room, ROOM_MAX)
  if (room.length > ROOM_MAX) return { error: `Keep the room to ${ROOM_MAX} characters` }
  const note = cleanBlock(input.note, NOTE_MAX)
  if (note.length > NOTE_MAX) return { error: `Keep the note to ${NOTE_MAX} characters` }
  const studioNote = input.studioNote === undefined ? undefined : cleanBlock(input.studioNote, STUDIO_NOTE_MAX)
  if (studioNote && studioNote.length > STUDIO_NOTE_MAX) return { error: `Keep the team’s note to ${STUDIO_NOTE_MAX} characters` }
  let milestoneId: string | null = null
  if (input.milestoneId) {
    const [m] = await db.select({ id: projectMilestones.id }).from(projectMilestones).where(and(eq(projectMilestones.id, input.milestoneId), eq(projectMilestones.projectId, projectId), isNull(projectMilestones.deletedAt))).limit(1)
    if (!m) return { error: 'That milestone is not on this project any more' }
    milestoneId = m.id
  }
  const neededBy = typeof input.neededBy === 'number' && Number.isFinite(input.neededBy) ? new Date(input.neededBy) : null
  const now = new Date()
  if (input.id) {
    const cc = await forChoice(input.id); if (isRefusal(cc)) return cc
    if (cc.p.id !== projectId) return { error: GONE }
    /* (fix-C, C-11) a pick locked by its milestone's start stays locked: the milestone isn't moved from under it */
    if (cc.status === 'chosen' && (cc.s.milestoneId ?? null) !== milestoneId) {
      const lock = pickBlock({ status: cc.status, options: cc.options, milestone: cc.milestone }, cc.p.stage, dayOf(new Date()))
      if (lock && cc.milestone) return { error: `The pick is locked — ${cc.milestone.title} has started` }
    }
    await db.update(projectSelections).set({ title, room: room || null, milestoneId, neededBy, note: note || null, ...(studioNote !== undefined ? { studioNote: studioNote || null } : {}), updatedAt: now }).where(eq(projectSelections.id, input.id))
    if (cc.status === 'shared') await followShareWait(cc, { title, milestoneId, neededBy })   // (simplify S-21) the wait its share started follows it
    await log(c, 'project_choice_edited', { id: input.id, title })
    touch(c.p.leadId)
    return { id: input.id }
  }
  const id = randomUUID()
  await db.insert(projectSelections).values({ id, projectId, title, room: room || null, milestoneId, neededBy, note: note || null, studioNote: studioNote || null, status: 'draft', createdBy: c.viewer.id, createdAt: now, updatedAt: now })
  await log(c, 'project_choice_added', { id, title })
  touch(c.p.leadId)
  return { id }
}

/** The client's no a re-share answered — what its Undo puts back. (simplify S-21) `wait`: what the re-share did to its milestone's wait. */
export type ChoiceAnswerUndo = { kind: ChoiceAnswer; note: string | null; at: number | null; by: string | null; sharedBy: string | null; sharedAt: number | null; wait?: 'started' | 'carried' | null }

/** Share with the client — it appears on their portal (one press; Undo is `unshareChoice` with the share's line). (gaps build D, item 2) A
    choice the client said no to is shared again the same way, with the options the studio added — the answer is cleared (Activity keeps it)
    and comes back with the Undo (`restoreChoiceAnswer`). */
export async function shareChoice(selectionId: string): Promise<{ eventId: string; answer?: ChoiceAnswerUndo | null; /** (simplify S-21) the milestone that now waits on the client for it */ waitStarted?: string | null; told?: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  const block = shareBlock({ status: c.status, options: c.options })
  if (block) return { error: block }
  const now = new Date()
  const answer: ChoiceAnswerUndo | null = c.status === 'declined' && isChoiceAnswer(c.s.clientAnswer)
    ? { kind: c.s.clientAnswer, note: c.s.clientAnswerNote, at: c.s.clientAnswerAt?.getTime() ?? null, by: c.s.clientAnswerBy, sharedBy: c.s.sharedBy, sharedAt: c.s.sharedAt?.getTime() ?? null } : null
  const r = await db.update(projectSelections).set({ status: 'shared', sharedBy: c.viewer.id, sharedAt: now, updatedAt: now, clientAnswer: null, clientAnswerNote: null, clientAnswerAt: null, clientAnswerBy: null })
    .where(and(eq(projectSelections.id, selectionId), inArray(projectSelections.status, ['draft', 'declined'])))
  if (!r.rowsAffected) return { error: 'Already shared' }
  await fileSelectionReceipt(selectionId)   // (parity map, TD-044) re-shared from a no: its receipt is taken back (trashed)
  const eventId = await log(c, 'project_choice_shared', c.s, answer ? { again: true } : {})
  /* (simplify S-21) the milestone it names now waits on the client for it — the wait the pick ends — and the client hears of it ("A choice to
     make", email by default; nothing goes to a client not invited, a paused portal or Choices switched off) */
  const wait = await startWaitForShare({ projectId: c.p.id, milestoneId: c.s.milestoneId, title: c.s.title, neededBy: c.s.neededBy }, now, { carryFrom: answer ? c.s.sharedAt : null })
  const told = await tellChoiceShared(selectionId)
  touch(c.p.leadId)
  return { eventId, answer: answer ? { ...answer, wait: wait ? (wait.carried ? 'carried' : 'started') : null } : answer, waitStarted: wait && !wait.carried ? wait.title : null, told: told > 0 }
}

/** (simplify S-21) A shared choice renamed or moved to another milestone: the wait its share started follows — its words, or its milestone. */
async function followShareWait(cc: ChoiceCtx, next: { title: string; milestoneId: string | null; neededBy: Date | null }) {
  const sharedAt = cc.s.sharedAt ?? null
  if (!sharedAt) return
  if ((cc.s.milestoneId ?? null) !== next.milestoneId) {
    await endWaitSetByShare({ id: cc.s.id, projectId: cc.p.id, milestoneId: cc.s.milestoneId, title: cc.s.title, sharedAt })
    await startWaitForShare({ projectId: cc.p.id, milestoneId: next.milestoneId, title: next.title, neededBy: next.neededBy }, sharedAt)
    return
  }
  if (!next.milestoneId || next.title === cc.s.title) return
  const [m] = await db.select().from(projectMilestones).where(and(eq(projectMilestones.id, next.milestoneId), isNull(projectMilestones.deletedAt))).limit(1)
  if (m && waitSetByShare({ waitingOn: m.waitingOn, waitingNote: m.waitingNote, waitingSince: m.waitingSince?.getTime() ?? null }, { title: cc.s.title, sharedAt: sharedAt.getTime() }))
    await db.update(projectMilestones).set({ waitingNote: next.title.slice(0, SHARE_WAIT_NOTE_MAX), updatedAt: new Date() }).where(eq(projectMilestones.id, m.id))
}

/** (gaps build D, item 2) Undo of sharing again a choice the client said no to: back to their no, as it was. */
export async function restoreChoiceAnswer(selectionId: string, o: { eventId: string | null; answer: ChoiceAnswerUndo }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  if (c.status !== 'shared') return { error: 'This choice was changed since' }
  const a = o?.answer
  if (!a || !isChoiceAnswer(a.kind)) return { error: 'This choice was changed since' }
  const at = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) ? new Date(n) : null)
  await db.update(projectSelections).set({ status: 'declined', clientAnswer: a.kind, clientAnswerNote: typeof a.note === 'string' ? a.note.slice(0, 500) : null, clientAnswerAt: at(a.at) ?? new Date(), clientAnswerBy: typeof a.by === 'string' ? a.by.slice(0, 64) : null,
    sharedBy: typeof a.sharedBy === 'string' ? a.sharedBy.slice(0, 64) : null, sharedAt: at(a.sharedAt), updatedAt: new Date() }).where(eq(projectSelections.id, selectionId))
  /* (simplify S-21) the re-share's wait: one it started goes; one it carried on runs from the first share again */
  if (a.wait === 'started') await endWaitSetByShare({ id: c.s.id, projectId: c.p.id, milestoneId: c.s.milestoneId, title: c.s.title, sharedAt: c.s.sharedAt })
  else if (a.wait === 'carried' && c.s.sharedAt && at(a.sharedAt)) await putBackShareWait({ projectId: c.p.id, milestoneId: c.s.milestoneId, title: c.s.title }, c.s.sharedAt, at(a.sharedAt)!)
  if (o.eventId) await dropLeadEvents([o.eventId])
  touch(c.p.leadId)
  await fileSelectionReceipt(selectionId)   // (parity map, TD-044) the no is back, and its receipt with it
  return { ok: true }
}

/** Take it back to Draft — the client no longer sees it. With `eventId` it is Share's Undo: the share's line goes with it; else a line says so. */
export async function unshareChoice(selectionId: string, o: { eventId?: string | null } = {}): Promise<{ eventId: string | null; sharedBy: string | null; sharedAt: number | null; declined?: boolean; waitEnded: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  const block = unshareBlock({ status: c.status })
  if (block) return { error: block }
  /* (fix-C, C-10) Undo puts the share back as it was — (gaps build D, item 2) a no the client gave too (its answer stays on the row) */
  const was = { sharedBy: c.s.sharedBy ?? null, sharedAt: c.s.sharedAt?.getTime() ?? null, declined: c.status === 'declined' }
  const r = await db.update(projectSelections).set({ status: 'draft', sharedBy: null, sharedAt: null, updatedAt: new Date() }).where(and(eq(projectSelections.id, selectionId), inArray(projectSelections.status, ['shared', 'declined'])))
  if (!r.rowsAffected) return { error: 'The client has just chosen — it stays as they picked it' }
  const waitEnded = await endWaitSetByShare({ id: c.s.id, projectId: c.p.id, milestoneId: c.s.milestoneId, title: c.s.title, sharedAt: c.s.sharedAt })   // (simplify S-21) the wait its share started goes with it
  let eventId: string | null = null
  if (o.eventId) await dropLeadEvents([o.eventId])
  else eventId = await log(c, 'project_choice_unshared', c.s)
  touch(c.p.leadId)
  return { eventId, ...was, waitEnded }
}

/** Undo of Take back: shared again, as it was — (fix-C, C-10) by whoever shared it, when they did. */
export async function reshareChoice(selectionId: string, o: { eventId: string | null; sharedBy?: string | null; sharedAt?: number | null; declined?: boolean }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  if (c.status !== 'draft') return { error: 'This choice was changed since' }
  const now = new Date()
  const at = typeof o.sharedAt === 'number' && Number.isFinite(o.sharedAt) && o.sharedAt <= now.getTime() ? new Date(o.sharedAt) : now
  const by = typeof o.sharedBy === 'string' && o.sharedBy ? o.sharedBy.slice(0, 64) : c.viewer.id
  const back = o.declined === true && isChoiceAnswer(c.s.clientAnswer) ? 'declined' : 'shared'   // (gaps build D, item 2) back to the client's no
  await db.update(projectSelections).set({ status: back, sharedBy: by, sharedAt: at, updatedAt: now }).where(eq(projectSelections.id, selectionId))
  if (back === 'shared') await startWaitForShare({ projectId: c.p.id, milestoneId: c.s.milestoneId, title: c.s.title, neededBy: c.s.neededBy }, at)   // (simplify S-21) its wait back with it
  if (o.eventId) await dropLeadEvents([o.eventId])
  touch(c.p.leadId)
  return { ok: true }
}

/**
 * Choose with the client, off the portal ("Chosen with the client on a call") — or change a pick, until the work it belongs to starts. The
 * pick is kept by the option's id. (Round 6) A pick with a price difference is where a variation order's draft starts: `pickPriceDifference`
 * (lib/projects/choices.ts) reads it once this lands.
 */
export async function chooseForClient(selectionId: string, o: { optionId: string; note: string }): Promise<{ changed: boolean; undo: PickUndo; vo: { number: string; deleted: boolean } | null; waitEnded: string | null } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  const block = pickBlock({ status: c.status, options: c.options, milestone: c.milestone }, c.p.stage, dayOf(new Date()))
  if (block) return { error: block }
  const opt = c.options.find((x) => x.id === o.optionId)
  if (!opt) return { error: OPTION_GONE }
  if (c.status === 'chosen' && c.s.chosenOptionId === opt.id) return { error: `${opt.name} is the pick already` }
  const note = cleanBlock(o.note, CLIENT_NOTE_MAX)
  if (note.length > CLIENT_NOTE_MAX) return { error: `Keep the note to ${CLIENT_NOTE_MAX} characters` }
  const was = c.status === 'chosen' ? c.options.find((x) => x.id === c.s.chosenOptionId) ?? null : null
  /* (fix-C, C-02) the pick's variation order follows it — a Draft is rewritten (or deleted); past Draft the pick holds (refused before any write) */
  const plan = was ? await planPickVariation(selectionId, { choice: c.s.title, from: was.name, to: { name: opt.name, description: opt.description, priceMinor: opt.priceMinor }, clientFirst: await clientFirstOf(c.p.leadId) }) : null
  if (isRefusal(plan)) return plan
  const now = new Date()
  const before: PickUndo['before'] = { status: c.status, optionId: c.s.chosenOptionId ?? null, by: c.s.chosenBy ?? null, memberId: c.s.chosenMemberId ?? null, at: c.s.chosenAt?.getTime() ?? null, note: c.s.chosenNote ?? null }
  await db.update(projectSelections).set({ status: 'chosen', chosenOptionId: opt.id, chosenBy: 'studio', chosenMemberId: c.viewer.id, chosenAt: now, chosenNote: note || STUDIO_NOTE_DEFAULT, sharedAt: c.s.sharedAt ?? null, updatedAt: now }).where(eq(projectSelections.id, selectionId))
  const changed = c.status === 'chosen'
  const applied = plan ? await applyPickVariation(plan) : null
  /* (pending modules S41b-1) the order's line as it was rides the Undo — for a member who doesn't see costs, without its cost (kept on the
     server for the Undo, lib/quotes/kept-costs.ts) */
  if (applied?.line && !seesCost(c.viewer)) await keepLineCosts([{ id: applied.line.id, quoteId: applied.quoteId, kind: 'item', costMinor: applied.line.costMinor, markupMinor: 0, rebateMinor: 0 }])
  const vo = applied?.line && !seesCost(c.viewer) ? { ...applied, line: { ...applied.line, costMinor: 0 } } : applied
  /* (fix-C, C-04) the milestone's wait for this choice ends with the pick — one story on the Overview, the listing and the Schedule */
  const wait = await endWaitForPick({ id: c.s.id, projectId: c.p.id, milestoneId: c.s.milestoneId, title: c.s.title })
  const gst = (await pickGstPct([c.p.id])).get(c.p.id) ?? 0   // (REG-1068) the line in Activity says what the contract moves by
  const eventId = await log(c, changed ? 'project_choice_changed' : 'project_choice_chosen', c.s, {
    option: opt.name, by: 'studio', price: normPrice(opt.priceMinor), gst, thumb: await thumbOf(opt.fileId), hex: opt.hex, note: note || STUDIO_NOTE_DEFAULT, ...(was ? { from: was.name } : {}),
    ...(plan ? { vo: plan.number, voDropped: plan.kind === 'delete' } : {}), ...(wait ? { waitEnded: wait.title } : {}),
  })
  if (vo) touchVo(c.p.id, vo.quoteId)
  await fileSelectionReceipt(selectionId)   // (gaps build D, item 7) the pick's receipt — issued, or re-issued for a changed pick
  touch(c.p.leadId)
  return {
    changed, undo: { before, eventId, vo, wait: wait ? { milestoneId: wait.milestoneId, note: wait.note, since: wait.since, until: wait.until } : null },
    vo: plan ? { number: plan.number, deleted: plan.kind === 'delete' } : null, waitEnded: wait?.title ?? null,
  }
}

/** (fix-C, C-02 · C-04) The studio's pick undone: the pick as it was (or shared again), its variation order's line, the wait it ended, its line. */
export async function undoChoosePick(selectionId: string, o: { undo: PickUndo }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  const u = o?.undo
  if (!u || !u.before || c.status !== 'chosen' || c.s.chosenBy !== 'studio') return { error: 'This choice was changed since' }
  const b = u.before
  const optionOk = b.optionId ? c.options.some((x) => x.id === b.optionId) : true
  if (b.status === 'chosen' && (!b.optionId || !optionOk)) return { error: 'The option it had is not there any more' }
  const at = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) ? new Date(n) : null)
  await db.update(projectSelections).set(b.status === 'chosen'
    ? { status: 'chosen', chosenOptionId: b.optionId, chosenBy: b.by === 'client' ? 'client' : 'studio', chosenMemberId: typeof b.memberId === 'string' ? b.memberId.slice(0, 64) : null, chosenAt: at(b.at), chosenNote: typeof b.note === 'string' ? b.note.slice(0, CLIENT_NOTE_MAX) : null, updatedAt: new Date() }
    : { status: b.status === 'draft' ? 'draft' : b.status === 'declined' && isChoiceAnswer(c.s.clientAnswer) ? 'declined' : 'shared', chosenOptionId: null, chosenBy: null, chosenMemberId: null, chosenAt: null, chosenNote: null, updatedAt: new Date() }).where(eq(projectSelections.id, selectionId))
  if (u.vo) {
    /* (pending modules S41b-1) a member who doesn't see costs sent the line without its cost: the kept one goes back (else the line keeps its own) */
    let vo = u.vo
    if (vo.line && !seesCost(c.viewer)) {
      const kept = (await keptCostsOf([vo.line.id])).get(vo.line.id)
      const [now] = kept ? [] : await db.select({ costMinor: quoteItems.costMinor }).from(quoteItems).where(eq(quoteItems.id, vo.line.id)).limit(1)
      vo = { ...vo, line: { ...vo.line, costMinor: kept?.costMinor ?? now?.costMinor ?? 0 } }
    }
    await undoPickVariation(vo, { projectId: c.p.id }); touchVo(c.p.id, vo.quoteId)
  }
  if (u.wait) await restoreWaitForPick(u.wait, c.p.id)
  if (u.eventId) await dropLeadEvents([u.eventId])
  await fileSelectionReceipt(selectionId)   // (gaps build D, item 7) the receipt follows: re-issued for the pick put back, else to the trash
  touch(c.p.leadId)
  return { ok: true }
}

/** Delete — never a choice that carries a pick (it is the record of what the client chose). Soft, so Undo brings it back whole. */
export async function deleteChoice(selectionId: string): Promise<{ eventId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  const block = deleteBlock({ status: c.status })
  if (block) return { error: block }
  const now = new Date()
  await db.update(projectSelections).set({ deletedAt: now, deletedBy: c.viewer.id, updatedAt: now }).where(eq(projectSelections.id, selectionId))
  if (c.status === 'shared') await endWaitSetByShare({ id: c.s.id, projectId: c.p.id, milestoneId: c.s.milestoneId, title: c.s.title, sharedAt: c.s.sharedAt })   // (simplify S-21)
  const eventId = await log(c, 'project_choice_deleted', c.s)
  touch(c.p.leadId)
  return { eventId }
}
export async function restoreChoice(selectionId: string, o: { eventId: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [s] = await db.select().from(projectSelections).where(eq(projectSelections.id, selectionId)).limit(1)
  if (!s) return { error: GONE }
  const c = await forProject(s.projectId); if (isRefusal(c)) return c
  await db.update(projectSelections).set({ deletedAt: null, deletedBy: null }).where(eq(projectSelections.id, selectionId))
  if (s.status === 'shared' && s.sharedAt) await startWaitForShare({ projectId: s.projectId, milestoneId: s.milestoneId, title: s.title, neededBy: s.neededBy }, s.sharedAt)   // (simplify S-21) Undo of delete: its wait back
  if (o.eventId) await dropLeadEvents([o.eventId])
  touch(c.p.leadId)
  return { ok: true }
}

/* ── its options ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type OptionInput = {
  name: string
  description: string
  /** Against the quote, in cents: positive adds, negative saves, null or 0 = no change. */
  priceMinor: number | null
  source: ChoiceSource
  /** The material's or Price book item's id, or a render's `jobId:variantId`; null for an upload. */
  ref: string | null
  /** An upload's picture — a data URL, sized in the browser (the Files tab's `uploadablePicture`). */
  picture?: string | null
  /** (gaps build D, item 11 — 1.0 F-139) who supplies it */
  vendor?: string
}
const checkPrice = (v: unknown): number | null | Refusal => {
  if (v == null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) return { error: 'Enter the price as a number' }
  if (Math.abs(v) > PRICE_MAX_MINOR) return { error: 'That price difference is too large' }
  return normPrice(v)
}

/** Add an option from Materials, the Price book, a render or an upload — its picture kept in the lead's Files › Choices. */
export async function addChoiceOption(selectionId: string, input: OptionInput): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  const block = optionsBlock({ status: c.status, options: c.options }, true)
  if (block) return { error: block }
  const name = clean(input.name, OPTION_NAME_MAX)
  if (!name) return { error: 'Give the option a name' }
  if (name.length > OPTION_NAME_MAX) return { error: `Keep the name to ${OPTION_NAME_MAX} characters` }
  const description = cleanBlock(input.description, OPTION_DESC_MAX)
  if (description.length > OPTION_DESC_MAX) return { error: `Keep the description to ${OPTION_DESC_MAX} characters` }
  const price = checkPrice(input.priceMinor); if (isRefusal(price)) return price
  if (!isChoiceSource(input.source)) return { error: 'Pick where the option comes from' }
  let picture: string | null = null, hex: string | null = null
  if (input.source === 'upload') {
    if (!input.picture || !isDataImage(input.picture)) return { error: 'This picture didn’t read — pick it again' }
    if (input.picture.length >= 12_000_000) return { error: 'The picture is over 6 MB — pick a smaller one' }
    picture = input.picture
  } else {
    const got = await sourcePicture(input.source, input.ref)
    if (!got) return { error: input.source === 'material' ? 'That material is not in Company › Materials any more' : input.source === 'price_book' ? 'That item is not in the Price book any more' : 'That render is not there any more' }
    picture = got.picture; hex = got.hex
  }
  const fileId = picture ? await keepOptionPicture(c.p.leadId, c.viewer.id, { name, picture }) : null
  const [{ top } = { top: null }] = await db.select({ top: max(projectSelectionOptions.position) }).from(projectSelectionOptions).where(eq(projectSelectionOptions.selectionId, selectionId))
  const id = randomUUID(), now = new Date()
  const vendor = clean(input.vendor, VENDOR_MAX)
  if (vendor.length > VENDOR_MAX) return { error: `Keep the vendor to ${VENDOR_MAX} characters` }
  await db.insert(projectSelectionOptions).values({ id, selectionId, name, description: description || null, fileId, hex, priceMinor: price, source: input.source, sourceRef: input.source === 'upload' ? null : input.ref, position: (top ?? -1) + 1, createdBy: c.viewer.id, createdAt: now, updatedAt: now, vendor: vendor || null })
  await db.update(projectSelections).set({ updatedAt: now }).where(eq(projectSelections.id, selectionId))
  await log(c, 'project_choice_option_added', c.s, { option: name })
  touch(c.p.leadId)
  return { id }
}

async function forOption(optionId: string): Promise<(ChoiceCtx & { o: ProjectSelectionOption }) | Refusal> {
  const [o] = await db.select().from(projectSelectionOptions).where(and(eq(projectSelectionOptions.id, optionId), isNull(projectSelectionOptions.deletedAt))).limit(1)
  if (!o) return { error: OPTION_GONE }
  const c = await forChoice(o.selectionId); if (isRefusal(c)) return c
  return { ...c, o }
}

/** Change an option's name, words or price — in any state (a chosen one's price is what round 6 reads). */
export async function editChoiceOption(optionId: string, input: { name: string; description: string; priceMinor: number | null; vendor?: string }): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forOption(optionId); if (isRefusal(c)) return c
  const name = clean(input.name, OPTION_NAME_MAX)
  if (!name) return { error: 'Give the option a name' }
  if (name.length > OPTION_NAME_MAX) return { error: `Keep the name to ${OPTION_NAME_MAX} characters` }
  const description = cleanBlock(input.description, OPTION_DESC_MAX)
  if (description.length > OPTION_DESC_MAX) return { error: `Keep the description to ${OPTION_DESC_MAX} characters` }
  const price = checkPrice(input.priceMinor); if (isRefusal(price)) return price
  /* (fix-C, C-02) the chosen option's name or price is what its variation order carries: a Draft follows; past Draft it holds */
  const isPick = c.status === 'chosen' && c.s.chosenOptionId === optionId && (normPrice(c.o.priceMinor) !== price || c.o.name !== name || (c.o.description ?? null) !== (description || null))
  const plan = isPick ? await planPickVariation(c.s.id, { choice: c.s.title, from: c.o.name, to: { name, description: description || null, priceMinor: price }, clientFirst: await clientFirstOf(c.p.leadId) }) : null
  if (isRefusal(plan)) return plan
  const now = new Date()
  const vendor = input.vendor === undefined ? undefined : clean(input.vendor, VENDOR_MAX)
  if (vendor && vendor.length > VENDOR_MAX) return { error: `Keep the vendor to ${VENDOR_MAX} characters` }
  await db.update(projectSelectionOptions).set({ name, description: description || null, priceMinor: price, ...(vendor !== undefined ? { vendor: vendor || null } : {}), updatedAt: now }).where(eq(projectSelectionOptions.id, optionId))
  if (c.status === 'chosen' && c.s.chosenOptionId === optionId) await fileSelectionReceipt(c.s.id)   // (gaps build D, item 7) the receipt says what the pick is now
  if (plan) { const vo = await applyPickVariation(plan); touchVo(c.p.id, vo.quoteId) }
  await db.update(projectSelections).set({ updatedAt: now }).where(eq(projectSelections.id, c.s.id))
  await log(c, 'project_choice_edited', c.s, { option: name })
  touch(c.p.leadId)
  return { id: optionId }
}

/** Move an option one place earlier or later — the order the client sees them in. */
export async function moveChoiceOption(optionId: string, o: { by: -1 | 1 }): Promise<{ ok: true; before: string[]; place: number; of: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forOption(optionId); if (isRefusal(c)) return c
  const block = optionsBlock({ status: c.status, options: c.options })
  if (block) return { error: block }
  const list = [...c.options]
  const before = list.map((x) => x.id)   // (fix-C, C-12) the order before, for the snackbar's Undo
  const i = list.findIndex((x) => x.id === optionId), j = i + (o.by < 0 ? -1 : 1)
  if (i < 0 || j < 0 || j >= list.length) return { ok: true, before, place: i + 1, of: list.length }
  ;[list[i], list[j]] = [list[j]!, list[i]!]
  const now = new Date()
  for (let k = 0; k < list.length; k++) await db.update(projectSelectionOptions).set({ position: k, updatedAt: now }).where(eq(projectSelectionOptions.id, list[k]!.id))
  touch(c.p.leadId)
  return { ok: true, before, place: j + 1, of: list.length }
}
/** (fix-C, C-12) Move's Undo: the options back in the order they had (only this choice's own, live options). */
export async function restoreChoiceOptionOrder(selectionId: string, o: { order: string[] }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forChoice(selectionId); if (isRefusal(c)) return c
  const block = optionsBlock({ status: c.status, options: c.options })
  if (block) return { error: block }
  const ids = new Set(c.options.map((x) => x.id))
  const order = (Array.isArray(o?.order) ? o.order : []).filter((id): id is string => typeof id === 'string' && ids.has(id))
  const rest = c.options.map((x) => x.id).filter((id) => !order.includes(id))
  const list = [...order, ...rest]
  const now = new Date()
  if (list.length) for (let k = 0; k < list.length; k++) await db.update(projectSelectionOptions).set({ position: k, updatedAt: now }).where(and(eq(projectSelectionOptions.id, list[k]!), inArray(projectSelectionOptions.id, [...ids])))
  touch(c.p.leadId)
  return { ok: true }
}

/** Take an option off (soft — Undo puts it back where it was). A shared choice keeps at least one. */
export async function removeChoiceOption(optionId: string): Promise<{ eventId: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forOption(optionId); if (isRefusal(c)) return c
  const block = optionsBlock({ status: c.status, options: c.options })
  if (block) return { error: block }
  if (c.status === 'shared' && c.options.length <= 1) return { error: 'A shared choice keeps one option at least — take it back first' }
  const now = new Date()
  await db.update(projectSelectionOptions).set({ deletedAt: now, updatedAt: now }).where(eq(projectSelectionOptions.id, optionId))
  const eventId = await log(c, 'project_choice_option_removed', c.s, { option: c.o.name })
  touch(c.p.leadId)
  return { eventId }
}
export async function restoreChoiceOption(optionId: string, o: { eventId: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [opt] = await db.select().from(projectSelectionOptions).where(eq(projectSelectionOptions.id, optionId)).limit(1)
  if (!opt) return { error: OPTION_GONE }
  const c = await forChoice(opt.selectionId); if (isRefusal(c)) return c
  if (c.status === 'chosen') return { error: 'Chosen — its options stay as they were' }
  await db.update(projectSelectionOptions).set({ deletedAt: null, updatedAt: new Date() }).where(eq(projectSelectionOptions.id, optionId))
  if (o.eventId) await dropLeadEvents([o.eventId])
  touch(c.p.leadId)
  return { ok: true }
}

/** The Add an option dialog's lists: Company › Materials, the Price book, the renders this viewer may see. */
export async function loadChoiceSources(projectId: string): Promise<ChoiceSources | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forProject(projectId); if (isRefusal(c)) return c
  return (await fetchChoiceSources(projectId)) ?? { error: NOT_FOUND }
}

/* ── (gaps build D, item 11 — 1.0 F-140 · F-147) a new option kept in the studio's catalogue ─────────────────────────────────── */

/** A public picture an option's file points at (a sample room, a demo swatch) as the bytes a catalogue keeps — a data URL, up to 3 MB; only the
    app's own picture folders, never a path that climbs out of them. */
async function publicPicture(url: string): Promise<string | null> {
  const clean = url.split('?')[0]!
  if (!/^\/(visualizer|figma-assets|uat-files)\/[\w\-./]+\.(jpe?g|png|webp)$/i.test(clean) || clean.includes('..')) return null
  try {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const bytes = await readFile(join(process.cwd(), 'public', clean))
    if (bytes.length > 3_000_000) return null
    const mime = /\.png$/i.test(clean) ? 'image/png' : /\.webp$/i.test(clean) ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${bytes.toString('base64')}`
  } catch { return null }
}

export type SaveToCatalogue =
  | { to: 'materials'; name: string; category: string }
  | { to: 'price_book'; name: string; category: string | null; unit: string; costMinor: number; markupMinor: number }

/**
 * An option the studio made for this choice (an upload, a render) saved to Company › Materials or the Price book, so the next project can pick
 * it: its name, words, vendor and picture travel; the option then names where it now lives (its source becomes the catalogue's entry). The
 * project's rule first (its team, Owners, Admins — `forOption`), then the catalogue's own: Materials takes any member's (REG-677); the Price
 * book files a Designer's as a proposal an Owner or an Admin approves (REG-652, `newItemStatus`). A refusal answers `{ error }`.
 */
export async function saveOptionToCatalogue(optionId: string, input: SaveToCatalogue): Promise<{ id: string; to: 'materials' | 'price_book'; proposed: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const c = await forOption(optionId); if (isRefusal(c)) return c
  if (c.o.source === 'material' || c.o.source === 'price_book') return { error: c.o.source === 'material' ? 'It comes from Company › Materials already' : 'It comes from the Price book already' }
  const name = clean(input?.name, OPTION_NAME_MAX)
  if (!name) return { error: 'Give it a name' }
  /* the option's picture as the catalogue keeps one: the bytes an upload kept (a data URL), else the public picture its file points at */
  const [f] = c.o.fileId ? await db.select({ thumb: leadFiles.thumb }).from(leadFiles).where(eq(leadFiles.id, c.o.fileId)).limit(1) : []
  const kept = c.o.fileId ? await storedBytes(c.o.fileId) : null   // (pending modules S34) through the one file store
  const picture = kept && isDataImage(kept) ? kept : f?.thumb && f.thumb.startsWith('/') && !f.thumb.startsWith('/files/img/') ? await publicPicture(f.thumb) : null
  const now = new Date()
  if (input.to === 'materials') {
    if (!(GENERIC_CATEGORIES as readonly string[]).includes(input.category)) return { error: 'Pick the material’s kind' }
    const r = await createStudioMaterial({ name, category: input.category, hex: c.o.hex ?? '#BFBFBF', imageUrl: picture && (picture.length < 4_000_000) ? picture : null, description: c.o.description })
    if ('error' in r) return r
    await db.update(projectSelectionOptions).set({ source: 'material', sourceRef: r.id, updatedAt: now }).where(eq(projectSelectionOptions.id, optionId))
    await log(c, 'project_choice_edited', c.s, { option: name })
    touch(c.p.leadId)
    return { id: r.id, to: 'materials', proposed: false }
  }
  const studioUnits = (await (await import('@/lib/settings/queries')).fetchUnits()).units   // (S44I — M9) the studio's own units
  const unit = [...studioUnits, ...UNITS].find((u) => u.toLowerCase() === String(input.unit ?? '').trim().toLowerCase()) ?? 'Lot'
  const cost = Math.max(0, Math.round(Number(input.costMinor) || 0)), markup = Math.round(Number(input.markupMinor) || 0)
  if (cost > PRICE_MAX_MINOR || Math.abs(markup) > PRICE_MAX_MINOR) return { error: 'That price is too large' }
  const item = await orThrow(createPriceBookItem({ name, description: c.o.description, kind: 'purchase', unit, costMinor: cost, markupMinor: markup, category: input.category?.trim() || null, vendor: c.o.vendor, thumb: picture && picture.length <= 1_500_000 ? picture : null }))
  await db.update(projectSelectionOptions).set({ source: 'price_book', sourceRef: item.id, updatedAt: now }).where(eq(projectSelectionOptions.id, optionId))
  await log(c, 'project_choice_edited', c.s, { option: name })
  touch(c.p.leadId)
  return { id: item.id, to: 'price_book', proposed: item.status === 'proposed' }
}
